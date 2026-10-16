// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// notify-chat-message — Supabase Edge Function
//
// Invoked by:
//   (A) Supabase Database Webhook (INSERT on public.messages)
//       POST with header:  x-webhook-secret: <WEBHOOK_SECRET env var>
//       Body shape:        { type, table, schema, record, old_record }
//                          record: { id, conversation_id, sender_id, message, created_at }
//
//   (B) Authenticated sender (development / manual testing)
//       POST with header:  Authorization: Bearer <user-JWT>
//       Body shape:        { conversation_id, sender_id, message }
//                      or  { message_id }  (function fetches the rest from DB)
//
// Security model:
//   - ALL unauthenticated requests are rejected with 401.
//   - Webhook callers MUST supply a shared secret in x-webhook-secret header.
//     The secret is stored in WEBHOOK_SECRET env var (set via `supabase secrets set`).
//     The service-role key is never compared against transport headers.
//   - Authenticated-user callers must present a valid Supabase JWT.
//     They are additionally constrained: sender_id must match auth.uid().
//   - Recipients are always resolved server-side from conversation_members.
//     No client-supplied recipient IDs are trusted.
// ─────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req: Request) => {
  // ── CORS preflight ────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ── 1. Load server credentials ────────────────────────────────
    const supabaseUrl            = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[notify-chat-message] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase credentials.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client — bypasses RLS entirely (service-role key).
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // ── 2. Authenticate caller ────────────────────────────────────
    //
    // Path A — Database Webhook:
    //   Header:  x-webhook-secret: <WEBHOOK_SECRET>
    //   When the webhook is configured in Supabase Dashboard → Database →
    //   Webhooks, add a custom header named x-webhook-secret with the value
    //   of the WEBHOOK_SECRET secret. This avoids ever putting the
    //   service-role key in a transport header.
    //
    // Path B — Authenticated user sender:
    //   Header:  Authorization: Bearer <JWT>
    //
    // If neither credential is valid → 401.

    const webhookSecret         = Deno.env.get('WEBHOOK_SECRET') ?? '';
    const incomingWebhookSecret = req.headers.get('x-webhook-secret') ?? '';

    // Path A: webhook caller
    const isWebhookCaller =
      webhookSecret.length > 0 && incomingWebhookSecret === webhookSecret;

    // Path B: authenticated user
    let authenticatedUserId: string | null = null;

    if (!isWebhookCaller) {
      const authHeader = req.headers.get('Authorization') ?? '';
      const authToken  = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (!authToken) {
        // Neither a valid webhook secret nor a Bearer token was supplied.
        return new Response(
          JSON.stringify({
            error:
              'Unauthorized: request must include a valid x-webhook-secret header ' +
              'or an Authorization: Bearer <JWT> header.',
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(authToken);

      if (userError || !user?.id) {
        return new Response(
          JSON.stringify({
            error:   'Unauthorized: invalid or expired session token.',
            details: userError?.message,
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authenticatedUserId = user.id;
    }

    // ── 3. Parse request body ─────────────────────────────────────
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Extract message fields ─────────────────────────────────
    //
    // Path A (Database Webhook) — canonical Supabase webhook payload:
    //   {
    //     "type":       "INSERT",
    //     "table":      "messages",
    //     "schema":     "public",
    //     "record":     { "id": "…", "conversation_id": "…", "sender_id": "…", "message": "…", "created_at": "…" },
    //     "old_record": null
    //   }
    //
    // We ONLY process INSERT events on public.messages. Any other event type,
    // table, or schema yields a 200 (so Supabase does not retry) with a
    // descriptive reason field.
    //
    // Path B (authenticated user) — flat payload or message_id shortcut:
    //   { conversation_id, sender_id, message }
    //   { message_id }

    let messageId:      string | null = null;
    let conversationId: string | null = null;
    let senderId:       string | null = null;
    let messageText:    string | null = null;

    if (isWebhookCaller) {
      // ── Validate the webhook event ──────────────────────────────

      // type must be INSERT (200 + skip for others so Supabase doesn't retry)
      if (body?.type !== 'INSERT') {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason:  `Webhook event ignored: expected type=INSERT, got type=${body?.type ?? '(missing)'}.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // table must be messages
      if (body?.table !== 'messages') {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason:  `Webhook event ignored: expected table=messages, got table=${body?.table ?? '(missing)'}.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // schema must be public
      if (body?.schema !== 'public') {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason:  `Webhook event ignored: expected schema=public, got schema=${body?.schema ?? '(missing)'}.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // record must be a non-null object (old_record is null for INSERT — that is expected)
      const record = body?.record;
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return new Response(
          JSON.stringify({ error: 'Malformed webhook payload: record is missing or not an object.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract fields strictly from body.record — never from body.new or body itself.
      messageId      = record.id              ?? null;
      conversationId = record.conversation_id ?? null;
      senderId       = record.sender_id       ?? null;
      messageText    = record.message         ?? null;

      // All four fields are required in a valid INSERT record.
      if (!messageId || !conversationId || !senderId || !messageText) {
        return new Response(
          JSON.stringify({
            error:
              'Malformed webhook payload: record is missing one or more required fields ' +
              '(id, conversation_id, sender_id, message).',
            receivedFields: {
              id:              messageId,
              conversation_id: conversationId,
              sender_id:       senderId,
              message:         messageText ? '[present]' : null,
            },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // ── Path B: authenticated-user direct invocation ────────────
      conversationId = body?.conversation_id ?? body?.conversationId ?? null;
      senderId       = body?.sender_id       ?? body?.senderId       ?? null;
      messageText    = body?.message         ?? body?.text           ?? null;
      messageId      = body?.message_id      ?? body?.messageId      ?? body?.id ?? null;

      // message_id shortcut: fetch the rest from the database.
      if (messageId && (!conversationId || !senderId || !messageText)) {
        const { data: fetchedMessage, error: fetchErr } = await supabaseAdmin
          .from('messages')
          .select('id, conversation_id, sender_id, message')
          .eq('id', messageId)
          .maybeSingle();

        if (fetchErr || !fetchedMessage) {
          return new Response(
            JSON.stringify({
              error:   'Message not found in database.',
              details: fetchErr?.message,
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        messageId      = fetchedMessage.id;
        conversationId = fetchedMessage.conversation_id;
        senderId       = fetchedMessage.sender_id;
        messageText    = fetchedMessage.message;
      }

      if (!conversationId || !senderId) {
        return new Response(
          JSON.stringify({
            error:
              'Missing required parameters. Provide conversation_id + sender_id + message, or a single message_id.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Authenticated users may only trigger notifications for messages they sent.
      if (authenticatedUserId !== senderId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: sender_id does not match the authenticated caller.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── 5. Resolve recipients from conversation_members ───────────
    // NEVER trust a client-supplied recipient. Always query server-side.
    const { data: members, error: membersError } = await supabaseAdmin
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (membersError) {
      console.error('[notify-chat-message] Error fetching conversation members:', membersError);
      return new Response(
        JSON.stringify({
          error:   'Failed to retrieve conversation members.',
          details: membersError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exclude the sender.
    const recipientMembers = (members ?? []).filter(
      (m: any) => m.user_id !== senderId
    );

    if (recipientMembers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason:  'No recipient members found in conversation (sender is the only member).',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 6. Block relationship check ──────────────────────────────
    // Skip recipients if there is an active block in either direction.
    const unblockedRecipients: string[] = [];

    for (const member of recipientMembers) {
      const recipientId: string = member.user_id;

      const { data: blockRow } = await supabaseAdmin
        .from('blocks')
        .select('id')
        .or(`and(blocker_id.eq.${senderId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${senderId})`)
        .maybeSingle();

      if (blockRow) {
        console.log(
          `[notify-chat-message] Skipping ${recipientId}: active block relationship between sender ${senderId} and recipient ${recipientId}.`
        );
      } else {
        unblockedRecipients.push(recipientId);
      }
    }

    if (unblockedRecipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason:  'All recipient(s) have an active block relationship with sender.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 7. Active-presence check ──────────────────────────────────
    // Skip recipients who are currently viewing this conversation.
    const inactiveRecipients: string[] = [];

    for (const recipientId of unblockedRecipients) {
      const { data: isActive, error: rpcError } = await supabaseAdmin.rpc(
        'is_member_active_in_conversation',
        {
          p_conversation_id: conversationId,
          p_user_id:         recipientId,
          p_stale_seconds:   45,
        }
      );

      let memberIsActive = Boolean(isActive);

      // Fallback: query the table directly if the RPC has not been migrated yet.
      if (rpcError) {
        console.warn(
          '[notify-chat-message] RPC presence check failed, falling back to table query:',
          rpcError.message
        );
        const { data: memberRow } = await supabaseAdmin
          .from('conversation_members')
          .select('is_active, active_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', recipientId)
          .maybeSingle();

        if (memberRow?.is_active && memberRow.active_at) {
          const ageSeconds =
            (Date.now() - new Date(memberRow.active_at).getTime()) / 1000;
          if (ageSeconds <= 45) {
            memberIsActive = true;
          }
        }
      }

      if (memberIsActive) {
        console.log(
          `[notify-chat-message] Skipping ${recipientId}: active in conversation ${conversationId}.`
        );
      } else {
        inactiveRecipients.push(recipientId);
      }
    }

    if (inactiveRecipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason:  'All recipient(s) are actively viewing this conversation.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 8. Check recipient chat notification preferences ─────────
    // Skip recipients who have disabled chat notifications in settings.
    const recipientsToNotify: string[] = [];

    for (const recipientId of inactiveRecipients) {
      const { data: prefRow } = await supabaseAdmin
        .from('notification_preferences')
        .select('chat_notifications')
        .eq('user_id', recipientId)
        .maybeSingle();

      // Default is enabled (true) unless explicitly set to false
      const chatNotificationsEnabled = prefRow ? prefRow.chat_notifications !== false : true;

      if (!chatNotificationsEnabled) {
        console.log(
          `[notify-chat-message] Skipping ${recipientId}: chat notifications disabled by user preference.`
        );
      } else {
        recipientsToNotify.push(recipientId);
      }
    }

    if (recipientsToNotify.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason:  'All recipient(s) have chat notifications disabled in settings.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 9. Fetch push tokens for eligible recipients ──────────────
    const { data: pushTokens, error: tokensError } = await supabaseAdmin
      .from('push_tokens')
      .select('expo_push_token, platform, user_id')
      .in('user_id', recipientsToNotify);

    if (tokensError) {
      console.error('[notify-chat-message] Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({
          error:   'Failed to retrieve recipient push tokens.',
          details: tokensError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success:            true,
          skipped:            true,
          reason:             'No push tokens registered for recipient(s).',
          recipientsTargeted: recipientsToNotify,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 8. Build minimal notification content ─────────────────────
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', senderId)
      .maybeSingle();

    const senderDisplayName = senderProfile?.name || 'New Message';
    const trimmedMessage    = (messageText ?? '').trim();
    const messagePreview    =
      trimmedMessage.length > 100
        ? trimmedMessage.substring(0, 97) + '...'
        : trimmedMessage || 'Sent you a message';

    // ── 9. Format Expo push messages ──────────────────────────────
    const expoMessages = pushTokens.map((t: any) => ({
      to:        t.expo_push_token,
      sound:     'default',
      channelId: 'default',
      priority:  'high',
      title:     senderDisplayName,
      body:      messagePreview,
      data: {
        type:           'chat_message',
        conversationId,
        messageId:      messageId ?? null,
        senderId,
      },
    }));

    // ── 10. Dispatch to Expo Push API ─────────────────────────────
    const expoHeaders: Record<string, string> = {
      'Content-Type':    'application/json',
      Accept:            'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };

    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (expoAccessToken) {
      expoHeaders['Authorization'] = `Bearer ${expoAccessToken}`;
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: expoHeaders,
      body:    JSON.stringify(expoMessages),
    });

    if (!expoResponse.ok) {
      const errorText = await expoResponse.text();
      console.error(
        '[notify-chat-message] Expo API HTTP error:',
        expoResponse.status,
        errorText
      );
      return new Response(
        JSON.stringify({
          success: false,
          error:   `Expo push service returned HTTP ${expoResponse.status}`,
          details: errorText,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expoResult = await expoResponse.json();

    const tickets: any[] = Array.isArray(expoResult.data)
      ? expoResult.data
      : expoResult.data
        ? [expoResult.data]
        : [];

    const okTickets     = tickets.filter((t: any) => t?.status === 'ok');
    const failedTickets = tickets.filter((t: any) => t?.status === 'error');

    return new Response(
      JSON.stringify({
        success:            okTickets.length > 0,
        recipientsNotified: recipientsToNotify,
        tokensTargeted:     pushTokens.length,
        ticketsAccepted:    okTickets.length,
        ticketsFailed:      failedTickets.length,
        tickets:            expoResult.data,
        errors:             expoResult.errors ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[notify-chat-message] Unexpected error:', err);
    return new Response(
      JSON.stringify({
        error:   'Internal server error processing message notification.',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
