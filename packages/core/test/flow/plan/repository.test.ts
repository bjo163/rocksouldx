import { describe, expect, test } from "bun:test"
import { createPlanRepository, planContentHash, updatePlanTaskStatusMarkdown } from "../../../src/flow/plan/repository.js"
import type { PlanDocumentSnapshot, PlanDocumentStore } from "../../../src/flow/plan/repository.js"

const markdown = [
  "# ROCKSOUL FLOW",
  "",
  "A user-maintained plan.",
  "",
  "## RSF-101 — First task",
  "",
  "- Status: planned",
  "- Depends on: none",
  "- Goal: Preserve unknown metadata.",
  "- Scope:",
  "  - Update packages/core/src/flow/plan/**.",
  "- Acceptance:",
  "  - Unknown metadata is preserved.",
  "- Verification:",
  "  - Run focused tests.",
  "- Deliverable: One bounded result.",
  "- Owner: local-ai",
  "- Custom metadata: do not drop me",
  "",
  "## RSF-102 — Second task",
  "",
  "- Status: planned",
  "- Depends on: RSF-101",
  "- Goal: Wait for the first task.",
  "- Scope: Keep it small.",
  "- Acceptance: Dependency is verified.",
  "- Verification: Run focused tests.",
  "- Deliverable: One bounded result.",
  "",
].join("\n")

function storeFixture(initial = markdown) {
  let snapshot: PlanDocumentSnapshot = {
    path: "docs/plans/ROCKSOUL-FLOW.plan.md",
    revision: "revision-a",
    content: initial,
  }
  let writes = 0
  const store: PlanDocumentStore = {
    read: async (path) => path === snapshot.path ? snapshot : undefined,
    compareAndSwap: async (input) => {
      if (input.path !== snapshot.path || input.expectedRevision !== snapshot.revision || input.expectedContentHash !== planContentHash(snapshot.content))
        return undefined
      writes++
      snapshot = { ...snapshot, revision: "revision-b", content: input.content }
      return { revision: snapshot.revision }
    },
  }
  return { store, snapshot: () => snapshot, writes: () => writes }
}

describe("updatePlanTaskStatusMarkdown", () => {
  test("changes only the selected status and preserves unrelated Markdown and metadata", () => {
    const result = updatePlanTaskStatusMarkdown({ content: markdown, taskID: "RSF-101", status: "ready" })
    expect(result.content).toContain("- Status: ready")
    expect(result.content).toContain("- Owner: local-ai")
    expect(result.content).toContain("- Custom metadata: do not drop me")
    expect(result.content).toContain("## RSF-102 — Second task\n\n- Status: planned")
  })

  test("refuses malformed plans, duplicate IDs, and missing tasks", () => {
    expect(updatePlanTaskStatusMarkdown({ content: "# empty", taskID: "RSF-101", status: "ready" }).content).toBeUndefined()
    expect(updatePlanTaskStatusMarkdown({ content: markdown, taskID: "RSF-999", status: "ready" }).content).toBeUndefined()
  })

  test("preserves CRLF line endings in the selected status line", () => {
    const crlf = markdown.replaceAll("\n", "\r\n")
    const result = updatePlanTaskStatusMarkdown({ content: crlf, taskID: "RSF-101", status: "ready" })
    expect(result.content).toContain("- Status: ready\r\n")
    expect(result.content?.replaceAll("\r\n", "").includes("\n")).toBe(false)
  })
})

describe("createPlanRepository", () => {
  test("reads a plan without mutating it", async () => {
    const fixture = storeFixture()
    const repository = createPlanRepository({
      store: fixture.store,
      authorization: { authorize: async () => true },
    })
    expect(await repository.read("docs/plans/ROCKSOUL-FLOW.plan.md")).toMatchObject({ status: "updated" })
    expect(fixture.writes()).toBe(0)
  })

  test("requires explicit authorization and compare-and-swap", async () => {
    const fixture = storeFixture()
    const denied = createPlanRepository({
      store: fixture.store,
      authorization: { authorize: async () => false },
    })
    const deniedResult = await denied.updateStatus({
      path: fixture.snapshot().path,
      taskID: "RSF-101",
      status: "ready",
      expectedRevision: "revision-a",
      expectedContentHash: planContentHash(markdown),
    })
    expect(deniedResult.status).toBe("not-authorized")
    expect(fixture.writes()).toBe(0)

    const allowed = createPlanRepository({
      store: fixture.store,
      authorization: { authorize: async () => true },
    })
    const result = await allowed.updateStatus({
      path: fixture.snapshot().path,
      taskID: "RSF-101",
      status: "ready",
      expectedRevision: "revision-a",
      expectedContentHash: planContentHash(markdown),
    })
    expect(result.status).toBe("updated")
    expect(fixture.writes()).toBe(1)
  })

  test("refuses stale content and stale revisions without overwriting", async () => {
    const fixture = storeFixture()
    const repository = createPlanRepository({
      store: fixture.store,
      authorization: { authorize: async () => true },
    })
    const result = await repository.updateStatus({
      path: fixture.snapshot().path,
      taskID: "RSF-101",
      status: "ready",
      expectedRevision: "revision-old",
      expectedContentHash: planContentHash(markdown),
    })
    expect(result.status).toBe("conflict")
    expect(fixture.writes()).toBe(0)
  })

  test("requires every dependency to be verified before a task becomes ready", async () => {
    const fixture = storeFixture()
    const repository = createPlanRepository({
      store: fixture.store,
      authorization: { authorize: async () => true },
    })
    const result = await repository.updateStatus({
      path: fixture.snapshot().path,
      taskID: "RSF-102",
      status: "ready",
      expectedRevision: "revision-a",
      expectedContentHash: planContentHash(markdown),
    })
    expect(result.status).toBe("dependency-blocked")
    expect(fixture.writes()).toBe(0)
  })

  test("requires exact Proof Gate evidence before verified status", async () => {
    const implemented = markdown.replace("- Status: planned", "- Status: implemented")
    const fixture = storeFixture(implemented)
    const repository = createPlanRepository({
      store: fixture.store,
      authorization: { authorize: async () => true },
    })
    const request = {
      path: fixture.snapshot().path,
      taskID: "RSF-101",
      status: "verified" as const,
      expectedRevision: "revision-a",
      expectedContentHash: planContentHash(implemented),
    }
    expect((await repository.updateStatus(request)).status).toBe("proof-required")
    expect((await repository.updateStatus({
      ...request,
      proof: {
        taskID: "RSF-101",
        repositoryRevision: "revision-a",
        ready: true,
        evidenceIDs: ["proof-1"],
        reviewerState: "accepted",
      },
    })).status).toBe("updated")
  })
})
