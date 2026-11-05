import { describe, expect, test } from "bun:test"
import { evaluateProofGate } from "../../../src/flow/evidence/gate.js"
import type { ProofEvidenceRecord, ProofRequirement } from "../../../src/flow/evidence/gate.js"

const requirement: ProofRequirement = { id: "core-test", type: "test", required: true }

const evidence = (input: Partial<ProofEvidenceRecord> = {}): ProofEvidenceRecord => ({
  id: "proof-001",
  taskID: "RSF-603",
  revision: "abc123",
  checkID: "core-test",
  type: "test",
  status: "pass",
  capturedAt: "2026-11-05T10:00:00.000Z",
  command: "bun test test/flow",
  workingDirectory: "packages/core",
  exitCode: 0,
  ...input,
})

describe("evaluateProofGate", () => {
  test("verifies only when every required check passes for the exact revision", () => {
    const result = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [
        requirement,
        { id: "core-typecheck", type: "typecheck", required: true },
      ],
      evidence: [
        evidence(),
        evidence({
          id: "proof-002",
          checkID: "core-typecheck",
          type: "typecheck",
          command: "bun run typecheck",
        }),
      ],
    })

    expect(result.state).toBe("verified")
    expect(result.checks.map((item) => item.status)).toEqual(["passed", "passed"])
  })

  test("keeps absent and stale evidence incomplete", () => {
    const result = evaluateProofGate({
      taskID: "RSF-603",
      revision: "new-revision",
      requiredChecks: [
        requirement,
        { id: "core-typecheck", type: "typecheck", required: true },
      ],
      evidence: [evidence()],
    })

    expect(result.state).toBe("incomplete")
    expect(result.staleEvidenceIDs).toEqual(["proof-001"])
    expect(result.missingCheckIDs).toEqual(["core-typecheck"])
  })

  test("keeps failed and inconsistent command results visible", () => {
    const failed = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [requirement],
      evidence: [evidence({ status: "fail", exitCode: 1, reason: "Assertion failed" })],
    })
    const inconsistent = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [requirement],
      evidence: [evidence({ status: "pass", exitCode: 2 })],
    })

    expect(failed.state).toBe("failed")
    expect(failed.failedCheckIDs).toEqual(["core-test"])
    expect(inconsistent.state).toBe("incomplete")
    expect(inconsistent.invalidEvidenceIDs).toEqual(["proof-001"])
  })

  test("requires reasons for skipped, not-applicable, and not-run results", () => {
    const results = ["skipped", "not_applicable", "not_run"].map((status) =>
      evaluateProofGate({
        taskID: "RSF-603",
        revision: "abc123",
        requiredChecks: [requirement],
        evidence: [evidence({ status: status as ProofEvidenceRecord["status"], reason: "Not available in this runner" })],
      }),
    )

    expect(results.map((result) => result.state)).toEqual(["incomplete", "incomplete", "incomplete"])
    expect(results.map((result) => result.checks[0]?.status)).toEqual(["skipped", "not-applicable", "not-run"])
  })

  test("rejects root escapes and command evidence without an exit code", () => {
    const unsafePath = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [requirement],
      evidence: [evidence({ workingDirectory: "../outside" })],
    })
    const missingExit = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [requirement],
      evidence: [evidence({ exitCode: undefined })],
    })

    expect(unsafePath.invalidEvidenceIDs).toEqual(["proof-001"])
    expect(missingExit.invalidEvidenceIDs).toEqual(["proof-001"])
  })

  test("requires artifact evidence and approved human review for visual checks", () => {
    const visual: ProofRequirement = { id: "visual-home", type: "visual", required: true, requiresHumanReview: true }
    const pending = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [visual],
      evidence: [
        evidence({
          checkID: "visual-home",
          type: "visual",
          artifactRef: "artifacts/home.png",
          humanReview: "pending",
          command: undefined,
          workingDirectory: undefined,
          exitCode: undefined,
        }),
      ],
    })
    const approved = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [visual],
      evidence: [
        evidence({
          checkID: "visual-home",
          type: "visual",
          artifactRef: "artifacts/home.png",
          humanReview: "approved",
          command: undefined,
          workingDirectory: undefined,
          exitCode: undefined,
        }),
      ],
    })

    expect(pending.state).toBe("incomplete")
    expect(pending.pendingReviewCheckIDs).toEqual(["visual-home"])
    expect(approved.state).toBe("verified")
  })

  test("uses the newest immutable attempt for a check", () => {
    const result = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [requirement],
      evidence: [
        evidence({ id: "attempt-1", status: "fail", exitCode: 1, capturedAt: "2026-11-05T09:00:00.000Z" }),
        evidence({ id: "attempt-2", status: "pass", exitCode: 0, capturedAt: "2026-11-05T10:00:00.000Z" }),
      ],
    })

    expect(result.state).toBe("verified")
    expect(result.checks[0]?.evidenceID).toBe("attempt-2")
  })

  test("rejects duplicate check IDs and mismatched check types", () => {
    const duplicate = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [requirement, requirement],
      evidence: [evidence()],
    })
    const mismatch = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [requirement],
      evidence: [evidence({ type: "lint" })],
    })

    expect(duplicate.state).toBe("incomplete")
    expect(duplicate.checks.some((item) => item.status === "invalid")).toBe(true)
    expect(mismatch.state).toBe("incomplete")
    expect(mismatch.invalidEvidenceIDs).toEqual(["proof-001"])
  })

  test("does not mark an empty required-check set verified", () => {
    const result = evaluateProofGate({
      taskID: "RSF-603",
      revision: "abc123",
      requiredChecks: [],
      evidence: [],
    })

    expect(result.state).toBe("incomplete")
  })
})
