---
name: completed-tasks-2026-10-15
description: Lightsail+Postgres backend deploy debugging, S3 migration from R2, frontend dead-code cleanup (Eventry hackathon app)
type: project
originSessionId: session-2026-10-15-deploy-debug
---

# Completed 2026-10-15 — Eventry (aws-ring-hackaton)

## Deployed backend (Lightsail) + frontend (Amplify)
- Fixed `aws_deployment_steps.md`: composer installer URL, missing `storage/framework/*` dirs, redis install (cache tagging needs it), duplicate `AWS_DEFAULT_REGION` env bug, S3 bucket-policy for public reads, swapfile + php-fpm tuning for small instance (412MB RAM, OOM kills), demo Ring device setup (Playground creds stored in DB not .env).
- Got `eventry-api.sixagroup.com` live: nginx+php-fpm+postgres+redis, certbot SSL, Amplify frontend wired to it via `VITE_API_URL`.
- Amplify build fixed: pnpm not preinstalled (corepack flaky in their image), monorepo `amplify.yml` with `appRoot: frontend`.

## Migration fixes (Postgres compat, repo was written MySQL-first)
- Fixed ~8 migrations using MySQL-only syntax (`MODIFY COLUMN ENUM`, `DATABASE()`, `SHOW INDEX`, backtick `DROP FOREIGN KEY`) — made driver-aware (pgsql branch using `DROP/ADD CONSTRAINT`).
- Found/fixed root cause: `users.role` column never existed (only `user_type`) — added missing rename migration `2024_01_01_000002_rename_user_type_to_role_in_users_table.php`. `user_type` is just a legacy JSON-response alias for `role` (confirmed via AuthController comment).
- Deleted 4 orphan migrations referencing tables that were never created (`subscription_plans`, `orders`, `card_templates`, `event_scraper_sources`) — confirmed no model/code depends on them.
- Deleted dead code: `SessionController`, `SpeakerController`, `Session` model, `Speaker` model (all unrouted, pointed at tables dropped in a prior speaker→user restructure).
- Fixed stale seeders (EventSeeder, SpeakerSeeder, SessionSeeder, PaymentSeeder) that referenced old column names/dropped tables.

## Real backend bugs fixed
- `UserController::show()`/`getProfile()` eager-loaded nonexistent `cards` relation → 500 on nearly every authenticated page load.
- Admin-created users missing `email_verified_at`.
- Switched all file uploads from R2 to S3 (`UserController`, `AdminController`, `LinkedinController`, `EventController`); fixed old-file-cleanup-wrong-disk bug and empty-S3-key edge case (silent upload failures now surface clearly).

## Frontend bugs fixed
- `CreateUser.tsx` — handleSubmit was a stub, never called the API; wired to `POST /users`. Added missing `team` role option (also in EditUser).
- `AdminAnalytics.tsx` — defaulted to a dead "Card Analytics" view (feature doesn't exist in this backend) that crashed on load; removed it, events-only now.
- `AdminSettings.tsx` — `Promise.all` with a 404ing `/my-card-templates` call silently blocked the real profile load, making the whole page always appear blank/"not saved". Decoupled the fetches.
- Nav-avatar cache (`useUserProfile`, 5min sessionStorage) never invalidated on profile save or logout — fixed in AdminSettings/user Settings/TeamSettings + authService clearAuthData.
- Landing page: added `EventIconsBg` decorative background component, fixed GitHub link, added Amplify to stack/AWS-work lists.

## Notes
- User explicitly said: never run `git commit`/`git push` without asking each time — confirmed and will follow.
- Full bug list written to `BUGS_RESOLVED.md` at repo root (not memory — that's a deliverable, this file is the session index).
- `aws_deployment_steps.md` and several files have uncommitted changes — user handles commits themselves.
