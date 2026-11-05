import path from "node:path"

export type WorktreeDirtyState = "clean" | "dirty" | "unknown"

export interface WorktreeObservation {
  readonly id: string
  readonly path: string
  readonly branch: string
  readonly baseRevision: string
  readonly dirtyState: WorktreeDirtyState
  readonly dirtyPaths: readonly string[]
  readonly ownerTaskID?: string
  readonly ownerRunID?: string
  readonly active: boolean
}

export interface WorktreeAssignmentDecision {
  readonly action: "create" | "reuse" | "blocked"
  readonly taskID: string
  readonly branch: string
  readonly path?: string
  readonly existingWorktreeID?: string
  readonly reason: string
}

export interface WorktreeCleanupDecision {
  readonly allowed: boolean
  readonly worktreeID: string
  readonly reason: string
}

function canonicalPath(input: string): string | undefined {
  const value=input.trim()
  if(path.win32.isAbsolute(value)) return path.win32.normalize(value).replaceAll("\\","/").toLowerCase()
  if(path.posix.isAbsolute(value)) return path.posix.normalize(value)
  return undefined
}

function contains(parent: string, child: string): boolean {
  if(parent===child) return true
  const prefix=parent.endsWith("/")?parent:parent+"/"
  return child.startsWith(prefix)
}

function slugTaskID(taskID: string): string | undefined {
  return /^[A-Z][A-Z0-9]*-\d{3,}$/.test(taskID) ? taskID.toLowerCase() : undefined
}

/** Return a deterministic namespaced branch for one FLOW task. */
export function branchForFlowTask(taskID: string): string | undefined {
  const slug=slugTaskID(taskID)
  return slug ? "rocksoul/"+slug : undefined
}

/**
 * Assess whether one task can obtain a dedicated worktree without touching user changes.
 * This function plans only; creation and Git worktree commands remain with the existing Worktree service.
 */
export function planTaskWorktree(input: {
  taskID: string
  checkoutPath: string
  worktreeRoot: string
  baseRevision: string
  existing: readonly WorktreeObservation[]
}): WorktreeAssignmentDecision {
  const branch=branchForFlowTask(input.taskID)
  if(!branch) return {action:"blocked",taskID:input.taskID,branch:"",reason:"Task ID does not use the documented stable task-ID format"}

  const checkout=canonicalPath(input.checkoutPath)
  const root=canonicalPath(input.worktreeRoot)
  if(!checkout||!root) return {action:"blocked",taskID:input.taskID,branch,reason:"Checkout and worktree root must be absolute paths"}
  if(!input.baseRevision.trim()) return {action:"blocked",taskID:input.taskID,branch,reason:"A pinned base revision is required"}
  if(contains(checkout,root)) return {action:"blocked",taskID:input.taskID,branch,reason:"Worktree root must be outside the primary checkout"}

  const candidate=canonicalPath(path.join(input.worktreeRoot,"rocksoul",slugTaskID(input.taskID)!))
  if(!candidate||contains(checkout,candidate)) return {action:"blocked",taskID:input.taskID,branch,reason:"Derived worktree path is not a safe separate checkout"}

  const pathOwner=input.existing.find((item)=>canonicalPath(item.path)===candidate)
  const branchOwner=input.existing.find((item)=>item.branch===branch)
  if(pathOwner) {
    const reusable=
      pathOwner.ownerTaskID===input.taskID &&
      pathOwner.branch===branch &&
      pathOwner.baseRevision===input.baseRevision &&
      pathOwner.dirtyState==="clean" &&
      pathOwner.dirtyPaths.length===0 &&
      !pathOwner.active
    if(reusable) {
      return {
        action:"reuse",
        taskID:input.taskID,
        branch,
        path:candidate,
        existingWorktreeID:pathOwner.id,
        reason:"An inactive, clean worktree owned by this task matches the requested branch and base revision",
      }
    }
    return {
      action:"blocked",
      taskID:input.taskID,
      branch,
      path:candidate,
      ...(pathOwner.id?{existingWorktreeID:pathOwner.id}:{}),
      reason:pathOwner.dirtyState!=="clean"||pathOwner.dirtyPaths.length
        ?"Existing worktree contains user changes or has unknown dirty state; preserve it and choose another path"
        :"Existing worktree path is owned by another task/run or has a mismatched revision",
    }
  }

  if(branchOwner) {
    return {
      action:"blocked",
      taskID:input.taskID,
      branch,
      path:candidate,
      existingWorktreeID:branchOwner.id,
      reason:"The task branch is already checked out by another worktree",
    }
  }

  if(input.existing.some((item)=>canonicalPath(item.path)===undefined))
    return {action:"blocked",taskID:input.taskID,branch,path:candidate,reason:"An existing worktree has an invalid path observation"}

  return {
    action:"create",
    taskID:input.taskID,
    branch,
    path:candidate,
    reason:"No path or branch collision was found; creation must still use the existing Worktree API and permission boundary",
  }
}

/** Require explicit approval and a known clean, inactive, task-owned worktree before cleanup. */
export function assessWorktreeCleanup(input: {
  worktree: WorktreeObservation
  taskID: string
  runID: string
  activeRunIDs: readonly string[]
  userApproved: boolean
}): WorktreeCleanupDecision {
  const {worktree}=input
  const deny=(reason:string):WorktreeCleanupDecision=>({allowed:false,worktreeID:worktree.id,reason})
  if(!input.userApproved) return deny("Cleanup requires explicit user approval")
  if(worktree.ownerTaskID!==input.taskID||worktree.ownerRunID!==input.runID)
    return deny("Worktree ownership does not match the task and run")
  if(worktree.active||input.activeRunIDs.includes(input.runID))
    return deny("An active run still owns this worktree")
  if(worktree.dirtyState!=="clean"||worktree.dirtyPaths.length>0)
    return deny("Worktree contains user changes or its dirty state is unknown; cleanup is blocked")
  if(!canonicalPath(worktree.path)) return deny("Worktree path is not absolute")
  return {allowed:true,worktreeID:worktree.id,reason:"Approved task-owned worktree is inactive and clean"}
}
