export type VisualCriterionKind = "responsive" | "typography" | "contrast" | "keyboard" | "reduced-motion" | "composition" | "interaction"

export interface VisualAcceptanceCriterion {
  readonly id: string
  readonly taskID: string
  readonly screenID: string
  readonly kind: VisualCriterionKind
  readonly statement: string
  readonly required: boolean
  readonly requiresHumanReview: boolean
}

export interface VisualScreenshotEvidence {
  readonly id: string
  readonly criterionID: string
  readonly taskID: string
  readonly repositoryRevision: string
  readonly sourceRef: string
  readonly viewport: { readonly width: number; readonly height: number }
  readonly theme: "light" | "dark" | "custom"
  readonly screenState: string
  readonly capturedAt: string
  readonly humanReview?: {
    readonly reviewer: string
    readonly decision: "accepted" | "rejected"
    readonly reviewedAt: string
    readonly reason: string
  }
}

export interface VisualCriterionDecision {
  readonly criterionID: string
  readonly status: "verified" | "needs-human-review" | "rejected" | "missing-evidence" | "stale-evidence"
  readonly evidenceIDs: readonly string[]
  readonly reason: string
}

export interface VisualAcceptanceResult {
  readonly ready: boolean
  readonly decisions: readonly VisualCriterionDecision[]
  readonly diagnostics: readonly string[]
}

/**
 * Evaluate screenshot evidence against explicit screen criteria and one repository revision.
 * Subjective criteria cannot pass from screenshots alone; they require an identified human decision.
 */
export function evaluateVisualAcceptance(input: {
  taskID: string
  repositoryRevision: string
  criteria: readonly VisualAcceptanceCriterion[]
  evidence: readonly VisualScreenshotEvidence[]
}): VisualAcceptanceResult {
  const diagnostics: string[] = []
  const seen = new Set<string>()
  const decisions = input.criteria.map((criterion): VisualCriterionDecision => {
    if (!criterion.id.trim() || !criterion.statement.trim() || !criterion.screenID.trim())
      diagnostics.push("Visual criterion identity, screen, and statement are required")
    if (seen.has(criterion.id)) diagnostics.push("Duplicate visual criterion ID: " + criterion.id)
    seen.add(criterion.id)

    const matching = input.evidence.filter((item) => item.criterionID === criterion.id && item.taskID === input.taskID)
    if (!criterion.required) {
      return { criterionID: criterion.id, status: "verified", evidenceIDs: matching.map((item) => item.id), reason: "Criterion is optional" }
    }
    if (matching.length === 0)
      return { criterionID: criterion.id, status: "missing-evidence", evidenceIDs: [], reason: "Required visual criterion has no screenshot evidence" }

    const current = matching.filter((item) =>
      item.repositoryRevision === input.repositoryRevision &&
      item.sourceRef.trim().length > 0 &&
      item.screenState.trim().length > 0 &&
      Number.isFinite(Date.parse(item.capturedAt)) &&
      Number.isSafeInteger(item.viewport.width) && item.viewport.width > 0 &&
      Number.isSafeInteger(item.viewport.height) && item.viewport.height > 0 &&
      ["light", "dark", "custom"].includes(item.theme),
    )
    if (current.length === 0)
      return { criterionID: criterion.id, status: "stale-evidence", evidenceIDs: matching.map((item) => item.id), reason: "Evidence is stale or its capture metadata is incomplete" }

    if (criterion.requiresHumanReview) {
      const review = current.find((item) =>
        item.humanReview?.reviewer.trim() &&
        item.humanReview.reason.trim() &&
        Number.isFinite(Date.parse(item.humanReview.reviewedAt)),
      )?.humanReview
      if (!review)
        return { criterionID: criterion.id, status: "needs-human-review", evidenceIDs: current.map((item) => item.id), reason: "Subjective visual criterion requires a recorded human review" }
      if (review.decision === "rejected")
        return { criterionID: criterion.id, status: "rejected", evidenceIDs: current.map((item) => item.id), reason: review.reason }
    }

    return { criterionID: criterion.id, status: "verified", evidenceIDs: current.map((item) => item.id), reason: "Current screenshot evidence satisfies the criterion's evidence requirements" }
  })

  const ready = diagnostics.length === 0 && decisions.every((item) =>
    item.status === "verified" || (!input.criteria.find((criterion) => criterion.id === item.criterionID)?.required),
  )
  return { ready, decisions, diagnostics }
}
