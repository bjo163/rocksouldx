import type { PlanTask } from "../plan.js"

export type PlanTaskRelationship = "possible-duplicate" | "scope-overlap" | "complementary" | "distinct"

export interface PlanTaskOverlapFinding {
  readonly firstTaskID: string
  readonly secondTaskID: string
  readonly relationship: PlanTaskRelationship
  readonly confidence: "low" | "medium" | "high"
  readonly titleGoalSimilarity: number
  readonly acceptanceSimilarity: number
  readonly sharedPaths: readonly string[]
  readonly rationale: readonly string[]
  readonly requiresHumanReview: true
}

export interface PlanOverlapResult {
  readonly revision: string
  readonly findings: readonly PlanTaskOverlapFinding[]
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "has", "have", "in", "into",
  "is", "it", "its", "may", "must", "not", "of", "on", "or", "should", "the", "their", "then", "this",
  "to", "with", "without", "within", "project", "task", "system", "feature", "build", "add", "implement",
])

function tokens(value: string): Set<string> {
  return new Set(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((token) => !STOP_WORDS.has(token)) ?? [],
  )
}

function similarity(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 && right.size === 0) return 0
  const intersection = [...left].filter((value) => right.has(value)).length
  const union = new Set([...left, ...right]).size
  return union === 0 ? 0 : intersection / union
}

function taskText(task: PlanTask, fields: readonly string[]): string {
  return fields.map((field) => task.fields[field] ?? "").join(" ")
}

function pathReferences(value: string): Set<string> {
  const matches = value.match(/(?:packages|services|apps|docs)\/[A-Za-z0-9_.*@/-]+/g) ?? []
  return new Set(matches.map((candidate) => candidate.replace(/[.,;:]+$/g, "").replace(/\/+$/, "")))
}

function pathsOverlap(left: string, right: string): boolean {
  if (left === right) return true
  if (left.endsWith("/**") && right.startsWith(left.slice(0, -2))) return true
  if (right.endsWith("/**") && left.startsWith(right.slice(0, -2))) return true
  return left.startsWith(right + "/") || right.startsWith(left + "/")
}

function sharedPathReferences(left: PlanTask, right: PlanTask): string[] {
  const leftPaths = pathReferences(taskText(left, ["Scope", "Deliverable"]))
  const rightPaths = pathReferences(taskText(right, ["Scope", "Deliverable"]))
  return [...leftPaths]
    .flatMap((a) => [...rightPaths].filter((b) => pathsOverlap(a, b)).map((b) => (a.length <= b.length ? a : b)))
    .filter((value, index, all) => all.indexOf(value) === index)
    .toSorted()
}

function relationship(input: {
  titleGoalSimilarity: number
  acceptanceSimilarity: number
  sharedPaths: readonly string[]
  dependencyRelated: boolean
}): { relationship: PlanTaskRelationship; confidence: "low" | "medium" | "high"; rationale: string[] } {
  if (input.titleGoalSimilarity >= 0.78 && (input.acceptanceSimilarity >= 0.35 || input.sharedPaths.length > 0)) {
    return {
      relationship: "possible-duplicate",
      confidence: input.titleGoalSimilarity >= 0.9 && input.sharedPaths.length > 0 ? "high" : "medium",
      rationale: [
        "Task title/goal language is strongly similar",
        ...(input.acceptanceSimilarity >= 0.35 ? ["Acceptance wording also overlaps"] : []),
        ...(input.sharedPaths.length ? ["Tasks name overlapping repository paths"] : []),
      ],
    }
  }

  if (input.sharedPaths.length > 0) {
    return {
      relationship: "scope-overlap",
      confidence: "medium",
      rationale: [
        "Both tasks name the same or nested paths in Scope/Deliverable; this is a writer-collision candidate, not proof of conflicting behavior",
      ],
    }
  }

  if (input.dependencyRelated || input.acceptanceSimilarity >= 0.25) {
    return {
      relationship: "complementary",
      confidence: "low",
      rationale: [
        input.dependencyRelated ? "Tasks have an explicit dependency relationship" : "Acceptance wording has partial overlap",
        "No explicit path collision or strong duplicate signal was found",
      ],
    }
  }

  return {
    relationship: "distinct",
    confidence: "low",
    rationale: ["No strong intent, acceptance, dependency, or explicit path overlap was found"],
  }
}

/**
 * Produce conservative pairwise overlap candidates for one parsed project plan.
 * Similarity is a review lead only: no task is deleted, merged, reordered, or rewritten.
 */
export function analyzePlanTaskOverlap(input: {
  tasks: readonly PlanTask[]
  revision: string
  minimumSimilarity?: number
}): PlanOverlapResult {
  const minimumSimilarity = Math.max(0.5, Math.min(1, input.minimumSimilarity ?? 0.18))
  const tasks = input.tasks.toSorted((a, b) => a.id.localeCompare(b.id))
  const findings: PlanTaskOverlapFinding[] = []

  for (let leftIndex = 0; leftIndex < tasks.length; leftIndex++) {
    const left = tasks[leftIndex]
    if (!left) continue
    for (let rightIndex = leftIndex + 1; rightIndex < tasks.length; rightIndex++) {
      const right = tasks[rightIndex]
      if (!right) continue

      const leftIntent = tokens(taskText(left, ["Goal", "Scope"]))
      const rightIntent = tokens(taskText(right, ["Goal", "Scope"]))
      const titleGoalSimilarity = similarity(
        tokens(left.title + " " + (left.fields.Goal ?? "")),
        tokens(right.title + " " + (right.fields.Goal ?? "")),
      )
      const acceptanceSimilarity = similarity(tokens(taskText(left, ["Acceptance"])), tokens(taskText(right, ["Acceptance"])))
      const intentSimilarity = similarity(leftIntent, rightIntent)
      const sharedPaths = sharedPathReferences(left, right)
      const dependencyRelated = left.dependsOn.includes(right.id) || right.dependsOn.includes(left.id)

      if (titleGoalSimilarity < minimumSimilarity && intentSimilarity < minimumSimilarity && acceptanceSimilarity < minimumSimilarity && sharedPaths.length === 0 && !dependencyRelated)
        continue

      const classified = relationship({ titleGoalSimilarity, acceptanceSimilarity, sharedPaths, dependencyRelated })
      findings.push({
        firstTaskID: left.id,
        secondTaskID: right.id,
        relationship: classified.relationship,
        confidence: classified.confidence,
        titleGoalSimilarity: Number(titleGoalSimilarity.toFixed(3)),
        acceptanceSimilarity: Number(acceptanceSimilarity.toFixed(3)),
        sharedPaths,
        rationale: classified.rationale,
        requiresHumanReview: true,
      })
    }
  }

  findings.sort((a, b) =>
    a.firstTaskID.localeCompare(b.firstTaskID) ||
    a.secondTaskID.localeCompare(b.secondTaskID) ||
    a.relationship.localeCompare(b.relationship),
  )

  return { revision: input.revision, findings }
}
