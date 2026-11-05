# Rocksoul UI — Stages 0–3 Delivery Notes

## Delivered
- Stage 0: repository audit, brand system, compatibility risks and small task backlog.
- Stage 1: three theme JSON definitions, Industrial new-install default, a runtime skin attribute and targeted skin geometry CSS.
- Stage 2: Rocksoul SVG branding, shared logo components, splash wordmark, web title, PWA name/icon and Electron product display names.
- Stage 3: additive /cockpit route, Home navigation entry points, server/session/draft counters and quick actions.

## Compatibility
- Existing theme choices continue to override the new-install default.
- Electron App IDs remain ai.opencode.desktop variants so existing userData locations are preserved.
- The opencode deep-link scheme remains registered for old links.
- Updater URLs remain unchanged until Rocksoul-owned update hosting, signing and release metadata are ready.
- OpenCode provider identity remains provider-specific and is not replaced with the Rocksoul logo.

## Remaining platform work
Binary ICO/ICNS/Icon Composer assets, Apple touch icons, Windows Store icon sets, Linux metainfo and desktop-entry metadata still require regeneration and platform verification.

## Verification
Source-level review was performed while composing the patch. This environment did not run Bun install, typecheck, app e2e, packaged desktop builds, Lighthouse or visual browser QA. Run the repository check suite and package tests before merge or release.
