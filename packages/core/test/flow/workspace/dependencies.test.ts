import { describe, expect, test } from "bun:test"
import { resolveWorkspaceTaskDependencies } from "../../../src/flow/workspace/dependencies.js"
import type { WorkspaceTaskRecord, WorkspaceTaskDependency } from "../../../src/flow/workspace/dependencies.js"
import type { WorkspaceRepositoryNode, WorkspaceRelationshipEdge } from "../../../src/flow/workspace/graph.js"

const nodes: WorkspaceRepositoryNode[] = [
  { id: "repo-a", projectID: "project-a", checkoutID: "checkout-a", branch: "main", revision: "rev-a", dirtyState: "clean" },
  { id: "repo-b", projectID: "project-b", checkoutID: "checkout-b", branch: "main", revision: "rev-b", dirtyState: "clean" },
]
const tasks: WorkspaceTaskRecord[] = [
  { projectID: "project-a", taskID: "RSF-101", repositoryNodeID: "repo-a", status: "verified", line: 10, planHash: "hash-a", planRevision: "rev-a" },
  { projectID: "project-b", taskID: "APP-101", repositoryNodeID: "repo-b", status: "ready", line: 10, planHash: "hash-b", planRevision: "rev-b" },
  { projectID: "project-b", taskID: "APP-102", repositoryNodeID: "repo-b", status: "ready", line: 30, planHash: "hash-b", planRevision: "rev-b" },
]
const edge: WorkspaceRelationshipEdge = {
  id: "edge-a-b",
  sourceRepositoryID: "repo-b",
  targetRepositoryID: "repo-a",
  type: "depends-on",
  provenance: "declared",
  sourceRef: "docs/dependencies.md",
  capturedRevision: "rev-b",
  reviewState: "accepted",
  evidenceRefs: ["docs/dependencies.md"],
  acceptedBy: "project-owner",
  acceptedAt: "2026-11-05T12:00:00.000Z",
}
const dependency: WorkspaceTaskDependency = {
  from: { projectID: "project-b", taskID: "APP-101" },
  to: { projectID: "project-a", taskID: "RSF-101" },
  relationshipEdgeID: "edge-a-b",
  requiredStatus: "verified",
}

describe("resolveWorkspaceTaskDependencies", () => {
  test("orders accepted cross-project dependencies and selects only ready tasks", () => {
    const result = resolveWorkspaceTaskDependencies({
      nodes,
      edges: [edge],
      tasks,
      dependencies: [dependency],
      repositoryRevisions: { "repo-a": "rev-a", "repo-b": "rev-b" },
    })
    expect(result.valid).toBe(true)
    expect(result.topologicalOrder).toEqual([
      { projectID: "project-a", taskID: "RSF-101" },
      { projectID: "project-b", taskID: "APP-101" },
      { projectID: "project-b", taskID: "APP-102" },
    ])
    expect(result.ready).toEqual([{ projectID: "project-b", taskID: "APP-101" }, { projectID: "project-b", taskID: "APP-102" }])
  })

  test("requires accepted dependency relationships for cross-project links", () => {
    const result = resolveWorkspaceTaskDependencies({
      nodes,
      edges: [{ ...edge, reviewState: "candidate", acceptedBy: undefined, acceptedAt: undefined }],
      tasks,
      dependencies: [dependency],
      repositoryRevisions: { "repo-a": "rev-a", "repo-b": "rev-b" },
    })
    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("edge-not-accepted")
  })

  test("rejects stale edges and edges that connect the wrong repositories", () => {
    const stale = resolveWorkspaceTaskDependencies({
      nodes,
      edges: [edge],
      tasks,
      dependencies: [dependency],
      repositoryRevisions: { "repo-a": "rev-a", "repo-b": "rev-new" },
    })
    expect(stale.diagnostics.map((item) => item.code)).toContain("edge-revision-stale")

    const wrong = resolveWorkspaceTaskDependencies({
      nodes,
      edges: [{ ...edge, sourceRepositoryID: "repo-a", targetRepositoryID: "repo-b" }],
      tasks,
      dependencies: [dependency],
      repositoryRevisions: { "repo-a": "rev-a", "repo-b": "rev-b" },
    })
    expect(wrong.diagnostics.map((item) => item.code)).toContain("edge-does-not-connect-repositories")
  })

  test("rejects missing tasks, duplicate dependencies, and dependency cycles", () => {
    const cycle: WorkspaceTaskDependency[] = [
      dependency,
      {
        from: { projectID: "project-a", taskID: "RSF-101" },
        to: { projectID: "project-b", taskID: "APP-101" },
        relationshipEdgeID: "reverse-edge",
        requiredStatus: "verified",
      },
    ]
    const result = resolveWorkspaceTaskDependencies({
      nodes,
      edges: [edge, { ...edge, id: "reverse-edge", sourceRepositoryID: "repo-a", targetRepositoryID: "repo-b", capturedRevision: "rev-a" }],
      tasks,
      dependencies: [...cycle, cycle[0]!],
      repositoryRevisions: { "repo-a": "rev-a", "repo-b": "rev-b" },
    })
    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("dependency-cycle")
    expect(result.diagnostics.map((item) => item.code)).toContain("invalid-dependency")
  })

  test("allows contextual repository graph cycles but checks task-level DAG separately", () => {
    const result = resolveWorkspaceTaskDependencies({
      nodes,
      edges: [
        edge,
        {
          ...edge,
          id: "related-reverse",
          sourceRepositoryID: "repo-a",
          targetRepositoryID: "repo-b",
          type: "related",
          capturedRevision: "rev-a",
          reviewState: "candidate",
          acceptedBy: undefined,
          acceptedAt: undefined,
          evidenceRefs: [],
        },
      ],
      tasks,
      dependencies: [dependency],
      repositoryRevisions: { "repo-a": "rev-a", "repo-b": "rev-b" },
    })
    expect(result.valid).toBe(true)
  })
})
