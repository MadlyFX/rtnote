# Builds and releases

Every RTNote platform builds on GitHub-hosted runners. Pull requests and pushes
to `main` produce downloadable workflow artifacts; pushing a version tag builds
everything and creates a draft GitHub Release.

| Platform | Workflow | Output | Signing |
| --- | --- | --- | --- |
| Windows x64 | [Desktop build](../.github/workflows/desktop-build.yml) | NSIS installer `.exe` | Unsigned |
| Linux x64 | Desktop build | `.AppImage` | Unsigned |
| macOS arm64 and Intel | Desktop build | `.dmg` | Ad-hoc signed, not notarized |
| Android arm64 | [Android build](../.github/workflows/android-build.yml) | `.apk` (paused, see below) | RTNote release key |
| Chrome / Edge | [Web clipper build](../.github/workflows/extension-build.yml) | `.zip` | Unsigned |
| Firefox | Web clipper build | `.zip` | Unsigned |
| iOS | [iOS build](../.github/workflows/ios-build.yml) | Simulator build and tests only | None |
| Docker | [Docker image](../.github/workflows/docker-image.yml) | `ghcr.io/madlyfx/rtnote` | — |

## Runner costs

On a private repository, GitHub bills macOS minutes at 10 times and Windows
minutes at 2 times the Linux rate. To stay within the free allowance:

- macOS desktop builds run for releases, manual runs, and pull requests with
  the `build-macos` label.
- The iOS build runs only when `apps/ios` changes, or on demand.
- The clipper and Docker builds run only when their source changes.
- The Android build is paused: it runs out of memory on the 7 GB
  private-repository runner, so it is not part of pull requests or releases.
  It can still be started by hand from the Actions tab.

## Installing unsigned builds

- **Windows:** SmartScreen warns about an unknown publisher. Choose
  **More info → Run anyway**.
- **macOS:** the app is not notarized. Open the DMG, drag RTNote to
  Applications, then right-click RTNote and choose **Open**. If macOS still
  refuses, run `xattr -dr com.apple.quarantine /Applications/RTNote.app`.
- **Linux:** make the AppImage executable (`chmod +x`) and run it. Some
  distributions need `libfuse2`.
- **Android:** allow installs from your browser or file manager, then open the
  APK.
- **Chrome / Edge:** unzip the package, open `chrome://extensions`, turn on
  Developer mode and choose **Load unpacked**.
- **Firefox:** open `about:debugging#/runtime/this-firefox` and choose
  **Load Temporary Add-on**. Temporary add-ons are removed when Firefox
  restarts; a permanent install needs Mozilla signing.

## Updates

Desktop builds have automatic updates turned off and bundle no update feed.
**Settings → System information → Download latest** opens the latest GitHub
Release. Android checks GitHub Releases for a newer `rtnote-android-v*.apk`.
Expo over-the-air updates are disabled.

## Android signing key

Release APKs are signed with the RTNote key stored in the repository secrets
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
and `ANDROID_KEY_PASSWORD`. The build refuses any APK whose certificate does
not match the SHA-256 pinned in `scripts/verify-android-apk-signature.mjs`.
Keep an offline backup of the keystore: if it is lost, installed copies can
never be updated.

## Making a release

1. Set the same version in `package.json`, `apps/desktop/package.json` and
   `apps/mobile/app.json` (`expo.version`), and increase
   `expo.android.versionCode`. Merge that to `main`.
2. Tag the merge commit and push the tag:

   ```sh
   git tag v2.23.0
   git push origin v2.23.0
   ```

3. The [Release](../.github/workflows/release.yml) workflow checks the
   versions, builds every platform, publishes the Docker image, and creates a
   draft release with all packages and a combined `SHA256SUMS.txt`.
4. Review the draft on GitHub and publish it.

## Personal branding

Open **Settings → Preferences → Branding**. Set the app name, accent colour,
and either a logo URL or an uploaded PNG, JPEG or WebP (up to 256 KB). Branding
is stored in the current browser or desktop profile only; public share pages,
installers and the installed PWA keep RTNote's own branding. Server-side
branding is planned.
