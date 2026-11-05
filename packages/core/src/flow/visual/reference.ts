export type VisualReferenceKind = "screenshot" | "asset" | "generated" | "url"
export type VisualUsageRights = "owned" | "licensed" | "public-domain" | "user-supplied" | "generated" | "unknown"

export interface VisualReferenceRecord {
  readonly id: string
  readonly projectID: string
  readonly kind: VisualReferenceKind
  readonly source: string
  readonly sourceDescription: string
  readonly mediaType: string
  readonly usageRights: VisualUsageRights
  readonly capturedAt: string
  readonly sourceRevision?: string
  readonly screenIDs: readonly string[]
  readonly tags: readonly string[]
  readonly approvedBy: string
  readonly approvedAt: string
}

export type VisualReferenceOperation = "add" | "replace" | "delete" | "copy"

export interface VisualReferenceMutation {
  readonly operation: VisualReferenceOperation
  readonly targetProjectID: string
  readonly current?: VisualReferenceRecord
  readonly proposed?: VisualReferenceRecord
  readonly explicitUserAction: boolean
  readonly crossProjectApproved?: boolean
}

export interface VisualReferenceDecision {
  readonly allowed: boolean
  readonly operation: VisualReferenceOperation
  readonly reason: string
  readonly result?: VisualReferenceRecord
}

export interface VisualReferenceValidation {
  readonly valid: boolean
  readonly diagnostics: readonly string[]
}

const KINDS: readonly string[] = ["screenshot", "asset", "generated", "url"]
const RIGHTS: readonly string[] = ["owned", "licensed", "public-domain", "user-supplied", "generated", "unknown"]
const SUPPORTED_MEDIA = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"])

function safeSource(kind: VisualReferenceKind, source: string): boolean {
  if (!source.trim()) return false
  if (kind !== "url") return !source.includes("\0")
  try {
    const url = new URL(source)
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false
    for (const key of url.searchParams.keys()) {
      if (/(?:token|secret|signature|credential|password|api[_-]?key)/i.test(key)) return false
    }
    return true
  } catch {
    return false
  }
}

export function validateVisualReference(input: {
  record: VisualReferenceRecord
  existing?: readonly VisualReferenceRecord[]
}): VisualReferenceValidation {
  const { record } = input
  const diagnostics: string[] = []
  const fail = (message: string) => diagnostics.push(message)

  if (!record.id.trim() || !record.projectID.trim() || !record.sourceDescription.trim())
    fail("Reference, project, and provenance description are required")
  if (!KINDS.includes(record.kind) || !RIGHTS.includes(record.usageRights))
    fail("Reference kind or usage rights are not recognized")
  if (record.usageRights === "unknown") fail("Usage rights must be known before a reference can be registered")
  if (!safeSource(record.kind, record.source)) fail("Reference source is empty, malformed, or contains unsafe URL credentials")
  if (!SUPPORTED_MEDIA.has(record.mediaType.toLowerCase())) fail("Reference media type is unsupported")
  if (!Number.isFinite(Date.parse(record.capturedAt))) fail("Capture/import timestamp must be valid")
  if (!record.approvedBy.trim() || !Number.isFinite(Date.parse(record.approvedAt)))
    fail("Explicit user approval identity and timestamp are required")
  if (record.screenIDs.some((value) => !value.trim()) || new Set(record.screenIDs).size !== record.screenIDs.length)
    fail("Related screen IDs must be non-empty and unique")
  if (record.tags.length > 50 || record.tags.some((value) => !value.trim()) || new Set(record.tags.map((value) => value.toLowerCase())).size !== record.tags.length)
    fail("Tags must be unique, non-empty, and limited to fifty items")

  const duplicate = input.existing?.find((item) => item.id === record.id && item.projectID === record.projectID)
  if (duplicate) fail("Reference ID already exists in the project")

  return { valid: diagnostics.length === 0, diagnostics }
}

/**
 * Evaluate a reference registry mutation. No filesystem/storage operation is performed here.
 * Every add/replace/delete/copy requires an explicit user action.
 */
export function assessVisualReferenceMutation(input: VisualReferenceMutation): VisualReferenceDecision {
  const deny = (reason: string): VisualReferenceDecision => ({
    allowed: false,
    operation: input.operation,
    reason,
  })
  if (!input.explicitUserAction) return deny("This registry mutation requires an explicit user action")

  if (input.operation === "delete") {
    if (!input.current) return deny("Reference to delete does not exist")
    if (input.current.projectID !== input.targetProjectID) return deny("A project cannot delete another project's reference")
    return {
      allowed: true,
      operation: input.operation,
      reason: "Explicitly approved deletion of a reference owned by this project",
    }
  }

  if (!input.proposed) return deny("A proposed reference record is required")
  if (input.proposed.projectID !== input.targetProjectID) return deny("Proposed reference must be scoped to the target project")

  if (input.operation === "add") {
    if (input.current) return deny("Add cannot replace an existing reference")
    const validation = validateVisualReference({ record: input.proposed })
    return validation.valid
      ? { allowed: true, operation: input.operation, reason: "Reference is valid and explicitly approved", result: input.proposed }
      : deny(validation.diagnostics.join("; "))
  }

  if (!input.current) return deny("Current reference does not exist")
  if (input.operation === "replace") {
    if (input.current.projectID !== input.targetProjectID || input.current.id !== input.proposed.id)
      return deny("Replacement must preserve the reference ID and remain within the same project")
    const validation = validateVisualReference({ record: input.proposed })
    return validation.valid
      ? { allowed: true, operation: input.operation, reason: "Reference replacement is explicitly approved", result: input.proposed }
      : deny(validation.diagnostics.join("; "))
  }

  if (input.operation === "copy") {
    if (input.current.projectID === input.targetProjectID) return deny("Copy is reserved for an explicit cross-project reference")
    if (!input.crossProjectApproved) return deny("Cross-project reuse requires a separate explicit approval")
    if (input.proposed.id === input.current.id) return deny("Copied reference must receive a new project-scoped ID")
    const validation = validateVisualReference({ record: input.proposed })
    return validation.valid
      ? { allowed: true, operation: input.operation, reason: "Cross-project reference reuse is explicitly approved", result: input.proposed }
      : deny(validation.diagnostics.join("; "))
  }

  return deny("Unsupported reference mutation")
}
