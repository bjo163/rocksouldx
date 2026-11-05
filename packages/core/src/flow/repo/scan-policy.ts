import path from "path"

export type ScanPathExclusion =
  | "invalid-relative-path"
  | "generated-or-vendor"
  | "sensitive-path"
  | "symlink-not-followed"

export type ScanPathDecision =
  | { readonly included: true; readonly path: string }
  | { readonly included: false; readonly path?: string; readonly reason: ScanPathExclusion }

export const DEFAULT_EXCLUDED_DIRECTORIES = [
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".output",
  ".vercel",
  ".cache",
  ".parcel-cache",
  ".vite",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".gradle",
  "pods",
  "obj",
  "bin",
] as const

const EXCLUDED_DIRECTORY_SET = new Set<string>(DEFAULT_EXCLUDED_DIRECTORIES)
const EXCLUDED_SECRET_DIRECTORIES = new Set([".ssh", ".aws", ".azure", ".gnupg"])
const SAFE_ENV_TEMPLATES = new Set([".env.example", ".env.sample", ".env.template", ".env.defaults"])
const SENSITIVE_FILENAMES = new Set([
  ".npmrc",
  ".pypirc",
  ".netrc",
  "id_rsa",
  "id_ed25519",
  "id_ecdsa",
  "credentials",
  "credentials.json",
  "secrets.json",
  "service-account.json",
])

/**
 * Normalize a discovered path to a root-relative POSIX path.
 * Absolute paths and lexical traversal are rejected rather than repaired.
 */
export function normalizeScanPath(input: string): string | undefined {
  const value = input.replaceAll("\\", "/")
  if (!value || value.startsWith("/") || /^[A-Za-z]:\//.test(value) || value.startsWith("//")) return undefined

  const parts: string[] = []
  for (const part of value.split("/")) {
    if (!part || part === ".") continue
    if (part === "..") return undefined
    parts.push(part)
  }

  return parts.length ? parts.join("/") : undefined
}

function sensitivePath(relative: string): boolean {
  const parts = relative.split("/")
  const basename = (parts.at(-1) ?? "").toLowerCase()

  if (parts.some((part) => EXCLUDED_SECRET_DIRECTORIES.has(part.toLowerCase()))) return true
  if (SAFE_ENV_TEMPLATES.has(basename)) return false
  if (basename === ".env" || (basename.startsWith(".env.") && !SAFE_ENV_TEMPLATES.has(basename))) return true
  if (SENSITIVE_FILENAMES.has(basename)) return true
  if (/^(?:id_rsa|id_ed25519|id_ecdsa)(?:\.pub)?$/i.test(basename)) return !basename.endsWith(".pub")
  if (/\.(?:pem|key|p12|pfx|jks|keystore|tfstate)$/i.test(basename)) return true
  if (/\.tfstate\.(?:backup|old)$/i.test(basename)) return true

  return false
}

/**
 * Decide whether a root-relative candidate is safe to include in a repository snapshot.
 *
 * VCS ignore rules are intentionally not reimplemented here. Callers must pass the
 * repository's ignore-aware path discovery result from the existing filesystem/Git layer.
 */
export function classifyScanPath(input: { path: string; symlink?: boolean }): ScanPathDecision {
  if (input.symlink) return { included: false, reason: "symlink-not-followed" }

  const relative = normalizeScanPath(input.path)
  if (!relative) return { included: false, reason: "invalid-relative-path" }

  const parts = relative.split("/")
  if (parts.some((part) => EXCLUDED_DIRECTORY_SET.has(part.toLowerCase())))
    return { included: false, path: relative, reason: "generated-or-vendor" }

  if (sensitivePath(relative)) return { included: false, path: relative, reason: "sensitive-path" }

  return { included: true, path: relative }
}

/**
 * Check lexical containment for already-resolved absolute paths.
 * Callers must canonicalize real paths before relying on this boundary.
 */
export function isWithinScanRoot(root: string, candidate: string): boolean {
  const absoluteRoot = path.resolve(root)
  const absoluteCandidate = path.resolve(candidate)
  const relative = path.relative(absoluteRoot, absoluteCandidate)

  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
}
