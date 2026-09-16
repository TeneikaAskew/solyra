/**
 * Invariants for scripts/docs-audit.mjs.
 *
 * Each test names the defect it prevents. Every one was mutation-checked: the
 * defect was reintroduced, the test confirmed red, then reverted. The Python
 * twin in the stocks repo (tests/scripts/test_docs_audit.py) covers the same
 * ground; where a test exists in both, the wording is deliberately the same so
 * a divergence between the two implementations is visible in the diff.
 */
import { describe, expect, it } from 'vitest';
import {
  cell,
  checkClaims,
  checkRegions,
  classify,
  derive,
  docLines,
  findMarker,
  h1Index,
  legacyTailIsBare,
  loadClaims,
  loadRegistry,
  ownedLines,
  regionOf,
  renderMarker,
  splitRow,
  stamp,
  unownedSpans,
} from './docs-audit.mjs';

// ── registry parsing ────────────────────────────────────────────────────────

const REGISTRY = `
# Documentation registry

Prose above the registry, including a table that also starts rows with a class
letter:

| Class | Meaning | What the audit does |
|---|---|---|
| **A** | **Machine-owned.** A job regenerates it. | Routes the fix. |
| **C** | **Dated record.** True on its date. | Never rewritten. |

## Registry

| Class | Path glob | Declared code paths | Generated regions |
|---|---|---|---|
| A | AGENTS.md | | fence:LOVABLE |
| C | docs/archive/* | | |
| D | CLAUDE.md | src/lib, vite.config.ts | |
| D | docs/*.md | src/routes | |
`;

describe('registry', () => {
  it('keeps a trailing glob star through cell cleaning', () => {
    // `.strip('`* ')` turns `docs/archive/*` into `docs/archive/`, which then
    // matches nothing. In the stocks repo that silently dropped 182 documents
    // into "unclassified" — a tool reporting a clean tree it never read.
    const rows = loadRegistry(REGISTRY);
    expect(rows.find((r) => r.cls === 'C').glob).toBe('docs/archive/*');
    expect(classify('docs/archive/old.md', rows).cls).toBe('C');
  });

  it('ignores prose tables above the registry heading', () => {
    // The class-explainer table's rows also start with A/B/C/D, so an ungated
    // parser registers English sentences as path globs.
    const rows = loadRegistry(REGISTRY);
    expect(rows.every((r) => !r.glob.includes('Machine-owned'))).toBe(true);
    expect(rows).toHaveLength(4);
  });

  it('lets the most specific glob win', () => {
    const rows = loadRegistry(`${REGISTRY}| D | docs/UI-SCREENS.md | src/components |\n`);
    expect(classify('docs/UI-SCREENS.md', rows).codePaths).toEqual(['src/components']);
    expect(classify('docs/OTHER.md', rows).codePaths).toEqual(['src/routes']);
  });

  it('splits code paths on commas and regions on semicolons', () => {
    // Regions cannot reuse the comma: `gcp/a.sh, gcp/b.sql` must stay two
    // paths on a row whose region cell is `inventory:*; prose:p.md`.
    const rows = loadRegistry(
      `${REGISTRY}| A | X.md | src/lib, vite.config.ts | inventory:*; prose:p.md |\n`,
    );
    const { codePaths, regions } = classify('X.md', rows);
    expect(codePaths).toEqual(['src/lib', 'vite.config.ts']);
    expect(regions).toEqual(['inventory:*', 'prose:p.md']);
  });

  it('parses a three-column row without a region cell', () => {
    // The fourth column is additive. Indexing cells[3] unconditionally turns
    // every pre-existing row into an error, i.e. a tool that reports zero
    // documents rather than a tool that fails.
    expect(classify('CLAUDE.md', loadRegistry(REGISTRY)).regions).toEqual([]);
  });

  it('honours a backslash-escaped pipe inside a cell', () => {
    // Markdown requires a literal `|` in a table be written `\\|`. A claim
    // derivation needing alternation is the only place this arises, and
    // splitting on the raw pipe truncated the pattern into a `git grep` with
    // a trailing backslash — which fails loudly, but only at run time.
    expect(splitRow('| a | b\\|c | d |')).toEqual([' a ', ' b\\|c ', ' d ']);
    expect(cell('Rule 3\\.7\\|§3\\.7')).toBe('Rule 3\\.7|§3\\.7');
  });
});

// ── generated regions (Class A) ─────────────────────────────────────────────

const INVENTORY_DOC = `# Title

Prose the refresh never touches.

<!-- inventory:jobs:start -->
| job | schedule |
|---|---|
<!-- inventory:jobs:end -->

Closing prose.
`;

const FENCED_DOC = '<!-- LOVABLE:BEGIN -->\n> generated\n<!-- LOVABLE:END -->\n';

describe('generated regions', () => {
  it('owns the inventory blocks and not the prose around them', () => {
    // The whole point: a Class A file is mixed, not uniformly machine-owned.
    // In stocks, 05-e-API.md is 160 lines of which 130 are inventory blocks;
    // treating the file as owned hid the other 30 from every audit while no
    // job wrote them.
    const { owned, unmatched, prompt } = ownedLines(INVENTORY_DOC, ['inventory:*']);
    expect(unmatched).toEqual([]);
    expect(prompt).toBeNull();
    expect([...owned].sort((a, b) => a - b)).toEqual([5, 6, 7, 8]);
    expect(unownedSpans(INVENTORY_DOC, owned)).toEqual([[1, 4], [9, 10]]);
  });

  it('reports a declared region that matches nothing', () => {
    // A renderer that stops emitting its block leaves the registry claiming a
    // coverage that no longer exists — the same silent rot this module is
    // about, one level up.
    const { findings } = checkRegions('d.md', INVENTORY_DOC, ['inventory:*', 'mark:gone']);
    expect(findings.some((f) => f.severity === 'P1' && f.detail.includes('matched nothing')))
      .toBe(true);
  });

  it('treats a Class A doc with no declared regions as a finding, not a free pass', () => {
    // An empty region cell must not read as "the whole file is generated".
    // That is the Rule 4 shape: absent information becoming a permissive
    // default nobody can distinguish from a deliberate one.
    const { findings, owned, prompt } = checkRegions('d.md', INVENTORY_DOC, []);
    expect(owned.size).toBe(0);
    expect(prompt).toBeNull();
    expect(findings[0].detail).toContain('no generated regions declared');
  });

  it('lets a prose: spec claim the remainder so nothing reads as unowned', () => {
    const { findings, owned, prompt } = checkRegions(
      '05-a.md', INVENTORY_DOC, ['inventory:*', 'prose:.github/prompts/architecture.md'],
    );
    expect(prompt).toBe('.github/prompts/architecture.md');
    expect(findings.filter((f) => f.detail.includes('no generated region'))).toEqual([]);
    expect(regionOf(1, owned, prompt)).toBe('model-prose');
    expect(regionOf(5, owned, prompt)).toBe('generated');
  });

  it('routes an unowned line to the document itself', () => {
    const { owned, prompt } = checkRegions('05-e.md', INVENTORY_DOC, ['inventory:*']);
    expect(regionOf(1, owned, prompt)).toBe('unowned');
    expect(regionOf(6, owned, prompt)).toBe('generated');
  });

  it('treats the whole Lovable fence as owned and AGENTS.md as fully covered', () => {
    const { findings, owned } = checkRegions('AGENTS.md', FENCED_DOC, ['fence:LOVABLE']);
    expect(owned.size).toBe(3);
    expect(findings).toEqual([]);
  });

  it('flags a line added outside the Lovable fence', () => {
    // Lovable rewrites the fence. A paragraph added below it is destroyed on
    // the next regeneration with nobody able to say which one it was, so the
    // audit has to see it before that happens.
    const tampered = `${FENCED_DOC}\nA hand-written note that will not survive.\n`;
    const { findings } = checkRegions('AGENTS.md', tampered, ['fence:LOVABLE']);
    expect(findings.some((f) => f.detail.includes('no generated region'))).toBe(true);
  });

  it('owns individual lines for a line: spec', () => {
    // README's badges are scattered lines, not a block.
    const doc = '# T\n\n![a](https://img.shields.io/badge/x-blue)\n\nProse.\n';
    const { owned, unmatched } = ownedLines(doc, ['line:img\\.shields\\.io']);
    expect([...owned]).toEqual([3]);
    expect(unmatched).toEqual([]);
  });

  it('owns only the marked table for a mark: spec', () => {
    const doc = '# T\n\nProse.\n<!-- BEGIN tbl -->\n| a |\n<!-- END tbl -->\nMore prose.\n';
    const { owned } = ownedLines(doc, ['mark:tbl']);
    expect([...owned].sort((a, b) => a - b)).toEqual([4, 5, 6]);
  });

  it('does not invent a line from a trailing newline', () => {
    // `split('\n')` on a newline-terminated file yields a phantom final ''.
    // Counting it reported README as 65 lines and INVESTMENT_MODELS_SUMMARY as
    // 1,248 — one more than either file has, which makes every number the
    // audit prints untrustworthy.
    expect(docLines('a\nb\n')).toHaveLength(2);
    expect(docLines('a\nb')).toHaveLength(2);
  });

  it('does not report a blank-only gap between generated blocks as prose', () => {
    const doc = '<!-- inventory:a:start -->\nx\n<!-- inventory:a:end -->\n\n'
      + '<!-- inventory:b:start -->\ny\n<!-- inventory:b:end -->\n';
    const { owned } = ownedLines(doc, ['inventory:*']);
    expect(unownedSpans(doc, owned)).toEqual([]);
  });
});

// ── count claims ────────────────────────────────────────────────────────────

describe('count claims', () => {
  const CLAIMS = `
## Claims

| Doc | Pattern | Derivation |
|---|---|---|
| CLAUDE.md | ~(\\d+) bare relative | grep-count src fetch\\(\\s*['"\`]/api/ |
`;

  it('parses only the rows under the Claims heading', () => {
    const rows = loadClaims(`${REGISTRY}${CLAIMS}`);
    expect(rows).toHaveLength(1);
    expect(rows[0].doc).toBe('CLAUDE.md');
  });

  it('takes a comma-separated pathspec so the pattern may contain spaces', () => {
    // Splitting on the first space alone folded `src tests <pattern>` into a
    // search for "tests <pattern>" under `src`: a check that ran, returned a
    // number, and measured the wrong thing. It reported 8 where the answer
    // was 37, and nothing about the output said so.
    expect(derive('grep-files src,tests Rule 3\\.7|§3\\.7')).toBe(37);
  });

  it('rejects a derivation with no pattern rather than grepping for nothing', () => {
    expect(() => derive('grep-files src')).toThrow(/no pattern/);
  });

  it('reports a claim pattern that no longer matches as inert, not as passing', () => {
    // A claim whose prose was reworded silently stops being checked. Treating
    // "no match" as "no problem" is how a count check dies quietly.
    const findings = checkClaims([
      { doc: 'CLAUDE.md', pattern: 'this text is not in the file \\((\\d+)\\)',
        derivation: 'grep-files src fetch\\(' },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].detail).toContain('matched nothing');
  });

  it('is quiet when the claim matches the derivation', () => {
    // CLAUDE.md's "37 files ... reference Rule 3.7" is correct today. A check
    // that flags everything is as useless as one that flags nothing, so one
    // true row has to stay silent.
    expect(checkClaims([
      { doc: 'CLAUDE.md', pattern: '(\\d+) files under `src/` and',
        derivation: 'grep-files src,tests Rule 3\\.7|§3\\.7' },
    ])).toEqual([]);
  });
});

// ── markers ─────────────────────────────────────────────────────────────────

describe('markers', () => {
  it('round-trips through the parser', () => {
    const line = renderMarker('2026-09-16', 'verified', 'aa60569', '2026-09-16', 'TBD');
    const parsed = findMarker(['# T', '', line]);
    expect(parsed.date).toBe('2026-09-16');
    expect(parsed.sha).toBe('aa60569');
  });

  it('never overwrites an existing review date with a scan', () => {
    // Collapsing "reviewed" and "scanned" into one date lets a weekly script
    // overwrite a human's review with its own automated pass — CLAUDE.md's
    // "a doc is a claim, not evidence" wearing a freshness badge.
    const before = `# T\n\n${renderMarker('2026-08-31', null, null, '2026-09-01', 'TBD')}\n`;
    const { text } = stamp(before, '2026-09-16', 'scanned', 'abc1234', false);
    expect(text).toContain('**Last reviewed:** 2026-08-31');
    expect(text).toContain('**Last scanned:** 2026-09-16');
  });

  it('says unknown, not today, for a doc nobody has reviewed', () => {
    const { text } = stamp('# T\n\nBody.\n', '2026-09-16', 'scanned', 'abc1234', false);
    expect(text).toContain('**Last reviewed:** unknown');
    expect(text).not.toContain('**Last reviewed:** 2026-09-16');
  });

  it('moves the review date only on a real review', () => {
    const before = `# T\n\n${renderMarker('2026-08-31', null, null, '2026-09-01', 'TBD')}\n`;
    const { text } = stamp(before, '2026-09-16', 'verified', 'abc1234', true);
    expect(text).toContain('**Last reviewed:** 2026-09-16');
    expect(text).toContain('**Depth:** verified');
  });

  it('places the marker after the H1, not at a fixed line', () => {
    // Seven living docs here open with an HTML comment and carry their H1 on
    // line 9; a literal line-3 insert writes the marker inside the comment.
    const doc = '<!--\n  A note.\n-->\n\n# Title\n\nBody.\n';
    const { text } = stamp(doc, '2026-09-16', 'scanned', 'abc1234', false);
    const lines = text.split('\n');
    expect(h1Index(lines)).toBe(4);
    expect(lines[6]).toContain('**Last reviewed:**');
    expect(lines.slice(0, 4).join('\n')).toBe('<!--\n  A note.\n-->\n');
  });

  it('skips a doc with no H1 rather than guessing a position', () => {
    const { action } = stamp('Just prose, no heading.\n', '2026-09-16', 'scanned', 'abc1234');
    expect(action).toBe('skipped-no-h1');
  });

  it('never rewrites a legacy line that carries content', () => {
    // 05-j in stocks carries ~900 characters of deployment detail after its
    // `**Last Updated**:`. Normalising it deletes a paragraph and reads in the
    // diff as a tidy one-line change.
    expect(legacyTailIsBare('')).toBe(true);
    expect(legacyTailIsBare('.')).toBe(true);
    expect(legacyTailIsBare(` ${'·'} **Owner:** TBD`)).toBe(true);
    expect(legacyTailIsBare(' — deployed to staging, see #12 for the rollout')).toBe(false);
  });

  it('keeps unrecognised fields on a marker line through a restamp', () => {
    const before = `# T\n\n**Last reviewed:** 2026-08-31 · **Trust status:** partial · **Owner:** TBD\n`;
    const { text } = stamp(before, '2026-09-16', 'scanned', 'abc1234', false);
    expect(text).toContain('**Trust status:** partial');
    expect(text).toContain('**Last scanned:** 2026-09-16');
  });

  it('touches only the marker line', () => {
    const before = `# T\n\n${renderMarker('2026-08-31', null, null, '2026-09-01', 'TBD')}\n\nBody stays.\n`;
    const { text } = stamp(before, '2026-09-16', 'scanned', 'abc1234', false);
    expect(text.split('\n').filter((l) => !l.includes('Last scanned'))).toEqual(
      before.split('\n').filter((l) => !l.includes('Last scanned')),
    );
  });
});
