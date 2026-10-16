// ============================================================
// Types: Safety System — Blocks and Reports
// ============================================================

export type BlockStatus = {
  isBlocked: boolean;      // current user blocked the other
  isBlockedBy: boolean;    // other user blocked the current user
  isBidirectional: boolean;// either direction is blocked
};

export type Block = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type ReportTargetType = 'user' | 'listing' | 'request' | 'message';

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'scam_fraud'
  | 'impersonation'
  | 'inappropriate_behaviour'
  | 'misleading_information'
  | 'spam_duplicate'
  | 'prohibited_item'
  | 'suspicious_listing'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};
