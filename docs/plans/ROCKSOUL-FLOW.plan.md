# ROCKSOUL FLOW — Implementation Plan

Status: **ACTIVE — INITIAL FOUNDATION DELIVERED**  
Plan type: Product implementation roadmap  
Canonical companion documents:
- ../product/ROCKSOUL-FLOW.md
- ../product/ROCKSOUL-FLOW-FEATURE-BLUEPRINT.md
- ../architecture/ROCKSOUL-FLOW-ARCHITECTURE.md
- ../architecture/ROCKSOUL-FLOW-OVERLAP-MATRIX.md
- ../architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md
- ../architecture/ADR-0001-FLOW-FIRST-INTEGRATION-BOUNDARY.md
- ../audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md
- ROCKSOUL-FLOW-PLAN-FORMAT.md
- ROCKSOUL-FLOW-PARALLEL-WORKSTREAMS.md
- ROCKSOUL-FLOW-EXECUTION-PACKET.md
- ROCKSOUL-FLOW-REPO-SCAN-POLICY.md

This is the canonical task backlog, not a blanket claim that ROCKSOUL FLOW is implemented. The source inventory, overlap matrix, data/evidence contracts, first integration ADR, and portable plan-format specification have been delivered and recorded as verified. The read-only plan parser and focused tests are implemented but not yet verified by an executed test run. All other workflow work remains planned until its code and evidence are recorded.

## Execution contract

- Execute one task ID at a time unless the parallel-workstreams document defines safe parallel work.
- Parallelize only after shared contracts are stable, with disjoint file ownership and one writer per mutable checkout; use separate worktrees for concurrent code writers.
- The coordinator alone edits this canonical plan and applies status transitions after reviewing lane evidence.
- Before implementation, reread the task, architecture document, relevant AGENTS.md files, and current source paths. The source may have changed since this plan was authored.
- Audit the existing code and tests before creating a new module, package, schema, command, or UI surface.
- Reuse existing sessions, agents, tools, plugins, MCP, permissions, worktrees, terminal, Git, and review features whenever they satisfy the requirement.
- Do not convert session TODOs into durable project plans. Keep the Markdown plan as the project-level source of truth.
- Keep user-authored Markdown fields and unknown metadata when parsing or writing plans.
- Keep each task's file scope bounded. If the task requires unrelated files or a new architectural decision, stop and split the work or record the decision first.
- Do not add dependencies, public APIs, migrations, or new packages without demonstrating the concrete gap and recording the decision.
- Use feature flags for risky user-visible behavior according to root AGENTS.md.
- No autonomous destructive operation, shared-branch write, push, merge, release, or deployment without explicit user authorization.
- Never store secrets or credentials in a plan, generated prompt, scan index, or evidence artifact.
- Update status only from inspectable evidence. Implemented is not verified.

## Status vocabulary

- draft — incomplete or unreviewed authoring state; not executable.
- planned — captured in the backlog but not yet ready for execution.
- ready — dependencies and acceptance criteria are satisfied.
- in_progress — an agent is actively working on it.
- blocked — dependency, decision, or external condition prevents progress.
- implemented — code exists but required verification is incomplete.
- verified — required checks passed and evidence is linked.
- cancelled — intentionally stopped with a recorded reason.

## Milestone map

| Milestone | Outcome | Tasks |
| --- | --- | --- |
| M0 — Discovery and contracts | Verified source map and stable product/technical boundaries | RSF-001 to RSF-004 |
| M1 — Repo Radar | Revision-aware repository snapshot with evidence | RSF-101 to RSF-105 |
| M2 — Overlap Detector | Requirement-to-implementation audit report | RSF-201 to RSF-205 |
| M3 — Plan Forge | Portable Markdown plans with validation and projections | RSF-301 to RSF-306 |
| M4 — Prompt Forge | Self-contained execution packet for one task | RSF-401 to RSF-404 |
| M5 — Task Deck | Safe task dispatch through existing sessions and worktrees | RSF-501 to RSF-506 |
| M6 — Proof Gate | Evidence-backed acceptance and completion states | RSF-601 to RSF-606 |
| M7 — Memory Ledger | Reviewed, provenance-bearing project learnings | RSF-701 to RSF-704 |
| M8 — Visual DNA Lab | Project-specific visual contracts and review evidence | RSF-801 to RSF-804 |
| M9 — Workspace Orbit | Explicit multi-repository map and coordinated planning | RSF-901 to RSF-904 |

---

# M0 — Discovery and contracts

## RSF-001 — Refresh the existing capability inventory

- Status: verified
- Depends on: none
- Goal: establish a source-backed inventory before designing FLOW-specific modules.
- Scope:
  - Inspect the current source tree, package manifests, root and package AGENTS.md files, tests, scripts, and extension points.
  - Map session, agent, tool, plugin, MCP, permission, filesystem, Git, worktree, desktop shell, and project persistence ownership.
  - Record relevant file paths and test locations in a concise audit artifact.
- Acceptance:
  - Every claimed reusable capability links to current source.
  - Inherited, ROCKSOUL-specific, experimental, and unknown behavior are separated.
  - Findings identify stale or missing documentation.
- Verification: compare the inventory with the current tree and inspect each cited source path.
- Deliverable: Source-backed inventory: ../audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md

## RSF-002 — Establish the feature overlap matrix

- Status: verified
- Depends on: RSF-001
- Goal: prevent duplicate workflow systems.
- Scope:
  - Compare each FLOW pillar with existing source, tests, settings, and plugin interfaces.
  - Classify each capability as reuse, extend, build, defer, or reject.
  - Record known overlaps: Plan agent versus Plan Forge, session TODO versus project plan, worktree manager versus Task Deck, and current image generation versus Visual DNA Lab.
- Acceptance:
  - Every feature-blueprint capability has a decision and evidence.
  - No new subsystem is approved solely because its UI concept is new.
  - Uncertain ownership is listed as a decision gate.
- Verification: review every matrix row against source and tests.
- Deliverable: Evidence-backed reuse/build/defer matrix: ../architecture/ROCKSOUL-FLOW-OVERLAP-MATRIX.md

## RSF-003 — Define task and evidence contracts

- Status: verified
- Depends on: RSF-001, RSF-002
- Goal: define portable concepts before persistence or UI implementation.
- Scope:
  - Specify Plan, PlanTask, ExecutionPacket, ExecutionRun, EvidenceRecord, CapabilityFinding, and LearningRecord fields.
  - Define stable IDs, status transitions, repository/revision identity, and provenance.
  - Mark derived fields versus durable source-of-truth fields.
- Acceptance:
  - Markdown plan ownership is explicit.
  - Session history is not duplicated.
  - Check results distinguish pass, fail, skipped, not applicable, and not run.
  - Unknown user-authored metadata can be preserved.
- Verification: schema review with example valid and invalid documents.
- Deliverable: Task and evidence contracts: ../architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md

## RSF-004 — Decide the first integration boundary

- Status: verified
- Depends on: RSF-001, RSF-002, RSF-003
- Goal: choose the smallest safe place to implement the first FLOW vertical slice.
- Scope:
  - Evaluate plugin, existing package, Server, Core, and new-package options.
  - Identify lifecycle, persistence, permissions, API, UI, and test consequences.
  - Document alternatives and why the selected boundary fits.
- Acceptance:
  - No package or API is added before this decision.
  - The vertical slice has a bounded file and runtime surface.
  - The decision is compatible with upstream synchronization.
- Verification: architecture review and dependency-direction check against root AGENTS.md.
- Deliverable: Accepted integration decision: ../architecture/ADR-0001-FLOW-FIRST-INTEGRATION-BOUNDARY.md

# M1 — Repo Radar

## RSF-101 — Define repository snapshot inputs and ignore policy

- Status: implemented
- Depends on: RSF-004
- Goal: define a safe, deterministic scan boundary.
- Scope: repository root resolution, Git revision/dirty state, ignore precedence, generated/vendor/binary exclusions, and inaccessible-path reporting.
- Acceptance: scan cannot escape the selected project root; ignored and sensitive paths are excluded by default; incomplete scans are explicit.
- Verification: fixtures for nested roots, symlinks, ignored paths, generated directories, and inaccessible files.
- Deliverable: scan boundary/policy spec and focused helper/tests: ROCKSOUL-FLOW-REPO-SCAN-POLICY.md, ../../packages/core/src/flow/repo/scan-policy.ts, and ../../packages/core/test/flow/repo/scan-policy.test.ts

## RSF-102 — Implement manifest and toolchain inventory

- Status: planned
- Depends on: RSF-101
- Goal: discover project stack and usable commands.
- Scope: package manifests, workspace config, lockfile/package manager, language/framework hints, and scripts for lint/test/typecheck/build.
- Acceptance: observed values link to source files; missing scripts are not invented; conflicting package managers are flagged.
- Verification: fixture repositories with JS/Bun, Node, Python, Rust, monorepo, and incomplete manifests.
- Deliverable: inventory module and package tests.

## RSF-103 — Implement documentation and guidance inventory

- Status: planned
- Depends on: RSF-101
- Goal: discover project knowledge sources.
- Scope: README files, docs folders, plan files, AGENTS.md, architecture decisions, and package-specific instructions.
- Acceptance: hierarchy and scope of guidance are preserved; duplicate paths are not listed twice; no claim is treated as implementation evidence without source/test validation.
- Verification: nested guidance fixtures and docs inventory tests.
- Deliverable: documentation inventory module.

## RSF-104 — Build the repository structure and module map

- Status: planned
- Depends on: RSF-102, RSF-103
- Goal: expose useful package/module boundaries.
- Scope: workspace packages, entry points, internal imports, tests, and likely domain ownership.
- Acceptance: map is navigable and revision-bound; generated/vendor noise is suppressed; inferred edges are visually distinct from declared dependencies.
- Verification: compare module graph against package manifests and import references.
- Deliverable: project structure model.

## RSF-105 — Build the Repo Radar experience

- Status: planned
- Depends on: RSF-104
- Goal: make the snapshot understandable and refreshable in the existing app shell.
- Scope: overview, stack summary, source references, Git state, documentation links, last scan, refresh action, and incomplete-scan warnings.
- Acceptance: user can inspect the evidence behind a claim; scan refresh does not lose the selected project; keyboard and reduced-motion behavior work.
- Verification: component tests and a focused end-to-end project-open/refresh flow.
- Deliverable: Repo Radar screen.

# M2 — Overlap Detector

## RSF-201 — Define requirement decomposition

- Status: planned
- Depends on: RSF-003
- Goal: convert a feature request into reviewable requirement units.
- Scope: requirement IDs, expected behavior, explicit constraints, non-goals, and unresolved questions.
- Acceptance: vague requirements remain unresolved rather than being silently guessed; original user intent remains traceable.
- Verification: fixtures for complete, ambiguous, contradictory, and multi-part requests.
- Deliverable: requirement model.

## RSF-202 — Build evidence retrieval for requirements

- Status: planned
- Depends on: RSF-201, RSF-104
- Goal: find code, tests, docs, config, and existing plans relevant to each requirement.
- Scope: reuse current file search, symbol/code navigation, and repository inventory; add ranking only where a measurable gap exists.
- Acceptance: every finding has one or more inspectable references; inaccessible scope is disclosed; no semantic score is treated as proof.
- Verification: repository fixtures with implemented, partial, missing, and misleading filename cases.
- Deliverable: evidence retrieval layer.

## RSF-203 — Implement capability classification

- Status: planned
- Depends on: RSF-202
- Goal: classify each requirement into implemented, partial, missing, overlap, conflict, or deprecated.
- Scope: classification rubric, confidence, rationale, evidence, and human-review state.
- Acceptance: partial work is not mislabeled complete; false positives can be rejected; classifications are reproducible from saved inputs.
- Verification: labeled fixtures with expected classifications and confidence ranges.
- Deliverable: classifier and tests.

## RSF-204 — Detect duplicate and conflicting plan tasks

- Status: planned
- Depends on: RSF-203
- Goal: prevent duplicate backlog items and incompatible work.
- Scope: compare task intent, scope, dependencies, affected modules, and acceptance criteria across the active plan.
- Acceptance: candidate duplicates link to existing IDs; conflict reports explain the collision; no task is automatically deleted.
- Verification: duplicate, near-duplicate, complementary, and intentionally separate task fixtures.
- Deliverable: plan overlap analyzer.

## RSF-205 — Build the Audit Bench review flow

- Status: planned
- Depends on: RSF-203, RSF-204
- Goal: let the developer review findings before generating or changing a plan.
- Scope: requirement matrix, evidence preview, filters, confidence, reviewer decisions, and export.
- Acceptance: user can accept, reject, or mark a finding uncertain; each decision is recorded; no code is changed from the audit view.
- Verification: component and E2E tests for review and export.
- Deliverable: Audit Bench UI.

# M3 — Plan Forge

## RSF-301 — Specify the portable Markdown plan format

- Status: verified
- Depends on: RSF-003
- Goal: define a stable plan format readable outside ROCKSOUL DX.
- Scope: frontmatter/metadata decision, milestone and task syntax, status vocabulary, dependency references, evidence links, and unknown-field preservation.
- Acceptance: format is documented with valid/invalid examples; plain text remains readable; IDs remain stable across edits.
- Verification: fixture validation and round-trip preservation tests.
- Deliverable: Portable Markdown v1: ROCKSOUL-FLOW-PLAN-FORMAT.md

## RSF-302 — Implement plan parser and validator

- Status: implemented
- Depends on: RSF-301
- Goal: parse plans and detect structural errors.
- Scope: duplicate IDs, missing dependencies, dependency cycles, invalid statuses, missing or empty required fields, invalid dependency syntax, and source-located diagnostics.
- Acceptance: parser returns actionable diagnostics with source locations; unknown metadata is preserved; invalid input cannot silently overwrite the file.
- Verification: unit tests and malformed/large plan fixtures.
- Deliverable: Read-only parser and focused tests: ../../packages/core/src/flow/plan.ts and ../../packages/core/test/flow/plan.test.ts

## RSF-303 — Add safe plan read/write operations

- Status: planned
- Depends on: RSF-302
- Goal: edit Markdown plans without losing user work.
- Scope: atomic writes, optimistic concurrency check, diff preview, backups/recovery strategy, and path policy.
- Acceptance: concurrent external changes are detected; writes stay inside the configured project plan path; original content is recoverable after interrupted writes.
- Verification: read/write round-trip, concurrent update, interrupted write, and path traversal tests.
- Deliverable: plan repository adapter.

## RSF-304 — Generate plans from reviewed audit findings

- Status: planned
- Depends on: RSF-203, RSF-302
- Goal: draft a plan with traceable requirements and small tasks.
- Scope: milestone grouping, microtask decomposition, dependencies, scope, acceptance criteria, verification, and deliverables.
- Acceptance: implemented/partial findings are reused as context, not replanned blindly; every task maps to a requirement or explicit foundation task; plan is draft until approved.
- Verification: golden plan fixtures and duplicate detection tests.
- Deliverable: plan generation workflow.

## RSF-305 — Build Plan Forge editing and graph projections

- Status: planned
- Depends on: RSF-303
- Goal: edit the plan and view dependencies without creating a second source of truth.
- Scope: Markdown editor/preview, task list, dependency graph, filters, task detail, and validation diagnostics.
- Acceptance: all views reflect the same Markdown content; graph edits update the document through explicit operations; invalid cycles are visible.
- Verification: component tests, editor round-trip, and graph consistency tests.
- Deliverable: Plan Forge UI.

## RSF-306 — Add evidence-backed task status updates

- Status: planned
- Depends on: RSF-303, RSF-601
- Goal: update task state only when the relevant workflow event is proven.
- Scope: transitions among ready, in_progress, blocked, implemented, verified, and cancelled; transition reason and evidence references.
- Acceptance: implemented cannot become verified without required proof; manual overrides record actor and reason; stale run events cannot overwrite newer task state.
- Verification: transition matrix and stale-event tests.
- Deliverable: task status service.

# M4 — Prompt Forge

## RSF-401 — Define execution packet contract

- Status: verified
- Depends on: RSF-003, RSF-301
- Goal: specify a self-contained instruction packet for one microtask.
- Scope: task data, repository/branch context, evidence, scope, non-goals, conventions, checks, expected output, and escalation rules.
- Acceptance: packet contains enough context to execute one task without relying on the entire chat; packet states what must not be changed.
- Verification: schema and golden Markdown fixtures.
- Deliverable: Execution packet contract and golden fixture: ROCKSOUL-FLOW-EXECUTION-PACKET.md and ../../packages/core/test/fixtures/flow/execution-packet.md

## RSF-402 — Compile task context into a one-shot prompt

- Status: planned
- Depends on: RSF-401, RSF-105
- Goal: produce a high-signal local-agent prompt from an approved task.
- Scope: include only relevant files and constraints; reference paths rather than dumping entire repository context; include command safety and reporting rules.
- Acceptance: prompt is deterministic for a fixed task/snapshot; unknown context is stated; out-of-scope instructions are absent.
- Verification: snapshot-based golden prompt tests and manual review rubric.
- Deliverable: prompt compiler.

## RSF-403 — Add packet preview, copy, and export

- Status: planned
- Depends on: RSF-402
- Goal: allow task execution by local agents outside the app.
- Scope: editable preview, copy, Markdown export, and task/commit association fields.
- Acceptance: copied/exported packet matches preview; secrets are redacted; task and revision identity are included.
- Verification: copy/export tests and secret-redaction fixtures.
- Deliverable: Prompt Forge UI and export path.

## RSF-404 — Add execution report ingestion

- Status: planned
- Depends on: RSF-403, RSF-601
- Goal: connect a local agent's final report and evidence to the originating task.
- Scope: structured completion report, changed paths, checks, commit SHA, caveats, and manual association flow.
- Acceptance: untrusted report text cannot mark checks as passing without evidence; mismatched repository or task IDs are rejected or flagged.
- Verification: valid, malformed, incomplete, and mismatched report fixtures.
- Deliverable: execution report importer.

# M5 — Task Deck

## RSF-501 — Define task-to-session and worktree mapping

- Status: planned
- Depends on: RSF-004, RSF-401
- Goal: map FLOW tasks to existing session/runtime ownership.
- Scope: task ID, session ID, project, repository revision, branch, worktree path, and agent role.
- Acceptance: session history remains owned by existing session runtime; workflow metadata does not duplicate messages or model execution state.
- Verification: mapping lifecycle tests and orphan association recovery tests.
- Deliverable: mapping contract.

## RSF-502 — Dispatch one task through existing session APIs

- Status: planned
- Depends on: RSF-501
- Goal: start one approved task using the existing agent/session system.
- Scope: explicit task selection, packet attachment, agent selection, permission inheritance, and run association.
- Acceptance: dispatch requires an approved ready task; selected project and worktree are explicit; permission prompts remain effective.
- Verification: integration test with a local fixture project and a controlled test agent.
- Deliverable: single-task dispatch.

## RSF-503 — Add safe worktree isolation

- Status: planned
- Depends on: RSF-501
- Goal: prevent parallel agents from colliding in a mutable checkout.
- Scope: worktree selection/creation, branch naming policy, dirty-worktree detection, base revision, ownership, and cleanup review.
- Acceptance: never discard user changes; task ownership is visible; cleanup requires a safe empty/known state and applicable user approval.
- Verification: conflicting task, dirty branch, cancellation, and interrupted-run tests.
- Deliverable: worktree-aware dispatch.

## RSF-504 — Implement dependency-aware dispatch queue

- Status: planned
- Depends on: RSF-503, RSF-302
- Goal: schedule only tasks whose dependencies are satisfied.
- Scope: ready queue, concurrency cap, dependency evaluation, backpressure, and run ordering.
- Acceptance: blocked dependencies do not dispatch; parallel execution requires isolation; task order is deterministic for equal priority.
- Verification: graph fixtures, concurrency tests, and queue recovery tests.
- Deliverable: dispatch coordinator.

## RSF-505 — Add run monitor and safe controls

- Status: planned
- Depends on: RSF-504
- Goal: monitor task activity and control active runs.
- Scope: queued/running/waiting/blocked/failed/cancelled/finished states, logs, session links, cancel, retry, and safe resume.
- Acceptance: retry retains previous attempt evidence; cancellation uses existing session interruption; stale events cannot regress state.
- Verification: lifecycle, cancellation, and restart recovery tests.
- Deliverable: Task Deck run monitor.

## RSF-506 — Build Task Deck UI

- Status: planned
- Depends on: RSF-505
- Goal: present agent work as distinct, reviewable execution lanes.
- Scope: task cards, dependency state, agent/session/worktree labels, activity timeline, and run controls.
- Acceptance: no action is presented as successful before runtime confirmation; users can inspect task scope and stop a run; responsive and keyboard-accessible layout.
- Verification: component tests and E2E tests plus screenshots in light/dark ROCKSOUL themes.
- Deliverable: Task Deck UI.

# M6 — Proof Gate

## RSF-601 — Define verification evidence contract

- Status: planned
- Depends on: RSF-003, RSF-401
- Goal: make checks and proof states explicit.
- Scope: check type, command, scope, timestamp, exit code, status, output reference, skip reason, and reviewer state.
- Acceptance: pass/fail/skipped/not-applicable/not-run are distinct; evidence is tied to repository revision and task run.
- Verification: evidence schema fixtures and serialization tests.
- Deliverable: evidence contract.

## RSF-602 — Build validation command policy

- Status: planned
- Depends on: RSF-601, RSF-102
- Goal: discover and safely select relevant project checks.
- Scope: use declared package scripts, repo guidance, affected-package mapping, and command allow/approval policy.
- Acceptance: unknown commands are not run silently; root test restrictions and package-specific commands are honored; skipped checks include a reason.
- Verification: script discovery fixtures, command approval tests, and no-shell-injection tests.
- Deliverable: validation planner.

## RSF-603 — Collect test, lint, typecheck, and build evidence

- Status: planned
- Depends on: RSF-602
- Goal: capture real execution results for one task.
- Scope: command execution via existing terminal/runtime, exit status, bounded output, timestamps, and artifact paths.
- Acceptance: output is sanitized and bounded; command failures remain visible; a missing command is not interpreted as pass.
- Verification: passing/failing/timeout/interrupted command fixtures.
- Deliverable: evidence collector.

## RSF-604 — Add changed-file scope and diff review

- Status: planned
- Depends on: RSF-501, RSF-601
- Goal: detect changes beyond the task's declared boundaries.
- Scope: Git diff, changed paths, generated file recognition, and scope exceptions.
- Acceptance: out-of-scope changes are flagged for review; generated files follow repository conventions; user changes are not overwritten.
- Verification: clean, expected, unexpected, and mixed dirty-diff fixtures.
- Deliverable: diff scope analyzer.

## RSF-605 — Implement Proof Gate transitions

- Status: planned
- Depends on: RSF-603, RSF-604, RSF-306
- Goal: compute verified readiness from criteria and evidence.
- Scope: required versus optional checks, human-reviewed visual criteria, waivers, failure remediation, and completion summaries.
- Acceptance: no required check means no verified status; waived checks include actor and reason; assistant self-report is not proof.
- Verification: full gate matrix tests.
- Deliverable: Proof Gate evaluation service.

## RSF-606 — Build Proof Gate review UI

- Status: planned
- Depends on: RSF-605
- Goal: make completion evidence inspectable.
- Scope: checks, output excerpts, screenshots, diff summary, failed criteria, skipped reasons, and reviewer decisions.
- Acceptance: user can navigate from evidence to task and changed files; pass/fail states are accessible and not color-only.
- Verification: component/E2E tests and accessibility checks.
- Deliverable: Proof Gate UI.

# M7 — Memory Ledger

## RSF-701 — Define learning record and provenance

- Status: planned
- Depends on: RSF-003
- Goal: classify durable discoveries before storing them.
- Scope: verified fact, decision, hypothesis, preference; source, date, repository/revision, destination, review state.
- Acceptance: secrets and sensitive personal information are excluded; every record has provenance; duplicates are detectable.
- Verification: schema and redaction tests.
- Deliverable: learning record contract.

## RSF-702 — Extract candidate learnings from sessions

- Status: planned
- Depends on: RSF-701
- Goal: propose non-obvious project learnings from completed work.
- Scope: debugging breakthroughs, file relationships, constraints, non-obvious build/test commands, and decisions.
- Acceptance: obvious documentation facts are excluded; confidence and source session are retained; candidates are review-only.
- Verification: curated session fixtures and precision review.
- Deliverable: learning candidate extractor.

## RSF-703 — Deduplicate and propose documentation updates

- Status: planned
- Depends on: RSF-702
- Goal: place learnings in the nearest correct documentation file.
- Scope: search existing AGENTS.md and docs, propose additions/edits, show diff, and request approval.
- Acceptance: no silent file writes; existing guidance is not duplicated; accepted changes preserve local document structure.
- Verification: duplicate and nested-scope fixtures plus approval flow tests.
- Deliverable: documentation update proposal.

## RSF-704 — Build Memory Ledger review UI

- Status: planned
- Depends on: RSF-703
- Goal: manage candidate and accepted learnings over time.
- Scope: review queue, provenance preview, accept/reject/edit, history, and destination file.
- Acceptance: rejected candidates are not resurfaced without new evidence; accepted records link to committed documentation.
- Verification: component tests and persistence lifecycle tests.
- Deliverable: Memory Ledger UI.

# M8 — Visual DNA Lab

## RSF-801 — Define a project visual profile contract

- Status: planned
- Depends on: RSF-003
- Goal: represent a project's design DNA without coupling it to ROCKSOUL's own theme.
- Scope: references, tokens, typography, composition rules, component contracts, motion, accessibility, and provenance.
- Acceptance: multiple project profiles can coexist; design reference assets are traceable; user-authored constraints are preserved.
- Verification: sample profiles including the ROCKSOUL desktop contract and a contrasting external project.
- Deliverable: visual profile specification.

## RSF-802 — Build reference and design contract registry

- Status: planned
- Depends on: RSF-801
- Goal: manage approved screenshots, assets, and design contracts.
- Scope: local references, captions, tags, source/usage rights, related screens, and token/contract links.
- Acceptance: no reference is saved or replaced without an explicit action; unsupported formats and missing provenance are flagged.
- Verification: import, rename, replace, delete, and provenance tests.
- Deliverable: visual reference registry.

## RSF-803 — Connect implementation tasks to visual criteria

- Status: planned
- Depends on: RSF-802, RSF-601
- Goal: include visual acceptance criteria in execution packets and Proof Gate.
- Scope: screen states, responsive breakpoints, typography, contrast, keyboard navigation, and reduced-motion checks.
- Acceptance: subjective criteria require human review; screenshot evidence records viewport and theme; visual changes are tied to their design contract.
- Verification: sample visual task fixtures and screenshot metadata tests.
- Deliverable: visual acceptance integration.

## RSF-804 — Build Visual DNA Lab UI

- Status: planned
- Depends on: RSF-803
- Goal: provide a distinct visual review workspace.
- Scope: reference board, design contract preview, token map, screen inventory, and before/after evidence.
- Acceptance: no generic dashboard-only presentation; keyboard access and reduced motion are supported; assets remain project-scoped.
- Verification: component tests and design review.
- Deliverable: Visual DNA Lab UI.

# M9 — Workspace Orbit

## RSF-901 — Define repository registration and identity

- Status: planned
- Depends on: RSF-004
- Goal: register several independent repositories safely.
- Scope: stable repository identity, local path, remote URL, selected revision, trust/permission scope, and display metadata.
- Acceptance: remote URL is not treated as proof of local checkout identity; each repository has independent configuration and Git state.
- Verification: same-remote multiple-checkout and renamed-directory fixtures.
- Deliverable: workspace registry contract.

## RSF-902 — Model explicit cross-repository dependencies

- Status: planned
- Depends on: RSF-901
- Goal: represent relationships that the developer explicitly declares.
- Scope: dependency type, source/target repo, revision references, owner, optional links, and validation status.
- Acceptance: declared and inferred relationships are distinct; stale revision references are flagged; cycles are visible.
- Verification: graph fixtures including cycles and missing repos.
- Deliverable: repository relationship model.

## RSF-903 — Build multi-repository overview

- Status: planned
- Depends on: RSF-902
- Goal: present repository health and relationships.
- Scope: repository cards/map, branch/revision state, audit freshness, active tasks, and dependency edges.
- Acceptance: each repo can be opened independently; no cross-repo action is implied by selecting a group.
- Verification: component tests and multi-checkout E2E flow.
- Deliverable: Workspace Orbit view.

## RSF-904 — Add explicit cross-repository planning

- Status: planned
- Depends on: RSF-903, RSF-304
- Goal: coordinate a goal that spans multiple repositories.
- Scope: parent plan, per-repository child tasks, revision pinning, dependency ordering, and separate approvals.
- Acceptance: every write task has one repository owner; each repository retains its own branch/worktree/permissions; commit/push/PR actions are approved per repository.
- Verification: two-repository fixture with dependency, failure, and partial-completion cases.
- Deliverable: cross-repository planning workflow.

---

## Global definition of done

A task can be marked verified only when all applicable items below are satisfied:

- [ ] Acceptance criteria are individually evaluated.
- [ ] Relevant focused tests pass.
- [ ] Lint and typecheck pass for the affected scope, or each skipped check has an explicit reason.
- [ ] Build or package validation is performed when relevant.
- [ ] Changed files are within declared task scope or have a reviewed exception.
- [ ] Documentation and plan status reflect actual behavior.
- [ ] Evidence points to the exact repository revision and execution attempt.
- [ ] No user changes, secrets, or unrelated files were overwritten or exposed.
- [ ] Any migration, API, dependency, permission, or release impact is documented.
- [ ] A human has reviewed subjective UX/visual criteria and consequential Git operations.

## Current implementation note

The existing codebase already has a Plan agent, session TODO tool, worktree support, plugins/MCP, image generation, terminal, code review, and session/subagent infrastructure. These are reuse points, not tasks to rebuild. M0 source audit, overlap analysis, data/evidence contracts, and the first integration ADR are verified. RSF-301 and RSF-401 are verified, including the execution packet golden fixture. RSF-302 has a pure read-only parser and eight focused test cases committed. RSF-101 has a repository scan-policy helper, contract, and six focused test cases. Both remain implemented rather than verified until Bun executes the tests and the integration behavior is reviewed. Next work should follow the parallel workstreams: Repo Radar scan contracts, requirement decomposition, and the remaining Plan Forge safe-read/write work.
