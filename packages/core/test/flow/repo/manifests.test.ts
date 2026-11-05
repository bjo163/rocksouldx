import { describe, expect, test } from "bun:test"
import { analyzeManifestInventory } from "../../../src/flow/repo/manifests.js"

describe("analyzeManifestInventory", () => {
  test("discovers the package manager, workspaces, scripts, languages, and frameworks", () => {
    const result = analyzeManifestInventory([
      {
        path: "package.json",
        content: JSON.stringify({
          name: "workspace-root",
          private: true,
          packageManager: "bun@1.4.4",
          workspaces: ["packages/*"],
          engines: { node: ">=20" },
          dependencies: { react: "^19.0.0" },
          devDependencies: { vite: "^7.0.0" },
          scripts: {
            lint: "biome check .",
            test: "bun test",
            typecheck: "tsc --noEmit",
            build: "bun run build",
          },
        }),
      },
      { path: "bun.lock", content: "" },
      { path: "tsconfig.json", content: "{}" },
      {
        path: "packages/app/package.json",
        content: JSON.stringify({
          name: "@rocksoul/app",
          dependencies: { next: "^15.0.0", react: "^19.0.0" },
          scripts: { build: "next build" },
        }),
      },
      { path: "README.md", content: "not a manifest" },
    ])

    expect(result.primaryPackageManager).toBe("bun")
    expect(result.packageManagers).toEqual(["bun"])
    expect(result.workspacePatterns).toEqual(["packages/*"])
    expect(result.languages).toEqual(["JavaScript", "TypeScript"])
    expect(result.frameworks).toEqual(["Next.js", "React", "Vite"])
    expect(result.packages).toHaveLength(2)
    expect(result.packages[1]).toMatchObject({
      path: "packages/app/package.json",
      directory: "packages/app",
      name: "@rocksoul/app",
    })
    expect(result.scripts.map((script) => script.intent)).toEqual(["build", "lint", "test", "typecheck", "build"])
    expect(result.scripts.map((script) => script.packagePath)).toEqual(["packages/app", "", "", "", ""])
    expect(result.manifestPaths).not.toContain("README.md")
    expect(result.warnings).toEqual([])
  })

  test("does not guess a primary package manager when root lockfiles conflict", () => {
    const result = analyzeManifestInventory([
      { path: "package.json", content: JSON.stringify({ name: "app" }) },
      { path: "bun.lock", content: "" },
      { path: "package-lock.json", content: "{}" },
    ])

    expect(result.primaryPackageManager).toBeUndefined()
    expect(result.packageManagers).toEqual(["bun", "npm"])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "package-manager-conflict",
      }),
    )
  })

  test("reports malformed and unreadable package manifests", () => {
    const result = analyzeManifestInventory([
      { path: "package.json", content: "{" },
      { path: "packages/missing/package.json" },
    ])

    expect(result.packages).toEqual([])
    expect(result.warnings.map((warning) => warning.code)).toEqual(["invalid-json", "missing-content"])
  })

  test("detects an npm-managed Node package without inventing commands", () => {
    const result = analyzeManifestInventory([
      {
        path: "package.json",
        content: JSON.stringify({
          name: "node-app",
          engines: { node: ">=22" },
          scripts: { test: "node --test" },
        }),
      },
      { path: "package-lock.json", content: "{}" },
    ])

    expect(result.primaryPackageManager).toBe("npm")
    expect(result.languages).toEqual(["JavaScript"])
    expect(result.scripts).toEqual([
      expect.objectContaining({
        name: "test",
        command: "node --test",
        intent: "test",
      }),
    ])
    expect(result.packages[0]?.engines).toEqual({ node: ">=22" })
  })

  test("detects non-JavaScript language manifests", () => {
    const result = analyzeManifestInventory([
      { path: "Cargo.toml", content: "[package]" },
      { path: "go.mod", content: "module example.com/app" },
      { path: "pyproject.toml", content: "[project]" },
      { path: "build.gradle.kts", content: "plugins {}" },
      { path: "src/main.csproj", content: "<Project />" },
    ])

    expect(result.languages).toEqual(["C#", "Go", "Kotlin", "Python", "Rust"])
  })

  test("redacts secret-like values from package scripts without executing them", () => {
    const result = analyzeManifestInventory([
      {
        path: "package.json",
        content: JSON.stringify({
          scripts: {
            release: "deploy API_TOKEN=abc --token=xyz https://user:pass@example.com",
          },
        }),
      },
    ])

    expect(result.scripts[0]).toMatchObject({
      name: "release",
      intent: "other",
      command: "deploy API_TOKEN=[REDACTED] --token=[REDACTED] https://[REDACTED]@example.com",
      redacted: true,
    })
  })

  test("rejects absolute and traversal paths before manifest parsing", () => {
    const result = analyzeManifestInventory([
      { path: "../outside/package.json", content: JSON.stringify({ name: "outside" }) },
      { path: "C:\\repo\\package.json", content: JSON.stringify({ name: "absolute" }) },
      { path: "packages/app/package.json", content: JSON.stringify({ name: "app" }) },
    ])

    expect(result.packages.map((item) => item.name)).toEqual(["app"])
  })
})
