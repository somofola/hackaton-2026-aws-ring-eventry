# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Eventry** (repo: quick-card-nexus) is a cross-platform digital business card and event management app. The frontend is React + Vite + TypeScript deployed to web and native mobile via Capacitor. The backend is a Laravel API located in `./backend/`.

---

## Commands

### Frontend (React/Vite)

```bash
npm run dev        # Dev server on port 8080
npm run build      # Production build (also generates sitemap via postbuild)
npm run build:dev  # Dev-mode build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

### Mobile (Capacitor)

```bash
npx cap sync       # Sync web build to native projects
npx cap copy       # Copy web assets only
npx cap open android   # Open Android Studio
npx cap open ios       # Open Xcode
```

**Important for mobile builds**: set the env var before building, then sync:

```powershell
$env:VITE_API_URL = "https://your-api.com/backend/api"
npm run build
npx cap sync
```

### Backend (Laravel — from `./backend/`)

```bash
php artisan serve
php artisan migrate
php artisan test
```

---

## Environment

Create `.env` in the root:

```env
VITE_API_URL=https://eventry.app/backend/api
```

The API client (`src/services/api.ts`) falls back to `https://eventry.app/backend/api` when `VITE_API_URL` is not set.

---

## Architecture

### User Roles & Routing

There are four user types: `user`, `team`, `corporate`, `admin`. Each has:
- A dedicated route prefix (`/user/*`, `/team/*`, `/corporate/*`, `/admin/*`)
- A dedicated layout component in `src/components/layout/`
- Separate auth tokens in `localStorage` keyed by type (e.g., `auth_user_token`, `auth_admin_token`)

The `PrivateRoute` component (`src/components/auth/PrivateRoute.tsx`) validates the token against `/auth/validate-token` on every route change and redirects unauthenticated users to `/login` (web) or `/splash` (native).

### Auth System (`src/services/authService.ts`)

Tokens are stored in `localStorage` with the pattern `auth_{userType}_token`. The axios interceptor in `src/services/api.ts` auto-detects the active role from the URL path and attaches the corresponding Bearer token. On a `401` response, all auth data is cleared.

Auth methods supported: email/password, app PIN login, Google SSO, Microsoft SSO, LinkedIn SSO.

### API Layer (`src/services/`)

- `api.ts` — Axios instance with request/response interceptors
- `authService.ts` — Login, register, logout, token management, SSO callbacks
- `eventService.ts` — Event CRUD and ticketing
- `paymentService.ts` — Stripe-based payments
- `ticketService.ts` — Ticket management
- `cardActions.ts` — Business card operations
- `eventScraperService.ts` — Admin scraper-sources CRUD + preview/bulk/runs endpoints

All backend endpoints are under `VITE_API_URL`. The backend uses Laravel Sanctum for auth.

### Admin Event Scraper

`pages/admin/EventScraper.tsx` is a thin re-export of `pages/admin/event-scraper/EventScraperPage.tsx`. The page is split into small components under `components/admin/event-scraper/`: `StatCard`, `SourceTable`, `SourceFormDialog` (per-source + UTM/affiliate fields), `BulkAddDialog` (paste-list + CSV), `PreviewDrawer` (dry-run scrape), `SourceDetailDrawer` (Recharts activity chart from `/scraper-sources/{uuid}/runs` + error log). Shared types in `types/eventScraper.ts`.

After a successful event enrollment the backend may return `external_registration: { url, embed_mode, can_iframe, origin }` on the payment init / verify response. `EventCheckout.tsx` stashes it in `sessionStorage` keyed by event id; `EventConfirmation.tsx` reads it and shows `components/events/ExternalRegistrationModal.tsx` — iframe when the origin allows it (`X-Frame-Options` / CSP cleared by backend HEAD probe), new tab otherwise. Eventry issues its own QR ticket regardless.

### Frontend Structure

```
src/
├── App.tsx              # Route definitions for all roles
├── pages/
│   ├── auth/            # Login, Register, VerifyEmail, PasswordReset
│   ├── user/            # User dashboard pages
│   ├── admin/           # Admin pages (users, cards, events, blog, content)
│   ├── corporate/       # Corporate pages (team, events, analytics, billing)
│   ├── team/            # Team pages (check-in, events)
│   ├── cards/           # Public card view (/card/:uuid)
│   ├── qr/              # QR generator and history (guest)
│   └── events/          # Public event listing
├── components/
│   ├── auth/            # PrivateRoute, SSO callback handlers
│   ├── layout/          # GuestLayout, UserLayout, AdminLayout, CorporateLayout, TeamLayout
│   ├── scanner/         # QRScanner.tsx (qr-scanner library)
│   ├── payments/        # Stripe / payment gateway components
│   └── ui/              # shadcn/ui components (Radix UI based)
├── services/            # API service modules (see above)
├── hooks/               # useApi, usePermissions, useMobile, useTrackPreviousPath
├── types/               # Shared TypeScript types
├── lib/utils.ts         # cn() helper (clsx + tailwind-merge)
└── utils/               # qrGenerator, cardActions, distance helpers
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
| QR scanning | qr-scanner |
| QR generation | react-qr-code |
| Payments | Stripe (`@stripe/react-stripe-js`) |
| PDF export | jsPDF + html2pdf.js |
| Mobile bridge | Capacitor v7 |
| Icons | Lucide React |

### Capacitor Config (`capacitor.config.ts`)

App ID: `com.passmobilegeneral.app`, App Name: `Pass Mobile Extreme`, web build dir: `dist`.

### Alias

`@` maps to `src/` (configured in `vite.config.ts` and `tsconfig`).
