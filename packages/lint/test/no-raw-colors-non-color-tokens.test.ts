// cn files text-* and shadow-* under color, so a font size, a shadow
// token or a custom utility reaches this rule looking like a color
// name. Tailwind generates CSS for all three, which settles it: they
// are declared, just not as colors.

import * as path from "node:path"
import { describe, test } from "vitest"

import { noRawColors } from "../src/rules/no-raw-colors"
import { oracleAvailable } from "../src/tailwind/client"
import { createTester, PROJECT } from "./helpers"

const PAGE = path.join(path.dirname(PROJECT), "non-color-theme/app/page.tsx")

describe.skipIf(!oracleAvailable())("names declared outside --color-*", () => {
  test("a font size, a shadow and an @utility are not undeclared colors", () => {
    createTester().run("no-raw-colors", noRawColors as any, {
      valid: [
        {
          filename: PAGE,
          code: `export const A = () => <p className="text-h1" />`,
        },
        {
          filename: PAGE,
          code: `export const A = () => <p className="shadow-card" />`,
        },
        {
          filename: PAGE,
          code: `export const A = () => <p className="text-lead" />`,
        },
        {
          filename: PAGE,
          code: `export const A = () => <p className="text-primary" />`,
        },
      ],
      invalid: [
        // Nothing declares it, under any namespace.
        {
          filename: PAGE,
          code: `export const A = () => <p className="bg-nosuchthing" />`,
          errors: [
            {
              messageId: "undeclaredToken",
              data: {
                className: "bg-nosuchthing",
                tokens: "primary",
                file: "test/fixtures/non-color-theme/app/globals.css",
              },
            },
          ],
        },
      ],
    })
  })
})
