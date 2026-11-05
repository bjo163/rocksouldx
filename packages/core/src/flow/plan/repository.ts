import { Hash } from "@opencode/util/hash"
import { parsePlanMarkdown, type PlanParseResult, type PlanTaskStatus } from "./plan.js"
import { normalizeScanPath } from "./repo/scan-policy.js"

export interface PlanDocumentSnapshot {
  readonly path: string
  /** File/store revision used for compare-and-swap. */
  readonly revision: string
  /** Git revision of the repository snapshot used by Proof Gate. */
  readonly repositoryRevision: string
  readonly content: string
}

export interface PlanDocumentStore {
  /** Read one root-relative Markdown document at a stable revision. */
  readonly read: (path: string) => Promise<PlanDocumentSnapshot | undefined>
  /**
   * Atomically write only if both the observed revision and content hash still match.
   * Implementations must delegate file mutation and approval to the application's safe FileWrite boundary.
   */
  readonly compareAndSwap: (input: {
    path: string
    expectedRevision: string
    expectedContentHash: string
    content: string
  }) => Promise<{ readonly revision: string } | undefined>
}

export interface PlanWriteAuthorization {
  readonly authorize: (input: {
    path: string
    taskID: string
    from: PlanTaskStatus
    to: PlanTaskStatus
    expectedRevision: string
  }) => Promise<boolean>
}

export interface PlanVerificationProof {
  readonly taskID: string
  readonly repositoryRevision: string
  readonly ready: boolean
  readonly evidenceIDs: readonly string[]
  readonly reviewerState: "accepted" | "unreviewed" | "rejected"
}

export interface PlanStatusUpdateResult {
  readonly status: "read" | "updated" | "not-found" | "invalid-plan" | "invalid-transition" | "dependency-blocked" | "proof-required" | "not-authorized" | "conflict"
  readonly snapshot?: PlanDocumentSnapshot
  readonly parse?: PlanParseResult
  readonly reason?: string
}

const STATUS_VALUES: readonly PlanTaskStatus[] = [
  "draft", "planned", "ready", "in_progress", "blocked", "implemented", "verified", "cancelled",
]

const TRANSITIONS: Record<PlanTaskStatus, readonly PlanTaskStatus[]> = {
  draft: ["planned", "blocked", "cancelled"],
  planned: ["ready", "blocked", "cancelled"],
  ready: ["in_progress", "blocked", "cancelled"],
  in_progress: ["blocked", "implemented", "cancelled"],
  blocked: ["planned", "ready", "in_progress", "cancelled"],
  implemented: ["in_progress", "verified", "cancelled"],
  verified: [],
  cancelled: [],
}

export function planContentHash(content: string): string {
  return Hash.sha256(content)
}

/** Change one task's status field without reserializing or normalizing any other Markdown. */
export function updatePlanTaskStatusMarkdown(input: {
  content: string
  taskID: string
  status: PlanTaskStatus
}): { readonly content?: string; readonly reason?: string } {
  if (!STATUS_VALUES.includes(input.status)) return { reason: "Unsupported task status" }
  const parsed = parsePlanMarkdown(input.content)
  if (!parsed.valid) return { reason: "Plan is invalid and cannot be safely rewritten" }
  const matches = parsed.tasks.filter((task) => task.id === input.taskID)
  if (matches.length !== 1) return { reason: "Task ID must match exactly one task" }
  const task = matches[0]
  if (!task) return { reason: "Task does not exist" }

  const lines = input.content.split("\n")
  const section = lines.slice(task.line - 1, task.endLine)
  const statusLines = section.flatMap((line, index) => /^-\s+Status\s*:/.test(line.trim()) ? [index] : [])
  if (statusLines.length !== 1) return { reason: "Task must contain exactly one Status field" }
  const statusLine = statusLines[0]
  if (statusLine === undefined) return { reason: "Status field is missing" }
  const absoluteLine = task.line - 1 + statusLine
  const original = lines[absoluteLine] ?? ""
  const match = original.match(/^(\s*-\s+Status\s*:\s*).*(\r?)$/)
  if (!match) return { reason: "Status field format is not supported" }
  lines[absoluteLine] = match[1] + input.status + (match[2] ?? "")
  return { content: lines.join("\n") }
}

/**
 * Build a safe plan repository adapter around a CAS-capable store and caller-supplied authorization.
 * The store implementation must use the existing FileAccess/FileWrite permission flow; this adapter
 * never writes directly to the filesystem and never requests approval on behalf of a user.
 */
export function createPlanRepository(input: {
  store: PlanDocumentStore
  authorization: PlanWriteAuthorization
}) {
  const validatePath = (path: string) => {
    const normalized = normalizeScanPath(path)
    return normalized?.toLowerCase().endsWith(".md") ? normalized : undefined
  }

  const read = async (path: string): Promise<PlanStatusUpdateResult> => {
    const normalized = validatePath(path)
    if (!normalized) return { status: "not-found", reason: "Plan path must be safe root-relative Markdown" }
    const snapshot = await input.store.read(normalized)
    if (!snapshot) return { status: "not-found", reason: "Plan document does not exist" }
    if (snapshot.path !== normalized || !snapshot.revision.trim())
      return { status: "conflict", reason: "Store returned a path or revision that does not match the requested snapshot" }
    const parse = parsePlanMarkdown(snapshot.content)
    return { status: parse.valid ? "read" : "invalid-plan", snapshot, parse, ...(parse.valid ? {} : { reason: "Plan document contains validation diagnostics" }) }
  }

  const updateStatus = async (request: {
    path: string
    taskID: string
    status: PlanTaskStatus
    expectedRevision: string
    expectedContentHash: string
    authorization: PlanWriteAuthorization
    proof?: PlanVerificationProof
  }): Promise<PlanStatusUpdateResult> => {
    const normalized = validatePath(request.path)
    if (!normalized) return { status: "not-found", reason: "Plan path must be safe root-relative Markdown" }
    if (!request.taskID.trim() || !request.expectedRevision.trim() || !request.expectedContentHash.trim())
      return { status: "conflict", reason: "Task ID, expected revision, and expected content hash are required" }

    const snapshot = await input.store.read(normalized)
    if (!snapshot) return { status: "not-found", reason: "Plan document does not exist" }
    if (snapshot.revision !== request.expectedRevision || planContentHash(snapshot.content) !== request.expectedContentHash)
      return { status: "conflict", snapshot, reason: "Plan changed since it was reviewed; read and review the latest revision" }

    const parse = parsePlanMarkdown(snapshot.content)
    if (!parse.valid) return { status: "invalid-plan", snapshot, parse, reason: "Invalid plan cannot be updated" }
    const taskMatches = parse.tasks.filter((task) => task.id === request.taskID)
    if (taskMatches.length !== 1) return { status: "not-found", snapshot, parse, reason: "Task ID must identify exactly one task" }
    const task = taskMatches[0]
    if (!task?.status) return { status: "invalid-plan", snapshot, parse, reason: "Task status is missing or invalid" }
    if (!TRANSITIONS[task.status].includes(request.status))
      return { status: "invalid-transition", snapshot, parse, reason: "Task status transition is not allowed: " + task.status + " -> " + request.status }

    if (request.status === "ready") {
      const byID = new Map(parse.tasks.map((item) => [item.id, item]))
      const blocked = task.dependsOn.filter((id) => byID.get(id)?.status !== "verified")
      if (blocked.length) return { status: "dependency-blocked", snapshot, parse, reason: "Dependencies are not verified: " + blocked.join(", ") }
    }

    if (request.status === "verified") {
      const proof = request.proof
      if (
        !proof || proof.taskID !== task.id || proof.repositoryRevision !== snapshot.repositoryRevision ||
        !proof.ready || proof.reviewerState !== "accepted" || proof.evidenceIDs.length === 0
      ) return { status: "proof-required", snapshot, parse, reason: "Verified status requires accepted, ready Proof Gate evidence for this task and exact plan revision" }
    }

    const authorized = await input.authorization.authorize({
      path: normalized,
      taskID: task.id,
      from: task.status,
      to: request.status,
      expectedRevision: snapshot.revision,
    })
    if (!authorized) return { status: "not-authorized", snapshot, parse, reason: "Plan status update was not explicitly authorized" }

    const updated = updatePlanTaskStatusMarkdown({ content: snapshot.content, taskID: task.id, status: request.status })
    if (!updated.content) return { status: "invalid-plan", snapshot, parse, reason: updated.reason ?? "Unable to update the selected task" }

    const result = await input.store.compareAndSwap({
      path: normalized,
      expectedRevision: snapshot.revision,
      expectedContentHash: planContentHash(snapshot.content),
      content: updated.content,
    })
    if (!result) return { status: "conflict", snapshot, parse, reason: "Plan changed during the write; no update was applied" }
    return {
      status: "updated",
      snapshot: { path: normalized, revision: result.revision, content: updated.content },
      parse: parsePlanMarkdown(updated.content),
    }
  }

  return { read, updateStatus }
}
