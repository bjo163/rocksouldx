import { describe, expect, test } from "bun:test"
import {
  assessWorktreeCleanup,
  branchForFlowTask,
  planTaskWorktree,
} from "../../../src/flow/run/worktree-policy.js"
import type { WorktreeObservation } from "../../../src/flow/run/worktree-policy.js"

const existing: WorktreeObservation[] = [
  {
    id:"worktree-other",
    path:"/tmp/rocksoul/other",
    branch:"feature/other",
    baseRevision:"base-a",
    dirtyState:"clean",
    dirtyPaths:[],
    ownerTaskID:"RSF-999",
    ownerRunID:"run-other",
    active:false,
  },
]

describe("branchForFlowTask",()=>{
  test("uses stable task-scoped branch names",()=>{
    expect(branchForFlowTask("RSF-503")).toBe("rocksoul/rsf-503")
    expect(branchForFlowTask("../main")).toBeUndefined()
  })
})

describe("planTaskWorktree",()=>{
  test("plans a separate deterministic worktree for a task",()=>{
    expect(planTaskWorktree({
      taskID:"RSF-503",
      checkoutPath:"/tmp/rocksoul",
      worktreeRoot:"/tmp/rocksoul-worktrees",
      baseRevision:"base-a",
      existing,
    })).toMatchObject({
      action:"create",
      branch:"rocksoul/rsf-503",
      path:"/tmp/rocksoul-worktrees/rocksoul/rsf-503",
    })
  })

  test("reuses only an inactive clean worktree owned by the same task at the same base",()=>{
    const worktree:WorktreeObservation={
      id:"worktree-task",
      path:"/tmp/rocksoul-worktrees/rocksoul/rsf-503",
      branch:"rocksoul/rsf-503",
      baseRevision:"base-a",
      dirtyState:"clean",
      dirtyPaths:[],
      ownerTaskID:"RSF-503",
      ownerRunID:"run-old",
      active:false,
    }
    expect(planTaskWorktree({
      taskID:"RSF-503",
      checkoutPath:"/tmp/rocksoul",
      worktreeRoot:"/tmp/rocksoul-worktrees",
      baseRevision:"base-a",
      existing:[...existing,worktree],
    }).action).toBe("reuse")
  })

  test("blocks dirty worktrees and branch collisions without deleting or overwriting",()=>{
    const worktree:WorktreeObservation={
      id:"worktree-task",
      path:"/tmp/rocksoul-worktrees/rocksoul/rsf-503",
      branch:"rocksoul/rsf-503",
      baseRevision:"base-a",
      dirtyState:"dirty",
      dirtyPaths:["src/user-change.ts"],
      ownerTaskID:"RSF-503",
      ownerRunID:"run-old",
      active:false,
    }
    const result=planTaskWorktree({
      taskID:"RSF-503",
      checkoutPath:"/tmp/rocksoul",
      worktreeRoot:"/tmp/rocksoul-worktrees",
      baseRevision:"base-a",
      existing:[worktree],
    })
    expect(result.action).toBe("blocked")
    expect(result.reason).toContain("user changes")
  })

  test("rejects roots inside the primary checkout and invalid absolute paths",()=>{
    expect(planTaskWorktree({
      taskID:"RSF-503",
      checkoutPath:"/tmp/rocksoul",
      worktreeRoot:"/tmp/rocksoul/.worktrees",
      baseRevision:"base-a",
      existing:[],
    }).action).toBe("blocked")
    expect(planTaskWorktree({
      taskID:"RSF-503",
      checkoutPath:"rocksoul",
      worktreeRoot:"/tmp/rocksoul-worktrees",
      baseRevision:"base-a",
      existing:[],
    }).action).toBe("blocked")
  })

  test("requires a pinned base revision",()=>{
    expect(planTaskWorktree({
      taskID:"RSF-503",
      checkoutPath:"/tmp/rocksoul",
      worktreeRoot:"/tmp/rocksoul-worktrees",
      baseRevision:"",
      existing:[],
    }).action).toBe("blocked")
  })
})

describe("assessWorktreeCleanup",()=>{
  const worktree:WorktreeObservation={
    id:"worktree-task",
    path:"/tmp/rocksoul-worktrees/rocksoul/rsf-503",
    branch:"rocksoul/rsf-503",
    baseRevision:"base-a",
    dirtyState:"clean",
    dirtyPaths:[],
    ownerTaskID:"RSF-503",
    ownerRunID:"run-a",
    active:false,
  }

  test("permits cleanup only after approval of an inactive clean owned worktree",()=>{
    expect(assessWorktreeCleanup({
      worktree,
      taskID:"RSF-503",
      runID:"run-a",
      activeRunIDs:[],
      userApproved:true,
    }).allowed).toBe(true)
  })

  test("blocks cleanup when approval, ownership, activity, or clean state is missing",()=>{
    expect(assessWorktreeCleanup({
      worktree,
      taskID:"RSF-503",
      runID:"run-a",
      activeRunIDs:[],
      userApproved:false,
    }).allowed).toBe(false)
    expect(assessWorktreeCleanup({
      worktree:{...worktree,dirtyState:"unknown"},
      taskID:"RSF-503",
      runID:"run-a",
      activeRunIDs:[],
      userApproved:true,
    }).allowed).toBe(false)
    expect(assessWorktreeCleanup({
      worktree,
      taskID:"RSF-999",
      runID:"run-a",
      activeRunIDs:[],
      userApproved:true,
    }).allowed).toBe(false)
    expect(assessWorktreeCleanup({
      worktree,
      taskID:"RSF-503",
      runID:"run-a",
      activeRunIDs:["run-a"],
      userApproved:true,
    }).allowed).toBe(false)
  })
})
