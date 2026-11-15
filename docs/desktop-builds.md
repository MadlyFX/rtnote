# Desktop builds

Open **Actions → Windows build → Run workflow** in `MadlyFX/rtnote` and select
the branch to build. Pull requests from branches in this repository and pushes
to `main` also build automatically.

When the run succeeds, download the `rtnote-windows-x64-*` artifact. Extract it
and run the Windows x64 `.exe` installer. `BUILD.txt` records the source commit
and `SHA256SUMS.txt` records the installer digest. Artifacts are kept for 30
days. These builds are unsigned, so Windows SmartScreen may warn on first run.

macOS and Linux builds are being added as part of Phase 1 of the RTNote plan.

## Updates

Current builds use `apps/desktop/electron-builder.fork.yml`, which bundles no
update feed and disables the automatic updater. **Settings → System
information → Download latest** opens the build workflow; download and install
a newer artifact to upgrade. Keep a backup before replacing an installed app.

## Personal branding

Open **Settings → Preferences → Branding**. Set the app name, accent colour,
and either a logo URL or an uploaded PNG, JPEG or WebP (up to 256 KB). Preview
the result, then save. **Reset branding** restores the defaults.

Branding is stored in the current browser or desktop profile on this device;
other tabs and note windows update immediately. It changes the workspace,
sign-in screen, browser title and favicon, and note window and print titles.
Public share pages, the installer and the installed PWA keep RTNote's own
branding. Clearing browser data also clears these preferences. Server-side
branding that follows you across devices is planned.
