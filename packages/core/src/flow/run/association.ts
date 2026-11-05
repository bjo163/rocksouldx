import path from "node:path"

export type ExecutionRunState = "queued" | "running" | "waiting" | "blocked" | "failed" | "cancelled" | "finished"
export type ExecutionRunAccess = "read" | "write"

export interface RegisteredWorktree {
  readonly id: string
  readonly path: string
  readonly branch: string
  readonly baseRevision: string
}

export interface TaskRunAssociation {
  readonly runID: string
  readonly taskID: string
  readonly packetID: string
  readonly planHash: string
  readonly projectID: string
  readonly sessionID: string
  readonly revision: string
  readonly branch: string
  readonly checkoutPath: string
  readonly worktreeID?: string
  readonly attempt: number
  readonly agentID: string
  readonly access: ExecutionRunAccess
  readonly state: ExecutionRunState
  readonly predecessorRunID?: string
  readonly createdAt: string
  readonly startedAt?: string
  readonly endedAt?: string
}

export interface TaskRunDiagnostic {
  readonly code:
    | "missing-identity"
    | "invalid-attempt"
    | "invalid-state"
    | "invalid-access"
    | "invalid-checkout-path"
    | "invalid-timestamp"
    | "invalid-lifecycle-time"
    | "duplicate-run"
    | "duplicate-task-attempt"
    | "missing-session"
    | "missing-worktree"
    | "worktree-identity-mismatch"
    | "missing-predecessor"
    | "invalid-predecessor"
    | "active-retry-predecessor"
    | "duplicate-active-task"
    | "duplicate-active-session"
    | "shared-active-writer"
  readonly runID?: string
  readonly message: string
}

export interface TaskRunAssociationValidation {
  readonly valid: boolean
  readonly diagnostics: readonly TaskRunDiagnostic[]
}

const STATES: readonly string[] = ["queued", "running", "waiting", "blocked", "failed", "cancelled", "finished"]
const ACCESS: readonly string[] = ["read", "write"]
const ACTIVE_STATES = new Set<ExecutionRunState>(["queued", "running", "waiting"])
const TERMINAL_STATES = new Set<ExecutionRunState>(["failed", "cancelled", "finished"])

function absolutePath(input: string): string | undefined {
  const value = input.trim()
  if (path.win32.isAbsolute(value)) return path.win32.normalize(value).replaceAll("\\", "/").toLowerCase()
  if (path.posix.isAbsolute(value)) return path.posix.normalize(value)
  return undefined
}

function containsPath(parent: string, child: string): boolean {
  if (parent === child) return true
  const prefix = parent.endsWith("/") ? parent : parent + "/"
  return child.startsWith(prefix)
}

function active(run: TaskRunAssociation): boolean {
  return ACTIVE_STATES.has(run.state)
}

function writerPath(run: TaskRunAssociation, worktrees: ReadonlyMap<string, RegisteredWorktree>): string | undefined {
  const worktree = run.worktreeID ? worktrees.get(run.worktreeID) : undefined
  return absolutePath(worktree?.path ?? run.checkoutPath)
}

/**
 * Validate links from FLOW tasks to existing sessions and registered worktrees.
 * The function does not create sessions/worktrees or dispatch agent work.
 */
export function validateTaskRunAssociations(input: {
  runs: readonly TaskRunAssociation[]
  existingSessionIDs: readonly string[]
  worktrees: readonly RegisteredWorktree[]
}): TaskRunAssociationValidation {
  const diagnostics: TaskRunDiagnostic[] = []
  const fail = (code: TaskRunDiagnostic["code"], message: string, runID?: string) =>
    diagnostics.push({ code, message, ...(runID ? { runID } : {}) })

  const sessions = new Set(input.existingSessionIDs)
  const worktrees = new Map<string, RegisteredWorktree>()
  for (const worktree of input.worktrees) {
    if (!worktree.id.trim() || !worktree.path.trim() || !worktree.branch.trim() || !worktree.baseRevision.trim()) continue
    if (worktrees.has(worktree.id)) fail("worktree-identity-mismatch", "Duplicate registered worktree ID: " + worktree.id)
    worktrees.set(worktree.id, worktree)
  }

  const runIDs = new Set<string>()
  const attempts = new Set<string>()
  const byRunID = new Map(input.runs.map((run) => [run.runID, run]))
  const activeTasks = new Set<string>()
  const activeSessions = new Set<string>()
  const activeWriterPaths = new Map<string, string>()

  for (const run of input.runs) {
    if (
      !run.runID.trim() || !run.taskID.trim() || !run.packetID.trim() || !run.planHash.trim() ||
      !run.projectID.trim() || !run.sessionID.trim() || !run.revision.trim() || !run.branch.trim() || !run.agentID.trim()
    ) fail("missing-identity", "Run, task, packet, plan, project, session, revision, branch, and agent identities are required", run.runID)

    if (!Number.isSafeInteger(run.attempt) || run.attempt < 1) fail("invalid-attempt", "Attempt must be a positive safe integer", run.runID)
    if (!STATES.includes(run.state)) fail("invalid-state", "Run state is not recognized", run.runID)
    if (!ACCESS.includes(run.access)) fail("invalid-access", "Run access must be read or write", run.runID)
    if (runIDs.has(run.runID)) fail("duplicate-run", "Run IDs must be unique: " + run.runID, run.runID)
    runIDs.add(run.runID)

    const attemptKey = run.taskID + "#" + run.attempt
    if (attempts.has(attemptKey)) fail("duplicate-task-attempt", "Task attempt is duplicated: " + attemptKey, run.runID)
    attempts.add(attemptKey)

    if (!sessions.has(run.sessionID)) fail("missing-session", "Run references an unknown existing session: " + run.sessionID, run.runID)

    const checkout = absolutePath(run.checkoutPath)
    if (!checkout) fail("invalid-checkout-path", "Checkout path must be absolute", run.runID)

    if (run.worktreeID) {
      const worktree = worktrees.get(run.worktreeID)
      if (!worktree) {
        fail("missing-worktree", "Run references an unknown registered worktree: " + run.worktreeID, run.runID)
      } else {
        if (!absolutePath(worktree.path) || worktree.branch !== run.branch || worktree.baseRevision !== run.revision)
          fail("worktree-identity-mismatch", "Run branch/revision must match its registered worktree identity", run.runID)
      }
    }

    if (!Number.isFinite(Date.parse(run.createdAt))) fail("invalid-timestamp", "Run creation time must be valid", run.runID)
    if (run.startedAt && !Number.isFinite(Date.parse(run.startedAt))) fail("invalid-timestamp", "Run start time must be valid", run.runID)
    if (run.endedAt && !Number.isFinite(Date.parse(run.endedAt))) fail("invalid-timestamp", "Run end time must be valid", run.runID)
    if (run.state === "queued" && run.startedAt) fail("invalid-lifecycle-time", "Queued runs cannot have a start time", run.runID)
    if ((run.state === "running" || run.state === "waiting") && !run.startedAt)
      fail("invalid-lifecycle-time", "Running/waiting runs require a start time", run.runID)
    if (TERMINAL_STATES.has(run.state) && run.state !== "cancelled" && !run.endedAt)
      fail("invalid-lifecycle-time", "Finished/failed runs require an end time", run.runID)
    if (run.endedAt && !TERMINAL_STATES.has(run.state))
      fail("invalid-lifecycle-time", "Only terminal runs may have an end time", run.runID)

    if (run.attempt === 1 && run.predecessorRunID)
      fail("invalid-predecessor", "The first attempt cannot have a predecessor", run.runID)
    if (run.attempt > 1) {
      if (!run.predecessorRunID) {
        fail("missing-predecessor", "A retry must reference its previous attempt", run.runID)
      } else {
        const predecessor = byRunID.get(run.predecessorRunID)
        if (!predecessor || predecessor.taskID !== run.taskID || predecessor.attempt !== run.attempt - 1)
          fail("invalid-predecessor", "Retry predecessor must be the immediately previous attempt of the same task", run.runID)
        else if (!TERMINAL_STATES.has(predecessor.state))
          fail("active-retry-predecessor", "A retry cannot start while its predecessor is not terminal", run.runID)
      }
    }

    if (!active(run)) continue
    if (activeTasks.has(run.taskID)) fail("duplicate-active-task", "A task may have only one active run: " + run.taskID, run.runID)
    activeTasks.add(run.taskID)
    if (activeSessions.has(run.sessionID)) fail("duplicate-active-session", "An existing session cannot host concurrent active runs", run.runID)
    activeSessions.add(run.sessionID)

    if (run.access === "write") {
      const location = writerPath(run, worktrees)
      if (location) {
        const previous = activeWriterPaths.get(location)
        if (previous) fail("shared-active-writer", "Active write runs share the same physical checkout/worktree: " + previous + " and " + run.runID, run.runID)
        activeWriterPaths.set(location, run.runID)
      }
    }
  }

  return { valid: diagnostics.length === 0, diagnostics }
}

/** Terminal runs cannot move backwards; blocked work must be explicitly re-queued. */
export function canTransitionExecutionRun(current: ExecutionRunState, next: ExecutionRunState): boolean {
  const transitions: Record<ExecutionRunState, readonly ExecutionRunState[]> = {
    queued: ["running", "blocked", "cancelled"],
    running: ["waiting", "blocked", "failed", "cancelled", "finished"],
    waiting: ["running", "blocked", "failed", "cancelled", "finished"],
    blocked: ["queued", "cancelled"],
    failed: [],
    cancelled: [],
    finished: [],
  }
  return current === next || transitions[current].includes(next)
}
