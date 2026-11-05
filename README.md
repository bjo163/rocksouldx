# ROCKSOUL

**Build with intent. Ship with soul.**

Rocksoul is an independent AI development workspace built on the open-source foundation of OpenCode. It combines project and session workflows with an extensible desktop experience and a distinctive, user-selectable visual system.

> Rocksoul is an independent project and is not affiliated with or endorsed by the OpenCode maintainers.

## Product direction
- Workspace-first: move between projects, sessions and drafts without losing context.
- Agent-aware: make AI work visible while keeping permissions and user control explicit.
- Extensible: use the existing plugin and panel runtime.
- Personal: Industrial, Punk and Workbench skins share the same interaction contracts.
- Desktop-native: preserve a reliable Electron experience across supported platforms.

## Current implementation
- SolidJS application and shared UI packages.
- Electron desktop shell.
- Session timeline, composer, tool output and review surfaces.
- Existing plugin runtime and settings integration.
- Light/dark theme engine with three initial Rocksoul themes.
- Initial Cockpit route for connection and tab overview.

Cockpit metrics reflect server and tab state exposed to the UI. They are not agent telemetry or project Git status.

## UI roadmap
- Audit: docs/rocksoul/ROCKSOUL_UI_AUDIT.md
- Brand system: docs/rocksoul/ROCKSOUL_BRAND_SYSTEM.md
- Stage 0–3 notes: docs/rocksoul/STAGE-0-3-IMPLEMENTATION.md
- Small task backlog: docs/rocksoul/ROCKSOUL_UI_TODO.md

## Development
This repository uses Bun workspaces. Install dependencies with `bun install`.

Useful root scripts:
- `bun run dev:web` — start the web application.
- `bun run dev:desktop` — start the Electron desktop application.
- `bun run check` — repository lint and type-check gate.

Follow AGENTS.md and package-level AGENTS.md files before changing code. Run tests from the affected package, not the repository root.

## Compatibility and release safety
This branding pass intentionally preserves current Electron App IDs, persisted storage keys, the opencode deep-link scheme and upstream updater URLs. Do not distribute a Rocksoul-branded auto-updating build until Rocksoul-owned update hosting, signing and release metadata are configured.

Platform-specific binary icons and installer metadata still require regeneration and verification. See the Stage 0–3 delivery notes and TODO.

## Upstream foundation
Rocksoul retains attribution and license notices from the OpenCode codebase. See LICENSE and the upstream project history for details.
