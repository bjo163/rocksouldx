import type { RequirementUnit } from "./requirements.js"
import { classifyScanPath } from "../repo/scan-policy.js"

export type RequirementEvidenceKind = "source" | "test" | "docs" | "config" | "plan"

export interface RequirementEvidenceSource {
  readonly path: string
  readonly kind: RequirementEvidenceKind
  readonly revision: string
  readonly content?: string
}

export interface RequirementEvidenceCandidate {
  readonly path: string
  readonly kind: RequirementEvidenceKind
  readonly revision: string
  readonly matchedTerms: readonly string[]
  readonly lineNumbers: readonly number[]
  readonly stale: boolean
}

export interface RequirementEvidenceResult {
  readonly requirementID: string
  readonly snapshotRevision: string
  readonly candidates: readonly RequirementEvidenceCandidate[]
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "has", "have", "in", "into",
  "is", "it", "its", "may", "must", "not", "of", "on", "or", "should", "the", "their", "then", "this",
  "to", "with", "without", "within", "project", "requirement", "task", "system", "feature",
])

const KIND_ORDER: Record<RequirementEvidenceKind, number> = {
  test: 0,
  source: 1,
  config: 2,
  docs: 3,
  plan: 4,
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((token) => !STOP_WORDS.has(token)) ?? [],
  )
}

function requirementTokens(requirement: RequirementUnit): Set<string> {
  const values = [
    requirement.title,
    requirement.statement,
    requirement.expectedBehavior ?? "",
    ...requirement.constraints,
    ...requirement.nonGoals,
    ...requirement.acceptanceCriteria,
    ...requirement.openQuestions,
  ]
  return new Set(values.flatMap((value) => [...tokens(value)]))
}

function matchingLines(content: string | undefined, terms: ReadonlySet<string>): number[] {
  if (!content || terms.size === 0) return []
  const matches: number[] = []
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const lineTokens = tokens(line)
    if ([...terms].some((term) => lineTokens.has(term))) matches.push(index + 1)
    if (matches.length >= 8) break
  }
  return matches
}

/**
 * Retrieve lexical leads for a requirement from one revision-bound repository inventory.
 * Results are pointers for review, not proof or an automatic capability classification.
 */
export function retrieveRequirementEvidence(input: {
  requirements: readonly RequirementUnit[]
  sources: readonly RequirementEvidenceSource[]
  snapshotRevision: string
  maxCandidatesPerRequirement?: number
}): RequirementEvidenceResult[] {
  const maxCandidates = Math.max(1, Math.min(50, Math.floor(input.maxCandidatesPerRequirement ?? 8)))
  const normalizedSources = input.sources.flatMap((source) => {
    const decision = classifyScanPath({ path: source.path })
    if (!decision.included) return []
    return [{ ...source, path: decision.path }]
  })

  return input.requirements.map((requirement) => {
    const terms = requirementTokens(requirement)
    const candidates = normalizedSources.flatMap((source): RequirementEvidenceCandidate[] => {
      const sourceTerms = tokens(source.path + " " + (source.content ?? ""))
      const matchedTerms = [...terms].filter((term) => sourceTerms.has(term)).toSorted()
      if (matchedTerms.length === 0) return []
      return [{
        path: source.path,
        kind: source.kind,
        revision: source.revision,
        matchedTerms,
        lineNumbers: matchingLines(source.content, new Set(matchedTerms)),
        stale: source.revision !== input.snapshotRevision,
      }]
    })

    candidates.sort((a, b) => {
      if (a.stale !== b.stale) return a.stale ? 1 : -1
      if (a.matchedTerms.length !== b.matchedTerms.length) return b.matchedTerms.length - a.matchedTerms.length
      if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
      return a.path.localeCompare(b.path)
    })

    const unique = candidates.filter((item, index, all) => all.findIndex((candidate) => candidate.path === item.path) === index)
    return {
      requirementID: requirement.id,
      snapshotRevision: input.snapshotRevision,
      candidates: unique.slice(0, maxCandidates),
    }
  })
}
