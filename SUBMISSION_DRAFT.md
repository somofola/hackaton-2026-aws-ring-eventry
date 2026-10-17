# Eventry — Amazon Developer Hackathon 2026 Submission Draft

Deadline: **Oct 23, 2026 @ 8:00pm GMT+1** (per devpost.com snapshot taken 2026-10-17 — "6 more days"). Confirm exact deadline on https://amazonappdev2026.devpost.com/details/dates before final submit.

Repo: https://github.com/somofola/hackaton-2026-aws-ring-eventry (public, MIT license already present at `/LICENSE` — satisfies the public-repo requirement)

---

## 1. Project name

Eventry

## 2. Tagline (short, 1 line)

Event check-in that recognizes your guests — Ring + AWS Rekognition, no scanning, no queueing.

## 3. Tracks entering

- **Primary track: Ring** — new/extended app using Ring APIs/SDKs. Priority category: *access control* (face-matched entry) and *caretaking/business systems* (event operations).
- **Mini challenge: AWS Builder** — AWS Rekognition (face match), Bedrock (AI captions), S3 (storage), Lightsail (hosting), Amplify (frontend hosting) — documented integrations.
- **Mini challenge: Open Source** — repo is public with an OSS license (MIT). *(If you want to also qualify via a separate contribution — a PR/fork to someone else's public repo — that still needs to happen separately during the hackathon window; the Eventry repo alone being public/MIT satisfies "ship a new open-source project" only if this repo itself counts as "new" — see TODO below.)*

## 4. What it does / how it works (text description)

Eventry is a digital event management platform built for this hackathon around one problem: getting attendees through the door without friction, using hardware most venues already own — a Ring camera — paired with opt-in facial recognition.

Flow:
1. **Register & pay** — attendee buys a ticket via Stripe or Paystack; a QR badge is issued as a fallback.
2. **Opt in with a selfie** — one photo captured, converted to a face vector via AWS Rekognition, scoped to that event only.
3. **Ring detects arrival** — a motion/doorbell event fires a signed webhook with a captured frame to the backend.
4. **Match & check in** — Rekognition compares the frame to opted-in attendees; a confident match auto-checks them in and chimes the Ring device.

Beyond the Ring flow, Eventry is a full event platform: ticketing, admin/organizer dashboards, team check-in tooling, event enrollment management, and user-facing event discovery/registration.

## 5. Built With (tags)

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Laravel, PostgreSQL, Redis, Sanctum, AWS Rekognition, AWS S3, AWS Bedrock, AWS Lightsail, AWS Amplify, Ring API, Stripe, Paystack, Capacitor

## 6. Live demo / try it out

- Frontend: https://eventry-app.sixagroup.com/
- API: https://eventry-api.sixagroup.com/
- Test payment: Stripe test card `4242 4242 4242 4242`, any future expiry/CVV/zip.

## 7. Demo video (REQUIRED, <3 min, YouTube/Vimeo, public, English)

**TODO — not yet recorded.** Script suggestion, in priority order (judges may stop at 3 min):
1. (0:00–0:20) One-line pitch + show the Ring-camera-to-checkin concept visually.
2. (0:20–1:00) Attendee flow: register → pay (Stripe test card) → selfie opt-in.
3. (1:00–2:00) Ring device/simulator triggers webhook → Rekognition match → auto check-in + chime, shown live or via simulator.
4. (2:00–2:40) Quick tour of admin dashboard: events list, enrollments, archived users.
5. (2:40–3:00) AWS services recap (Rekognition, S3, Bedrock, Lightsail, Amplify) + close.

## 8. Product feedback on every tool/API/SDK used (REQUIRED)

### Ring API / SDK / Playground simulator

**What we used it for**: webhook-driven event check-in. A doorbell/motion event on a Ring device fires a signed webhook to our backend; we open a live WHEP session against the device to pull a frame, decode a QR badge (or run it through Rekognition for face match), and auto-check the attendee in. We also built a multi-tenant credential layer (`RingCredentialResolver`) so a corporate account's own linked Ring device falls back to Eventry's shared Playground credentials when they haven't linked one — useful for demoing without every organizer needing their own Ring hardware/account.

**What worked well**: the Playground virtual device is genuinely useful for development without physical hardware — WHEP live-view sessions work against it exactly like a real device, and the arm/disarm-by-event design (a runtime cache mapping, not a DB column) let the same virtual/physical device serve different events without any ownership-record churn.

**What needed work / friction**: webhook signature verification is real HMAC-SHA256 over the raw body (`X-Signature: sha256=<hmac>`), but Ring's own `ring-api-helloworld` sample code only demonstrates the simplified Bearer-token check used in Playground mode — it doesn't show the production HMAC path at all, so we had to work that out from the webhook payload spec rather than the sample. The 5-second ack window is also tight: anything slower (we hit this with Bedrock image captioning) has to be deferred to a queued job rather than done inline, which isn't obviously flagged anywhere in the onboarding docs.

**The webcam gap**: the single biggest piece of missing tooling is that the **Playground device only serves Ring's own canned footage** — there's no way to pipe a local webcam into a Playground virtual device, so testing the actual face-match/check-in flow end-to-end with a real face requires either a physical Ring device or faking the capture path entirely. We ended up adding our own laptop-webcam fallback directly in our check-in kiosk UI (`RingCheckInView.tsx`) using `getUserMedia` + client-side QR decoding, bypassing Ring's capture pipeline altogether whenever a developer doesn't have the real hardware on hand. This should be a first-class Playground feature: let a developer attach their laptop camera as the virtual device's video source instead of (or alongside) Ring's canned demo footage, so the full pipeline — including face enrollment/match — can be exercised without physical Ring hardware.

**Would we use it again**: yes — the credential/multi-tenant model and webhook design held up well. The simulator just needs a real camera input option to be genuinely complete for development.

### AWS Rekognition

**What we used it for**: opt-in face check-in. One Face Collection per event (`event-{id}`), `IndexFaces` on opt-in (keyed by `ExternalImageId = enrollment_id`, not user id, so identity resolution is scoped per-enrollment rather than globally), `SearchFacesByImage` against captured Ring/webcam frames with a configurable match threshold (`AWS_REKOGNITION_MATCH_THRESHOLD`, default 92).

**What worked well**: per-event collections made the privacy story simple — deleting a collection after an event ends (`PurgeEventFaceData`, scheduled) is a real, complete "we never stored your photo, only a vector, and now it's gone" guarantee we could built around, not a vague privacy policy line. `InvalidParameterException` on a faceless frame is expected and easy to no-op on rather than treat as an error.

**What needed work**: tuning the match threshold took trial and error — there's no in-console/API guidance for what a "good" threshold looks like for a check-in use case specifically vs. e.g. security/surveillance use cases, so we had to arrive at 92 empirically.

**Would we use it again**: yes, without hesitation — it's the core of the product.

### AWS Bedrock

**What we used it for**: AI captioning of the Ring doorbell thumbnail (the AWS Builder mini-challenge integration) — the kiosk shows a one-sentence factual caption of who/what is approaching instead of a bare "motion detected," via the Converse API with a multimodal (image + text) message, capped at 60 tokens.

**What worked well**: the Converse API's unified multimodal message format was simple to integrate once we found it — no separate image-encoding dance per model family.

**What needed work**: latency is the real constraint. A Bedrock round-trip isn't guaranteed to land inside Ring's 5-second webhook ack window, so we had to explicitly defer the captioning call out of the webhook's synchronous path (`dispatch(...)->afterResponse()`) and cache the result per-device for 45s. This isn't a Bedrock bug, just a real architectural cost that isn't obvious until you're integrating it behind a hard external deadline like Ring's.

**Would we use it again**: yes — for always-async use cases it's excellent; for latency-sensitive synchronous paths it needs explicit queuing discipline.

### AWS S3

**What we used it for**: object storage for uploads (profile photos, event assets, floor plans) — migrated mid-hackathon off Backblaze B2 and Cloudflare R2 onto S3 to consolidate on one AWS-native stack.

**What worked well**: once bucket policy + CORS were configured correctly, the Laravel S3 filesystem driver is a drop-in disk swap — no application-code changes needed beyond the disk name.

**What needed work**: the migration itself surfaced two real bugs — an old-file-cleanup routine was still deleting from the previous (B2/R2) disk after the switch, and an empty-S3-key edge case failed silently instead of surfacing an error. Also had to separately configure a bucket policy for public reads and a CORS policy referencing the Amplify frontend domain before uploaded assets would actually load cross-origin — neither is enabled by default, and it's easy to deploy believing uploads work (they succeed) only to find images don't render in the browser.

**Would we use it again**: yes.

### AWS Lightsail

**What we used it for**: hosting the Laravel API — nginx + PHP-FPM + PostgreSQL + Redis, all self-managed on one instance.

**What worked well**: predictable flat pricing and full root access made it easy to reproduce a normal LEMP deployment we already knew how to operate.

**What needed work**: the smallest instance tier's RAM is tight enough that normal PHP-FPM worker counts can OOM under load — needed a swapfile and worker-count tuning to stay stable. We also hit a stale-OPcache gotcha: changing `CACHE_DRIVER` to `redis` after an earlier `config:cache` silently kept serving the old cached config until we ran `config:clear && config:cache` and restarted `php-fpm`. And most recently, `php8.3-gd` wasn't in our original install list, which broke floor-plan image uploads in production with an opaque `GD PHP extension must be installed` error until we traced it back and installed it.

**Would we use it again**: yes, but it's a "normal Linux box" experience — every failure mode (OOM, stale OPcache, missing PHP extension) is something you have to know to look for yourself, nothing is platform-abstracted away the way a managed PaaS would.

### AWS Amplify

**What we used it for**: hosting the React/Vite frontend, with `VITE_API_URL` injected as a build-time environment variable to point the static build at the Lightsail-hosted API.

**What worked well**: once configured, deploys are standard CDN/CloudFront hosting with no further friction — push to the connected branch, get a built, globally-distributed frontend.

**What needed work**: `pnpm` isn't preinstalled in Amplify's build image and `corepack enable` was flaky in the build step, so we had to pin/install `pnpm` explicitly in build settings. The monorepo layout (frontend in a subdirectory) also needed the app root explicitly configured in Amplify's console build settings rather than being auto-detected.

**Would we use it again**: yes — the friction was all one-time setup, not ongoing.

## 9. Pre-existing project disclosure (REQUIRED since this repo predates the hackathon window)

Repo history starts 2026-10-15; this submission's build window should be stated precisely. **TODO — confirm the hackathon's actual start date** (not visible in the saved page snapshot — check https://amazonappdev2026.devpost.com/details/dates), then write:

> "Eventry builds on an existing event-management codebase (PassIDy/quick-card-nexus). During the hackathon window we added: Ring device integration (webhook-driven check-in), AWS Rekognition face-match enrollment/check-in, [Bedrock caption feature — confirm scope], admin/events fixes, public event detail + guest registration flow, and the AWS Lightsail+Amplify production deployment."

## 10. Optional: Feature requests

TODO — e.g. requests around Ring simulator fidelity, Rekognition face-collection management APIs, etc. (severity: critical/important/nice-to-have)

## 11. Optional: Friction log (up to +10% judging bonus)

TODO — for each integration: task attempted → steps → expected vs actual → severity → workaround → suggestion. Worth doing given the bonus.

## 12. GitHub collaborators to add before submitting (REQUIRED)

Settings → Collaborators → Add:
`chris-trag`, `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar`
(repo is public already, so this step is for reviewer convenience / not strictly required the way it is for private repos — confirm if still wanted since repo is public)

---

## Open items before this is submit-ready

1. Record demo video (#7). Suggest including the new laptop-webcam check-in mode (`RingCheckInView.tsx`, "Laptop Webcam (dev playground)" toggle) as proof the face/QR check-in pipeline works end-to-end even without a Ring Playground account — plays well against the Ring feedback in #8.
2. ~~Write product feedback per tool (#8)~~ — done.
3. Confirm hackathon start date and finalize the pre-existing-project disclosure (#9).
4. Decide on Open Source mini-challenge approach — does this repo being public/MIT qualify as "a new open-source project," or do you want a separate PR/fork to another public repo during the window (#3)?
5. Optionally write feature requests / friction log for the judging bonus (#10, #11).
