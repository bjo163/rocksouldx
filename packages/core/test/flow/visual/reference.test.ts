import { describe, expect, test } from "bun:test"
import {
  assessVisualReferenceMutation,
  validateVisualReference,
} from "../../../src/flow/visual/reference.js"
import type { VisualReferenceRecord } from "../../../src/flow/visual/reference.js"

const reference = (overrides: Partial<VisualReferenceRecord> = {}): VisualReferenceRecord => ({
  id: "ref-a",
  projectID: "project-a",
  kind: "screenshot",
  source: "reference://asset-a",
  sourceDescription: "Approved screenshot from the project's local visual reference set",
  mediaType: "image/png",
  usageRights: "user-supplied",
  capturedAt: "2026-11-05T10:00:00.000Z",
  sourceRevision: "revision-a",
  screenIDs: ["home"],
  tags: ["home", "approved"],
  approvedBy: "project-owner",
  approvedAt: "2026-11-05T10:01:00.000Z",
  ...overrides,
})

describe("validateVisualReference", () => {
  test("accepts a project-scoped reference with provenance and explicit approval", () => {
    expect(validateVisualReference({ record: reference() }).valid).toBe(true)
  })

  test("rejects unknown usage rights, unsupported media, and missing approval", () => {
    const result = validateVisualReference({
      record: reference({ usageRights: "unknown", mediaType: "image/svg+xml", approvedBy: "" }),
    })
    expect(result.valid).toBe(false)
    expect(result.diagnostics).toContain("Usage rights must be known before a reference can be registered")
    expect(result.diagnostics).toContain("Reference media type is unsupported")
  })

  test("rejects credential-bearing URLs and signed query parameters", () => {
    expect(validateVisualReference({
      record: reference({ kind: "url", source: "https://user:pass@example.com/image.png" }),
    }).valid).toBe(false)
    expect(validateVisualReference({
      record: reference({ kind: "url", source: "https://example.com/image.png?signature=secret" }),
    }).valid).toBe(false)
    expect(validateVisualReference({
      record: reference({ kind: "url", source: "http://example.com/image.png" }),
    }).valid).toBe(false)
  })

  test("keeps reference IDs unique within a project, not globally", () => {
    expect(validateVisualReference({
      record: reference(),
      existing: [reference({ projectID: "project-b" })],
    }).valid).toBe(true)
    expect(validateVisualReference({
      record: reference(),
      existing: [reference({ id: "same-id" }), reference({ id: "ref-a" })],
    }).valid).toBe(false)
  })
})

describe("assessVisualReferenceMutation", () => {
  test("requires explicit approval for add, replace, and delete", () => {
    expect(assessVisualReferenceMutation({
      operation: "add",
      targetProjectID: "project-a",
      proposed: reference(),
      explicitUserAction: false,
    }).allowed).toBe(false)
    expect(assessVisualReferenceMutation({
      operation: "add",
      targetProjectID: "project-a",
      proposed: reference(),
      explicitUserAction: true,
    }).allowed).toBe(true)
    expect(assessVisualReferenceMutation({
      operation: "replace",
      targetProjectID: "project-a",
      current: reference(),
      proposed: reference({ source: "reference://replacement" }),
      explicitUserAction: true,
    }).allowed).toBe(true)
    expect(assessVisualReferenceMutation({
      operation: "delete",
      targetProjectID: "project-a",
      current: reference(),
      explicitUserAction: true,
    }).allowed).toBe(true)
  })

  test("requires a separate approval for cross-project reference reuse", () => {
    const current = reference()
    const proposed = reference({ id: "ref-b", projectID: "project-b" })
    expect(assessVisualReferenceMutation({
      operation: "copy",
      targetProjectID: "project-b",
      current,
      proposed,
      explicitUserAction: true,
      crossProjectApproved: false,
    }).allowed).toBe(false)
    expect(assessVisualReferenceMutation({
      operation: "copy",
      targetProjectID: "project-b",
      current,
      proposed,
      explicitUserAction: true,
      crossProjectApproved: true,
    }).allowed).toBe(true)
  })

  test("does not permit replacing or deleting another project's reference", () => {
    expect(assessVisualReferenceMutation({
      operation: "replace",
      targetProjectID: "project-b",
      current: reference(),
      proposed: reference({ projectID: "project-b" }),
      explicitUserAction: true,
    }).allowed).toBe(false)
    expect(assessVisualReferenceMutation({
      operation: "delete",
      targetProjectID: "project-b",
      current: reference(),
      explicitUserAction: true,
    }).allowed).toBe(false)
  })
})
