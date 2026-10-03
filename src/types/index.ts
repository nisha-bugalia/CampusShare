/**
 * Global TypeScript types & interfaces for NIT Campus
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
