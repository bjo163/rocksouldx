# ROCKSOUL FLOW — Workspace Orbit Contract

Status: **CONTRACT v1**
Task: RSF-901
Related: [Data and evidence contracts](ROCKSOUL-FLOW-DATA-CONTRACTS.md) · [Overlap matrix](ROCKSOUL-FLOW-OVERLAP-MATRIX.md)

Workspace Orbit coordinates context across explicitly registered repositories. It extends the existing Project registry with relationship metadata. It does not replace local Project discovery, Git, worktrees, credentials, permissions, or release ownership.

## 1. Repository identity

Each repository node references:
- the existing Project ID when the local checkout is registered;
- local checkout identity and canonical root from Project resolution;
- normalized remote identity when available;
- selected branch and observed revision for the current task;
- current dirty-state summary;
- default instruction/docs/plan references when discovered;
- repository owner and access/permission boundary.

A remote URL does not identify a local checkout by itself. Multiple local checkouts can share a remote but have distinct branches, dirty state, credentials, and worktrees. Never combine their state into one mutable workspace record.

Unregistered repositories are not silently created by a graph scan. Registration uses the existing Project flow or an explicit user-approved registration operation.

## 2. Relationship edge

A repository edge connects two explicit repository nodes.

Required fields:
- edge ID;
- source and target repository node IDs;
- directed relationship type;
- provenance: `declared` or `inferred`;
- origin/source reference and captured revision;
- review state: `candidate`, `accepted`, `rejected`, or `stale`;
- optional task/issue/plan references;
- creation/update timestamps.

Supported relationship types:
- `depends-on` — one repository requires another for a build/runtime contract;
- `shared-contract` — repositories exchange a declared API/schema/protocol;
- `client-of` — one repository consumes another's published interface;
- `deployment-pair` — separate repositories participate in one deployment topology;
- `shared-library` — one repository publishes a package consumed by another;
- `documentation-for` — one repository documents another;
- `related` — contextual relation without a build or execution dependency.

## 3. Declared vs inferred graph

- A **declared** edge is created or explicitly accepted by a user/repository owner.
- An **inferred** edge is a suggestion derived from import paths, package names, URLs, docs, issue references, or configuration.
- Inferred edges are rendered as candidates and never become authorization to read private data, execute commands, modify another repository, or sequence releases.
- An inferred relationship may be rejected or accepted. Acceptance records reviewer, time, and evidence.
- Conflicting evidence keeps the edge uncertain; it must not silently reverse direction or overwrite an accepted declaration.

## 4. Graph integrity

- Repository nodes must be unique by local Project ID/checkout identity.
- An edge cannot reference a missing node.
- Self-edges are invalid except for an explicitly typed external alias relation, which v1 does not support.
- Duplicate edges with identical source, target, and type are deduplicated or surfaced for review.
- Cycles are allowed in the contextual graph because real repositories can form cycles; an execution dependency graph must separately reject cycles before scheduling.
- Edge history preserves accepted/rejected transitions and source revision.

## 5. Cross-repository task planning

A coordinated task may reference:
- one primary repository;
- additional participating repositories and revisions;
- per-repository task IDs/plan paths;
- explicit dependency ordering;
- a bounded file scope per repository;
- check/evidence policy for each repository;
- owner/reviewer for each cross-repository boundary.

Each repository keeps:
- independent branch and commit history;
- independent worktree lifecycle and one-writer rule;
- independent credentials and permission checks;
- independent command and test policy;
- independent PR/review/merge/release decision.

A coordinated plan is a set of related task references, not one synthetic Git checkout. A success in one repository does not imply success in another.

## 6. Execution and authorization rules

- No cross-repository execution from an inferred edge.
- A declared edge is context, not a write permission.
- Before dispatch, verify every participating Project, revision, branch, dirty state, task scope, and permission separately.
- A local agent writing in parallel must use a separate worktree per active writer.
- A cross-repository API/schema change needs an explicit contract owner and compatibility review.
- Commits and PRs stay repository-specific.
- Push, merge, release, deployment, destructive cleanup, and credential changes need operation-specific approval.
- Removing one node must not delete another repository or its local worktrees.

## 7. Workspace view

A future UI may show:
- repository node cards with branch/revision/dirty-state badges;
- accepted and candidate edges with different visual treatment;
- filters for relation type, project, task, and state;
- a graph-to-task view with explicit per-repository boundaries;
- stale revision, inaccessible repository, and missing local checkout warnings.

The view is a projection of Project and relationship data. It must not become a second project directory manager or Git client.

## 8. Verification

Contract fixtures should cover:
- two local checkouts sharing one remote but differing revisions;
- declared vs inferred edges;
- missing node and self-edge rejection;
- duplicate edge detection;
- contextual cycles vs executable dependency cycles;
- independent permission/write boundaries;
- stale revisions and inaccessible repositories.

Workspace Orbit is not yet connected to a database schema, API, or UI.
