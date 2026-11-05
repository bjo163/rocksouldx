import path from "path"
import { describe, expect, test } from "bun:test"
import {
  classifyScanPath,
  isWithinScanRoot,
  normalizeScanPath,
} from "../../../src/flow/repo/scan-policy.js"

describe("RepoScanPolicy", () => {
  test("normalizes root-relative paths without escaping the selected root", () => {
    expect(normalizeScanPath("packages\\core\\src")).toBe("packages/core/src")
    expect(normalizeScanPath("./packages/core/src")).toBe("packages/core/src")
    expect(normalizeScanPath("../outside.txt")).toBeUndefined()
    expect(normalizeScanPath("packages/../../outside.txt")).toBeUndefined()
    expect(normalizeScanPath("/etc/passwd")).toBeUndefined()
    expect(normalizeScanPath("C:\\Users\\me\\repo\\file.txt")).toBeUndefined()
    expect(normalizeScanPath("C:relative\\file.txt")).toBeUndefined()
    expect(normalizeScanPath("\\\\server\\share\\file.txt")).toBeUndefined()
  })

  test("excludes generated and vendor directories at every depth", () => {
    expect(classifyScanPath({ path: "node_modules/pkg/index.js" })).toMatchObject({
      included: false,
      reason: "generated-or-vendor",
    })
    expect(classifyScanPath({ path: "packages/app/.next/cache/build.json" })).toMatchObject({
      included: false,
      reason: "generated-or-vendor",
    })
    expect(classifyScanPath({ path: "src/core.ts" })).toEqual({
      included: true,
      path: "src/core.ts",
    })
  })

  test("excludes secrets while allowing safe environment templates", () => {
    expect(classifyScanPath({ path: ".env" })).toMatchObject({ included: false, reason: "sensitive-path" })
    expect(classifyScanPath({ path: ".env.production.local" })).toMatchObject({
      included: false,
      reason: "sensitive-path",
    })
    expect(classifyScanPath({ path: ".env.example" })).toEqual({ included: true, path: ".env.example" })
    expect(classifyScanPath({ path: "config/.aws/credentials" })).toMatchObject({
      included: false,
      reason: "sensitive-path",
    })
    expect(classifyScanPath({ path: "certs/signing.pem" })).toMatchObject({
      included: false,
      reason: "sensitive-path",
    })
    expect(classifyScanPath({ path: "keys/id_ed25519.pub" })).toEqual({
      included: true,
      path: "keys/id_ed25519.pub",
    })
  })

  test("does not follow symlinks and rejects invalid discovered paths", () => {
    expect(classifyScanPath({ path: "linked/source.ts", symlink: true })).toEqual({
      included: false,
      reason: "symlink-not-followed",
    })
    expect(classifyScanPath({ path: "../outside.ts" })).toEqual({
      included: false,
      reason: "invalid-relative-path",
    })
  })

  test("keeps ignored and inaccessible paths distinct from missing files", () => {
    expect(classifyScanPath({ path: "src/ignored.ts", ignored: true })).toMatchObject({
      included: false,
      reason: "vcs-ignored",
    })
    expect(classifyScanPath({ path: "docs/private.md", accessible: false })).toMatchObject({
      included: false,
      reason: "inaccessible",
    })
  })

  test("checks canonical absolute path containment without prefix confusion", () => {
    const root = path.resolve("fixture", "repo")
    const inside = path.join(root, "packages", "core")
    const outside = path.join(path.dirname(root), "repo-sibling", "file.ts")

    expect(isWithinScanRoot(root, inside)).toBe(true)
    expect(isWithinScanRoot(root, root)).toBe(true)
    expect(isWithinScanRoot(root, outside)).toBe(false)
    expect(isWithinScanRoot("relative/repo", "relative/repo/file.ts")).toBe(false)
  })
})
