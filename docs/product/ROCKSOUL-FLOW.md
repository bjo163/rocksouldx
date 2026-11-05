# ROCKSOUL FLOW

**Product vision — from raw idea to verified delivery.**

Status: **Planned product direction.** ROCKSOUL FLOW is not yet a shipped end-to-end workflow. Individual foundation capabilities already exist in the inherited codebase; see the architecture and feature blueprint for the reuse boundaries.

## 1. Product thesis

ROCKSOUL DX should become an AI development workbench that helps a developer move a project from an unclear idea to a small, reviewable, verified change.

The system should not reward activity for its own sake. It should reduce repeated context-setting, prevent duplicate implementation, turn large goals into executable work, coordinate agents safely, and make completion evidence visible.

The central promise:

> Understand the project before changing it. Plan before multiplying work. Verify before declaring completion.

## 2. The problem to solve

AI coding sessions often begin with incomplete or stale context. The agent may read only the immediate files, miss an existing implementation elsewhere, ignore a project-specific contract, or create another subsystem that overlaps with an established one.

Large requests also tend to become broad prompts with unclear boundaries. One session may attempt documentation, architecture, implementation, tests, and visual changes together. The result is difficult to review and difficult to resume.

ROCKSOUL FLOW addresses this as one continuous workflow with explicit checkpoints.

## 3. End-to-end journey

### Understand

The developer opens a repository or workspace. Repo Radar collects an evidence-backed snapshot: repository structure, package boundaries, documentation, AGENTS.md guidance, scripts, Git state, and relevant tests.

### Audit

Overlap Detector compares the requested capability against source code, configuration, tests, and product documentation. Every finding carries evidence and a confidence level. Uncertain matches are presented for review rather than treated as facts.

### Plan

Plan Forge produces a versioned Markdown plan. It separates milestones from small tasks, models dependencies, defines file scope, and gives each task acceptance criteria and verification instructions.

### Prepare

Prompt Forge converts one approved task into an execution packet. The packet includes repository context, task boundaries, existing code to reuse, files to inspect, acceptance criteria, and required checks.

### Execute

Task Deck dispatches work through the existing agent/session runtime. Independent tasks may use separate worktrees. Dependencies, concurrency limits, cancellation, and retry behavior are visible and explicit.

### Verify

Proof Gate evaluates the task's acceptance criteria and gathers test output, lint/typecheck/build results, relevant diffs, screenshots where applicable, and unresolved caveats. A task cannot be marked verified merely because an agent says it is done.

### Deliver

The workflow summarizes the changes, updates task status and project documentation, and prepares a reviewable commit or pull request. Git operations that alter shared branches or publish externally remain behind explicit user authorization.

## 4. Product pillars

### Repo Radar

A repository intelligence view with a current snapshot, not a generic code summary. It should link each claim to paths, symbols, manifests, tests, or Git evidence. It must distinguish observed facts from inferred architecture.

### Overlap Detector

A capability comparison engine with six primary outcomes:

- Implemented — matching behavior exists and has evidence.
- Partial — some required behavior exists, but the acceptance criteria are incomplete.
- Missing — no relevant implementation was found within the inspected scope.
- Overlap — multiple modules or proposed tasks appear to own the same responsibility.
- Conflict — the request conflicts with a current contract or existing behavior.
- Deprecated — the capability remains in the repository but is marked for removal or replacement.

A match is not a conflict automatically. Findings require evidence and should explain false-positive risk.

### Plan Forge

A plan authoring and validation workspace. Markdown remains portable and versionable. A graph or board is a projection of the same plan data, never a second source of truth.

### Prompt Forge

A task-specific prompt compiler. It makes the task executable without broadening it. The prompt includes what to do, what not to touch, how to verify, and what evidence to return.

### Task Deck

A bounded execution coordinator. It maps tasks to existing sessions, agent roles, and worktrees. It does not create a parallel model/provider runtime.

### Proof Gate

A task completion gate driven by explicit acceptance criteria and machine-readable evidence. It distinguishes passed, failed, skipped, and not-applicable checks. Skipped checks cannot silently count as passed.

### Memory Ledger

A reviewed learning system for non-obvious discoveries, design decisions, repository constraints, and debugging outcomes. Each record carries its source session, repository, timestamp, and review status. It proposes edits to AGENTS.md or docs instead of silently rewriting project guidance.

### Visual DNA Lab

A repository-level visual design workspace. It stores references, design contracts, tokens, component rules, motion/accessibility constraints, and before/after evidence. It should use existing image, artifact, plugin, and UI capabilities where suitable.

### Workspace Orbit

A workspace registry for several repositories. Cross-repository dependencies are explicit edges with ownership and revision references. It must not infer that two repositories share a release or deployment pipeline merely because they are grouped together.

## 5. Product principles

1. **Evidence before assertion.** Findings and completion claims link back to source or execution evidence.
2. **Audit before implementation.** Search existing source, tests, docs, and configuration before creating a new abstraction.
3. **One canonical plan.** Markdown is the durable source of truth; board and graph views are projections.
4. **Small tasks by default.** A task should have one cohesive outcome, a bounded scope, and an independently verifiable result.
5. **Reuse before duplication.** Prefer existing OpenCode sessions, agents, tools, plugins, MCP, permissions, worktrees, and review surfaces.
6. **Human authority at consequential boundaries.** Require approval for destructive operations, shared-branch writes, dependency changes with broad impact, external publishing, and final merge.
7. **Safe parallelism.** Parallelize only independent work with isolated ownership and explicit dependencies.
8. **Honest status.** A task is not complete or verified without its required evidence.
9. **Portable project memory.** Project plans and decisions should remain readable without the ROCKSOUL DX UI.
10. **Upstream-aware maintenance.** Keep the fork understandable and rebaseable; product-specific changes should be isolated and documented.

## 6. Non-goals

ROCKSOUL FLOW is not intended to:

- Replace the underlying language model/provider abstraction.
- Rebuild the existing terminal, file editor, session engine, permission framework, plugin loader, or MCP runtime.
- Become a generic project-management SaaS disconnected from source code.
- Autonomously merge, release, deploy, delete, or publish without explicit authorization.
- Treat an LLM-generated architecture summary as verified truth.
- Force every repository to adopt one framework, package layout, or design system.
- Store critical project state only in a proprietary database when it can remain portable in versioned files.

## 7. Success signals

The first release should be evaluated by observable outcomes, not vanity metrics:

- A new repository can be summarized with links to evidence and clear uncertainty.
- A requested feature is compared with existing implementation before a plan is generated.
- The generated plan contains small tasks with dependencies and executable acceptance criteria.
- A local agent can execute one task from its packet without needing the entire conversation history.
- Verification evidence is retained and connected to the task.
- An interrupted workflow can resume from the plan and recorded execution state.
- No duplicate session engine, TODO subsystem, provider runtime, or worktree manager is introduced without a documented gap.

## 8. Delivery strategy

Build in this order:

1. Establish repository intelligence and source evidence.
2. Add overlap analysis and capability classification.
3. Make Markdown plans structured and dependency-aware.
4. Compile plans into precise local-agent execution packets.
5. Coordinate sessions and worktrees.
6. Add proof-based completion gates.
7. Add durable learning, design DNA, and multi-repository orchestration.

The detailed work breakdown lives in [ROCKSOUL-FLOW.plan.md](../plans/ROCKSOUL-FLOW.plan.md). Technical constraints and reuse points live in [the architecture document](../architecture/ROCKSOUL-FLOW-ARCHITECTURE.md).
