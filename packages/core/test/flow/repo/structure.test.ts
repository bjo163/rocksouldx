import { describe, expect, test } from "bun:test"
import { analyzeRepositoryStructure } from "../../../src/flow/repo/structure.js"

describe("analyzeRepositoryStructure", () => {
  test("maps package entry points, tests, relative imports, and workspace dependencies", () => {
    const result = analyzeRepositoryStructure({
      revision: "revision-a",
      files: [
        {
          path: "packages/core/package.json",
          content: JSON.stringify({
            name: "@example/core",
            main: "./src/index.ts",
            dependencies: { "@example/util": "workspace:*" },
          }),
        },
        {
          path: "packages/core/src/index.ts",
          content: 'export * from "./service.js"\nimport { value } from "@example/util"',
        },
        { path: "packages/core/src/service.ts", content: "export const service = true" },
        { path: "packages/core/test/service.test.ts", content: "test('service', () => {})" },
        {
          path: "packages/util/package.json",
          content: JSON.stringify({ name: "@example/util" }),
        },
        { path: "packages/util/src/index.ts", content: "export const value = 1" },
        { path: "README.md", content: "# Project" },
      ],
    })

    expect(result.packages).toHaveLength(2)
    expect(result.packages[0]).toMatchObject({
      path: "packages/core",
      name: "@example/core",
      entryPoints: ["packages/core/src/index.ts"],
      sourceFileCount: 3,
      testFileCount: 1,
      declaredWorkspaceDependencies: ["packages/util"],
    })
    expect(result.imports).toContainEqual({
      from: "packages/core/src/index.ts",
      specifier: "./service.js",
      kind: "relative",
      to: "packages/core/src/service.ts",
    })
    expect(result.imports).toContainEqual({
      from: "packages/core/src/index.ts",
      specifier: "@example/util",
      kind: "workspace-package",
      targetPackage: "packages/util",
    })
    expect(result.unresolvedRelativeImports).toEqual([])
  })

  test("rejects unsafe paths and reports unresolved relative imports", () => {
    const result = analyzeRepositoryStructure({
      revision: "revision-b",
      files: [
        { path: "../outside.ts", content: "export {}" },
        { path: "packages/core/src/index.ts", content: 'import "./missing.js"' },
        { path: "packages/core/node_modules/pkg/index.ts", content: "export {}" },
      ],
    })

    expect(result.unresolvedRelativeImports).toEqual([
      { from: "packages/core/src/index.ts", specifier: "./missing.js" },
    ])
    expect(result.warnings.some((item) => item.includes("Rejected non-relative path"))).toBe(true)
    expect(result.packages).toHaveLength(1)
  })

  test("does not treat a matching path as an entry point when the file is absent", () => {
    const result = analyzeRepositoryStructure({
      revision: "revision-c",
      files: [
        {
          path: "packages/core/package.json",
          content: JSON.stringify({ name: "@example/core", main: "./dist/index.js" }),
        },
        { path: "packages/core/src/runtime.ts", content: "export {}" },
      ],
    })

    expect(result.packages[0]?.entryPoints).toEqual([])
  })
})
