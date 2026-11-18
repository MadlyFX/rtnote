# AGENTS.md

Rules for AI agents and contributors working on RTNote.

## Project context

- Start with `README.md` for the stack and layout.
- RTNote is an independent project derived from EdgeEver. It does not sync with upstream. Bring upstream fixes over deliberately, never by merging upstream wholesale.
- Android lives in `apps/mobile` (Expo / React Native). iOS lives in `apps/ios` (native SwiftUI with a bundled TipTap editor built from `apps/ios/EditorSource`).
- English is the source language for code, comments, UI strings, logs, docs and commit messages. Other languages are translations in `packages/shared/src/i18n/`; English (`en-US`) is the reference catalog.

## Identifiers that must not be renamed

Some identifiers still say `edgeever`. Leave these alone unless a migration plan covers them:

- Stored content formats: TipTap node and mark names (for example `edgeeverImageGallery`), Markdown markers (for example `<!-- edgeever-poster-v1:`, `edgeever-table`), backup format ids and file extensions. Renaming them breaks existing notes and EdgeEver imports.
- Protocol names shared by clients and server, such as `X-EdgeEver-*` headers and `EDGE_EVER_*` environment variables.
- Code package names (`@edgeever/*`), CSS classes and storage keys. They are internal; rename them only as a dedicated, complete change.

User-visible text always says RTNote.

## Assess risk before changing

- Fix problems in product code so every user gets the fix, not in one machine's local state.
- Before implementing, state the value, scope, worst case, rollback and what remains unverified. Decline or offer a lower-risk alternative for low-value changes that disturb mature paths.
- Treat installers, auto-update, data storage, authentication and migrations as high risk. Verify the real old-version-to-new-version path, not only the new version.
- Never claim a change "does not affect existing users" or "does not affect updates" without the matching platform and cross-version verification.

## Data and runtime

- **Migrations**: add a new, higher-numbered SQL file in `migrations/` for any schema or seed change. Never edit a migration that has run.
- **Cross-runtime**: Cloudflare and Docker share one business codebase. Keep business logic out of runtime entry points and infrastructure adapters.
- **Read budget**: backups, pagination, sync and polling must account for cumulative reads. Never rescan or recount the full table per page or per poll. Verify read growth with representative local data and add regression tests.
- **Rich text is the source of truth**: note content lives in `content_json`. `content_markdown` is derived for export, sharing and MCP. New formatting must not depend on Markdown round-trips.

## UI

- The product must always feel reliable, predictable and certain.
- Reuse maintained open-source components; prefer `shadcn/ui`. Wrap complex or repeated UI in its own component.
- Never use the native HTML `title` attribute for hover or focus hints. Use the shadcn/ui Tooltip, and make sure it also shows on keyboard focus.

## Verification

- Run `bun run lint`, `bun run typecheck`, `bun run typecheck:mobile` and `bun run build:web` before proposing a change, plus the tests that cover it. CI runs the full non-E2E suite with `bun run test` on Ubuntu.
- The test suite targets Linux and macOS. Many tests fail on Windows for platform reasons; use CI as the reference result.
- Test Android features on a real device over USB where possible. Say clearly when only an emulator or no device was used.

## GitHub Actions and releases

- People fork RTNote to deploy it on Cloudflare. Jobs that need secrets, publish releases or spend paid runners must be gated with `github.repository == 'MadlyFX/rtnote'`.
- Build on standard GitHub-hosted runners. Do not depend on self-hosted runners.
- Never let a client fetch updates or over-the-air code from EdgeEver's release channels or Expo project.
- macOS runners cost 10x minutes on a private repository. Keep macOS and iOS jobs behind releases, manual runs, labels or narrow path filters.
- Releases follow [docs/builds.md](docs/builds.md): versions in `package.json`, `apps/desktop/package.json` and `apps/mobile/app.json` must match the `vX.Y.Z` tag. The Release workflow creates a draft; a person publishes it.
- The Android release key lives in repository secrets. Never replace it: installed apps can only update from builds signed with the same key.

## Brand

- Build-time identity (installer and home-screen name, icon sources, tile colour `#F26B1D`) lives in `brand.config.json`. Logo sources: `assets/brand/rtnote-icon.svg` (tile) and `assets/brand/rtnote-mark.svg` (monochrome glyph, `#24160A`; note `#FFC629`).
- After changing the config or the logo, run `bun run prepare:brand` to update the platform files and regenerate every platform's icons.
- In-app and shared-page branding is server data, not code: see [docs/branding.md](docs/branding.md). Never hardcode "RTNote" in server-rendered public HTML; use the resolved branding.
