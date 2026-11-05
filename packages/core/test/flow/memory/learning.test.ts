import { describe, expect, test } from "bun:test"
import {
  extractLearningCandidates,
  reviewLearningRecord,
  validateLearningRecord,
} from "../../../src/flow/memory/learning.js"
import type { LearningObservation, LearningRecord } from "../../../src/flow/memory/learning.js"

const observation = (overrides: Partial<LearningObservation> = {}): LearningObservation => ({
  id: "learning-1",
  category: "verified_fact",
  statement: "The package manifest analyzer must expose each script's package directory.",
  confidence: "high",
  sourceSessionID: "session-1",
  projectID: "project-1",
  repositoryRevision: "revision-1",
  evidence: [{ kind: "test", reference: "packages/core/test/flow/manifests.test.ts", revision: "revision-1" }],
  nonObvious: true,
  completedRun: true,
  privacyAssessment: "clear",
  proposedDestination: "docs/architecture/ROCKSOUL-FLOW-ARCHITECTURE.md",
  proposedDiff: "+ Script packagePath is the package directory.",
  ...overrides,
})

const record = (overrides: Partial<LearningRecord> = {}): LearningRecord => ({
  ...observation(),
  reviewState: "candidate",
  ...overrides,
})

describe("extractLearningCandidates", () => {
  test("emits a review-only candidate from completed, non-obvious, evidenced work", () => {
    const result = extractLearningCandidates({ observations: [observation()] })
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0]).toMatchObject({ id: "learning-1", reviewState: "candidate" })
  })

  test("defers incomplete, obvious, low-confidence, and privacy-unclear observations", () => {
    const result = extractLearningCandidates({
      observations: [
        observation({ id: "incomplete", completedRun: false }),
        observation({ id: "obvious", nonObvious: false }),
        observation({ id: "low", confidence: "low" }),
        observation({ id: "sensitive", privacyAssessment: "sensitive" }),
        observation({ id: "unknown", privacyAssessment: "uncertain" }),
      ],
    })
    expect(result.candidates).toEqual([])
    expect(result.deferred).toHaveLength(5)
  })

  test("does not resurface an unchanged rejected candidate but permits new provenance", () => {
    const rejected = record({
      reviewState: "rejected",
      reviewer: "human",
      reviewedAt: "2026-11-05T10:00:00.000Z",
      reviewReason: "Not useful yet",
    })
    const same = observation({ id: "same-id-new", statement: "The package manifest analyzer must expose each script's package directory." })
    const changedEvidence = observation({
      id: "new-evidence",
      evidence: [{ kind: "test", reference: "packages/core/test/flow/manifests.test.ts", revision: "revision-2" }],
      repositoryRevision: "revision-2",
    })
    const result = extractLearningCandidates({ observations: [same, changedEvidence], existing: [rejected] })
    expect(result.deferred[0]?.reason).toContain("already exists")
    expect(result.candidates.map((item) => item.id)).toEqual(["new-evidence"])
  })
})

describe("validateLearningRecord", () => {
  test("keeps rejected records durable without making them writable", () => {
    const rejected = record({
      reviewState: "rejected",
      reviewer: "human",
      reviewedAt: "2026-11-05T10:00:00.000Z",
      reviewReason: "Already documented",
    })
    expect(validateLearningRecord({ record: rejected })).toMatchObject({ valid: true, writeEligible: false })
  })

  test("requires current provenance and a safe Markdown destination", () => {
    const result = validateLearningRecord({
      record: record({
        evidence: [{ kind: "source", reference: "packages/core/src/feature.ts", revision: "revision-old" }],
        proposedDestination: "../outside.md",
      }),
    })
    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("stale-evidence")
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-destination")
  })

  test("does not accept sensitive, uncertain, or duplicate content", () => {
    const sensitive = validateLearningRecord({ record: record({ privacyAssessment: "sensitive" }) })
    expect(sensitive.diagnostics.map((item) => item.code)).toContain("sensitive-learning")
    const duplicate = validateLearningRecord({ record: record(), existing: [record({ id: "other" })] })
    expect(duplicate.diagnostics.map((item) => item.code)).toContain("duplicate-learning")
  })
})

describe("reviewLearningRecord", () => {
  test("requires a human reviewer and reason and permits explicit acceptance", () => {
    const result = reviewLearningRecord({
      record: record(),
      decision: "accepted",
      reviewer: "project-owner",
      reviewedAt: "2026-11-05T12:00:00.000Z",
      reason: "Verified against source and tests.",
    })
    expect(result.record).toMatchObject({
      reviewState: "accepted",
      reviewer: "project-owner",
      reviewReason: "Verified against source and tests.",
    })
  })

  test("requires a replacement reference and refuses a second review", () => {
    const noTarget = reviewLearningRecord({
      record: record(),
      decision: "superseded",
      reviewer: "human",
      reviewedAt: "2026-11-05T12:00:00.000Z",
      reason: "Replaced",
    })
    expect(noTarget.diagnostics.map((item) => item.code)).toContain("superseded-target-required")

    const accepted = reviewLearningRecord({
      record: record(),
      decision: "accepted",
      reviewer: "human",
      reviewedAt: "2026-11-05T12:00:00.000Z",
      reason: "Accepted",
    }).record!
    expect(reviewLearningRecord({
      record: accepted,
      decision: "rejected",
      reviewer: "human",
      reviewedAt: "2026-11-05T12:01:00.000Z",
      reason: "Too late",
    }).diagnostics.map((item) => item.code)).toContain("invalid-review")
  })
})
