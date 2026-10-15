---
name: completed-tasks-2026-06-14-session2
description: gpt-image-1 moderation_blocked fix — prompt scrubbed for output safety filter
type: project
originSessionId: unknown
---

# Session 2026-06-14 (session 2)

## Context
Continuation post-/compact. User retried card-template upload, hit OpenAI `moderation_blocked` at output stage on gpt-image-1 edits call. req_9444ba0cc1e64479aec2b3583f72483e.

## Completed

### Prompt scrub (TextRemovalService.php callDalleEdit)
Old prompt mentioned "logos", "if card is white keep white / if blue keep blue" — brand/color terms can trip OpenAI output moderation on generative model.

New prompt:
```
Fill the transparent masked regions with the surrounding background color and texture.
Keep every pixel outside the mask identical.
Do not change the overall background color.
Do not add, redraw, or invent any shapes, symbols, letters, or graphics.
Output a clean, abstract background card with no text and no figurative content.
```

Other gpt-image-1 params unchanged: `input_fidelity: high`, `quality: high`, `background: opaque`, size 1024x1024.

## Open Items
1. If `moderation_blocked` recurs → catch error in `callDalleEdit()`, return null, let overlay-mode fallback kick in (currently throws / logs only).
2. Cost-cut: drop `quality: high` → `medium` (~4x cheaper, may also reduce hallucination triggering filter).
3. Migrate to NIM `bria/eraser-2.0` (true inpaint, no generative safety stage) — already flagged session 1.
4. Capture OpenAI response `x-request-id` header into logs for support escalation.
5. Carryover from session 1: rotate leaked secrets, rename `card_template_system.txt` canonical file.

## Files Touched
- `backend/app/Services/TextRemovalService.php` — prompt rewrite (~lines 235–242)
