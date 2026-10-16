// ============================================================
// Service: Safety System — Block & Report operations
// ============================================================

import { supabase } from '../lib/supabase';
import { BlockStatus, ReportReason, ReportTargetType } from '../types/safety';

// ─── Block helpers ──────────────────────────────────────────

/**
 * Block another user. The authenticated user becomes the blocker.
 * Server-side RLS enforces that blocker_id = auth.uid().
 */
export async function blockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blocks')
    .insert({
      blocker_id: user.id,
      blocked_id: blockedId,
    });

  if (error) {
    // Unique-constraint violation means the block already exists — ignore it.
    if (error.code === '23505') return;
    throw new Error(`Failed to block user: ${error.message}`);
  }
}

/**
 * Unblock a previously blocked user.
 */
export async function unblockUser(blockedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) throw new Error(`Failed to unblock user: ${error.message}`);
}

/**
 * Check the block relationship between the current user and another user.
 * Returns three booleans: isBlocked, isBlockedBy, isBidirectional.
 */
export async function checkBlockStatus(otherUserId: string): Promise<BlockStatus> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { isBlocked: false, isBlockedBy: false, isBidirectional: false };
  }

  // Fetch any block rows involving the pair (either direction)
  const { data, error } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),` +
      `and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
    );

  if (error) {
    console.error('checkBlockStatus error:', error.message);
    return { isBlocked: false, isBlockedBy: false, isBidirectional: false };
  }

  const isBlocked = (data ?? []).some(
    (r) => r.blocker_id === user.id && r.blocked_id === otherUserId
  );
  const isBlockedBy = (data ?? []).some(
    (r) => r.blocker_id === otherUserId && r.blocked_id === user.id
  );

  return {
    isBlocked,
    isBlockedBy,
    isBidirectional: isBlocked || isBlockedBy,
  };
}

/**
 * Fetch all users the current user has blocked.
 * Returns an array of { id, blocked_id, blocked_profile }.
 */
export async function fetchBlockedUsers(): Promise<
  { id: string; blocked_id: string; name: string; email: string }[]
> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('blocks')
    .select('id, blocked_id, profiles!blocks_blocked_id_fkey(name, email)')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchBlockedUsers error:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    blocked_id: row.blocked_id,
    name: row.profiles?.name ?? 'Unknown',
    email: row.profiles?.email ?? '',
  }));
}

// ─── Report helpers ─────────────────────────────────────────

export interface SubmitReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

/**
 * Submit a report against a user, listing, request, or message.
 * reporter_id is set server-side via RLS (auth.uid()).
 */
export async function submitReport(payload: SubmitReportPayload): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: payload.targetType,
    target_id: payload.targetId,
    reason: payload.reason,
    description: payload.description ?? null,
  });

  if (error) throw new Error(`Failed to submit report: ${error.message}`);
}
