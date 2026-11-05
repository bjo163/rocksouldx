# ROCKSOUL FLOW — Visual Profile Contract

Status: **CONTRACT v1**
Task: RSF-801
Related: [Data/evidence contracts](ROCKSOUL-FLOW-DATA-CONTRACTS.md) · [Branding contract](../branding/ROCKSOUL-DX.md)

A Visual Profile captures a project's design intent and approved visual references. It is project-scoped and independent of ROCKSOUL DX's own theme. The contract describes design constraints; it does not create a new renderer, image generator, asset store, or screenshot service.

## 1. Ownership and identity

A profile has:
- stable profile ID and schema version;
- existing Project ID/repository identity when associated with a registered checkout;
- human-readable name and intent;
- revision/version and updated timestamp;
- profile state: `draft`, `review`, or `approved`;
- explicit owner/reviewer and provenance.

Changing the profile does not change the global application theme, desktop color mode, or another project's design profile.

Multiple profiles may belong to one Project for distinct products, surfaces, or experiments. Exactly one profile is marked primary only when a user explicitly chooses it.

## 2. Reference asset contract

Every reference entry records:
- stable reference ID;
- source type: `user-upload`, `generated`, `external-url`, or `repository-asset`;
- URI or project-relative path, never a fabricated URL;
- short caption, tags, and screen/state association;
- creator/source and captured/imported time when known;
- usage/rights status: `user-owned`, `permission-confirmed`, `license-recorded`, `unknown`, or `not-authorized`;
- approval state: `candidate`, `approved`, or `rejected`;
- optional content hash and visual metadata.

Rules:
- Uploading, discussing, or using an image in the current task does not authorize durable reference storage.
- Saving, replacing, deleting, or cross-project reuse requires a deliberate user action.
- A generated image is a candidate until reviewed; it is not automatically the target design.
- Unknown usage rights must stay visible. Never infer permission from a public URL.
- No reference entry may contain secrets, private information, or a credential-bearing screenshot.
- Keep the original source/provenance; derivative crops or annotations are separate records.

## 3. Semantic design tokens

Tokens are grouped by meaning rather than hard-coded appearance:

- **Color:** canvas, surface, raised surface, text, muted text, border, accent, focus, positive, warning, danger.
- **Typography:** display, heading, body, label, mono; size/weight/line-height/letter-spacing roles.
- **Spacing and shape:** spacing scale, density, radius, border weight, elevation.
- **Composition:** grid, alignment, whitespace, image/text balance, hierarchy, density, responsive transitions.
- **Components:** named project-specific patterns and state/variant rules.
- **Interaction:** focus, hover, pressed, selected, disabled, loading, error, success, and confirmation.
- **Motion:** duration, easing, sequencing, transition purpose, and reduced-motion fallback.

Tokens are profile values, not runtime CSS variable names by default. A later adapter maps semantic roles to the actual UI framework/theme system after implementation review.

## 4. Composition and visual rules

Each profile may declare:
- signature visual language and anti-patterns;
- page/surface archetypes;
- navigation and information architecture constraints;
- image style, crop, frame, treatment, and usage;
- typography hierarchy and maximum content density;
- responsive layout behavior;
- behavior for empty, loading, error, partial, and populated states.

Rules must be observable and testable where possible. Subjective guidance such as “cinematic” or “premium” must be paired with references or concrete composition criteria before it becomes an automated acceptance condition.

## 5. Accessibility and interaction contract

Every approved profile must specify or inherit:
- minimum contrast targets for text and non-text controls;
- keyboard operation and visible focus behavior;
- semantic labels and accessible names;
- responsive behavior and zoom tolerance;
- motion purpose and reduced-motion alternative;
- non-color status cues;
- touch target and interaction-state behavior where applicable.

A visual match cannot waive accessibility constraints. If a reference conflicts with an accessibility requirement, the unresolved conflict is recorded for human review.

## 6. Screen and state inventory

A profile may map screens to:
- screen ID/name and product area;
- viewport/breakpoint set;
- key UI regions and hierarchy;
- expected interaction states;
- related components/tokens/references;
- linked plan task IDs and acceptance criteria.

This inventory is a design contract, not a duplicated application route registry.

## 7. Visual acceptance evidence

A visual evidence record captures:
- task and profile IDs plus profile revision;
- repository revision and changed screen/state;
- viewport dimensions, device scale, theme/mode, and relevant app settings;
- screenshot/video artifact reference and capture time;
- comparison reference ID;
- automated checks (when meaningful) and human reviewer outcome.

Pixel difference alone does not determine quality. Human review is required for subjective composition and brand criteria. A screenshot from another revision cannot validate the current diff without an explicit comparison decision.

## 8. Example profiles

### ROCKSOUL DX — Industrial manga developer workbench

- Intent: an expressive, anti-slop engineering workbench with industrial manga/underground dev-zine identity.
- Surface: dense technical work areas balanced by deliberate editorial moments.
- Typography: expressive display voice; high-legibility interface/body; monospace technical details.
- Color semantics: warm paper/ink foundations with restrained signal accents; status must remain readable without color alone.
- Motion: purposeful transitions; reduced-motion mode preserves hierarchy and feedback.
- Anti-patterns: generic SaaS card dashboards, decorative noise behind code, face-dependent brand art, inaccessible neon text.

This example references the product's branding contract; it does not define other projects' theme.

### Example external project — Quiet financial ledger

- Intent: restrained, trust-oriented financial operations interface.
- Surface: calm, low-density layouts with strong numerical alignment and highly visible totals.
- Typography: neutral sans-serif hierarchy and tabular numerals; avoid display typography inside dense financial data.
- Color semantics: low-chroma surfaces with distinct semantic states, redundant labels, and clear negative/positive sign conventions.
- Motion: near-static; transitions only for focus, navigation, and material state changes.
- Anti-patterns: manga halftones, distressed textures, playful comic lettering, ambiguous status color, and hidden totals.

The contrast demonstrates that Visual DNA is project-specific; neither example becomes a global default.

## 9. Approval and versioning

- Profiles begin in `draft`.
- An authorized reviewer promotes them to `review` and then `approved`.
- Every edit creates a new profile revision and preserves the prior revision/review evidence.
- Cross-project copying creates a new profile/reference association and requires its own usage-right and approval review.
- Deleting a reference updates the profile history with a tombstone; it does not silently remove evidence from an already completed task.
- The active UI theme and the Visual Profile remain separate concerns.

## 10. Non-goals

This contract does not:
- implement image generation or image editing;
- store reference images without user authorization;
- replace the existing UI theme registry;
- automatically restyle a project;
- infer brand identity from a single screenshot;
- replace screenshot capture, browser, or visual test tooling;
- make subjective design acceptance fully automatic.
