# ROCKSOUL FLOW — Portable Markdown Plan Format

Status: **FORMAT SPECIFICATION v1**
Task: RSF-301
Implementation: [ADR-0001](../architecture/ADR-0001-FLOW-FIRST-INTEGRATION-BOUNDARY.md) · [Data contracts](../architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md)

The project Markdown plan is canonical. A parser or UI may build a derived graph, but must not become a second source of truth.

## 1. Format goals

- Readable in a plain text editor, GitHub, and local coding agents.
- Stable task IDs across title edits and file moves.
- Explicit dependencies, scope, acceptance, verification, and deliverables.
- Source-located diagnostics.
- Unknown metadata and user-authored wording preserved byte-for-byte until an explicit writer is added.
- No schema or database dependency in the portable file.

## 2. Document hierarchy

Use Markdown headings:
- `#` for the plan title.
- `##` for a milestone or a task section.
- A task heading has a stable ID followed by an em dash (or hyphen) and title.

Canonical task heading:

```markdown
## RSF-123 — Example task title
```

The v1 parser recognizes task IDs with an uppercase prefix and a three-or-more-digit numeric suffix, for example `RSF-001`. Milestone headings such as `# M1 — Repo Radar` are not tasks.

## 3. Required task fields

Each task section must contain the following top-level labels, in any order:

```markdown
- Status: planned
- Depends on: RSF-101, RSF-102
- Goal: A one-sentence outcome.
- Scope:
  - Bounded implementation responsibility.
  - Explicitly excluded adjacent work.
- Acceptance:
  - Observable condition one.
  - Observable condition two.
- Verification:
  - Exact package-specific command or review evidence.
- Deliverable: A concrete artifact or behavior.
```

Empty dependencies must be written as `- Depends on: none`. Do not omit the field.

The parser recognizes field labels at column zero. Nested bullets are content owned by the immediately preceding field. Keep the required fields at the same indentation level as the task heading's list items.

## 4. Status vocabulary

| Status | Meaning |
| --- | --- |
| `draft` | Incomplete authoring state, not approved for scheduling. |
| `planned` | Recorded in the roadmap but not yet ready to execute. |
| `ready` | Dependencies, scope, acceptance, verification, and required approval are satisfied. |
| `in_progress` | A run is actively working on the task. |
| `blocked` | A dependency, decision, permission, or external condition prevents work. |
| `implemented` | A change exists but required verification is incomplete or failing. |
| `verified` | All required proof and human review requirements are satisfied. |
| `cancelled` | Intentionally stopped with a recorded reason. |

The v1 parser validates the status string. It does not perform lifecycle transitions or mark a task verified.

## 5. Dependency syntax

- Use stable task IDs separated by commas.
- `none` is the only representation for an empty dependency list.
- Every referenced ID must exist once in the same canonical plan.
- Dependency cycles are invalid.
- A dependency's presence does not mean it is complete. Readiness is a separate evaluation.

Example:

```markdown
- Depends on: RSF-101, RSF-102
```

## 6. Parser behavior and diagnostics

The v1 parser returns:
- task ID, title, parsed status, dependency IDs;
- known field values;
- unrecognized top-level field labels as metadata;
- the exact raw Markdown section;
- source start/end line numbers;
- diagnostics with a stable code, message, and line.

Required diagnostics:
- duplicate task ID;
- missing required field;
- invalid status;
- dependency ID not found;
- dependency cycle;
- empty task title or no task sections.

An invalid plan remains readable. The parser must not repair, delete, reorder, rewrite, or silently skip malformed sections.

## 7. Unknown metadata and future compatibility

Unknown top-level fields are allowed. A reader stores the original raw section and exposes unknown labels as metadata. A future writer must preserve them in the same task section unless the user explicitly changes them.

Examples of metadata that may be added later:

```markdown
- Priority: P1
- Estimate: 2
- Owner: Repo Intelligence
- References: docs/architecture/example.md
```

These fields are not required by v1 and must not affect readiness unless a later version defines their semantics.

## 8. Source boundary

- Parser input is Markdown text; it must not read arbitrary paths.
- Path confinement, atomic writes, concurrency detection, backups/recovery, and diff preview belong to RSF-303.
- Task graph rendering belongs to RSF-305.
- Evidence-backed state transitions belong to RSF-306 and Proof Gate.
- The existing Plan agent and session TODO do not change ownership.

## 9. Valid and invalid examples

Valid:

```markdown
## RSF-123 — Add a bounded example

- Status: planned
- Depends on: none
- Goal: Demonstrate a minimal task.
- Scope:
  - Add one pure function.
- Acceptance:
  - The function has deterministic output.
- Verification:
  - Run the focused unit test.
- Deliverable: Function and test.
```

Invalid:
- a repeated `RSF-123` heading;
- `Depends on: RSF-999` when `RSF-999` is absent;
- a status outside the documented set;
- a dependency cycle;
- a task with no `Acceptance` field.

## 10. Versioning

The document format is currently v1. The parser implementation version is reported separately from the plan file. A future breaking syntax change requires a format version, migration guidance, valid/invalid fixtures, and compatibility review before the writer is enabled.
