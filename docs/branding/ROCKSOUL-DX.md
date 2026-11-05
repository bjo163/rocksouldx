# ROCKSOUL DX — Brand & Desktop UI Contract

## Product identity

ROCKSOUL DX is an independent desktop identity for this open-source AI coding-agent workspace. The underlying agent, session, project, provider, terminal, file-review, and update capabilities remain those of the codebase; this rebrand changes presentation, not product semantics.

The project is based on OpenCode. Preserve upstream license notices and attribution, and do not imply that ROCKSOUL DX is an official OpenCode product or that the OpenCode maintainers endorse this fork.

## Creative direction

**Industrial Manga / Underground Dev-Zine.** The interface should feel like a high-end creative engineering tool assembled from a screen-printed gig poster, a manga production desk, and a precise developer cockpit.

The personality is loud at the edges and calm where work happens:
- Poster-scale wordmark, compact serial details, hard geometry, asymmetric accents, and restrained print texture.
- Charcoal ink and warm paper as the two foundations; signal orange is the primary action color; acid lime is a rare status accent.
- Mono typography is used for metadata, labels, paths, branch/status details, and technical annotations. Body copy stays highly readable.
- Small halftone / hatch motifs belong on framing surfaces, never behind code or conversation text.
- Selected project/session states use a clean orange edge marker instead of excessive glow or gradients.

## Palette

| Role | Light | Dark |
| --- | --- | --- |
| Ink / deep surface | `#EEE8DD` | `#171512` |
| Text | `#241F19` | `#F3EADA` |
| Signal orange | `#D94C21` | `#F15A24` |
| Acid lime | `#788D39` | `#C4DE65` |
| Muted green | `#5C736B` | `#94A99D` |
| Warning | `#BC7927` | `#E8B14C` |

## Desktop composition

1. **Navigation masthead** — ROCKSOUL DX monogram and compact agent-workbench descriptor above project navigation.
2. **Project rail** — existing project/server hierarchy and session selection remain intact. The active project receives a narrow signal-orange marker.
3. **Agent workspace** — conversation timeline remains the primary work surface. Keep messages, code blocks, diffs, and tool results calm and readable.
4. **Review/context panels** — retain existing resize, tab, and review behavior. Use thin warm borders and darker/lighter layered surfaces to distinguish context.
5. **Composer** — preserve the existing prompt, model, attachment, and submit behavior. Accent color identifies the primary action.
6. **Status and chrome** — use technical mono labels and restrained hatch details in the frame, titlebar, and compact metadata only.

## Theme behavior

- Theme id: `rocksoul`.
- New desktop profiles use ROCKSOUL DX as their default theme.
- A profile still using the stock `oc-2` default is migrated to ROCKSOUL DX on desktop startup.
- Other explicitly selected themes remain respected and can still be changed in Settings.
- Brand-specific CSS is scoped to `:root[data-theme="rocksoul"]`; alternate themes do not inherit the ROCKSOUL visual layer.
- The web/console defaults are not changed by the desktop-only default-theme setting.

## Guardrails

- Do not change agent orchestration, prompts, providers, project storage, session persistence, terminal behavior, permissions, update channels, or application identifiers as part of visual branding.
- Do not use texture, decoration, or typography that reduces code, diff, or conversation legibility.
- Do not replace functional navigation with poster art or static mock controls.
- Respect reduced-motion preferences.
