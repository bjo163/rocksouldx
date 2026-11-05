import { describe, expect, test } from "bun:test"
import { parsePlanMarkdown } from "../../src/flow/plan.js"

const task = (input: {
  id?: string
  title?: string
  status?: string
  dependencies?: string
  extra?: string
} = {}) => {
  const id = input.id ?? "RSF-101"
  const title = input.title ?? "Example task"
  const status = input.status ?? "planned"
  const dependencies = input.dependencies ?? "none"

  return `## ${id} — ${title}

- Status: ${status}
- Depends on: ${dependencies}
- Goal: Build one bounded capability.
- Scope:
  - Keep the change focused.
- Acceptance:
  - The behavior is observable.
- Verification:
  - Run the focused unit test.
- Deliverable: Source and tests.
${input.extra ? `- ${input.extra}\n` : ""}`
}

describe("parsePlanMarkdown", () => {
  test("parses tasks, dependencies, source ranges, and unknown metadata", () => {
    const source = `# Plan

# M1 — Example

${task({ id: "RSF-101", title: "First task", extra: "Owner: Radar lane" })}
${task({ id: "RSF-102", title: "Second task", dependencies: "RSF-101" })}`
    const result = parsePlanMarkdown(source)

    expect(result.valid).toBe(true)
    expect(result.diagnostics).toEqual([])
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[0]).toMatchObject({
      id: "RSF-101",
      title: "First task",
      status: "planned",
      dependsOn: [],
      metadata: { Owner: "Radar lane" },
      fieldLines: { Status: 7, "Depends on": 8 },
    })
    expect(result.tasks[0]?.raw).toContain("- Owner: Radar lane")
    expect(result.tasks[0]?.line).toBeGreaterThan(1)
    expect(result.tasks[0]?.endLine).toBeLessThan(result.tasks[1]?.line ?? 0)
    expect(result.tasks[1]?.dependsOn).toEqual(["RSF-101"])
  })

  test("reports task-like headings that do not follow the documented format", () => {
    const source = `## RSF-123 Missing separator

- Status: planned
- Depends on: none
- Goal: A goal.
- Scope: One scope.
- Acceptance: One criterion.
- Verification: Run the focused test.
- Deliverable: One artifact.
`
    const result = parsePlanMarkdown(source)

    expect(result.tasks).toHaveLength(1)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "malformed-task-heading",
        taskID: "RSF-123",
        line: 1,
      }),
    )
  })

  test("reports task IDs that are duplicated", () => {
    const result = parsePlanMarkdown(task({ id: "RSF-101" }) + task({ id: "RSF-101", title: "Duplicate" }))

    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("duplicate-task-id")
  })

  test("reports missing dependency references", () => {
    const result = parsePlanMarkdown(task({ id: "RSF-101", dependencies: "RSF-999" }))

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "missing-dependency",
        taskID: "RSF-101",
        dependencyID: "RSF-999",
        line: 4,
      }),
    )
  })

  test("reports invalid status and missing required fields", () => {
    const source = `## RSF-101 — Incomplete task

- Status: finished
- Depends on: none
- Goal: A goal.
`
    const result = parsePlanMarkdown(source)

    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-status")
    expect(result.diagnostics.filter((item) => item.code === "missing-required-field")).toHaveLength(4)
  })

  test("rejects blank required values and empty dependency declarations", () => {
    const source = task({ id: "RSF-101", status: "", dependencies: "" }).replace(
      "- Acceptance:\n  - The behavior is observable.",
      "- Acceptance:",
    )
    const result = parsePlanMarkdown(source)

    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-status")
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-dependency")
    expect(result.diagnostics.map((item) => item.code)).toContain("empty-required-field")
  })

  test("reports dependency cycles", () => {
    const source =
      task({ id: "RSF-101", dependencies: "RSF-102" }) +
      task({ id: "RSF-102", dependencies: "RSF-101" })
    const result = parsePlanMarkdown(source)

    expect(result.valid).toBe(false)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dependency-cycle",
      }),
    )
  })

  test("reports malformed dependency IDs", () => {
    const result = parsePlanMarkdown(task({ id: "RSF-101", dependencies: "not-a-task-id" }))

    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-dependency")
  })

  test("does not rewrite the input Markdown and reports an empty plan", () => {
    const source = "# Plan\r\n\r\nNo task sections yet.\r\n"
    const result = parsePlanMarkdown(source)

    expect(result.tasks).toEqual([])
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "no-tasks",
        line: 1,
      }),
    ])
    expect(source).toBe("# Plan\r\n\r\nNo task sections yet.\r\n")
  })
})
