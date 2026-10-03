/**
 * Navigation Types and Helpers
 * Add route names, deep linking mappings, and route param types here.
 */
export const ROUTES = {
  HOME: '/',
  NOT_FOUND: '+not-found',
} as const;

export type AppRoutes = typeof ROUTES;
