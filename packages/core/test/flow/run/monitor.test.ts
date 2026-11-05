import { describe, expect, test } from "bun:test"
import {
  applyRunMonitorEvent,
  createRunMonitorProjection,
} from "../../../src/flow/run/monitor.js"
import type { RunMonitorEvent } from "../../../src/flow/run/monitor.js"

const projection = () => createRunMonitorProjection({
  runID: "run-a",
  taskID: "RSF-505",
  attempt: 1,
  sessionID: "session-a",
  revision: "revision-a",
  createdAt: "2026-11-05T10:00:00.000Z",
})

const event = (overrides: Partial<RunMonitorEvent> = {}): RunMonitorEvent => ({
  eventID: "event-a",
  runID: "run-a",
  revision: "revision-a",
  sequence: 1,
  type: "started",
  occurredAt: "2026-11-05T10:00:01.000Z",
  ...overrides,
})

describe("createRunMonitorProjection", () => {
  test("starts a new run in queued state without copying session data", () => {
    expect(projection()).toMatchObject({
      runID: "run-a",
      taskID: "RSF-505",
      attempt: 1,
      sessionID: "session-a",
      revision: "revision-a",
      state: "queued",
      lastSequence: 0,
      timeline: [],
    })
  })
})

describe("applyRunMonitorEvent", () => {
  test("applies monotonic lifecycle events and records a bounded summary", () => {
    const started = applyRunMonitorEvent({ projection: projection(), event: event() })
    expect(started.status).toBe("applied")
    expect(started.projection.state).toBe("running")

    const waiting = applyRunMonitorEvent({
      projection: started.projection,
      event: event({
        eventID: "event-b",
        sequence: 2,
        type: "waiting",
        occurredAt: "2026-11-05T10:00:02.000Z",
      }),
    })
    expect(waiting.projection.state).toBe("waiting")
    expect(waiting.projection.timeline).toHaveLength(2)
  })

  test("rejects duplicate, stale-sequence, and stale-revision events", () => {
    const current = applyRunMonitorEvent({ projection: projection(), event: event() }).projection
    expect(applyRunMonitorEvent({ projection: current, event: event() }).status).toBe("duplicate")
    expect(applyRunMonitorEvent({
      projection: current,
      event: event({ eventID: "old", sequence: 1, occurredAt: "2026-11-05T10:00:01.000Z" }),
    }).status).toBe("stale")
    expect(applyRunMonitorEvent({
      projection: current,
      event: event({ eventID: "other-revision", sequence: 2, revision: "revision-old" }),
    }).status).toBe("stale")
  })

  test("requires explicit reasons for blocked, failed, and cancelled states", () => {
    const result = applyRunMonitorEvent({
      projection: applyRunMonitorEvent({ projection: projection(), event: event() }).projection,
      event: event({ eventID: "blocked", sequence: 2, type: "blocked", reason: "   " }),
    })
    expect(result.status).toBe("rejected")
  })

  test("allows explicit requeue from blocked but never reopens terminal runs", () => {
    const started = applyRunMonitorEvent({ projection: projection(), event: event() }).projection
    const blocked = applyRunMonitorEvent({
      projection: started,
      event: event({ eventID: "blocked", sequence: 2, type: "blocked", reason: "Needs human input" }),
    }).projection
    const requeued = applyRunMonitorEvent({
      projection: blocked,
      event: event({ eventID: "requeued", sequence: 3, type: "requeued", occurredAt: "2026-11-05T10:00:03.000Z" }),
    })
    expect(requeued.projection.state).toBe("queued")

    const finished = applyRunMonitorEvent({
      projection: requeued.projection,
      event: event({ eventID: "finished", sequence: 4, type: "finished", occurredAt: "2026-11-05T10:00:04.000Z" }),
    }).projection
    const stale = applyRunMonitorEvent({
      projection: finished,
      event: event({ eventID: "regression", sequence: 5, type: "started", occurredAt: "2026-11-05T10:00:05.000Z" }),
    })
    expect(stale.status).toBe("stale")
    expect(stale.projection.state).toBe("finished")
  })

  test("rejects unrelated runs, invalid timestamps, and events that regress time", () => {
    expect(applyRunMonitorEvent({
      projection: projection(),
      event: event({ runID: "another-run" }),
    }).status).toBe("rejected")
    expect(applyRunMonitorEvent({
      projection: projection(),
      event: event({ occurredAt: "bad-time" }),
    }).status).toBe("rejected")

    const current = applyRunMonitorEvent({ projection: projection(), event: event() }).projection
    expect(applyRunMonitorEvent({
      projection: current,
      event: event({ eventID: "time-warp", sequence: 2, type: "waiting", occurredAt: "2026-11-05T09:59:00.000Z" }),
    }).status).toBe("stale")
  })
})
