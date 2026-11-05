import type { PlanTask } from "../plan.js"
import type { ExecutionRunState } from "./association.js"

export interface DispatchQueueRun {
  readonly taskID: string
  readonly state: ExecutionRunState
}

export interface DispatchQueueBlock {
  readonly taskID: string
  readonly reasons: readonly ("not-ready" | "dependency-missing" | "dependency-not-verified" | "already-active")[]
}

export interface DispatchQueueResult {
  readonly valid: boolean
  readonly activeRunCount: number
  readonly availableSlots: number
  readonly dispatchCandidates: readonly string[]
  readonly blocked: readonly DispatchQueueBlock[]
  readonly waitingTaskIDs: readonly string[]
  readonly diagnostics: readonly string[]
}

const ACTIVE_STATES = new Set<ExecutionRunState>(["queued", "running", "waiting"])

/**
 * Compute a deterministic dispatch queue from a validated Markdown plan.
 * This is a scheduler decision only; it does not create sessions or start agents.
 */
export function buildDispatchQueue(input: {
  tasks: readonly PlanTask[]
  runs: readonly DispatchQueueRun[]
  maximumConcurrency: number
  parallelismAllowed: boolean
  /** True only after every active/proposed write run has passed worktree isolation policy. */
  parallelIsolationValid: boolean
  maximumCandidates?: number
}): DispatchQueueResult {
  const diagnostics: string[] = []
  if (!Number.isSafeInteger(input.maximumConcurrency) || input.maximumConcurrency < 1)
    diagnostics.push("Maximum concurrency must be a positive safe integer")

  const byID = new Map<string, PlanTask>()
  for (const task of input.tasks) {
    if (byID.has(task.id)) diagnostics.push("Duplicate task ID in dispatch input: " + task.id)
    byID.set(task.id, task)
  }

  const activeRuns = input.runs.filter((run) => ACTIVE_STATES.has(run.state))
  const activeTaskIDs = new Set(activeRuns.map((run) => run.taskID))
  const blocked: DispatchQueueBlock[] = []
  const eligible: PlanTask[] = []

  for (const task of input.tasks) {
    const reasons: DispatchQueueBlock["reasons"][number][] = []
    if (task.status !== "ready") reasons.push("not-ready")
    if (activeTaskIDs.has(task.id)) reasons.push("already-active")

    for (const dependencyID of task.dependsOn) {
      const dependency = byID.get(dependencyID)
      if (!dependency) {
        reasons.push("dependency-missing")
      } else if (dependency.status !== "verified") {
        reasons.push("dependency-not-verified")
      }
    }

    const uniqueReasons = [...new Set(reasons)]
    if (uniqueReasons.length) blocked.push({ taskID: task.id, reasons: uniqueReasons })
    else eligible.push(task)
  }

  const maxCandidates = Math.max(0, Math.min(100, Math.floor(input.maximumCandidates ?? input.maximumConcurrency)))
  const configuredCapacity = diagnostics.length ? 0 : Math.max(0, input.maximumConcurrency - activeRuns.length)
  const parallelSafe = input.parallelismAllowed && input.parallelIsolationValid
  const availableSlots = parallelSafe ? configuredCapacity : Math.min(configuredCapacity, activeRuns.length === 0 ? 1 : 0)
  const dispatchCandidates = eligible
    .toSorted((a, b) => a.line - b.line || a.id.localeCompare(b.id))
    .slice(0, Math.min(availableSlots, maxCandidates))
    .map((task) => task.id)

  const selected = new Set(dispatchCandidates)
  const waitingTaskIDs = eligible.filter((task) => !selected.has(task.id)).map((task) => task.id)

  return {
    valid: diagnostics.length === 0,
    activeRunCount: activeRuns.length,
    availableSlots,
    dispatchCandidates,
    blocked: blocked.toSorted((a, b) => a.taskID.localeCompare(b.taskID)),
    waitingTaskIDs,
    diagnostics,
  }
}
