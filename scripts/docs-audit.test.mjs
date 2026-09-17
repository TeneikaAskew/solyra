/**
 * Invariants for scripts/docs-audit.mjs.
 *
 * Each test names the defect it prevents. Every one was mutation-checked: the
 * defect was reintroduced, the test confirmed red, then reverted. The Python
 * twin in the stocks repo (tests/scripts/test_docs_audit.py) covers the same
 * ground; where a test exists in both, the wording is deliberately the same so
 * a divergence between the two implementations is visible in the diff.
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  cell,
  checkClaims,
  checkChangedSince,
  checkDeadLinks,
  checkRegions,
  classify,
  derive,
  docLines,
  findMarker,
  h1Index,
  documentSet,
  extraSegments,
  legacyTailIsBare,
  markerWindow,
  parseArgs,
  resolveBaseRef,
  run,
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
    const { findings, owned } = checkRegions('AGENTS.md', FENCED_DOC, ['fence:LOVABLE', 'exhaustive']);
    expect(owned.size).toBe(3);
    expect(findings).toEqual([]);
  });

  it('reports the mixed-doc complement as a map, not as defects', () => {
    // A mixed Class A doc's hand-written prose is its expected shape. Emitting
    // a finding per span gives it permanent findings no review can clear, so
    // --check can never go green and the gate is worthless.
    const { findings, regionMap } = checkRegions('05-e.md', INVENTORY_DOC, ['inventory:*']);
    expect(findings).toEqual([]);
    expect(regionMap.unowned_spans).toEqual([[1, 4], [9, 10]]);
    expect(regionMap.unowned_lines).toBe(6);
  });

  it('reports an unbalanced block even when another pair is valid', () => {
    const doc = '<!-- inventory:a:start -->\nx\n<!-- inventory:a:end -->\n'
      + '<!-- inventory:b:start -->\ny\n';
    const { orphans } = ownedLines(doc, ['inventory:*']);
    expect(orphans).toEqual(['inventory:b starts at line 4 with no end']);
  });

  it('flags a line added outside the Lovable fence', () => {
    // Lovable rewrites the fence. A paragraph added below it is destroyed on
    // the next regeneration with nobody able to say which one it was, so the
    // audit has to see it before that happens.
    const tampered = `${FENCED_DOC}\nA hand-written note that will not survive.\n`;
    const { findings } = checkRegions('AGENTS.md', tampered, ['fence:LOVABLE', 'exhaustive']);
    expect(findings.some((f) => f.severity === 'P1' && f.detail.includes('wholly'))).toBe(true);
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

// ── drift ───────────────────────────────────────────────────────────────────

describe('checkChangedSince', () => {
  it('asks git for additions and deletions, not just edits', () => {
    // A commit that only adds a route under src/routes, or removes a
    // documented component, is drift. `--diff-filter=M` excluded both, so the
    // describing document kept looking current. Renames stay excluded — that
    // is what the filter is for.
    let seen;
    checkChangedSince('d.md', 'abc1234', ['src/routes'], 'origin/main', {
      exec: (_c, args) => { seen = args; return ''; },
    });
    expect(seen).toContain('--diff-filter=AMD');
    expect(seen).toContain('abc1234..origin/main');
  });

  it('uses the resolved base ref rather than a hard-coded origin/main', () => {
    let seen;
    checkChangedSince('d.md', 'abc1234', ['src'], 'HEAD', {
      exec: (_c, args) => { seen = args; return ''; },
    });
    expect(seen).toContain('abc1234..HEAD');
  });

  it('reports nothing when the range is empty', () => {
    expect(checkChangedSince('d.md', 'abc1234', ['src'], 'HEAD', { exec: () => '' })).toEqual([]);
  });

  it('reports the commit count when the declared paths moved', () => {
    const out = checkChangedSince('d.md', 'abc1234', ['src'], 'HEAD',
      { exec: () => 'aaa one\nbbb two\n' });
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('2 content commit(s)');
  });
});

// ── the CLI contract ────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('rejects an unknown option instead of ignoring it', () => {
    // `--chek` left args.check false, so the audit printed its findings and
    // exited 0 — a typo in a CI invocation turned the gate off silently.
    expect(() => parseArgs(['--chek'])).toThrow(/unknown option/);
  });

  it('rejects a value flag with no value', () => {
    expect(() => parseArgs(['--since'])).toThrow(/needs a value/);
    expect(() => parseArgs(['--since', '--json'])).toThrow(/needs a value/);
  });

  it('parses the documented options', () => {
    const a = parseArgs(['--json', '--check', '--since', 'abc1234', '--verify', 'a.md', 'b.md']);
    expect(a).toMatchObject({ json: true, check: true, since: 'abc1234', verify: ['a.md', 'b.md'] });
  });

  it('has a contract-check opt-out that is not the issues-snapshot flag', () => {
    // Coupling them meant an offline issue-state run reported Class A clean no
    // matter how stale the vendored OpenAPI snapshot was.
    expect(parseArgs(['--issues-snapshot', 'f.json']).contractCheck).toBeUndefined();
    expect(parseArgs(['--no-contract-check']).contractCheck).toBe(false);
  });
});

// ── the base ref ────────────────────────────────────────────────────────────

describe('resolveBaseRef', () => {
  it('falls back when origin/main is absent', () => {
    expect(resolveBaseRef(['definitely-not-a-ref', 'HEAD'])).toBe('HEAD');
  });

  it('throws rather than guessing when nothing resolves', () => {
    expect(() => resolveBaseRef(['no-such-a', 'no-such-b'])).toThrow(/nothing to audit against/);
  });
});

// ── the document set ────────────────────────────────────────────────────────

describe('documentSet', () => {
  it('includes a registered non-markdown artifact and excludes glob members', () => {
    const rows = loadRegistry(`${REGISTRY}| D | Frontend.drawio | src/routes | |\n`);
    const docs = documentSet(
      new Set(['README.md', 'Frontend.drawio', 'docs/archive/x.png', 'src/app.ts']), rows,
    );
    expect(docs).toContain('Frontend.drawio');
    expect(docs).toContain('README.md');
    expect(docs).not.toContain('docs/archive/x.png');
    expect(docs).not.toContain('src/app.ts');
  });
});

// ── dead links ──────────────────────────────────────────────────────────────

describe('checkDeadLinks', () => {
  const tracked = new Set(['vite.config.ts', 'src/app.ts']);
  const roots = new Set(['vite.config', 'package']);

  it('flags a root-level backticked file that no longer exists', () => {
    // Requiring a slash meant `vite.config.ts` and `package.json` — cited
    // constantly in the living docs — could never produce a dead-path finding.
    const out = checkDeadLinks('d.md', 'See `package.json` for the scripts.\n',
      tracked, new Set(['src']), roots);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('package.json');
  });

  it('does not flag a root file that is still tracked', () => {
    expect(checkDeadLinks('d.md', 'See `vite.config.ts`.\n', tracked, new Set(['src']), roots))
      .toEqual([]);
  });

  it('does not flag a bare name with no tracked sibling of that stem', () => {
    // Prose naming some other project's file is not this repo's to resolve.
    expect(checkDeadLinks('d.md', 'Their `webpack.config.js` differs.\n',
      tracked, new Set(['src']), roots)).toEqual([]);
  });
});

// ── marker segments ─────────────────────────────────────────────────────────

describe('extraSegments', () => {
  it('keeps a caveat riding a recognised field', () => {
    // Dropping any segment that merely STARTS with an owned field also deleted
    // the prose on it, which is what legacyTailIsBare refuses to do for legacy
    // lines. A restamp silently lost the caveat.
    const segs = extraSegments('**Last reviewed:** 2026-08-31 — deployment only');
    expect(segs).toEqual(['— deployment only']);
  });

  it('drops a bare recognised field entirely', () => {
    expect(extraSegments('**Last reviewed:** 2026-08-31')).toEqual([]);
  });

  it('keeps an unrecognised field whole', () => {
    expect(extraSegments('**Trust status:** partial')).toEqual(['**Trust status:** partial']);
  });
});

// ── the marker window ───────────────────────────────────────────────────────

describe('markerWindow', () => {
  it('finds a marker past line 40 when the front matter is long', () => {
    // stamp() inserts after the H1 wherever that is; a flat 40-line search
    // could not find its own marker, so the next run called it missing and
    // inserted a duplicate.
    const pre = Array.from({ length: 45 }, (_, i) => `<!-- filler ${i} -->`).join('\n');
    const doc = `${pre}\n\n# Title\n\n**Last reviewed:** 2026-08-31 · **Owner:** TBD\n`;
    const found = findMarker(doc.split('\n'));
    expect(found).not.toBeNull();
    expect(found.date).toBe('2026-08-31');
  });

  it('does not accept a later section\'s metadata as the document marker', () => {
    const doc = '# Doc\n\nIntro.\n\n# PART A\n\n**Last reviewed:** 2026-06-05 · **Owner:** TBD\n';
    expect(findMarker(doc.split('\n'))).toBeNull();
    expect(markerWindow(doc.split('\n'))).toEqual({ from: 1, to: 4 });
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
    let seen;
    derive('grep-files src,tests Rule 3\\.7|§3\\.7', {
      exec: (_cmd, args) => { seen = args; return 'a\nb\nc\n'; },
    });
    expect(seen.slice(-2)).toEqual(['src', 'tests']);
    expect(seen).toContain('Rule 3\\.7|§3\\.7');
  });

  it('rejects a derivation with no pattern rather than grepping for nothing', () => {
    expect(() => derive('grep-files src')).toThrow(/no pattern/);
  });

  it('counts an exit-1 grep as a real zero', () => {
    // `git grep` exits 1 when it ran fine and matched nothing. That IS the
    // answer, so it must not abort.
    expect(derive('grep-files src nothing-matches-this', {
      exec: () => '',
    })).toBe(0);
  });

  it('throws rather than returning 0 when the underlying command cannot run', () => {
    // The bug this file exists to prevent, and the one that turned solyra#69
    // red. actions/checkout does a shallow single-branch clone, so origin/main
    // is not a ref in CI and `git grep ... origin/main` exits 128. The old
    // code swallowed every non-zero exit alike and reported 0 matches, so the
    // audit would have said "CLAUDE.md claims 37, the tree has 0" and sent
    // someone to correct a document that was already right. A read that could
    // not happen is never a measurement (Rule 4).
    expect(() => derive('grep-files src,tests Rule 3\\.7', {
      exec: (_cmd, args, opts) => {
        const err = new Error('fatal: unable to resolve revision: origin/main');
        err.status = 128;
        if (opts?.okExitCodes?.includes(128)) return '';
        throw err;
      },
    })).toThrow(/128|unable to resolve/);
  });

  it('reports a claim pattern that no longer matches as inert, not as passing', () => {
    // A claim whose prose was reworded silently stops being checked. Treating
    // "no match" as "no problem" is how a count check dies quietly.
    const findings = checkClaims([
      { doc: 'CLAUDE.md', pattern: 'this text is not in the file \\((\\d+)\\)',
        derivation: 'grep-files src fetch\\(' },
    ], { exec: () => 'x\n' });
    expect(findings).toHaveLength(1);
    expect(findings[0].detail).toContain('matched nothing');
  });

  it('is quiet when the claim matches the derivation', () => {
    // A check that flags everything is as useless as one that flags nothing,
    // so a row whose claim is true has to stay silent.
    expect(checkClaims([
      { doc: 'CLAUDE.md', pattern: '(\\d+) files under `src/` and',
        derivation: 'grep-files src,tests Rule 3\\.7|§3\\.7' },
    ], { exec: () => 'f\n'.repeat(37) })).toEqual([]);
  });

  it('flags a claim the derivation contradicts', () => {
    const findings = checkClaims([
      { doc: 'CLAUDE.md', pattern: '(\\d+) files under `src/` and',
        derivation: 'grep-files src,tests Rule 3\\.7|§3\\.7' },
    ], { exec: () => 'f\n'.repeat(11) });
    expect(findings).toHaveLength(1);
    expect(findings[0].detail).toBe(
      'claims 37, `grep-files src,tests Rule 3\\.7|§3\\.7` gives 11');
  });
});

// The one assertion that must touch the real tree: that CLAUDE.md's "37 files
// reference Rule 3.7" is still true. It needs `origin/main`, which a shallow
// CI clone does not have — so it is skipped there, loudly, rather than
// silently measuring nothing. A skipped test says so in the output.
const hasOriginMain = (() => {
  try {
    execFileSync('git', ['rev-parse', '--verify', 'origin/main'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasOriginMain)('count claims against the real tree', () => {
  it('confirms the one CLAUDE.md count that is currently correct', () => {
    expect(derive('grep-files src,tests Rule 3\\.7|§3\\.7')).toBe(37);
  });
});

// ── run(): the exit code IS the answer ──────────────────────────────────────

describe('run', () => {
  it('returns empty for a tolerated non-zero exit', () => {
    // `git grep` exits 1 for "ran fine, matched nothing". That is a result.
    // HEAD always resolves, so this is hermetic in a shallow clone too.
    expect(run('git', ['grep', '-lE', 'zzz-no-such-string-zzz', 'HEAD', '--', 'package.json'],
      { okExitCodes: [1] })).toBe('');
  });

  it('throws for an exit code the caller did not tolerate', () => {
    // `git grep` exits 128 for "unable to resolve revision", which is not a
    // result. The old boolean allowFail collapsed 1 and 128 into the same ''
    // and every caller read that as zero matches. This test drives the real
    // implementation rather than a stub, because the defect was IN run().
    expect(() => run('git', ['grep', '-lE', 'x', 'no-such-ref-zzz', '--', 'package.json'],
      { okExitCodes: [1] })).toThrow(/128/);
  });

  it('throws on any failure when no exit code is tolerated', () => {
    expect(() => run('git', ['grep', '-lE', 'zzz-no-such-string-zzz', 'HEAD', '--', 'package.json']))
      .toThrow(/exited 1/);
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
