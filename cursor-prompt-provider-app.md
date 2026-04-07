## Project Overview

Build a **React Native mobile app (Expo SDK 54)** for the **Provider** role of **LocalPro Marketplace** — a 3-sided service marketplace for the Philippines. Providers browse open job listings, submit competitive quotes, fulfill accepted jobs, manage earnings, and grow their business profile.

The backend is a live Next.js 16 API. You will consume it via REST. All auth uses **HttpOnly cookies** (the API sets them on login). Use `credentials: 'include'` on every fetch or configure axios with `withCredentials: true`.

---

## Tech Stack

| Concern       | Library / Version                                              |
| ------------- | -------------------------------------------------------------- |
| Framework     | Expo SDK 54 · React Native 0.81.5 · React 19.1.0              |
| Navigation    | Expo Router v6 (file-based, same feel as Next.js App Router)  |
| State         | Zustand                                                        |
| Data fetching | TanStack Query v5 (`@tanstack/react-query`)                   |
| Forms         | React Hook Form + Zod                                          |
| Styling       | StyleSheet API + theme constants (`src/constants/theme.ts`)   |
| HTTP          | Axios with `withCredentials: true`                             |
| Animations    | React Native Reanimated v4 + react-native-worklets v0.5.1     |
| Real-time     | SSE via `EventSource` polyfill (`react-native-sse`)           |
| Image upload  | `expo-image-picker` + multipart POST                          |
| Maps          | `react-native-maps` (service area visualizer)                 |
| Notifications | Expo Push Notifications (`expo-notifications`)                |
| Storage       | `expo-secure-store`                                           |
| Documents     | `expo-document-picker` (proposal doc upload)                  |

---

## Runtime Notes (Expo SDK 54)

- **New Architecture** is enabled by default (React Native 0.81.5). All third-party libraries must support the New Architecture.
- **React Compiler** is enabled via `experiments.reactCompiler: true` in `app.json` — avoid manual `useMemo`/`useCallback` in most cases.
- **Typed routes** are enabled via `experiments.typedRoutes: true`. Use the generated `expo-router` types for navigation.
- **Reanimated v4** uses the standalone `react-native-worklets` package for worklet scheduling. Use `scheduleOnRN` (not `runOnJS`) to call JS-thread functions from a worklet.
- **Entry point** is declared in `package.json` as `"main": "expo-router/entry"`.

---

## Base API Configuration

```
Base URL: https://<EXPO_PUBLIC_API_URL>
All requests: { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
On 401: call POST /api/auth/refresh, then retry once. If refresh fails → logout.
```

Expose `EXPO_PUBLIC_API_URL` via `app.config.js` from `.env`.

---

## Auth Flow

1. **Splash** → check `GET /api/auth/me`. If 200 and role is `provider` → go to Home. If 401 → Login.
2. **Login** → `POST /api/auth/login` → on success, server sets cookies → navigate to Home.
3. **Register** → `POST /api/auth/register` with `role: "provider"` → prompt email verification.
   - After email verified, provider must complete profile before being approved by admin.
4. **Phone login** → `POST /api/auth/phone/send` → `POST /api/auth/phone/verify`.
5. **Logout** → `POST /api/auth/logout` → clear Zustand store → navigate to Login.
6. **Email verification** + **Password reset** handled via deep links.

Store auth user in Zustand: `{ id, name, email, role, avatar, isEmailVerified }`.

> **Approval gate**: If `providerProfile.isApproved === false`, show an "Account Pending Approval" screen instead of the main app. Check this on every app resume.

---

## Project Directory Structure

The project uses a `src/` root layout. All source code lives under `src/`. Assets live at the repo root under `assets/`.

```
localpro-provider/
├── assets/                         ← Images, fonts, icons (outside src/)
├── src/
│   ├── app/                        ← Expo Router file-based routes
│   │   ├── _layout.tsx             ← Root layout: QueryClient, Zustand hydration, auth guard
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── phone-login.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   ├── reset-password.tsx          ← Deep link
│   │   │   ├── verify-email.tsx            ← Deep link
│   │   │   └── pending-approval.tsx        ← Shown when isApproved = false
│   │   └── (app)/
│   │       ├── _layout.tsx                 ← Tab navigator (Marketplace, My Jobs, Earnings, Messages, Profile)
│   │       ├── index.tsx                   ← Provider Dashboard / Home
│   │       ├── marketplace/
│   │       │   ├── index.tsx               ← Open job listings (AI ranked)
│   │       │   └── [id]/
│   │       │       ├── index.tsx           ← Job detail + submit quote
│   │       │       └── quote.tsx           ← Submit / edit quote form
│   │       ├── jobs/
│   │       │   ├── index.tsx               ← My active / past jobs
│   │       │   └── [id]/
│   │       │       ├── index.tsx           ← Active job detail
│   │       │       ├── chat.tsx            ← Job chat thread with client
│   │       │       ├── upload-completion.tsx ← Upload completion photo (to release escrow)
│   │       │       └── withdraw.tsx        ← Withdraw from a job
│   │       ├── quotes/
│   │       │   ├── index.tsx               ← All submitted quotes (and their status)
│   │       │   └── [id].tsx                ← Quote detail
│   │       ├── earnings/
│   │       │   ├── index.tsx               ← Wallet balance + earnings summary
│   │       │   ├── transactions.tsx        ← Full transaction history
│   │       │   └── withdraw.tsx            ← Request payout to bank
│   │       ├── messages/
│   │       │   ├── index.tsx               ← All message threads
│   │       │   └── [threadId].tsx          ← Chat window
│   │       ├── notifications/
│   │       │   └── index.tsx               ← Notification list
│   │       ├── support/
│   │       │   └── index.tsx               ← Support chat with admin
│   │       ├── consultations/
│   │       │   ├── index.tsx               ← Incoming consultation requests
│   │       │   └── [id].tsx                ← Consultation detail + respond + messages
│   │       ├── quote-templates/
│   │       │   ├── index.tsx               ← Saved quote templates list
│   │       │   ├── new.tsx                 ← Create template
│   │       │   └── [id]/
│   │       │       └── edit.tsx            ← Edit template
│   │       ├── profile/
│   │       │   ├── index.tsx               ← Public profile preview + edit own info
│   │       │   ├── skills.tsx              ← Manage skills
│   │       │   ├── service-areas.tsx       ← Add / remove service areas on map
│   │       │   ├── certifications.tsx      ← Upload certifications (PESO)
│   │       │   ├── portfolio.tsx           ← Portfolio photos
│   │       │   └── settings.tsx            ← Notification preferences
│   │       ├── loyalty/
│   │       │   └── index.tsx               ← Points, tier, referral code
│   │       ├── announcements/
│   │       │   └── index.tsx               ← Platform announcements
│   │       └── search/
│   │           └── index.tsx               ← Search jobs / clients
│   ├── api/                        ← One file per domain — no raw fetch in components
│   │   ├── client.ts               ← Axios instance (baseURL, interceptors, 401 refresh)
│   │   ├── auth.ts
│   │   ├── jobs.ts
│   │   ├── quotes.ts
│   │   ├── earnings.ts
│   │   ├── messages.ts
│   │   ├── notifications.ts
│   │   ├── consultations.ts
│   │   ├── templates.ts
│   │   ├── profile.ts
│   │   ├── support.ts
│   │   └── loyalty.ts
│   ├── components/                 ← Shared UI components
│   │   ├── ui/                     ← Primitives (buttons, inputs, chips, sheets)
│   │   ├── job-card.tsx
│   │   ├── quote-card.tsx
│   │   ├── chat-bubble.tsx
│   │   ├── status-chip.tsx
│   │   ├── star-rating.tsx
│   │   ├── earnings-card.tsx
│   │   ├── notification-bell.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-skeleton.tsx
│   │   ├── avatar-picker.tsx
│   │   ├── service-area-map.tsx
│   │   ├── approval-gate.tsx
│   │   ├── ai-suggest-button.tsx
│   │   ├── milestones-table.tsx
│   │   └── template-picker-sheet.tsx
│   ├── stores/                     ← Zustand stores
│   │   ├── auth-store.ts
│   │   ├── notification-store.ts
│   │   └── earnings-store.ts
│   ├── hooks/                      ← Custom hooks
│   │   ├── use-color-scheme.ts
│   │   ├── use-theme.ts
│   │   └── use-sse.ts              ← Generic SSE hook
│   └── constants/
│       └── theme.ts                ← Color palette, spacing, typography
├── app.json                        ← Expo config (scheme, plugins, experiments)
├── package.json                    ← "main": "expo-router/entry"
└── tsconfig.json                   ← extends expo/tsconfig.base.json, paths: @/* → src/*
```

### Path Aliases

The `@/` alias maps to `src/` (configured in `tsconfig.json`). Always use it:

```ts
import { useAuthStore } from '@/stores/auth-store';
import { JobCard } from '@/components/job-card';
import { getJobs } from '@/api/jobs';
```

Assets outside `src/` are accessed via `@/assets/`:

```ts
import logo from '@/assets/images/logo.png';
```

### Platform-specific Files

Expo Router and Metro support platform suffixes automatically. Use them for web/native divergence:

```
component.tsx        ← native default
component.web.tsx    ← web override (Metro picks this on web)
```

---

## Key Screens — Spec

### Provider Dashboard (`src/app/(app)/index.tsx`)

- Welcome header with avatar + name + verification badge
- Stats row: Active Jobs | Pending Quotes | Wallet Balance | Avg Rating
- Profile completion progress bar (if < 100%) with "Complete Profile" CTA
- "Marketplace" shortcut (open jobs count)
- Recent job activity feed (last 5 jobs)
- Announcements banner (`GET /api/announcements`)

### Job Marketplace (`src/app/(app)/marketplace/index.tsx`)

- List of `open` jobs available to quote (`GET /api/jobs?status=open`)
- **AI ranking toggle**: when enabled, appends `&aiRank=true` → GPT-4o-mini ranked by provider profile relevance
- Filter bar: category, location, budget range, tags
- Job cards:
  - Title, category, budget, location distance (if GPS enabled)
  - PESO/LGU/Emergency tag chips (for tagged jobs)
  - `isPriority` jobs pinned to top with a "Priority" ribbon
  - "Already Quoted" badge if provider has submitted a quote
- Tap → Job Detail

### Job Detail + Quote (`src/app/(app)/marketplace/[id]/index.tsx`)

- Full job info: title, description, category, budget, location, tags, photos
- Client name + rating
- Existing quotes count (anonymous — provider can't see others' amounts)
- "Submit Quote" button → Quote form screen
- If already quoted: "Edit Quote" | "Retract Quote"

### Submit / Edit Quote (`src/app/(app)/marketplace/[id]/quote.tsx`)

- Quote form fields:
  - Proposed amount (with labor + materials breakdown)
  - Timeline (text)
  - Milestones table (add/remove rows: title + amount)
  - Notes textarea
  - AI "Suggest Reply" button (`POST /api/ai/suggest-replies`)
  - AI "Generate Quote Message" button (`POST /api/ai/generate-quote-message`)
  - Attach proposal document (`expo-document-picker`)
  - Site photos (image picker, multiple)
- **Load from Template**: bottom sheet picker of saved templates
- Submit → `POST /api/quotes` | Edit → `PUT /api/quotes/[id]`

### My Jobs (`src/app/(app)/jobs/index.tsx`)

- Tabs: Active | Completed | Disputed | Withdrawn
- Job cards: title, client name, agreed amount, status, start date
- Tap → Job Detail

### Active Job Detail (`src/app/(app)/jobs/[id]/index.tsx`)

- Job info + agreed amount
- Escrow status indicator (funded / pending)
- Action buttons by status:
  - `active` → Chat with Client | Upload Completion Photo
  - `completed_pending_review` → Awaiting client release
  - `disputed` → View Dispute
- Withdraw button (if still `active`) → withdraw confirmation screen

### Upload Completion Photo (`src/app/(app)/jobs/[id]/upload-completion.tsx`)

- Image picker (required)
- Caption / notes field
- Submit → PATCH job (completion photo endpoint)
- Triggers admin / client notification

### Withdraw from Job (`src/app/(app)/jobs/[id]/withdraw.tsx`)

- Reason text area (required)
- Confirm button → `POST /api/jobs/[id]/withdraw`
- Warn: "Withdrawing may affect your rating"

### My Quotes (`src/app/(app)/quotes/index.tsx`)

- List: job title, amount, status (pending / accepted / rejected / retracted)
- Status color chips
- Tap → Quote Detail

### Quote Detail (`src/app/(app)/quotes/[id].tsx`)

- Full quote breakdown
- Status: pending → show "Retract" button
- If accepted → "Go to Job" button

### Earnings / Wallet (`src/app/(app)/earnings/index.tsx`)

- Balance card (available PHP balance)
- Earnings summary: this month / all time
- Mini transaction list (last 5) with "See All" → transactions screen
- "Withdraw to Bank" CTA → withdraw screen
- Commission info: "LocalPro takes 10% per completed job"

### Transaction History (`src/app/(app)/earnings/transactions.tsx`)

- Paginated list (`GET /api/transactions`)
- Filter: All | Escrow Released | Commission | Withdrawal | Referral Bonus
- Each row: type icon, description, amount (green = credit, red = debit), date
- Export CSV option (`GET /api/transactions/export`)

### Withdrawal Request (`src/app/(app)/earnings/withdraw.tsx`)

- Available balance display
- Amount input (min ₱100)
- Bank details form: bank name, account number, account name
- Submit → `POST /api/wallet/withdraw`
- Pending withdrawal status list

### Message Threads (`src/app/(app)/messages/index.tsx`)

- All threads (`GET /api/messages/threads`)
- Each thread: other party name + avatar, job title, last message preview, unread badge, timestamp
- Tap → Chat window

### Chat Window (`src/app/(app)/messages/[threadId].tsx` and `src/app/(app)/jobs/[id]/chat.tsx`)

- Real-time SSE: `GET /api/messages/stream/[threadId]`
- Send: `POST /api/messages/[threadId]`
- Attachment: `POST /api/messages/[threadId]/attachment` (image picker, multipart)
- AI "Suggest Reply" button inline → `POST /api/ai/suggest-replies`
- Messages grouped by date, read receipts, timestamps

### Consultations (`src/app/(app)/consultations/`)

- Incoming requests list (`GET /api/consultations?status=pending`)
- Each card: client name, type (site inspection / chat), location, title
- Detail screen:
  - Client info, job description, photos
  - Accept / Decline with estimate amount + note (`PUT /api/consultations/[id]/respond`)
  - If accepted: messaging thread (`POST /api/consultations/[id]/messages`)

### Quote Templates (`src/app/(app)/quote-templates/`)

- List of saved templates (`GET /api/quote-templates`)
- Create (`POST /api/quote-templates`): name, labor, materials, timeline, milestones, notes
- Edit (`PATCH /api/quote-templates/[id]`)
- Delete (`DELETE /api/quote-templates/[id]`)
- Max 20 templates — show count warning near limit

### Profile — Edit (`src/app/(app)/profile/index.tsx`)

- Avatar (image picker + upload)
- Bio / About text
- Years of experience
- Hourly rate
- Skills section (tag input, suggestions from `GET /api/skills?q=`)
- AI skill suggester (`POST /api/ai/suggest-skills` from bio text)
- PESO badges display (if referred by PESO office)

### Service Areas (`src/app/(app)/profile/service-areas.tsx`)

- Map view with pins for each saved area
- Add area: label + address + map pin (`POST /api/providers/profile/service-areas`)
- Delete area: swipe or trash icon (`DELETE /api/providers/profile/service-areas/[id]`)
- Max 10 areas — enforce client-side

### Notifications (`src/app/(app)/notifications/index.tsx`)

- Full list with type icons and read/unread state
- SSE stream: `GET /api/notifications/stream`
- Tap → navigate to linked screen
- Mark all read: `PATCH /api/notifications`

### Support Chat (`src/app/(app)/support/index.tsx`)

- Chat UI with admin
- Fetch history: `GET /api/support`
- Send: `POST /api/support`
- SSE stream: `GET /api/support/stream`

### Loyalty & Referrals (`src/app/(app)/loyalty/index.tsx`)

- Tier card: Bronze → Silver → Gold (with XP bar)
- Points balance + recent transactions (`GET /api/loyalty`)
- Referral code + share button (`GET /api/loyalty/referral`)
- "Refer a Provider" → deep link share

### Settings (`src/app/(app)/profile/settings.tsx`)

- Email notification toggle
- Push notification toggle
- Profile visibility: public / private
- Submit: `PUT /api/user/settings`
- Change password section
- Logout

---

## Shared Components to Build

| Component             | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `JobCard`             | Marketplace job listing item with tags + budget       |
| `QuoteCard`           | Submitted quote with status chip                      |
| `ClientCard`          | Client mini-card                                      |
| `ChatBubble`          | Message bubble (sent / received) + attachment support |
| `StatusChip`          | Color-coded job/quote status labels                   |
| `StarRating`          | Display-only star rating                              |
| `TemplatePickerSheet` | Bottom sheet for selecting quote template             |
| `MilestonesTable`     | Add/edit/delete milestone rows in quote form          |
| `EarningsCard`        | Balance display with gradient                         |
| `NotificationBell`    | Unread badge icon in header                           |
| `EmptyState`          | Illustration + CTA for empty screens                  |
| `LoadingSkeleton`     | Shimmer card placeholders                             |
| `AvatarPicker`        | Image picker + upload                                 |
| `ServiceAreaMap`      | Map with draggable pins for service areas             |
| `ApprovalGate`        | Full-screen pending approval state                    |
| `AISuggestButton`     | Inline AI assist button for forms                     |

---

## State Management (Zustand Stores)

```ts
// src/stores/auth-store.ts
// { user, setUser, clearUser }

// src/stores/notification-store.ts
// { notifications, unreadCount, markRead, markAllRead, connectSSE }

// src/stores/earnings-store.ts
// Light local cache for wallet balance (refresh on focus)
```

TanStack Query handles all server cache (jobs, quotes, transactions, templates).

---

## Real-time SSE Pattern

```ts
import EventSource from 'react-native-sse';

// Notifications
const es = new EventSource(`${API_URL}/api/notifications/stream`, {
  headers: { Cookie: sessionCookie },
});
es.addEventListener('message', (e) => {
  const n = JSON.parse(e.data);
  useNotificationStore.getState().add(n);
});

// Job chat
const chatEs = new EventSource(`${API_URL}/api/messages/stream/${threadId}`, {
  headers: { Cookie: sessionCookie },
});
chatEs.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  appendMessage(msg);
});
```

---

## Business Logic Notes

- **Commission**: LocalPro deducts 10% from each job payment. Providers see net amount in wallet.
  - Show both gross and net on earnings screens.
- **Escrow lifecycle**: Job must be `funded` (escrow deposited) before provider starts work. Escrow releases to provider wallet when client marks complete (or admin resolves dispute in provider's favor).
- **Quote expiry**: Quotes that are not accepted expire automatically (cron job on backend). Show expired state.
- **Provider approval gate**: Check `isApproved` field on profile on every app foreground. If false → redirect to `pending-approval.tsx`.
- **AI ranking**: Only meaningful when provider profile has skills + bio filled in. Prompt incomplete profile users to fill in details for better matches.
- **PESO priority jobs**: `isPriority: true` jobs appear at top of marketplace with an orange "Priority" ribbon. `jobTags` may include `"PESO"`, `"LGU"`, `"Emergency"` — render as colored chips.

---

## Deep Links

```
localpro-provider://verify-email?token=xxx
localpro-provider://reset-password?token=xxx
localpro-provider://jobs/[id]
localpro-provider://marketplace/[id]
localpro-provider://notifications
```

Scheme is `localproprovider` (defined in `app.json → expo.scheme`).

---

## Environment Variables (`.env`)

```
EXPO_PUBLIC_API_URL=https://your-localpro-domain.com
EXPO_PUBLIC_APP_NAME=LocalPro Provider
```

---

## Error Handling Convention

All API errors return `{ error: string, code?: string }`. Map:

- `401` → refresh token → retry → if still 401, logout
- `403` → "You don't have permission" toast + navigate back
- `404` → empty state component
- `422` → surface Zod field errors on the form
- `429` → "Too many requests" toast
- `500` → "Something went wrong" + retry button

---

## Code Style Rules

- TypeScript strict mode throughout (`tsconfig.json` extends `expo/tsconfig.base.json`)
- All API calls in `src/api/` — one file per domain (`jobs.ts`, `quotes.ts`, `earnings.ts`, `templates.ts`, etc.)
- No raw fetch in JSX — all data via TanStack Query hooks or service functions
- Forms: React Hook Form + Zod via `zodResolver`
- Styling: StyleSheet API only — use theme constants from `src/constants/theme.ts` for colors, spacing, and typography; match the deep blue `primary` palette of the web app
- Always import via the `@/` alias (e.g. `@/components/job-card`, `@/stores/auth-store`)
- Use platform-specific files (`.web.tsx`) for any component that diverges significantly between native and web
- Reuse components — do not duplicate `ChatBubble`, `NotificationBell`, etc. across screens
- AI endpoints are optional enhancements — all flows must work without them (graceful fallback)
- Avoid manual `useMemo`/`useCallback` — the React Compiler handles memoization automatically
