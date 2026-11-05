import type { VisualReferenceRecord } from "./reference.js"

export interface VisualTypographyToken {
  readonly fontFamily: string
  readonly fontSizePx: number
  readonly fontWeight: number
  readonly lineHeight?: number
  readonly letterSpacingPx?: number
}

export interface VisualScreenContract {
  readonly id: string
  readonly name: string
  readonly states: readonly string[]
  readonly taskIDs: readonly string[]
}

export interface VisualContrastRule {
  readonly foregroundToken: string
  readonly backgroundToken: string
  readonly minimumRatio: number
}

export interface ProjectVisualProfile {
  readonly id: string
  readonly projectID: string
  readonly revision: string
  readonly name: string
  readonly referenceIDs: readonly string[]
  readonly colors: Readonly<Record<string, string>>
  readonly typography: Readonly<Record<string, VisualTypographyToken>>
  readonly breakpoints: Readonly<Record<string, number>>
  readonly contrastRules: readonly VisualContrastRule[]
  readonly screens: readonly VisualScreenContract[]
  readonly accessibility: {
    readonly keyboardNavigation: boolean
    readonly reducedMotionFallback: boolean
    readonly minimumTapTargetPx: number
  }
}

export interface VisualProfileValidation {
  readonly valid: boolean
  readonly diagnostics: readonly string[]
  readonly contrastResults: readonly {
    readonly foregroundToken: string
    readonly backgroundToken: string
    readonly ratio: number
    readonly minimumRatio: number
    readonly pass: boolean
  }[]
}

function parseHexColor(value: string): [number, number, number] | undefined {
  const normalized = value.trim()
  const match = normalized.match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i)
  if (!match?.[1]) return undefined
  const hex = match[1].length === 3 ? [...match[1]].map((part) => part + part).join("") : match[1]
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function luminance(value: string): number | undefined {
  const rgb = parseHexColor(value)
  if (!rgb) return undefined
  const linear = rgb.map((channel) => {
    const sRGB = channel / 255
    return sRGB <= 0.04045 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
}

export function visualContrastRatio(foreground: string, background: string): number | undefined {
  const foregroundLuminance = luminance(foreground)
  const backgroundLuminance = luminance(background)
  if (foregroundLuminance === undefined || backgroundLuminance === undefined) return undefined
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Validate one project-owned visual profile against approved references and measurable design constraints.
 * Multiple profiles can coexist for one project; no profile mutates the application's ROCKSOUL theme.
 */
export function validateProjectVisualProfile(input: {
  profile: ProjectVisualProfile
  references: readonly VisualReferenceRecord[]
  existingProfileIDs?: readonly string[]
}): VisualProfileValidation {
  const { profile } = input
  const diagnostics: string[] = []
  const fail = (reason: string) => diagnostics.push(reason)

  if (!profile.id.trim() || !profile.projectID.trim() || !profile.revision.trim() || !profile.name.trim())
    fail("Visual profile identity, project, revision, and name are required")
  if (input.existingProfileIDs?.includes(profile.id)) fail("Visual profile ID already exists in the project")

  if (new Set(profile.referenceIDs).size !== profile.referenceIDs.length)
    fail("Visual reference IDs must be unique within a profile")
  for (const referenceID of profile.referenceIDs) {
    const reference = input.references.find((item) => item.id === referenceID)
    if (!reference) {
      fail("Profile references an unknown visual reference: " + referenceID)
      continue
    }
    if (reference.projectID !== profile.projectID)
      fail("Profile cannot reuse another project's reference without a separate project-scoped copy: " + referenceID)
    if (!reference.approvedBy.trim() || !Number.isFinite(Date.parse(reference.approvedAt)))
      fail("Profile reference has no recorded explicit approval: " + referenceID)
  }

  const colorEntries = Object.entries(profile.colors)
  if (colorEntries.length === 0) fail("Visual profile requires at least one semantic color token")
  for (const [token, value] of colorEntries) {
    if (!token.trim() || !parseHexColor(value)) fail("Color token must use a named token and a valid #RGB/#RRGGBB value: " + token)
  }

  const typographyEntries = Object.entries(profile.typography)
  if (typographyEntries.length === 0) fail("Visual profile requires at least one typography token")
  for (const [token, value] of typographyEntries) {
    if (
      !token.trim() || !value.fontFamily.trim() ||
      !Number.isFinite(value.fontSizePx) || value.fontSizePx <= 0 ||
      !Number.isSafeInteger(value.fontWeight) || value.fontWeight < 100 || value.fontWeight > 900 || value.fontWeight % 100 !== 0 ||
      (value.lineHeight !== undefined && (!Number.isFinite(value.lineHeight) || value.lineHeight <= 0)) ||
      (value.letterSpacingPx !== undefined && !Number.isFinite(value.letterSpacingPx))
    ) fail("Typography token contains invalid family, size, weight, or metrics: " + token)
  }

  const breakpointValues = Object.values(profile.breakpoints)
  if (breakpointValues.length === 0 || breakpointValues.some((value) => !Number.isFinite(value) || value <= 0))
    fail("Responsive breakpoints must contain positive finite widths")
  if (new Set(breakpointValues).size !== breakpointValues.length)
    fail("Responsive breakpoints must have unique widths")

  const contrastResults = profile.contrastRules.map((rule) => {
    const foreground = profile.colors[rule.foregroundToken]
    const background = profile.colors[rule.backgroundToken]
    const ratio = foreground && background ? visualContrastRatio(foreground, background) : undefined
    const validMinimum = Number.isFinite(rule.minimumRatio) && rule.minimumRatio >= 3 && rule.minimumRatio <= 21
    if (ratio === undefined) fail("Contrast rule references an unknown or invalid color token")
    if (!validMinimum) fail("Contrast rule minimum must be between 3:1 and 21:1")
    const pass = ratio !== undefined && validMinimum && ratio >= rule.minimumRatio
    if (ratio !== undefined && validMinimum && !pass)
      fail("Contrast ratio " + ratio.toFixed(2) + ":1 does not meet " + rule.minimumRatio.toFixed(2) + ":1")
    return {
      foregroundToken: rule.foregroundToken,
      backgroundToken: rule.backgroundToken,
      ratio: ratio ?? 0,
      minimumRatio: rule.minimumRatio,
      pass,
    }
  })

  const screenIDs = new Set<string>()
  for (const screen of profile.screens) {
    if (!screen.id.trim() || !screen.name.trim() || screenIDs.has(screen.id))
      fail("Screen IDs/names must be non-empty and screen IDs unique: " + screen.id)
    screenIDs.add(screen.id)
    if (screen.states.length === 0 || screen.states.some((state) => !state.trim()))
      fail("Each screen requires non-empty interaction/state coverage: " + screen.id)
    if (new Set(screen.states).size !== screen.states.length || new Set(screen.taskIDs).size !== screen.taskIDs.length)
      fail("Screen state and task references must be unique: " + screen.id)
  }

  if (!profile.accessibility.keyboardNavigation) fail("Keyboard navigation must be part of the profile contract")
  if (!profile.accessibility.reducedMotionFallback) fail("Reduced-motion fallback must be part of the profile contract")
  if (!Number.isFinite(profile.accessibility.minimumTapTargetPx) || profile.accessibility.minimumTapTargetPx < 24)
    fail("Minimum tap target must be a finite size of at least 24px")

  return { valid: diagnostics.length === 0, diagnostics, contrastResults }
}
