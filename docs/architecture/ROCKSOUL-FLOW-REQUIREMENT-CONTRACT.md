# ROCKSOUL FLOW — Requirement Decomposition Contract

Status: **CONTRACT + PURE VALIDATOR v1**
Task: RSF-201
Related: [Overlap matrix](../architecture/ROCKSOUL-FLOW-OVERLAP-MATRIX.md) · [Data/evidence contracts](../architecture/ROCKSOUL-FLOW-DATA-CONTRACTS.md)

Requirement decomposition turns a user request into small, reviewable units. The model can suggest a decomposition, but this validator accepts only explicit fields supplied by that upstream step. It does not invent missing intent or resolve ambiguity silently.

## 1. Requirement unit

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Stable ID in the `REQ-001` format. |
| `title` | Yes | Short, distinguishable requirement name. |
| `statement` | Yes | Explicit behavior/need preserved from the source request. |
| `expectedBehavior` | For reviewable state | Observable outcome. |
| `constraints` | No | Explicit constraints from the user or approved source. |
| `nonGoals` | No | Explicit exclusions; never inferred as user intent. |
| `acceptanceCriteria` | For reviewable state | One or more observable/verifiable conditions. |
| `openQuestions` | No | Missing or ambiguous information requiring clarification. |
| `sourceRef` | No | Traceable source pointer, such as a message, file, or issue reference. |

Every requirement remains linked to its original request/source. Splitting a request must not erase contradictory details; contradictions are captured as open questions and remain unresolved for review.

## 2. State

- `reviewable`: valid ID/title/statement, explicit expected behavior, at least one acceptance criterion, and no open questions.
- `unresolved`: behavior or acceptance is incomplete, or open questions remain.

The validator does not claim that a reviewable requirement is accepted, implemented, or true. A separate human review decision is required before audit findings or tasks are generated.

## 3. Validation behavior

The pure validator accepts unknown input and returns:
- valid requirement units with source index;
- structural diagnostics for non-array input, malformed entries, invalid/duplicate IDs, missing title/statement, invalid list shape, and empty/non-string list items;
- unresolved reasons for missing expected behavior, missing acceptance criteria, and open questions;
- a `readyForAudit` flag that is true only when every unit is reviewable and there are no structural diagnostics.

Invalid records are not completed with invented values. A record missing title or statement is not returned as a valid requirement unit. A structurally valid but incomplete record stays visible as unresolved.

## 4. Safety and ownership

- This is a validation boundary, not an LLM decomposition engine and not an autonomous requirements classifier.
- No source request is overwritten.
- No constraints, non-goals, acceptance conditions, or answers are inferred from repository code.
- Source references are labels only; a later evidence retrieval step must resolve them using permission-aware repository services.
- Duplicate detection at this step is by stable ID. Semantic overlap between distinct IDs belongs to RSF-204.
- The validator performs no filesystem, network, database, Git, session, or process operations.

## 5. Test coverage

Focused Core tests cover:
- valid explicit requirement records;
- missing behavior/acceptance and open questions remaining unresolved;
- duplicate and malformed IDs;
- malformed entries and invalid list items;
- missing statement without invented replacement text;
- non-array input.

The requirement units are not yet connected to an AI decomposition workflow, Audit Bench UI, or persisted review history.
