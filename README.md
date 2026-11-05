# ROCKSOUL DX

**An independent AI coding workbench. Built for deliberate engineering, clear plans, and verified delivery.**

ROCKSOUL DX is an independently maintained desktop-first coding-agent project based on [OpenCode](https://github.com/anomalyco/opencode). It keeps the proven coding-agent foundation while developing a distinct product identity and a project-aware development workflow called **ROCKSOUL FLOW**.

> ROCKSOUL DX is not an official OpenCode product and is not affiliated with or endorsed by the OpenCode maintainers. OpenCode remains the upstream foundation; its original license notices and attribution are preserved.

---

## Product direction

A coding agent should do more than respond to prompts. It should understand the repository it is changing, recognize work that already exists, turn goals into small executable tasks, coordinate implementation, and show evidence that the result works.

ROCKSOUL FLOW is the planned workflow layer for that lifecycle:

1. **Understand** — inspect the repository, architecture, tools, docs, Git state, and validation commands.
2. **Audit** — compare a request with existing implementation and contracts before planning new work.
3. **Plan** — create a versioned Markdown plan with milestones, dependencies, microtasks, and acceptance criteria.
4. **Prepare** — generate a scoped execution packet for a local or connected coding agent.
5. **Execute** — coordinate sessions and isolated worktrees without duplicating the underlying agent runtime.
6. **Verify** — collect test, lint, typecheck, build, and visual evidence.
7. **Deliver** — update the plan and docs, summarize the diff, and prepare a reviewable commit or pull request.

**Important status:** ROCKSOUL FLOW is a product direction and implementation roadmap. The workflow modules described in its blueprint are not all implemented in the current application. See the [feature blueprint](docs/product/ROCKSOUL-FLOW-FEATURE-BLUEPRINT.md) and [execution plan](docs/plans/ROCKSOUL-FLOW.plan.md) for their status and scope.

## Product pillars

| Pillar | Purpose |
| --- | --- |
| Repo Radar | Build an evidence-backed picture of a repository before work begins. |
| Overlap Detector | Identify implemented, partial, missing, overlapping, conflicting, and deprecated capabilities. |
| Plan Forge | Turn goals into versioned plans and dependency-aware microtasks. |
| Prompt Forge | Produce precise execution packets for local and connected agents. |
| Task Deck | Coordinate bounded agent work and isolated worktrees. |
| Proof Gate | Require verifiable acceptance evidence before work is marked complete. |
| Memory Ledger | Curate durable project learnings with provenance and review. |
| Visual DNA Lab | Keep project-specific visual references and design contracts coherent. |
| Workspace Orbit | Organize multiple repositories and explicitly modeled cross-repository work. |

These pillars are designed to reuse existing sessions, agents, tools, plugins, MCP, worktrees, terminal, file review, and provider support wherever those capabilities already satisfy the requirement.

## Current foundation

The current codebase inherits a mature coding-agent foundation from OpenCode, including:

- Model and provider connections.
- Agent sessions, prompts, and subagent workflows.
- Repository file access, search, edits, and code review surfaces.
- Integrated terminal and command execution.
- Plugin and MCP integration.
- Git worktree support.
- Image generation tools and other provider-backed capabilities.
- Desktop and web application surfaces, plus the CLI/TUI.

The initial ROCKSOUL DX contribution introduces the desktop identity and the ROCKSOUL theme. It does not replace the underlying session engine, provider system, permission model, update channels, or application identifiers.

See [ROCKSOUL DX branding](docs/branding/ROCKSOUL-DX.md) for the visual contract and [documentation index](docs/README.md) for the full product documents.

## Development status

ROCKSOUL DX is under active development. This repository currently provides source code and development workflows; do not assume that a public ROCKSOUL DX installer, release channel, hosted service, or production-ready autonomous workflow is available until a release is published explicitly.

## Build from source

The repository pins Bun 1.4.4 in the root package manifest. Use the pinned version for a reproducible local setup.

~~~bash
bun install
~~~

Start the desktop application in development mode:

~~~bash
bun run dev:desktop
~~~

Other development entry points:

~~~bash
bun dev                 # CLI / TUI
bun run dev:web         # Web application
~~~

Build and package the desktop application from its package directory:

~~~bash
cd packages/desktop
bun run build
bun run pack
~~~

Packaging prerequisites and environment variables are documented in [packages/desktop/README.md](packages/desktop/README.md). A successful source checkout or development launch should not be confused with a signed release installer.

Run the repository check command when appropriate:

~~~bash
bun run check
~~~

Run tests from the relevant package directory rather than the repository root. The root test script intentionally blocks running the full test suite from the root; use the package-specific instructions and test skills under .opencode/skills.

## Documentation

- [Documentation index](docs/README.md)
- [ROCKSOUL DX brand and desktop UI contract](docs/branding/ROCKSOUL-DX.md)
- [ROCKSOUL FLOW product vision](docs/product/ROCKSOUL-FLOW.md)
- [ROCKSOUL FLOW feature blueprint](docs/product/ROCKSOUL-FLOW-FEATURE-BLUEPRINT.md)
- [ROCKSOUL FLOW architecture and integration boundaries](docs/architecture/ROCKSOUL-FLOW-ARCHITECTURE.md)
- [ROCKSOUL FLOW microtask plan](docs/plans/ROCKSOUL-FLOW.plan.md)

## Upstream, attribution, and license

ROCKSOUL DX is based on [anomalyco/opencode](https://github.com/anomalyco/opencode). The upstream project provides the underlying coding-agent foundation and retains its own identity, ownership, and community. ROCKSOUL DX-specific product work is maintained independently in this repository.

This repository is distributed under the MIT License. Preserve upstream copyright notices, license files, attribution, and third-party notices when making changes. See [LICENSE](LICENSE) and [SECURITY.md](SECURITY.md).

## UI delivery: Stages 0–3

The first Rocksoul UI delivery adds the Industrial, Punk and Workbench skins, the refreshed desktop/web identity, and the Cockpit route. The implementation audit, brand rules, stage notes and follow-up backlog are documented in [docs/rocksoul](docs/rocksoul/).

The FLOW architecture and its capability roadmap remain the product foundation; the UI work is additive and does not replace the FLOW plan or runtime boundaries.
