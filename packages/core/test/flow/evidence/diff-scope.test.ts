import { describe, expect, test } from "bun:test"
import { parsePlanMarkdown } from "../../../src/flow/plan.js"
import { parseGitNameStatusZ, reviewTaskDiffScope } from "../../../src/flow/evidence/diff-scope.js"

const task = parsePlanMarkdown([
  "# Plan",
  "",
  "## RSF-604 — Review task changes",
  "",
  "- Status: ready",
  "- Depends on: none",
  "- Goal: Review changes against an explicit scope.",
  "- Scope:",
  "  - Update packages/core/src/flow/**.",
  "  - Update docs/plans/.",
  "- Acceptance:",
  "  - Out-of-scope changes are flagged.",
  "- Verification:",
  "  - Run focused tests.",
  "- Deliverable: A scoped diff report.",
].join("\n")).tasks[0]!

describe("parseGitNameStatusZ", () => {
  test("parses additions, modifications, deletions, and rename pairs", () => {
    expect(parseGitNameStatusZ("A\0packages/core/src/new.ts\0M\0packages/core/src/old.ts\0D\0docs/old.md\0R100\0docs/a.md\0docs/b.md\0")).toMatchObject({
      changes: [
        { path: "packages/core/src/new.ts", status: "added" },
        { path: "packages/core/src/old.ts", status: "modified" },
        { path: "docs/old.md", status: "deleted" },
        { path: "docs/b.md", previousPath: "docs/a.md", status: "renamed" },
      ],
      diagnostics: [],
    })
  })

  test("reports malformed and incomplete records", () => {
    const result = parseGitNameStatusZ("R100\0docs/old.md\0")
    expect(result.changes).toEqual([])
    expect(result.diagnostics).toContain("Rename/copy record is missing its source or destination path: R100")
  })
})

describe("reviewTaskDiffScope", () => {
  test("accepts scoped changes and reports files outside task ownership", () => {
    const result = reviewTaskDiffScope({
      task,
      changes: [
        { path: "packages/core/src/flow/new.ts", status: "added" },
        { path: "docs/plans/extra.md", status: "modified" },
        { path: "packages/app/src/other.ts", status: "modified" },
      ],
    })
    expect(result.reviews.map((item) => item.status)).toEqual(["in-scope", "in-scope", "out-of-scope"])
    expect(result.outOfScopePaths).toEqual(["packages/app/src/other.ts"])
    expect(result.valid).toBe(false)
  })

  test("blocks secret paths regardless of a declared scope or exception", () => {
    const result = reviewTaskDiffScope({
      task,
      changes: [{ path: "packages/core/.env", status: "modified" }],
      exceptions: [{ path: "packages/core/.env", reason: "needed", reviewer: "owner" }],
    })
    expect(result.reviews[0]?.status).toBe("sensitive-block")
  })

  test("flags generated paths and does not silently accept them", () => {
    const result = reviewTaskDiffScope({
      task,
      changes: [{ path: "packages/core/src/flow/dist/generated.ts", status: "modified" }],
    })
    expect(result.reviews[0]?.status).toBe("generated-review")
    expect(result.generatedPaths).toEqual(["packages/core/src/flow/dist/generated.ts"])
    expect(result.valid).toBe(false)
  })

  test("requires both sides of a rename to remain inside scope", () => {
    const result = reviewTaskDiffScope({
      task,
      changes: [{ path: "packages/core/src/flow/new.ts", previousPath: "packages/app/src/old.ts", status: "renamed" }],
    })
    expect(result.reviews[0]?.status).toBe("out-of-scope")
  })

  test("records the reviewer on a valid explicit scope exception", () => {
    const result = reviewTaskDiffScope({
      task,
      changes: [{ path: "packages/core/test/flow/extra.test.ts", status: "added" }],
      exceptions: [{ path: "packages/core/test/flow/extra.test.ts", reason: "The test belongs to this task", reviewer: "human-reviewer" }],
    })
    expect(result.reviews[0]).toMatchObject({ status: "in-scope", approvedException: "human-reviewer" })
    expect(result.valid).toBe(true)
  })

  test("refuses unsafe path and requires task scope declarations", () => {
    const result = reviewTaskDiffScope({
      task,
      changes: [{ path: "../outside.ts", status: "modified" }],
    })
    expect(result.blockedPaths).toEqual(["../outside.ts"])
    const empty = parsePlanMarkdown([
      "# Plan",
      "",
      "## RSF-605 — Task without paths",
      "",
      "- Status: ready",
      "- Depends on: none",
      "- Goal: Review.",
      "- Scope: No explicit path.",
      "- Acceptance: One result.",
      "- Verification: Run a test.",
      "- Deliverable: Report.",
    ].join("\n")).tasks[0]!
    expect(reviewTaskDiffScope({ task: empty, changes: [] }).valid).toBe(false)
  })
})
