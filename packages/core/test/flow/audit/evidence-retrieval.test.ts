import { describe, expect, test } from "bun:test"
import { parseRequirementUnits } from "../../../src/flow/audit/requirements.js"
import { retrieveRequirementEvidence } from "../../../src/flow/audit/evidence-retrieval.js"

const requirements = parseRequirementUnits([
  {
    id: "REQ-101",
    title: "Protect project plan writes",
    statement: "Plan updates must detect concurrent changes and reject paths outside the project root.",
    expectedBehavior: "The writer checks the original content before saving.",
    constraints: ["Only the configured project plan is writable."],
    nonGoals: [],
    acceptanceCriteria: ["Concurrent edits are detected.", "Path traversal is rejected."],
    openQuestions: [],
  },
]).requirements

describe("retrieveRequirementEvidence", () => {
  test("returns revision-bound lexical leads with matching line numbers", () => {
    const result = retrieveRequirementEvidence({
      requirements,
      snapshotRevision: "revision-a",
      sources: [
        {
          path: "packages/core/src/flow/plan/write.ts",
          kind: "source",
          revision: "revision-a",
          content: "export function writePlan() {\n  checkConcurrentChange()\n  rejectPathTraversal()\n}",
        },
        {
          path: "packages/core/test/flow/plan/write.test.ts",
          kind: "test",
          revision: "revision-a",
          content: "test('concurrent edits are detected', () => {})",
        },
        {
          path: "docs/architecture/other.md",
          kind: "docs",
          revision: "revision-a",
          content: "Unrelated visual styling guidance.",
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.candidates.map((item) => item.path)).toEqual([
      "packages/core/src/flow/plan/write.ts",
      "packages/core/test/flow/plan/write.test.ts",
    ])
    expect(result[0]?.candidates[0]?.lineNumbers).toEqual([2, 3])
    expect(result[0]?.candidates.every((item) => item.stale === false)).toBe(true)
  })

  test("keeps stale matches visible but ranks current evidence first", () => {
    const result = retrieveRequirementEvidence({
      requirements,
      snapshotRevision: "revision-b",
      sources: [
        {
          path: "packages/core/src/old-plan.ts",
          kind: "source",
          revision: "revision-a",
          content: "write plan concurrent change project root",
        },
        {
          path: "packages/core/src/current-plan.ts",
          kind: "source",
          revision: "revision-b",
          content: "write plan concurrent change project root",
        },
      ],
    })

    expect(result[0]?.candidates.map((item) => item.stale)).toEqual([false, true])
  })

  test("excludes unsafe and generated paths and applies the candidate limit", () => {
    const result = retrieveRequirementEvidence({
      requirements,
      snapshotRevision: "revision-a",
      maxCandidatesPerRequirement: 1,
      sources: [
        {
          path: "packages/core/src/one.ts",
          kind: "source",
          revision: "revision-a",
          content: "plan concurrent project root",
        },
        {
          path: "packages/core/src/two.ts",
          kind: "source",
          revision: "revision-a",
          content: "plan concurrent project root",
        },
        {
          path: "packages/core/.env",
          kind: "config",
          revision: "revision-a",
          content: "plan concurrent project root",
        },
        {
          path: "packages/core/node_modules/hidden.ts",
          kind: "source",
          revision: "revision-a",
          content: "plan concurrent project root",
        },
      ],
    })

    expect(result[0]?.candidates).toHaveLength(1)
    expect(result[0]?.candidates[0]?.path).toBe("packages/core/src/one.ts")
  })
})
