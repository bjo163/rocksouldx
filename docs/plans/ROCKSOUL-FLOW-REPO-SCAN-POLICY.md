# ROCKSOUL FLOW — Repository Scan Policy

Status: **POLICY v1**
Task: RSF-101
Related: [Capability inventory](../audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md) · [Data/evidence contracts](../architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md) · [Parallel workstreams](ROCKSOUL-FLOW-PARALLEL-WORKSTREAMS.md)

The repository scan is a read-only observation of one selected Project checkout at one Git revision. It composes the existing Project, Git, filesystem, file-access, and ripgrep services. It does not implement a second repository root resolver, ignore engine, Git client, or file walker.

## 1. Checkout identity and root

- Resolve the selected directory through the existing Project service and preserve its Project ID and canonical checkout identity.
- A read-only inventory must not create or update Project records merely because a scan was requested; use the existing non-persisting Project resolution option where appropriate.
- Resolve the repository root using the existing Project/Git/filesystem boundary. Do not infer it from the remote URL or a user-entered path string alone.
- Keep all candidate paths root-relative and slash-normalized before applying the scan policy.
- Reject absolute candidate paths, drive-relative paths, UNC paths, and any lexical `..` segment.
- Check already-canonicalized absolute paths with the existing containment helpers or `isWithinScanRoot`; never use string-prefix comparison for path containment.
- Do not follow symlinks by default. If a future mode follows a symlink, resolve the real target and prove it remains inside the selected root before reading it.

## 2. Revision and freshness

A snapshot records:
- Project ID and local checkout identity;
- Git HEAD commit when one exists;
- current branch when one exists;
- dirty/clean/unknown state and a concise changed-path summary;
- scan start/end time and policy/compiler version.

Use the existing Git service for repository identity, revision, branch, dirty state, ignored-path checks, and diff evidence. Do not spawn a second Git implementation.

Freshness states:
- `complete`: required discovery phases finished and no required path was silently omitted.
- `partial`: some paths or phases were ignored, inaccessible, over budget, or otherwise unavailable; warnings explain why.
- `failed`: no useful inventory could be produced.
- `stale`: checkout revision or dirty-state fingerprint changed during or after the scan.

An unborn HEAD is represented as unborn, never as a fabricated SHA. A dirty checkout is represented explicitly; a scan must not imply that uncommitted content belongs to the HEAD commit.

## 3. Discovery and ignore precedence

Use the existing ripgrep/file discovery implementation, which already provides repository-rooted file enumeration and explicit hidden-file behavior.

- Include hidden project configuration when inventorying guidance and manifests; hidden-file inclusion must not disable VCS ignore rules.
- Preserve repository ignore semantics from the existing discovery layer. Use the existing Git ignored-path service when an explicit ignored-path decision is needed.
- Do not pass `--no-ignore`, `-uuu`, or otherwise bypass repository ignore policy for a normal snapshot.
- Do not read global/system ripgrep configuration as a project policy source; keep command discovery deterministic.
- Record which discovery mechanism and policy version produced the candidate set.
- A candidate omitted by VCS ignore is not a missing capability. Record it as ignored only when the caller explicitly asks for that explanation.

The pure policy helper accepts a root-relative discovered path and flags from the existing discovery layer. It does not parse `.gitignore` patterns itself.

## 4. Default directory exclusions

The v1 policy excludes generated or vendor directories at any depth:

`.git`, `.hg`, `.svn`, `node_modules`, `vendor`, `dist`, `build`, `coverage`, `.turbo`, `.next`, `.nuxt`, `.svelte-kit`, `.output`, `.vercel`, `.cache`, `.parcel-cache`, `.vite`, `target`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.gradle`, and `Pods`.

This list is intentionally explicit and versioned. Do not exclude generic names such as `bin` or `obj` by default because they can contain authored source in some repositories. A project-specific exception must be recorded in the scan policy and the resulting coverage.

## 5. Sensitive path exclusions

Never read candidate file content for these path classes:
- `.env` and `.env.*`, except safe templates `.env.example`, `.env.sample`, `.env.template`, and `.env.defaults`;
- credential directories such as `.ssh`, `.aws`, `.azure`, and `.gnupg`;
- `.npmrc`, `.pypirc`, `.netrc`, private key names such as `id_rsa`, `id_ed25519`, and `id_ecdsa`;
- private key/certificate formats such as `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, and `.keystore`;
- Terraform state files and common credential/secret JSON files.

The policy filters by path before any content read. It does not attempt to parse a secret and redact it after exposure. Safe example templates may be inventoried, but their values must not be copied into prompt packets or persistent summaries.

## 6. Symlinks, inaccessible paths, and ignored files

The policy returns explicit exclusions rather than silently dropping a candidate:

| Reason | Meaning | Snapshot handling |
| --- | --- | --- |
| `invalid-relative-path` | Candidate is absolute, drive-relative, UNC, empty, or traverses outside the root. | Reject; include a policy warning. |
| `generated-or-vendor` | Candidate is inside a known generated/vendor directory. | Exclude from source inventory and record policy version. |
| `sensitive-path` | Candidate path indicates credentials or secret-bearing material. | Never read content; record only a sanitized exclusion count/path as appropriate. |
| `symlink-not-followed` | Candidate is a symlink and follow mode is disabled. | Exclude; do not read the target. |
| `vcs-ignored` | Existing Git/ripgrep discovery marks the path ignored. | Exclude; do not classify the feature as missing. |
| `inaccessible` | Existing permission-aware read/discovery cannot inspect the path. | Mark scan partial and retain a warning; do not classify as missing. |

An inaccessible directory or a scan limit reached before all required phases complete produces `partial`, not `complete`. An inaccessible or excluded path is never proof that a feature is absent.

## 7. Content-reading policy

- Path discovery and content reading are separate phases.
- Read file contents only for relevant manifests, documentation, source/test evidence, and user-requested references.
- Use existing permission-aware FileAccess and filesystem services for reads.
- Keep binary, oversized, generated, and unsupported files out of content parsing.
- Bound output and retain source paths/revision; do not copy entire repositories into the scan result.
- Never run package scripts, build commands, migrations, or arbitrary repository code during a read-only scan.

## 8. Validation matrix

The focused policy tests cover:
- slash normalization and lexical traversal rejection;
- POSIX, Windows-drive, drive-relative, and UNC absolute path rejection;
- generated/vendor exclusions at nested depths;
- secret exclusions and safe environment templates;
- symlink exclusion;
- VCS-ignored and inaccessible status distinction;
- root containment and sibling-prefix confusion.

Integration coverage for Project/Git/ripgrep discovery, ignore precedence, dirty-revision changes, and inaccessible directory warnings belongs to later scanner service tasks. The policy helper is not itself a complete Repo Radar scanner.
