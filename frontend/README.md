
# Eventry Frontend

React + Vite + TypeScript SPA for **Eventry** — event registration, ticket payments, and Ring-device + facial-recognition check-in. Deployable to web and native mobile (iOS/Android) via Capacitor. Built from a stripped-down PassIDy/CardConnect codebase for an AWS Builder hackathon.

## Roles

Three roles, each with its own route prefix, layout, and `localStorage` token (`auth_{role}_token`):

- `admin` — platform operator: event authoring (speakers/sessions/sponsors/exhibitors/ticket categories/floor plans), Ring device pool management, dashboard/analytics
- `team` — check-in staff: manual / Ring / face check-in for an event
- `user` — attendee: browse events, enroll, pay for tickets, view own enrollments

## Commands

```bash
npm run dev          # Dev server on port 8080
npm run build         # Production build
npm run build:dev     # Dev-mode build
npm run build:mobile  # Build + cap sync + bump native version
npm run lint          # ESLint
npm run preview       # Preview production build locally
```

## Mobile (Capacitor)

```bash
npx cap sync              # Sync web build to native projects
npx cap open android       # Open Android Studio
npx cap open ios           # Open Xcode
```

Set the API URL before building for mobile:

```powershell
$env:VITE_API_URL = "https://your-api.com/backend/api"
npm run build
npx cap sync
```

## Environment

Create `.env` in the frontend root:

```env
VITE_API_URL=https://your-api.com/backend/api
```

Falls back to a default in `src/services/api.ts` if unset.

## Architecture

### Auth (`src/services/authService.ts`, `src/services/api.ts`)
Tokens stored per-role in `localStorage` as `auth_{role}_token`. Axios interceptor auto-detects active role from the URL path and attaches the matching Bearer token. `401` clears all auth data. `PrivateRoute` validates the token against `GET /auth/validate-token` on every route change. SSO supported: Google, Microsoft, LinkedIn, Apple.

### Check-in (`components/events/CheckInScanner.tsx`, `pages/team/TeamCheckIn.tsx`)
Three tabs: manual (click-to-check-in from attendee list), Ring (device capture + face-match via `useFaceCapture`), and face (standalone camera capture via `FaceCheckInScanner.tsx`/`FaceCaptureDialog.tsx`).

### Ring Devices (`pages/admin/RingDevices.tsx`, `services/ringDeviceService.ts`)
Admin manages a shared device pool; devices can also be self-onboarded by whoever owns one. Live view via WHEP, chime/capture test tooling, arm/disarm per event.

### Payments (`pages/events/EventCheckout.tsx`, `services/paymentService.ts`)
Stripe and Paystack checkout for event tickets; native in-app purchase support via `cordova-plugin-purchase`.

### Public Landing Page (`pages/public/Landing.tsx`)
Hero, latest events, "Stack & tools" (hackathon entry framing — stack badges), contact section. Replaces the separate `frontend-seo` marketing site, which was removed.

### Structure

```
src/
├── App.tsx              # Route definitions for all roles
├── pages/
│   ├── auth/            # Login, Register, VerifyEmail, PasswordReset
│   ├── public/           # Landing page
│   ├── user/            # Attendee dashboard, enrollments, billing-free payment flows
│   ├── admin/           # Event authoring, Ring device management, analytics
│   ├── team/            # Check-in (manual/Ring/face)
│   └── events/           # Public event listing, checkout, confirmation
├── components/
│   ├── auth/            # PrivateRoute, SSO callback handlers
│   ├── layout/           # GuestLayout, UserLayout, AdminLayout, TeamLayout
│   ├── events/           # CheckInScanner, EventBadge, AttendeeBadge, ExternalRegistrationModal
│   ├── payments/         # Stripe / Paystack components
│   └── ui/               # shadcn/ui components (Radix UI based)
├── services/              # api.ts, authService.ts, eventService.ts, paymentService.ts, ringDeviceService.ts
├── hooks/                 # useApi, usePermissions, useMobile, useFaceCapture
├── types/                 # Shared TypeScript types
└── lib/utils.ts            # cn() helper (clsx + tailwind-merge)
```

### Key Libraries

| Purpose | Library |
|---|---|
| UI components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS |
| Data fetching | TanStack Query v5 |
| HTTP client | Axios |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| QR generation (tickets) | react-qr-code |
| Payments | Stripe (`@stripe/react-stripe-js`), Paystack |
| PDF export | jsPDF + html2pdf.js |
| Mobile bridge | Capacitor v8 |
| Icons | Lucide React |

### Capacitor

App ID: `com.passmobilegeneral.app`. Web build dir: `dist`. After any build intended for mobile, run `npx cap sync`.

### Alias

`@` maps to `src/` (configured in `vite.config.ts` and `tsconfig`).

## Backend

See `../backend/README.md` and `../backend/API_DOCUMENTATION.md` for the Laravel API this app talks to.
