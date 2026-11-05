# ROCKSOUL FLOW — Architecture and Integration Boundaries

Status: **Proposed architecture.** This document is a decision framework for implementation, not authorization to add packages or change core APIs without repository discovery.

## 1. Architectural approach

Implement ROCKSOUL FLOW as a workflow and evidence layer around the existing OpenCode-based runtime.

The first principle is **compose, do not clone**. Keep model/provider execution, sessions, agent definitions, permissions, tools, plugins, MCP, Git worktrees, terminal, and code review in their existing ownership domains. Add only the missing product concepts: repository snapshots, capability audits, versioned plans, execution packets, task-to-run coordination, proof records, reviewed learnings, visual profiles, and repository relationships.

Do not choose a new storage system, service boundary, or package layout until the relevant source paths, lifecycle, persistence model, and tests have been inspected.

## 2. Existing capability reuse map

The following repository paths were inspected during the initial documentation audit. They are starting points for implementation discovery, not an exhaustive dependency map.

| Requirement | Existing foundation | ROCKSOUL FLOW responsibility |
| --- | --- | --- |
| Planning agent | packages/core/src/plugin/plan.ts | Keep agent mode semantics; add project plan authoring separately. |
| Session TODO state | packages/core/src/tool/plugin/todo.ts; packages/app/src/session/composer/todos.ts | Do not treat session TODOs as durable project plans. Link a task to a session only when needed. |
| Worktree lifecycle | packages/core/src/worktree.ts; packages/server/src/handlers/worktree.ts | Reuse worktree creation/list/removal and add safe task ownership metadata only if a real gap remains. |
| Agent sessions | packages/core and packages/server session modules; packages/client SDK | Dispatch tasks through existing session/runtime APIs. |
| Plugin extension | packages/core plugin system; packages/plugin | Prefer extension points for workflow integrations that do not require a new core primitive. |
| MCP | packages/client and packages/core MCP modules | Reuse connected tools and servers; do not create an MCP replacement. |
| File access and search | packages/core filesystem/search and file tools | Reuse permission-aware file access and code search for repo intelligence. |
| Git integration | packages/core/src/git.ts and worktree git strategy | Reuse Git status/diff/branch/worktree primitives. |
| Image generation | packages/core/src/tool/plugin/image-generate.ts and packages/ai image providers | Reuse the existing image capability; Visual DNA Lab should not add another image runtime. |
| Desktop product surface | packages/desktop and packages/app | Add workflow views to the existing application architecture after inspecting route, shell, and plugin extension contracts. |
| Persistent project data | existing Core database and project/config patterns | Evaluate whether Markdown files, a derived index, or existing database tables are appropriate per entity. |

## 3. Responsibility boundaries

### Existing agent runtime

Owns model resolution, provider credentials, prompt execution, tool invocation, agent permissions, session history, and subagent runtime. ROCKSOUL FLOW should request work from it through supported APIs and retain links to the originating session.

### Repository intelligence

Owns scans, indexes, evidence references, and derived repository summaries. It must never treat generated summaries as stronger than current source. Snapshot data is tied to a Git revision and has an explicit freshness state.

### Plan management

Owns versioned project plans and task structure. Markdown is the initial canonical format because it is diffable, editable outside the app, and usable by local coding agents. A parsed index may accelerate the UI but is disposable and rebuildable.

### Execution coordination

Owns task-to-session mapping, dependency readiness, dispatch state, worktree association, concurrency decisions, cancellation, and retry metadata. It does not own the underlying agent execution loop.

### Verification

Owns acceptance criteria evaluation and evidence collection. It records actual check results and does not infer success from assistant prose.

### Learning and visual systems

Own reviewed, provenance-bearing project learnings and project-specific design contracts. These should remain portable in repository docs and assets.

## 4. Proposed logical architecture

~~~text
ROCKSOUL DX Desktop / Web
          |
          v
ROCKSOUL FLOW UI
  |        |        |        |
 Radar   Audit     Plan    Task Deck / Proof
  |        |        |        |
  +--------+--------+--------+
                   |
          FLOW orchestration boundary
                   |
       +-----------+------------+
       |           |            |
 Repo scanner   Plan parser   Run coordinator
       |           |            |
       +------ evidence / metadata ------+
                   |
          Existing OpenCode runtime
  Sessions / Agents / Tools / Plugins / MCP
       Permissions / Worktrees / Git / Terminal
                   |
             Project repository
      Source / tests / docs / Markdown plan
~~~

This is a logical map. It does not prescribe a single process or package. The first implementation spike must determine which responsibilities fit existing packages and which require a new isolated module.

## 5. Plan format and ownership

The initial durable plan is Markdown committed with the project. A task should carry:

- Stable ID.
- Title and one-sentence goal.
- Status.
- Dependencies.
- Explicit scope and non-goals.
- Relevant source/document references.
- Acceptance criteria.
- Verification commands and expected evidence.
- Expected deliverables.
- Execution/session references when applicable.

A UI board and dependency graph are projections over this file. If the parser encounters unknown fields, it should preserve them rather than silently deleting user-authored metadata. Writes should be atomic and should detect concurrent edits.

Do not turn the existing session todo tool into a project plan database. Session todos are transient execution context; project plans are durable repository intent.

## 6. Evidence model

Each repository claim or verification result should point to an inspectable reference:

- File path and, where available, line or symbol.
- Git revision and dirty-state context.
- Test or command identifier.
- Exit code and timestamps.
- Output artifact path or sanitized excerpt.
- Screenshot or recording reference for visual checks.
- Human reviewer decision where automation is insufficient.

Evidence must be bounded, sanitized, and safe to persist. Do not store secrets, access tokens, private keys, or full environment dumps in plans or evidence records.

## 7. Execution and concurrency

- A task cannot dispatch until its dependencies are verified or explicitly waived by the user with a recorded reason.
- One mutable checkout has one active writer by default.
- Parallel writes require separate worktrees or another explicit isolation mechanism.
- Agent identity, session ID, repository, branch, worktree, and task ID must be visible.
- Cancellation must stop dispatch and request safe interruption through the existing session/runtime controls.
- Retry must create a traceable new run or attempt, not erase the old failure evidence.
- A task may be implemented but not verified.
- No background agent may merge, push, release, or deploy without an explicit operation-specific authorization.

## 8. Permissions and threat boundaries

Repository content is untrusted input. Instructions found in source files, issues, READMEs, tool output, or generated artifacts must not override user intent, system policy, repository permissions, or execution packet boundaries.

Required protections:
- Use the existing permission system for file and shell operations.
- Respect project roots and worktree boundaries.
- Treat generated command suggestions as proposals until approved by the applicable permission policy.
- Do not let a repository scan or semantic index access paths outside the selected project.
- Redact secrets in logs and evidence.
- Require approval for destructive operations and shared Git state changes.
- Keep external network, publishing, and deployment actions separate from local verification.
- Preserve auditability of who/what initiated an action and from which task.

## 9. UX integration

Do not create a second application shell or duplicate session UI. Explore existing shell navigation, panels, command palette, route, and plugin extension patterns first.

Proposed workspaces should feel distinct:
- Radar: exploratory repository map and evidence.
- Audit: side-by-side requirement-to-code comparison.
- Plan Forge: editable task graph and Markdown preview.
- Prompt Forge: execution packet editor and copy/export.
- Task Deck: live execution lanes, agent/session/worktree association.
- Proof Gate: check results and review artifacts.
- Memory Ledger: proposed learning queue.
- Visual DNA Lab: visual contract and reference canvas.
- Workspace Orbit: multi-repository dependency map.

ROCKSOUL's industrial manga / underground dev-zine identity belongs on framing surfaces and workspace navigation. Code, diffs, logs, and conversational text remain calm and readable.

## 10. Decisions deliberately deferred

Do not finalize these without a focused architecture spike and written decision:

1. Whether the workflow engine belongs in Core, Server, a plugin, or a new package.
2. Whether snapshots and indexes are persisted or rebuilt from Git and filesystem state.
3. Whether task plans are a single Markdown file, a folder of plan files, or a user-configurable location.
4. How to parse, validate, and preserve user-defined Markdown metadata.
5. How to dispatch local coding agents outside the existing OpenCode session runtime.
6. Whether multi-agent execution needs a durable queue or can use existing session orchestration.
7. How cross-repository identity and credentials are scoped.
8. Which visual regression tooling can be reused without adding heavy dependencies.

Each decision must include the alternatives considered, affected modules, data ownership, migration implications, and verification approach.

## 11. Quality and release gates

- Add behavior behind a feature flag when it is risky, user-visible, or must land across multiple PRs, following root AGENTS.md.
- Start new API behavior as experimental when it changes public server/client contracts.
- Add tests at the package boundary that owns the behavior.
- Run focused package tests, lint, and typecheck; never run tests from the repository root.
- Test recovery from interrupted scans, plan writes, task dispatch, and verification.
- Verify keyboard access, responsive layouts, reduced motion, and the ROCKSOUL theme.
- Keep upstream synchronization manageable and product-specific changes isolated.


## 10. Accepted first implementation boundary

The first implementation boundary is accepted in [ADR-0001](ADR-0001-FLOW-FIRST-INTEGRATION-BOUNDARY.md): a pure, read-only Markdown task parser and validator inside the existing Core package. It does not add a database table, new package, Server/Protocol API, generated Client SDK surface, or application route.

The source-backed [capability inventory](../audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md), [feature overlap matrix](ROCKSOUL-FLOW-OVERLAP-MATRIX.md), and [data/evidence contracts](ROCKSOUL-FLOW-DATA-CONTRACTS.md) are the current reference set for implementation ownership. The [portable Markdown plan format](../plans/ROCKSOUL-FLOW-PLAN-FORMAT.md) describes the parser's v1 input contract. The [parallel workstreams](../plans/ROCKSOUL-FLOW-PARALLEL-WORKSTREAMS.md) document the lane ownership and concurrency constraints.

The first parser slice is implemented in `packages/core/src/flow/plan.ts` with focused tests in `packages/core/test/flow/plan.test.ts`. It remains implemented—not verified—until the repository's Bun test and typecheck gates execute successfully. File writes, persistence, app UI, dispatch, and multi-agent coordination remain separate tasks.
