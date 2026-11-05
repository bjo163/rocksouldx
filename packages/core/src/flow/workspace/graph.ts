export type WorkspaceRelationshipType =
  | "depends-on"
  | "shared-contract"
  | "client-of"
  | "deployment-pair"
  | "shared-library"
  | "documentation-for"
  | "related"

export type WorkspaceEdgeProvenance = "declared" | "inferred"
export type WorkspaceEdgeReviewState = "candidate" | "accepted" | "rejected" | "stale"
export type WorkspaceDirtyState = "clean" | "dirty" | "unknown"

export interface WorkspaceRepositoryNode {
  readonly id: string
  readonly projectID: string
  readonly checkoutID: string
  readonly remoteIdentity?: string
  readonly branch?: string
  readonly revision?: string
  readonly dirtyState: WorkspaceDirtyState
}

export interface WorkspaceRelationshipEdge {
  readonly id: string
  readonly sourceRepositoryID: string
  readonly targetRepositoryID: string
  readonly type: WorkspaceRelationshipType
  readonly provenance: WorkspaceEdgeProvenance
  readonly sourceRef: string
  readonly capturedRevision: string
  readonly reviewState: WorkspaceEdgeReviewState
  readonly evidenceRefs: readonly string[]
  readonly acceptedBy?: string
  readonly acceptedAt?: string
}

export interface WorkspaceGraphDiagnostic {
  readonly code:
    | "duplicate-node-id"
    | "duplicate-checkout-id"
    | "missing-node-identity"
    | "invalid-dirty-state"
    | "invalid-remote-identity"
    | "duplicate-edge-id"
    | "missing-edge-node"
    | "self-edge"
    | "duplicate-edge"
    | "invalid-edge-enum"
    | "missing-edge-provenance"
    | "incomplete-edge-acceptance"
  readonly message: string
}

export interface WorkspaceGraphValidation {
  readonly valid: boolean
  readonly nodes: readonly (WorkspaceRepositoryNode & { readonly normalizedRemoteIdentity?: string })[]
  readonly edges: readonly WorkspaceRelationshipEdge[]
  readonly diagnostics: readonly WorkspaceGraphDiagnostic[]
}

/**
 * Normalize an HTTPS/SSH Git remote to a credential-free host/path identity.
 * Returns undefined for malformed or credential-bearing values.
 */
export function normalizeRemoteIdentity(input: string): string | undefined {
  const value = input.trim()
  if (!value) return undefined

  if (/^[^/\s@]+@[^:/\s]+:.+/.test(value)) {
    const match = value.match(/^[^/\s@]+@([^:/\s]+):(.+)$/)
    if (!match?.[1] || !match[2]) return undefined
    const repository = match[2].replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "")
    if (!repository || repository.split("/").some((part) => part === ".." || part === ".")) return undefined
    return match[1].toLowerCase() + "/" + repository.toLowerCase()
  }

  try {
    const url = new URL(value)
    if (url.username || url.password || !["https:", "ssh:", "git:"].includes(url.protocol)) return undefined
    const repository = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "")
    if (!repository || repository.split("/").some((part) => part === ".." || part === ".")) return undefined
    return url.host.toLowerCase() + "/" + repository.toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * Validate a contextual repository relationship graph.
 * Contextual cycles are permitted; an execution dependency graph is a separate scheduling concern.
 */
export function validateWorkspaceGraph(input: {
  nodes: readonly WorkspaceRepositoryNode[]
  edges: readonly WorkspaceRelationshipEdge[]
}): WorkspaceGraphValidation {
  const diagnostics: WorkspaceGraphDiagnostic[] = []
  const nodeIDs = new Set<string>()
  const checkoutIDs = new Set<string>()
  const normalizedNodes = input.nodes.map((node) => {
    if (!node.id.trim() || !node.projectID.trim() || !node.checkoutID.trim())
      diagnostics.push({ code: "missing-node-identity", message: "Node, Project, and checkout identities are required" })
    if (nodeIDs.has(node.id)) diagnostics.push({ code: "duplicate-node-id", message: "Duplicate repository node ID: " + node.id })
    if (checkoutIDs.has(node.checkoutID))
      diagnostics.push({ code: "duplicate-checkout-id", message: "A local checkout can appear only once: " + node.checkoutID })
    nodeIDs.add(node.id)
    checkoutIDs.add(node.checkoutID)

    if (!["clean", "dirty", "unknown"].includes(node.dirtyState))
      diagnostics.push({ code: "invalid-dirty-state", message: "Unknown dirty state for node: " + node.id })

    const normalizedRemoteIdentity = node.remoteIdentity ? normalizeRemoteIdentity(node.remoteIdentity) : undefined
    if (node.remoteIdentity && !normalizedRemoteIdentity)
      diagnostics.push({ code: "invalid-remote-identity", message: "Remote identity must be a credential-free Git remote: " + node.id })

    return {
      ...node,
      ...(normalizedRemoteIdentity ? { normalizedRemoteIdentity } : {}),
    }
  })

  const edgeIDs = new Set<string>()
  const edgeKeys = new Set<string>()
  const relationshipTypes: readonly string[] = [
    "depends-on", "shared-contract", "client-of", "deployment-pair", "shared-library", "documentation-for", "related",
  ]
  const provenances: readonly string[] = ["declared", "inferred"]
  const reviewStates: readonly string[] = ["candidate", "accepted", "rejected", "stale"]

  for (const edge of input.edges) {
    if (!edge.id.trim()) diagnostics.push({ code: "duplicate-edge-id", message: "Edge ID must be non-empty" })
    if (edgeIDs.has(edge.id)) diagnostics.push({ code: "duplicate-edge-id", message: "Duplicate workspace edge ID: " + edge.id })
    edgeIDs.add(edge.id)

    if (!nodeIDs.has(edge.sourceRepositoryID) || !nodeIDs.has(edge.targetRepositoryID))
      diagnostics.push({ code: "missing-edge-node", message: "Edge references a repository node that is not registered: " + edge.id })
    if (edge.sourceRepositoryID === edge.targetRepositoryID)
      diagnostics.push({ code: "self-edge", message: "Self relationships are not supported: " + edge.id })

    const key = [edge.sourceRepositoryID, edge.targetRepositoryID, edge.type].join("|")
    if (edgeKeys.has(key)) diagnostics.push({ code: "duplicate-edge", message: "Duplicate relationship edge: " + key })
    edgeKeys.add(key)

    if (!relationshipTypes.includes(edge.type) || !provenances.includes(edge.provenance) || !reviewStates.includes(edge.reviewState))
      diagnostics.push({ code: "invalid-edge-enum", message: "Edge contains an unsupported relationship, provenance, or review state: " + edge.id })

    if (!edge.sourceRef.trim() || !edge.capturedRevision.trim())
      diagnostics.push({ code: "missing-edge-provenance", message: "Edge requires a source reference and captured revision: " + edge.id })

    if (edge.reviewState === "accepted") {
      if (!edge.acceptedBy?.trim() || !edge.acceptedAt || !Number.isFinite(Date.parse(edge.acceptedAt)) || edge.evidenceRefs.length === 0)
        diagnostics.push({ code: "incomplete-edge-acceptance", message: "Accepted edges require reviewer, timestamp, and evidence: " + edge.id })
    }
  }

  return {
    valid: diagnostics.length === 0,
    nodes: normalizedNodes,
    edges: input.edges,
    diagnostics,
  }
}
