import path from "path"
import { classifyScanPath, normalizeScanPath } from "./scan-policy.js"

export interface RepositoryStructureFile {
  readonly path: string
  readonly content?: string
}

export interface RepositoryPackageStructure {
  readonly path: string
  readonly name?: string
  readonly manifestPath?: string
  readonly entryPoints: readonly string[]
  readonly sourceFileCount: number
  readonly testFileCount: number
  readonly declaredWorkspaceDependencies: readonly string[]
}

export interface RepositoryImportEdge {
  readonly from: string
  readonly specifier: string
  readonly kind: "relative" | "workspace-package"
  readonly to?: string
  readonly targetPackage?: string
}

export interface RepositoryStructureResult {
  readonly revision: string
  readonly rootDirectories: readonly string[]
  readonly packages: readonly RepositoryPackageStructure[]
  readonly imports: readonly RepositoryImportEdge[]
  readonly unresolvedRelativeImports: readonly { from: string; specifier: string }[]
  readonly unassignedSourceFiles: readonly string[]
  readonly warnings: readonly string[]
}

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/i
const TEST_FILE = /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function packageRoot(relative: string): string | undefined {
  const parts = relative.split("/")
  if (parts[0] === "packages") {
    if (["plugins", "console", "stats"].includes(parts[1] ?? "")) {
      if (parts.length >= 4) return parts.slice(0, 3).join("/")
      return undefined
    }
    if (parts.length >= 3) return parts.slice(0, 2).join("/")
  }
  if (["services", "apps"].includes(parts[0] ?? "") && parts.length >= 3) return parts.slice(0, 2).join("/")
  return undefined
}

function parseManifest(content: string | undefined): Record<string, unknown> | undefined {
  if (!content) return undefined
  try {
    const value: unknown = JSON.parse(content)
    return isRecord(value) ? value : undefined
  } catch {
    return undefined
  }
}

function entryStrings(value: unknown): string[] {
  if (typeof value === "string") return value.startsWith(".") && !value.includes("*") ? [value] : []
  if (Array.isArray(value)) return value.flatMap(entryStrings)
  if (!isRecord(value)) return []
  return Object.values(value).flatMap(entryStrings)
}

function resolveFile(base: string, known: ReadonlySet<string>): string | undefined {
  const normalized = path.posix.normalize(base).replace(/^\.\//, "")
  const candidates = [
    normalized,
    ...RESOLVE_EXTENSIONS.map((extension) => normalized + extension),
    ...RESOLVE_EXTENSIONS.map((extension) => path.posix.join(normalized, "index" + extension)),
  ]
  return candidates.find((candidate) => known.has(candidate))
}

function resolveRelativeImport(from: string, specifier: string, known: ReadonlySet<string>): string | undefined {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
  if (base === ".." || base.startsWith("../") || path.posix.isAbsolute(base)) return undefined
  return resolveFile(base, known)
}

function findPackageManifest(
  files: ReadonlyMap<string, RepositoryStructureFile>,
  root: string,
): { manifestPath?: string; manifest?: Record<string, unknown> } {
  const manifestPath = root + "/package.json"
  const file = files.get(manifestPath)
  return file ? { manifestPath, manifest: parseManifest(file.content) } : {}
}

function isInside(root: string, relative: string): boolean {
  return relative === root || relative.startsWith(root + "/")
}

/**
 * Build a deterministic, read-only module map from paths and optional source contents.
 * The caller owns repository traversal, Git revision capture, permissions, and ignore-aware discovery.
 */
export function analyzeRepositoryStructure(input: {
  files: readonly RepositoryStructureFile[]
  revision: string
}): RepositoryStructureResult {
  const warnings: string[] = []
  const fileMap = new Map<string, RepositoryStructureFile>()

  for (const file of input.files) {
    const relative = normalizeScanPath(file.path)
    if (!relative) {
      warnings.push("Rejected non-relative path: " + file.path)
      continue
    }
    const decision = classifyScanPath({ path: relative })
    if (!decision.included) continue
    if (fileMap.has(relative)) {
      warnings.push("Duplicate file path ignored: " + relative)
      continue
    }
    fileMap.set(relative, { ...file, path: relative })
  }

  if (!input.revision.trim()) warnings.push("Repository revision is missing")
  const knownPaths = new Set(fileMap.keys())
  const roots = [...new Set([...fileMap.keys()].flatMap((relative) => {
    const root = packageRoot(relative)
    return root ? [root] : []
  }))].toSorted()
  const packageNames = new Map<string, string>()
  const packages = roots.map((root): RepositoryPackageStructure => {
    const found = findPackageManifest(fileMap, root)
    const manifest = found.manifest
    const name = typeof manifest?.name === "string" ? manifest.name : undefined
    if (name) packageNames.set(name, root)

    const rawEntryPoints = [
      ...entryStrings(manifest?.main),
      ...entryStrings(manifest?.module),
      ...entryStrings(manifest?.browser),
      ...entryStrings(manifest?.types),
      ...entryStrings(manifest?.typings),
      ...entryStrings(manifest?.exports),
    ]
    const entryPoints = new Set<string>()
    for (const entry of rawEntryPoints) {
      const resolved = resolveFile(path.posix.join(root, entry), knownPaths)
      if (resolved) entryPoints.add(resolved)
    }
    for (const conventional of ["src/index", "src/main", "index", "main"]) {
      const resolved = resolveFile(path.posix.join(root, conventional), knownPaths)
      if (resolved) entryPoints.add(resolved)
    }

    const packageFiles = [...fileMap.keys()].filter((relative) => isInside(root, relative))
    const sourceFiles = packageFiles.filter((relative) => SOURCE_FILE.test(relative))

    if (found.manifestPath && !manifest) warnings.push("Invalid or unreadable package manifest: " + found.manifestPath)
    return {
      path: root,
      ...(name ? { name } : {}),
      ...(found.manifestPath ? { manifestPath: found.manifestPath } : {}),
      entryPoints: [...entryPoints].toSorted(),
      sourceFileCount: sourceFiles.length,
      testFileCount: sourceFiles.filter((relative) => TEST_FILE.test(relative)).length,
      declaredWorkspaceDependencies: [],
    }
  })

  // Resolve declared workspace edges after all package names are known.
  const packagesWithDependencies = packages.map((item) => {
    const manifest = parseManifest(fileMap.get(item.manifestPath ?? "")?.content)
    const dependencies = [
      manifest?.dependencies,
      manifest?.devDependencies,
      manifest?.peerDependencies,
      manifest?.optionalDependencies,
    ].filter(isRecord).flatMap((group) => Object.keys(group))
    return {
      ...item,
      declaredWorkspaceDependencies: [...new Set(dependencies.flatMap((dependency) => {
        const target = packageNames.get(dependency)
        return target && target !== item.path ? [target] : []
      }))].toSorted(),
    }
  })

  const imports: RepositoryImportEdge[] = []
  const unresolvedRelativeImports: { from: string; specifier: string }[] = []
  const importPattern = /\b(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s*)["']([^"']+)["']/g
  for (const file of fileMap.values()) {
    if (!SOURCE_FILE.test(file.path) || !file.content) continue
    importPattern.lastIndex = 0
    for (const match of file.content.matchAll(importPattern)) {
      const specifier = match[1]
      if (!specifier) continue
      if (specifier.startsWith(".")) {
        const target = resolveRelativeImport(file.path, specifier, knownPaths)
        if (target) imports.push({ from: file.path, specifier, kind: "relative", to: target })
        else unresolvedRelativeImports.push({ from: file.path, specifier })
        continue
      }
      const targetPackage = packageNames.get(specifier)
      if (targetPackage) imports.push({ from: file.path, specifier, kind: "workspace-package", targetPackage })
    }
  }

  const unassignedSourceFiles = [...fileMap.keys()]
    .filter((relative) => SOURCE_FILE.test(relative) && !roots.some((root) => isInside(root, relative)))
    .toSorted()
  const rootDirectories = [...new Set([...fileMap.keys()]
    .flatMap((relative) => relative.includes("/") ? [relative.split("/")[0] ?? ""] : []))]
    .filter(Boolean)
    .toSorted()

  imports.sort((a, b) => a.from.localeCompare(b.from) || a.specifier.localeCompare(b.specifier))
  unresolvedRelativeImports.sort((a, b) => a.from.localeCompare(b.from) || a.specifier.localeCompare(b.specifier))

  return {
    revision: input.revision,
    rootDirectories,
    packages: packagesWithDependencies,
    imports,
    unresolvedRelativeImports,
    unassignedSourceFiles,
    warnings: warnings.toSorted(),
  }
}
