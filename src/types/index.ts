/**
 * Global TypeScript types & interfaces for CampusShare
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

// Database-backed profile entity
export type { Profile, ProfileUpdate } from './profile';

// Database-backed listing entity
export type {
  DbListing,
  DbListingType,
  DbListingStatus,
  DbListingInsert,
  DbListingUpdate,
  DbListingWithOwner,
} from './databaseListing';

// Database-backed request entity
export type {
  DbRequest,
  DbRequestDuration,
  DbRequestStatus,
  DbRequestInsert,
  DbRequestUpdate,
  DbRequestWithOwner,
} from './databaseRequest';

// Database-backed messaging entities
export type {
  DbConversation,
  DbConversationMember,
  DbConversationMemberWithProfile,
  DbMessage,
  DbMessageWithSender,
  DbMessageInsert,
  DbConversationInsert,
} from './databaseMessage';

// Database-backed push token entities
export type { DbPushToken, DbPushTokenInsert } from './databasePushToken';
