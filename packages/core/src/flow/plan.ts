export type PlanTaskStatus =
  | "draft"
  | "planned"
  | "ready"
  | "in_progress"
  | "blocked"
  | "implemented"
  | "verified"
  | "cancelled"

export type PlanDiagnosticCode =
  | "no-tasks"
  | "empty-title"
  | "malformed-task-heading"
  | "duplicate-task-id"
  | "missing-required-field"
  | "empty-required-field"
  | "invalid-status"
  | "invalid-dependency"
  | "missing-dependency"
  | "dependency-cycle"

export interface PlanDiagnostic {
  readonly code: PlanDiagnosticCode
  readonly message: string
  readonly line: number
  readonly taskID?: string
  readonly dependencyID?: string
}

export interface PlanTask {
  readonly id: string
  readonly title: string
  readonly status?: PlanTaskStatus
  readonly dependsOn: readonly string[]
  readonly fields: Readonly<Record<string, string>>
  readonly fieldLines: Readonly<Record<string, number>>
  readonly metadata: Readonly<Record<string, string>>
  readonly raw: string
  readonly line: number
  readonly endLine: number
}

export interface PlanParseResult {
  readonly tasks: readonly PlanTask[]
  readonly diagnostics: readonly PlanDiagnostic[]
  readonly valid: boolean
}

const STATUS = new Set<PlanTaskStatus>([
  "draft",
  "planned",
  "ready",
  "in_progress",
  "blocked",
  "implemented",
  "verified",
  "cancelled",
])

const REQUIRED_FIELDS = ["Status", "Depends on", "Goal", "Scope", "Acceptance", "Verification", "Deliverable"] as const
const TASK_HEADING = /^##\s+([A-Z][A-Z0-9]*-\d{3,})(?:\s+[—–-]\s*(.*))?\s*$/
const TASK_ID_PREFIX = /^##\s+([A-Z][A-Z0-9]*-\d{3,})(?=\s|$)/
const SECTION_HEADING = /^#{1,2}\s+/
const FIELD_LINE = /^-\s+([A-Za-z][A-Za-z0-9 _-]*):(?:\s*(.*))?$/
const TASK_ID = /^[A-Z][A-Z0-9]*-\d{3,}$/

interface TaskSection {
  readonly id: string
  readonly title: string
  readonly start: number
  readonly end: number
  readonly raw: string
  readonly malformedHeading: boolean
}

function lineText(line: string) {
  return line.endsWith("\r") ? line.slice(0, -1) : line
}

function parseFields(lines: readonly string[]) {
  const values = new Map<string, string[]>()
  const fieldLines = new Map<string, number>()
  let current: string | undefined

  for (let index = 1; index < lines.length; index++) {
    const line = lineText(lines[index] ?? "")
    const match = FIELD_LINE.exec(line)

    if (match) {
      current = match[1]?.trim()
      if (!current) continue
      if (!values.has(current)) {
        values.set(current, [])
        fieldLines.set(current, index + 1)
      }
      const value = match[2] ?? ""
      if (value) values.get(current)?.push(value)
      continue
    }

    if (current) values.get(current)?.push(line)
  }

  const fields: Record<string, string> = {}
  for (const [name, value] of values) {
    fields[name] = value.join("\n").trim()
  }

  return { fields, fieldLines }
}

function taskSections(lines: readonly string[]): TaskSection[] {
  const sections: TaskSection[] = []

  for (let index = 0; index < lines.length; index++) {
    const heading = lineText(lines[index] ?? "")
    const prefix = TASK_ID_PREFIX.exec(heading)
    if (!prefix) continue
    const match = TASK_HEADING.exec(heading)

    const endIndex = lines.findIndex((line, offset) => offset > index && SECTION_HEADING.test(lineText(line)))
    const end = endIndex === -1 ? lines.length : endIndex
    sections.push({
      id: match?.[1] ?? prefix[1] ?? "",
      title: (match?.[2] ?? "").trim(),
      start: index,
      end,
      raw: lines.slice(index, end).join("\n"),
      malformedHeading: !match,
    })
  }

  return sections
}

function cycles(tasks: readonly PlanTask[]): Array<{ ids: string[]; line: number }> {
  const byID = new Map<string, PlanTask>(tasks.map((task): [string, PlanTask] => [task.id, task]))
  const state = new Map<string, "visiting" | "visited">()
  const stack: string[] = []
  const found = new Map<string, { ids: string[]; line: number }>()

  const visit = (id: string) => {
    state.set(id, "visiting")
    stack.push(id)

    const task = byID.get(id)
    for (const dependency of task?.dependsOn ?? []) {
      if (!byID.has(dependency)) continue

      if (state.get(dependency) === "visiting") {
        const start = stack.indexOf(dependency)
        const ids = [...stack.slice(start), dependency]
        const key = [...new Set(ids)].toSorted().join("|")
        if (!found.has(key))
          found.set(key, { ids, line: task?.fieldLines["Depends on"] ?? task?.line ?? 1 })
        continue
      }

      if (state.get(dependency) !== "visited") visit(dependency)
    }

    stack.pop()
    state.set(id, "visited")
  }

  for (const task of tasks) {
    if (!state.has(task.id)) visit(task.id)
  }

  return [...found.values()]
}

/**
 * Parse and validate the documented ROCKSOUL FLOW Markdown task subset.
 *
 * This function is intentionally pure: it does not read or write files, access Git,
 * execute commands, call agents, or normalize the source Markdown.
 */
export function parsePlanMarkdown(markdown: string): PlanParseResult {
  const lines = markdown.split("\n")
  const sections = taskSections(lines)
  const diagnostics: PlanDiagnostic[] = []

  if (sections.length === 0) {
    return {
      tasks: [],
      diagnostics: [{ code: "no-tasks", message: "No ROCKSOUL FLOW task headings were found", line: 1 }],
      valid: false,
    }
  }

  const parsed = sections.map((section): PlanTask => {
    const sectionLines = lines.slice(section.start, section.end)
    const { fields, fieldLines } = parseFields(sectionLines)
    const sourceFieldLines = Object.fromEntries(
      [...fieldLines].map(([name, line]) => [name, section.start + line]),
    )
    const statusValue = fields.Status?.trim()
    const status = statusValue && STATUS.has(statusValue as PlanTaskStatus) ? (statusValue as PlanTaskStatus) : undefined
    const dependencyValue = fields["Depends on"]?.trim() ?? ""
    const dependsOn: string[] = []

    if (section.malformedHeading) {
      diagnostics.push({
        code: "malformed-task-heading",
        message: `Task ${section.id} must use the "ID — title" heading format`,
        line: section.start + 1,
        taskID: section.id,
      })
    } else if (!section.title) {
      diagnostics.push({
        code: "empty-title",
        message: `Task ${section.id} has an empty title`,
        line: section.start + 1,
        taskID: section.id,
      })
    }

    for (const field of REQUIRED_FIELDS) {
      if (!Object.hasOwn(fields, field)) {
        diagnostics.push({
          code: "missing-required-field",
          message: `Task ${section.id} is missing required field: ${field}`,
          line: section.start + 1,
          taskID: section.id,
        })
        continue
      }

      if (field !== "Status" && field !== "Depends on" && !fields[field]?.trim()) {
        diagnostics.push({
          code: "empty-required-field",
          message: `Task ${section.id} has an empty required field: ${field}`,
          line: sourceFieldLines[field] ?? section.start + 1,
          taskID: section.id,
        })
      }
    }

    if (Object.hasOwn(fields, "Status") && !status) {
      diagnostics.push({
        code: "invalid-status",
        message: `Task ${section.id} has an unsupported status: ${statusValue || "(empty)"}`,
        line: sourceFieldLines.Status ?? section.start + 1,
        taskID: section.id,
      })
    }

    if (Object.hasOwn(fields, "Depends on") && !dependencyValue) {
      diagnostics.push({
        code: "invalid-dependency",
        message: `Task ${section.id} must use "none" for an empty dependency list`,
        line: sourceFieldLines["Depends on"] ?? section.start + 1,
        taskID: section.id,
      })
    }

    if (dependencyValue && dependencyValue !== "none") {
      for (const value of dependencyValue.split(",")) {
        const dependency = value.trim()
        if (!TASK_ID.test(dependency)) {
          diagnostics.push({
            code: "invalid-dependency",
            message: `Task ${section.id} has an invalid dependency ID: ${dependency || "(empty)"}`,
            line: sourceFieldLines["Depends on"] ?? section.start + 1,
            taskID: section.id,
            dependencyID: dependency,
          })
          continue
        }
        dependsOn.push(dependency)
      }
    }

    const metadata: Record<string, string> = {}
    for (const [name, value] of Object.entries(fields)) {
      if (!REQUIRED_FIELDS.includes(name as (typeof REQUIRED_FIELDS)[number])) metadata[name] = value
    }

    return {
      id: section.id,
      title: section.title,
      ...(status ? { status } : {}),
      dependsOn,
      fields,
      fieldLines: sourceFieldLines,
      metadata,
      raw: section.raw,
      line: section.start + 1,
      endLine: section.end,
    }
  })

  const firstByID = new Map<string, PlanTask>()
  for (const task of parsed) {
    const first = firstByID.get(task.id)
    if (first) {
      diagnostics.push({
        code: "duplicate-task-id",
        message: `Task ID ${task.id} is duplicated (first declared on line ${first.line})`,
        line: task.line,
        taskID: task.id,
      })
      continue
    }
    firstByID.set(task.id, task)
  }

  const allIDs = new Set(parsed.map((task) => task.id))
  for (const task of parsed) {
    for (const dependency of task.dependsOn) {
      if (allIDs.has(dependency)) continue
      diagnostics.push({
        code: "missing-dependency",
        message: `Task ${task.id} depends on missing task ${dependency}`,
        line: task.fieldLines["Depends on"] ?? task.line,
        taskID: task.id,
        dependencyID: dependency,
      })
    }
  }

  for (const cycle of cycles(parsed)) {
    diagnostics.push({
      code: "dependency-cycle",
      message: `Dependency cycle detected: ${cycle.ids.join(" -> ")}`,
      line: cycle.line,
      taskID: cycle.ids[0] ?? "unknown",
    })
  }

  return {
    tasks: parsed,
    diagnostics,
    valid: diagnostics.length === 0,
  }
}
