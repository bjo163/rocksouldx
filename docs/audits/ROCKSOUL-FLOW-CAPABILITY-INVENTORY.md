# ROCKSOUL FLOW — Capability Inventory

Status: **SOURCE-AUDITED**
Audit date: 2026-11-05
Audited branch: `feature/rocksoul-dx-branding-20261105`
Audited revision: `526280d65cc7ed2917b2d48484068f42619d984f`
Scope: current repository source, workspace manifests, app routing, persistence, extension surfaces, tests, and documented FLOW requirements.

> This is a revision-bound inventory. It describes what was present at the audited commit, not what may be added by later commits. A path reference is evidence that the source was inspected; it is not a claim that every behavior has passed a runtime test in this session.

## 1. Audit method

- Read root `AGENTS.md`, the canonical README, ROCKSOUL FLOW vision, feature blueprint, architecture document, and implementation plan.
- Inspected the recursive Git tree at the audited revision: 10,621 entries; GitHub returned `truncated: false`.
- Inspected root, Core, and App package manifests and the root check/test scripts.
- Opened the source modules listed in the evidence map below, plus the related Server and Protocol handlers and the app route/plugin surfaces.
- Looked for an existing FLOW package, global FLOW route, project-plan parser, requirement-to-code audit engine, execution packet compiler, task/run coordinator, evidence gate, learning review flow, visual-profile registry, and repository relationship graph.
- Kept source evidence separate from product intentions and from behavior that still requires local execution tests.

## 2. Repository and runtime baseline

| Area | Observed implementation | Ownership / implication |
| --- | --- | --- |
| Language and package manager | TypeScript workspace; Bun pinned to 1.4.4 in root `package.json`. | Preserve upstream conventions. Do not migrate the inherited codebase to a different runtime or framework as part of FLOW. |
| Core execution | Agent, model/provider, session, prompt, tool, permission, plugin, and MCP systems already exist. | FLOW must orchestrate through these systems rather than implement another agent runtime. |
| Persistence | Core database service and Drizzle schema/migrations exist. Project and worktree state already have durable records. | New durable FLOW data needs an explicit ownership decision; do not add tables just because a feature needs a screen. |
| Client/server contract | Protocol groups define endpoints; Server handlers implement them; the generated Client SDK follows the documented generation workflow. | New HTTP endpoints require Protocol + Server changes and generated Client artifacts via `bun run generate` in `packages/client`. |
| App navigation | Current app routes include Home, Settings, session, new-session, and a dev/beta-only components lab. | No dedicated global ROCKSOUL FLOW workspace route existed at the audited revision. Do not mistake a session panel for an app-wide workspace. |
| Desktop | Desktop is a shell over the shared App interface and server sidecar. | Keep one application shell. Do not fork a second desktop runtime for FLOW. |

## 3. Capability evidence inventory

### 3.1 Agent, session, and provider runtime

**Classification:** inherited foundation — reuse.

Evidence:
- `packages/core/src/plugin/plan.ts` — built-in Plan agent, prompt reminders, and permission policy.
- `packages/server/src/handlers/session.ts` — session create/list/export and related lifecycle endpoints.
- Root `AGENTS.md` — dependency direction and Protocol/Server/Client generation constraints.
- `packages/core/package.json` — Core already depends on Effect, provider SDKs, MCP clients, and existing OpenCode packages.

Findings:
- The existing runtime owns model execution, permissions, tool invocation, and session history.
- Task Deck must store references to sessions and runs; it must not copy messages, implement model dispatch, or replace subagent execution.
- A workflow task must not inherit more permissions than the existing session/agent permission model grants.

### 3.2 Existing Plan agent

**Classification:** inherited foundation — reuse for exploration; do not treat as project plan management.

Evidence:
- `packages/core/src/plugin/plan.ts`
- `packages/core/test/plugin/plan.test.ts`

Observed boundary:
- Plan mode is a read-only agent.
- Writes are restricted to the global `.opencode/plan` directory.
- Its instructions explicitly prohibit editing other files and prohibit implementation while Plan mode is active.

Gap:
- No repository-level Markdown plan parser, validator, dependency graph, or task-state workflow was found in the inspected source.
- Plan Forge is therefore additive only if it manages portable project plans outside this Plan agent's ownership.

### 3.3 Session TODO

**Classification:** inherited foundation — reuse as transient execution context.

Evidence:
- `packages/core/src/tool/plugin/todo.ts`
- `packages/app/src/session/composer/todos.ts`
- `packages/app/src/session/composer/todo-pill.tsx`

Observed boundary:
- `todowrite` accepts a session-scoped array of content/status items.
- Its statuses are `pending`, `in_progress`, `completed`, and `cancelled`.
- The tool returns the updated list as tool output/metadata; it is not a durable project-level plan repository.

Gap:
- It does not own task IDs, milestones, cross-session dependencies, acceptance criteria, revision identity, or evidence history.
- Do not turn TODO into a second project backlog or silently sync every session TODO to a repository plan.

### 3.4 Project identity and local workspace

**Classification:** inherited foundation — extend only for explicit cross-repository relationships.

Evidence:
- `packages/core/src/project.ts`
- `packages/core/src/project/schema.ts`
- `packages/core/src/project/sql.ts`
- `packages/server/src/handlers/project.ts`

Observed boundary:
- Project resolves and persists project identity, canonical working directory, VCS metadata, name, icon, commands, activity, and archive state.
- It already models multiple local projects and directories.

Gap:
- The inspected project model does not represent a declared cross-repository dependency graph or a multi-repository coordinated plan.
- Workspace Orbit should extend the existing Project concept and add explicit edges; it should not create a competing list of local project roots.

### 3.5 Git, filesystem, and repository discovery primitives

**Classification:** inherited foundation — reuse.

Evidence:
- `packages/core/src/git.ts`
- `packages/core/src/filesystem.ts`
- `packages/core/src/filesystem/search.ts`
- `packages/core/src/ripgrep.ts`
- `packages/core/src/tool/plugin/glob.ts`
- `packages/core/src/tool/plugin/grep.ts`
- `packages/core/src/tool/read-filesystem.ts`
- `packages/core/src/file-access.ts`

Observed boundary:
- Existing services cover Git repository discovery, branch/head/history/status/diff and worktree-aware operations.
- Existing filesystem and search tools provide permission-aware file access and content discovery.

Gap:
- No dedicated revision-bound FLOW snapshot that composes manifests, package boundaries, documentation hierarchy, module relationships, ignore policy, and scan warnings was found.
- Repo Radar should compose these primitives and retain path/revision evidence. It should not introduce a second Git or filesystem layer.

### 3.6 Worktree lifecycle

**Classification:** inherited foundation — reuse; FLOW adds task association and coordination only.

Evidence:
- `packages/core/src/worktree.ts`
- `packages/core/src/worktree/sql.ts`
- `packages/server/src/handlers/worktree.ts`
- `packages/protocol/src/groups/worktree.ts`

Observed boundary:
- Core already lists, creates, removes, and refreshes worktrees, persists project/directory/strategy ownership, and uses strategy implementations.
- Protocol and Server expose list/create/remove/refresh operations.
- Remove and force-required behavior are real lifecycle concerns, not presentation-only actions.

Gap:
- The inspected Worktree service does not know a ROCKSOUL task ID, agent role, execution attempt, or task-specific cleanup review.
- Task Deck must call the existing service and add explicit mapping/coordination. It must not create an alternative worktree manager or auto-remove a user's worktree.

### 3.7 Plugin and GUI extension surfaces

**Classification:** inherited foundation — reuse after matching the surface to the feature.

Evidence:
- `packages/app/src/runtime/plugin/extension-plugins.tsx`
- `packages/app/src/runtime/plugin/host.tsx`
- `packages/app/src/runtime/plugin/render.tsx`
- `packages/app/src/runtime/plugin/panels.tsx`
- `packages/app/src/runtime/plugin/settings-pages.ts`
- `packages/plugin/src/gui/index.ts`
- `packages/app/src/shell/routes/routes.tsx`

Findings:
- GUI plugins can contribute supported UI surfaces, themes, slots, links, and session panels.
- The current router owns app-wide navigation. Existing session panels are tied to the session view and are not a substitute for an app-wide project workflow route.
- Use an existing extension point when its lifecycle and scope match. A new global route must follow the current router/shell conventions and be reviewed separately.

### 3.8 Terminal and verification

**Classification:** inherited foundation — reuse execution; build a missing evidence model.

Evidence:
- Root `package.json` scripts: `lint`, `typecheck`, `check`.
- `packages/core/package.json` and `packages/app/package.json` define package-specific tests and typechecks.
- Root `test` intentionally exits with an error; Core/App tests are run from their package scripts.

Findings:
- Existing terminal/process and package tooling can execute project checks.
- A command existing in a manifest does not mean it has been run for a given task.
- Proof Gate must record real exit status, command, revision, timestamp, bounded output reference, and skipped/not-run reason. It must not mark a task verified from narrative alone.

### 3.9 Visual/theme and image capabilities

**Classification:** inherited foundation plus ROCKSOUL identity — reuse.

Evidence:
- `packages/ui/src/theme/context.tsx`
- `packages/ui/src/theme/themes/rocksoul.json`
- `packages/core/src/tool/plugin/image-generate.ts`
- `packages/app/src/runtime/plugin/render.tsx`

Findings:
- The theme system and image-generation capability already exist.
- ROCKSOUL's own desktop theme is present in the branding changes.
- Visual DNA Lab needs project-scoped references, contracts, provenance, and visual acceptance evidence; it should not add another image-generation runtime or assume every repository uses the ROCKSOUL theme.

### 3.10 Dedicated FLOW implementation

**Classification:** ROCKSOUL-specific — not present at the audited revision.

The recursive tree and targeted source inspection did not show a dedicated FLOW package, global FLOW route, repository-snapshot store, requirement/capability audit engine, Markdown project-plan parser, execution-packet compiler, task-to-run coordinator, durable evidence gate, reviewable learning pipeline, project visual-profile registry, or cross-repository edge model.

This absence is the reason to add a workflow/evidence layer. It is not permission to clone any of the inherited capabilities listed above.

## 4. Test and validation entry points

| Area | Existing entry point |
| --- | --- |
| Core unit/integration tests | `packages/core/package.json` → `bun run test` |
| Core typecheck | `packages/core/package.json` → `bun run typecheck` |
| App unit/browser tests | `packages/app/package.json` → `bun run test` |
| App typecheck | `packages/app/package.json` → `bun run typecheck` |
| Workspace lint + typecheck | root `package.json` → `bun run check` |
| Generated Client API | `bun run generate` from `packages/client` after Protocol/Server API changes |

Important repository rule: do not run the root `bun run test`; it is an intentional guard. Run a package-specific test command or the focused test file from the relevant package.

No local Bun test, typecheck, app build, or desktop packaging command was executed as part of this GitHub-source audit. Those remain CI/local verification gates.

## 5. Gap register

| ID | Missing FLOW capability | Existing foundation to compose | First bounded work |
| --- | --- | --- | --- |
| GAP-01 | Revision-bound repository inventory | Project, Git, filesystem/search, manifests | Define scan root, ignore rules, revision and incomplete-scan states. |
| GAP-02 | Requirement-to-source overlap audit | Repo Radar inventory, file search, code navigation | Define requirement units, classifications, confidence, evidence, and reviewer state. |
| GAP-03 | Portable project plan parser/validator | Markdown source files; existing Plan agent is not the owner | Specify task syntax and validate IDs, dependencies, statuses, and cycles. |
| GAP-04 | Deterministic one-task execution packet | Plan task, docs, session/agent runtime | Compile only approved task context and explicit boundaries. |
| GAP-05 | Task-to-session/run association | Session APIs, agent runtime, Worktree service | Store references and attempt lifecycle without duplicating message history. |
| GAP-06 | Evidence-backed verification state | Terminal/process, Git diff, package scripts | Define immutable check evidence and Proof Gate transitions. |
| GAP-07 | Reviewable project learning | Session history, file search, repository docs | Propose provenance-bearing edits; require approval before writes. |
| GAP-08 | Project-specific visual contract | Theme system, image generation, GUI contributions | Define project-scoped profiles and traceable screenshot/reference evidence. |
| GAP-09 | Explicit multi-repository relationships | Project service, Git identity | Add declared graph edges and per-repository revision/permission boundaries. |

## 6. Architectural conclusions

1. **Compose, do not clone.** The inherited runtime, Plan mode, session TODO, Git, filesystem/search, worktrees, plugins/MCP, terminal, themes, and image generation remain the owners of their current responsibilities.
2. **Keep Markdown as project intent.** A project plan is versioned repository content. Session TODO remains ephemeral execution context. Any UI/index is a projection, not a competing source of truth.
3. **Use the existing Core package for the first pure domain slice.** A deterministic plan parser/validator can live under `packages/core/src/flow` with package-local tests. It needs no HTTP endpoint, new package, database table, or UI route.
4. **Delay persistence and API design.** Add no schema migration, new Server/Protocol API, generated SDK change, or global route until the relevant task proves the gap and specifies the lifecycle.
5. **One mutable checkout, one writer.** Parallel agents need isolated worktrees before concurrent writes. Documentation-only work can run concurrently only when each agent owns separate files.
6. **Proof is external to the assistant's claim.** A task remains `implemented` until required checks and evidence support `verified`.

## 7. Open decisions

- Which project-local directory/name should be canonical for FLOW plans when a repository already contains a `.plan` or other planning convention?
- Should repository snapshots be recomputed on demand first, or cached after measurable latency is established?
- Which existing GUI extension surface can host a project-wide workspace without creating a second shell?
- What minimum run metadata belongs in existing database tables versus a repository artifact?
- How should cross-repository trust and credentials be scoped when local checkouts share a remote?

These questions are intentionally not guessed in the inventory. They are decision gates for the tasks that touch those boundaries.
