export type RequirementState = "reviewable" | "unresolved"

export type RequirementDiagnosticCode =
  | "expected-array"
  | "invalid-entry"
  | "invalid-id"
  | "duplicate-id"
  | "missing-title"
  | "missing-statement"
  | "invalid-list"
  | "invalid-list-item"

export type RequirementUnresolvedReason =
  | "missing-expected-behavior"
  | "missing-acceptance-criteria"
  | "open-questions"

export interface RequirementUnit {
  readonly id: string
  readonly title: string
  readonly statement: string
  readonly expectedBehavior?: string
  readonly constraints: readonly string[]
  readonly nonGoals: readonly string[]
  readonly acceptanceCriteria: readonly string[]
  readonly openQuestions: readonly string[]
  readonly sourceRef?: string
  readonly state: RequirementState
  readonly unresolvedReasons: readonly RequirementUnresolvedReason[]
  readonly sourceIndex: number
}

export interface RequirementDiagnostic {
  readonly code: RequirementDiagnosticCode
  readonly message: string
  readonly index: number
  readonly requirementID?: string
}

export interface RequirementParseResult {
  readonly requirements: readonly RequirementUnit[]
  readonly diagnostics: readonly RequirementDiagnostic[]
  readonly readyForAudit: boolean
}

const REQUIREMENT_ID = /^REQ-\d{3,}$/

function record(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === "object" && !Array.isArray(input)
}

function strings(input: unknown, key: string, index: number, diagnostics: RequirementDiagnostic[]) {
  if (input === undefined) return []
  if (!Array.isArray(input)) {
    diagnostics.push({
      code: "invalid-list",
      message: `${key} must be a list of strings`,
      index,
    })
    return []
  }

  return input.flatMap((value, itemIndex) => {
    if (typeof value !== "string" || !value.trim()) {
      diagnostics.push({
        code: "invalid-list-item",
        message: `${key} item ${itemIndex + 1} must be a non-empty string`,
        index,
      })
      return []
    }
    return [value.trim()]
  })
}

/**
 * Validate explicit requirement units produced by a human or an upstream decomposition model.
 *
 * The function does not invent behavior, constraints, non-goals, acceptance criteria,
 * or answers to open questions. Incomplete units remain visible as unresolved.
 */
export function parseRequirementUnits(input: unknown): RequirementParseResult {
  if (!Array.isArray(input)) {
    return {
      requirements: [],
      diagnostics: [{ code: "expected-array", message: "Requirements must be supplied as an array", index: 0 }],
      readyForAudit: false,
    }
  }

  const diagnostics: RequirementDiagnostic[] = []
  const requirements = input.flatMap((value, index): RequirementUnit[] => {
    if (!record(value)) {
      diagnostics.push({
        code: "invalid-entry",
        message: "Requirement entry must be an object",
        index,
      })
      return []
    }

    const id = typeof value.id === "string" ? value.id.trim() : ""
    const title = typeof value.title === "string" ? value.title.trim() : ""
    const statement = typeof value.statement === "string" ? value.statement.trim() : ""

    if (!REQUIREMENT_ID.test(id)) {
      diagnostics.push({
        code: "invalid-id",
        message: "Requirement ID must use REQ- followed by at least three digits",
        index,
        ...(id ? { requirementID: id } : {}),
      })
    }
    if (!title) {
      diagnostics.push({ code: "missing-title", message: "Requirement title must be a non-empty string", index, requirementID: id || undefined })
    }
    if (!statement) {
      diagnostics.push({
        code: "missing-statement",
        message: "Requirement statement must preserve the explicit request behavior",
        index,
        requirementID: id || undefined,
      })
    }

    const constraints = strings(value.constraints, "constraints", index, diagnostics)
    const nonGoals = strings(value.nonGoals, "nonGoals", index, diagnostics)
    const acceptanceCriteria = strings(value.acceptanceCriteria, "acceptanceCriteria", index, diagnostics)
    const openQuestions = strings(value.openQuestions, "openQuestions", index, diagnostics)
    const expectedBehavior = typeof value.expectedBehavior === "string" ? value.expectedBehavior.trim() : ""
    const sourceRef = typeof value.sourceRef === "string" && value.sourceRef.trim() ? value.sourceRef.trim() : undefined
    const unresolvedReasons: RequirementUnresolvedReason[] = [
      ...(!expectedBehavior ? ["missing-expected-behavior" as const] : []),
      ...(acceptanceCriteria.length === 0 ? ["missing-acceptance-criteria" as const] : []),
      ...(openQuestions.length > 0 ? ["open-questions" as const] : []),
    ]

    if (!REQUIREMENT_ID.test(id) || !title || !statement) return []

    return [{
      id,
      title,
      statement,
      ...(expectedBehavior ? { expectedBehavior } : {}),
      constraints,
      nonGoals,
      acceptanceCriteria,
      openQuestions,
      ...(sourceRef ? { sourceRef } : {}),
      state: unresolvedReasons.length ? "unresolved" : "reviewable",
      unresolvedReasons,
      sourceIndex: index,
    }]
  })

  const firstByID = new Map<string, RequirementUnit>()
  for (const requirement of requirements) {
    const first = firstByID.get(requirement.id)
    if (first) {
      diagnostics.push({
        code: "duplicate-id",
        message: `Requirement ID ${requirement.id} is duplicated (first declared at index ${first.sourceIndex})`,
        index: requirement.sourceIndex,
        requirementID: requirement.id,
      })
      continue
    }
    firstByID.set(requirement.id, requirement)
  }

  return {
    requirements,
    diagnostics,
    readyForAudit: diagnostics.length === 0 && requirements.length > 0 && requirements.every((item) => item.state === "reviewable"),
  }
}
