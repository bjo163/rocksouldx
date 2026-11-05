import { describe, expect, test } from "bun:test"
import {
  canTransitionExecutionRun,
  validateTaskRunAssociations,
} from "../../../src/flow/run/association.js"
import type { RegisteredWorktree, TaskRunAssociation } from "../../../src/flow/run/association.js"

const worktrees: RegisteredWorktree[] = [
  { id: "wt-a", path: "/tmp/rocksoul-wt-a", branch: "task/a", baseRevision: "base-a" },
  { id: "wt-b", path: "/tmp/rocksoul-wt-b", branch: "task/b", baseRevision: "base-a" },
]

const run = (overrides: Partial<TaskRunAssociation> = {}): TaskRunAssociation => ({
  runID: "run-a",
  taskID: "RSF-502",
  packetID: "packet-a",
  planHash: "plan-hash",
  projectID: "project-a",
  sessionID: "session-a",
  revision: "base-a",
  branch: "main",
  checkoutPath: "/tmp/rocksoul",
  attempt: 1,
  agentID: "agent-a",
  access: "write",
  state: "running",
  createdAt: "2026-11-05T10:00:00.000Z",
  startedAt: "2026-11-05T10:00:01.000Z",
  ...overrides,
})

describe("validateTaskRunAssociations", () => {
  test("accepts a valid run linked to an existing session", () => {
    const result = validateTaskRunAssociations({
      runs: [run()],
      existingSessionIDs: ["session-a"],
      worktrees: [],
    })
    expect(result).toEqual({ valid: true, diagnostics: [] })
  })

  test("keeps two active writers isolated in different registered worktrees", () => {
    const result = validateTaskRunAssociations({
      runs: [
        run({ runID: "run-a", taskID: "RSF-502", worktreeID: "wt-a", branch: "task/a" }),
        run({
          runID: "run-b",
          taskID: "RSF-503",
          sessionID: "session-b",
          worktreeID: "wt-b",
          branch: "task/b",
        }),
      ],
      existingSessionIDs: ["session-a", "session-b"],
      worktrees,
    })
    expect(result.valid).toBe(true)
  })

  test("rejects two active writers on the same physical checkout", () => {
    const result = validateTaskRunAssociations({
      runs: [
        run(),
        run({ runID: "run-b", taskID: "RSF-503", sessionID: "session-b" }),
      ],
      existingSessionIDs: ["session-a", "session-b"],
      worktrees: [],
    })
    expect(result.diagnostics.map((item) => item.code)).toContain("shared-active-writer")
  })

  test("requires retry attempts to reference a terminal previous attempt", () => {
    const result = validateTaskRunAssociations({
      runs: [
        run({ runID: "run-a", state: "failed", endedAt: "2026-11-05T10:03:00.000Z" }),
        run({
          runID: "run-b",
          attempt: 2,
          predecessorRunID: "run-a",
          sessionID: "session-b",
          state: "running",
        }),
      ],
      existingSessionIDs: ["session-a", "session-b"],
      worktrees: [],
    })
    expect(result.valid).toBe(true)

    const activePrevious = validateTaskRunAssociations({
      runs: [
        run({ runID: "run-a" }),
        run({
          runID: "run-b",
          attempt: 2,
          predecessorRunID: "run-a",
          sessionID: "session-b",
        }),
      ],
      existingSessionIDs: ["session-a", "session-b"],
      worktrees: [],
    })
    expect(activePrevious.diagnostics.map((item) => item.code)).toContain("active-retry-predecessor")
  })

  test("rejects missing session/worktree references and invalid timestamps", () => {
    const result = validateTaskRunAssociations({
      runs: [run({
        sessionID: "missing",
        worktreeID: "missing-worktree",
        createdAt: "not-a-date",
      })],
      existingSessionIDs: [],
      worktrees: [],
    })
    expect(result.diagnostics.map((item) => item.code)).toContain("missing-session")
    expect(result.diagnostics.map((item) => item.code)).toContain("missing-worktree")
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-timestamp")
  })
})

describe("canTransitionExecutionRun", () => {
  test("allows forward lifecycle transitions and explicit recovery from blocked", () => {
    expect(canTransitionExecutionRun("queued", "running")).toBe(true)
    expect(canTransitionExecutionRun("running", "waiting")).toBe(true)
    expect(canTransitionExecutionRun("waiting", "running")).toBe(true)
    expect(canTransitionExecutionRun("blocked", "queued")).toBe(true)
  })

  test("does not reopen terminal runs", () => {
    expect(canTransitionExecutionRun("finished", "running")).toBe(false)
    expect(canTransitionExecutionRun("failed", "queued")).toBe(false)
    expect(canTransitionExecutionRun("cancelled", "running")).toBe(false)
  })
})
