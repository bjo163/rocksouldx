# ROCKSOUL FLOW — Data and Evidence Contracts

Status: **CONTRACT BASELINE — implementation-neutral**
Companion: [Overlap matrix](ROCKSOUL-FLOW-OVERLAP-MATRIX.md) · [Capability inventory](../audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md)

These contracts define ownership and minimum information. They are not yet database schemas, Protocol types, or public APIs. Implementations must map them to existing package conventions after the relevant task is ready.

## 1. Shared identity and provenance

Every durable FLOW record must be traceable to the project and repository revision from which it was derived.

| Field | Requirement |
| --- | --- |
| `id` | Stable, opaque ID; do not derive it from mutable titles or file paths. |
| `projectId` | Existing Project ID when the record belongs to a registered local project. |
| `repository` | Repository identity: normalized remote identity when available, plus local checkout identity. A remote URL alone does not identify a checkout. |
| `revision` | Git commit SHA when available; represent unborn HEAD and dirty/uncommitted state explicitly rather than fabricating a revision. |
| `createdAt`, `updatedAt` | UTC timestamps. Preserve source timestamps when importing external evidence. |
| `sourceRefs` | Relative file path plus optional line/symbol; never treat a citation or generated summary as the underlying source. |
| `provenance` | Origin type, actor/tool/session, repository revision, and capture time where applicable. |
| `schemaVersion` | Version the serialized contract before durable persistence is introduced. |

Do not store credentials, environment dumps, access tokens, private keys, raw secrets, or personal information in FLOW records. Redact before persistence and before prompt export.

## 2. Repository snapshot

A `RepoSnapshot` is an immutable observation of one checkout at one point in time.

Required fields:
- snapshot ID and Project/repository identity;
- base revision, branch name, dirty-state summary, scan time;
- scan policy/version and root-relative ignore policy;
- manifest/toolchain observations with their source paths;
- workspace/package inventory;
- documentation/guidance inventory;
- module/entry-point inventory and declared dependency edges;
- warnings, inaccessible paths, excluded path counts, and completion state.

Completion states:
- `complete` — every required scan phase completed.
- `partial` — some phases or paths could not be inspected.
- `failed` — the scan could not produce a usable inventory.
- `stale` — the selected revision no longer matches the current checkout.

A snapshot must never imply full repository coverage when ignored, generated, binary, symlinked, inaccessible, or unsupported paths were omitted. A derived index is disposable and must be rebuildable from source plus the recorded policy.

## 3. Capability finding

A `CapabilityFinding` links one requirement to inspectable implementation evidence.

Minimum fields:
- finding ID and requirement ID;
- classification: `implemented`, `partial`, `missing`, `overlap`, `conflict`, or `deprecated`;
- rationale and confidence band (`low`, `medium`, `high`), not a false-precision score;
- evidence references (source, tests, docs, configuration, or current plan tasks);
- snapshot/revision ID;
- reviewer state: `unreviewed`, `accepted`, `rejected`, or `uncertain`;
- last evaluated time and classifier/rubric version.

Rules:
- Source and passing tests are stronger evidence than documentation claims.
- A matching filename or search score is a lead, not proof.
- `partial` must remain partial until each acceptance criterion is supported.
- `missing` means "not found within the declared scan scope", not "does not exist anywhere".
- The classifier must preserve counter-evidence and uncertainty.

## 4. Portable Markdown plan

The repository Markdown file is the canonical source for project intent. The UI, parsed task graph, and search index are projections.

Each task must have:
- stable task ID and title;
- status and explicit dependency list (`none` when empty);
- one-sentence goal;
- bounded scope and non-goals;
- acceptance criteria;
- verification commands/criteria;
- expected deliverables;
- optional source/evidence references, estimate/priority, and execution references.

The first parser may support a documented Markdown subset, but it must:
- preserve the original source text and unknown metadata;
- report source line locations for errors;
- detect duplicate IDs, missing dependencies, invalid statuses, missing required sections, and dependency cycles;
- avoid normalizing or rewriting a file during read/validation;
- reject writes that escape the configured project plan root;
- require an optimistic concurrency check and diff review before a writer is enabled.

### Task status semantics

| Status | Meaning | Dispatch allowed? |
| --- | --- | --- |
| `draft` | Incomplete or unreviewed authoring state. | No |
| `planned` | Intent is captured in the backlog, but readiness/approval or dependencies remain. | No |
| `ready` | Scope, dependencies, acceptance, verification, and required approval are satisfied. | Yes, after explicit dispatch |
| `in_progress` | A run is active for the task. | No second writer unless separately isolated and authorized |
| `blocked` | A dependency, decision, permission, or external condition prevents progress. | No |
| `implemented` | A change exists, but required proof is incomplete or failing. | No |
| `verified` | Every required automated check passed and required human review is recorded. | Complete |
| `cancelled` | Intentionally stopped with a recorded reason. | No |

A failed check does not erase the implementation. The task returns to remediation with the previous attempt and failure evidence retained. A user-approved waiver must record who approved it, when, and why; a waiver is not a test pass.

## 5. Execution packet

An `ExecutionPacket` is a reproducible instruction bundle for exactly one task.

Required fields:
- packet ID, plan/task ID, plan content hash, snapshot/revision ID, and generated time;
- intended agent role/model selection hint, without embedding credentials;
- task goal, scope, non-goals, acceptance, verification, and deliverables;
- minimal relevant source/document references and their revision identity;
- repository instructions and package-specific guidance that apply to the task;
- permission, branch, worktree, and destructive-action boundaries;
- unresolved questions and explicit stop/escalation conditions;
- expected final report structure.

Packet compilation must be deterministic for the same task + plan revision + repository snapshot + compiler version. If context is missing or stale, the packet states that fact instead of inventing it. Preview/copy/export must use the same canonical packet payload.

## 6. Execution run

An `ExecutionRun` links a task to the existing agent/session runtime. It does not duplicate session messages or runtime state.

Required references:
- run ID, task ID, packet ID, plan hash, repository revision;
- existing Project ID and Session ID;
- attempt number, agent identity, branch, worktree path, and start/end times;
- lifecycle state: `queued`, `running`, `waiting`, `blocked`, `failed`, `cancelled`, or `finished`;
- changed paths and commit SHA only when observed from Git.

Each retry creates a new attempt linked to its predecessor. A stale event cannot move a terminal run backward. One writable checkout has one active writer by default; parallel runs require distinct worktrees or another explicitly reviewed isolation mechanism.

## 7. Verification evidence

An `EvidenceRecord` captures an actual check result.

Required fields:
- evidence ID, task/run ID, repository revision, check type, command, working directory relative to the project root;
- started/finished timestamps and elapsed duration;
- status: `pass`, `fail`, `skipped`, `not_applicable`, or `not_run`;
- exit code when a process ran; timeout/interruption information where relevant;
- bounded, sanitized output artifact reference or concise excerpt;
- skip/not-applicable reason and human reviewer state when needed.

Rules:
- Missing command is `not_run`, never pass.
- A skipped check requires a reason.
- Secret-bearing output must be redacted before saving.
- Evidence is tied to a revision/run; later repository changes do not retroactively validate it.
- Required checks are declared by task and validation policy. Optional checks cannot silently substitute for required checks.
- Visual evidence records viewport, theme, screen/state, and capture revision; subjective criteria require a human decision.

## 8. Learning record

A `LearningRecord` is a proposed project-documentation improvement, not hidden assistant memory.

Required fields:
- learning ID and category: `verified_fact`, `decision`, `hypothesis`, or `preference`;
- concise statement and confidence;
- evidence/source session/repository revision;
- proposed destination file and exact proposed diff;
- review state: `candidate`, `accepted`, `rejected`, or `superseded`;
- reviewer, review time, and rejection/acceptance reason.

Only accepted, non-sensitive, deduplicated learnings may be written to project docs. Rejection must be retained sufficiently to avoid resurfacing the same unchanged candidate.

## 9. Visual profile

A `DesignProfile` is scoped to a project/repository and is independent of ROCKSOUL's own theme.

It may contain:
- approved reference IDs with source/provenance and usage rights;
- semantic color and typography tokens;
- layout/composition and component contracts;
- interaction/motion rules and reduced-motion fallback;
- contrast, keyboard, responsive, and accessibility constraints;
- screen/state inventory, associated tasks, and review evidence.

A screenshot or generated image is not automatically an approved reference. Import, replacement, deletion, and cross-project reuse require deliberate user action.

## 10. Repository relationship

A `RepositoryEdge` connects two explicitly registered repositories.

Required fields:
- source/target repository identity and selected revision refs;
- relationship type and direction;
- provenance: `declared` or `inferred`;
- owner/reviewer and validation state;
- optional issue/plan/task links.

Declared and inferred relationships must render differently. An inferred relationship never authorizes cross-repository changes. Each repository keeps independent branches, credentials, permissions, worktrees, commits, and release decisions.

## 11. Contract invariants

1. Markdown owns project plan intent; sessions own execution conversation.
2. Existing Project owns local checkout identity; Workspace Orbit adds explicit relationships, not a replacement registry.
3. Existing Agent/Session/Worktree/Git/Terminal owns execution primitives; FLOW owns task mapping, orchestration policy, and evidence.
4. An assistant report is untrusted input until evidence is independently inspected.
5. A task cannot become `verified` without required proof.
6. Unknown user-authored plan metadata survives parsing and future writes.
7. Any durable record is revision-bound, provenance-bearing, secret-safe, and inspectable.
