export type PackageManager =
  | "bun"
  | "npm"
  | "pnpm"
  | "yarn"
  | "cargo"
  | "poetry"
  | "uv"
  | "pipenv"
  | "go"
  | "bundler"
  | "composer"
  | "mix"
  | "swiftpm"
  | "cocoapods"
  | "gradle"
  | "maven"

export type ScriptIntent = "lint" | "test" | "typecheck" | "build" | "other"

export interface ManifestFile {
  readonly path: string
  readonly content?: string
}

export interface PackageScript {
  readonly packagePath: string
  readonly name: string
  readonly command: string
  readonly intent: ScriptIntent
  readonly redacted?: boolean
}

export interface PackageManifestInfo {
  readonly path: string
  readonly directory: string
  readonly name?: string
  readonly isPrivate?: boolean
  readonly packageManager?: string
  readonly engines: Readonly<Record<string, string>>
  readonly dependencies: readonly string[]
  readonly workspacePatterns: readonly string[]
  readonly scripts: readonly PackageScript[]
}

export interface ManifestWarning {
  readonly code: "missing-content" | "invalid-json" | "unsupported-package-manager" | "package-manager-conflict"
  readonly message: string
  readonly path: string
}

export interface ManifestInventory {
  readonly manifestPaths: readonly string[]
  readonly packages: readonly PackageManifestInfo[]
  readonly scripts: readonly PackageScript[]
  readonly workspacePatterns: readonly string[]
  readonly packageManagers: readonly PackageManager[]
  readonly primaryPackageManager?: PackageManager
  readonly languages: readonly string[]
  readonly frameworks: readonly string[]
  readonly warnings: readonly ManifestWarning[]
}

const MANIFEST_NAMES = new Set([
  "package.json",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "jsconfig.json",
  "bunfig.toml",
  "Cargo.toml",
  "Cargo.lock",
  "go.mod",
  "go.sum",
  "pyproject.toml",
  "requirements.txt",
  "Pipfile",
  "Pipfile.lock",
  "poetry.lock",
  "uv.lock",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "Gemfile",
  "Gemfile.lock",
  "composer.json",
  "composer.lock",
  "mix.exs",
  "mix.lock",
  "Package.swift",
  "Podfile",
  "Podfile.lock",
  "global.json",
])

const LOCKFILE_MANAGERS = new Map<string, PackageManager>([
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["Cargo.lock", "cargo"],
  ["poetry.lock", "poetry"],
  ["uv.lock", "uv"],
  ["Pipfile.lock", "pipenv"],
  ["go.sum", "go"],
  ["Gemfile.lock", "bundler"],
  ["composer.lock", "composer"],
  ["mix.lock", "mix"],
  ["Podfile.lock", "cocoapods"],
])

const FRAMEWORKS = new Map<string, string>([
  ["next", "Next.js"],
  ["nuxt", "Nuxt"],
  ["react", "React"],
  ["solid-js", "Solid"],
  ["svelte", "Svelte"],
  ["@sveltejs/kit", "SvelteKit"],
  ["vue", "Vue"],
  ["@angular/core", "Angular"],
  ["astro", "Astro"],
  ["vite", "Vite"],
  ["electron", "Electron"],
  ["fastify", "Fastify"],
  ["@nestjs/core", "NestJS"],
  ["hono", "Hono"],
  ["express", "Express"],
  ["@remix-run/react", "Remix"],
  ["react-router", "React Router"],
])

const EXPLICIT_MANAGERS = new Set<PackageManager>([
  "bun",
  "npm",
  "pnpm",
  "yarn",
  "cargo",
  "poetry",
  "uv",
  "pipenv",
  "go",
  "bundler",
  "composer",
  "mix",
  "swiftpm",
  "cocoapods",
  "gradle",
  "maven",
])

function isRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === "object" && !Array.isArray(input)
}

function strings(input: unknown): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : []
}

function stringRecord(input: unknown): Record<string, string> {
  if (!isRecord(input)) return {}
  return Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
}

function packageManagerName(input: string): string | undefined {
  return /^([a-z][a-z0-9_-]*)(?:@|$)/i.exec(input.trim())?.[1]?.toLowerCase()
}

function intent(name: string): ScriptIntent {
  if (/(?:^|:|-)lint|format|prettier|biome/i.test(name)) return "lint"
  if (/(?:^|:|-)(?:test|spec|vitest|jest)(?:$|:|-)/i.test(name)) return "test"
  if (/(?:^|:|-)(?:typecheck|type-check|check-types|tsc)(?:$|:|-)/i.test(name)) return "typecheck"
  if (/(?:^|:|-)build(?:$|:|-)/i.test(name)) return "build"
  return "other"
}

function redactCommand(input: string): { command: string; redacted: boolean } {
  let command = input
  command = command.replace(
    /((?:^|\s)[A-Z0-9_]*(?:TOKEN|PASSWORD|PASSWD|SECRET|API_KEY|PRIVATE_KEY)[A-Z0-9_]*=)([^\s]+)/gi,
    "$1[REDACTED]",
  )
  command = command.replace(
    /(--?(?:token|password|passwd|secret|api[-_]key|access[-_]key)(?:=|\s+))(?:"[^"]*"|'[^']*'|[^\s]+)/gi,
    "$1[REDACTED]",
  )
  command = command.replace(/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, "$1[REDACTED]@")
  return { command, redacted: command !== input }
}

function lockfileManager(filePath: string): PackageManager | undefined {
  if (filePath.includes("/")) return undefined
  return LOCKFILE_MANAGERS.get(filePath)
}

function languageSignals(filePath: string): string[] {
  const basename = filePath.split("/").at(-1)?.toLowerCase()
  if (!basename) return []

  if (basename === "package.json" || basename === "bun.lock" || basename === "bun.lockb") return ["JavaScript"]
  if (basename === "tsconfig.json" || basename === "jsconfig.json") return ["TypeScript"]
  if (basename === "cargo.toml" || basename === "cargo.lock") return ["Rust"]
  if (basename === "go.mod" || basename === "go.sum") return ["Go"]
  if (["pyproject.toml", "requirements.txt", "pipfile", "pipfile.lock", "poetry.lock", "uv.lock"].includes(basename))
    return ["Python"]
  if (basename === "pom.xml" || basename.startsWith("build.gradle") || basename.startsWith("settings.gradle"))
    return ["Java"]
  if (basename.endsWith(".csproj") || basename.endsWith(".sln") || basename === "global.json") return ["C#"]
  if (basename === "gemfile" || basename === "gemfile.lock") return ["Ruby"]
  if (basename === "composer.json" || basename === "composer.lock") return ["PHP"]
  if (basename === "mix.exs" || basename === "mix.lock") return ["Elixir"]
  if (basename === "package.swift") return ["Swift"]
  if (basename === "podfile" || basename === "podfile.lock") return ["Swift"]

  return []
}

function packageInfo(file: ManifestFile, warnings: ManifestWarning[]): PackageManifestInfo | undefined {
  if (file.content === undefined) {
    warnings.push({
      code: "missing-content",
      message: "Manifest path was discovered but its content was unavailable",
      path: file.path,
    })
    return undefined
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(file.content) as unknown
  } catch {
    warnings.push({
      code: "invalid-json",
      message: "Package manifest is not valid JSON",
      path: file.path,
    })
    return undefined
  }

  if (!isRecord(parsed)) {
    warnings.push({
      code: "invalid-json",
      message: "Package manifest must contain a JSON object",
      path: file.path,
    })
    return undefined
  }

  const directory = file.path === "package.json" ? "" : file.path.slice(0, -"/package.json".length)
  const packageName = typeof parsed.name === "string" ? parsed.name : undefined
  const packageManager = typeof parsed.packageManager === "string" ? parsed.packageManager : undefined
  const workspaceValue = isRecord(parsed.workspaces) ? parsed.workspaces.packages : parsed.workspaces
  const workspacePatterns = strings(workspaceValue)
  const scripts = isRecord(parsed.scripts)
    ? Object.entries(parsed.scripts).flatMap(([name, value]) => {
        if (typeof value !== "string") return []
        const safe = redactCommand(value)
        return [{
          packagePath: file.path,
          name,
          command: safe.command,
          intent: intent(name),
          ...(safe.redacted ? { redacted: true } : {}),
        }]
      })
    : []

  const dependencies = [
    ...Object.keys(isRecord(parsed.dependencies) ? parsed.dependencies : {}),
    ...Object.keys(isRecord(parsed.devDependencies) ? parsed.devDependencies : {}),
    ...Object.keys(isRecord(parsed.peerDependencies) ? parsed.peerDependencies : {}),
    ...Object.keys(isRecord(parsed.optionalDependencies) ? parsed.optionalDependencies : {}),
  ]

  return {
    path: file.path,
    directory,
    ...(packageName ? { name: packageName } : {}),
    ...(typeof parsed.private === "boolean" ? { isPrivate: parsed.private } : {}),
    ...(packageManager ? { packageManager } : {}),
    engines: stringRecord(parsed.engines),
    dependencies: [...new Set(dependencies)].toSorted(),
    workspacePatterns,
    scripts,
  }
}

export function analyzeManifestInventory(files: readonly ManifestFile[]): ManifestInventory {
  const normalized = files
    .flatMap((file) => {
      const path = file.path.replaceAll("\\", "/").replace(/^\.\//, "")
      if (!path || path.startsWith("/") || path.split("/").includes("..")) return []
      const basename = path.split("/").at(-1) ?? ""
      if (!MANIFEST_NAMES.has(basename) && !basename.endsWith(".csproj") && !basename.endsWith(".sln")) return []
      return [{ ...file, path }]
    })
    .toSorted((a, b) => a.path.localeCompare(b.path))

  const warnings: ManifestWarning[] = []
  const packages = normalized.flatMap((file) => (file.path === "package.json" || file.path.endsWith("/package.json")
    ? packageInfo(file, warnings) ?? []
    : []))
  const scripts = packages.flatMap((item) => item.scripts).toSorted((a, b) =>
    a.packagePath.localeCompare(b.packagePath) || a.name.localeCompare(b.name),
  )

  const rootPackage = packages.find((item) => item.path === "package.json")
  const explicitValues = packages.flatMap((item) => item.packageManager ? [{ path: item.path, value: item.packageManager }] : [])
  const explicitManagers = new Set<PackageManager>()

  for (const item of explicitValues) {
    const name = packageManagerName(item.value)
    if (!name || !EXPLICIT_MANAGERS.has(name as PackageManager)) {
      warnings.push({
        code: "unsupported-package-manager",
        message: `Unsupported packageManager value: ${item.value}`,
        path: item.path,
      })
      continue
    }
    explicitManagers.add(name as PackageManager)
  }

  const rootLockfiles = normalized.flatMap((file) => {
    const manager = lockfileManager(file.path)
    return manager ? [{ path: file.path, manager }] : []
  })
  const lockManagers = new Set(rootLockfiles.map((item) => item.manager))
  const managerCandidates = new Set<PackageManager>([...explicitManagers, ...lockManagers])
  const explicitRoot = explicitValues.find((item) => item.path === "package.json")
  const explicitRootName = explicitRoot ? packageManagerName(explicitRoot.value) : undefined
  const explicitRootManager =
    explicitRootName && EXPLICIT_MANAGERS.has(explicitRootName as PackageManager)
      ? (explicitRootName as PackageManager)
      : undefined

  if (managerCandidates.size > 1) {
    warnings.push({
      code: "package-manager-conflict",
      message: "Repository contains conflicting package manager declarations or lockfiles",
      path: "package.json",
    })
  }

  if (explicitRootManager && lockManagers.size && !lockManagers.has(explicitRootManager)) {
    warnings.push({
      code: "package-manager-conflict",
      message: `Root packageManager declares ${explicitRootManager}, but root lockfiles do not match`,
      path: "package.json",
    })
  }

  const primaryPackageManager =
    explicitRootManager ?? (lockManagers.size === 1 ? [...lockManagers][0] : undefined)
  const languages = new Set(normalized.flatMap((file) => languageSignals(file.path)))
  const frameworks = new Set<string>()

  for (const item of packages) {
    for (const dependency of item.dependencies) {
      const framework = FRAMEWORKS.get(dependency)
      if (framework) frameworks.add(framework)
    }
  }

  const workspacePatterns = rootPackage?.workspacePatterns ?? []
  warnings.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code))

  return {
    manifestPaths: normalized.map((file) => file.path),
    packages,
    scripts,
    workspacePatterns,
    packageManagers: [...managerCandidates].toSorted(),
    ...(primaryPackageManager ? { primaryPackageManager } : {}),
    languages: [...languages].toSorted(),
    frameworks: [...frameworks].toSorted(),
    warnings,
  }
}
