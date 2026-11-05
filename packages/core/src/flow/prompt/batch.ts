import path from "path"
import { compileExecutionPrompt } from "./compiler.js"
import type {
  PromptCompilationResult,
  PromptPacket,
} from "./compiler.js"
import type { PlanParseResult } from "../plan.js"

export interface ParallelPromptRequest {
  readonly taskID: string
  readonly repository: Parameters<typeof compileExecutionPrompt>[0]["repository"]
  readonly execution: Parameters<typeof compileExecutionPrompt>[0]["execution"]
  readonly guidancePaths: readonly string[]
  readonly sources: Parameters<typeof compileExecutionPrompt>[0]["sources"]
  readonly commands: Parameters<typeof compileExecutionPrompt>[0]["commands"]
  readonly existingImplementation: readonly string[]
  readonly relevantPackages: readonly string[]
}

export interface ParallelPromptCollision {
  readonly firstTaskID: string
  readonly secondTaskID: string
  readonly sharedScopes: readonly string[]
  readonly reason: string
}

export interface ParallelPromptBatchResult {
  readonly status: "compiled" | "blocked"
  readonly packets: readonly PromptPacket[]
  readonly blockedTasks: readonly { taskID: string; reasons: readonly string[] }[]
  readonly collisions: readonly ParallelPromptCollision[]
  readonly diagnostics: readonly string[]
}

function canonicalWorktreePath(value: string): string | undefined {
  if (path.win32.isAbsolute(value)) return path.win32.normalize(value).replaceAll("\\\\", "/").toLowerCase()
  if (path.isAbsolute(value)) return path.resolve(value)
  return undefined
}

function pathContains(parent: string, child: string): boolean {
  return child === parent || child.startsWith(parent.endsWith("/") ? parent : parent + "/")
}

function scopeDirectory(pattern: string): string {
  return pattern.endsWith("/**") ? pattern.slice(0, -3).replace(/\/+$/, "") : pattern
}

function scopesOverlap(left: string, right: string): boolean {
  const a = scopeDirectory(left)
  const b = scopeDirectory(right)
  if (a === b) return true
  if (left.endsWith("/**")) return b.startsWith(a + "/")
  if (right.endsWith("/**")) return a.startsWith(b + "/")
  return a.startsWith(b + "/") || b.startsWith(a + "/")
}

/**
 * Compile multiple independent one-task packets for isolated local agents.
 * This is a planning/compiler operation only; it does not create worktrees or dispatch agents.
 */
export function compileParallelExecutionBatch(input: {
  packetPrefix: string
  generatedAt: string
  planPath: string
  planMarkdown: string
  plan: PlanParseResult
  repositoryRevision: string
  requests: readonly ParallelPromptRequest[]
  maximumConcurrency: number
}): ParallelPromptBatchResult {
  const diagnostics: string[] = []
  if (!input.packetPrefix.trim()) diagnostics.push("Packet prefix is required")
  if (!Number.isSafeInteger(input.maximumConcurrency) || input.maximumConcurrency < 1)
    diagnostics.push("Maximum concurrency must be a positive safe integer")
  if (input.requests.length > input.maximumConcurrency)
    diagnostics.push("Requested packet count exceeds the maximum concurrency")
  if (input.requests.length === 0) diagnostics.push("At least one task is required")

  const seenTasks = new Set<string>()
  const seenBranches = new Set<string>()
  const seenWorktrees = new Set<string>()
  const seenPaths = new Set<string>()
  const blockedTasks: { taskID: string; reasons: string[] }[] = []
  const candidates: { request: ParallelPromptRequest; index: number }[] = []

  for (const [index, request] of input.requests.entries()) {
    const reasons: string[] = []
    if (seenTasks.has(request.taskID)) reasons.push("Task appears more than once in the batch")
    seenTasks.add(request.taskID)
    if (request.repository.revision !== input.repositoryRevision)
      reasons.push("Task repository revision differs from the batch snapshot")
    if (!request.execution.worktreeID) reasons.push("Parallel writes require a registered worktree ID")
    if (!request.execution.writerIsolationValid) reasons.push("Worktree isolation was not independently validated")
    if (request.execution.activeWriterCount !== 0) reasons.push("Worktree already has an active writer")
    if (seenBranches.has(request.repository.branch)) reasons.push("Two packet requests share the same branch")
    seenBranches.add(request.repository.branch)
    if (request.execution.worktreeID && seenWorktrees.has(request.execution.worktreeID))
      reasons.push("Two packet requests share the same worktree ID")
    if (request.execution.worktreeID) seenWorktrees.add(request.execution.worktreeID)
    const path = request.execution.path.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase()
    if (seenPaths.has(path)) reasons.push("Two packet requests share the same physical worktree path")
    if (path) seenPaths.add(path)

    if (reasons.length) blockedTasks.push({ taskID: request.taskID, reasons })
    else candidates.push({ request, index })
  }

  const collisions: ParallelPromptCollision[] = []
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex++) {
    const left = candidates[leftIndex]
    if (!left) continue
    const leftTask = input.plan.tasks.find((task) => task.id === left.request.taskID)
    if (!leftTask) continue
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex++) {
      const right = candidates[rightIndex]
      if (!right) continue
      const rightTask = input.plan.tasks.find((task) => task.id === right.request.taskID)
      if (!rightTask) continue
      const leftScopes = leftTask.fields.Scope ?? ""
      const rightScopes = rightTask.fields.Scope ?? ""
      const paths = leftScopes.match(/(?:packages|services|apps|docs)\/[A-Za-z0-9_.*@/-]+/g) ?? []
      const otherPaths = rightScopes.match(/(?:packages|services|apps|docs)\/[A-Za-z0-9_.*@/-]+/g) ?? []
      const sharedScopes = [...new Set(paths.flatMap((a) =>
        otherPaths.filter((b) => scopesOverlap(a.replace(/[.,;:]+$/g, ""), b.replace(/[.,;:]+$/g, "")))
          .map((b) => a.length <= b.length ? a.replace(/[.,;:]+$/g, "") : b.replace(/[.,;:]+$/g, "")),
      ))].toSorted()
      if (sharedScopes.length) {
        collisions.push({
          firstTaskID: left.request.taskID,
          secondTaskID: right.request.taskID,
          sharedScopes,
          reason: "Parallel packet scopes overlap; compile them separately or split path ownership",
        })
      }
    }
  }

  const collisionTasks = new Set(collisions.flatMap((item) => [item.firstTaskID, item.secondTaskID]))
  const packets: PromptPacket[] = []
  for (const candidate of candidates) {
    const request = candidate.request
    if (collisionTasks.has(request.taskID)) continue
    const result: PromptCompilationResult = compileExecutionPrompt({
      packetID: input.packetPrefix + "-" + request.taskID.toLowerCase(),
      generatedAt: input.generatedAt,
      planPath: input.planPath,
      planMarkdown: input.planMarkdown,
      taskID: request.taskID,
      repository: request.repository,
      execution: request.execution,
      guidancePaths: request.guidancePaths,
      sources: request.sources,
      commands: request.commands,
      existingImplementation: request.existingImplementation,
      relevantPackages: request.relevantPackages,
    })
    if (result.status === "compiled") packets.push(result.packet)
    else blockedTasks.push({ taskID: request.taskID, reasons: result.reasons })
  }

  return {
    status: diagnostics.length === 0 && blockedTasks.length === 0 && collisions.length === 0 && packets.length > 0 ? "compiled" : "blocked",
    packets,
    blockedTasks,
    collisions,
    diagnostics,
  }
}
