/**
 * Theme & Color Tokens for NIT Campus
 */
export const Colors = {
  light: {
    primary: '#1E3A8A', // Deep Campus Navy
    primaryDark: '#172554',
    primaryLight: '#3B82F6',
    secondary: '#0D9488', // Teal accent
    accent: '#F59E0B', // Campus Gold / Amber
    background: '#F8FAFC', // Slate soft white
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    text: '#0F172A', // Slate 900
    textMuted: '#64748B', // Slate 500
    border: '#E2E8F0',
    card: '#FFFFFF',
    notification: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  dark: {
    primary: '#3B82F6',
    primaryDark: '#1D4ED8',
    primaryLight: '#60A5FA',
    secondary: '#14B8A6',
    accent: '#FBBF24',
    background: '#0B0F19',
    surface: '#111827',
    surfaceVariant: '#1F2937',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#334155',
    card: '#1E293B',
    notification: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
  },
} as const;

export type ColorTheme = typeof Colors.light;
