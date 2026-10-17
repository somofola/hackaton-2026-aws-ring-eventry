# Eventry — Friction Log (Ring API)

Submitted for the Amazon Developer Hackathon 2026 judging bonus.

---

## Entry 1 — Testing face/QR check-in without physical Ring hardware

- **Task attempted**: validate the Rekognition face-match check-in flow end-to-end using Ring Playground's virtual device.
- **Steps taken**: created a Playground virtual device, opened a WHEP live-view session against it, attempted to feed it a real face for Rekognition to match.
- **Expected**: Playground device accepts or proxies a real camera feed so the full pipeline (webhook → frame capture → Rekognition match) can be tested with an actual face.
- **Actual**: Playground only serves Ring's own pre-recorded canned footage. No mechanism to attach a local camera or custom image/video source.
- **Severity**: Critical
- **Workaround**: built a parallel check-in path in our own kiosk UI using `getUserMedia` + client-side QR decoding (`qr-scanner`), entirely bypassing Ring's capture pipeline for dev/demo purposes.
- **Suggestion**: let Playground virtual devices accept a WebRTC/webcam feed as an alternative video source, so builders without hardware can exercise the complete pipeline, not just the webhook plumbing.

## Entry 2 — Finding the production webhook signature scheme

- **Task attempted**: implement signature verification for Ring webhooks before going to production (Playground mode only requires a Bearer token check).
- **Steps taken**: read Ring's official `ring-api-helloworld` sample and developer docs for the webhook verification pattern.
- **Expected**: sample code or docs showing the production HMAC signature check.
- **Actual**: sample code only demonstrates the simplified Playground bearer-token check; the real HMAC-SHA256 scheme (`X-Signature: sha256=<hmac>` over the raw body) isn't documented or shown in any sample.
- **Severity**: High
- **Workaround**: reverse-engineered the signature construction from the webhook payload spec and cross-referenced it against observed request headers.
- **Suggestion**: publish a production-mode webhook verification sample alongside the Playground one — the gap between the two modes isn't obvious until you're already in production.

## Entry 3 — Webhook ack window forcing synchronous/async redesign

- **Task attempted**: generate an AI caption (via Bedrock) for each Ring doorbell event and return it inline in the webhook response.
- **Steps taken**: called Bedrock's Converse API synchronously inside the webhook handler.
- **Expected**: response completes within Ring's ack window, same as any other fast webhook handler.
- **Actual**: Bedrock round-trip latency isn't guaranteed to land inside Ring's ~5-second ack window; occasional webhook timeouts/retries resulted.
- **Severity**: Medium
- **Workaround**: moved the Bedrock call to a deferred job dispatched after the webhook response (`dispatch(...)->afterResponse()`), cached the caption per-device for 45s.
- **Suggestion**: state the ack window and its consequences (retry/backoff behavior) explicitly and prominently in the webhook integration docs, not just implied by a timeout existing somewhere in the system.

## Entry 4 — Multi-tenant device/credential mapping

- **Task attempted**: let each event scope a Ring device (real or Playground) without permanently binding that device to one tenant in a database.
- **Steps taken**: looked for a Ring API concept of temporary/contextual device scoping.
- **Expected**: some first-class way to say "this device belongs to context X for now."
- **Actual**: no such concept exists — ownership is implicit and static.
- **Severity**: Low
- **Workaround**: built our own runtime-cache-based arm/disarm-by-event mapping layer (`RingCredentialResolver`) rather than a DB-column ownership model.
- **Suggestion**: a lightweight "device context" API primitive would save every multi-tenant integrator from building this themselves.
