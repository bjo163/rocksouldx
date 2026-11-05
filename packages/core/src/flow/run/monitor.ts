import type { ExecutionRunState } from "./association.js"
import { canTransitionExecutionRun } from "./association.js"

export type RunMonitorEventType = "started" | "waiting" | "requeued" | "blocked" | "failed" | "cancelled" | "finished"

export interface RunMonitorEvent {
  readonly eventID: string
  readonly runID: string
  readonly revision: string
  readonly sequence: number
  readonly type: RunMonitorEventType
  readonly occurredAt: string
  readonly reason?: string
}

export interface RunMonitorTimelineEntry {
  readonly eventID: string
  readonly sequence: number
  readonly type: RunMonitorEventType
  readonly occurredAt: string
  readonly reason?: string
}

export interface RunMonitorProjection {
  readonly runID: string
  readonly taskID: string
  readonly attempt: number
  readonly sessionID: string
  readonly revision: string
  readonly state: ExecutionRunState
  readonly lastSequence: number
  readonly lastEventID?: string
  readonly updatedAt: string
  readonly timeline: readonly RunMonitorTimelineEntry[]
}

export type RunMonitorApplyStatus = "applied" | "duplicate" | "stale" | "rejected"

export interface RunMonitorApplyResult {
  readonly status: RunMonitorApplyStatus
  readonly projection: RunMonitorProjection
  readonly reason?: string
}

const EVENT_STATE: Record<RunMonitorEventType, ExecutionRunState> = {
  started: "running",
  waiting: "waiting",
  requeued: "queued",
  blocked: "blocked",
  failed: "failed",
  cancelled: "cancelled",
  finished: "finished",
}
const TERMINAL = new Set<ExecutionRunState>(["failed", "cancelled", "finished"])
const REASON_REQUIRED = new Set<RunMonitorEventType>(["blocked", "failed", "cancelled"])

/** Create an initial projection for one already-created queued run. */
export function createRunMonitorProjection(input: {
  runID: string
  taskID: string
  attempt: number
  sessionID: string
  revision: string
  createdAt: string
}): RunMonitorProjection {
  return {
    runID: input.runID,
    taskID: input.taskID,
    attempt: input.attempt,
    sessionID: input.sessionID,
    revision: input.revision,
    state: "queued",
    lastSequence: 0,
    updatedAt: input.createdAt,
    timeline: [],
  }
}

/**
 * Apply one revision-bound runtime event to a monitor projection.
 * Events are ordered and deduplicated; transcripts and command output remain owned by Session/Evidence.
 */
export function applyRunMonitorEvent(input: {
  projection: RunMonitorProjection
  event: RunMonitorEvent
}): RunMonitorApplyResult {
  const { projection, event } = input
  const reject = (status: RunMonitorApplyStatus, reason: string): RunMonitorApplyResult => ({ status, projection, reason })

  if (!event.eventID.trim() || !event.runID.trim() || !event.revision.trim())
    return reject("rejected", "Event, run, and repository revision identities are required")
  if (event.runID !== projection.runID) return reject("rejected", "Event belongs to a different run")
  if (event.revision !== projection.revision) return reject("stale", "Event belongs to a different repository revision")
  if (projection.timeline.some((item) => item.eventID === event.eventID))
    return reject("duplicate", "Event ID has already been applied")
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1)
    return reject("rejected", "Event sequence must be a positive safe integer")
  if (event.sequence <= projection.lastSequence)
    return reject("stale", "Event sequence is not newer than the current projection")
  if (!Number.isFinite(Date.parse(event.occurredAt)))
    return reject("rejected", "Event timestamp is invalid")
  if (Date.parse(event.occurredAt) < Date.parse(projection.updatedAt))
    return reject("stale", "Event timestamp predates the current projection")
  if (REASON_REQUIRED.has(event.type) && !event.reason?.trim())
    return reject("rejected", "Blocked, failed, and cancelled events require a reason")
  if (TERMINAL.has(projection.state))
    return reject("stale", "Terminal run state cannot be changed by a later event")

  const nextState = EVENT_STATE[event.type]
  if (!canTransitionExecutionRun(projection.state, nextState))
    return reject("rejected", "Run lifecycle transition is not allowed: " + projection.state + " -> " + nextState)

  const entry: RunMonitorTimelineEntry = {
    eventID: event.eventID,
    sequence: event.sequence,
    type: event.type,
    occurredAt: event.occurredAt,
    ...(event.reason?.trim() ? { reason: event.reason.trim().slice(0, 500) } : {}),
  }
  return {
    status: "applied",
    projection: {
      ...projection,
      state: nextState,
      lastSequence: event.sequence,
      lastEventID: event.eventID,
      updatedAt: event.occurredAt,
      timeline: [...projection.timeline, entry].slice(-100),
    },
  }
}
