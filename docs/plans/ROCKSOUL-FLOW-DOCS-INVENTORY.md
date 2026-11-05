# ROCKSOUL FLOW — Documentation and Guidance Inventory

Status: **CONTRACT + PURE INVENTORY v1**
Task: RSF-103
Related: [Repository scan policy](ROCKSOUL-FLOW-REPO-SCAN-POLICY.md) · [Capability inventory](../audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md)

This inventory catalogs documentation paths and resolves hierarchical `AGENTS.md` files for a selected source path. It is a path-only discovery layer: it does not read documentation content, execute instructions, or decide which claim is true.

## 1. Inputs and boundaries

Input is a candidate path list already discovered under a selected project root by the existing Project/filesystem/ripgrep/Git path. The inventory:
- normalizes paths using the shared scan-policy function;
- rejects absolute, drive-relative, UNC, and traversal paths;
- excludes generated/vendor/sensitive/symlink paths according to the shared policy;
- deduplicates normalized paths;
- performs no filesystem reads, Git operations, network calls, or process execution.

The content of an `AGENTS.md`, README, plan, or architecture document is not interpreted by this inventory. A later context compiler may read the relevant files using existing permission-aware FileAccess.

## 2. Documentation categories

| Kind | Classification |
| --- | --- |
| `agent-guidance` | Any `AGENTS.md` candidate at root or below. |
| `readme` | Root or package-local `README.md`. |
| `docs-index` | `docs/README.md`. |
| `architecture` | Files under `docs/architecture` and ADR documents. |
| `product` | Files under `docs/product`. |
| `plan` | Files under `docs/plans` or named `*.plan.md`. |
| `audit` | Files under `docs/audits`. |
| `contributing` | Contributing and code-of-conduct guidance. |
| `changelog` | Changelog and release-note documents. |
| `specification` | Other documentation paths explicitly named as specifications. |
| `other` | Remaining Markdown/MDX documentation. |

The category is a navigation hint. It is not an implementation classification and it does not replace source/test evidence.

## 3. Hierarchical AGENTS resolution

For a root-relative source file path, `applicableGuidance` returns only the `AGENTS.md` files located:
1. at the repository root;
2. in each ancestor directory of the source file, from shallowest to deepest.

Example:

Source: `packages/core/src/tool/plan.ts`

Applicable guidance (when present):
- `AGENTS.md`
- `packages/AGENTS.md`
- `packages/core/AGENTS.md`
- `packages/core/src/AGENTS.md`
- `packages/core/src/tool/AGENTS.md`

A file under `packages/app` does not apply to a source file under `packages/core`. Guidance in a sibling folder is not included. Paths that escape the selected root are rejected.

The resolver returns paths only. A caller must read each returned file using the existing permission-aware file service, apply the repository's established instruction semantics, and stop if a required file cannot be inspected.

## 4. Inventory output

- Sorted unique documentation entries with root-relative path, category, and containing directory.
- A dedicated guidance path list.
- Optional root README and docs index references.
- Sorted plan and architecture path lists for convenient navigation.

No content, secrets, user-specific values, or inferred implementation claims are stored in this output.

## 5. Verification coverage

Focused tests cover:
- root and nested documentation category classification;
- root README and docs index recognition;
- plan, product, audit, architecture, contributing, and package README classification;
- generated/vendor, absolute, and traversal path rejection;
- slash normalization and duplicate elimination;
- root-to-leaf instruction ordering;
- exclusion of sibling guidance and invalid source paths.

The inventory is not yet wired into a Repo Radar screen or a repository snapshot store. Those remain later tasks with separate integration decisions.
