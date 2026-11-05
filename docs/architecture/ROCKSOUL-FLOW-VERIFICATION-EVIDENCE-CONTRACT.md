# ROCKSOUL FLOW — Verification Evidence Contract

Status: **CONTRACT + PURE EVALUATOR v1**
Task: RSF-601
Related: [Data/evidence contracts](ROCKSOUL-FLOW-DATA-CONTRACTS.md) · [Execution packet contract](../plans/ROCKSOUL-FLOW-EXECUTION-PACKET.md)

Proof Gate evaluates immutable results produced by the existing terminal/runtime and human review flow. It does not run commands or create evidence from an agent's narrative.

## 1. Evidence identity

Every evidence record is bound to:
- evidence ID;
- task ID and execution run ID;
- repository revision (full commit SHA when available);
- unique check ID and check type;
- capture timestamp;
- actual result status.

A record from another task, run, check, or repository revision cannot satisfy the selected requirement.

## 2. Check types

- `lint`, `test`, `typecheck`, `build`: command evidence.
- `visual`: screenshot/video/reference evidence requiring human review.
- `manual`: manual acceptance evidence requiring an inspectable artifact and human review.

Each task declares its required checks by stable check ID. IDs must be unique within that task.

## 3. Result status

| Status | Meaning | Can satisfy a required check? |
| --- | --- | --- |
| `pass` | Command exited successfully or reviewer accepted evidence. | Yes, only with valid exact-revision evidence and required review. |
| `fail` | Command failed or reviewer rejected the evidence. | No. |
| `skipped` | Check was deliberately not executed. | No; requires a reason. |
| `not_applicable` | Check does not apply to this task/repository. | No by default; requires a reason and a separately recorded waiver if the requirement is to be waived. |
| `not_run` | Check has not been executed. | No; requires a reason. |

A skipped or not-applicable result is not a pass and cannot disappear from the verification summary.

## 4. Command evidence validation

Command checks require:
- exact command string as executed;
- root-relative working directory;
- integer exit code for completed pass/fail results;
- status consistent with exit code (`pass` must be 0; `fail` must be non-zero);
- valid capture time and non-empty task/run/revision/check identity.

Absolute and traversal working directories are invalid. Unknown commands are not authorized by this contract; command selection and approval belong to RSF-602.

Output artifacts are referenced rather than copied without limit. Redaction and output bounds are required at collection time under RSF-603.

## 5. Visual and manual evidence

Visual/manual evidence requires an inspectable artifact reference for completed pass/fail results. A pass requires an explicit `humanReview: approved`; pending review stays incomplete and rejected review fails the check.

The profile/screen, viewport, theme/mode, and capture revision should be retained by the evidence collector when applicable. A screenshot is not automatically accepted because it exists.

## 6. Revision and attempt semantics

- Evidence is immutable and tied to the repository revision observed during capture.
- A newer task attempt creates new evidence records; it does not overwrite old attempts.
- The evaluator selects the latest capture for the same task/check/type/revision.
- Older-revision evidence is surfaced as stale and never satisfies the current task.
- Evidence with the correct task/check/revision but wrong check type is invalid.
- Duplicate required check IDs are invalid.
- A later pass may satisfy the check while the previous failed attempt remains inspectable.

The current revision must be explicitly supplied to the evaluator. It must not infer the revision from evidence.

## 7. Proof Gate states

- `verified`: at least one required check exists and every required check passes all structural, revision, exit-code, artifact, and human-review requirements.
- `failed`: at least one required check has a valid failure or rejected review.
- `incomplete`: evidence is missing, stale, invalid, skipped, not applicable, not run, or awaiting human review; or no required checks were declared.

Optional checks remain visible but do not determine the overall state. Required checks cannot be silently downgraded to optional during evaluation.

## 8. Pure evaluator implementation

The Core evaluator in `packages/core/src/flow/evidence/gate.ts` consumes typed requirement/evidence arrays and returns per-check results plus missing, failed, stale, invalid, and pending-review summaries.

It performs no terminal execution, filesystem access, database write, network call, task status mutation, or agent dispatch. It is a deterministic decision function only.

## 9. Verification coverage

Focused Core tests cover:
- exact-revision passing checks;
- missing and stale evidence;
- failed and exit-code-inconsistent command evidence;
- skipped/not-applicable/not-run reasons;
- root escape and missing exit code rejection;
- visual artifact and human review;
- latest immutable attempt selection;
- duplicate check IDs and mismatched check types;
- empty required-check set remaining incomplete.

The evaluator is not yet connected to a database, terminal collector, PR checks, or task status transitions.
