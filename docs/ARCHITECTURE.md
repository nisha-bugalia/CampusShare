# NIT Campus - Architecture & Folder Structure

This project is built using **React Native**, **Expo (Managed Workflow)**, **Expo Router**, and **TypeScript**. It is designed with modularity, scalability, and strict separation of concerns to allow easy scaling into a production-grade campus super-app.

---

## Directory Layout

```
nit-campus/
├── app/                        # Expo Router File-Based Routing
│   ├── _layout.tsx             # Root application navigation & theme wrapper
│   ├── index.tsx               # Home screen ("NIT Campus" placeholder)
│   └── +not-found.tsx          # 404 fallback route
├── assets/                     # Static media assets
│   ├── icon.png                # App launcher icon
│   ├── splash-icon.png         # Splash screen asset
│   └── adaptive-icon.png       # Android adaptive icon layers
├── docs/                       # Project documentation & guidelines
│   ├── ARCHITECTURE.md         # Folder structure and scaling guidelines
│   └── GETTING_STARTED.md      # Launch and Expo Go physical phone guide
├── src/                        # Modular application source code
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Primitive UI (Buttons, Cards, Inputs, Typography)
│   │   └── feedback/           # Loaders, empty states, error alerts
│   ├── constants/              # Centralized design tokens and app constants
│   │   ├── colors.ts           # Color palette (Light & Dark theme support)
│   │   ├── layout.ts           # Spacing, layout metrics, border radiuses
│   │   └── typography.ts       # Type scale, font weights, line heights
│   ├── hooks/                  # Custom React hooks (theme, device state, sensors)
│   ├── navigation/             # Navigation constants, route helpers, typed links
│   ├── services/               # Network layer, API endpoints, storage clients
│   ├── store/                  # Global state management (Context / Zustand)
│   ├── types/                  # Global TypeScript definitions and domain models
│   └── utils/                  # Pure utility functions (formatting, date, validation)
├── app.json                    # Expo configuration (app name, bundle ID, plugins)
├── package.json                # Project dependencies and npm scripts
└── tsconfig.json               # TypeScript configuration with path aliases (@/*)
```

---

## Architectural Principles

1. **File-Based Routing (`app/`)**:
   - Navigation routes are defined declaratively in the `app/` directory following Expo Router conventions.
   - Screen presentation and parameters are strongly typed.
   - Route grouping (e.g., `(auth)`, `(tabs)`) can be introduced seamlessly as features are added.

2. **Domain-Driven Core (`src/`)**:
   - `src/` houses all business logic, reusable UI components, and state management.
   - Components are decoupled from routing logic, making them easy to test and reuse across screens.

3. **Path Aliasing**:
   - Path aliases are configured in `tsconfig.json` (`@/*` pointing to `./src/*`, `@/app/*` pointing to `./app/*`).
   - Prevents deeply nested relative imports (e.g., `../../../../components`).

4. **Zero Unnecessary Dependencies**:
   - Kept strictly minimal: Expo, Expo Router, TypeScript, React Native, and safe area utilities.
   - No external state libraries, styling libraries, or backend SDKs have been bundled prematurely.
