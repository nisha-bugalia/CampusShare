// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // 2. Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing or invalid Bearer authorization header.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: empty bearer token.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Initialize Supabase client scoped to caller's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[send-test-push] Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase credentials.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // 4. Authenticate user from Supabase Auth
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: invalid or expired session token.',
          details: userError?.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse optional custom message parameters from request body
    // NOTE: We strictly NEVER accept target user_id or target token from the caller
    let customTitle: string | undefined;
    let customBody: string | undefined;

    try {
      const body = await req.json();
      if (typeof body?.title === 'string' && body.title.trim()) {
        customTitle = body.title.trim();
      }
      if (typeof body?.body === 'string' && body.body.trim()) {
        customBody = body.body.trim();
      }
    } catch {
      // Empty or non-JSON body is acceptable; use defaults
    }

    // 5. Query user's push tokens from push_tokens
    // Uses authenticated user's ID exclusively
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('expo_push_token, platform, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (tokensError) {
      console.error('[send-test-push] Database error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({
          error: 'Failed to retrieve push tokens from database.',
          details: tokensError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No push tokens found for this user. Please open the CampusShare mobile app to register your device.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Build Expo push messages
    const notificationTitle = customTitle || 'CampusShare Test Notification 🚀';
    const notificationBody =
      customBody || 'Push notifications are working properly on your device!';

    const messages = tokens.map((tokenRecord) => ({
      to: tokenRecord.expo_push_token,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      title: notificationTitle,
      body: notificationBody,
      data: {
        type: 'test_push',
        timestamp: new Date().toISOString(),
        platform: tokenRecord.platform,
      },
    }));

    // 7. Dispatch to Expo Push API
    const expoHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };

    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (expoAccessToken) {
      expoHeaders['Authorization'] = `Bearer ${expoAccessToken}`;
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: expoHeaders,
      body: JSON.stringify(messages),
    });

    if (!expoResponse.ok) {
      const errorText = await expoResponse.text();
      console.error('[send-test-push] Expo push API HTTP error:', expoResponse.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Expo push service returned HTTP ${expoResponse.status}`,
          details: errorText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const expoResult = await expoResponse.json();

    // Check individual push tickets
    const tickets: any[] = Array.isArray(expoResult.data)
      ? expoResult.data
      : expoResult.data
        ? [expoResult.data]
        : [];

    const okTickets = tickets.filter((t: any) => t && t.status === 'ok');
    const failedTickets = tickets.filter((t: any) => t && t.status === 'error');

    // ONLY declare success if Expo accepted the ticket(s)
    const isAccepted = tickets.length > 0 && okTickets.length === tickets.length && !expoResult.errors?.length;

    // Detailed breakdown of each ticket
    const ticketDetails = tickets.map((t: any, index: number) => {
      if (!t) return { index, status: 'unknown' };
      if (t.status === 'ok') {
        return {
          index,
          status: 'ok',
          id: t.id ?? null,
        };
      }
      return {
        index,
        status: t.status || 'error',
        message: t.message ?? 'Unknown error from Expo',
        details: t.details ?? null,
      };
    });

    const primaryTicket = ticketDetails[0] ?? null;

    let responseMessage: string;
    if (isAccepted) {
      const ticketIdList = okTickets.map((t: any) => t.id).filter(Boolean).join(', ');
      responseMessage = `Expo accepted ticket: ${ticketIdList || 'ok'}`;
    } else if (failedTickets.length > 0) {
      const errorDetailsList = failedTickets
        .map((t: any) => t.message || t.details?.error || 'Rejected by Expo')
        .join('; ');
      responseMessage = `Expo rejected push ticket: ${errorDetailsList}`;
    } else if (expoResult.errors?.length) {
      responseMessage = `Expo API errors: ${expoResult.errors.map((e: any) => e.message).join('; ')}`;
    } else {
      responseMessage = 'No valid push tickets returned by Expo push service.';
    }

    return new Response(
      JSON.stringify({
        success: isAccepted,
        message: responseMessage,
        ticketStatus: primaryTicket?.status ?? 'none',
        ticketId: primaryTicket?.id ?? null,
        ticketError: primaryTicket?.status === 'error' ? primaryTicket?.message : null,
        tickets: ticketDetails,
        rawTickets: expoResult.data ?? null,
        expoErrors: expoResult.errors ?? null,
        tokensTargeted: tokens.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[send-test-push] Unexpected error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error while processing test push notification.',
        details: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
