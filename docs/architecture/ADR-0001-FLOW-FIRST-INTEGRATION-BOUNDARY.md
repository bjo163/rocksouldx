# ADR-0001: First ROCKSOUL FLOW Integration Boundary

- **Status:** Accepted for the first implementation slice
- **Date:** 2026-11-05
- **Decision owners:** ROCKSOUL DX integration coordinator
- **Related tasks:** RSF-001, RSF-002, RSF-003, RSF-004, RSF-301, RSF-302
- **Evidence baseline:** `526280d65cc7ed2917b2d48484068f42619d984f`

## Context

The source audit found that the repository already owns model/provider execution, agent sessions, Plan mode, session TODOs, file access/search, Git, worktrees, database services, plugins/MCP, terminal execution, desktop/web shells, theme infrastructure, and image generation.

The missing product layer is the relationship between project intent, task scope, repository evidence, execution references, and verification proof.

The product needs a first code slice that proves the format and validation contract without prematurely choosing a persistence system, new package, server API, database migration, or second UI shell.

## Decision

Implement the first vertical slice as a **pure, read-only Markdown plan parser and validator inside the existing Core package**.

Initial code ownership:
- parser and validation source: `packages/core/src/flow/plan.ts`;
- focused unit tests: `packages/core/test/flow/plan.test.ts`;
- portable format contract: `docs/plans/ROCKSOUL-FLOW-PLAN-FORMAT.md`;
- data contract: `docs/architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md`.

The parser receives Markdown text as input and returns parsed tasks plus source-located diagnostics. It performs no filesystem writes, network calls, database access, Git operations, process execution, agent dispatch, or UI work.

The first implementation supports the documented task-heading/field subset used by the current ROCKSOUL FLOW plan. It retains each task's original raw section and unknown metadata. It validates duplicate IDs, missing dependencies, dependency cycles, invalid statuses, and required task fields. It does not rewrite or normalize the source.

## Why this boundary

1. Core already owns project-level domain services and is the package consumed by the Server. A pure parser is a domain capability, not a React/UI component.
2. The current package already has a Bun unit-test harness and a package-specific typecheck.
3. Markdown remains the canonical plan source, so no database schema is needed for parsing.
4. The existing Plan agent is read-only and writes only within its own global Plan directory; FLOW's parser does not change that behavior.
5. Session TODO remains transient; this decision does not promote it into a project database.
6. A pure parser can be reviewed and tested before the app commits to a route, storage adapter, or generated Client API.

## Considered alternatives

### New standalone package

Rejected for the first slice. There is not yet enough stable cross-package surface to justify a new package, package export, build target, or dependency graph.

### Database-backed Plan store

Deferred. The product contract explicitly makes repository Markdown the source of truth. Persisting duplicated task records would add migration and synchronization risk before a measured need exists.

### Server/Protocol endpoint immediately

Deferred. No read/write API is needed for a pure parser. Add HTTP endpoints only when a later task defines request validation, project-root authorization, concurrency behavior, error semantics, and generated SDK updates.

### App-wide route or session plugin panel

Deferred. The existing router has a defined shell and route set; session plugin panels are scoped to routed sessions. A global FLOW workspace must not be forced into a session-only surface. UI integration requires its own focused route/shell ADR after service contracts are ready.

### Reuse the Plan agent or session TODO as the parser

Rejected. Those systems have different ownership and lifecycle: Plan mode is a read-only conversation mode, while TODO state belongs to a session. Neither parses the project's canonical task plan.

## Consequences

Positive:
- No new runtime dependency, package, public API, database table, or app route is introduced.
- The format is portable and usable by local agents without ROCKSOUL DX.
- Parser validation can be tested with deterministic fixtures.
- Later UI and service layers can consume a typed result without owning Markdown parsing.

Constraints:
- The first parser is intentionally not a full Markdown AST or general task-management engine.
- The parser must report unsupported or malformed task structures rather than guessing.
- Writing remains prohibited until RSF-303 adds project-root confinement, atomic writes, optimistic concurrency, recovery, and diff preview.
- Task state updates remain coordinator-reviewed until RSF-306 and Proof Gate establish transitions and evidence.

## Verification gate

Run from `packages/core`:

```bash
bun test test/flow/plan.test.ts
bun run typecheck
```

For workspace validation:

```bash
bun run check
```

Do not run the root `bun run test`; the root script intentionally blocks it. Full Bun execution was not available in this GitHub-only editing session; the PR checks remain the executable verification gate.

## Revisit triggers

Reopen this ADR only if:
- parsing requires cross-package public exports or a new dependency;
- Markdown must support syntax that cannot be safely handled by the documented parser subset;
- a measured performance need requires a rebuildable cache;
- a user-approved workflow requires a server API, persistent execution metadata, or global UI route;
- the source audit finds a newer existing feature that changes the chosen ownership boundary.
