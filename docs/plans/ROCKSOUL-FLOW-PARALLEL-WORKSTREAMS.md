# ROCKSOUL FLOW — Parallel Workstreams

Status: **EXECUTION TOPOLOGY**
Canonical backlog: [ROCKSOUL-FLOW.plan.md](ROCKSOUL-FLOW.plan.md)
Architecture: [Overlap matrix](../architecture/ROCKSOUL-FLOW-OVERLAP-MATRIX.md) · [Data contracts](../architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md)

This file defines how independent agents can work without duplicating capabilities or corrupting shared state. It is a scheduling contract, not a claim that multiple autonomous workers have already been launched.

## 1. Coordination model

Use one integration coordinator and bounded specialist lanes.

- **Coordinator / Integrator:** owns the canonical plan, dependency graph, shared documentation index, final integration, and final status transitions.
- **Repo Intelligence lane:** owns Repo Radar and source-evidence inventory.
- **Audit lane:** owns requirement decomposition, overlap analysis, and review findings.
- **Plan & Prompt lane:** owns Markdown format, parser/validator, safe plan operations, and execution-packet compilation.
- **Execution & Proof lane:** owns task/run mapping, dispatch policy, and evidence gate.
- **Project Knowledge lane:** owns reviewed learning and project-specific Visual DNA contracts.
- **Workspace lane:** owns explicit repository registration relationships and cross-repo planning.
- **Independent QA lane:** read-only review of each diff, task acceptance, test coverage, dependency direction, and scope.

No lane may rewrite the canonical plan file or mark its own work verified without independent evidence review. The coordinator is the only owner of `docs/plans/ROCKSOUL-FLOW.plan.md`.

## 2. Lane ownership

| Lane | Task IDs | Exclusive write area (after the integration boundary is accepted) | Output |
| --- | --- | --- | --- |
| Repo Intelligence | RSF-101–105 | `packages/core/src/flow/repo/**`, matching Core tests, Repo Radar-specific docs | Revision-bound repository snapshot and UI integration proposal. |
| Audit | RSF-201–205 | `packages/core/src/flow/audit/**`, matching Core tests, audit report fixtures | Requirement model, evidence findings, overlap classifier, review flow. |
| Plan & Prompt | RSF-301–404 | `packages/core/src/flow/plan/**`, `packages/core/src/flow/prompt/**`, matching Core tests, format fixtures | Portable plan parser/validator and deterministic execution packet. |
| Execution & Proof | RSF-501–606 | `packages/core/src/flow/run/**`, `packages/core/src/flow/evidence/**`, matching Core tests, execution/evidence docs | Task/run association, safe dispatch orchestration, verification evidence. |
| Project Knowledge | RSF-701–804 | `packages/core/src/flow/learning/**`, `packages/core/src/flow/visual/**`, matching tests, profile fixtures | Review-only learning candidates and project-scoped visual contracts. |
| Workspace | RSF-901–904 | `packages/core/src/flow/workspace/**`, matching tests, workspace fixtures | Declared repository graph and per-repository context. |
| Independent QA | Cross-cutting | No feature writes; findings only until coordinator approves a fix | Reproducible test matrix, scope review, architecture and security findings. |

These are future ownership boundaries, not permission to create every directory immediately. A task must first inspect current source and justify its file path. If an existing owner already satisfies the need, the lane reuses it instead.

## 3. Parallel scheduling graph

### Gate 0 — shared baseline

Complete and review:
- RSF-001 capability inventory.
- RSF-002 overlap matrix.
- RSF-003 data/evidence contracts.
- RSF-004 first integration boundary.

### Wave 1 — independent contract and discovery work

After Gate 0, these lanes may proceed in parallel because they own different artifacts:

- **Radar:** RSF-101 scan boundary; then RSF-102 and RSF-103 in parallel; RSF-104 combines their outputs; RSF-105 adds the product surface.
- **Audit:** RSF-201 requirement decomposition can begin immediately; RSF-202 requires Repo Radar inventory/evidence; RSF-203 follows; RSF-204 also uses the plan parser; RSF-205 adds review UI after findings are stable.
- **Plan:** RSF-301 format → RSF-302 parser/validator → RSF-303 safe read/write. RSF-301 and RSF-302 do not require Audit Bench UI.
- **Prompt:** RSF-401 packet contract can begin after RSF-003 + RSF-301; RSF-402 requires relevant snapshot context; RSF-403 handles preview/export; RSF-404 waits for report/evidence contract.
- **Proof:** RSF-601 evidence contract can proceed after RSF-003 + RSF-401. RSF-602 uses command inventory; RSF-604 can be designed alongside RSF-603 because it inspects Git scope rather than running checks.
- **Knowledge:** RSF-701 and RSF-801 are independent domain contracts after RSF-003. Their UI/integration tasks wait for storage and evidence boundaries.
- **Workspace:** RSF-901 can start after RSF-004; relationship graph tasks remain isolated from per-repo scanner code.

### Wave 2 — bounded implementations

- Repo Radar core inventory can run alongside the pure Plan parser because its modules and test files are separate.
- Audit classifier can run alongside Prompt compiler only after their evidence and packet contracts are fixed.
- Task/run mapping and worktree-isolation policy can be developed separately after RSF-501; dispatch orchestration waits for both.
- Verification collector and Git diff scope analyzer can be implemented in parallel; Proof Gate evaluation waits for both.
- Learning candidate extraction and Visual DNA registry must not write project documentation/assets automatically.
- Workspace graph work may proceed independently, but cross-repo execution is deferred until task proof and authorization rules are complete.

### Wave 3 — integrated UX and end-to-end gates

The UI tasks run after their underlying contract and service tasks have stable inputs. End-to-end flows are integrated only when:
- the parser/validator and safe plan write path are ready;
- task dispatch preserves existing permissions and session ownership;
- parallel writes are isolated by worktree;
- check results and changed-file evidence are revision-bound;
- user approvals are explicit and auditable.

## 4. Safe concurrency rules

1. **One mutable checkout has one writer by default.** Do not let two agents edit one working tree or one shared file simultaneously.
2. **Disjoint files do not make shared Git state safe.** Concurrent code writers must use isolated worktrees. Integrate their commits serially on the feature branch.
3. **Do not create worktrees before checking dirty state.** Never reset, clean, or remove a worktree containing user changes.
4. **The plan file is coordinator-owned.** Agents return status evidence and proposed dependency changes; the coordinator applies them.
5. **Shared contracts are frozen per wave.** A contract change is an explicit cross-lane change request with affected tasks listed; no silent contract drift.
6. **A lane may not claim another lane's acceptance.** Independent QA reviews its evidence.
7. **No automatic merge/push/release/deploy.** Operation-specific authorization is required.
8. **Failed attempts remain visible.** A retry gets a new attempt and does not overwrite previous evidence.

## 5. Work packet required for every agent

Every dispatched task packet must include:
- one task ID and one goal;
- pinned repository revision and branch/worktree identity;
- explicit file ownership and forbidden overlap paths;
- relevant source files and nested `AGENTS.md` guidance;
- existing implementation/reuse findings;
- acceptance criteria and exact verification commands;
- dependency states and unresolved decisions;
- destructive/shared-Git/network restrictions;
- required report shape: changed files, diff summary, commands/results, evidence refs, caveats, commit SHA if committed.

An agent must stop rather than widen scope when it discovers a new package/API/schema requirement, shared-file collision, dirty worktree risk, or unresolved permission boundary.

## 6. Integration checklist

Before accepting a lane:
- [ ] The work stayed inside its task and file ownership.
- [ ] Existing source ownership was reused where appropriate.
- [ ] No duplicate session, TODO, worktree, provider, terminal, Git, plugin, MCP, or image-generation subsystem was introduced.
- [ ] Tests cover success, failure, stale state, malformed input, and security boundaries appropriate to the task.
- [ ] Package-specific lint/typecheck/tests ran or are explicitly recorded as not run.
- [ ] Generated files follow the repository generation workflow.
- [ ] No credentials or untrusted prompt instructions were persisted.
- [ ] Independent QA reviewed the diff and evidence.
- [ ] Coordinator updated task status with commit/evidence references.

## 7. Current execution constraint

The current repository change is contained in the existing integration branch. This session can perform parallel source inspections and prepare lane-specific artifacts, but it does not expose a local multi-agent coding runtime. Therefore, concurrent specialist execution is defined here; code writes in this integration session are applied serially and validated by the PR's CI. Do not describe the lanes as launched agents unless an actual runtime dispatch has occurred.
