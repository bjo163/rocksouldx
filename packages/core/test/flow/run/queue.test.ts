import { describe, expect, test } from "bun:test"
import { parsePlanMarkdown } from "../../../src/flow/plan.js"
import { buildDispatchQueue } from "../../../src/flow/run/queue.js"

function task(input: { id: string; status: string; dependencies?: string }) {
  return [
    "## " + input.id + " — Task " + input.id,
    "",
    "- Status: " + input.status,
    "- Depends on: " + (input.dependencies ?? "none"),
    "- Goal: Build one bounded capability.",
    "- Scope:",
    "  - Keep the implementation focused.",
    "- Acceptance:",
    "  - The behavior is observable.",
    "- Verification:",
    "  - Run the focused test.",
    "- Deliverable: One bounded result.",
    "",
  ].join("\n")
}

describe("buildDispatchQueue", () => {
  test("dispatches only ready tasks with verified dependencies", () => {
    const plan = parsePlanMarkdown(
      task({ id: "RSF-101", status: "verified" }) +
      task({ id: "RSF-102", status: "ready", dependencies: "RSF-101" }) +
      task({ id: "RSF-103", status: "ready", dependencies: "RSF-102" }) +
      task({ id: "RSF-104", status: "planned" }),
    )
    const result = buildDispatchQueue({
      tasks: plan.tasks,
      runs: [],
      maximumConcurrency: 2,
      parallelismAllowed: true,
    })

    expect(result.dispatchCandidates).toEqual(["RSF-102"])
    expect(result.blocked).toContainEqual({ taskID: "RSF-103", reasons: ["dependency-not-verified"] })
    expect(result.blocked).toContainEqual({ taskID: "RSF-104", reasons: ["not-ready"] })
  })

  test("respects active runs, the concurrency cap, and the parallelism switch", () => {
    const plan = parsePlanMarkdown(
      task({ id: "RSF-101", status: "ready" }) +
      task({ id: "RSF-102", status: "ready" }) +
      task({ id: "RSF-103", status: "ready" }),
    )
    const activeRun = { taskID: "RSF-101", state: "running" as const }
    const parallel = buildDispatchQueue({
      tasks: plan.tasks,
      runs: [activeRun],
      maximumConcurrency: 2,
      parallelismAllowed: true,
    })
    expect(parallel.dispatchCandidates).toEqual(["RSF-102"])
    expect(parallel.availableSlots).toBe(1)

    const serial = buildDispatchQueue({
      tasks: plan.tasks,
      runs: [activeRun],
      maximumConcurrency: 4,
      parallelismAllowed: false,
    })
    expect(serial.dispatchCandidates).toEqual([])
    expect(serial.availableSlots).toBe(0)
  })

  test("uses stable plan order when candidates have equal priority", () => {
    const plan = parsePlanMarkdown(
      task({ id: "RSF-102", status: "ready" }) +
      task({ id: "RSF-101", status: "ready" }),
    )
    const result = buildDispatchQueue({
      tasks: plan.tasks,
      runs: [],
      maximumConcurrency: 2,
      parallelismAllowed: true,
    })
    expect(result.dispatchCandidates).toEqual(["RSF-102", "RSF-101"])
  })

  test("reports invalid concurrency rather than silently dispatching", () => {
    const plan = parsePlanMarkdown(task({ id: "RSF-101", status: "ready" }))
    const result = buildDispatchQueue({
      tasks: plan.tasks,
      runs: [],
      maximumConcurrency: 0,
      parallelismAllowed: true,
    })
    expect(result.valid).toBe(false)
    expect(result.dispatchCandidates).toEqual([])
    expect(result.diagnostics).toContain("Maximum concurrency must be a positive safe integer")
  })

  test("does not allow two active runs for the same task to be dispatched again", () => {
    const plan = parsePlanMarkdown(task({ id: "RSF-101", status: "ready" }))
    const result = buildDispatchQueue({
      tasks: plan.tasks,
      runs: [
        { taskID: "RSF-101", state: "queued" },
        { taskID: "RSF-101", state: "running" },
      ],
      maximumConcurrency: 3,
      parallelismAllowed: true,
    })
    expect(result.blocked).toContainEqual({ taskID: "RSF-101", reasons: ["already-active"] })
  })
})
