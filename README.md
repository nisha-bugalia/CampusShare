# 🎓 CampusShare

> **A peer-to-peer campus marketplace and community platform built for NIT students.** Buy, rent, borrow, and fulfill student requests within your campus community with real-time chat, hostel filtering, and instant push notifications.

---

[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-57-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%7C%20Auth%20%7C%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Highlights & Key Features

### 🛍️ Campus Marketplace ("I HAVE" & "I NEED")
- **I HAVE:** List unused course books, lab coats, electronics, bicycles, mattresses, calculators, and study materials for sale or rent.
- **I NEED:** Post immediate campus requests when you need an item (e.g. drafter, cycle pump, umbrella, reference book).
- **Hostel & Branch Context:** Posts display hostel and branch information so you can connect with peers in nearby blocks.
- **Image Uploads:** Upload photos directly from your device camera or gallery to Supabase Storage.

### 💬 Real-Time In-App Chat
- **1-on-1 Student Messaging:** Discuss price, pickup location, and condition directly within the app.
- **Supabase Realtime:** Instant message delivery with live status updates.
- **Unread Counters & Read Receipts:** Tracks `last_read_at` to highlight unread conversations.
- **Active Chat Presence:** Smart presence tracking marks active participants to avoid sending redundant push notifications when both students are already actively viewing the conversation.

### 🔔 Smart Push Notifications
- **Expo Push Notifications & FCM v1:** Device tokens are automatically registered and upserted per user session across sign-ins.
- **Serverless Edge Function (`notify-chat-message`):** Triggered on new messages via Supabase Database Webhook to dispatch push alerts securely.
- **Foreground Notification Banners:** Configured via Expo Notifications handler for visible alert banners when the app is foregrounded.

### 🔐 Campus Verification & Profiles
- **Student Profile Onboarding:** Captures student name, branch, and hostel block upon initial sign-up.
- **Verified Student Badge:** Distinguishes verified campus accounts.
- **My Posts Management:** Easily edit or delete your active listings and requests directly from your profile tab.

---

## 🏗️ Architecture & Flow

```
┌────────────────────────────────────────────────────────┐
│                   CampusShare Mobile                   │
│        (React Native + Expo SDK 57 + Expo Router)      │
└────────────┬─────────────────────────────┬─────────────┘
             │ Auth / Queries / Storage    │ Realtime WebSocket
             ▼                             ▼
┌────────────────────────────────────────────────────────┐
│                   Supabase Backend                     │
│  ├── PostgreSQL Database (RLS Policies & Functions)    │
│  ├── Supabase Auth (Session management)                │
│  ├── Supabase Storage (Listing image buckets)          │
│  └── Database Webhooks (INSERT messages)               │
└────────────┬───────────────────────────────────────────┘
             │ Trigger on new message
             ▼
┌────────────────────────────────────────────────────────┐
│        Supabase Edge Function: notify-chat-message     │
│  ├── Validates webhook secret & sender                 │
│  ├── Checks recipient active-chat presence             │
│  └── Fetches recipient device push tokens              │
└────────────┬───────────────────────────────────────────┘
             │ Send Notification Ticket
             ▼
┌────────────────────────────────────────────────────────┐
│       Expo Push Service ──► Google FCM ──► Android     │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) (0.86), [Expo](https://expo.dev/) (SDK 57) |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict typing) |
| **Backend & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Row Level Security) |
| **Realtime** | [Supabase Realtime](https://supabase.com/docs/guides/realtime) |
| **Storage** | [Supabase Storage](https://supabase.com/docs/guides/storage) |
| **Notifications** | [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) & Firebase Cloud Messaging (FCM v1) |
| **Serverless Functions**| [Supabase Edge Functions](https://supabase.com/docs/guides/functions) (Deno / TypeScript) |
| **Build & Deploy** | [EAS (Expo Application Services)](https://expo.dev/eas) |

---

## 📂 Project Structure

```
nit-campus/
├── app/                           # Expo Router file-based screens
│   ├── (auth)/                    # Authentication flow (Login, Sign-up)
│   ├── (tabs)/                    # Main bottom-tab layout
│   │   ├── index.tsx              # Marketplace feed ("I HAVE" / "I NEED")
│   │   ├── search.tsx             # Search & category filters
│   │   ├── messages.tsx           # Conversations list & unread counters
│   │   └── profile.tsx            # Student profile & My Posts management
│   ├── chat/[id].tsx              # Real-time 1-on-1 chat room
│   ├── create/                    # Create new listing / request
│   ├── edit/                      # Edit existing listing / request
│   ├── listing/[id].tsx           # Item detail screen
│   ├── request/[id].tsx           # Request detail screen
│   ├── onboarding.tsx             # Student profile onboarding
│   └── _layout.tsx                # Root layout & push notification listener
├── src/
│   ├── components/                # Reusable UI cards & components
│   ├── constants/                 # Theme colors, layout, and campus metadata
│   ├── context/                   # AuthContext & MarketplaceContext
│   ├── hooks/                     # Custom hooks (useProfile, etc.)
│   ├── lib/                       # Supabase client initialization
│   ├── services/                  # Chat & push token services
│   ├── types/                     # TypeScript data models & database schemas
│   └── utils/                     # Adapters & helper utilities
├── supabase/
│   ├── functions/                 # Supabase Edge Functions
│   │   ├── notify-chat-message/   # Production webhook notification sender
│   │   └── send-test-push/        # Test push verification utility
│   └── migrations/                # SQL migration files
├── app.json                       # Expo configuration & plugins
└── eas.json                       # EAS build profiles
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Expo Go](https://expo.dev/go) or an [EAS Development Build](https://docs.expo.dev/develop/development-builds/introduction/) on your physical device / emulator
- A [Supabase](https://supabase.com/) project

### 1. Clone the Repository

```bash
git clone https://github.com/nisha-bugalia/CampusShare.git
cd CampusShare
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your Supabase project credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

### 4. Database Setup

Apply the SQL migration files located in `supabase/migrations/` in chronological order to your Supabase PostgreSQL database:

1. `20261004_create_profiles.sql`
2. `20261004_create_listings.sql`
3. `20261004_create_requests.sql`
4. `20261005_create_messaging_schema.sql`
5. `20261005_create_storage_bucket.sql`
6. `20261006_add_hostel_visibility.sql`
7. `20261006_add_last_read_at_to_conversation_members.sql`
8. `20261006_enable_messages_realtime.sql`
9. `20261008_create_push_tokens.sql`
10. `20261009_add_active_chat_presence.sql`

### 5. Deploy Edge Functions (Push Notifications)

Deploy the chat notification Edge Function using the Supabase CLI:

```bash
npx supabase functions deploy notify-chat-message --project-ref <your-project-ref>
```

Set the required environment secrets:

```bash
npx supabase secrets set SUPABASE_URL=https://<your-project-ref>.supabase.co \
                         SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
                         WEBHOOK_SECRET=<your-webhook-secret> \
                         --project-ref <your-project-ref>
```

Configure a Supabase Database Webhook on `public.messages` `INSERT` events targeting this Edge Function with the `x-webhook-secret` header.

### 6. Run the App Locally

Start the Expo development server:

```bash
npx expo start
```

Press:
- `a` to open on an Android emulator or connected device
- Scan the QR code with **Expo Go** or your development client

---

## 🧪 Quality & Type Checking

To verify TypeScript code without emitting build files:

```bash
npx tsc --noEmit
```

To run the linter:

```bash
npx expo lint
```

---

## 📱 Building the App with EAS

CampusShare uses Expo Application Services for cloud builds:

```bash
# Build Android APK / AAB for development
npx eas-cli build --profile development --platform android

# Build preview APK for testing
npx eas-cli build --profile preview --platform android
```

---

## 🤝 Contributing

Contributions, feedback, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
