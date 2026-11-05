# ROCKSOUL DX documentation

This directory contains product-specific documentation for ROCKSOUL DX. The product documents define intended behavior; repository source, package documentation, tests, and runtime configuration remain the authority for what is actually implemented today.

## Start here

| Document | Purpose |
| --- | --- |
| [ROCKSOUL DX branding](branding/ROCKSOUL-DX.md) | Desktop identity, visual direction, theme behavior, and design guardrails. |
| [ROCKSOUL FLOW product vision](product/ROCKSOUL-FLOW.md) | Product thesis, user journey, principles, and success signals. |
| [ROCKSOUL FLOW feature blueprint](product/ROCKSOUL-FLOW-FEATURE-BLUEPRINT.md) | Capability definitions, user flows, conceptual entities, and feature acceptance boundaries. |
| [ROCKSOUL FLOW architecture](architecture/ROCKSOUL-FLOW-ARCHITECTURE.md) | Integration strategy, reuse map, boundaries, data ownership, safety, and technical decision gates. |
| [FLOW feature overlap matrix](architecture/ROCKSOUL-FLOW-OVERLAP-MATRIX.md) | Evidence-based decisions about what to reuse, extend, build, defer, or reject. |
| [FLOW data and evidence contracts](architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md) | Revision identity, Markdown plans, task/run records, evidence, learning, visual profiles, and repository edges. |
| [First integration ADR](architecture/ADR-0001-FLOW-FIRST-INTEGRATION-BOUNDARY.md) | Accepted boundary for the first pure Core parser slice. |
| [Capability inventory](audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md) | Source-backed snapshot of existing capabilities and FLOW gaps. |
| [Portable plan format](plans/ROCKSOUL-FLOW-PLAN-FORMAT.md) | Markdown v1 syntax, validation rules, and unknown-field preservation. |
| [Parallel workstreams](plans/ROCKSOUL-FLOW-PARALLEL-WORKSTREAMS.md) | Agent lane ownership, dependency waves, integration rules, and safe concurrency. |
| [Execution packet contract](plans/ROCKSOUL-FLOW-EXECUTION-PACKET.md) | Deterministic one-task instructions and guardrails for local coding agents. |
| [Repository scan policy](plans/ROCKSOUL-FLOW-REPO-SCAN-POLICY.md) | Root confinement, ignore precedence, generated/sensitive paths, symlinks, and incomplete scan handling. |
| [Manifest inventory contract](plans/ROCKSOUL-FLOW-MANIFEST-INVENTORY.md) | Package managers, workspaces, scripts, toolchains, framework hints, and secret-safe output. |
| [ROCKSOUL FLOW plan](plans/ROCKSOUL-FLOW.plan.md) | Phased, dependency-aware implementation backlog with independently executable microtasks. |

## Source-of-truth rules

1. **Implementation truth:** current source code, runtime configuration, tests, and package documentation.
2. **Product intent:** product vision and feature blueprint.
3. **Technical direction:** architecture document, subject to source-level discovery before implementation.
4. **Execution status:** the plan, but only when its status is backed by a commit, test, or other recorded evidence.
5. **Visual identity:** the branding contract and the active theme implementation.

A planned feature is not an implemented feature. A document does not override a runtime contract or upstream package behavior. When code and docs disagree, record the mismatch, verify the source of truth, and update the appropriate document.

## Scope of this documentation set

These documents describe ROCKSOUL-specific product work. Existing package READMEs, AGENTS.md files, specs, generated API docs, test instructions, and upstream changelogs are retained because they describe the current underlying codebase. They should be changed only when their own technical instructions become inaccurate.

The root README is the canonical public-facing project overview. The upstream-translated README files are retained as inherited references and are not presented as translations of the ROCKSOUL DX product overview.
