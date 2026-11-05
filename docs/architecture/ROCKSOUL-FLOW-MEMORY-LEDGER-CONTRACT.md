# ROCKSOUL FLOW — Learning and Memory Ledger Contract

Status: **CONTRACT v1**
Task: RSF-701
Related: [Data and evidence contracts](ROCKSOUL-FLOW-DATA-CONTRACTS.md) · [Execution packet contract](../plans/ROCKSOUL-FLOW-EXECUTION-PACKET.md)

Memory Ledger is a review queue for durable, project-scoped engineering knowledge. It is not hidden assistant memory, a replacement for conversation history, or an autonomous documentation writer.

## 1. Ownership boundary

- Existing Session owns conversation and execution history.
- The repository owns accepted project guidance, architectural decisions, and durable engineering documentation.
- Memory Ledger owns only candidate learning metadata, provenance, duplicate detection, review state, and proposed diffs.
- The user's personal memory or account-level data is outside this feature's ownership and must not be imported.

A candidate may link to a session/run and source revision. It must not copy entire conversations or duplicate the session transcript.

## 2. Learning categories

| Category | Meaning | Evidence bar |
| --- | --- | --- |
| `verified_fact` | A reproducible statement about current code/runtime behavior. | Source path plus test, command, or direct observation at a pinned revision. |
| `decision` | A consciously selected architecture/product/implementation choice. | Decision record or explicit reviewer/owner confirmation. |
| `hypothesis` | A plausible explanation or unverified inference. | Source context and an explicit uncertainty statement; never publish as fact. |
| `preference` | An explicit project/workflow preference relevant to the repository. | Directly stated and scoped to that project; do not infer personal attributes. |

## 3. Candidate record

Required fields:
- stable learning ID and schema version;
- category, concise statement, and confidence label;
- project/repository identity and revision when code-related;
- source Session/Run reference and exact source location/reference;
- capture actor/tool and capture timestamp;
- proposed destination file;
- proposed edit/diff;
- duplicate/collision references;
- review state: `candidate`, `accepted`, `rejected`, or `superseded`;
- reviewer, review time, and decision reason when reviewed.

The candidate statement must be short and independently understandable. The source remains authoritative; the candidate is only a proposal.

## 4. Privacy and redaction

Never extract or persist:
- passwords, API tokens, access keys, private keys, session cookies, credential-bearing URLs, or raw environment dumps;
- personal secrets or sensitive personal information;
- personal memory/account data;
- private user content unrelated to the selected project;
- raw private messages when a concise, non-sensitive engineering fact is sufficient.

Sensitive values are excluded before storage, not merely hidden in the UI. If the extractor cannot confidently separate an engineering fact from sensitive/private content, it must reject the candidate or request human review without retaining the sensitive excerpt.

## 5. Review workflow

1. **Capture candidate:** record a brief claim, source/provenance, and proposed destination.
2. **Redaction review:** reject sensitive or unrelated content.
3. **Evidence review:** confirm that a verified fact has a source and appropriate proof; otherwise label it as hypothesis or decision.
4. **Duplicate review:** search the selected project docs and prior accepted/rejected candidates.
5. **Diff preview:** show the exact proposed edit in the destination file.
6. **User approval:** accept, reject, edit, or supersede. No silent writes.
7. **Commit association:** after an approved documentation change is committed, link the learning to the commit/path/revision.

A candidate remains a candidate until the user approves it. Approval authorizes only the proposed destination and diff; any material expansion requires another review.

## 6. Deduplication and supersession

- Compare normalized statement and destination, but do not treat similarity alone as proof of duplication.
- Existing documentation is inspected before a new entry is proposed.
- A rejected candidate is not resurfaced unchanged without new evidence or a material change.
- Contradictory learnings remain visible and require an explicit supersession/decision record.
- A new source revision may make a verified fact stale; preserve the old record and propose a new review rather than rewriting history.

## 7. Destination policy

Preferred locations:
- `AGENTS.md` for scoped operating instructions;
- `docs/architecture` for accepted architecture decisions and boundaries;
- `docs/plans` for current plans and execution conventions;
- package README files for package-specific setup/commands;
- product docs for product intent, not source-level behavior.

Choose the narrowest correct destination. Root guidance must not accumulate package-specific details that belong under nested guidance.

## 8. Status semantics

- `candidate`: captured but not approved.
- `accepted`: user approved the exact proposal; the documentation diff may be applied under the approved scope.
- `rejected`: user rejected it; retain only the minimal non-sensitive deduplication metadata.
- `superseded`: a later accepted record replaced it, with the relationship preserved.

Acceptance does not mean a commit exists. A separate commit reference is added only after a real commit is observed.

## 9. Verification

A learning record may be considered published only when:
- the user approved the exact proposed diff;
- the destination file change is inspectable;
- redaction and duplicate checks passed;
- the recorded commit/revision exists and matches the destination;
- the original source/provenance remains traceable.

No generated candidate may change task status, acceptance state, user memory, Git state, or release state by itself.

## 10. Non-goals

This contract does not implement session mining, long-term memory storage, auto-writing docs, cross-project preference learning, or account-memory access. Those operations require explicit product, privacy, and persistence decisions.
