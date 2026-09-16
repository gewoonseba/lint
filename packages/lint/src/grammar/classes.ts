// Brackets and parens keep their inner colons, so an arbitrary variant
// and font-(family-name:--code-font) survive.
export function splitVariants(token: string) {
  if (!token.includes(":")) return { variants: [], base: token }
  const segments: string[] = []
  let bracketDepth = 0
  let parenDepth = 0
  let current = ""
  for (const char of token) {
    if (char === "[") {
      bracketDepth++
    } else if (char === "]") {
      bracketDepth--
    } else if (bracketDepth === 0) {
      if (char === "(") {
        parenDepth++
      } else if (char === ")") {
        parenDepth--
      }
    }
    if (char === ":" && bracketDepth === 0 && parenDepth === 0) {
      segments.push(current)
      current = ""
      continue
    }
    current += char
  }
  segments.push(current)
  return {
    variants: segments.slice(0, -1),
    base: segments[segments.length - 1],
  }
}

export function splitClasses(value: string) {
  return value.split(/\s+/).filter(Boolean)
}

// Marker classes style nothing and have no group; they count as layout.
const MARKERS = new Set(["group", "peer", "dark", "light"])

export function isMarkerClass(token: string) {
  return MARKERS.has(normalizeClass(token).split("/")[0])
}

// What contracts and classification match against.
export function normalizeClass(token: string) {
  const { base } = splitVariants(token)
  return base.replace(/^!/, "").replace(/!$/, "").replace(/^-/, "")
}

// mt-[13px], bg-[#333]. The v4 paren shorthand bg-(--x) is deliberately
// NOT arbitrary: it names a CSS variable, which is almost always a real
// token. Raw colors laundered through one are caught where they are set.
export function isArbitraryValue(token: string) {
  if (!token.includes("[")) return false
  const { base } = splitVariants(token)
  return /-\[[^\]]*\]/.test(base) || /^\[[^\]]+:[^\]]+\]$/.test(base)
}

// The utilities that take a color. Longest alternatives first, so
// text-shadow-primary is a text-shadow color, not text "shadow-primary".
export const COLOR_PREFIX =
  /^(?:text-shadow|inset-shadow|inset-ring|drop-shadow|scrollbar-(?:thumb|track)|ring-offset|border(?:-[trblxyse]|-[bi][se])?|divide(?:-[xy])?|mask-(?:linear|radial|conic|[trblxy])-(?:from|to)|bg|text|ring|outline|fill|stroke|from|via|to|accent|caret|decoration|placeholder|shadow)-/

// Where a color utility looks its value up. Tailwind tries the
// utility's own theme namespace before --color-*, so
// --background-color-surface makes bg-surface and nothing else: a token
// declared there belongs to that utility, not to the whole palette.
// From each utility's themeKeys in Tailwind v4; border sides, divide
// and the gradient stops share their base utility's namespace.
// test/color-namespaces.test.ts checks this against the installed
// Tailwind and fails when a namespace is added or renamed.
const COLOR_NAMESPACES: Record<string, readonly string[]> = {
  bg: ["background-color"],
  from: ["background-color"],
  via: ["background-color"],
  to: ["background-color"],
  text: ["text-color"],
  border: ["border-color"],
  // divide-* reads its own namespace first, then the border's.
  divide: ["divide-color", "border-color"],
  outline: ["outline-color"],
  ring: ["ring-color"],
  "inset-ring": ["ring-color"],
  "ring-offset": ["ring-offset-color"],
  shadow: ["box-shadow-color"],
  "inset-shadow": ["box-shadow-color"],
  "text-shadow": ["text-shadow-color"],
  "drop-shadow": ["drop-shadow-color"],
  accent: ["accent-color"],
  caret: ["caret-color"],
  placeholder: ["placeholder-color"],
  decoration: ["text-decoration-color"],
  // fill, stroke and the scrollbar utilities read --color-* alone.
}

// Every scoped namespace, longest first, so reading a theme matches
// the longest name: --text-decoration-color-x is not --text-color.
export const COLOR_NAMESPACE_NAMES: readonly string[] = [
  ...new Set(Object.values(COLOR_NAMESPACES).flat()),
].sort((a, b) => b.length - a.length)

// "border-t-" and "border-" read one namespace; a mask stop reads the
// background's. Empty when the utility has no namespace of its own.
export function colorNamespacesOf(prefix: string): readonly string[] {
  const name = prefix.endsWith("-") ? prefix.slice(0, -1) : prefix
  if (name.startsWith("mask-")) return COLOR_NAMESPACES.bg
  const base = name.replace(/^(border|divide)-.+$/, "$1")
  return COLOR_NAMESPACES[base] ?? []
}

const PALETTE = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "mauve",
  "olive",
  "mist",
  "taupe",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]

export const OPACITY_MODIFIER = /\/(?:[\w.%]+|\[[^\]]*\]|\([^)]*\))$/

const PALETTE_RE = new RegExp(
  `${COLOR_PREFIX.source}(?:${PALETTE.join("|")})-\\d{2,3}(?:${OPACITY_MODIFIER.source})?$`
)

export function isPaletteClass(token: string) {
  return PALETTE_RE.test(normalizeClass(token))
}

// hover:!bg-zinc-100 with "bg-muted" is hover:!bg-muted.
export function withBase(token: string, base: string) {
  const { variants, base: original } = splitVariants(token)
  const leadingBang = original.startsWith("!") ? "!" : ""
  const trailingBang = !leadingBang && original.endsWith("!") ? "!" : ""
  const stripped = original.replace(/^!/, "").replace(/!$/, "")
  const negative = stripped.startsWith("-") ? "-" : ""
  const prefix = variants.length ? `${variants.join(":")}:` : ""
  return `${prefix}${leadingBang}${negative}${base}${trailingBang}`
}

// Whole tokens only, so replacing bg-zinc-100 leaves bg-zinc-1000 alone.
export function replaceClass(
  value: string,
  token: string,
  replacement: string
) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return value.replace(
    new RegExp(`(^|\\s)${escaped}(?=\\s|$)`),
    (_, lead: string) => `${lead}${replacement}`
  )
}
