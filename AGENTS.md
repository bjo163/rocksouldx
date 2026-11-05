# Repository guidance

- After changing the public Protocol or Server HttpApi, run bun run generate from packages/client. Do not edit generated client files directly.
- Keep runtime dependencies directed from Schema to Core and Protocol, then from Core and Protocol to Server. Client runtime code may depend on Schema and Protocol but never Core or Server; sdk composes Client, Core, and Server.
- This repository does not use Changesets. Do not add .changeset files; follow the existing release workflow instead.
- The default branch is dev. Base branches and worktrees on origin/dev, target PRs at dev, and diff against origin/dev unless told otherwise.

## ROCKSOUL DX product documentation

- The canonical product overview is README.md; the documentation map is docs/README.md.
- ROCKSOUL-specific product direction lives in docs/product. Workflow integration boundaries live in docs/architecture. Executable implementation tasks live in docs/plans.
- Treat feature status in the ROCKSOUL FLOW blueprint and plan as authoritative. A planned or proposed capability must never be described as implemented without source-level evidence and verification.
- Before adding a ROCKSOUL FLOW feature, inspect the current implementation and the listed reuse points. Extend existing OpenCode sessions, tools, plugins, MCP, worktrees, permission boundaries, and UI surfaces when they already satisfy the requirement; do not create duplicate subsystems by default.
- Keep product-specific behavior isolated from upstream-compatible behavior. Preserve upstream license notices, attribution, application identifiers, and release/update semantics unless a separately reviewed change explicitly requires otherwise.
- Keep plans in small, independently verifiable tasks. Do not execute multiple unrelated plan IDs in one implementation pass. Update the plan only with evidence-backed status changes.

## Live TUI Testing

- Run bun run dev:live from a development worktree to test its TUI against the currently elected opencode background server and live sessions.
- Pass a directory after the script when needed, for example bun run dev:live /path/to/project.
- The script discovers the server with opencode service status, injects its private local credential from opencode service get password, and uses the dev TUI storage channel so tabs and other client-local state match the installed client.
- Prefer dev:live over plain bun run dev for this workflow. An implicit managed-service connection may replace the live server when the worktree client version differs; explicit --server warns and continues without replacing it.

## Live Desktop Diagnostics

- When attaching Playwright to a running desktop app, use chromium.connectOverCDP(endpoint, { noDefaults: true }).
- Without noDefaults, Playwright applies light-mode media emulation during attachment. An app following the system theme then flashes light until the connection closes. The option also preserves the existing focus and other media preferences.
- Do not emulate a color scheme or reduced-motion preference on the user's live window unless explicitly requested; use an isolated test context for those scenarios.

## TUI Stories

- When a user asks for a TUI story, add a fixture-driven story under packages/tui/src/feature-plugins/system/storybook and register it in index.tsx.
- Render the real production component rather than a visual copy. Keep submissions and other side effects local to the story so it is safe to explore repeatedly.
- Expose the meaningful state dimensions through story keybindings and list them in StoryFooter; include a reset command when combinations can leave the fixture in a confusing state.
- Run a specific story with OPENCODE_STORY=<story-id> bun run dev:live from the development worktree, and exercise narrow and wide terminal sizes when layout is relevant.

## TUI Theme Tokens

- Choose theme tokens by semantic role, not by their current color. Do not use raw theme.hue values or borrow an unrelated semantic token to achieve a preferred appearance. Do not use text.feedback and background.feedback for anything other than outcome or status feedback. Use formfield states for form-control text, ordinals, and selection markers, and action states for actions.
- If the theme does not expose a token for the required semantic role, extend the theme schema, defaults, resolution, and types with that role before using it in a component. Do not repurpose the nearest-looking existing token.
- When changing the public theme token surface, verify the built-in light and dark defaults and the custom-theme fallback path in addition to the affected TUI component.

## Branch names

Use a short branch name of at most three words, separated by hyphens. Do not use slashes or type prefixes such as feat/ or fix/.

Examples: session-recovery, fix-scroll-state, regenerate-sdk.

## Commits and PR titles

Use conventional commit-style messages and PR titles: type(scope): summary.

Valid types are feat, fix, docs, chore, refactor, and test. Scopes are optional; use the affected package or area when helpful, e.g. core, opencode, tui, app, desktop, sdk, or plugin.

For user-facing feat, fix and perf PRs, add a small looping animated SVG of the change under ### Visual in the PR body (240×72, for example a dock growing out of the composer or spinners turning in step). Draw with currentColor and opacity so it works in light and dark, make the unanimated state a good still, animate with CSS or SMIL only, and keep it under 8 KB with no scripts or external references.

## Style guide

### General principles

- Keep things in one function unless composable or reusable.
- Validate unknown values once at the boundary that owns them. Pass typed values inward instead of repeating defensive checks.
- Do not extract single-use helpers preemptively. Extract only when a helper is reused, names a real concept, or hides a genuinely complex boundary.
- Before adding complexity for a speculative or unlikely edge case, explain the concrete failure mode, likelihood, and complexity cost rather than silently expanding scope.
- Avoid try/catch where possible.
- Avoid the any type.
- Use Bun APIs when possible, such as Bun.file().
- Rely on type inference; add explicit types when needed for exports or clarity.
- Prefer functional array methods over loops when that matches surrounding code.
- In src/config, follow the existing self-export pattern when adding a config module.
- In Effect generators, bind services to named variables before calling methods. Do not use nested service yields.

### Destructuring

Avoid unnecessary destructuring. Use dot notation when it preserves useful context.

### Imports

- Never alias imports unless two imports genuinely collide and no alternative exists.
- Never use star imports.
- Prefer dynamic imports for heavy modules used only in selected code paths.

### Control flow

- Prefer early returns over else branches.
- Prefer const over let.
- Keep helpers close to the code they support.
- Add comments for non-obvious constraints and surprising behavior, not obvious assignments or control flow.

### Schema definitions

Use snake_case for database fields so column names do not need to be redefined as strings.

### Experimental API

- Experimental endpoints live under /api/experimental/<group>/... and use the matching experimental.<group>.<method> SDK identifier.
- New endpoints and new default behaviors start experimental.
- Breaking moves of shipped SDK or plugin APIs keep deprecated aliases until the next minor, following the existing generation workflow.

### Feature flags

- Add a flag and description in packages/schema/src/config/flag.ts for risky new user-visible behavior or behavior that must land over several PRs. Use Flag.enabled("<key>") from @opencode/core/flag. Flags are on in local and dev builds and off in releases unless configured otherwise.
- State the flag in the PR. Remove the flag only when the feature is ready to ship.

### Testing and checks

- Before changing tests, read the matching skill in .opencode/skills: unit-tests, tui-tests, app-e2e-tests, or component-tests.
- Do not run tests from the repository root. Run them from the relevant package directory.
- Run bun run check from the repository root for canonical lint and type-check verification.
- During focused iteration, run bun typecheck from the affected package. CI and package publishing use typecheck:tsc; it is the source of truth when checks disagree.
