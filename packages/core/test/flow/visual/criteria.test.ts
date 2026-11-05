import { describe, expect, test } from "bun:test"
import { evaluateVisualAcceptance } from "../../../src/flow/visual/criteria.js"
import type { VisualAcceptanceCriterion, VisualScreenshotEvidence } from "../../../src/flow/visual/criteria.js"

const criteria: VisualAcceptanceCriterion[] = [
  { id: "C-1", taskID: "RSF-803", screenID: "home", kind: "responsive", statement: "Home fits the mobile viewport", required: true, requiresHumanReview: false },
  { id: "C-2", taskID: "RSF-803", screenID: "home", kind: "composition", statement: "The composition matches the approved design DNA", required: true, requiresHumanReview: true },
]

const evidence = (overrides: Partial<VisualScreenshotEvidence> = {}): VisualScreenshotEvidence => ({
  id: "shot-1",
  criterionID: "C-1",
  taskID: "RSF-803",
  repositoryRevision: "revision-a",
  sourceRef: "artifact://screens/home-mobile.png",
  viewport: { width: 390, height: 844 },
  theme: "dark",
  screenState: "default",
  capturedAt: "2026-11-05T10:00:00.000Z",
  ...overrides,
})

describe("evaluateVisualAcceptance", () => {
  test("requires current screenshot metadata and a human decision for subjective criteria", () => {
    const result = evaluateVisualAcceptance({
      taskID: "RSF-803",
      repositoryRevision: "revision-a",
      criteria,
      evidence: [
        evidence(),
        evidence({
          id: "shot-2",
          criterionID: "C-2",
          humanReview: {
            reviewer: "designer",
            decision: "accepted",
            reviewedAt: "2026-11-05T10:02:00.000Z",
            reason: "Composition matches the approved profile.",
          },
        }),
      ],
    })
    expect(result.ready).toBe(true)
  })

  test("does not pass subjective criteria from a screenshot without human review", () => {
    const result = evaluateVisualAcceptance({
      taskID: "RSF-803",
      repositoryRevision: "revision-a",
      criteria,
      evidence: [evidence(), evidence({ id: "shot-2", criterionID: "C-2" })],
    })
    expect(result.ready).toBe(false)
    expect(result.decisions.find((item) => item.criterionID === "C-2")?.status).toBe("needs-human-review")
  })

  test("keeps stale or incomplete screenshot evidence visible but not verified", () => {
    const result = evaluateVisualAcceptance({
      taskID: "RSF-803",
      repositoryRevision: "revision-b",
      criteria,
      evidence: [evidence(), evidence({ id: "shot-2", criterionID: "C-2", repositoryRevision: "revision-b", viewport: { width: 0, height: 0 } })],
    })
    expect(result.ready).toBe(false)
    expect(result.decisions.map((item) => item.status)).toEqual(["stale-evidence", "stale-evidence"])
  })

  test("respects explicit rejection and optional criteria", () => {
    const result = evaluateVisualAcceptance({
      taskID: "RSF-803",
      repositoryRevision: "revision-a",
      criteria: [
        ...criteria,
        { id: "C-3", taskID: "RSF-803", screenID: "home", kind: "interaction", statement: "Optional hover detail", required: false, requiresHumanReview: false },
      ],
      evidence: [
        evidence(),
        evidence({
          id: "shot-2",
          criterionID: "C-2",
          humanReview: {
            reviewer: "designer",
            decision: "rejected",
            reviewedAt: "2026-11-05T10:02:00.000Z",
            reason: "Typography hierarchy is not approved.",
          },
        }),
      ],
    })
    expect(result.ready).toBe(false)
    expect(result.decisions.find((item) => item.criterionID === "C-2")?.status).toBe("rejected")
    expect(result.decisions.find((item) => item.criterionID === "C-3")?.status).toBe("verified")
  })
})
