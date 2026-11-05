import { describe, expect, test } from "bun:test"
import { parsePlanMarkdown } from "../../../src/flow/plan.js"
import { analyzePlanTaskOverlap } from "../../../src/flow/audit/plan-overlap.js"

function task(input: {
  id: string
  title: string
  goal: string
  scope: string
  acceptance: string
  dependencies?: string
}) {
  return [
    "## " + input.id + " — " + input.title,
    "",
    "- Status: planned",
    "- Depends on: " + (input.dependencies ?? "none"),
    "- Goal: " + input.goal,
    "- Scope:",
    "  - " + input.scope,
    "- Acceptance:",
    "  - " + input.acceptance,
    "- Verification:",
    "  - Run the focused unit test.",
    "- Deliverable: One bounded result.",
    "",
  ].join("\n")
}

describe("analyzePlanTaskOverlap", () => {
  test("finds a possible duplicate but requires human review", () => {
    const parsed = parsePlanMarkdown(
      task({
        id: "RSF-101",
        title: "Build repository module map",
        goal: "Create a repository structure and module map.",
        scope: "Inspect packages/core/src and map module ownership.",
        acceptance: "The module map links packages and entry points.",
      }) +
      task({
        id: "RSF-102",
        title: "Create repository structure map",
        goal: "Build a repository module map.",
        scope: "Inspect packages/core/src and map module ownership.",
        acceptance: "The module map links packages and entry points.",
      }),
    )
    const result = analyzePlanTaskOverlap({ tasks: parsed.tasks, revision: "revision-a" })

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      firstTaskID: "RSF-101",
      secondTaskID: "RSF-102",
      relationship: "possible-duplicate",
      requiresHumanReview: true,
      sharedPaths: ["packages/core/src"],
    })
  })

  test("detects scope overlap even when task intentions differ", () => {
    const parsed = parsePlanMarkdown(
      task({
        id: "RSF-101",
        title: "Add parser diagnostics",
        goal: "Report malformed task fields.",
        scope: "Update packages/core/src/flow/plan.ts.",
        acceptance: "Invalid fields report a source line.",
      }) +
      task({
        id: "RSF-102",
        title: "Preserve metadata",
        goal: "Keep unknown user task metadata.",
        scope: "Update packages/core/src/flow/plan.ts.",
        acceptance: "Unknown fields remain unchanged.",
      }),
    )
    const result = analyzePlanTaskOverlap({ tasks: parsed.tasks, revision: "revision-a" })

    expect(result.findings[0]).toMatchObject({
      relationship: "scope-overlap",
      sharedPaths: ["packages/core/src/flow/plan.ts"],
    })
  })

  test("does not label explicitly dependent tasks as duplicates", () => {
    const parsed = parsePlanMarkdown(
      task({
        id: "RSF-101",
        title: "Create repository scanner",
        goal: "Discover repository manifests.",
        scope: "Inspect package manifests.",
        acceptance: "The scanner lists package scripts.",
      }) +
      task({
        id: "RSF-102",
        title: "Render scanner results",
        goal: "Display the repository inventory.",
        scope: "Build Repo Radar UI.",
        acceptance: "The UI displays the inventory.",
        dependencies: "RSF-101",
      }),
    )
    const result = analyzePlanTaskOverlap({ tasks: parsed.tasks, revision: "revision-a" })

    expect(result.findings[0]?.relationship).toBe("complementary")
  })

  test("returns deterministic empty output for unrelated tasks", () => {
    const parsed = parsePlanMarkdown(
      task({
        id: "RSF-101",
        title: "Tune the visual theme",
        goal: "Adjust desktop color tokens.",
        scope: "Update packages/ui/src/theme.",
        acceptance: "The theme renders with the requested palette.",
      }) +
      task({
        id: "RSF-102",
        title: "Document the API",
        goal: "Describe the HTTP response contract.",
        scope: "Update docs/api.",
        acceptance: "The API reference lists the response fields.",
      }),
    )
    expect(analyzePlanTaskOverlap({ tasks: parsed.tasks, revision: "revision-a" }).findings).toEqual([])
  })
})
