import { canonicalizeLearningStatement, validateLearningRecord } from "./learning.js"
import type { LearningRecord } from "./learning.js"
import { classifyScanPath, normalizeScanPath } from "../repo/scan-policy.js"

export interface DocumentationSnapshot {
  readonly path: string
  readonly revision: string
  readonly content: string
}

export interface DocumentationProposal {
  readonly status: "proposal"
  readonly destination: string
  readonly expectedRevision: string
  readonly expectedContentHash: string
  readonly proposedContent: string
  readonly diff: string
  readonly learningID: string
  readonly requiresApproval: true
}

export type DocumentationProposalResult =
  | { readonly status: "proposal"; readonly proposal: DocumentationProposal }
  | { readonly status: "duplicate"; readonly existingPath: string; readonly reason: string }
  | { readonly status: "conflict"; readonly reason: string }

function hashContent(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function headingRange(lines: readonly string[], heading: string): { start: number; end: number } | undefined {
  const normalized = heading.trim().toLowerCase()
  const matches = lines.flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    return match?.[2]?.trim().toLowerCase() === normalized ? [{ index, level: match[1]?.length ?? 1 }] : []
  })
  if (matches.length !== 1) return undefined
  const selected = matches[0]
  if (!selected) return undefined
  let end = lines.length
  for (let index = selected.index + 1; index < lines.length; index++) {
    const match = lines[index]?.match(/^(#{1,6})\s+/)
    if (match && (match[1]?.length ?? 7) <= selected.level) {
      end = index
      break
    }
  }
  return { start: selected.index + 1, end }
}

function buildDiff(path: string, before: string, after: string): string {
  const oldLines = before.split(/\r?\n/)
  const newLines = after.split(/\r?\n/)
  const commonPrefix: string[] = []
  while (oldLines.length && newLines.length && oldLines[0] === newLines[0]) {
    commonPrefix.push(" " + oldLines.shift())
    newLines.shift()
  }
  const commonSuffix: string[] = []
  while (oldLines.length && newLines.length && oldLines.at(-1) === newLines.at(-1)) {
    commonSuffix.unshift(" " + oldLines.pop())
    newLines.pop()
  }
  return [
    "--- a/" + path,
    "+++ b/" + path,
    "@@",
    ...commonPrefix.slice(-3),
    ...oldLines.map((line) => "-" + line),
    ...newLines.map((line) => "+" + line),
    ...commonSuffix.slice(0, 3),
  ].join("\n")
}

/**
 * Propose a documentation insertion only for a human-accepted learning.
 * The returned patch is revision-bound and requires a separate approval/apply action.
 */
export function proposeDocumentationUpdate(input: {
  record: LearningRecord
  target: DocumentationSnapshot
  existingDocuments: readonly DocumentationSnapshot[]
  heading?: string
}): DocumentationProposalResult {
  const { record, target } = input
  if (record.reviewState !== "accepted") return { status: "conflict", reason: "Only human-accepted learnings can propose documentation changes" }
  const validation = validateLearningRecord({ record })
  if (!validation.writeEligible) {
    return { status: "conflict", reason: "Learning record is not write-eligible: " + validation.diagnostics.map((item) => item.code).join(", ") }
  }

  const targetPath = normalizeScanPath(target.path)
  const destination = normalizeScanPath(record.proposedDestination)
  if (!targetPath || targetPath !== destination || !target.revision.trim() || !classifyScanPath({ path: targetPath }).included || !targetPath.toLowerCase().endsWith(".md"))
    return { status: "conflict", reason: "Target must be the learning's safe Markdown destination at a captured document revision" }

  const canonical = canonicalizeLearningStatement(record.statement)
  const duplicate = input.existingDocuments.find((document) =>
    canonicalizeLearningStatement(document.content).includes(canonical),
  )
  if (duplicate) return { status: "duplicate", existingPath: duplicate.path, reason: "The learning statement already exists in the supplied documentation inventory" }

  const lines = target.content.split(/\r?\n/)
  let insertion = lines.length
  if (input.heading?.trim()) {
    const range = headingRange(lines, input.heading)
    if (!range) return { status: "conflict", reason: "The requested heading is missing or ambiguous in the target document" }
    insertion = range.end
  }

  const entry = "- **" + record.category.replaceAll("_", " ") + ":** " + record.statement.trim()
  const nextLines = [...lines.slice(0, insertion)]
  if (nextLines.length && nextLines.at(-1)?.trim() !== "") nextLines.push("")
  nextLines.push(entry)
  if (insertion < lines.length && lines[insertion]?.trim()) nextLines.push("")
  nextLines.push(...lines.slice(insertion))
  const proposedContent = nextLines.join("\n")
  return {
    status: "proposal",
    proposal: {
      status: "proposal",
      destination: targetPath,
      expectedRevision: target.revision,
      expectedContentHash: hashContent(target.content),
      proposedContent,
      diff: buildDiff(targetPath, target.content, proposedContent),
      learningID: record.id,
      requiresApproval: true,
    },
  }
}
