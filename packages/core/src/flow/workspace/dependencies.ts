import type { PlanTaskStatus } from "../plan.js"
import {
  validateWorkspaceGraph,
  type WorkspaceRelationshipEdge,
  type WorkspaceRepositoryNode,
} from "./graph.js"

export interface WorkspaceTaskReference {
  readonly projectID: string
  readonly taskID: string
}

export interface WorkspaceTaskRecord extends WorkspaceTaskReference {
  readonly repositoryNodeID: string
  readonly status: PlanTaskStatus
  readonly line: number
  readonly planHash: string
  readonly planRevision: string
}

export interface WorkspaceTaskDependency {
  readonly from: WorkspaceTaskReference
  readonly to: WorkspaceTaskReference
  readonly relationshipEdgeID?: string
  readonly requiredStatus: "verified"
}

export interface WorkspaceTaskDependencyDiagnostic {
  readonly code:
    | "invalid-graph"
    | "duplicate-task"
    | "missing-task"
    | "invalid-task-identity"
    | "invalid-dependency"
    | "cross-repo-edge-required"
    | "edge-not-found"
    | "edge-not-accepted"
    | "edge-revision-stale"
    | "edge-does-not-connect-repositories"
    | "dependency-cycle"
  readonly message: string
  readonly task?: WorkspaceTaskReference
}

export interface WorkspaceTaskDependencyResult {
  readonly valid: boolean
  readonly topologicalOrder: readonly WorkspaceTaskReference[]
  readonly ready: readonly WorkspaceTaskReference[]
  readonly waiting: readonly WorkspaceTaskReference[]
  readonly diagnostics: readonly WorkspaceTaskDependencyDiagnostic[]
}

function key(reference: WorkspaceTaskReference): string {
  return reference.projectID + "#" + reference.taskID
}

function reference(task: WorkspaceTaskRecord): WorkspaceTaskReference {
  return { projectID: task.projectID, taskID: task.taskID }
}

/**
 * Resolve cross-project task prerequisites and return a deterministic DAG order.
 * Contextual repository cycles are allowed; executable task dependency cycles are rejected.
 */
export function resolveWorkspaceTaskDependencies(input: {
  nodes: readonly WorkspaceRepositoryNode[]
  edges: readonly WorkspaceRelationshipEdge[]
  tasks: readonly WorkspaceTaskRecord[]
  dependencies: readonly WorkspaceTaskDependency[]
  repositoryRevisions: Readonly<Record<string, string>>
}): WorkspaceTaskDependencyResult {
  const diagnostics: WorkspaceTaskDependencyDiagnostic[] = []
  const graph = validateWorkspaceGraph({ nodes: input.nodes, edges: input.edges })
  if (!graph.valid) diagnostics.push(...graph.diagnostics.map((item) => ({
    code: "invalid-graph" as const,
    message: item.message,
  })))

  const nodesByID = new Map(input.nodes.map((node) => [node.id, node]))
  const tasks = new Map<string, WorkspaceTaskRecord>()
  for (const task of input.tasks) {
    const taskKey = key(task)
    if (!task.projectID.trim() || !task.taskID.trim() || !task.repositoryNodeID.trim() || !task.planHash.trim() || !task.planRevision.trim() || !Number.isSafeInteger(task.line) || task.line < 1) {
      diagnostics.push({ code: "invalid-task-identity", message: "Task needs project, task, repository, plan hash/revision, and a valid source line", task: reference(task) })
    }
    if (tasks.has(taskKey)) diagnostics.push({ code: "duplicate-task", message: "Task identity is duplicated across workspace snapshots: " + taskKey, task: reference(task) })
    if (!nodesByID.has(task.repositoryNodeID) || nodesByID.get(task.repositoryNodeID)?.projectID !== task.projectID)
      diagnostics.push({ code: "invalid-task-identity", message: "Task's repository node does not belong to its project: " + taskKey, task: reference(task) })
    tasks.set(taskKey, task)
  }

  const adjacency = new Map<string, Set<string>>()
  const indegree = new Map<string, number>([...tasks.keys()].map((item) => [item, 0]))
  const dependencyKeys = new Set<string>()
  const edgeByID = new Map(input.edges.map((edge) => [edge.id, edge]))

  for (const dependency of input.dependencies) {
    const fromKey = key(dependency.from)
    const toKey = key(dependency.to)
    const from = tasks.get(fromKey)
    const to = tasks.get(toKey)
    if (!from || !to) {
      diagnostics.push({
        code: "missing-task",
        message: "Workspace dependency references a task missing from the supplied plan snapshots: " + (!from ? fromKey : toKey),
        task: dependency.from,
      })
      continue
    }
    if (fromKey === toKey) {
      diagnostics.push({ code: "dependency-cycle", message: "A task cannot depend on itself: " + fromKey, task: dependency.from })
      continue
    }
    const duplicateKey = fromKey + "->" + toKey
    if (dependencyKeys.has(duplicateKey)) {
      diagnostics.push({ code: "invalid-dependency", message: "Task dependency is declared more than once: " + duplicateKey, task: dependency.from })
      continue
    }
    dependencyKeys.add(duplicateKey)
    if (dependency.requiredStatus !== "verified") {
      diagnostics.push({ code: "invalid-dependency", message: "Cross-repository prerequisites must require verified status", task: dependency.from })
      continue
    }

    if (from.projectID !== to.projectID) {
      if (!dependency.relationshipEdgeID) {
        diagnostics.push({ code: "cross-repo-edge-required", message: "Cross-project dependency requires an accepted repository relationship edge", task: dependency.from })
        continue
      }
      const edge = edgeByID.get(dependency.relationshipEdgeID)
      if (!edge) {
        diagnostics.push({ code: "edge-not-found", message: "Repository relationship edge does not exist: " + dependency.relationshipEdgeID, task: dependency.from })
        continue
      }
      if (edge.type !== "depends-on" || edge.reviewState !== "accepted" || edge.evidenceRefs.length === 0 || !edge.acceptedBy?.trim() || !edge.acceptedAt) {
        diagnostics.push({ code: "edge-not-accepted", message: "Cross-project dependency requires an accepted, evidenced depends-on edge", task: dependency.from })
        continue
      }
      const fromNode = nodesByID.get(from.repositoryNodeID)
      const toNode = nodesByID.get(to.repositoryNodeID)
      if (edge.sourceRepositoryID !== fromNode?.id || edge.targetRepositoryID !== toNode?.id) {
        diagnostics.push({ code: "edge-does-not-connect-repositories", message: "Accepted edge does not connect the task's source and dependency repositories", task: dependency.from })
        continue
      }
      if (edge.capturedRevision !== input.repositoryRevisions[from.repositoryNodeID]) {
        diagnostics.push({ code: "edge-revision-stale", message: "Accepted repository relationship was captured at a different source revision", task: dependency.from })
        continue
      }
    }

    const dependents = adjacency.get(toKey) ?? new Set<string>()
    dependents.add(fromKey)
    adjacency.set(toKey, dependents)
    indegree.set(fromKey, (indegree.get(fromKey) ?? 0) + 1)
  }

  const readyQueue = [...tasks.values()]
    .filter((task) => (indegree.get(key(task)) ?? 0) === 0)
    .toSorted((a, b) => a.projectID.localeCompare(b.projectID) || a.line - b.line || a.taskID.localeCompare(b.taskID))
  const topologicalOrder: WorkspaceTaskReference[] = []
  while (readyQueue.length) {
    const current = readyQueue.shift()
    if (!current) continue
    topologicalOrder.push(reference(current))
    for (const dependent of [...(adjacency.get(key(current)) ?? [])].sort()) {
      const next = (indegree.get(dependent) ?? 0) - 1
      indegree.set(dependent, next)
      if (next === 0) {
        const task = tasks.get(dependent)
        if (task) {
          readyQueue.push(task)
          readyQueue.sort((a, b) => a.projectID.localeCompare(b.projectID) || a.line - b.line || a.taskID.localeCompare(b.taskID))
        }
      }
    }
  }

  if (topologicalOrder.length !== tasks.size) {
    const ordered = new Set(topologicalOrder.map(key))
    const remaining = [...tasks.keys()].filter((item) => !ordered.has(item)).sort()
    diagnostics.push({
      code: "dependency-cycle",
      message: "Execution dependency graph contains a cycle: " + remaining.join(", "),
    })
  }

  const ready = input.tasks
    .filter((task) => task.status === "ready" && input.dependencies
      .filter((dependency) => key(dependency.from) === key(task))
      .every((dependency) => tasks.get(key(dependency.to))?.status === "verified"))
    .map(reference)
    .toSorted((a, b) => a.projectID.localeCompare(b.projectID) || a.taskID.localeCompare(b.taskID))
  const waiting = input.tasks
    .filter((task) => task.status !== "verified" && !ready.some((candidate) => key(candidate) === key(task)))
    .map(reference)
    .toSorted((a, b) => a.projectID.localeCompare(b.projectID) || a.taskID.localeCompare(b.taskID))

  return {
    valid: diagnostics.length === 0,
    topologicalOrder,
    ready,
    waiting,
    diagnostics,
  }
}
