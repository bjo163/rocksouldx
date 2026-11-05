# Rocksoul UI — Task Backlog (Stages 0–3)

Tasks are small and independently verifiable. Checked items are included in rocksoul-stage3; unchecked items are follow-up work.

## Stage 0 — Audit and product contract
- [x] S0-001 Record the repository baseline and UI packages.
- [x] S0-002 Identify visible OpenCode product branding.
- [x] S0-003 Document theme, Home, session and plugin capabilities.
- [x] S0-004 Document App ID, storage and updater compatibility risks.
- [x] S0-005 Define Rocksoul positioning and visual guardrails.
- [x] S0-006 Separate app branding from actual provider branding.
- [ ] S0-007 Add CI checks for unapproved user-visible OpenCode references.
- [ ] S0-008 Classify remaining strings as provider, compatibility, internal or obsolete.
- [ ] S0-009 Review trademark and distribution wording before public release.

## Stage 1 — Skin and design system
- [x] S1-001 Add Rocksoul Industrial theme JSON.
- [x] S1-002 Add Rocksoul Punk theme JSON.
- [x] S1-003 Add Rocksoul Workbench theme JSON.
- [x] S1-004 Make Industrial the new-install default.
- [x] S1-005 Preserve previously persisted theme selections.
- [x] S1-006 Publish data-rocksoul-skin from the theme runtime.
- [x] S1-007 Add targeted skin geometry tokens for Home and shared cards.
- [ ] S1-008 Add theme preview thumbnails to Appearance settings.
- [ ] S1-009 Add contrast checks for every skin in light and dark mode.
- [ ] S1-010 Add Compact, Comfortable and Spacious density presets.
- [ ] S1-011 Add visual regression cases for all Rocksoul skins.
- [ ] S1-012 Add validated theme import/export.
- [ ] S1-013 Add a skin reset action.
- [ ] S1-014 Audit keyboard focus and reduced motion per skin.

## Stage 2 — Brand and desktop identity
- [x] S2-001 Add Rocksoul mark, wordmark and app SVG assets.
- [x] S2-002 Replace shared UI Mark, Splash and Logo components.
- [x] S2-003 Replace desktop first-launch wordmark treatment.
- [x] S2-004 Update web app title.
- [x] S2-005 Update PWA name and SVG icon reference.
- [x] S2-006 Update desktop display names for dev, beta and production.
- [x] S2-007 Update desktop artifact and Linux package names.
- [x] S2-008 Keep provider-specific OpenCode branding intact.
- [x] S2-009 Preserve Electron App IDs and userData locations.
- [x] S2-010 Preserve opencode deep-link scheme and upstream updater URLs.
- [ ] S2-011 Regenerate Windows ICO, macOS ICNS/Icon Composer and Linux icon sets.
- [ ] S2-012 Regenerate Apple touch and platform PNG assets.
- [ ] S2-013 Update Linux metainfo and desktop-entry display metadata.
- [ ] S2-014 Add data migration plan before any future App ID change.
- [ ] S2-015 Provision Rocksoul-owned update endpoints and signing credentials.
- [ ] S2-016 Test install, upgrade, rollback and old deep links on Windows.
- [ ] S2-017 Test install and upgrade on macOS and Linux.
- [ ] S2-018 Update localized README variants after English source approval.

## Stage 3 — Cockpit and workspace experience
- [x] S3-001 Add /cockpit route.
- [x] S3-002 Add Cockpit to desktop Home utility navigation.
- [x] S3-003 Add Cockpit to compact Home utility navigation.
- [x] S3-004 Display registered server count from live UI state.
- [x] S3-005 Display open session-tab count from live UI state.
- [x] S3-006 Display draft-tab count from live UI state.
- [x] S3-007 Add workspace, new-session and settings quick actions.
- [x] S3-008 Add English source strings for Cockpit.
- [x] S3-009 Clarify that the counts are not agent telemetry.
- [ ] S3-010 Add cross-session agent activity only after a real data source exists.
- [ ] S3-011 Add workspace Git status and dirty-file summaries.
- [ ] S3-012 Add permission/question attention queue from pending request state.
- [ ] S3-013 Add usage summaries only when reliable values are exposed.
- [ ] S3-014 Add workspace activity timeline with ownership/retention rules.
- [ ] S3-015 Add Cockpit layout preference and optional widgets.
- [ ] S3-016 Add component/e2e cases for narrow and wide layouts.

## Release gate
Do not call Stages 0–3 production-complete until binary icon, installer, updater, visual QA and test tasks are resolved. This branch is an implementation pass, not a signed distributable release.
