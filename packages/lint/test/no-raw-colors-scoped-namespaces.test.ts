// Tailwind reads a color utility's own theme namespace before --color-*,
// so --background-color-surface makes bg-surface and nothing else. Those
// tokens are the theme's vocabulary for that utility, and the rule reads
// them the same way Tailwind does.

import * as path from "node:path"
import { describe, expect, test } from "vitest"

import { colorTokensFor } from "../src/project/theme"
import { noRawColors } from "../src/rules/no-raw-colors"
import { createTester, PROJECT } from "./helpers"

const PAGE = path.join(path.dirname(PROJECT), "scoped-theme/app/page.tsx")
const CSS = "test/fixtures/scoped-theme/app/globals.css"

describe("no-raw-colors reads scoped color namespaces", () => {
  test("a utility may name the tokens of the namespaces it reads", () => {
    createTester().run("no-raw-colors", noRawColors as any, {
      valid: [
        {
          filename: PAGE,
          code: `export const A = () => <div className="bg-surface bg-inset text-primary text-secondary border-default divide-soft ring-focus" />`,
        },
        // --color-* stays universal: brand works everywhere.
        {
          filename: PAGE,
          code: `export const A = () => <div className="bg-brand text-brand fill-brand hover:border-brand/50" />`,
        },
      ],
      invalid: [],
    })
  })

  test("a token of another namespace is undeclared, as Tailwind leaves it", () => {
    createTester().run("no-raw-colors", noRawColors as any, {
      valid: [],
      invalid: [
        {
          filename: PAGE,
          // Declared under --text-color-*, so bg-primary generates no CSS.
          code: `export const A = () => <div className="bg-primary" />`,
          errors: [
            {
              messageId: "undeclaredToken",
              data: {
                className: "bg-primary",
                tokens: "brand, inset, surface",
                file: CSS,
              },
            },
          ],
        },
        {
          filename: PAGE,
          // fill reads --color-* alone.
          code: `export const A = () => <div className="fill-surface" />`,
          errors: [
            {
              messageId: "undeclaredToken",
              data: { className: "fill-surface", tokens: "brand", file: CSS },
            },
          ],
        },
      ],
    })
  })

  test("suggestions come from the namespace the utility reads", () => {
    createTester().run("no-raw-colors", noRawColors as any, {
      valid: [],
      invalid: [
        {
          filename: PAGE,
          code: `export const A = () => <div className="bg-zinc-50" />`,
          errors: [
            {
              messageId: "paletteClassNear",
              data: {
                className: "bg-zinc-50",
                suggestions: "bg-inset",
                file: CSS,
              },
              suggestions: [
                {
                  messageId: "useToken",
                  data: { replacement: "bg-inset" },
                  output: `export const A = () => <div className="bg-inset" />`,
                },
              ],
            },
          ],
        },
      ],
    })
  })
})

const ONLY = path.join(path.dirname(PROJECT), "scoped-only-theme/app/page.tsx")
const ONLY_CSS = "test/fixtures/scoped-only-theme/app/globals.css"

describe("a theme with no universal palette", () => {
  test("a utility with no colors of its own is left alone", () => {
    createTester().run("no-raw-colors", noRawColors as any, {
      valid: [
        {
          filename: ONLY,
          code: `export const A = () => <div className="bg-surface text-primary" />`,
        },
        // fill reads --color-* alone, and this theme declares none, so
        // there is no vocabulary to judge the name against.
        {
          filename: ONLY,
          code: `export const A = () => <div className="fill-surface" />`,
        },
      ],
      invalid: [
        // A raw palette color is still raw; with no tokens to offer for
        // fill, the message says so without listing any.
        {
          filename: ONLY,
          code: `export const A = () => <div className="fill-red-500" />`,
          errors: [
            { messageId: "paletteClass", data: { className: "fill-red-500" } },
          ],
        },
        {
          filename: ONLY,
          code: `export const A = () => <div className="bg-zinc-50" />`,
          errors: [
            {
              messageId: "paletteClassNear",
              data: {
                className: "bg-zinc-50",
                suggestions: "bg-surface",
                file: ONLY_CSS,
              },
              suggestions: [
                {
                  messageId: "useToken",
                  data: { replacement: "bg-surface" },
                  output: `export const A = () => <div className="bg-surface" />`,
                },
              ],
            },
          ],
        },
      ],
    })
  })
})

describe("the theme's color vocabulary", () => {
  test("--color-* alone is universal; a prefix adds its own namespaces", () => {
    expect(colorTokensFor(PAGE)).toEqual(new Set(["brand"]))
    expect(colorTokensFor(PAGE, "bg-")).toEqual(
      new Set(["brand", "surface", "inset"])
    )
    expect(colorTokensFor(PAGE, "text-")).toEqual(
      new Set(["brand", "primary", "secondary"])
    )
    // divide-* reads its own namespace and then the border's.
    expect(colorTokensFor(PAGE, "divide-")).toEqual(
      new Set(["brand", "soft", "default"])
    )
    // A border side reads the same namespace as the base utility.
    expect(colorTokensFor(PAGE, "border-t-")).toEqual(
      new Set(["brand", "default"])
    )
    // fill has no namespace of its own.
    expect(colorTokensFor(PAGE, "fill-")).toEqual(new Set(["brand"]))
  })

  test("a reset drops its own namespace only", () => {
    expect(colorTokensFor(PAGE, "bg-")?.has("legacy")).toBe(false)
  })
})
