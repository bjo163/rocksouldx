import { normalizeScanPath } from "../repo/scan-policy.js"

export type CapabilityClassification =
  | "implemented"
  | "partial"
  | "missing"
  | "overlap"
  | "conflict"
  | "deprecated"

export type CapabilityConfidence = "low" | "medium" | "high"
export type CapabilityReviewerState = "unreviewed" | "accepted" | "rejected" | "uncertain"
export type CapabilityEvidenceKind = "source" | "test" | "docs" | "config" | "plan" | "visual"
export type CriterionReviewState = "satisfied" | "partial" | "unmet" | "conflict" | "deprecated" | "unreviewed"

export interface CapabilityEvidenceReference {
  readonly id: string
  readonly path: string
  readonly kind: CapabilityEvidenceKind
  readonly revision: string
  readonly criterionID: string
}

export interface CapabilityCriterionReview {
  readonly id: string
  readonly state: CriterionReviewState
  readonly evidenceIDs: readonly string[]
}

export interface CapabilityFindingInput {
  readonly id: string
  readonly requirementID: string
  readonly classification: CapabilityClassification
  readonly rationale: string
  readonly confidence: CapabilityConfidence
  readonly snapshotRevision: string
  readonly rubricVersion: string
  readonly reviewerState: CapabilityReviewerState
  readonly scanComplete: boolean
  readonly criteria: readonly CapabilityCriterionReview[]
  readonly evidence: readonly CapabilityEvidenceReference[]
  readonly relatedFindingIDs?: readonly string[]
}

export interface CapabilityFindingDiagnostic {
  readonly code:
    | "missing-identity"
    | "invalid-enum"
    | "duplicate-criterion"
    | "duplicate-evidence"
    | "invalid-evidence-path"
    | "missing-evidence-reference"
    | "evidence-criterion-mismatch"
    | "missing-criterion-evidence"
    | "implemented-needs-source-and-test"
    | "implemented-needs-satisfied-criteria"
    | "partial-needs-covered-criterion"
    | "missing-requires-complete-scan"
    | "missing-requires-unmet-criteria"
    | "overlap-needs-related-finding"
    | "conflict-needs-conflict-criterion"
    | "deprecated-needs-deprecated-criterion"
  readonly message: string
}

export interface CapabilityFindingValidation {
  readonly valid: boolean
  readonly decisionReady: boolean
  readonly staleEvidenceIDs: readonly string[]
  readonly diagnostics: readonly CapabilityFindingDiagnostic[]
}

/**
 * Validate a proposed capability classification against explicit criterion reviews and source references.
 * It never infers that code is implemented from search matches or filenames.
 */
export function validateCapabilityFinding(input: CapabilityFindingInput): CapabilityFindingValidation {
  const diagnostics: CapabilityFindingDiagnostic[] = []
  const fail = (code: CapabilityFindingDiagnostic["code"], message: string) => diagnostics.push({ code, message })

  if (!input.id.trim() || !input.requirementID.trim() || !input.snapshotRevision.trim() || !input.rubricVersion.trim())
    fail("missing-identity", "Finding, requirement, snapshot revision, and rubric version are required")

  const classifications: readonly string[] = ["implemented", "partial", "missing", "overlap", "conflict", "deprecated"]
  const confidence: readonly string[] = ["low", "medium", "high"]
  const reviewerStates: readonly string[] = ["unreviewed", "accepted", "rejected", "uncertain"]
  const criterionStates: readonly string[] = ["satisfied", "partial", "unmet", "conflict", "deprecated", "unreviewed"]
  if (!classifications.includes(input.classification) || !confidence.includes(input.confidence) || !reviewerStates.includes(input.reviewerState))
    fail("invalid-enum", "Classification, confidence, or reviewer state is not recognized")

  const criterionIDs = new Set<string>()
  for (const criterion of input.criteria) {
    if (!criterion.id.trim() || criterionIDs.has(criterion.id)) fail("duplicate-criterion", "Criterion IDs must be non-empty and unique")
    criterionIDs.add(criterion.id)
    if (!criterionStates.includes(criterion.state)) fail("invalid-enum", "Criterion review state is not recognized: " + criterion.id)
  }

  const evidenceByID = new Map<string, CapabilityEvidenceReference>()
  const staleEvidenceIDs: string[] = []
  for (const evidence of input.evidence) {
    if (!evidence.id.trim() || evidenceByID.has(evidence.id)) {
      fail("duplicate-evidence", "Evidence IDs must be non-empty and unique")
      continue
    }
    evidenceByID.set(evidence.id, evidence)
    if (!normalizeScanPath(evidence.path)) fail("invalid-evidence-path", "Evidence path must be root-relative: " + evidence.id)
    if (!evidence.revision.trim() || evidence.revision !== input.snapshotRevision) staleEvidenceIDs.push(evidence.id)
  }

  for (const criterion of input.criteria) {
    if (criterion.evidenceIDs.length === 0 && criterion.state !== "unmet" && criterion.state !== "unreviewed")
      fail("missing-criterion-evidence", "Reviewed criterion has no evidence: " + criterion.id)
    for (const evidenceID of criterion.evidenceIDs) {
      const evidence = evidenceByID.get(evidenceID)
      if (!evidence) {
        fail("missing-evidence-reference", "Unknown evidence reference: " + evidenceID)
        continue
      }
      if (evidence.criterionID !== criterion.id)
        fail("evidence-criterion-mismatch", "Evidence " + evidenceID + " belongs to another criterion")
    }
  }

  const currentEvidence = input.evidence.filter((item) => item.revision === input.snapshotRevision && normalizeScanPath(item.path))
  const criterionHasKind = (criterion: CapabilityCriterionReview, kind: CapabilityEvidenceKind) =>
    criterion.evidenceIDs.some((id) => currentEvidence.some((item) => item.id === id && item.kind === kind))

  if (input.classification === "implemented") {
    if (input.criteria.length === 0 || input.criteria.some((item) => item.state !== "satisfied"))
      fail("implemented-needs-satisfied-criteria", "Every acceptance criterion must be reviewed as satisfied")
    if (
      input.criteria.some((criterion) => !criterionHasKind(criterion, "source")) ||
      !input.criteria.some((criterion) => criterionHasKind(criterion, "test"))
    )
      fail("implemented-needs-source-and-test", "Implemented requires current source evidence for every criterion and test evidence")
  }

  if (input.classification === "partial") {
    if (!input.criteria.some((item) => item.state === "satisfied" || item.state === "partial"))
      fail("partial-needs-covered-criterion", "Partial requires at least one satisfied or partially satisfied criterion")
  }

  if (input.classification === "missing") {
    if (!input.scanComplete) fail("missing-requires-complete-scan", "Missing is valid only when the declared scan scope completed")
    if (input.criteria.length === 0 || input.criteria.some((item) => item.state !== "unmet"))
      fail("missing-requires-unmet-criteria", "Every criterion must be reviewed as unmet before classifying a requirement as missing")
  }

  if (input.classification === "overlap" && !(input.relatedFindingIDs?.length))
    fail("overlap-needs-related-finding", "Overlap requires at least one related finding reference")
  if (input.classification === "conflict" && !input.criteria.some((item) => item.state === "conflict"))
    fail("conflict-needs-conflict-criterion", "Conflict requires an explicitly reviewed conflicting criterion")
  if (input.classification === "deprecated" && !input.criteria.some((item) => item.state === "deprecated"))
    fail("deprecated-needs-deprecated-criterion", "Deprecated requires an explicitly reviewed deprecated criterion")

  return {
    valid: diagnostics.length === 0,
    decisionReady: diagnostics.length === 0 && input.reviewerState === "accepted" && staleEvidenceIDs.length === 0,
    staleEvidenceIDs: staleEvidenceIDs.toSorted(),
    diagnostics,
  }
}
