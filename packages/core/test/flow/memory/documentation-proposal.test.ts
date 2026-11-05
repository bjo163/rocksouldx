import { describe, expect, test } from "bun:test"
import { proposeDocumentationUpdate } from "../../../src/flow/memory/documentation-proposal.js"
import type { DocumentationSnapshot } from "../../../src/flow/memory/documentation-proposal.js"
import type { LearningRecord } from "../../../src/flow/memory/learning.js"

const record: LearningRecord = {
  id: "learning-1",
  projectID: "project-1",
  category: "verified_fact",
  statement: "The manifest analyzer reports each script package directory.",
  confidence: "high",
  sourceSessionID: "session-1",
  repositoryRevision: "revision-a",
  evidence: [{ kind: "test", reference: "packages/core/test/manifest.test.ts", revision: "revision-a" }],
  privacyAssessment: "clear",
  proposedDestination: "docs/architecture/ROCKSOUL-FLOW-ARCHITECTURE.md",
  proposedDiff: "+ Add manifest package directory note.",
  reviewState: "accepted",
  reviewer: "project-owner",
  reviewedAt: "2026-11-05T12:00:00.000Z",
  reviewReason: "Validated from source and test.",
}

const target: DocumentationSnapshot = {
  path: "docs/architecture/ROCKSOUL-FLOW-ARCHITECTURE.md",
  revision: "document-revision-a",
  content: "# Architecture\n\n## Repo Radar\n\nExisting content.\n\n## Other\n\nKeep this section.\n",
}

describe("proposeDocumentationUpdate", () => {
  test("proposes a revision-bound insertion under a unique heading without writing", () => {
    const result = proposeDocumentationUpdate({
      record,
      target,
      existingDocuments: [target],
      heading: "Repo Radar",
    })
    expect(result.status).toBe("proposal")
    if (result.status !== "proposal") return
    expect(result.proposal).toMatchObject({
      destination: target.path,
      expectedRevision: target.revision,
      learningID: record.id,
      requiresApproval: true,
    })
    expect(result.proposal.diff).toContain("+ - **verified fact:** The manifest analyzer reports each script package directory.")
    expect(result.proposal.proposedContent).toContain("## Other\n\nKeep this section.")
  })

  test("refuses candidates that were not accepted by a human", () => {
    const result = proposeDocumentationUpdate({
      record: { ...record, reviewState: "candidate", reviewer: undefined, reviewedAt: undefined, reviewReason: undefined },
      target,
      existingDocuments: [target],
    })
    expect(result).toMatchObject({ status: "conflict" })
  })

  test("detects duplicates across the supplied documentation inventory", () => {
    const result = proposeDocumentationUpdate({
      record,
      target,
      existingDocuments: [
        { path: "docs/other.md", revision: "revision-b", content: "The manifest analyzer reports each script package directory." },
      ],
    })
    expect(result).toMatchObject({ status: "duplicate", existingPath: "docs/other.md" })
  })

  test("rejects missing or ambiguous anchors and mismatched target paths", () => {
    expect(proposeDocumentationUpdate({
      record,
      target,
      existingDocuments: [target],
      heading: "Does Not Exist",
    })).toMatchObject({ status: "conflict" })
    expect(proposeDocumentationUpdate({
      record,
      target: { ...target, path: "docs/other.md" },
      existingDocuments: [],
    })).toMatchObject({ status: "conflict" })
  })

  test("refuses a learning whose evidence revision or privacy review is invalid", () => {
    expect(proposeDocumentationUpdate({
      record: { ...record, evidence: [{ kind: "source", reference: "src/a.ts", revision: "old" }] },
      target,
      existingDocuments: [],
    })).toMatchObject({ status: "conflict" })
    expect(proposeDocumentationUpdate({
      record: { ...record, privacyAssessment: "uncertain" },
      target,
      existingDocuments: [],
    })).toMatchObject({ status: "conflict" })
  })
})
