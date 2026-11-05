# Rocksoul UI — Repository Audit

**Snapshot:** 2026-11-05 · **Repository:** bjo163/rocksouldx · **Audited branch:** dev

## Executive finding

Rocksoul has a substantial UI foundation. The repository already contains a SolidJS application, Electron desktop shell, shared component package, theme resolution, plugin-rendered panels, session timelines, responsive Home layouts, component stories, browser regression suites and performance benchmarks.

The primary gap is product differentiation, not a missing component library. The checked-in README, app metadata, desktop names, logos and several user-facing surfaces still identify the application as OpenCode. The opportunity is to retain the proven runtime and add a deliberate Rocksoul identity and workflow layer.

## Evidence-based findings

| Area | Evidence | Finding |
|---|---|---|
| Product identity | README.md; packages/app/index.html; packages/app/src/app.tsx; packages/desktop/src/main/constants.ts | User-visible product naming remains OpenCode in key surfaces. |
| Desktop packaging | packages/desktop/electron-builder.config.ts | Product names, artifact naming and Linux package names are OpenCode-specific. |
| Brand assets | packages/ui/src/components/logo.tsx; packages/ui/src/typography/wordmark/wordmark.tsx; packages/app/public/favicon*.svg | Existing logo and wordmark are OpenCode glyphs. |
| Theme engine | packages/ui/src/theme/context.tsx; resolve.ts; v2/resolve.ts | Schema-driven engine supports light/dark variants, palettes and overrides. |
| Built-in themes | packages/ui/src/theme/themes/*.json | Themes are discovered through import.meta.glob; new JSON themes are a low-risk extension point. |
| Appearance settings | packages/app/src/settings/appearance/appearance.tsx | Color scheme, theme, fonts, zoom and reduced-motion controls already exist. |
| Home/workspaces | packages/app/src/home/route.tsx and home/projects/*, home/sessions/* | Existing Home can host a new Cockpit route without being replaced. |
| Session UX | packages/app/src/session/*; packages/session-ui/src/* | Timeline, composer, tool output, review, diff and session panels already exist. |
| Plugin extension | packages/app/src/runtime/plugin/*; packages/gui-plugins/* | Dynamic panels, settings pages, commands and plugin UI are already supported. |
| Desktop safety | packages/desktop/src/main/constants.ts; lifecycle/*; storage/* | App identity participates in user-data path selection. Blind App ID changes can make existing data appear missing. |
| Update channel | packages/desktop/electron-builder.config.ts | Update URLs still target OpenCode infrastructure and must not be redirected casually. |

## Highest-priority gaps

### P0 — Product identity
Replace visible app branding: app title, mark, wordmark, splash, PWA name, desktop display name and README. Preserve provider-specific OpenCode branding where it identifies an actual provider integration.

### P0 — Data and update safety
Do not change Electron App IDs, userData paths, persisted storage keys, updater URLs or the opencode deep-link scheme in a branding-only change. A future migration must explicitly move data, support old links and use a Rocksoul-owned update endpoint.

### P1 — Skin identity
The current theme engine is a strong base. Add named skins with deliberate color direction, surface geometry, density and interaction rules. This delivery adds three selectable palette identities and a skin data attribute/CSS hook; a full theme editor remains separate work.

### P1 — Cockpit
Keep existing Home as the project/session browser. Add Cockpit as another route with metrics derived from actual runtime state. Do not show agent telemetry until the runtime exposes a reliable cross-session source.

### P1 — Visual quality
Extend existing tests with visual cases for skins, light/dark, keyboard focus, contrast, reduced motion, narrow layouts and desktop startup.

## Decisions
1. Keep SolidJS, shared UI, session UI, plugin runtime and Electron.
2. Add Rocksoul Industrial, Punk and Workbench themes using the current JSON schema.
3. Make Industrial the new-install default while preserving saved theme choices.
4. Rebrand application surfaces while preserving provider identities.
5. Keep App IDs, storage keys, updater endpoints and opencode protocol unchanged.
6. Add Cockpit as an additive route and Home navigation entry.
7. Display only server and tab counts already available from the UI runtime.

## Not included
- Regeneration of all ICO, ICNS, Icon Composer and Windows Store binary assets.
- Rocksoul-owned update hosting, signing certificates or auto-update manifests.
- Full rename of internal @opencode/* names, env vars, APIs or provider identifiers.
- Cross-session agent activity API.
- Visual browser QA, Lighthouse, packaged installer QA or repository check execution.
- Full custom theme editor or skin marketplace.

See ROCKSOUL_UI_TODO.md for follow-up tasks.
