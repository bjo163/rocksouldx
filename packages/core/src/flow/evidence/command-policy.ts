import type { PackageScript } from "../repo/manifests.js"
import { normalizeScanPath } from "../repo/scan-policy.js"

export type ValidationCommandPolicyStatus =
  | "allowed"
  | "review-required"
  | "blocked"
  | "not-found"
  | "invalid-working-directory"

export interface ValidationCommandPolicyDecision {
  readonly status: ValidationCommandPolicyStatus
  readonly command: string
  readonly workingDirectory: string
  readonly packagePath?: string
  readonly scriptName?: string
  readonly reason: string
}

const BLOCKED_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bgit\s+(?:push|reset\s+--hard|clean(?:\s|$)|merge|rebase|checkout\s+-f)\b/i,
  /\b(?:npm|pnpm|yarn|bun)\s+publish\b/i,
  /\b(?:vercel|fly|wrangler)\s+deploy\b/i,
  /\b(?:drizzle-kit|prisma|knex)\s+(?:migrate|push)\b/i,
  /\bsudo\b/i,
]

const REVIEW_PATTERNS = [
  /\b(?:curl|wget|ssh|scp)\b/i,
  /\b(?:npm|pnpm|yarn|bun)\s+install\b/i,
  /\b(?:docker|podman)\s+push\b/i,
  /\bgit\s+(?:commit|tag)\b/i,
  /\b(?:release|deploy|publish)\b/i,
]

function normalizeDirectory(value: string): string | undefined {
  if (value === "" || value === ".") return ""
  return normalizeScanPath(value)
}

/**
 * Assess a validation command against scripts discovered from repository manifests.
 * This function never executes commands and never grants shell or network permission.
 */
export function assessValidationCommand(input: {
  command: string
  workingDirectory: string
  scripts: readonly PackageScript[]
}): ValidationCommandPolicyDecision {
  const command = input.command.trim()
  const workingDirectory = normalizeDirectory(input.workingDirectory)
  if (!workingDirectory) {
    return {
      status: "invalid-working-directory",
      command,
      workingDirectory: input.workingDirectory,
      reason: "Working directory must be a root-relative repository path",
    }
  }

  const candidates = input.scripts.filter((script) => script.command.trim() === command)
  if (candidates.length === 0) {
    return {
      status: "not-found",
      command,
      workingDirectory,
      reason: "Command is not present in the discovered package manifests",
    }
  }

  const matching = candidates.filter((script) => normalizeDirectory(script.packagePath) === workingDirectory)
  if (matching.length === 0) {
    return {
      status: "invalid-working-directory",
      command,
      workingDirectory,
      reason: "Command must run from the package directory where its script was declared",
    }
  }
  if (matching.length > 1) {
    return {
      status: "review-required",
      command,
      workingDirectory,
      reason: "More than one manifest declares this command in the selected directory",
    }
  }

  const script = matching[0]
  if (!script) {
    return {
      status: "not-found",
      command,
      workingDirectory,
      reason: "No unique declared script was found",
    }
  }

  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      status: "blocked",
      command,
      workingDirectory,
      packagePath: script.packagePath,
      scriptName: script.name,
      reason: "The declared script contains a destructive, release, deployment, migration, or privileged operation",
    }
  }

  if (script.intent === "other" || REVIEW_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      status: "review-required",
      command,
      workingDirectory,
      packagePath: script.packagePath,
      scriptName: script.name,
      reason: "The declared script requires explicit command review before execution",
    }
  }

  return {
    status: "allowed",
    command,
    workingDirectory,
    packagePath: script.packagePath,
    scriptName: script.name,
    reason: "Exact command and working directory match a discovered validation script",
  }
}
