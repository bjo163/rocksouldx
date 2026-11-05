# ROCKSOUL FLOW — Feature Overlap Matrix

Status: **SOURCE-REVIEWED**
Audit baseline: `526280d65cc7ed2917b2d48484068f42619d984f`
Companion: [Capability inventory](../audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md)

This matrix decides where each proposed FLOW responsibility belongs. "Build" means a real ROCKSOUL-specific gap was found; it does not authorize duplicating an existing runtime primitive.

## Decision vocabulary

- **REUSE** — existing source already owns the capability; FLOW should call or link to it.
- **EXTEND** — attach minimal FLOW metadata or lifecycle around an existing capability.
- **BUILD** — no equivalent capability was found; implement the narrowly scoped product responsibility.
- **DEFER** — evidence or a boundary decision is missing; do not implement yet.
- **REJECT** — a duplicate or unsafe product direction; do not implement.

## 1. Pillar decisions

| FLOW pillar | Existing overlap | Decision | ROCKSOUL-specific responsibility | Explicit non-goal |
| --- | --- | --- | --- | --- |
| Repo Radar | Project identity, Git, filesystem/search, manifests and repo file tools. | REUSE + BUILD | Compose a revision-bound snapshot, stack/docs/package inventory, source links, and incomplete-scan warnings. | Do not build a second Git client, filesystem abstraction, or generic file browser. |
| Overlap Detector | Search, code navigation, tests, docs, and Repo Radar evidence. | REUSE + BUILD | Decompose requirements; classify implemented/partial/missing/overlap/conflict/deprecated with evidence, confidence, and review state. | Do not infer implementation from filenames, semantic scores, or docs alone. |
| Plan Forge | Read-only Plan agent and session TODO. | REUSE + BUILD | Manage a repository-local Markdown plan, validate task syntax/dependencies, project it as a graph, and maintain evidence-backed state. | Do not change Plan mode permissions; do not turn session TODO into a durable project database. |
| Prompt Forge | Prompt templates, agents, sessions, skills, tools, and context assembly already exist. | REUSE + BUILD | Compile one approved task into a deterministic, portable execution packet with scope, references, checks, and stop rules. | Do not create a new agent runtime or silently dispatch from prompt preview. |
| Task Deck | Session runtime, subagents, Worktree service, terminal, Git state, and plugin APIs. | REUSE + EXTEND + BUILD | Map task → session/run/attempt/worktree; enforce dependency and writer-isolation policy; show run status and safe controls. | Do not clone sessions, model execution, TODOs, Git worktrees, terminal, or agent cancellation. |
| Proof Gate | Existing package commands, terminal/process execution, Git diff, tests, and CI. | REUSE + BUILD | Persist bounded verification evidence and compute verified readiness from criteria and real results. | Do not equate "command exists", "agent says passed", or "not run" with pass. |
| Memory Ledger | Existing conversation/session history, filesystem search, project docs, and user-managed memory outside this app. | REUSE + BUILD | Extract review-only project learnings with provenance and propose deduplicated documentation diffs. | Do not create hidden autonomous memory or silently edit AGENTS/docs. |
| Visual DNA Lab | Theme registry, custom themes, image generation, GUI plugins, screenshots/story tooling. | REUSE + BUILD | Register project-scoped references/design contracts and connect visual criteria to task evidence. | Do not introduce another image-generation engine or impose ROCKSOUL's theme on every project. |
| Workspace Orbit | Project service and Git identity already support multiple local projects/checkouts. | REUSE + EXTEND + BUILD | Model declared cross-repo edges, revisions, trust/permission boundaries, and coordinated plan references. | Do not duplicate local project registration or merge Git histories automatically. |

## 2. Cross-cutting overlap decisions

| Concern | Current owner | FLOW behavior |
| --- | --- | --- |
| Model/provider execution | Existing Core/provider/runtime packages | Reuse through existing Agent/Session APIs. |
| Agent permissions and approvals | Existing permission/session runtime | Preserve; FLOW may add preflight policy but cannot bypass permission checks. |
| Chat/session history | Existing Session service | Keep authoritative; save only references from ExecutionRun. |
| Session TODO | Existing `todowrite` tool and UI projection | Keep transient; never use as PlanTask storage. |
| Plan mode | Existing Plan plugin | Keep read-only semantics and its own `.opencode/plan` path. |
| Git status/diff/history | Existing Git service | Reuse as source evidence; bind results to a revision/worktree. |
| Worktree lifecycle | Existing Worktree service + Protocol/Server handlers | Reuse; add task ownership and cleanup review without replacing lifecycle. |
| File search and access | Existing filesystem, ripgrep, grep/glob/read tools | Reuse and respect permissions/project roots. |
| Terminal execution | Existing process/terminal/runtime | Reuse; command allow/approval and evidence recording are FLOW concerns. |
| Plugin/MCP | Existing plugin and MCP infrastructure | Reuse integrations; do not create a parallel extension bus. |
| Theme and images | Existing UI theme + image generation | Reuse; registry/provenance/review are FLOW concerns. |
| App shell/navigation | Existing App router and Shell | Extend the current shell only after selecting a valid global surface. |

## 3. Build boundaries by data ownership

| Data | Canonical owner | Derived/reference-only data |
| --- | --- | --- |
| Project identity and local directory | Existing Project service | Repo Radar snapshot references Project ID + Git revision. |
| Source files and current Git state | Project checkout / Git | Snapshot may index paths and sanitized evidence, never replace source. |
| Project plan and task intent | Versioned Markdown in the repository | Parsed plan index, graph layout, and task search cache are rebuildable. |
| Conversation and agent activity | Existing Session runtime | FLOW stores session ID, run ID, attempt, and task ID references. |
| Verification output | Proof Gate evidence record with bounded artifact reference | Summary statuses are derived from required EvidenceRecords. |
| Accepted project learning | Reviewed repository documentation | Candidate learning queue is disposable until accepted. |
| Visual DNA | Project-local design contract and approved reference assets | UI previews and comparison metadata are derived. |
| Cross-repository relationship | Explicit Workspace Orbit configuration | Inferred edges are advisory and never silently become declared dependencies. |

## 4. Implementation gates

1. No package, API, database migration, or global app route before a source-backed ADR names the gap and owner.
2. No project plan writer before parser, validator, path policy, optimistic concurrency, and diff preview exist.
3. No multi-agent parallel write before one-writer-per-worktree isolation is enforced.
4. No task becomes `verified` without all required checks passing and any required human review being recorded.
5. No generated prompt or imported agent report is trusted as authority to bypass task scope, permissions, or evidence rules.
6. No visual reference is stored or replaced without a deliberate user action and provenance metadata.
7. No Workspace Orbit operation may silently cross project/repository permissions or write boundaries.

## 5. Dependency correction findings

The initial plan serializes several independent design tasks behind UI tasks. Those dependencies are not architectural requirements and would prevent useful parallel agent work.

The following are corrected in the plan:
- Requirement decomposition can proceed after the shared data contracts; it does not need the Repo Radar screen.
- The portable Markdown format and parser can proceed after data contracts; they do not need the Audit Bench UI.
- Plan duplicate analysis depends on validated task parsing and capability findings, not on building the full Audit Bench screen.
- Memory and visual-profile contracts can proceed after the common contracts, while their UI/integration work waits for the evidence interfaces.
- Worktree isolation design may proceed once task mapping is defined; it need not wait for single-task dispatch code.

The detailed parallel lanes and writer-ownership rules are in [parallel workstreams](../plans/ROCKSOUL-FLOW-PARALLEL-WORKSTREAMS.md).
