import type { PlanTask } from "../plan.js"
import { classifyScanPath, normalizeScanPath } from "../repo/scan-policy.js"

export type GitChangedPathStatus = "added" | "modified" | "deleted" | "renamed" | "copied" | "type-changed" | "unmerged" | "unknown"

export interface GitChangedPath {
  readonly path: string
  readonly status: GitChangedPathStatus
  readonly previousPath?: string
  readonly rawStatus?: string
}

export interface GitNameStatusParseResult {
  readonly changes: readonly GitChangedPath[]
  readonly diagnostics: readonly string[]
}

export type ChangedPathReviewStatus = "in-scope" | "out-of-scope" | "generated-review" | "sensitive-block" | "invalid-path" | "untracked-review" | "unmerged-review"

export interface ChangedPathReview {
  readonly path: string
  readonly status: ChangedPathReviewStatus
  readonly reason: string
  readonly approvedException?: string
}

export interface TaskDiffScopeResult {
  readonly taskID: string
  readonly valid: boolean
  readonly declaredScope: readonly string[]
  readonly reviews: readonly ChangedPathReview[]
  readonly outOfScopePaths: readonly string[]
  readonly blockedPaths: readonly string[]
  readonly generatedPaths: readonly string[]
  readonly diagnostics: readonly string[]
}

export interface TaskScopeException {
  readonly path: string
  readonly reason: string
  readonly reviewer: string
}

function normalizeScopePattern(input: string): string | undefined {
  const raw = input.trim()
  const directory = raw.endsWith("/") || raw.endsWith("/**")
  const withoutWildcard = raw.endsWith("/**") ? raw.slice(0, -3) : raw.endsWith("/") ? raw.slice(0, -1) : raw
  const normalized = normalizeScanPath(withoutWildcard)
  if (!normalized) return undefined
  return directory || !/\.[A-Za-z0-9_-]+$/.test(normalized) ? normalized + "/**" : normalized
}

function pathAllowed(candidate: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) {
      const directory = pattern.slice(0, -3).replace(/\/+$/, "")
      return candidate === directory || candidate.startsWith(directory + "/")
    }
    return candidate === pattern
  })
}

function pathsFromText(value: string): string[] {
  const matches = value.match(/(?:packages|services|apps|docs)\/[A-Za-z0-9_.*@/-]+/g) ?? []
  return matches.map((item) => item.replace(/[.,;:]+$/g, ""))
}

const STATUS_MAP: Record<string, GitChangedPathStatus> = {
  A: "added",
  M: "modified",
  D: "deleted",
  T: "type-changed",
  U: "unmerged",
  X: "unknown",
  B: "unknown",
}

/** Parse Git name-status NUL output without reading files or running Git. */
export function parseGitNameStatusZ(output: string): GitNameStatusParseResult {
  const fields = output.split("\0")
  if (fields.at(-1) === "") fields.pop()
  const changes: GitChangedPath[] = []
  const diagnostics: string[] = []

  for (let index = 0; index < fields.length;) {
    const rawStatus = fields[index++] ?? ""
    const code = rawStatus[0] ?? ""
    if (!/^[ACDMRTUXB]\d*$/.test(rawStatus)) {
      diagnostics.push("Unrecognized Git name-status token: " + rawStatus)
      continue
    }

    if (code === "R" || code === "C") {
      const previousPath = fields[index++]
      const nextPath = fields[index++]
      if (!previousPath || !nextPath) {
        diagnostics.push("Rename/copy record is missing its source or destination path: " + rawStatus)
        break
      }
      changes.push({
        path: nextPath,
        previousPath,
        status: code === "R" ? "renamed" : "copied",
        rawStatus,
      })
      continue
    }

    const changedPath = fields[index++]
    if (!changedPath) {
      diagnostics.push("Git name-status record is missing its path: " + rawStatus)
      break
    }
    changes.push({
      path: changedPath,
      status: STATUS_MAP[code] ?? "unknown",
      rawStatus,
    })
  }

  return { changes, diagnostics }
}

/** Extract conservative literal file/directory references from a plan task's declared scope. */
export function declaredTaskScope(task: PlanTask): string[] {
  return [...new Set(pathsFromText(task.fields.Scope ?? "").flatMap((raw) => {
    const normalized = normalizeScopePattern(raw)
    return normalized ? [normalized] : []
  }))].toSorted()
}

/**
 * Review Git changed paths against one task's explicit scope.
 * Secret-like paths are always blocked; generated paths are surfaced for review, never silently ignored.
 */
export function reviewTaskDiffScope(input: {
  task: PlanTask
  changes: readonly GitChangedPath[]
  exceptions?: readonly TaskScopeException[]
}): TaskDiffScopeResult {
  const diagnostics: string[] = []
  const declaredScope = declaredTaskScope(input.task)
  if (declaredScope.length === 0) diagnostics.push("Task scope contains no recognized repository paths")

  const exceptionMap = new Map<string, TaskScopeException>()
  for (const exception of input.exceptions ?? []) {
    const normalized = normalizeScanPath(exception.path)
    if (!normalized || !exception.reason.trim() || !exception.reviewer.trim()) {
      diagnostics.push("Scope exceptions require a safe path, reason, and reviewer")
      continue
    }
    exceptionMap.set(normalized, exception)
  }

  const seen = new Set<string>()
  const reviews: ChangedPathReview[] = []
  for (const change of input.changes) {
    const normalized = normalizeScanPath(change.path)
    if (!normalized) {
      reviews.push({ path: change.path, status: "invalid-path", reason: "Changed path is absolute or contains traversal" })
      diagnostics.push("Invalid changed path: " + change.path)
      continue
    }
    if (seen.has(normalized)) {
      diagnostics.push("Duplicate changed path in Git diff: " + normalized)
      continue
    }
    seen.add(normalized)

    const scan = classifyScanPath({ path: normalized })
    if (!scan.included && scan.reason === "sensitive-path") {
      reviews.push({ path: normalized, status: "sensitive-block", reason: "Sensitive paths must never be accepted into task evidence or automation" })
      continue
    }

    const exception = exceptionMap.get(normalized)
    if (exception) {
      reviews.push({
        path: normalized,
        status: scan.included ? "in-scope" : scan.reason === "generated-or-vendor" ? "generated-review" : "invalid-path",
        reason: "An explicit reviewer exception exists: " + exception.reason,
        approvedException: exception.reviewer,
      })
      continue
    }

    if (!pathAllowed(normalized, declaredScope)) {
      reviews.push({ path: normalized, status: "out-of-scope", reason: "Changed path does not match a declared task scope path" })
      continue
    }

    if (change.status === "unmerged" || change.status === "unknown") {
      reviews.push({ path: normalized, status: "unmerged-review", reason: "Git reports an unresolved or unknown change status" })
      continue
    }

    if (change.status === "renamed" && change.previousPath) {
      const previous = normalizeScanPath(change.previousPath)
      if (!previous || !pathAllowed(previous, declaredScope)) {
        reviews.push({ path: normalized, status: "out-of-scope", reason: "Rename source path is outside the declared task scope" })
        continue
      }
    }

    if (!scan.included && scan.reason === "generated-or-vendor") {
      reviews.push({ path: normalized, status: "generated-review", reason: "Generated/vendor changes require explicit human review even when in scope" })
      continue
    }

    if (!scan.included) {
      reviews.push({ path: normalized, status: "invalid-path", reason: "Changed path is excluded by the repository scan policy" })
      continue
    }

    if (change.status === "added" && normalized.startsWith(".")) {
      reviews.push({ path: normalized, status: "untracked-review", reason: "Hidden-file additions require explicit scope inspection" })
      continue
    }

    reviews.push({ path: normalized, status: "in-scope", reason: "Changed path matches an explicit task scope path" })
  }

  const outOfScopePaths = reviews.filter((item) => item.status === "out-of-scope").map((item) => item.path)
  const blockedPaths = reviews.filter((item) => item.status === "sensitive-block" || item.status === "invalid-path" || item.status === "unmerged-review").map((item) => item.path)
  const generatedPaths = reviews.filter((item) => item.status === "generated-review").map((item) => item.path)

  return {
    taskID: input.task.id,
    valid: diagnostics.length === 0 && outOfScopePaths.length === 0 && blockedPaths.length === 0 && generatedPaths.length === 0,
    declaredScope,
    reviews,
    outOfScopePaths,
    blockedPaths,
    generatedPaths,
    diagnostics,
  }
}
