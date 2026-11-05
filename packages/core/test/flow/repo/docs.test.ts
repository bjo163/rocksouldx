import { describe, expect, test } from "bun:test"
import {
  applicableGuidance,
  analyzeDocumentationInventory,
} from "../../../src/flow/repo/docs.js"

describe("analyzeDocumentationInventory", () => {
  test("classifies guidance, documentation, plans, and architecture records", () => {
    const result = analyzeDocumentationInventory([
      "README.md",
      "AGENTS.md",
      "docs/README.md",
      "docs/architecture/ADR-0001-boundary.md",
      "docs/product/ROCKSOUL-FLOW.md",
      "docs/plans/ROCKSOUL-FLOW.plan.md",
      "docs/audits/ROCKSOUL-FLOW-CAPABILITY-INVENTORY.md",
      "packages/core/AGENTS.md",
      "packages/core/README.md",
      "CONTRIBUTING.md",
      "packages/core/src/index.ts",
      "packages/core/node_modules/pkg/README.md",
      "../outside/README.md",
      "C:\\repo\\README.md",
    ])

    expect(result.rootReadme).toBe("README.md")
    expect(result.docsIndex).toBe("docs/README.md")
    expect(result.guidance).toEqual(["AGENTS.md", "packages/core/AGENTS.md"])
    expect(result.plans).toEqual(["docs/plans/ROCKSOUL-FLOW.plan.md"])
    expect(result.architectures).toEqual(["docs/architecture/ADR-0001-boundary.md"])
    expect(result.entries.map((item) => item.kind)).toContain("product")
    expect(result.entries.map((item) => item.kind)).toContain("audit")
    expect(result.entries.map((item) => item.kind)).toContain("contributing")
    expect(result.entries).toHaveLength(10)
  })

  test("normalizes and deduplicates equivalent Markdown paths", () => {
    const result = analyzeDocumentationInventory([
      "./docs/README.md",
      "docs\\README.md",
      "docs/README.md",
      "docs/README.md/",
      "docs/plans/plan.md",
    ])

    expect(result.entries.map((item) => item.path)).toEqual(["docs/README.md", "docs/plans/plan.md"])
  })
})

describe("applicableGuidance", () => {
  test("returns root-to-leaf instructions for one source file", () => {
    expect(
      applicableGuidance("packages/core/src/tool/plan.ts", [
        "packages/core/src/tool/AGENTS.md",
        "AGENTS.md",
        "packages/core/AGENTS.md",
        "packages/AGENTS.md",
        "packages/app/AGENTS.md",
        "packages/core/src/AGENTS.md",
      ]),
    ).toEqual([
      "AGENTS.md",
      "packages/AGENTS.md",
      "packages/core/AGENTS.md",
      "packages/core/src/AGENTS.md",
      "packages/core/src/tool/AGENTS.md",
    ])
  })

  test("does not apply sibling or path-traversing instruction files", () => {
    expect(
      applicableGuidance("../packages/core/src/tool/plan.ts", [
        "AGENTS.md",
        "packages/core/src/tool/AGENTS.md",
      ]),
    ).toEqual([])
    expect(
      applicableGuidance("packages/core/src/plan.ts", [
        "AGENTS.md",
        "packages/app/AGENTS.md",
        "packages/core/src/tool/AGENTS.md",
      ]),
    ).toEqual(["AGENTS.md"])
  })
})
