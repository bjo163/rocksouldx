import { describe, expect, test } from "bun:test"
import { Hash } from "@opencode/util/hash"
import { compileExecutionPrompt } from "../../../src/flow/prompt/compiler.js"
import type { PromptCommand } from "../../../src/flow/prompt/compiler.js"

const planMarkdown = [
  "# Plan",
  "",
  "## RSF-101 — Verify the package inventory",
  "",
  "- Status: verified",
  "- Depends on: none",
  "- Goal: Build a reliable package inventory.",
  "- Scope:",
  "  - Update packages/core/src/flow/repo/**.",
  "- Acceptance:",
  "  - Package inventory is revision bound.",
  "- Verification:",
  "  - Run focused tests.",
  "- Deliverable: Package inventory.",
  "",
  "## RSF-102 — Compile a task prompt",
  "",
  "- Status: ready",
  "- Depends on: RSF-101",
  "- Goal: Produce a one-task local-agent execution packet.",
  "- Scope:",
  "  - Update packages/core/src/flow/prompt/**.",
  "- Acceptance:",
  "  - The packet pins task, plan, repository, and worktree context.",
  "- Verification:",
  "  - Run the prompt compiler tests.",
  "- Deliverable: Deterministic prompt packet.",
  "- Non-goals:",
  "  - Do not dispatch agents.",
].join("\n")
const repo = {
  projectID: "project-a",
  checkoutID: "checkout-a",
  remoteIdentity: "github.com/example/repo",
  branch: "feature/task",
  revision: "a".repeat(40),
  dirtyState: "clean" as const,
  dirtyPaths: [],
}
const execution = {
  worktreeID: "worktree-a",
  checkoutPath: "/tmp/repo",
  path: "/tmp/repo-worktrees/task-102",
  baseRevision: "a".repeat(40),
  writerIsolationValid: true,
  activeWriterCount: 0,
}
const allowed: PromptCommand = {
  id: "core-focused-test",
  required: true,
  decision: {
    status: "allowed",
    command: "bun test test/flow/prompt",
    workingDirectory: "packages/core",
    packagePath: "packages/core",
    scriptName: "test",
    reason: "Exact manifest script and package directory matched",
  },
}

function compile(overrides: Partial<Parameters<typeof compileExecutionPrompt>[0]> = {}) {
  return compileExecutionPrompt({
    packetID: "packet-102",
    generatedAt: "2026-11-05T10:00:00.000Z",
    planPath: "docs/plans/ROCKSOUL-FLOW.plan.md",
    planMarkdown,
    taskID: "RSF-102",
    repository: repo,
    execution,
    guidancePaths: ["AGENTS.md", "packages/AGENTS.md", "packages/core/AGENTS.md"],
    sources: [
      { path: "packages/core/src/flow/plan.js", purpose: "Existing plan parser", revision: repo.revision },
      { path: "packages/core/test/flow/plan.test.ts", purpose: "Parser tests", revision: repo.revision },
    ],
    commands: [allowed],
    existingImplementation: ["Reuse the current Markdown plan parser and do not introduce a second plan format."],
    relevantPackages: ["packages/core — Effect-based core runtime."],
    ...overrides,
  })
}

describe("compileExecutionPrompt", () => {
  test("compiles one task into a deterministic, revision-pinned packet", () => {
    const result = compile()
    expect(result.status).toBe("compiled")
    if (result.status !== "compiled") return
    expect(result.packet.markdown).toContain("Task: RSF-102")
    expect(result.packet.markdown).toContain("Plan SHA-256: " + Hash.sha256(planMarkdown))
    expect(result.packet.markdown).toContain("packages/core/AGENTS.md")
    expect(result.packet.markdown).toContain("bun test test/flow/prompt")
    expect(result.packet.writableScope).toEqual(["packages/core/src/flow/prompt/**"])
    expect(result.packet.hash).toHaveLength(64)
  })

  test("blocks task status, dependencies, dirty state, and writer isolation failures", () => {
    expect(compile({ taskID: "RSF-101" })).toMatchObject({ status: "blocked" })
    expect(compile({ planMarkdown: planMarkdown.replace("Status: verified", "Status: implemented") })).toMatchObject({ status: "blocked" })
    expect(compile({ repository: { ...repo, dirtyState: "dirty", dirtyPaths: ["README.md"] } })).toMatchObject({ status: "blocked" })
    expect(compile({ execution: { ...execution, writerIsolationValid: false } })).toMatchObject({ status: "blocked" })
    expect(compile({ execution: { ...execution, activeWriterCount: 1 } })).toMatchObject({ status: "blocked" })
    expect(compile({ execution: { ...execution, path: "/tmp/repo/.worktrees/task-102" } })).toMatchObject({ status: "blocked" })
  })

  test("requires manifest-approved required commands at exact revisions", () => {
    expect(compile({ commands: [{ ...allowed, decision: { ...allowed.decision, status: "review-required" } }] })).toMatchObject({ status: "blocked" })
    expect(compile({ sources: [{ path: "packages/core/src/a.ts", purpose: "stale", revision: "old" }] })).toMatchObject({ status: "blocked" })
  })

  test("does not leak secret-like text from task content or reuse notes", () => {
    const secretPlan = planMarkdown.replace(
      "Build a reliable package inventory.",
      "Build a package inventory with API_TOKEN=supersecretvalue.",
    )
    const result = compile({
      planMarkdown: secretPlan,
      existingImplementation: ["Do not echo Authorization: Bearer verylongsecretvalue12345"],
    })
    expect(result.status).toBe("compiled")
    if (result.status !== "compiled") return
    expect(result.packet.markdown).not.toContain("supersecretvalue")
    expect(result.packet.markdown).not.toContain("verylongsecretvalue12345")
    expect(result.packet.markdown).toContain("[REDACTED]")
  })

  test("refuses to truncate a packet when its content exceeds the configured budget", () => {
    expect(compile({ maximumCharacters: 5000, existingImplementation: ["x".repeat(6000)] })).toMatchObject({ status: "blocked" })
  })
})
