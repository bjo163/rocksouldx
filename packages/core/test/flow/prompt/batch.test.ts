import { describe, expect, test } from "bun:test"
import { parsePlanMarkdown } from "../../../src/flow/plan.js"
import { compileParallelExecutionBatch, type ParallelPromptRequest } from "../../../src/flow/prompt/batch.js"

const planMarkdown = [
  "# Plan",
  "",
  "## RSF-101 — Verify dependencies",
  "",
  "- Status: verified",
  "- Depends on: none",
  "- Goal: Prepare the repo.",
  "- Scope:",
  "  - Update packages/core/src/flow/shared/**.",
  "- Acceptance: The dependency is verified.",
  "- Verification: Run tests.",
  "- Deliverable: Ready.",
  "",
  "## RSF-102 — Task A",
  "",
  "- Status: ready",
  "- Depends on: RSF-101",
  "- Goal: Implement one task.",
  "- Scope:",
  "  - Update packages/core/src/flow/a/**.",
  "- Acceptance: A is done.",
  "- Verification: Run tests.",
  "- Deliverable: A.",
  "",
  "## RSF-103 — Task B",
  "",
  "- Status: ready",
  "- Depends on: RSF-101",
  "- Goal: Implement another task.",
  "- Scope:",
  "  - Update packages/core/src/flow/b/**.",
  "- Acceptance: B is done.",
  "- Verification: Run tests.",
  "- Deliverable: B.",
  "",
  "## RSF-104 — Task Collision",
  "",
  "- Status: ready",
  "- Depends on: RSF-101",
  "- Goal: Touch the same files as A.",
  "- Scope:",
  "  - Update packages/core/src/flow/a/service.ts.",
  "- Acceptance: Collision is found.",
  "- Verification: Run tests.",
  "- Deliverable: Collision.",
].join("\n")
const plan = parsePlanMarkdown(planMarkdown)
const revision = "a".repeat(40)
const request = (taskID: string, branch: string, suffix: string): ParallelPromptRequest => ({
  taskID,
  repository: {
    projectID: "project-a",
    checkoutID: "checkout-a",
    branch,
    revision,
    dirtyState: "clean",
    dirtyPaths: [],
  },
  execution: {
    worktreeID: "worktree-" + suffix,
    path: "/tmp/worktrees/" + suffix,
    baseRevision: revision,
    writerIsolationValid: true,
    activeWriterCount: 0,
  },
  guidancePaths: ["AGENTS.md", "packages/AGENTS.md", "packages/core/AGENTS.md"],
  sources: [{ path: "packages/core/src/flow/plan.js", purpose: "Plan parser", revision }],
  commands: [],
  existingImplementation: [],
  relevantPackages: ["packages/core"],
})

describe("compileParallelExecutionBatch", () => {
  test("compiles independent tasks into unique isolated packets", () => {
    const result = compileParallelExecutionBatch({
      packetPrefix: "batch",
      generatedAt: "2026-11-05T10:00:00.000Z",
      planPath: "docs/plans/ROCKSOUL-FLOW.plan.md",
      planMarkdown,
      plan,
      repositoryRevision: revision,
      requests: [
        request("RSF-102", "rocksoul/rsf-102", "102"),
        request("RSF-103", "rocksoul/rsf-103", "103"),
      ],
      maximumConcurrency: 2,
    })
    expect(result.status).toBe("compiled")
    expect(result.packets.map((packet) => packet.taskID)).toEqual(["RSF-102", "RSF-103"])
  })

  test("blocks shared paths, shared branches, worktrees, and checkout revision drift", () => {
    const result = compileParallelExecutionBatch({
      packetPrefix: "batch",
      generatedAt: "2026-11-05T10:00:00.000Z",
      planPath: "docs/plans/ROCKSOUL-FLOW.plan.md",
      planMarkdown,
      plan,
      repositoryRevision: revision,
      requests: [
        request("RSF-102", "rocksoul/shared", "same"),
        request("RSF-104", "rocksoul/shared", "same"),
      ],
      maximumConcurrency: 2,
    })
    expect(result.status).toBe("blocked")
    expect(result.collisions).toHaveLength(1)
    expect(result.blockedTasks.some((item) => item.reasons.includes("Two packet requests share the same branch"))).toBe(true)
    expect(result.blockedTasks.some((item) => item.reasons.includes("Two packet requests share the same worktree ID"))).toBe(true)
    expect(result.packets).toEqual([])
  })

  test("respects concurrency and rejects revision mismatch", () => {
    const result = compileParallelExecutionBatch({
      packetPrefix: "batch",
      generatedAt: "2026-11-05T10:00:00.000Z",
      planPath: "docs/plans/ROCKSOUL-FLOW.plan.md",
      planMarkdown,
      plan,
      repositoryRevision: revision,
      requests: [
        request("RSF-102", "rocksoul/rsf-102", "102"),
        { ...request("RSF-103", "rocksoul/rsf-103", "103"), repository: { ...request("RSF-103", "rocksoul/rsf-103", "103").repository, revision: "b".repeat(40) } },
      ],
      maximumConcurrency: 1,
    })
    expect(result.status).toBe("blocked")
    expect(result.diagnostics).toContain("Requested packet count exceeds the maximum concurrency")
    expect(result.blockedTasks.some((item) => item.reasons.some((reason) => reason.includes("revision")))).toBe(true)
  })

  test("requires independent worktrees for parallel writes", () => {
    const result = compileParallelExecutionBatch({
      packetPrefix: "batch",
      generatedAt: "2026-11-05T10:00:00.000Z",
      planPath: "docs/plans/ROCKSOUL-FLOW.plan.md",
      planMarkdown,
      plan,
      repositoryRevision: revision,
      requests: [
        { ...request("RSF-102", "rocksoul/rsf-102", "102"), execution: { ...request("RSF-102", "rocksoul/rsf-102", "102").execution, worktreeID: undefined } },
      ],
      maximumConcurrency: 2,
    })
    expect(result.blockedTasks[0]?.reasons).toContain("Parallel writes require a registered worktree ID")
  })
})
