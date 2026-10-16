export interface NotificationPreferences {
  user_id: string;
  chat_notifications: boolean;
  updated_at?: string;
}

export type FeedbackType = 'Report a Problem' | 'Send Feedback';

export interface FeedbackSubmission {
  id?: string;
  user_id: string;
  type: FeedbackType;
  message: string;
  created_at?: string;
}
