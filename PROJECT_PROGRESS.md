# Project Progress - APIMart / HappyHorse 1.0 Integration

Date: 2026-04-29

## Completed

1. Added APIMart as a video AI provider.
   - Provider name: `apimart`
   - Model ID: `happyhorse-1.0`
   - Create endpoint: `/v1/videos/generations`
   - Query endpoint: `/v1/tasks/{task_id}?language=zh`
   - APIMart callback/webhook fields are not used in this first version.

2. Added HappyHorse 1.0 to the product workflow.
   - Homepage default model is now `HappyHorse 1.0`.
   - `/ai-video-studio` default model is now `HappyHorse 1.0`.
   - `WAN 2.7` remains selectable on the homepage and in Studio.
   - The selected model is carried through homepage handoff, Studio draft state, task submission, History, My Creations, and Recreate.

3. Added model-aware Workspace behavior.
   - HappyHorse Text to Video: prompt + resolution + duration + ratio + optional seed.
   - HappyHorse Image to Video: prompt + first frame image + resolution + duration + optional seed.
   - HappyHorse Reference to Video: prompt + 1-9 reference images + resolution + duration + ratio + optional seed.
   - HappyHorse Video Edit: prompt + source video + optional reference image + resolution + audio setting + optional seed.
   - WAN 2.7 behavior is preserved for existing modes and media inputs.

4. Preserved Creem moderation flow.
   - All HappyHorse submissions still pass through `/api/ai/generate`.
   - Prompt is required before submission for all HappyHorse modes.
   - Creem moderation runs before credits, task creation, or provider calls, matching the existing WAN flow.

5. Added model-specific credits.
   - Server env:
     - `HAPPYHORSE_720P_CREDITS_PER_SECOND=20`
     - `HAPPYHORSE_1080P_CREDITS_PER_SECOND=25`
   - Client env:
     - `NEXT_PUBLIC_HAPPYHORSE_720P_CREDITS_PER_SECOND=20`
     - `NEXT_PUBLIC_HAPPYHORSE_1080P_CREDITS_PER_SECOND=25`
   - EDIT billing uses uploaded source video duration when available, capped at 15 seconds. If duration cannot be read, it charges conservatively as 15 seconds.

6. Added config defaults.
   - `.env.example` and `.env.development` now include:
     - `APIMART_API_KEY`
     - `APIMART_BASE_URL`
     - `APIMART_CUSTOM_STORAGE`
     - HappyHorse credit env vars
   - Admin AI settings now include APIMart API key/base URL/custom storage fields.
   - `APIMART_CUSTOM_STORAGE` defaults to enabled so generated video URLs are copied into project storage before APIMart URLs expire.

7. Added model labels in generated video cards.
   - History and My Creations now display readable model badges such as `HappyHorse 1.0` and `WAN 2.7`.

8. Fixed one APIMart docs build blocker.
   - `content/docs/APIMART/获取任务状态.md` had an `objectivec` code fence unsupported by the current Shiki bundle.
   - Changed that fence to `text` so the docs route can build.

## Verification

- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.

## Notes

- SEO metadata and route structure were not changed.
- Existing WAN 2.7 provider logic was not rewritten; it remains on the Kie provider.
- The existing upload channel still enforces `NEXT_PUBLIC_STUDIO_UPLOAD_MAX_FILE_BYTES` if configured, otherwise the current default remains 4 MB. APIMart allows larger media, so production may need this env raised if you want users to upload larger source videos directly.
- Existing unrelated local change `docs/mobile-header-auth-ux-report-2026-04-14.md` was left untouched.
