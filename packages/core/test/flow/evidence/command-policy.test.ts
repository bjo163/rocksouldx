import { describe, expect, test } from "bun:test"
import { assessValidationCommand } from "../../../src/flow/evidence/command-policy.js"
import type { PackageScript } from "../../../src/flow/repo/manifests.js"

const scripts: PackageScript[] = [
  { packagePath: "packages/core", name: "test", command: "bun test test/flow", intent: "test" },
  { packagePath: "packages/core", name: "typecheck", command: "bun run typecheck", intent: "typecheck" },
  { packagePath: "packages/core", name: "publish", command: "npm publish", intent: "other" },
  { packagePath: "packages/core", name: "docs", command: "bun run docs:sync", intent: "other" },
  { packagePath: "", name: "lint", command: "bun run lint", intent: "lint" },
]

describe("assessValidationCommand", () => {
  test("allows an exact discovered validation script in its declaring package", () => {
    expect(assessValidationCommand({
      command: "bun test test/flow",
      workingDirectory: "packages/core",
      scripts,
    })).toMatchObject({ status: "allowed", scriptName: "test" })
  })

  test("supports scripts declared at the repository root", () => {
    expect(assessValidationCommand({
      command: "bun run lint",
      workingDirectory: ".",
      scripts,
    })).toMatchObject({ status: "allowed", scriptName: "lint", workingDirectory: "" })
  })

  test("does not authorize an arbitrary command that resembles a test", () => {
    expect(assessValidationCommand({
      command: "bun test test/everything",
      workingDirectory: "packages/core",
      scripts,
    }).status).toBe("not-found")
  })

  test("blocks destructive and release commands even when declared", () => {
    expect(assessValidationCommand({
      command: "npm publish",
      workingDirectory: "packages/core",
      scripts,
    }).status).toBe("blocked")
  })

  test("requires review for non-validation scripts", () => {
    expect(assessValidationCommand({
      command: "bun run docs:sync",
      workingDirectory: "packages/core",
      scripts,
    }).status).toBe("review-required")
  })

  test("rejects absolute, traversal, and mismatched package directories", () => {
    expect(assessValidationCommand({
      command: "bun run typecheck",
      workingDirectory: "/tmp/project",
      scripts,
    }).status).toBe("invalid-working-directory")
    expect(assessValidationCommand({
      command: "bun run typecheck",
      workingDirectory: "../outside",
      scripts,
    }).status).toBe("invalid-working-directory")
    expect(assessValidationCommand({
      command: "bun run typecheck",
      workingDirectory: "packages/app",
      scripts,
    }).status).toBe("invalid-working-directory")
  })
})
