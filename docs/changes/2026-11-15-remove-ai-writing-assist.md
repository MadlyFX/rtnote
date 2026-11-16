# Remove AI writing assist

Project plan: Phase 4.

## Problem and outcome

RTNote shipped built-in AI writing features on every platform. They are removed. MCP stays, so external agents can still read and write notes. Speech transcription for audio and video attachments stays as its own service.

Removed:

- The assistant sidebar (web and desktop), the Android assistant modal and the iOS assistant sheet, with selection and slash-menu AI actions (`/ai`, Space to open AI), the AI selection menu and AI smart tags.
- AI provider and model settings, AI prompt templates, and the six MCP tools that managed them (`list_ai_instructions`, `get_ai_instruction`, `create_ai_instruction`, `update_ai_instruction`, `delete_ai_instruction`, `restore_default_ai_instructions`).
- AI generation in the infographic, diagram, table and poster editors.
- Desktop local agents (ACP: Codex, Claude Code, CodeBuddy, WorkBuddy and others), with the bundled ACP SDK and npm.
- The web clipper's AI video summary. Caption capture stays.
- The plugin `ai:generate` permission and `context.ai`, and the API token scope `ai:generate`.
- The AI tables, through migration `0093_drop_ai_writing_assist.sql`.

Kept and moved:

- Speech transcription now has its own server service (`transcription-service.ts`, `transcription-routes.ts`, `transcription-relay.ts`) and shared types (`transcription.ts`). Its tables keep the `ai_transcription_` prefix. Its API paths, relay headers and error codes are unchanged, so installed clients keep working.
- Speech service keys are still decrypted with the original key derivation (`credential-encryption.ts`), so saved keys stay readable.
- The desktop native fetch bridge now accepts only multipart POSTs to `/audio/transcriptions`.
- Plugins transcribe through a new `speech:transcribe` permission and `context.speech`. Manifests that still list `ai:generate` keep loading; the permission grants nothing.

## Compatibility

- Tokens that hold `ai:generate` keep working. Creating a token with it drops it silently; the token settings still show such a token as full access.
- Backups no longer contain AI prompts. An empty `prompts.json` is still written so older versions can restore new backups. AI prompts in older RTNote and EdgeEver backups are ignored on import. `GET /api/v1/backups/data?kind=prompts` returns an empty list for older desktop backups.
- Infographic notes keep the AI conversation turns stored in their content; the editor carries them through unchanged.
- The web app removes data the old assistant left in the browser (unapplied drafts, conversations, generated images, AI preferences).
- Old bookmarks to `/ai-prompts` land on the workspace.
- Older clients that call removed AI endpoints get 404 for those features. Their note editing and sync are unaffected.

## Verification

- `bun run lint`, `bun run typecheck`, `bun run typecheck:mobile` pass. `bun run typecheck:ios-editor` shows only the 10 errors already on `main`.
- New tests: `tests/ai-writing-assist-removal-migration.test.ts` (migration on a populated schema keeps notes, speech settings and backup counters), `apps/api/src/transcription-*.test.mjs`, `apps/api/src/credential-encryption.test.mjs`, `apps/web/src/lib/legacy-ai-cleanup.test.mjs`, `apps/web/src/lib/rich-text-selection.test.mjs`.
- Swift was not compiled (no macOS available). No device testing on Android or iOS.

## Rollback

The migration drops data and cannot be undone by a revert. Restore AI data from a database backup taken before the upgrade. A server rolled back to an earlier version after `0093` has run fails where that version uses the AI tables, including seeding AI prompts for new workspaces; restore the database backup together with the older version.
