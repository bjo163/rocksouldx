import { describe, expect, test } from "bun:test"
import { parseRequirementUnits } from "../../../src/flow/audit/requirements.js"

const requirement = (input: Record<string, unknown> = {}) => ({
  id: "REQ-001",
  title: "Repository scan scope",
  statement: "The scan must inspect one selected project checkout without escaping its root.",
  expectedBehavior: "The inventory is limited to the selected checkout and reports exclusions.",
  constraints: ["Respect VCS ignore rules."],
  nonGoals: ["Do not execute repository scripts."],
  acceptanceCriteria: ["No path outside the root is included.", "Ignored paths are not reported as missing."],
  openQuestions: [],
  sourceRef: "docs/plans/ROCKSOUL-FLOW-REPO-SCAN-POLICY.md",
  ...input,
})

describe("parseRequirementUnits", () => {
  test("parses an explicit requirement without inventing additional intent", () => {
    const source = requirement()
    const result = parseRequirementUnits([source])

    expect(result.readyForAudit).toBe(true)
    expect(result.diagnostics).toEqual([])
    expect(result.requirements).toEqual([
      expect.objectContaining({
        id: "REQ-001",
        title: "Repository scan scope",
        statement: source.statement,
        expectedBehavior: source.expectedBehavior,
        constraints: ["Respect VCS ignore rules."],
        nonGoals: ["Do not execute repository scripts."],
        acceptanceCriteria: [
          "No path outside the root is included.",
          "Ignored paths are not reported as missing.",
        ],
        state: "reviewable",
        unresolvedReasons: [],
      }),
    ])
  })

  test("keeps ambiguous requirements visible as unresolved", () => {
    const result = parseRequirementUnits([
      requirement({
        expectedBehavior: "",
        acceptanceCriteria: [],
        openQuestions: ["Which directories should be treated as generated?"],
      }),
    ])

    expect(result.readyForAudit).toBe(false)
    expect(result.requirements[0]).toMatchObject({
      state: "unresolved",
      unresolvedReasons: ["missing-expected-behavior", "missing-acceptance-criteria", "open-questions"],
      openQuestions: ["Which directories should be treated as generated?"],
    })
  })

  test("reports duplicate and malformed requirement IDs", () => {
    const result = parseRequirementUnits([
      requirement(),
      requirement({ title: "Duplicate requirement" }),
      requirement({ id: "REQ-12" }),
    ])

    expect(result.readyForAudit).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("duplicate-id")
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-id")
  })

  test("rejects malformed entries and non-string list items", () => {
    const result = parseRequirementUnits([
      null,
      requirement({
        constraints: "not-a-list",
        acceptanceCriteria: ["valid", ""],
      }),
    ])

    expect(result.readyForAudit).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-entry")
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-list")
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-list-item")
  })

  test("does not invent missing behavior or acceptance criteria", () => {
    const result = parseRequirementUnits([
      requirement({
        statement: " ",
        expectedBehavior: undefined,
        acceptanceCriteria: undefined,
        constraints: undefined,
        nonGoals: undefined,
      }),
    ])

    expect(result.readyForAudit).toBe(false)
    expect(result.requirements).toEqual([])
    expect(result.diagnostics.map((item) => item.code)).toContain("missing-statement")
  })

  test("requires an array at the boundary", () => {
    const result = parseRequirementUnits({ id: "REQ-001" })

    expect(result).toEqual({
      requirements: [],
      diagnostics: [
        expect.objectContaining({
          code: "expected-array",
          index: 0,
        }),
      ],
      readyForAudit: false,
    })
  })
})
