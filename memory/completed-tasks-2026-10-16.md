---
name: completed-tasks-2026-10-16
description: Added Team bio section (photo + LinkedIn + blurb) to Eventry landing page
type: project
originSessionId: session-2026-10-16-team-bio
---

# Completed 2026-10-16 — Eventry (aws-ring-hackaton)

## Landing page — Team section
- Replaced plain "Built by the team..." text under "Where AWS does the work" with real bio: photo, name, LinkedIn link, title, short blurb.
- Photo copied from user's local file into `frontend/src/assets/team/shola-omofola.jpg`.
- LinkedIn profile (`linkedin.com/in/sholaomofola/`) blocked by WebFetch (auth wall, HTTP 999) — user pasted full profile text manually instead.
- Edited `frontend/src/pages/public/Landing.tsx`: added `sholaPhoto` import, replaced Team `<div>` block with photo + name + LinkedIn icon link + title line ("Full-Stack Software Engineer · AWS · Executive MBA") + blurb mentioning Rekognition/S3/Lightsail/Amplify.

## Notes
- No commit made by me — user commits their own changes (standing rule, see [[completed-tasks-2026-10-15]]).
