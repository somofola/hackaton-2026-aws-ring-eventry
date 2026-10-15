---
name: completed-tasks-2026-06-14
description: Card template AI pipeline migration — NVIDIA NIM integration, gpt-image-1 swap, JSON-mode hardening, log/UI rename
type: project
originSessionId: unknown
---

# Session 2026-06-14

## Context
Continuation of prior card-template work. User has NVIDIA NIM API keys, wanted to use them in place of OpenAI/OpenRouter for the card-template vision pipeline. Background-removal step (DALL-E) was misconfigured, returning original image with text still embedded under overlay placeholders.

## Completed

### 1. NIM swap guidance (vision pipeline)
- Identified that `AI_PROVIDER_*` env vars (lines 153–155 of `backend/.env`) feed `CardTemplateController` chat-completions call via `services.ai.endpoint|key|model`.
- Confirmed code uses OpenAI-shaped payload (`messages[].content[].image_url`, `Bearer` auth, `choices[0].message.content`) → NIM is drop-in.
- Recommended:
  - Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
  - Model: `meta/llama-3.2-90b-vision-instruct` (vision-capable, non-reasoning)
- Flagged: text-only NIM models (e.g. `nvidia/nemotron-nano-9b-v2`, `meta/llama-3.3-70b-instruct`) will 4xx on `image_url` blocks.

### 2. Reasoning-model JSON truncation fix (Fixes 2 & 3)
Issue: model was burning the 4096 completion budget on chain-of-thought ("Let's craft final JSON...") and never emitting JSON. `usage.reasoning_tokens: 4099` confirmed reasoning model.

**Fix 2 — `CardTemplateController.php`** (both payloads at original lines 121 and 267):
- Added `'temperature' => 0`
- Added `'response_format' => ['type' => 'json_object']` — API-side JSON guarantee (OpenRouter / NIM / OpenAI all support).

**Fix 3 — `backend/resources/prompts/card_template_background_system.txt`**:
- Appended `OUTPUT CONTRACT — STRICT` block:
  - First char `{`, last char `}`, no markdown fences, no preamble/epilogue
  - Forbid "Here is", "Sure", "Let me", reasoning, narration
  - HTML value must be single-line escaped string
  - Error fallback: `{"error":"<reason>"}`

### 3. Flagged separate bug (not fixed)
`CardTemplateController.php` line 119 reads `prompts/card_template_system.txt` — that exact filename does NOT exist on disk. Folder has `-def.txt`, `-def (2).txt`, `-syscmd.txt` variants only. `file_get_contents` silently returns false → empty system prompt sent to model. User needs to rename one canonical file.

### 4. DALL-E → gpt-image-1 migration (TextRemovalService)
Issue chain after enabling text removal:
1. Error `Unknown parameter: 'response_format'` — account had been migrated to `gpt-image-1` which rejects `response_format`.
2. Subsequent risk: `gpt-image-1` rejects 256x256 / 512x512 sizes.
3. After fixes worked: card with **white background was being recolored black** (gpt-image-1 is a generation model bolted onto edits endpoint — reinterprets entire image, not faithful inpainting).

**Edits in `app/Services/TextRemovalService.php` `callDalleEdit()`**:
- Removed `'response_format' => 'b64_json'` param (gpt-image-1 returns b64 by default).
- Added size clamp: if model starts with `gpt-image`, force `'1024x1024'`; else keep dall-e-2 dynamic sizing.
- Rewrote prompt with explicit color-preservation instructions ("preserve white as white", "do not recolor pixels outside mask", "only masked text disappears").
- Added gpt-image-1-specific params: `input_fidelity: 'high'`, `quality: 'high'`, `background: 'opaque'`.
- Note: `input_fidelity: high` is the critical param to prevent wholesale recoloring.

User to set `OPENAI_DALLE_MODEL=gpt-image-1` in `backend/.env` line 169 and run `php artisan config:clear`.

### 5. Log + UI message rename (DALL-E → AI)
After migration, removed product-specific naming:
- `CardTemplateController.php` line 332 comment → `"Step 2: Remove text from image using AI inpainting"`
- `CardTemplateController.php` line 337 log → `"Attempting AI text removal"` (was `"Attempting text removal with OpenAI DALL-E"`)
- `frontend/src/components/cards/DesignTemplateUploadDialog.tsx` line 400 UI text → `"AI text removal unavailable. Using overlay mode instead."`

Skipped (per user scope): internal references in `TextRemovalService.php`, `config/services.php`.

## Security Items Flagged (user action required)
Multiple secrets leaked plaintext in chat — must rotate:
- OpenAI key (line 168 of `backend/.env`)
- OpenRouter key (line 154)
- Stripe keys (commented lines 140–141)

## Files Touched
- `backend/app/Http/Controllers/CardTemplateController.php` — 2 payloads + log/comment rename
- `backend/app/Services/TextRemovalService.php` — gpt-image-1 compatibility + color-preservation prompt
- `backend/resources/prompts/card_template_background_system.txt` — OUTPUT CONTRACT section
- `frontend/src/components/cards/DesignTemplateUploadDialog.tsx` — UI message rename

## Open Items
1. Rotate leaked secrets (OpenAI, OpenRouter, Stripe).
2. Rename canonical card_template_system prompt file so line 119 read succeeds.
3. If `gpt-image-1` still recolors white→black after `input_fidelity: high`, switch to mask-faithful inpainter: NIM `bria/eraser-2.0` or HuggingFace LaMa. gpt-image-1 fundamentally generation-based, not pure inpaint.
4. Optional: drop `quality: high` → `medium` to cut cost (~$0.17 → ~$0.04 per image).
