export type ProofCheckType = "lint" | "test" | "typecheck" | "build" | "visual" | "manual"
export type ProofEvidenceStatus = "pass" | "fail" | "skipped" | "not_applicable" | "not_run"
export type HumanReviewStatus = "pending" | "approved" | "rejected"

export interface ProofRequirement {
  readonly id: string
  readonly type: ProofCheckType
  readonly required: boolean
  readonly requiresHumanReview?: boolean
}

export interface ProofEvidenceRecord {
  readonly id: string
  readonly taskID: string
  readonly revision: string
  readonly checkID: string
  readonly type: ProofCheckType
  readonly status: ProofEvidenceStatus
  readonly capturedAt: string
  readonly command?: string
  readonly workingDirectory?: string
  readonly exitCode?: number
  readonly artifactRef?: string
  readonly reason?: string
  readonly humanReview?: HumanReviewStatus
}

export type ProofCheckResultStatus =
  | "passed"
  | "failed"
  | "missing"
  | "stale"
  | "invalid"
  | "pending-review"
  | "skipped"
  | "not-applicable"
  | "not-run"

export interface ProofCheckResult {
  readonly checkID: string
  readonly type: ProofCheckType
  readonly required: boolean
  readonly status: ProofCheckResultStatus
  readonly evidenceID?: string
  readonly reason?: string
}

export interface ProofGateResult {
  readonly taskID: string
  readonly revision: string
  readonly state: "verified" | "failed" | "incomplete"
  readonly checks: readonly ProofCheckResult[]
  readonly missingCheckIDs: readonly string[]
  readonly failedCheckIDs: readonly string[]
  readonly staleEvidenceIDs: readonly string[]
  readonly invalidEvidenceIDs: readonly string[]
  readonly pendingReviewCheckIDs: readonly string[]
}

const COMMAND_CHECKS = new Set<ProofCheckType>(["lint", "test", "typecheck", "build"])
const TERMINAL_STATUSES = new Set<ProofEvidenceStatus>(["pass", "fail", "skipped", "not_applicable", "not_run"])

function relativePath(input: string): boolean {
  if (!input || input.startsWith("/") || /^[A-Za-z]:/.test(input) || input.startsWith("\\\\")) return false
  return !input.replaceAll("\\", "/").split("/").some((part) => part === "..")
}

function validRecord(record: ProofEvidenceRecord): string | undefined {
  if (!record.id.trim() || !record.taskID.trim() || !record.revision.trim() || !record.checkID.trim())
    return "Evidence identity fields must be non-empty"
  if (!TERMINAL_STATUSES.has(record.status)) return "Evidence status is not recognized"
  if (!Number.isFinite(Date.parse(record.capturedAt))) return "Evidence timestamp must be a valid date"

  if (COMMAND_CHECKS.has(record.type)) {
    if (!record.command?.trim()) return "Command evidence requires the exact command"
    if (!record.workingDirectory || !relativePath(record.workingDirectory))
      return "Command evidence requires a root-relative working directory"
    if ((record.status === "pass" || record.status === "fail") && !Number.isInteger(record.exitCode))
      return "Completed command evidence requires an integer exit code"
    if (record.status === "pass" && record.exitCode !== 0) return "Passing command evidence must have exit code 0"
    if (record.status === "fail" && record.exitCode === 0) return "Failing command evidence must have a non-zero exit code"
  }

  if (record.type === "visual" || record.type === "manual") {
    if ((record.status === "pass" || record.status === "fail") && !record.artifactRef?.trim())
      return "Visual/manual evidence requires an inspectable artifact reference"
    if (record.status === "pass" && record.humanReview !== "approved")
      return "Visual/manual evidence cannot pass without approved human review"
  }

  if ((record.status === "skipped" || record.status === "not_applicable" || record.status === "not_run") && !record.reason?.trim())
    return "Skipped, not-applicable, and not-run evidence requires a reason"

  return undefined
}

function latest(records: readonly ProofEvidenceRecord[]): ProofEvidenceRecord | undefined {
  return records.toSorted((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt) || a.id.localeCompare(b.id))[0]
}

/**
 * Evaluate existing, immutable check results for one task and one repository revision.
 *
 * This function never executes commands, changes task state, writes files, or treats
 * missing/stale/unrun evidence as a pass.
 */
export function evaluateProofGate(input: {
  taskID: string
  revision: string
  requiredChecks: readonly ProofRequirement[]
  evidence: readonly ProofEvidenceRecord[]
}): ProofGateResult {
  const checks = input.requiredChecks.map((requirement): ProofCheckResult => {
    const matching = input.evidence.filter((record) => record.taskID === input.taskID && record.checkID === requirement.id)
    const current = matching.filter((record) => record.revision === input.revision && record.type === requirement.type)
    const selected = latest(current)
    const stale = matching.filter((record) => record.revision !== input.revision)

    if (!selected) {
      if (stale.length) {
        const evidence = latest(stale)
        return {
          checkID: requirement.id,
          type: requirement.type,
          required: requirement.required,
          status: "stale",
          ...(evidence ? { evidenceID: evidence.id } : {}),
          reason: "Evidence belongs to a different repository revision",
        }
      }
      return {
        checkID: requirement.id,
        type: requirement.type,
        required: requirement.required,
        status: "missing",
        reason: "No evidence exists for this task, check, and revision",
      }
    }

    const invalid = validRecord(selected)
    if (invalid) {
      return {
        checkID: requirement.id,
        type: requirement.type,
        required: requirement.required,
        status: "invalid",
        evidenceID: selected.id,
        reason: invalid,
      }
    }

    if (selected.status === "fail") {
      return {
        checkID: requirement.id,
        type: requirement.type,
        required: requirement.required,
        status: "failed",
        evidenceID: selected.id,
        reason: selected.reason ?? "The check failed",
      }
    }

    if (selected.status === "skipped" || selected.status === "not_applicable" || selected.status === "not_run") {
      return {
        checkID: requirement.id,
        type: requirement.type,
        required: requirement.required,
        status: selected.status === "not_applicable" ? "not-applicable" : selected.status,
        evidenceID: selected.id,
        reason: selected.reason,
      }
    }

    if (
      (requirement.requiresHumanReview && selected.humanReview !== "approved") ||
      ((requirement.type === "visual" || requirement.type === "manual") && selected.humanReview !== "approved")
    ) {
      return {
        checkID: requirement.id,
        type: requirement.type,
        required: requirement.required,
        status: "pending-review",
        evidenceID: selected.id,
        reason: selected.humanReview === "rejected" ? "Human review rejected this evidence" : "Human review is not approved",
      }
    }

    return {
      checkID: requirement.id,
      type: requirement.type,
      required: requirement.required,
      status: "passed",
      evidenceID: selected.id,
    }
  })

  const required = checks.filter((item) => item.required)
  const missingCheckIDs = required.filter((item) => item.status === "missing").map((item) => item.checkID)
  const failedCheckIDs = required.filter((item) => item.status === "failed").map((item) => item.checkID)
  const staleEvidenceIDs = required.flatMap((item) => item.status === "stale" && item.evidenceID ? [item.evidenceID] : [])
  const invalidEvidenceIDs = required.flatMap((item) => item.status === "invalid" && item.evidenceID ? [item.evidenceID] : [])
  const pendingReviewCheckIDs = required.filter((item) => item.status === "pending-review").map((item) => item.checkID)
  const unpassed = required.some((item) => item.status !== "passed")

  return {
    taskID: input.taskID,
    revision: input.revision,
    state:
      required.length > 0 && !unpassed
        ? "verified"
        : failedCheckIDs.length > 0
          ? "failed"
          : "incomplete",
    checks,
    missingCheckIDs,
    failedCheckIDs,
    staleEvidenceIDs,
    invalidEvidenceIDs,
    pendingReviewCheckIDs,
  }
}
