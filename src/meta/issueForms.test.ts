/**
 * The issue forms in .github/ISSUE_TEMPLATE/ stay valid and stay in budget.
 *
 * Added 2026-09-07, on review round 23 of #59, after the same check ran by
 * hand in the paired stocks PR, reported "0 problems", and then went stale.
 * Over there a later round moved a date request out of a field's `label` into
 * its `description`, adding 46 characters to a field sitting at 198 of a 200
 * cap. Nobody re-ran the validator, so the PR carried a quoted "0 problems"
 * that had been true of an earlier version of the file.
 *
 * This repo was one character from the identical failure: when that was found,
 * `02-dead-surface.yml` / `importer-evidence` measured 199 and
 * `04-follow-up.yml` / `evidence` measured 198. Both were shortened, but
 * headroom is not a mechanism — a hand-run check is only as good as the last
 * time somebody remembered to run it. This runs in `npm test`, so an
 * over-budget edit fails CI instead of shipping a form GitHub refuses to
 * render, and the mirror of it lives at `tests/meta/test_issue_forms.py` in
 * stocks.
 *
 * On the numeric caps: they are applied on ASYMMETRIC COST, NOT ON EVIDENCE.
 * None appears in json.schemastore.org/github-issue-forms.json (which declares
 * `body` as minItems: 1 with no maxItems, and no maxLength on `description` or
 * `label`), nor in GitHub's syntax docs, its common-validation-errors page, or
 * its template-chooser page. Four sources came back empty. If the caps are
 * real, an over-limit file is silently invisible in the issue chooser; if they
 * are not, shorter fields are better design either way. Do not read these
 * numbers as sourced limits, and do not raise one to make a field fit.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.resolve(HERE, '../../.github/ISSUE_TEMPLATE')

// Unsourced; read the file header before changing any of these.
const MAX_DESCRIPTION = 200
const MAX_LABEL = 50
const MAX_BODY_ELEMENTS = 10
const MAX_CONTACT_NAME = 30
const MAX_CONTACT_ABOUT = 200
// A checkbox OPTION label is not an element label and is not bound by the 50
// above — these are full sentences. 160 is the figure Codex reported; like every
// other number here it is unsourced and applied on asymmetric cost. When it was
// added, two options across the two repos sat at 160 and 159 with no headroom at
// all, which is the exact condition that produced the 244-character description
// this file exists to prevent. Both were shortened; the longest is now 151.
const MAX_OPTION_LABEL = 160

// github-issue-forms.json's permitted element types.
const ELEMENT_TYPES = ['markdown', 'textarea', 'input', 'dropdown', 'checkboxes'] as const
// Everything except markdown carries a user-visible label and needs an id to
// be addressable; markdown is display only.
const NEEDS_ID_AND_LABEL = ELEMENT_TYPES.filter((t) => t !== 'markdown')

type Element = {
  type?: string
  id?: string
  attributes?: {
    label?: string
    description?: string
    options?: { label?: string; required?: boolean }[]
  }
}
type Form = { name?: string; description?: string; body?: Element[] }

const formFiles = readdirSync(TEMPLATE_DIR)
  .filter((f) => f.endsWith('.yml') && f !== 'config.yml')
  .sort()

const read = <T,>(file: string): T =>
  load(readFileSync(path.join(TEMPLATE_DIR, file), 'utf8')) as T

describe('issue forms', () => {
  it('finds forms to check', () => {
    // Guard the guard: a glob matching nothing passes every test below.
    expect(formFiles.length).toBeGreaterThan(0)
  })

  it.each(formFiles)('%s parses and declares a body', (file) => {
    const doc = read<Form>(file)
    expect(doc.name, `${file}: missing name`).toBeTruthy()
    expect(doc.description, `${file}: missing description`).toBeTruthy()
    expect(Array.isArray(doc.body) && doc.body.length > 0).toBe(true)
  })

  it.each(formFiles)('%s body elements are well formed and within budget', (file) => {
    const body = read<Form>(file).body ?? []

    expect(
      body.length,
      `${file}: ${body.length} body elements > ${MAX_BODY_ELEMENTS}. Merge two fields rather than raising the cap.`,
    ).toBeLessThanOrEqual(MAX_BODY_ELEMENTS)

    body.forEach((el, i) => {
      const where = `${file} body[${i}]`
      expect(ELEMENT_TYPES, `${where}: unknown type ${el.type}`).toContain(el.type)

      const attrs = el.attributes ?? {}
      if (NEEDS_ID_AND_LABEL.includes(el.type as (typeof NEEDS_ID_AND_LABEL)[number])) {
        expect(el.id, `${where}: ${el.type} needs an id`).toBeTruthy()
        expect(attrs.label, `${where}: ${el.type} needs a label`).toBeTruthy()
      }

      if (attrs.label !== undefined) {
        expect(
          attrs.label.length,
          `${where} label is ${attrs.label.length} chars > ${MAX_LABEL}: ${attrs.label}`,
        ).toBeLessThanOrEqual(MAX_LABEL)
      }

      if (attrs.description !== undefined) {
        expect(
          attrs.description.length,
          `${where} (${el.id}) description is ${attrs.description.length} chars > ${MAX_DESCRIPTION}. ` +
            'Measure the FOLDED value, not the source lines — a `>-` block joins its lines with ' +
            'spaces, so the string is longer than any line of it looks.',
        ).toBeLessThanOrEqual(MAX_DESCRIPTION)
      }
    })
  })

  // An optional attestation is not an attestation. Each form ends in a
  // checkboxes element whose options are the claims the filer is making about
  // their own evidence; an option without `required: true` can be left
  // unticked and the issue still submits, which makes it decoration.
  it.each(formFiles)('%s requires every checkbox option', (file) => {
    const body = read<Form>(file).body ?? []

    // Guard the guard, as test_there_are_forms_to_check does for the glob. The
    // loop below is a no-op for a form with no checkboxes element at all, so
    // deleting a form's whole attestation used to pass CI — the body-budget
    // test stays green because the body only gets SHORTER. Measured on the
    // stocks mirror with the element removed: 14 passed.
    const boxes = body.filter((el) => el.type === 'checkboxes')
    expect(
      boxes.length,
      `${file}: no checkboxes element. Every form ends in an evidence attestation; ` +
        'a form without one collects no claim about how the evidence was produced.',
    ).toBeGreaterThan(0)

    for (const el of boxes) {
      const options = el.attributes?.options ?? []
      expect(options.length, `${file}: checkboxes ${el.id} has no options`).toBeGreaterThan(0)
      for (const opt of options) {
        expect(
          opt.required,
          `${file}: checkboxes ${el.id} option "${opt.label}" is not required: true`,
        ).toBe(true)
        const label = opt.label ?? ''
        expect(
          label.length,
          `${file}: checkboxes ${el.id} option label is ${label.length} chars > ` +
            `${MAX_OPTION_LABEL}. Measure the FOLDED value: ${label}`,
        ).toBeLessThanOrEqual(MAX_OPTION_LABEL)
      }
    }
  })

  it('config.yml contact links are within budget', () => {
    const doc = load(
      readFileSync(path.join(TEMPLATE_DIR, 'config.yml'), 'utf8'),
    ) as { contact_links?: { name: string; about: string }[] }
    for (const link of doc.contact_links ?? []) {
      expect(link.name.length).toBeLessThanOrEqual(MAX_CONTACT_NAME)
      expect(link.about.length).toBeLessThanOrEqual(MAX_CONTACT_ABOUT)
    }
  })
})
