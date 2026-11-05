import { describe, expect, test } from "bun:test"
import { validateCapabilityFinding } from "../../../src/flow/audit/classification.js"
import type { CapabilityFindingInput } from "../../../src/flow/audit/classification.js"

const finding = (overrides: Partial<CapabilityFindingInput> = {}): CapabilityFindingInput => ({
  id: "finding-001",
  requirementID: "REQ-101",
  classification: "implemented",
  rationale: "Source implementation and focused tests cover the documented criteria.",
  confidence: "high",
  snapshotRevision: "revision-a",
  rubricVersion: "1",
  reviewerState: "accepted",
  scanComplete: true,
  criteria: [
    { id: "criterion-1", state: "satisfied", evidenceIDs: ["source-1", "test-1"] },
  ],
  evidence: [
    { id: "source-1", path: "packages/core/src/feature.ts", kind: "source", revision: "revision-a", criterionID: "criterion-1" },
    { id: "test-1", path: "packages/core/test/feature.test.ts", kind: "test", revision: "revision-a", criterionID: "criterion-1" },
  ],
  ...overrides,
})

describe("validateCapabilityFinding", () => {
  test("accepts an implemented finding only with current source and test evidence", () => {
    expect(validateCapabilityFinding(finding())).toMatchObject({ valid: true, decisionReady: true, staleEvidenceIDs: [] })
  })

  test("does not treat documentation-only evidence as implementation proof", () => {
    const input = finding({
      evidence: [
        { id: "docs-1", path: "docs/feature.md", kind: "docs", revision: "revision-a", criterionID: "criterion-1" },
      ],
      criteria: [{ id: "criterion-1", state: "satisfied", evidenceIDs: ["docs-1"] }],
    })

    const result = validateCapabilityFinding(input)
    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("implemented-needs-source-and-test")
  })

  test("keeps stale evidence visible but prevents a decision-ready result", () => {
    const input = finding({
      evidence: [
        { id: "source-1", path: "packages/core/src/feature.ts", kind: "source", revision: "revision-old", criterionID: "criterion-1" },
        { id: "test-1", path: "packages/core/test/feature.test.ts", kind: "test", revision: "revision-old", criterionID: "criterion-1" },
      ],
    })

    const result = validateCapabilityFinding(input)
    expect(result.staleEvidenceIDs).toEqual(["source-1", "test-1"])
    expect(result.decisionReady).toBe(false)
  })

  test("refuses to classify missing when the scan is incomplete", () => {
    const result = validateCapabilityFinding(finding({
      classification: "missing",
      reviewerState: "accepted",
      scanComplete: false,
      criteria: [{ id: "criterion-1", state: "unmet", evidenceIDs: [] }],
      evidence: [],
    }))

    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("missing-requires-complete-scan")
  })

  test("keeps unreviewed findings separate from accepted decisions", () => {
    const result = validateCapabilityFinding(finding({ reviewerState: "unreviewed" }))
    expect(result.valid).toBe(true)
    expect(result.decisionReady).toBe(false)
  })
})
