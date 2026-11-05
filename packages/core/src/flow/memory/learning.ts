import { classifyScanPath, normalizeScanPath } from "../repo/scan-policy.js"

export type LearningCategory = "verified_fact" | "decision" | "hypothesis" | "preference"
export type LearningConfidence = "low" | "medium" | "high"
export type LearningPrivacyAssessment = "clear" | "sensitive" | "uncertain"
export type LearningReviewState = "candidate" | "accepted" | "rejected" | "superseded"
export type LearningEvidenceKind = "session" | "source" | "test" | "commit" | "documentation"

export interface LearningEvidenceReference {
  readonly kind: LearningEvidenceKind
  readonly reference: string
  readonly revision: string
}

export interface LearningRecord {
  readonly id: string
  readonly projectID: string
  readonly category: LearningCategory
  readonly statement: string
  readonly confidence: LearningConfidence
  readonly sourceSessionID: string
  readonly repositoryRevision: string
  readonly evidence: readonly LearningEvidenceReference[]
  readonly privacyAssessment: LearningPrivacyAssessment
  readonly proposedDestination: string
  readonly proposedDiff: string
  readonly reviewState: LearningReviewState
  readonly reviewer?: string
  readonly reviewedAt?: string
  readonly reviewReason?: string
  readonly supersededBy?: string
}

export interface LearningDiagnostic {
  readonly code:
    | "missing-identity"
    | "invalid-enum"
    | "missing-evidence"
    | "stale-evidence"
    | "invalid-destination"
    | "missing-diff"
    | "sensitive-learning"
    | "privacy-unreviewed"
    | "duplicate-learning"
    | "invalid-review"
    | "reviewer-required"
    | "review-time-required"
    | "review-reason-required"
    | "superseded-target-required"
  readonly message: string
}

export interface LearningValidation {
  readonly valid: boolean
  readonly writeEligible: boolean
  readonly canonicalStatement: string
  readonly diagnostics: readonly LearningDiagnostic[]
}

export interface LearningObservation {
  readonly id: string
  readonly category: LearningCategory
  readonly statement: string
  readonly confidence: LearningConfidence
  readonly sourceSessionID: string
  readonly projectID: string
  readonly repositoryRevision: string
  readonly evidence: readonly LearningEvidenceReference[]
  readonly nonObvious: boolean
  readonly completedRun: boolean
  readonly privacyAssessment: LearningPrivacyAssessment
  readonly proposedDestination: string
  readonly proposedDiff: string
}

export interface LearningExtractionResult {
  readonly candidates: readonly LearningRecord[]
  readonly deferred: readonly { id: string; reason: string }[]
}

const CATEGORIES: readonly string[] = ["verified_fact", "decision", "hypothesis", "preference"]
const CONFIDENCE: readonly string[] = ["low", "medium", "high"]
const PRIVACY: readonly string[] = ["clear", "sensitive", "uncertain"]
const STATES: readonly string[] = ["candidate", "accepted", "rejected", "superseded"]
const EVIDENCE_KINDS: readonly string[] = ["session", "source", "test", "commit", "documentation"]

export function canonicalizeLearningStatement(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function safeDestination(value: string): string | undefined {
  const normalized = normalizeScanPath(value)
  if (!normalized || !normalized.toLowerCase().endsWith(".md")) return undefined
  const decision = classifyScanPath({ path: normalized })
  return decision.included ? decision.path : undefined
}

function evidenceKey(items: readonly LearningEvidenceReference[]): string {
  return items
    .map((item) => [item.kind, item.reference, item.revision].join("|"))
    .toSorted()
    .join("\n")
}

/**
 * Validate a learning proposal independently from any session/model extraction.
 * A candidate is never writable until a reviewer accepts a clear-privacy record.
 */
export function validateLearningRecord(input: {
  record: LearningRecord
  existing?: readonly LearningRecord[]
}): LearningValidation {
  const { record } = input
  const diagnostics: LearningDiagnostic[] = []
  const fail = (code: LearningDiagnostic["code"], message: string) => diagnostics.push({ code, message })
  const statement = canonicalizeLearningStatement(record.statement)

  if (
    !record.id.trim() || !record.projectID.trim() || !statement || !record.sourceSessionID.trim() ||
    !record.repositoryRevision.trim()
  ) fail("missing-identity", "Learning ID, project, statement, source session, and repository revision are required")

  if (
    !CATEGORIES.includes(record.category) || !CONFIDENCE.includes(record.confidence) ||
    !PRIVACY.includes(record.privacyAssessment) || !STATES.includes(record.reviewState)
  ) fail("invalid-enum", "Learning category, confidence, privacy, or review state is not recognized")

  if (record.evidence.length === 0) fail("missing-evidence", "A learning requires at least one provenance reference")
  for (const item of record.evidence) {
    if (!EVIDENCE_KINDS.includes(item.kind) || !item.reference.trim() || !item.revision.trim())
      fail("invalid-enum", "Evidence kind, reference, and revision are required")
    if (item.revision !== record.repositoryRevision)
      fail("stale-evidence", "Learning evidence must match the captured repository revision")
  }

  const destination = safeDestination(record.proposedDestination)
  if (!destination) fail("invalid-destination", "Destination must be a safe, included root-relative Markdown path")
  if (!record.proposedDiff.trim()) fail("missing-diff", "A proposed documentation diff is required")
  if (record.privacyAssessment === "sensitive") fail("sensitive-learning", "Sensitive learnings cannot enter the project ledger")
  if (record.privacyAssessment !== "clear") fail("privacy-unreviewed", "Privacy assessment must be explicitly clear before acceptance")

  const duplicate = input.existing?.find((existing) =>
    existing.id !== record.id &&
    existing.projectID === record.projectID &&
    canonicalizeLearningStatement(existing.statement) === statement &&
    evidenceKey(existing.evidence) === evidenceKey(record.evidence),
  )
  if (duplicate) fail("duplicate-learning", "The same learning with the same provenance already exists: " + duplicate.id)

  if (record.reviewState === "accepted") {
    if (!record.reviewer?.trim()) fail("reviewer-required", "Accepted/rejected/superseded records require a reviewer identity")
    if (!record.reviewedAt || !Number.isFinite(Date.parse(record.reviewedAt)))
      fail("review-time-required", "Accepted/rejected/superseded records require a valid review timestamp")
    if (!record.reviewReason?.trim()) fail("review-reason-required", "Acceptance requires a review reason")
  } else if (record.reviewState === "rejected" || record.reviewState === "superseded") {
    if (!record.reviewer?.trim()) fail("reviewer-required", "Accepted/rejected/superseded records require a reviewer identity")
    if (!record.reviewedAt || !Number.isFinite(Date.parse(record.reviewedAt)))
      fail("review-time-required", "Accepted/rejected/superseded records require a valid review timestamp")
    if (!record.reviewReason?.trim()) fail("review-reason-required", "Rejection/supersession requires a review reason")
    if (record.reviewState === "superseded" && !record.supersededBy?.trim())
      fail("superseded-target-required", "Superseded records must point to the replacing learning ID")
  }

  const valid = diagnostics.length === 0
  return {
    valid,
    writeEligible: valid && record.reviewState === "accepted",
    canonicalStatement: statement,
    diagnostics,
  }
}

/**
 * Filter structured observations emitted from completed work into review-only candidates.
 * The caller owns session access and any model extraction; this filter never reads transcripts.
 */
export function extractLearningCandidates(input: {
  observations: readonly LearningObservation[]
  existing?: readonly LearningRecord[]
}): LearningExtractionResult {
  const candidates: LearningRecord[] = []
  const deferred: { id: string; reason: string }[] = []
  const known = [...(input.existing ?? [])]

  for (const observation of input.observations) {
    const defer = (reason: string) => deferred.push({ id: observation.id, reason })
    if (!observation.completedRun) {
      defer("Source run is not complete")
      continue
    }
    if (!observation.nonObvious) {
      defer("Observation is routine or already obvious and is not a durable project learning")
      continue
    }
    if (observation.confidence === "low") {
      defer("Low-confidence observations require more evidence before becoming candidates")
      continue
    }
    if (observation.privacyAssessment !== "clear") {
      defer("Privacy review is not clear; the observation was not copied into the candidate ledger")
      continue
    }
    const canonical = canonicalizeLearningStatement(observation.statement)
    const duplicate = known.find((record) =>
      record.projectID === observation.projectID &&
      canonicalizeLearningStatement(record.statement) === canonical &&
      evidenceKey(record.evidence) === evidenceKey(observation.evidence),
    )
    if (duplicate) {
      defer("Unchanged learning/provenance already exists as " + duplicate.id)
      continue
    }

    const candidate: LearningRecord = {
      id: observation.id,
      projectID: observation.projectID,
      category: observation.category,
      statement: observation.statement.trim(),
      confidence: observation.confidence,
      sourceSessionID: observation.sourceSessionID,
      repositoryRevision: observation.repositoryRevision,
      evidence: observation.evidence,
      privacyAssessment: observation.privacyAssessment,
      proposedDestination: observation.proposedDestination,
      proposedDiff: observation.proposedDiff,
      reviewState: "candidate",
    }
    const validation = validateLearningRecord({ record: candidate, existing: known })
    if (!validation.valid) {
      defer(validation.diagnostics.map((item) => item.message).join("; "))
      continue
    }
    candidates.push(candidate)
    known.push(candidate)
  }

  return { candidates, deferred }
}

/** Apply a human review decision while retaining the original candidate and provenance. */
export function reviewLearningRecord(input: {
  record: LearningRecord
  decision: "accepted" | "rejected" | "superseded"
  reviewer: string
  reviewedAt: string
  reason: string
  supersededBy?: string
}): { readonly record?: LearningRecord; readonly diagnostics: readonly LearningDiagnostic[] } {
  const diagnostics: LearningDiagnostic[] = []
  if (input.record.reviewState !== "candidate")
    diagnostics.push({ code: "invalid-review", message: "Only candidate learnings can receive their first review decision" })
  if (!input.reviewer.trim()) diagnostics.push({ code: "reviewer-required", message: "Reviewer identity is required" })
  if (!Number.isFinite(Date.parse(input.reviewedAt)))
    diagnostics.push({ code: "review-time-required", message: "A valid review timestamp is required" })
  if (!input.reason.trim()) diagnostics.push({ code: "review-reason-required", message: "A decision reason is required" })
  if (input.decision === "superseded" && !input.supersededBy?.trim())
    diagnostics.push({ code: "superseded-target-required", message: "Superseded records must point to the replacing learning ID" })
  if (input.decision === "accepted") {
    const validation = validateLearningRecord({ record: input.record })
    diagnostics.push(...validation.diagnostics)
    if (input.record.privacyAssessment !== "clear" && validation.diagnostics.every((item) => item.code !== "privacy-unreviewed"))
      diagnostics.push({ code: "privacy-unreviewed", message: "Only records with a clear privacy assessment can be accepted" })
  }

  if (diagnostics.length) return { diagnostics }
  return {
    record: {
      ...input.record,
      reviewState: input.decision,
      reviewer: input.reviewer.trim(),
      reviewedAt: input.reviewedAt,
      reviewReason: input.reason.trim().slice(0, 500),
      ...(input.supersededBy ? { supersededBy: input.supersededBy.trim() } : {}),
    },
    diagnostics: [],
  }
}
