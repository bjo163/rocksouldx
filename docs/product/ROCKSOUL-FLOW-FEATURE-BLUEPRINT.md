# ROCKSOUL FLOW — Feature Blueprint

Status: **Proposed / planned.** This blueprint describes the target product behavior. It is not a claim that these screens or modules already exist.

## 1. Experience map

ROCKSOUL FLOW is organized around a project lifecycle, not around a collection of unrelated dashboards.

| Workspace | Primary question | Output |
| --- | --- | --- |
| Project Radar | What is this repository and what state is it in? | Evidence-backed project snapshot |
| Audit Bench | Does this request already exist or conflict with anything? | Capability and overlap report |
| Plan Forge | What is the smallest safe path to the goal? | Versioned Markdown plan |
| Prompt Forge | What should one agent do, exactly? | Execution packet |
| Task Deck | Who is doing what, and in which isolated workspace? | Execution runs and task status |
| Proof Gate | What demonstrates that the work is correct? | Verification evidence |
| Memory Ledger | What should future sessions remember? | Reviewed learning records |
| Visual DNA Lab | What visual contract should implementation follow? | Design DNA and visual evidence |
| Workspace Orbit | How do projects relate to one another? | Repository graph and cross-project plan |

The navigation and layout should reflect these distinct jobs. Do not render every workspace as the same generic table dashboard.

## 2. Core workflow

~~~text
Developer request
      |
      v
Repository selection and snapshot
      |
      v
Audit current code, docs, tests, config, and Git state
      |
      v
Capability classification and overlap review
      |
      v
Generate / refine a Markdown plan
      |
      v
Approve one bounded task
      |
      v
Compile task execution packet
      |
      v
Dispatch to an existing agent session / worktree
      |
      v
Collect implementation diff and verification evidence
      |
      v
Proof Gate: pass / fail / blocked / needs review
      |
      v
Update plan, docs, commit summary, and PR draft
~~~

The user can stop, edit the plan, run tasks manually, or return to any earlier stage. Automation must not make irreversible transitions silently.

## 3. Feature contracts

### 3.1 Repo Radar

**Inputs:** repository root, Git metadata, manifests, source tree, docs, configuration, test files, and available development scripts.

**Outputs:** project identity, stack inventory, package/module map, key entry points, test/build commands, Git status, documentation inventory, and source references.

**Required behavior:**
- Read the repository before producing a snapshot.
- Respect ignore files and avoid indexing generated, vendored, binary, or secret files by default.
- Record scan time and the commit/tree revision used.
- Identify missing or inaccessible evidence.
- Separate direct observations from AI inferences.
- Refresh incrementally where safe, with a full-rescan option.

**Acceptance boundary:** every non-trivial repository claim links to at least one file, symbol, manifest, test, or Git reference. An incomplete scan is labeled incomplete.

### 3.2 Overlap Detector

**Inputs:** a feature request or product requirement, Repo Radar snapshot, relevant source/docs/tests/config, and optional existing plan.

**Outputs:** requirement-to-evidence matrix, capability status, likely owners, conflicts, duplicate task candidates, and unresolved questions.

**Required behavior:**
- Search semantically and structurally; do not rely on filenames alone.
- Inspect source behavior and tests before classifying implementation as complete.
- Return evidence paths and a concise explanation for each classification.
- Assign confidence and mark uncertain results for human review.
- Compare proposed tasks against existing plan tasks before adding new ones.

**Acceptance boundary:** no automatic code deletion, migration, or task suppression based only on an AI similarity score.

### 3.3 Plan Forge

**Inputs:** reviewed requirements, overlap report, project conventions, existing plan files, and user constraints.

**Outputs:** a Markdown plan with milestones, tasks, dependencies, status, scope, acceptance criteria, verification, and expected deliverables.

**Required behavior:**
- Preserve existing completed work and IDs when updating an established plan.
- Detect duplicate IDs, missing dependencies, dependency cycles, and orphan tasks.
- Support a task-level view without making the board the source of truth.
- Produce small tasks that can be executed by one coding agent.
- Keep proposed work separate from implemented or verified work.

**Acceptance boundary:** a plan is not executable until each ready task has an unambiguous outcome, bounded scope, and verification instructions.

### 3.4 Prompt Forge

**Inputs:** one approved task, repository snapshot, architecture constraints, coding conventions, and validation commands.

**Outputs:** a complete agent execution packet in Markdown or copyable text.

**Required packet fields:**
- Repository and target branch context.
- Task ID, goal, and non-goals.
- Evidence and relevant files to inspect.
- Existing modules or abstractions to reuse.
- Allowed change scope and protected boundaries.
- Implementation requirements.
- Acceptance criteria and test commands.
- Expected final report: changed files, checks, evidence, caveats, commit SHA if applicable.

**Acceptance boundary:** the generated packet must not instruct an agent to edit files outside its task scope or to mark work complete without evidence.

### 3.5 Task Deck

**Inputs:** ready tasks, dependency graph, selected agent/runtime, concurrency limit, and worktree policy.

**Outputs:** execution runs mapped to existing sessions and optional isolated worktrees.

**Required behavior:**
- Dispatch only tasks whose dependencies are satisfied.
- Reuse the existing agent/session system.
- Use worktrees for concurrent tasks that could conflict.
- Prevent two runs from silently writing to the same checkout at once.
- Expose queued, running, waiting, blocked, failed, cancelled, and finished states.
- Support cancellation and safe retry with retained run history.
- Never merge or publish automatically.

**Acceptance boundary:** agent execution is bounded by the permission system and explicit user authorization for consequential Git operations.

### 3.6 Proof Gate

**Inputs:** task acceptance criteria, execution run, diff, test output, check results, screenshots where relevant, and reviewer decisions.

**Outputs:** verification record and task gate status.

**Required behavior:**
- Distinguish pass, fail, skipped, not applicable, and not run.
- Associate every check with its command, scope, timestamp, exit result, and output location.
- Require explicit reasons for skipped or not-applicable checks.
- Detect changed files outside declared scope and flag them for review.
- Require human review for subjective UI/visual criteria where automation cannot establish correctness.

**Acceptance boundary:** skipped or missing evidence must never be displayed as a passing check.

### 3.7 Memory Ledger

**Inputs:** session learning, debugging findings, architecture decisions, task evidence, and explicit user corrections.

**Outputs:** proposed learning records with provenance and suggested documentation destinations.

**Required behavior:**
- Deduplicate against existing AGENTS.md and docs.
- Separate verified fact, decision, hypothesis, and preference.
- Track source repository, path, commit/session, date, and review status.
- Ask for review before changing durable project guidance.
- Allow accepted learnings to update the closest applicable AGENTS.md or canonical document.

**Acceptance boundary:** no silent persistent memory edits and no storing secrets or private credentials.

### 3.8 Visual DNA Lab

**Inputs:** approved visual references, design contracts, tokens, component inventory, motion rules, and accessibility constraints.

**Outputs:** project-specific visual profile, implementation brief, and comparison evidence.

**Required behavior:**
- Keep each repository's design DNA isolated.
- Record provenance for references and generated assets.
- Connect components and screens to their governing design contract.
- Support screenshot capture and visual comparison where the existing test stack permits it.
- Enforce readable code, contrast, keyboard access, and reduced-motion behavior.

**Acceptance boundary:** a visual reference is guidance, not permission to copy protected branding or assets.

### 3.9 Workspace Orbit

**Inputs:** explicitly registered repositories, their revision references, and declared dependencies.

**Outputs:** repository map, cross-project dependency edges, and optional coordinated plan.

**Required behavior:**
- Make repository boundaries visible.
- Pin each cross-repository finding to a specific revision.
- Distinguish a declared dependency from an inferred relationship.
- Keep per-repository permissions, branches, and worktrees separate.
- Make cross-repo tasks explicit and reviewable.

**Acceptance boundary:** no multi-repository write, commit, push, release, or deployment without explicit scope and authorization per repository.

## 4. Conceptual data entities

These are product concepts, not committed schema definitions. Implementation must map them to the existing persistence, protocol, and session patterns only after a source-level architecture review.

| Entity | Key information | Durable owner |
| --- | --- | --- |
| ProjectSnapshot | repository identity, revision, scan time, inventory, evidence references | Repository snapshot store or reproducible scan |
| CapabilityFinding | requirement, classification, evidence, confidence, reviewer state | Audit report |
| Plan | plan ID, repository, revision context, milestones, tasks | Versioned Markdown |
| PlanTask | task ID, goal, dependencies, scope, acceptance, verification, status | Versioned Markdown |
| ExecutionPacket | task ID, prompt, context refs, boundaries, checks | Generated artifact, reproducible from task |
| ExecutionRun | task ID, session ID, worktree, state, timestamps, agent | Existing session/runtime plus workflow metadata |
| EvidenceRecord | check type, command, result, output ref, timestamp | Verification artifact |
| LearningRecord | learning, classification, provenance, destination, review state | Proposed doc update / reviewed project doc |
| DesignProfile | project ID, reference refs, tokens, rules, screen map | Project design docs and approved assets |
| RepositoryEdge | source repo, target repo, relationship, revision refs | Workspace configuration |

Do not persist duplicated values that can be derived reliably from the canonical source. A session remains the owner of conversational execution history; a Markdown plan remains the owner of planned work.

## 5. Status model

### Task status

- draft — being authored; not executable.
- ready — scope, dependencies, acceptance, and verification are complete.
- in_progress — an execution run is active.
- blocked — a dependency, approval, or external condition prevents progress.
- implemented — an implementation diff exists, but required verification is incomplete.
- verified — required checks passed and evidence is attached.
- cancelled — intentionally stopped with a reason.

A failed check is recorded as a verification result; it does not erase the implementation. The task may return to ready or in_progress for remediation.

### Finding status

Use the six capability classifications from the product vision. Keep reviewer confirmation separate from classification and confidence.

## 6. User authority and safety boundaries

The user must be able to approve or reject:
- Plan creation or material changes to an approved plan.
- Agent dispatch and parallel execution policy.
- Worktree creation/removal if it may discard user changes.
- File deletion, destructive shell commands, and data migrations.
- Dependency changes with repository-wide impact.
- Commits, pushes, branch updates, PR creation, merge, release, and deployment.
- Persistent documentation or memory updates.

The product must show the exact repository, branch, worktree, task, and intended operation before a consequential action.

## 7. MVP acceptance criteria

The first end-to-end release is not the whole vision. It is complete only when:

1. A developer can register/open one repository and get a revision-aware snapshot with evidence.
2. A requirement can be audited against existing code and documentation with reviewable classifications.
3. A plan can be generated and validated as portable Markdown.
4. One approved task can be compiled into a self-contained execution packet.
5. A developer can copy that packet to a local agent and associate the resulting session/diff with the task.
6. Required verification results can be recorded and the plan can distinguish implemented from verified.
7. The workflow can resume from the plan after the UI or application closes.
8. No existing OpenCode core capability has been duplicated to achieve the workflow.

Multi-agent automation, automatic learning, rich visual QA, and cross-repository orchestration are subsequent capabilities, not prerequisites for the first useful release.
