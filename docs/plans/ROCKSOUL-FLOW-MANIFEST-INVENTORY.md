# ROCKSOUL FLOW — Manifest and Toolchain Inventory

Status: **CONTRACT + PURE ANALYZER v1**
Task: RSF-102
Related: [Repository scan policy](ROCKSOUL-FLOW-REPO-SCAN-POLICY.md) · [Data/evidence contracts](../architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md)

The manifest analyzer consumes paths and file contents already discovered by the existing Project/filesystem/Git/ripgrep layer. It is a pure transform. It does not open files, install dependencies, run commands, resolve remote packages, or select a runtime on behalf of the developer.

## 1. Input boundary

Input records contain:
- root-relative path normalized by the repository scan policy;
- file content only when the permission-aware reader has successfully read an allowed manifest;
- no arbitrary source contents, secret-bearing files, or environment data.

Absolute, drive-relative, UNC, and traversal paths are rejected before classification. The caller is responsible for applying scan exclusions and repository ignore rules before passing candidates to the analyzer.

## 2. Output model

| Output | Meaning |
| --- | --- |
| `manifestPaths` | Sorted, root-relative paths recognized as manifests/configuration files. |
| `packages` | Parsed package manifest records, including directory, name, privacy flag, package manager declaration, engines, dependency names, workspace patterns, and scripts. |
| `scripts` | Deterministically sorted script records with package path, name, command, intent hint, and redaction marker. |
| `workspacePatterns` | Workspace globs declared by the root package manifest only. |
| `packageManagers` | All supported explicit manager and root-lockfile observations. |
| `primaryPackageManager` | Present only when root evidence supports one manager without unresolved lockfile ambiguity. |
| `languages` | Languages indicated by known manifest/toolchain filenames. |
| `frameworks` | Frameworks indicated by declared package dependency names. |
| `warnings` | Missing content, malformed package JSON, unsupported explicit manager, and manager conflicts. |

Every observation is grounded in a manifest path. An empty list means "not observed in the supplied manifest set", not "the repository cannot use this technology".

## 3. Package manager resolution

- A supported root `packageManager` field is the strongest explicit manager declaration.
- Without one, exactly one root lockfile manager may be selected.
- Multiple conflicting root lockfiles produce a warning and no guessed primary manager.
- Nested package manager declarations are retained as observations and can surface a workspace conflict.
- A nested lockfile does not silently override the root manager.
- Unsupported declarations are warnings; the analyzer never installs or executes a package manager.

Recognized lockfile evidence includes Bun, npm, pnpm, Yarn, Cargo, Poetry, uv, Pipenv, Go modules, Bundler, Composer, Mix, and CocoaPods lockfiles.

## 4. Script inventory and safety

Package scripts are copied only from parsed `scripts` objects. The analyzer does not invent commands from common names or from missing scripts.

The intent label is a hint based on the script name:
- `lint` — lint/format-like names;
- `test` — test/spec/runner-like names;
- `typecheck` — explicit typecheck-like names;
- `build` — build-like names;
- `other` — every ambiguous or unrecognized name.

The command itself remains an untrusted string, never an instruction to execute. Before returning it, the analyzer redacts common inline environment secret assignments, token/password flags, and URL user credentials. A `redacted` marker identifies commands changed by that safeguard.

Later validation-planner work must still apply user approval, repository command policy, and package-specific guidance before execution. This inventory does not grant shell permission.

## 5. Language and framework signals

Language hints come from manifest/toolchain filenames (for example, `package.json`, `tsconfig.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, Gradle/Maven files, project files, and language-specific lockfiles).

Framework hints come from dependency names observed in `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies` (for example React, Next.js, Vue, SvelteKit, Astro, Vite, Fastify, NestJS, Hono, and Express).

These are evidence-backed hints, not proof that every dependency is installed, used, active, or configured correctly.

## 6. Failure and conflict behavior

- A discovered package manifest with unavailable content creates a `missing-content` warning.
- Invalid JSON or a non-object JSON root creates an `invalid-json` warning; it is not silently dropped.
- Conflicting root package managers do not produce a single primary manager.
- No manifest, script, language, or framework is invented when evidence is absent.
- Output ordering is deterministic so the same input set produces the same inventory.

## 7. Test coverage

Focused Core fixtures cover:
- Bun workspace and npm root manager discovery;
- workspace patterns, package directory, engines, dependency and framework hints;
- deterministic script sorting and intent hints;
- competing lockfiles and no false primary selection;
- malformed and unreadable package manifests;
- JavaScript/TypeScript, Python, Rust, Go, Kotlin, and C# signals;
- inline token/password/URL credential redaction;
- absolute and traversal path rejection.

The analyzer is not yet wired to a Repo Radar screen, database cache, or Server API. Those are later integration decisions.
