# ROCKSOUL — Brand & UI System

**Version:** 0.1 · **Status:** Initial implementation baseline

## Positioning
Rocksoul is an AI development workspace for people who want focused control over projects, sessions and automation. It should feel like a capable engineering workbench with personality—not a generic chatbot, an imitation IDE or a noisy science-fiction dashboard.

**Working line:** Build with intent. Ship with soul.

## Brand personality
- Grounded: clear hierarchy, visible state and dependable interaction.
- Expressive: bold contrast and distinctive details, used with restraint.
- Technical: precise typography, compact information and readable code.
- Human: welcoming onboarding, plain language and forgiving recovery.
- Modular: multiple visual skins share the same interaction and accessibility contracts.

## Visual direction
Primary identity is **Industrial**: graphite, warm stone, copper/orange, hard edges and compact surfaces.

Alternative identities:
- **Punk:** near-black surfaces, acid-lime primary, violet secondary and sharp geometry.
- **Workbench:** slate/blue neutrals, restrained accent, comfortable spacing and a calm professional tone.

Grunge is a finishing layer, not a readability tax. Use texture and rough dividers only where they do not reduce legibility or conceal state.

Avoid decorative HUD text competing with actual work, neon on every element, excessive glow/blur, color-only statuses and motion that delays task completion.

## Typography
Use the existing configured shared font roles: UI sans, code mono and terminal. The Rocksoul wordmark may use a heavy uppercase treatment; product UI must continue to respect user font settings.

## Geometry and density
Initial skin hooks: Industrial uses tight panel geometry; Punk uses near-square corners and stronger outlines; Workbench uses softer card geometry. Density presets planned: Compact, Comfortable and Spacious. Do not globally override every component; extend semantic tokens and targeted surfaces only after visual review.

## Motion and sound
Respect reduced motion, keep transitions short and non-blocking, and make sound opt-in. Audio is never required to understand an event.

## Logo system
Required assets: standalone mark, wordmark, horizontal lockup, high-contrast app icon, light/dark variants, installer/Dock/taskbar/tray/favicon/PWA/social assets. Provider logos remain provider-specific; the OpenCode provider icon is not the Rocksoul application logo.

## Accessibility contract
Preserve contrast in light/dark variants, visible focus, keyboard navigation, reduced-motion behavior and usable zoom/narrow layouts. Status must not rely on color alone.

## Compatibility rule
Brand changes must not silently change data location or update behavior. Preserve existing Electron App IDs, storage keys, deep-link scheme and updater URLs until a tested migration and Rocksoul-owned distribution endpoint exist.
