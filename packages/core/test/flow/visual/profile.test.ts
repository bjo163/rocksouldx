import { describe, expect, test } from "bun:test"
import {
  validateProjectVisualProfile,
  visualContrastRatio,
} from "../../../src/flow/visual/profile.js"
import type { ProjectVisualProfile } from "../../../src/flow/visual/profile.js"
import type { VisualReferenceRecord } from "../../../src/flow/visual/reference.js"

const reference: VisualReferenceRecord = {
  id: "ref-a",
  projectID: "project-a",
  kind: "screenshot",
  source: "reference://home",
  sourceDescription: "Approved home reference",
  mediaType: "image/png",
  usageRights: "user-supplied",
  capturedAt: "2026-11-05T10:00:00.000Z",
  screenIDs: ["home"],
  tags: ["home"],
  approvedBy: "owner",
  approvedAt: "2026-11-05T10:01:00.000Z",
}

const profile = (overrides: Partial<ProjectVisualProfile> = {}): ProjectVisualProfile => ({
  id: "profile-a",
  projectID: "project-a",
  revision: "revision-a",
  name: "Cinematic Night",
  referenceIDs: ["ref-a"],
  colors: { text: "#FFFFFF", background: "#000000", accent: "#FF6600" },
  typography: {
    heading: { fontFamily: "Inter, sans-serif", fontSizePx: 32, fontWeight: 700, lineHeight: 1.2 },
    body: { fontFamily: "Inter, sans-serif", fontSizePx: 16, fontWeight: 400, lineHeight: 1.5 },
  },
  breakpoints: { mobile: 390, tablet: 768, desktop: 1280 },
  contrastRules: [{ foregroundToken: "text", backgroundToken: "background", minimumRatio: 7 }],
  screens: [{ id: "home", name: "Home", states: ["default", "loading", "error"], taskIDs: ["RSF-803"] }],
  accessibility: { keyboardNavigation: true, reducedMotionFallback: true, minimumTapTargetPx: 44 },
  ...overrides,
})

describe("visualContrastRatio", () => {
  test("calculates WCAG contrast ratio for black and white", () => {
    expect(visualContrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5)
  })
})

describe("validateProjectVisualProfile", () => {
  test("accepts a project-scoped profile with valid tokens and contrast", () => {
    expect(validateProjectVisualProfile({ profile: profile(), references: [reference] })).toMatchObject({
      valid: true,
      contrastResults: [{ pass: true, ratio: 21 }],
    })
  })

  test("rejects references owned by another project", () => {
    const result = validateProjectVisualProfile({
      profile: profile(),
      references: [{ ...reference, projectID: "other-project" }],
    })
    expect(result.valid).toBe(false)
    expect(result.diagnostics.some((item) => item.includes("another project's reference"))).toBe(true)
  })

  test("rejects low-contrast combinations and invalid breakpoints/typography", () => {
    const result = validateProjectVisualProfile({
      profile: profile({
        colors: { text: "#777777", background: "#FFFFFF" },
        contrastRules: [{ foregroundToken: "text", backgroundToken: "background", minimumRatio: 4.5 }],
        breakpoints: { mobile: 390, tablet: 390 },
        typography: { body: { fontFamily: "", fontSizePx: 0, fontWeight: 950 } },
      }),
      references: [reference],
    })
    expect(result.valid).toBe(false)
    expect(result.diagnostics.some((item) => item.includes("Contrast ratio"))).toBe(true)
    expect(result.diagnostics).toContain("Responsive breakpoints must have unique widths")
  })

  test("requires keyboard and reduced-motion contracts and unique screens", () => {
    const result = validateProjectVisualProfile({
      profile: profile({
        screens: [
          { id: "home", name: "Home", states: ["default"], taskIDs: [] },
          { id: "home", name: "Home Copy", states: ["default"], taskIDs: [] },
        ],
        accessibility: { keyboardNavigation: false, reducedMotionFallback: false, minimumTapTargetPx: 20 },
      }),
      references: [reference],
    })
    expect(result.valid).toBe(false)
    expect(result.diagnostics).toContain("Keyboard navigation must be part of the profile contract")
    expect(result.diagnostics).toContain("Reduced-motion fallback must be part of the profile contract")
  })

  test("keeps profiles independent and detects duplicate profile IDs", () => {
    expect(validateProjectVisualProfile({
      profile: profile(),
      references: [reference],
      existingProfileIDs: ["profile-a"],
    }).diagnostics).toContain("Visual profile ID already exists in the project")
  })
})
