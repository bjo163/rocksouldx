import { classifyScanPath, normalizeScanPath } from "./scan-policy.js"

export type DocumentationKind =
  | "agent-guidance"
  | "readme"
  | "docs-index"
  | "architecture"
  | "product"
  | "plan"
  | "audit"
  | "contributing"
  | "changelog"
  | "specification"
  | "other"

export interface DocumentationEntry {
  readonly path: string
  readonly kind: DocumentationKind
  readonly directory: string
}

export interface DocumentationInventory {
  readonly entries: readonly DocumentationEntry[]
  readonly guidance: readonly string[]
  readonly rootReadme?: string
  readonly docsIndex?: string
  readonly plans: readonly string[]
  readonly architectures: readonly string[]
}

const MARKDOWN = /\.(?:md|mdx)$/i

function kind(path: string): DocumentationKind | undefined {
  const basename = path.split("/").at(-1) ?? ""
  const lower = basename.toLowerCase()
  const segments = path.split("/")

  if (lower === "agents.md") return "agent-guidance"
  if (lower === "readme.md" && path === "README.md") return "readme"
  if (lower === "readme.md" && path === "docs/README.md") return "docs-index"
  if (lower.includes("contributing") || lower === "code_of_conduct.md") return "contributing"
  if (lower.includes("changelog") || lower.includes("release-notes")) return "changelog"
  if (segments[0] === "docs") {
    if (segments[1] === "architecture" || /^adr-\d+/i.test(basename)) return "architecture"
    if (segments[1] === "product") return "product"
    if (segments[1] === "plans" || basename.endsWith(".plan.md")) return "plan"
    if (segments[1] === "audits") return "audit"
    if (lower.includes("spec")) return "specification"
  }
  if (lower === "readme.md") return "readme"
  if (MARKDOWN.test(path)) return "other"
}

function ancestors(directory: string): string[] {
  if (!directory) return []
  const parts = directory.split("/")
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"))
}

/**
 * Classify documentation and instruction paths already discovered from one project.
 * This helper does not read content and does not make claims about the implementation.
 */
export function analyzeDocumentationInventory(paths: readonly string[]): DocumentationInventory {
  const entries = paths
    .flatMap((input) => {
      const decision = classifyScanPath({ path: input })
      if (!decision.included || !MARKDOWN.test(decision.path)) return []
      const value = kind(decision.path)
      if (!value) return []
      const parts = decision.path.split("/")
      return [{
        path: decision.path,
        kind: value,
        directory: parts.length > 1 ? parts.slice(0, -1).join("/") : "",
      }]
    })
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.path === entry.path) === index)
    .toSorted((a, b) => a.path.localeCompare(b.path))

  const find = (value: DocumentationKind) => entries.filter((entry) => entry.kind === value).map((entry) => entry.path)

  return {
    entries,
    guidance: find("agent-guidance"),
    ...(entries.some((entry) => entry.path === "README.md") ? { rootReadme: "README.md" } : {}),
    ...(entries.some((entry) => entry.path === "docs/README.md") ? { docsIndex: "docs/README.md" } : {}),
    plans: find("plan"),
    architectures: find("architecture"),
  }
}

/**
 * Return every AGENTS.md that applies to a root-relative source file.
 * Ordering is root-to-leaf so more deeply nested instructions can be applied last.
 */
export function applicableGuidance(sourcePath: string, guidancePaths: readonly string[]): readonly string[] {
  const source = normalizeScanPath(sourcePath)
  if (!source) return []

  const directory = source.includes("/") ? source.slice(0, source.lastIndexOf("/")) : ""
  const allowed = new Set(["AGENTS.md", ...ancestors(directory).map((item) => `${item}/AGENTS.md`)])

  return guidancePaths
    .flatMap((input) => {
      const normalized = normalizeScanPath(input)
      if (!normalized || normalized.split("/").at(-1) !== "AGENTS.md" || !allowed.has(normalized)) return []
      return [normalized]
    })
    .filter((item, index, all) => all.indexOf(item) === index)
    .toSorted((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))
}

