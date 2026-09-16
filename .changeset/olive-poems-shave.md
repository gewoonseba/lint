---
"@shadcn/lint": patch
---

`no-raw-colors` reads the theme's scoped color namespaces. Tailwind
looks in a utility's own namespace before `--color-*`, so
`--background-color-surface` makes `bg-surface` and nothing else. Those
tokens were invisible to the rule: every semantic utility in a theme
that declares its colors that way was reported as undeclared, and the
suggestions offered the raw palette the theme meant to hide.

Each utility is now judged against the namespaces it actually reads, so
`bg-surface` passes while `text-surface` is still reported — Tailwind
generates no CSS for it. Resets are scoped too, and suggestions come
from the namespaces the utility reads.

A name is now only reported as undeclared when the project's Tailwind
generates no CSS for it. A namespace this version does not know, a
`--text-*` font size, a `--shadow-*` token or a custom `@utility` costs
a less specific message rather than a wrong finding.
