// The map from a color utility to the theme namespaces it reads is
// Tailwind's, not ours: --background-color-surface makes bg-surface and
// nothing else. This asks the installed Tailwind for every pair, so a
// namespace that is renamed, dropped or re-pointed fails here rather
// than turning into a wrong finding in someone's project.

import * as path from "node:path"
import { describe, expect, test } from "vitest"

import {
  COLOR_NAMESPACE_NAMES,
  colorNamespacesOf,
} from "../src/grammar/classes"
import { query, resetOracle } from "../src/tailwind/oracle"
import { PROJECT } from "./helpers"

const CSS = path.join(path.dirname(PROJECT), "namespace-probe/app/globals.css")

// The fixture names each token after its namespace.
const probeOf = (namespace: string) => namespace.replace(/-/g, "")

// Every color utility, including the ones that read --color-* alone.
const PREFIXES = [
  "bg",
  "text",
  "border",
  "border-t",
  "divide",
  "outline",
  "ring",
  "inset-ring",
  "ring-offset",
  "shadow",
  "inset-shadow",
  "text-shadow",
  "drop-shadow",
  "accent",
  "caret",
  "placeholder",
  "decoration",
  "from",
  "via",
  "to",
  "mask-linear-from",
  "fill",
  "stroke",
]

describe("the color namespaces a utility reads", () => {
  test("Tailwind agrees with the map, pair by pair", async () => {
    resetOracle()
    const candidates = ["bg-universal"]
    for (const prefix of PREFIXES) {
      candidates.push(`${prefix}-universal`)
      for (const namespace of COLOR_NAMESPACE_NAMES) {
        candidates.push(`${prefix}-${probeOf(namespace)}`)
      }
    }
    const answer = await query(CSS, candidates)
    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    const unknown = new Set(answer.unknown.map((entry) => entry.token))

    const expected: string[] = []
    const actual: string[] = []
    for (const prefix of PREFIXES) {
      // --color-* is every color utility's fallback.
      expected.push(`${prefix}-universal`)
      if (!unknown.has(`${prefix}-universal`))
        actual.push(`${prefix}-universal`)
      const reads = new Set(colorNamespacesOf(`${prefix}-`))
      for (const namespace of COLOR_NAMESPACE_NAMES) {
        const candidate = `${prefix}-${probeOf(namespace)}`
        if (reads.has(namespace)) expected.push(candidate)
        if (!unknown.has(candidate)) actual.push(candidate)
      }
    }
    expect(actual).toEqual(expected)
    // A few hundred candidates, each unknown one costing a suggestion.
  }, 60_000)

  test("the fixture declares a token for every namespace the map names", () => {
    const declared = new Set(COLOR_NAMESPACE_NAMES)
    const read = new Set(PREFIXES.flatMap((p) => colorNamespacesOf(`${p}-`)))
    expect([...read].filter((n) => !declared.has(n))).toEqual([])
  })
})
