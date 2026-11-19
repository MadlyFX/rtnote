# Branding

RTNote has two kinds of branding.

- **Server branding** is set in Settings and changes without a rebuild. It covers the name, logo, browser icon, colours, shared-page fonts and footer, everywhere: the app on every device, print and PDF, shared notes, notebook sites, public forms and the web app manifest.
- **Build-time identity** is baked into installers and app stores: the installer and home-screen name, and the app icon. It comes from `brand.config.json`.

## Server branding

Branding is stored in levels. A page combines the levels that apply to it, field by field, later levels winning:

| Level | Who sets it | Where it applies |
| --- | --- | --- |
| Instance default | The instance owner (Settings › Branding › Instance default) | Sign-in page, the installable web app, and workspaces without their own branding |
| Workspace | The workspace owner (Settings › Branding) | The app on every device, print and PDF, and the workspace's shared notes |
| Notebook site | The notebook owner (the notebook's site settings) | That notebook's published site, and shared notes that choose it |
| Single shared note | The note owner (share dialog) | Uses the workspace branding or a chosen notebook's. "Show RTNote branding" off hides branding on that page entirely |

A level stores only what it overrides. Choosing a colour preset on a level starts that level's colour scheme over, so a notebook preset is not mixed with colours the workspace customised.

What can be customised:

- Name, logo, a separate dark-mode logo and a browser icon. The dark logo and icon fall back to the logo.
- A full light and dark colour scheme: background, surface, sidebar, text, borders and accent. Start from a preset and adjust any colour.
- Heading and body fonts for shared pages. These are system font stacks, so public pages never load fonts from a CDN.
- Footer text and up to six links on shared notes and notebook sites.

### How it is stored and served

- `branding_profiles` (migration `0094_branding.sql`) holds one row per level: `instance`, `workspace:<id>` or `notebook:<id>`. Deleting a workspace or notebook deletes its row.
- Logos are uploaded attachments in `branding_assets`, stored under `workspaces/<id>/branding/` or `instance/branding/`. They are served without authentication at `/api/public/branding/assets/<id>` because they appear on sign-in and public pages. Ids are random and files never change, so they cache forever. Uploads are checked by content (PNG, JPEG, WebP, SVG or ICO, up to 1 MB). SVGs are served with a sandboxing Content-Security-Policy. Uploads that no level references are deleted a day later.
- `memo_shares.branding_notebook_id` records which notebook's branding a shared note uses.
- The server renders branding into the first response of shared notes, notebook sites and public forms (title, favicon, theme colour, a colour stylesheet and the branding JSON the page reads before it renders), and into `/manifest.webmanifest`. On Cloudflare these paths run the worker first (`wrangler.toml`).
- Clients read `GET /api/public/branding` before sign-in and `GET /api/v1/branding` afterwards. The web app, desktop app, Android and iOS cache the last branding so it shows at start-up and offline.

Branding saved in a browser before this existed (`rtnote.branding` in local storage) is imported into the workspace the first time its owner opens the app, if the workspace has no branding yet. Logos that were external URLs are not imported.

### Colour tokens

`brandingStylesheet()` in `packages/shared/src/branding.ts` turns a scheme into CSS custom properties for `:root` and `:root.dark`. Only tokens that differ from the stock stylesheet are emitted, so default branding changes nothing. The accent drives `--brand-green*` and the whole `--brand-green-{50…950}-rgb` scale behind the `emerald-*` utilities; background, surface, sidebar, text and border drive the `--workspace-*` surfaces and the shadcn tokens (`--background`, `--card`, `--foreground`, `--border` and so on).

## Build-time identity

Edit `brand.config.json`, then run:

```bash
bun run prepare:brand
```

This writes the name and tile colour into the Android and iOS project files and regenerates every platform's icons from the configured SVGs. The web build reads the file directly for the manifest and page title. `bun run check:brand` reports files that have drifted from the config.

App ids, bundle ids, URL schemes and the desktop product name are deliberately not driven by the config: changing them breaks updates and makes a new install sit beside the old one.
