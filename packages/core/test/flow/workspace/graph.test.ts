import { describe, expect, test } from "bun:test"
import { normalizeRemoteIdentity, validateWorkspaceGraph } from "../../../src/flow/workspace/graph.js"
import type { WorkspaceRelationshipEdge, WorkspaceRepositoryNode } from "../../../src/flow/workspace/graph.js"

const nodes: WorkspaceRepositoryNode[] = [
  {
    id: "repo-a",
    projectID: "project-a",
    checkoutID: "checkout-a",
    remoteIdentity: "git@github.com:example/a.git",
    branch: "main",
    revision: "revision-a",
    dirtyState: "clean",
  },
  {
    id: "repo-b",
    projectID: "project-b",
    checkoutID: "checkout-b",
    remoteIdentity: "https://github.com/example/b",
    branch: "dev",
    revision: "revision-b",
    dirtyState: "dirty",
  },
]

const edge = (overrides: Partial<WorkspaceRelationshipEdge> = {}): WorkspaceRelationshipEdge => ({
  id: "edge-1",
  sourceRepositoryID: "repo-a",
  targetRepositoryID: "repo-b",
  type: "shared-contract",
  provenance: "declared",
  sourceRef: "docs/api-contract.md",
  capturedRevision: "revision-a",
  reviewState: "candidate",
  evidenceRefs: ["docs/api-contract.md"],
  ...overrides,
})

describe("normalizeRemoteIdentity", () => {
  test("normalizes HTTPS and SSH remotes without .git suffixes", () => {
    expect(normalizeRemoteIdentity("git@github.com:Example/Repo.git")).toBe("github.com/example/repo")
    expect(normalizeRemoteIdentity("https://GitHub.com/Example/Repo.git")).toBe("github.com/example/repo")
  })

  test("rejects malformed or credential-bearing remote URLs", () => {
    expect(normalizeRemoteIdentity("https://user:secret@github.com/example/repo")).toBeUndefined()
    expect(normalizeRemoteIdentity("not a remote")).toBeUndefined()
  })
})

describe("validateWorkspaceGraph", () => {
  test("accepts separate checkouts and returns normalized remote identities", () => {
    const result = validateWorkspaceGraph({ nodes, edges: [edge()] })
    expect(result.valid).toBe(true)
    expect(result.nodes[0]?.normalizedRemoteIdentity).toBe("github.com/example/a")
  })

  test("allows contextual cycles but rejects missing nodes, self-edges, and duplicate relationships", () => {
    const result = validateWorkspaceGraph({
      nodes,
      edges: [
        edge(),
        edge({
          id: "edge-2",
          sourceRepositoryID: "repo-b",
          targetRepositoryID: "repo-a",
          type: "depends-on",
        }),
        edge({ id: "edge-3", sourceRepositoryID: "repo-a", targetRepositoryID: "repo-a" }),
        edge({ id: "edge-4", targetRepositoryID: "repo-missing" }),
        edge({ id: "edge-5", type: "shared-contract" }),
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.diagnostics.map((item) => item.code)).toContain("self-edge")
    expect(result.diagnostics.map((item) => item.code)).toContain("missing-edge-node")
    expect(result.diagnostics.map((item) => item.code)).toContain("duplicate-edge")
  })

  test("requires reviewer, timestamp, and evidence before accepting an edge", () => {
    const result = validateWorkspaceGraph({
      nodes,
      edges: [edge({ reviewState: "accepted" })],
    })

    expect(result.diagnostics.map((item) => item.code)).toContain("incomplete-edge-acceptance")
  })

  test("rejects duplicate checkout identity even when remote identity matches", () => {
    const result = validateWorkspaceGraph({
      nodes: [nodes[0]!, { ...nodes[1]!, checkoutID: "checkout-a" }],
      edges: [],
    })

    expect(result.diagnostics.map((item) => item.code)).toContain("duplicate-checkout-id")
  })
})
