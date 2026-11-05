# Execution Packet — RSF-401

> Illustrative golden fixture. Angle-bracket values are compiler-supplied fields, not executable placeholders.

## Envelope

- Packet format: 1
- Compiler version: <compiler-version>
- Generated at: <UTC timestamp>
- Task ID: RSF-401
- Task: Define execution packet contract
- Task status: ready
- Plan path: docs/plans/ROCKSOUL-FLOW.plan.md
- Plan content hash: <sha256 of exact plan content>
- Repository: bjo163/rocksouldx
- Project ID: <existing project id>
- Branch: <selected branch>
- Starting revision: <full Git commit SHA>
- Worktree: <absolute local worktree path>
- Snapshot ID: <revision-bound RepoSnapshot ID>

## Goal

Define a reproducible and reviewable instruction packet for one microtask that a local coding agent can execute without relying on the full conversation.

## Scope

- Specify required task, repository, revision, worktree, source, permission, verification, and report context.
- Define deterministic compilation inputs and stale-context handling.
- Define stop conditions and the final report structure.

## Non-goals

- Do not implement an agent runtime or dispatch the task.
- Do not persist credentials, hidden prompts, or private model reasoning.
- Do not grant new filesystem, shell, network, Git, or deployment permissions.
- Do not alter session history or session TODO ownership.

## Source references

- docs/plans/ROCKSOUL-FLOW-EXECUTION-PACKET.md
- docs/architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md
- docs/plans/ROCKSOUL-FLOW-PLAN-FORMAT.md

Each reference is resolved against the packet's pinned revision at compile time.

## Writable scope

- docs/plans/ROCKSOUL-FLOW-EXECUTION-PACKET.md
- docs/plans/ROCKSOUL-FLOW-PLAN-FORMAT.md
- docs/plans/ROCKSOUL-FLOW.plan.md

This is a specification-only fixture. A real implementation packet must replace this list with the exact task's approved writable paths.

## Verification

- Confirm the required packet envelope fields are present.
- Confirm deterministic inputs and stale-context behavior are described.
- Confirm command, Git, secrets, and scope boundaries are explicit.
- Confirm an execution report cannot mark a task verified without independent evidence.

## Stop conditions

Stop when repository identity, revision, plan hash, task readiness, permissions, or writable paths do not match the packet. Stop before making any change that requires a new package, public API, database migration, or permission boundary.

## Expected final report

- Summary of changes.
- Exact changed paths and diff.
- Acceptance criteria and supporting evidence.
- Commands, working directories, exit codes, and evidence references.
- Scope exceptions and approval references.
- Caveats and remaining work.
- Commit SHA only when a commit was explicitly authorized.
