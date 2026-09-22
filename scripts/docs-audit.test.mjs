/**
 * Invariants for scripts/docs-audit.mjs.
 *
 * Each test names the defect it prevents. Every one was mutation-checked: the
 * defect was reintroduced, the test confirmed red, then reverted. The Python
 * twin in the stocks repo (tests/scripts/test_docs_audit.py) covers the same
 * ground; where a test exists in both, the wording is deliberately the same so
 * a divergence between the two implementations is visible in the diff.
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  checkMarkerDates,
  globSpecificity,
  headingIs,
  isCodeIndented,
  indentColumns,
  commentSpans,
  isSetextUnderline,
  findMarkers,
  tagAttributeSpans,
  visibleClaimText,
  codeSpans,
  markerShapedLines,
  namedCharRefCount,
  commentedLines,
  markerAnchor,
  indentedCodeLines,
  pathInCommit,
  fencedLines,
  AuditError,
  cell,
  checkClaims,
  checkVerifyTargets,
  checkClosedIssues,
  checkChangedSince,
  checkContractSync,
  checkDeadLinks,
  hasBlockingCue,
  checkRegions,
  contentChecks,
  driftCommits,
  knownRootFiles,
  linkContext,
  loadIssuesSnapshot,
  writeIssuesSnapshot,
  symlinkedComponent,
  writeStamps,
  checkRegistryPaths,
  isTrackedDir,
  headingSlug,
  checkExitCode,
  headingAnchors,
  fetchIssueStates,
  ISSUE_PAGE_SIZE,
  classAIsStampable,
  checkProvenance,
  MARKER_SHA_LEN,
  resolveCommit,
  workingTreeFiles,
  classify,
  derive,
  docLines,
  findMarker,
  markerSection,
  rawHtmlBlockLines,
  stripEmphasis,
  isEscaped,
  codeSpanLines,
  paragraphBlocks,
  frontMatterLines,
  splitOutsideRefs,
  commentedPrefixLines,
  isMarkdownPath,
  documentSet,
  unescapeMarkdown,
  loadRegistry,
  decodeCharRefs,
  h1Index,
  extraSegments,
  ownerOf,
  legacyTailIsBare,
  markerWindow,
  parseArgs,
  resolveBaseRef,
  HISTORY_REF_CANDIDATES,
  run,
  loadClaims,
  citationClause,
  ownedLines,
  maskSpans,
  regionOf,
  renderMarker,
  splitRow,
  stamp,
  stampGuard,
  stampRecord,
  summariseStamps,
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
    expect(seen).toContain('--diff-filter=AMDRT');
    expect(seen).not.toContain('--diff-filter=M');
    expect(seen).toContain('abc1234..origin/main');
  });

  it('asks for name-status with rename detection so an edited rename is visible', () => {
    let seen;
    checkChangedSince('d.md', 'abc1234', ['src/routes'], 'origin/main', {
      exec: (_c, args) => { seen = args; return ''; },
    });
    expect(seen).toContain('--name-status');
    expect(seen).toContain('-M');
    expect(seen).toContain('--diff-filter=AMDRT');
  });

  it('counts a rename that also carried an edit, and not a pure one', () => {
    // `git show --name-status` reports a moved file with a one-line edit as
    // R089; `--diff-filter=AMD` excluded that commit entirely, so a declared
    // path could change behaviour behind a move and the doc stay current. A
    // pure rename (R100) is still not drift: that is what the filter is for.
    const out = [
      'aaa1111\tmove and edit the store', '', 'R089\tsrc/stores/a.ts\tsrc/stores/b.ts', '',
      'bbb2222\tpure move', '', 'R100\tsrc/stores/c.ts\tsrc/stores/d.ts', '',
      'ccc3333\tedit', '', 'M\tsrc/stores/e.ts', '',
    ].join('\n');
    expect(driftCommits(out).map((c) => c.split('\t')[0])).toEqual(['aaa1111', 'ccc3333']);
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
      { exec: () => 'aaa1111\tone\n\nM\tsrc/x.ts\n\nbbb2222\ttwo\n\nA\tsrc/y.ts\n' });
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('2 content commit(s)');
  });
});

// ── contract delivery (Class A) ─────────────────────────────────────────────

describe('checkContractSync', () => {
  const spawnWith = (status, stderr = '', stdout = '') => () => ({ status, stdout, stderr });

  it('is quiet when the snapshot matches', () => {
    expect(checkContractSync({ spawn: spawnWith(0, '', '[api-contract] vendored snapshot matches') }))
      .toEqual([]);
  });

  it('reports the stale result the script itself printed', () => {
    const out = checkContractSync({ spawn: spawnWith(1,
      '[api-contract] vendored snapshot is STALE against stocks. Run: npm run contract:sync\n') });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('P1');
  });

  it('reports a missing or unreadable snapshot as the stale finding too', () => {
    const out = checkContractSync({ spawn: spawnWith(1,
      '[api-contract] tests/fixtures/stocks-openapi.json is missing or unreadable — run: npm run contract:sync\n') });
    expect(out).toHaveLength(1);
  });

  it('treats a non-OK HTTP response (exit 2) as an audit error, not a stale snapshot', () => {
    expect(() => checkContractSync({ spawn: spawnWith(2, '[api-contract] HTTP 503 for https://raw...') }))
      .toThrow(/could not compare/);
  });

  it('treats a DNS failure as an audit error even though Node exits 1 for it', () => {
    // An uncaught top-level rejection exits 1 -- the SAME code the script uses
    // for "compared, and stale". The exit status alone cannot tell them apart;
    // only the script's own verdict on stderr can. Reporting `fetch failed` as
    // "run contract:sync" sends someone to resync a contract nobody compared.
    const stderr = 'TypeError: fetch failed\n    at node:internal/deps/undici/undici:13510:13\n'
      + '  [cause]: Error: getaddrinfo ENOTFOUND raw.githubusercontent.com';
    expect(() => checkContractSync({ spawn: spawnWith(1, stderr) })).toThrow(/could not compare/);
  });

  it('treats a malformed upstream body as an audit error', () => {
    const stderr = 'SyntaxError: Unexpected token < in JSON at position 0\n    at JSON.parse';
    expect(() => checkContractSync({ spawn: spawnWith(1, stderr) })).toThrow(/could not compare/);
  });

  it('treats a missing dependency as an audit error', () => {
    expect(() => checkContractSync({ spawn: spawnWith(1,
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'openapi-typescript'") }))
      .toThrow(/could not compare/);
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

  it('rejects --verify with no path, which would otherwise stamp nothing as verified', () => {
    // `--stamp --verify` with the path forgotten is a scan-only pass that the
    // operator believes recorded a review. The list option is a value option.
    expect(() => parseArgs(['--stamp', '--verify'])).toThrow(/needs a value/);
    expect(() => parseArgs(['--verify', '--stamp'])).toThrow(/needs a value/);
  });

  it('rejects a --date that is not a calendar day', () => {
    // `--stamp --date bad` wrote `bad` into every marker as Last scanned; on
    // the next run MARKER_RE stopped at the prefix, extraSegments kept the
    // malformed field as prose, and each doc ended up with two of them.
    expect(() => parseArgs(['--date', 'bad'])).toThrow(/calendar/);
    expect(() => parseArgs(['--date', '2026-02-30'])).toThrow(/calendar/);
    expect(() => parseArgs(['--date', '2026-9-1'])).toThrow(/calendar/);
    expect(parseArgs(['--date', '2026-09-18']).date).toBe('2026-09-18');
  });

  it('parses the documented options', () => {
    const a = parseArgs(['--json', '--check', '--stamp', '--since', 'abc1234', '--verify', 'a.md', 'b.md']);
    expect(a).toMatchObject({ json: true, check: true, stamp: true, since: 'abc1234', verify: ['a.md', 'b.md'] });
  });

  it('has a contract-check opt-out that is not the issues-snapshot flag', () => {
    // Coupling them meant an offline issue-state run reported Class A clean no
    // matter how stale the vendored OpenAPI snapshot was.
    expect(parseArgs(['--issues-snapshot', 'f.json']).contractCheck).toBeUndefined();
    expect(parseArgs(['--no-contract-check']).contractCheck).toBe(false);
  });
});

// ── the issues snapshot ─────────────────────────────────────────────────────

describe('loadIssuesSnapshot', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-'));

  it('names the file and the reason when it is missing', () => {
    // readFileSync threw ENOENT past the AuditError handler, so Node exited 1:
    // the documented status for "findings", not for "the run failed".
    expect(() => loadIssuesSnapshot(path.join(dir, 'nope.json'))).toThrow(/nope\.json.*ENOENT/);
  });

  it('names the file and the JSON error when it is malformed', () => {
    const f = path.join(dir, 'bad.json');
    fs.writeFileSync(f, '{bad');
    expect(() => loadIssuesSnapshot(f)).toThrow(/bad\.json.*JSON/);
  });

  it('rejects a snapshot that lacks a repo, rather than resolving nothing', () => {
    const f = path.join(dir, 'half.json');
    fs.writeFileSync(f, JSON.stringify({ solyra: { 1: { state: 'open', reason: '', kind: 'ISSUE' } } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(/stocks/);
  });

  it('rejects a repo entry that is an array, not a map of issue rows', () => {
    // typeof [] === 'object', so an array passed the old check and then
    // resolved no issue at all.
    const f = path.join(dir, 'listed.json');
    fs.writeFileSync(f, JSON.stringify({ stocks: [], solyra: { 1: { state: 'open', reason: '', kind: 'ISSUE' } } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(/stocks/);
  });

  it('rejects an issue row with no usable state', () => {
    // checkClosedIssues reads st.state once it has decided the row is not
    // nullish, so { "8": {} } is neither closed nor unresolved and a cited
    // blocker DISAPPEARS from the report -- a clean bill of health produced
    // by a malformed file.
    const f = path.join(dir, 'nostate.json');
    fs.writeFileSync(f, JSON.stringify({ stocks: {}, solyra: { 8: {} } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(/solyra#8/);
  });

  it('rejects a null issue row rather than reading it as unresolvable', () => {
    // The opposite error to the one above: null takes the `st == null`
    // branch, so a live issue is reported as unresolvable and the audit
    // FABRICATES a finding (Rule 4).
    const f = path.join(dir, 'nullrow.json');
    fs.writeFileSync(f, JSON.stringify({ stocks: {}, solyra: { 8: null } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(/solyra#8/);
  });

  it('rejects a state that is not a string', () => {
    const f = path.join(dir, 'numstate.json');
    fs.writeFileSync(f, JSON.stringify({ stocks: {}, solyra: { 8: { state: 7 } } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(/solyra#8/);
  });

  it('rejects a state the checks do not branch on', () => {
    // Requiring a string was not enough. checkClosedIssues tests
    // `st.state === 'closed'` and falls through everything else, so a row
    // reading `bogus` is neither closed nor unresolved and the cited blocker
    // DISAPPEARS. Reproduced against the string-only validator: the row loaded
    // and checkClosedIssues returned [] for a line citing it as blocking.
    const f = path.join(dir, 'bogus.json');
    fs.writeFileSync(f, JSON.stringify({ stocks: {}, solyra: { 8: { state: 'bogus' } } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(/solyra#8/);
  });

  it.each(['open', 'closed'])('still accepts the real state %s', (state) => {
    const f = path.join(dir, `${state}.json`);
    fs.writeFileSync(f, JSON.stringify({ stocks: { 1: { state: 'open', reason: '', kind: 'ISSUE' } }, solyra: { 8: { state, reason: '', kind: 'ISSUE' } } }));
    expect(loadIssuesSnapshot(f).solyra[8].state).toBe(state);
  });

  it('returns the states of a well-formed snapshot', () => {
    const f = path.join(dir, 'ok.json');
    fs.writeFileSync(f, JSON.stringify({ solyra: { 1: { state: 'open', reason: '', kind: 'ISSUE' } }, stocks: { 1: { state: 'open', reason: '', kind: 'ISSUE' } } }));
    expect(loadIssuesSnapshot(f).solyra[1].state).toBe('open');
  });
});

describe('writeIssuesSnapshot', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-w-'));

  it('maps a write failure to the same exit status as a read failure', () => {
    // writeFileSync threw a plain filesystem error, which the handler at the
    // bottom of docs-audit.mjs rethrows, so Node exited 1: the status
    // reserved for "this documentation has findings".
    expect(() => writeIssuesSnapshot(path.join(dir, 'nodir', 'out.json'), { stocks: {}, solyra: {} }))
      .toThrow(AuditError);
    expect(() => writeIssuesSnapshot(path.join(dir, 'nodir', 'out.json'), { stocks: {}, solyra: {} }))
      .toThrow(/could not be written/);
  });

  it('writes a snapshot that loads back', () => {
    const f = path.join(dir, 'out.json');
    writeIssuesSnapshot(f, { stocks: { 1: { state: 'open', reason: '', kind: 'ISSUE' } }, solyra: { 1: { state: 'open', reason: '', kind: 'ISSUE' } } });
    expect(loadIssuesSnapshot(f).solyra[1].state).toBe('open');
  });
});

describe('writeStamps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-s-'));

  it('refuses before writing anything when one target is unwritable', () => {
    // Each marker went out through a bare writeFileSync, so a read-only or
    // deleted document exited 1 -- the status reserved for findings -- and,
    // because the writes are sequential, could stop partway and leave the tree
    // half stamped with nothing saying where.
    fs.writeFileSync(path.join(dir, 'a.md'), '# A\n');
    const written = [];
    const fsImpl = {
      constants: fs.constants,
      accessSync: (p) => { if (p.endsWith('b.md')) throw new Error('EACCES'); },
      writeFileSync: (p) => written.push(p),
    };
    expect(() => writeStamps([{ doc: 'a.md', text: 'x' }, { doc: 'b.md', text: 'y' }],
      { repo: dir, fsImpl })).toThrow(/b\.md.*not writable/s);
    expect(written).toEqual([]);
  });

  it('says how far it got when a write fails mid-loop', () => {
    // The pre-flight narrows the window but cannot close it: a full disk fails
    // mid-loop, and accessSync answers for the calling uid, which under root
    // calls a mode-444 file writable.
    // The write goes to a temp file and is renamed into place, so the stub
    // has to carry both calls; ENOSPC is raised on the temp write for b.md,
    // which is where a full disk actually bites.
    const renamed = [];
    const fsImpl = {
      constants: fs.constants,
      accessSync: () => {},
      writeFileSync: (p) => { if (p.includes('b.md')) throw new Error('ENOSPC'); },
      renameSync: (from, to) => { renamed.push(to); },
      unlinkSync: () => {},
    };
    expect(() => writeStamps([{ doc: 'a.md', text: 'x' }, { doc: 'b.md', text: 'y' }],
      { repo: dir, fsImpl })).toThrow(AuditError);
    expect(() => writeStamps([{ doc: 'a.md', text: 'x' }, { doc: 'b.md', text: 'y' }],
      { repo: dir, fsImpl })).toThrow(/1 of 2 documents were already stamped \(a\.md\)/);
  });

  it('refuses a symlink sitting at the temp path', () => {
    // The symlink refusal covers the DOCUMENT; it did not cover the path the
    // temp file is written to. `writeFileSync` follows a symlink found there,
    // so a checkout carrying that name as a link could have --stamp truncate
    // a file anywhere writable and then rename the link itself into place as
    // the document. Codex filed this as a P1.
    fs.writeFileSync(path.join(dir, 'a.md'), '# A\n');
    const canary = path.join(dir, 'canary.txt');
    fs.writeFileSync(canary, 'do not touch\n');
    // The temp name carries a random suffix, so the attack is reproduced by
    // capturing the name one run picks and pre-creating THAT path as a link
    // on the next, with the randomness pinned.
    let captured = null;
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.4242424242);
    try {
      writeStamps([{ doc: 'a.md', text: 'first\n' }], {
        repo: dir,
        fsImpl: {
          constants: fs.constants,
          accessSync: () => {},
          writeFileSync: (p, ...rest) => { captured = p; fs.writeFileSync(p, ...rest); },
          statSync: fs.statSync,
          chmodSync: fs.chmodSync,
          renameSync: fs.renameSync,
          unlinkSync: fs.unlinkSync,
        },
      });
      expect(captured).not.toBeNull();
      expect(path.basename(captured)).not.toBe('.a.md.stamp-tmp');
      fs.symlinkSync(canary, captured);
      expect(() => writeStamps([{ doc: 'a.md', text: 'second\n' }], { repo: dir }))
        .toThrow(/EEXIST|--stamp failed/);
    } finally {
      spy.mockRestore();
    }
    // The canary is untouched and the document still holds the first stamp.
    expect(fs.readFileSync(canary, 'utf8')).toBe('do not touch\n');
    expect(fs.readFileSync(path.join(dir, 'a.md'), 'utf8')).toBe('first\n');
  });

  it('writes through a temp file so a failed stamp leaves the original intact', () => {
    // writeFileSync opens with O_TRUNC, so a failure part-way through left the
    // document truncated while the error implied it was untouched. A rename
    // within a directory is atomic.
    const wrote = [];
    const renamed = [];
    const fsImpl = {
      constants: fs.constants,
      accessSync: () => {},
      writeFileSync: (p, t) => { wrote.push(p); },
      renameSync: (from, to) => { renamed.push([from, to]); },
      unlinkSync: () => {},
    };
    writeStamps([{ doc: 'a.md', text: 'x' }], { repo: dir, fsImpl });
    // Nothing was written to the document itself, only to a sibling temp.
    expect(wrote).toHaveLength(1);
    expect(wrote[0]).not.toBe(path.join(dir, 'a.md'));
    expect(path.dirname(wrote[0])).toBe(dir);
    expect(renamed).toEqual([[wrote[0], path.join(dir, 'a.md')]]);
    // And the error names the document as unchanged, which is now true.
    const boom = {
      constants: fs.constants,
      accessSync: () => {},
      writeFileSync: () => { throw new Error('ENOSPC'); },
      renameSync: () => {},
      unlinkSync: () => {},
    };
    expect(() => writeStamps([{ doc: 'a.md', text: 'x' }], { repo: dir, fsImpl: boom }))
      .toThrow(/a\.md is unchanged/);
  });

  it('writes every marker when all targets are writable', () => {
    fs.writeFileSync(path.join(dir, 'c.md'), 'old');
    expect(writeStamps([{ doc: 'c.md', text: 'new' }], { repo: dir })).toEqual(['c.md']);
    expect(fs.readFileSync(path.join(dir, 'c.md'), 'utf8')).toBe('new');
  });
});

describe('the SHA a marker carries', () => {
  it('asks git for a length the marker parser accepts', () => {
    // Bare `--short` honours core.abbrev, which can be set below 7, while
    // MARKER_RE requires 7-40.
    let seen;
    const spawn = (_c, argv) => { seen = argv; return { status: 0, stdout: '0123456789ab\n' }; };
    expect(resolveCommit('HEAD', { spawn })).toBe('0123456789ab');
    expect(seen).toContain(`--short=${MARKER_SHA_LEN}`);
    expect(MARKER_SHA_LEN).toBeGreaterThanOrEqual(7);
  });

  it('refuses a SHA the parser cannot read back', () => {
    // `Against` is an OPTIONAL group, so a four-character id still MATCHES --
    // it captures nothing and swallows the `Last scanned` field after it. The
    // round trip has to compare the captured value, not that the line parsed.
    const spawn = () => ({ status: 0, stdout: 'zzzz\n' });
    expect(() => resolveCommit('HEAD', { spawn })).toThrow(/not a form the marker parser/);
  });

  it('still refuses a revision git cannot resolve', () => {
    const spawn = () => ({ status: 1, stdout: '' });
    expect(() => resolveCommit('not-a-sha', { spawn })).toThrow(/not-a-sha/);
  });
});

describe('checkRegistryPaths', () => {
  it('reports a registry row naming a document that is gone', () => {
    // documentSet filters over `tracked`, so a deleted-but-registered document
    // is never classified and the report is clean BECAUSE it disappeared.
    const out = checkRegistryPaths(new Set(['src/a.ts']),
      [{ cls: 'D', glob: 'README.md', codePaths: [], regions: [] }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ check: 'registry', doc: 'README.md', severity: 'P1' });
  });

  it('reports a declared code path that does not exist', () => {
    // `git log -- does/not/exist` exits 0 with empty output, so the drift
    // check for that document can never fire. tailwind.config.ts on the
    // Design System row was exactly this: Tailwind v4 has no such file.
    const out = checkRegistryPaths(new Set(['README.md', 'src/a.ts']),
      [{ cls: 'D', glob: 'README.md', codePaths: ['tailwind.config.ts'], regions: [] }]);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/tailwind\.config\.ts/);
  });

  it('accepts a directory prefix as an existing code path', () => {
    const out = checkRegistryPaths(new Set(['README.md', 'src/lib/a.ts']),
      [{ cls: 'D', glob: 'README.md', codePaths: ['src/lib'], regions: [] }]);
    expect(out).toEqual([]);
  });

  it('does not apply the exact-name check to a glob row', () => {
    // The row names a rule, not a document, so `tracked.has('docs/*.md')` is
    // meaningless. What it must still do is COVER something -- see 'a registry
    // glob that covers nothing' below, which is why the tracked set here holds
    // a document the glob matches rather than one it does not.
    expect(checkRegistryPaths(new Set(['docs/a.md']),
      [{ cls: 'D', glob: 'docs/*.md', codePaths: [], regions: [] }])).toEqual([]);
  });
});

describe('the registry this repo actually ships', () => {
  it('names no path the tree does not have', () => {
    // The row-level guard above is only worth having if the shipped registry
    // passes it; tailwind.config.ts did not.
    const tracked = workingTreeFiles();
    const registry = loadRegistry(fs.readFileSync(path.join(process.cwd(), 'docs/DOC_REGISTRY.md'), 'utf8'));
    expect(checkRegistryPaths(tracked, registry)).toEqual([]);
  });
});

// ── stamping ────────────────────────────────────────────────────────────────

describe('checkVerifyTargets', () => {
  it('rejects a --verify path no stampable document consumed', () => {
    // `--stamp --verify nope.md` ran to completion, stamped ten documents
    // scan-only and exited 0, and nothing in the output said the review it
    // was asked to record had not been.
    expect(() => checkVerifyTargets(new Set(['nope.md', 'CLAUDE.md']),
      new Map([['CLAUDE.md', 'updated']]))).toThrow(/nope\.md/);
  });

  it('is quiet when every requested path was stamped', () => {
    expect(() => checkVerifyTargets(new Set(['CLAUDE.md']),
      new Map([['CLAUDE.md', 'inserted'], ['README.md', 'updated']]))).not.toThrow();
  });

  it.each(['skipped-no-h1', 'skipped-legacy-content'])(
    'rejects a --verify path whose stamp was refused (%s)', (action) => {
      // The set of candidates was filled BEFORE stamp() ran, so a document
      // stamp() declines still satisfied this check and --stamp --verify
      // exited 0 having written no verified marker -- the ignored-verification
      // behaviour this check exists to prevent, one layer in.
      expect(() => checkVerifyTargets(new Set(['a.md']), new Map([['a.md', action]])))
        .toThrow(/a\.md/);
    });

  it('names why the stamp was refused, not just the path', () => {
    expect(() => checkVerifyTargets(new Set(['a.md']), new Map([['a.md', 'skipped-no-h1']])))
      .toThrow(/no H1/);
  });

  it('accepts a target whose marker is already exactly what would be written', () => {
    // `unchanged` records nothing because the review is already on disk.
    // Refusing it would fail a re-run of a review that WAS recorded.
    expect(() => checkVerifyTargets(new Set(['a.md']), new Map([['a.md', 'unchanged']]))).not.toThrow();
  });
});

describe('classAIsStampable', () => {
  const MIXED = '# G\n\nhand written\n\n<!-- inventory:x:start -->\nr\n<!-- inventory:x:end -->\n';

  it('stamps a mixed Class A document whose map resolved', () => {
    const r = checkRegions('g.md', MIXED, ['inventory:*']);
    expect(classAIsStampable(r, MIXED)).toBe(true);
  });

  it('refuses one with no declared regions', () => {
    // checkRegions returns regionMap null here: ownership is unknown, not
    // "all prose". Stamping would put a marker somewhere nobody can vouch for.
    const r = checkRegions('g.md', MIXED, []);
    expect(r.regionMap).toBeNull();
    expect(classAIsStampable(r, MIXED)).toBe(false);
  });

  it('refuses one whose declared region matched nothing', () => {
    // A renderer that stopped emitting leaves `owned` empty, so every line
    // reads as hand-written prose -- including the lines a regeneration will
    // overwrite.
    const r = checkRegions('g.md', MIXED, ['inventory:gone']);
    expect(r.findings.some((f) => f.severity === 'P1')).toBe(true);
    expect(classAIsStampable(r, MIXED)).toBe(false);
  });

  it('refuses an exhaustive file with a nonblank complement', () => {
    const r = checkRegions('g.md', MIXED, ['exhaustive', 'inventory:*']);
    expect(classAIsStampable(r, MIXED)).toBe(false);
  });
});

describe('checkProvenance', () => {
  it('keeps a never-reviewed document on the worklist', () => {
    // --stamp writes exactly this form for a scan-only pass, and findMarker
    // returns it, so the missing-marker branch stays quiet: --check could
    // report clean over a document that says nobody has read it.
    const out = checkProvenance('d.md', { date: 'unknown', sha: null });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('P3');
    expect(out[0].detail).toMatch(/never reviewed/);
    expect(out[0].detail).toMatch(/drift cannot be checked/);
  });

  it('reports a reviewed document that supports no drift check', () => {
    const out = checkProvenance('d.md',
      { date: '2026-09-01', sha: null, depth: 'verified', scanned: '2026-09-18', owner: 'me' });
    expect(out[0].detail).toBe('incomplete provenance: no reviewed-against SHA, '
      + 'so drift cannot be checked');
  });

  it('reports a scan-only depth on a document with a real date and SHA', () => {
    // The registry defines `verified` as the only depth meaning a human
    // reread the claims; `scanned` is what --stamp writes mechanically. Such
    // a marker dropped off the worklist entirely and could yield a clean
    // audit after nothing but a machine pass.
    const out = checkProvenance('d.md',
      { date: '2026-09-01', sha: 'abc1234', depth: 'scanned' });
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/depth is scanned, not verified/);
  });

  it('reports an unset depth, which is the older two-field marker', () => {
    const out = checkProvenance('d.md',
      { date: '2026-09-01', sha: 'abc1234', depth: null });
    expect(out[0].detail).toMatch(/depth is unset/);
  });

  it('does not add a depth cause to a never-reviewed document', () => {
    // It already says "never reviewed"; adding "depth is unset" is noise.
    const out = checkProvenance('d.md', { date: 'unknown', sha: null, depth: null });
    expect(out[0].detail).not.toMatch(/depth is/);
  });

  it('is quiet on a complete verified marker', () => {
    expect(checkProvenance('d.md', { date: '2026-09-01', sha: 'abc1234',
      depth: 'verified', scanned: '2026-09-18', owner: 'me' })).toEqual([]);
  });

  it('reports a current marker carrying no Last scanned date', () => {
    // The registry's marker format requires the field and --stamp always
    // writes it, but a hand-written marker can omit it: it then parses with
    // `scanned: null`, checkMarkerDates has nothing to range-check, and every
    // provenance check stayed quiet -- a document passing --check with no
    // record of ever having been scanned.
    const out = checkProvenance('d.md',
      { date: '2026-09-01', sha: 'abc1234', depth: 'verified', scanned: null });
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/no Last scanned date/);
  });

  it('does not ask a legacy marker for a field its format has no room for', () => {
    expect(checkProvenance('d.md', { date: '2026-09-01', sha: 'abc1234',
      depth: 'verified', scanned: null, legacy: true })).toEqual([]);
  });
});

describe('docLines', () => {
  it('counts an empty document as zero lines', () => {
    // split('\n') returns [''] for '', so a Class A artifact truncated to
    // nothing reported ONE generated line and its `all` region counted as
    // matched -- suppressing the P1 promised for a renderer emitting nothing.
    expect(docLines('')).toEqual([]);
  });

  it('still drops only the trailing newline', () => {
    expect(docLines('a\nb\n')).toEqual(['a', 'b']);
    expect(docLines('a\nb')).toEqual(['a', 'b']);
    expect(docLines('\n')).toEqual(['']);
  });
});

describe('a link the filesystem satisfies but the repository does not', () => {
  it('does not let an untracked file stand in for a tracked one', () => {
    // An ignored or generated file, or one recreated after a staged deletion,
    // is present locally and absent for anyone who clones -- so a clean audit
    // over a committed link that is broken for every reader.
    // The target has to be a file that really EXISTS on disk and is not
    // tracked, or the mutation this test guards against still passes:
    // node_modules/vitest/package.json is present after `npm ci` here and in
    // CI, and `git check-ignore` confirms it is not in the repository.
    const untracked = 'node_modules/vitest/package.json';
    expect(fs.existsSync(path.join(process.cwd(), untracked))).toBe(true);
    const ctx = { tracked: new Set(['d.md']), topLevelDirs: new Set(), rootFiles: new Set(),
      knownRoot: new Set(), exts: new Set(['.md']), basenames: new Set() };
    const out = checkDeadLinks('d.md', `see [x](./${untracked})\n`, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/node_modules/);
  });

  it('still resolves a directory target, which git does not track', () => {
    const ctx = { tracked: new Set(['d.md', 'src/lib/a.ts']), topLevelDirs: new Set(),
      rootFiles: new Set(), knownRoot: new Set(), exts: new Set(['.md']), basenames: new Set() };
    expect(checkDeadLinks('d.md', 'see [x](./src/lib)\n', ctx)).toEqual([]);
  });
});

describe('checkExitCode', () => {
  it('does not fail --check on the P3 worklist alone', () => {
    // Gating on findings.length meant that the moment every actionable
    // finding was cleared, --check stayed red forever on the never-reviewed
    // documents -- contradicting the P3 design checkProvenance depends on.
    expect(checkExitCode(true, [{ severity: 'P3' }, { severity: 'P3' }])).toBe(0);
  });

  it('still fails on P1 or P2', () => {
    expect(checkExitCode(true, [{ severity: 'P3' }, { severity: 'P2' }])).toBe(1);
    expect(checkExitCode(true, [{ severity: 'P1' }])).toBe(1);
  });

  it('is 0 without --check whatever was found', () => {
    expect(checkExitCode(false, [{ severity: 'P1' }])).toBe(0);
  });
});

describe('a backticked citation the filesystem satisfies', () => {
  it('is reported when the file is not tracked', () => {
    // Same rule as the Markdown-link branch. The target has to be a file that
    // really EXISTS and really is not tracked, or the mutation this guards
    // against still passes: node_modules/vitest/package.json is present after
    // `npm ci` here and in CI, and git check-ignore confirms it is untracked.
    const untracked = 'node_modules/vitest/package.json';
    expect(fs.existsSync(path.join(process.cwd(), untracked))).toBe(true);
    const ctx = { tracked: new Set(['d.md']), topLevelDirs: new Set(['node_modules']),
      rootFiles: new Set(), knownRoot: new Set(), exts: new Set(['.json']), basenames: new Set() };
    const out = checkDeadLinks('d.md', `see \`${untracked}\`\n`, ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/backticked path/);
  });
});

describe('an inserted marker', () => {
  it('gets a blank line on both sides when the H1 is followed by body text', () => {
    // A leading blank only gave `# Title` / '' / marker / body, and Markdown
    // renders the marker and the opening sentence as a SINGLE paragraph.
    const { text } = stamp('# Title\nBody text.\n', '2026-09-18', 'scanned', 'abc1234567ab');
    const lines = text.split('\n');
    expect(lines[0]).toBe('# Title');
    expect(lines[1]).toBe('');
    expect(lines[2]).toMatch(/^\*\*Last reviewed:/);
    expect(lines[3]).toBe('');
    expect(lines[4]).toBe('Body text.');
  });

  it('reuses the blank the H1 already has', () => {
    const { text } = stamp('# Title\n\nBody text.\n', '2026-09-18', 'scanned', 'abc1234567ab');
    expect(text.split('\n').slice(0, 5)).toEqual(
      ['# Title', '', expect.stringMatching(/^\*\*Last reviewed:/), '', 'Body text.']);
  });
});

describe('driftCommits under a configured abbreviation', () => {
  it('asks git for a fixed abbreviation rather than trusting core.abbrev', () => {
    // With core.abbrev below 7, `%h` emits `abcd\tmessage`, the header pattern
    // rejects it, no status line is associated with any commit, and the drift
    // check reports nothing however much the declared paths moved.
    let seen;
    const exec = (_c, argv) => { seen = argv; return ''; };
    checkChangedSince('d.md', 'abc1234', ['src'], 'HEAD', { exec });
    expect(seen).toContain('--abbrev=12');
  });
});

describe('anchors', () => {
  it('does not collapse separator runs, because GitHub does not', () => {
    // Strip punctuation, THEN replace each space. An em dash and a slash leave
    // DOUBLED hyphens; collapsing here would reproduce the broken links' own
    // spelling and call them valid.
    expect(headingSlug('FEAT-AUTH-001 — Auth / security (8 open)'))
      .toBe('feat-auth-001--auth--security-8-open');
    expect(headingSlug('Data Sources & Inputs')).toBe('data-sources--inputs');
    expect(headingSlug('`code` and **bold**')).toBe('code-and-bold');
  });

  it('numbers repeated headings as GitHub numbers them', () => {
    expect(headingAnchors('# Notes\n\n## Notes\n\n## Notes\n'))
      .toEqual(new Set(['notes', 'notes-1', 'notes-2']));
  });
});

describe('a link to a heading nobody has', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-a-'));
  const ctx = (tracked) => ({ tracked: new Set(tracked), topLevelDirs: new Set(),
    rootFiles: new Set(), knownRoot: new Set(), exts: new Set(['.md']), basenames: new Set() });

  it('is reported when the fragment does not resolve', () => {
    // The fragment was stripped before the target was checked, so a link to a
    // real file and a nonexistent heading always passed.
    fs.writeFileSync(path.join(process.cwd(), 'tmp-anchor-target.md'),
      '# T\n\n## FEAT-AUTH-001 — Auth / security (8 open)\n');
    try {
      const out = checkDeadLinks('d.md',
        'see [x](tmp-anchor-target.md#feat-auth-001-auth-security-8-open)\n',
        ctx(['d.md', 'tmp-anchor-target.md']));
      expect(out).toHaveLength(1);
      expect(out[0].check).toBe('dead-anchor');
    } finally {
      fs.unlinkSync(path.join(process.cwd(), 'tmp-anchor-target.md'));
    }
  });

  it('is quiet when the fragment resolves', () => {
    fs.writeFileSync(path.join(process.cwd(), 'tmp-anchor-target.md'),
      '# T\n\n## FEAT-AUTH-001 — Auth / security (8 open)\n');
    try {
      expect(checkDeadLinks('d.md',
        'see [x](tmp-anchor-target.md#feat-auth-001--auth--security-8-open)\n',
        ctx(['d.md', 'tmp-anchor-target.md']))).toEqual([]);
    } finally {
      fs.unlinkSync(path.join(process.cwd(), 'tmp-anchor-target.md'));
    }
  });

  it('does not report an anchor on a file that is already dead', () => {
    // One finding per broken link: a missing file cannot have a heading.
    const out = checkDeadLinks('d.md', 'see [x](gone.md#anything)\n', ctx(['d.md']));
    expect(out).toHaveLength(1);
    expect(out[0].check).toBe('dead-link');
  });

  it('ignores a link that climbs out of the repository', () => {
    expect(checkDeadLinks('d.md', 'see [x](../../elsewhere.md)\n', ctx(['d.md']))).toEqual([]);
  });
});

describe('the issue walk', () => {
  const page = (n) => Array.from({ length: ISSUE_PAGE_SIZE },
    (_, k) => `${n * 1000 + k}\topen\t\tISSUE`).join('\n');

  it('has no silent ceiling', () => {
    // `page < 40` stopped at 3,900 combined issues and PRs and said nothing,
    // so every older cited blocker past that point read as "could not be
    // resolved" -- fabricated findings from a silent cap.
    const exec = (_c, argv) => {
      const n = Number(/&page=(\d+)/.exec(argv.join(' '))[1]);
      return n <= 44 ? page(n) : '';
    };
    expect(Object.keys(fetchIssueStates('stocks', { exec })).length).toBeGreaterThan(4000);
  });

  it('refuses rather than truncating when the runaway guard fires', () => {
    // A guard that fires means the assumption behind it is wrong, so the
    // result cannot be trusted: exit 2, never a short answer.
    const exec = (_c, argv) => page(Number(/&page=(\d+)/.exec(argv.join(' '))[1]));
    expect(() => fetchIssueStates('stocks', { exec, }))
      .toThrow(/truncated read/);
  });
});

describe('isTrackedDir', () => {
  it('recognises a directory by the tracked files beneath it', () => {
    expect(isTrackedDir(new Set(['src/lib/a.ts']), 'src/lib')).toBe(true);
    expect(isTrackedDir(new Set(['src/lib/a.ts']), 'src/nope')).toBe(false);
  });
});

describe('summariseStamps', () => {
  it('counts only the actions that wrote', () => {
    // `skipped-legacy-content` and `skipped-no-h1` were counted as changed
    // because only `unchanged` was excluded, so a --verify that touched
    // nothing printed "1 changed".
    const s = summariseStamps([
      { action: 'inserted' }, { action: 'updated' }, { action: 'unchanged' },
      { action: 'skipped-no-h1' }, { action: 'skipped-legacy-content' },
    ]);
    expect(s).toEqual({ changed: 2, unchanged: 1, skipped: 2 });
  });

  it('records no depth for a stamp that was not written', () => {
    expect(stampRecord('a.md', { action: 'skipped-no-h1' }, true).depth).toBeNull();
    expect(stampRecord('a.md', { action: 'updated' }, true).depth).toBe('verified');
    expect(stampRecord('a.md', { action: 'inserted' }, false).depth).toBe('scan-only');
  });
});

describe('parseArgs --verify', () => {
  it('requires --stamp, since a review can only be recorded by writing', () => {
    expect(() => parseArgs(['--verify', 'CLAUDE.md'])).toThrow(/--stamp/);
  });
});

// ── review provenance ───────────────────────────────────────────────────────

describe('resolveCommit', () => {
  it('rejects a --since that is not a commit rather than stamping it', () => {
    // `--stamp --verify README.md --since deadbeef` wrote `Against: deadbeef`
    // and `Depth: verified` for a revision nobody audited; the ancestry check
    // only reads the previous marker, so the same run reported it as newly
    // verified and the error surfaced on a later audit, if ever.
    expect(() => resolveCommit('deadbeef')).toThrow(/does not resolve to a commit/);
  });

  it('returns the abbreviated SHA of a real revision', () => {
    // A branch name would otherwise be written verbatim, and the marker
    // parser only reads a hex SHA.
    expect(resolveCommit('HEAD')).toMatch(/^[0-9a-f]{7,40}$/);
  });
});

// ── the base ref ────────────────────────────────────────────────────────────

describe('resolveBaseRef', () => {
  it('falls back when origin/main is absent', () => {
    expect(resolveBaseRef(['definitely-not-a-ref', 'HEAD'])).toBe('HEAD');
  });

  it('skips a candidate whose commit resolves but whose tree is unavailable', () => {
    // In a partial or stale clone `rev-parse --verify main` succeeds while
    // main's tree is missing, so the candidate was accepted and the later
    // ls-tree aborted the audit instead of falling through to HEAD.
    const seen = [];
    const spawn = (_c, args) => {
      seen.push(args);
      if (args[0] === 'rev-parse') return { status: 0 };
      return { status: args.at(-1).startsWith('origin/main') ? 128 : 0 };
    };
    expect(resolveBaseRef(['origin/main', 'HEAD'], { spawn })).toBe('HEAD');
    expect(seen).toContainEqual(['cat-file', '-e', 'origin/main^{tree}']);
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

// ── the tree being audited ──────────────────────────────────────────────────

describe('workingTreeFiles', () => {
  it('lists the index, not the base ref, and drops files deleted on disk', () => {
    // `git ls-tree <baseRef>` misses every document added on the branch --
    // docs/DOC_REGISTRY.md itself, on the branch that introduced it -- and
    // keeps a branch-deleted one, which readFileSync then aborts on.
    const calls = [];
    // NUL-separated, because the command now passes `-z`: this stub stands in
    // for git's wire format, and that format changed with the flag. See
    // "a tracked path with a non-ASCII byte" for why the flag is there.
    const exec = (_c, args) => {
      calls.push(args);
      if (args.includes('--deleted')) return 'docs/gone.md\0';
      return 'README.md\0docs/DOC_REGISTRY.md\0docs/gone.md\0src/a.ts\0';
    };
    const files = workingTreeFiles({ exec });
    expect(calls.every((a) => a[0] === 'ls-files')).toBe(true);
    expect(files.has('docs/DOC_REGISTRY.md')).toBe(true);
    expect(files.has('docs/gone.md')).toBe(false);
  });
});

describe('knownRootFiles', () => {
  it('remembers a root file the base ref had and the tree no longer has', () => {
    // The stem anchor only sees siblings that still exist: once package.json
    // is really deleted, its stem is gone with it and the citation went
    // unreported. The base ref is the persistent record of what was there.
    const rows = loadRegistry(REGISTRY);
    const known = knownRootFiles(rows, new Set(['package.json', 'README.md', 'src/a.ts']),
      new Set(['README.md', 'src/a.ts']));
    expect(known.has('package.json')).toBe(true);
    expect(known.has('src/a.ts')).toBe(false);
  });

  it('names every root file the registry registers outright', () => {
    const known = knownRootFiles(loadRegistry(REGISTRY), new Set(), new Set());
    expect(known.has('AGENTS.md')).toBe(true);
    expect(known.has('CLAUDE.md')).toBe(true);
    expect(known.has('docs/*.md')).toBe(false);
  });
});

describe('linkContext', () => {
  it('derives the checked extensions from the tree instead of an allowlist', () => {
    // `src/index.css` is declared in the registry as design-system surface
    // and cited in the docs, and `.css` was not in the allowlist, so a rename
    // of it could never be reported. Whatever extensions this tree tracks
    // are, by definition, extensions a path in this tree can have.
    const ctx = linkContext(new Set(['src/index.css', 'Frontend.drawio', 'src/a.ts']),
      new Set(['old.html']), []);
    expect(ctx.exts.has('.css')).toBe(true);
    expect(ctx.exts.has('.drawio')).toBe(true);
    expect(ctx.exts.has('.html')).toBe(true); // the base ref had one
    expect(ctx.exts.has('.py')).toBe(false);
    expect(ctx.topLevelDirs.has('src')).toBe(true);
    expect(ctx.rootFiles.has('Frontend')).toBe(true);
  });
});

// ── dead links ──────────────────────────────────────────────────────────────

describe('checkDeadLinks', () => {
  const tracked = new Set(['vite.config.ts', 'src/app.ts', 'src/index.css', 'Frontend.drawio']);
  const ctx = linkContext(tracked, new Set(['package.json', 'Frontend-icons.drawio', ...tracked]),
    loadRegistry(REGISTRY));

  it('flags a root-level backticked file that no longer exists', () => {
    // Requiring a slash meant `vite.config.ts` and `package.json` — cited
    // constantly in the living docs — could never produce a dead-path finding.
    const out = checkDeadLinks('d.md', 'See `package.json` for the scripts.\n', ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('package.json');
  });

  it('flags a deleted root file the base ref remembers, with no sibling stem left', () => {
    // package.json has no same-stem sibling once it is gone; the base ref is
    // what says it used to be here.
    const noSibling = linkContext(new Set(['src/a.ts']), new Set(['package.json']), []);
    expect(noSibling.rootFiles.has('package')).toBe(false);
    const out = checkDeadLinks('d.md', 'See `package.json`.\n', noSibling);
    expect(out).toHaveLength(1);
  });

  it('matches a dotted root filename, which is what the docs actually cite', () => {
    // `vite.config.ts` and `playwright.config.ts` are the two most-cited root
    // files in the living docs (12 and 15 mentions). A stem of `[A-Za-z0-9_-]+`
    // cannot contain a dot, so neither could ever be matched and the check
    // only ever worked for `package.json`.
    const renamed = linkContext(new Set(['vite.config.mts', 'src/a.ts']), new Set(), []);
    const out = checkDeadLinks('d.md', 'Edit `vite.config.ts` first.\n', renamed);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('vite.config.ts');
  });

  it('does not flag a dotted name with no tracked sibling of that stem', () => {
    // `pw.sandbox.config.ts` is cited six times and has never been a root
    // file here; the docs name it as a proposal.
    expect(checkDeadLinks('d.md', 'Add `pw.sandbox.config.ts`.\n', ctx)).toEqual([]);
  });

  it('does not read a bare basename of a nested file as a renamed root file', () => {
    // `index.css` cited in docs/REDESIGN.md is src/index.css. The stem rule
    // saw root index.html, decided the extension had changed, and flagged a
    // file that exists.
    const nested = linkContext(new Set(['index.html', 'src/index.css']), new Set(), []);
    expect(checkDeadLinks('d.md', 'global net in `index.css`.\n', nested)).toEqual([]);
  });

  it('does not flag a root file that is still tracked', () => {
    expect(checkDeadLinks('d.md', 'See `vite.config.ts`.\n', ctx)).toEqual([]);
  });

  it('does not flag a bare name with no tracked sibling of that stem', () => {
    // Prose naming some other project's file is not this repo's to resolve.
    expect(checkDeadLinks('d.md', 'Their `webpack.config.js` differs.\n', ctx)).toEqual([]);
  });

  it('checks a stylesheet and a drawio path, not only code', () => {
    // Frontend-icons.drawio is in the base ref and not the tree: a deletion.
    const out = checkDeadLinks('d.md', 'Tokens live in `src/tokens.css`; see `Frontend-icons.drawio`.\n', ctx);
    expect(out.map((f) => f.detail)).toEqual([
      'backticked path -> src/tokens.css',
      'backticked root file -> Frontend-icons.drawio',
    ]);
  });

  it('reads a path with a line or range suffix, which the docs use constantly', () => {
    // `src/App.tsx:44-72`, `vite.config.ts:21,27`, `SwingMode.tsx:156`: the
    // closing backtick had to follow the extension, so every such citation
    // was invisible to the check.
    // The config was renamed to .mts; Gone.tsx is gone (and, unlike App.tsx,
    // not on this repo's disk either, which the check also consults); b.tsx
    // keeps .tsx a tracked extension so the suffix is what is under test.
    const suffixed = linkContext(new Set(['vite.config.mts', 'src/a.ts', 'src/b.tsx']), new Set(), []);
    const out = checkDeadLinks('d.md',
      'See `src/Gone.tsx:44-72` and `src/Gone.tsx:9`, then `vite.config.mts:7,45,93` and `vite.config.ts:2-3`.\n',
      suffixed);
    expect(out.map((f) => f.detail)).toEqual([
      'backticked path -> src/Gone.tsx',
      'backticked path -> src/Gone.tsx',
      'backticked root file -> vite.config.ts',
    ]);
  });

  it('skips a path whose extension no file in this tree has', () => {
    // This repo has no Python at all, so `tests/test_e2e.py` cannot be a path
    // here whatever directory it starts with; it is the stocks repo's.
    expect(checkDeadLinks('d.md', 'Backend: `tests/test_e2e.py`.\n', ctx)).toEqual([]);
  });

  it('suppresses only the citation the stocks marker belongs to, not the whole line', () => {
    // docs/TEST_COVERAGE_AUDIT.md:104 puts a stocks docs/API.md link in one
    // cell and a local `src/lib/journalStats.ts` in another. A line-level
    // marker suppressed both, so a rename of the local file went unreported
    // in the one place the registry promises cross-references are read.
    const ctx = linkContext(new Set(['src/lib/keep.ts', 'docs/a.md']), new Set(), []);
    const row = '| x | (`computeJournalStats` in `src/lib/gone.ts`) instead | alive: '
      + '[`docs/API.md:47`](https://github.com/TeneikaAskew/stocks/blob/main/docs/API.md) |\n';
    expect(checkDeadLinks('d.md', row, ctx).map((f) => f.detail)).toEqual(['backticked path -> src/lib/gone.ts']);
    const prose = '`src/lib/gone.ts` is consumed by [`docs/API.md`](https://github.com/TeneikaAskew/stocks/blob/main/docs/API.md).\n';
    expect(checkDeadLinks('d.md', prose, ctx).map((f) => f.detail)).toEqual(['backticked path -> src/lib/gone.ts']);
    // The other order: a stocks link's URL is part of that citation, not
    // free text that reaches the local path after it.
    const after = 'See [`docs/API.md`](https://github.com/TeneikaAskew/stocks/blob/main/docs/API.md) and `src/lib/gone.ts`.\n';
    expect(checkDeadLinks('d.md', after, ctx).map((f) => f.detail)).toEqual(['backticked path -> src/lib/gone.ts']);
  });

  it('lets a marker reach a citation only across free text, never past another citation', () => {
    const ctx = linkContext(new Set(['src/keep.ts']), new Set(), []);
    // `src/also.ts` is adjacent to the marker; `src/gone.ts` has a citation between.
    expect(checkDeadLinks('d.md',
      'Compare `src/gone.ts` with `src/also.ts` in the stocks repo.\n', ctx)
      .map((f) => f.detail)).toEqual(['backticked path -> src/gone.ts']);
    // A marker in the next table cell does not reach across the pipe.
    expect(checkDeadLinks('d.md', '| `src/gone.ts` | the stocks repo owns the rest |\n', ctx)
      .map((f) => f.detail)).toEqual(['backticked path -> src/gone.ts']);
  });

  it('checks a path under a directory the base ref had and the tree no longer has', () => {
    // Deleting the last file under `retired/` removed it from topLevelDirs,
    // so every citation of the directory became uncheckable at the moment it
    // went dead, though baseTracked remembered the file and its extension.
    const ctx = linkContext(new Set(['src/a.ts']), new Set(['retired/guide.css']), []);
    const out = checkDeadLinks('d.md', 'See `retired/guide.css`.\n', ctx);
    expect(out.map((f) => f.detail)).toEqual(['backticked path -> retired/guide.css']);
  });

  it('skips a path on a line that names the stocks repo', () => {
    // CLAUDE.md:265 says `scripts/export_openapi.py` is a stocks file, and
    // `scripts` is also a top-level directory here. The docs mark such
    // citations with a github.com/TeneikaAskew/stocks link or the word
    // "stocks" on the same line; both are the marker.
    const link = 'See [`docs/OPS.md`](https://github.com/TeneikaAskew/stocks/blob/main/docs/OPS.md).\n';
    const word = 'Its snapshot test fails any stocks PR that touches `src/export.ts`.\n';
    const linkCtx = linkContext(new Set(['docs/a.md', 'src/a.ts']), new Set(), []);
    expect(checkDeadLinks('d.md', link, linkCtx)).toEqual([]);
    expect(checkDeadLinks('d.md', word, linkCtx)).toEqual([]);
    expect(checkDeadLinks('d.md', 'Plain `src/export.ts` mention.\n', linkCtx)).toHaveLength(1);
  });
});

// ── closed issues and pull requests ─────────────────────────────────────────

describe('checkClosedIssues', () => {
  const states = {
    solyra: {
      8: { state: 'closed', reason: 'completed', kind: 'ISSUE' },
      60: { state: 'closed', reason: 'merged', kind: 'PR' },
      61: { state: 'closed', reason: '', kind: 'PR' },
      70: { state: 'open', reason: '', kind: 'PR' },
    },
  };
  const url = (n, kind = 'issues') => `https://github.com/TeneikaAskew/solyra/${kind}/${n}`;

  it('reports a merged pull request cited as a live blocker', () => {
    // A `/pull/` URL was skipped outright, so "blocked by PR #60" stayed
    // invisible after #60 merged even though the issue-state read already
    // returned PR records.
    const out = checkClosedIssues('d.md', `Blocked by ${url(60, 'pull')}.\n`, states);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('P1');
    expect(out[0].detail).toContain('solyra#60 (PR) is CLOSED (merged)');
  });

  it('reports a closed-unmerged pull request too, saying which it was', () => {
    const out = checkClosedIssues('d.md', `Still open: ${url(61, 'pull')}.\n`, states);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('(PR) is CLOSED (closed)');
  });

  it('is quiet for an open pull request and for a PR cited with no blocking cue', () => {
    expect(checkClosedIssues('d.md', `Blocked by ${url(70, 'pull')}.\n`, states)).toEqual([]);
    expect(checkClosedIssues('d.md', `Landed in ${url(60, 'pull')}.\n`, states)).toEqual([]);
  });

  it('still reports a closed issue exactly as before', () => {
    const out = checkClosedIssues('d.md', `Blocked by ${url(8)}.\n`, states);
    expect(out[0].detail).toBe('solyra#8 is CLOSED (completed) but cited as live work');
  });
});

// ── which checks a class gets ───────────────────────────────────────────────

describe('contentChecks', () => {
  const ctx = {
    states: { solyra: { 8: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } },
    ...linkContext(new Set(['README.md', 'src/keep.ts']), new Set(), []),
  };
  const text = 'Blocked by https://github.com/TeneikaAskew/solyra/issues/8.\n'
    + 'See [the plan](../missing.md) and `src/gone.ts`.\n';

  it('still validates Markdown links in a Class C record', () => {
    // An unconditional `continue` skipped every check for Class C, contradicting
    // the registry's promise that dated records are read for cross-references.
    // A closed issue in a record was true on its date; a LINK is a promise to
    // the reader now, and a dead one is evidence that cannot be reached.
    const out = contentChecks('C', 'docs/record.md', text, ctx);
    expect(out.map((f) => f.check)).toEqual(['dead-link']);
    expect(out[0].detail).toMatch(/relative link/);
  });

  it('does not check a Class C record\'s historical file names', () => {
    // A dated record truthfully lists the files an old commit touched. Once
    // one is renamed or deleted, a live-tree path check turns that truth into
    // a finding whose only remedy is rewriting the record -- the one thing
    // Class C exists to prevent. Measured on the shipped
    // docs/LOVABLE_COMMITS_REVIEW.md: 16 such findings, src/styles.css among
    // them.
    const out = contentChecks('C', 'docs/record.md', text, ctx);
    expect(out.filter((f) => /backticked/.test(f.detail))).toEqual([]);
  });

  it('still checks a LIVING document\'s backticked paths', () => {
    // The Class C carve-out must not leak into Class D, where a citation of a
    // file that no longer exists is exactly the rot this audit is for.
    const out = contentChecks('D', 'docs/living.md', text, ctx);
    expect(out.filter((f) => /backticked/.test(f.detail))).toHaveLength(1);
  });

  it('runs the issue check as well for a living doc', () => {
    const out = contentChecks('D', 'docs/living.md', text, ctx);
    expect(out.map((f) => f.check).sort()).toEqual(['closed-issue', 'dead-link', 'dead-link']);
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

  it('does not mistake the second word of an owner for a caveat', () => {
    // The owner is free text and `ownerOf` already carries the whole of it.
    // Taking "the first token" as the value made `**Owner:** Jane Doe` yield
    // a tail of `Doe`, which a restamp appended as a new segment -- and then
    // again on every run after that.
    expect(extraSegments('**Owner:** Jane Doe')).toEqual([]);
    expect(extraSegments('**Owner:** @TeneikaAskew (frontend)')).toEqual([]);
  });

  it('keeps only prose that follows the recognised value of each owned field', () => {
    expect(extraSegments('**Depth:** verified (routes only)')).toEqual(['(routes only)']);
    expect(extraSegments('**Against:** `abc1234` pre-split tree')).toEqual(['pre-split tree']);
    expect(extraSegments('**Last scanned:** 2026-09-01')).toEqual([]);
  });
});

describe('stampGuard', () => {
  // The marker has to be the document's marker for the guard to be asked
  // about it, so it sits where the registry requires -- the first rendered
  // paragraph after the H1 -- and the generated region is what encloses it.
  // With prose above it, the line is not the document's marker at all and
  // the question the guard answers does not arise.
  const GEN_DOC = '# T\n\n<!-- BEGIN gen -->\n'
    + '**Last reviewed:** 2026-08-31 · **Owner:** TBD\n<!-- END gen -->\nMore prose.\n';

  it('refuses to rewrite a marker that sits inside a generated region', () => {
    // The old guard asked only whether the first owned line was near the H1.
    // A mark:gen block starting on line 4 with the marker on line 5 passed
    // it, and stamp() then rewrote a line the registry declares machine-owned.
    const { owned } = ownedLines(GEN_DOC, ['mark:gen']);
    expect(stampGuard(GEN_DOC, owned)).toMatch(/marker on line 4 .*generated region .*lines 3-5/);
  });

  it('is quiet for a marker in prose beside a region', () => {
    const doc = '# T\n\n**Last reviewed:** 2026-08-31 · **Owner:** TBD\n\n<!-- BEGIN gen -->\nx\n<!-- END gen -->\n';
    const { owned } = ownedLines(doc, ['mark:gen']);
    expect(stampGuard(doc, owned)).toBeNull();
  });

  it('still refuses an insertion point inside a region that starts at the H1', () => {
    const doc = '# T\n<!-- BEGIN gen -->\nx\n<!-- END gen -->\nBody.\n';
    const { owned } = ownedLines(doc, ['mark:gen']);
    // The message changed in round 12: the guard names where the marker WOULD
    // LAND rather than the earliest owned line. The invariant is the same.
    expect(stampGuard(doc, owned)).toMatch(/would land on line 3, inside a generated/);
  });
});

describe('an inline code span at a fenced block', () => {
  it('does not pair its delimiters across the block', () => {
    // A fenced code block interrupts a paragraph exactly as a blank line
    // does, so an inline span cannot pair across one. `codeSpanLines` windowed
    // its scan by paragraph but with NO fence set, so an unmatched backtick
    // above a fence paired with one below it and masked everything between --
    // including a live `[x](missing.md)`, which the gating dead-link check
    // then never saw: a broken link reported clean.
    const doc = 'a ` tick\n```\nfenced\n```\n[x](missing.md) ` tail\n';
    expect(checkDeadLinks('d.md', doc, linkCtx(['d.md'])).map((f) => f.check))
      .toEqual(['dead-link']);
    // The boundary is real, not "fences disable masking": a span opened and
    // closed on the SAME side of the fence still masks its contents.
    const sameSide = 'a ` tick [x](missing.md) tail `\n```\nfenced\n```\n';
    expect(checkDeadLinks('d.md', sameSide, linkCtx(['d.md']))).toEqual([]);
  });
});

describe('a comment opener shown as an example', () => {
  it('does not hide a later raw-text block from the block scan', () => {
    // `` `<!--` `` in prose is inline code and `\\<!--` is an escaped
    // delimiter; neither opens a comment. Read as real, either one made this
    // scan treat everything after it as commented out -- so the `<pre>`
    // below was never recognised as a raw-text block, and the link it
    // DISPLAYS became a gating dead-link finding for something no reader can
    // click. The other comment scanners have carried this rule for rounds.
    const withSpan = 'The opener is `<!--`.\n\n<pre>\n[x](missing.md)\n</pre>\n';
    expect(checkDeadLinks('d.md', withSpan, linkCtx(['d.md']))).toEqual([]);
    const withEscape = 'The opener is \\<!-- here.\n\n<pre>\n[x](missing.md)\n</pre>\n';
    expect(checkDeadLinks('d.md', withEscape, linkCtx(['d.md']))).toEqual([]);
    // A REAL unclosed opener still hides what follows, so the rule has both
    // directions and this is not simply "never believe an opener".
    const real = 'Before <!-- opened\n\n<pre>\n[x](missing.md)\n</pre>\n';
    expect(checkDeadLinks('d.md', real, linkCtx(['d.md']))).toEqual([]);
    // And the link is live when nothing hides it at all.
    expect(checkDeadLinks('d.md', 'prose\n\n[x](missing.md)\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('an ESCAPED generated-region delimiter', () => {
  it('is text a reader sees, not a region boundary', () => {
    // `\\<!-- BEGIN gen -->` renders literally -- it is how a Class A document
    // shows its own convention OUTSIDE a code span. Reading the pair as real
    // classified every hand-written line between them as generated, and under
    // `exhaustive` that suppressed the warning that regeneration would
    // discard that prose. The comment and link scanners have applied the
    // escape rule for rounds; these two scanners had their own copy without
    // it.
    const doc = '# T\n\n\\<!-- BEGIN gen -->\nhand written\n\\<!-- END gen -->\n';
    const { owned, unmatched } = ownedLines(doc, ['mark:gen']);
    expect([...owned]).toEqual([]);
    expect(unmatched).toEqual(['mark:gen']);
    // And the real pair is still a region, so the rule has both directions.
    const real = '# T\n\n<!-- BEGIN gen -->\ngenerated\n<!-- END gen -->\n';
    expect([...ownedLines(real, ['mark:gen']).owned]).toEqual([3, 4, 5]);
  });

  it('applies to the inventory scanner beside it', () => {
    const doc = '# T\n\n\\<!-- inventory:x:start -->\nhand written\n\\<!-- inventory:x:end -->\n';
    const { owned, orphans } = ownedLines(doc, ['inventory:*']);
    expect([...owned]).toEqual([]);
    expect(orphans).toEqual([]);
  });

  it('and every delimiter on a line is read, not just the first', () => {
    // `.exec` returned one match, so a complete pair written on ONE line read
    // as a start with no end -- and an orphan sharing a line with a real
    // delimiter was hidden from the balance check entirely. The Python twin
    // (stocks#1121) reads them all; this copy did not.
    const pair = '# T\n\n<!-- inventory:x:start --><!-- inventory:x:end -->\n';
    expect(ownedLines(pair, ['inventory:*']).orphans).toEqual([]);
    const orphan = '# T\n\n<!-- inventory:x:start --><!-- inventory:y:end -->\n';
    expect(ownedLines(orphan, ['inventory:*']).orphans)
      .toEqual(['inventory:y ends at line 3 with no start',
        'inventory:x starts at line 3 with no end']);
  });
});

describe('restamp with a multi-word owner', () => {
  it('is idempotent and never duplicates part of the owner', () => {
    const before = `# T\n\n${renderMarker('2026-08-31', null, null, '2026-09-01', 'Jane Doe')}\n`;
    const once = stamp(before, '2026-09-16', 'scanned', 'abc1234', false).text;
    const twice = stamp(once, '2026-09-17', 'scanned', 'abc1234', false).text;
    expect(once.split('\n')[2]).toBe(
      '**Last reviewed:** 2026-08-31 · **Last scanned:** 2026-09-16 · **Owner:** Jane Doe');
    expect(twice.split('\n')[2]).toBe(
      '**Last reviewed:** 2026-08-31 · **Last scanned:** 2026-09-17 · **Owner:** Jane Doe');
  });

  it('keeps a caveat on a current-format marker through two restamps', () => {
    const before = '# T\n\n**Last reviewed:** 2026-08-31 — deployment only\n';
    const once = stamp(before, '2026-09-16', 'scanned', 'abc1234', false).text;
    const twice = stamp(once, '2026-09-17', 'scanned', 'abc1234', false).text;
    expect(once).toContain('— deployment only');
    expect(twice.split('— deployment only')).toHaveLength(2);
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

  it('does not insert a second marker on the run after a long-front-matter insert', () => {
    const pre = Array.from({ length: 45 }, (_, i) => `<!-- filler ${i} -->`).join('\n');
    const doc = `${pre}\n\n# Title\n\nBody.\n`;
    const once = stamp(doc, '2026-09-16', 'scanned', 'abc1234', false);
    expect(once.action).toBe('inserted');
    const twice = stamp(once.text, '2026-09-17', 'scanned', 'abc1234', false);
    expect(twice.action).toBe('updated');
    expect(twice.text.split('**Last reviewed:**')).toHaveLength(2);
  });

  it('does not accept a later section\'s metadata as the document marker', () => {
    const doc = '# Doc\n\nIntro.\n\n# PART A\n\n**Last reviewed:** 2026-06-05 · **Owner:** TBD\n';
    expect(findMarker(doc.split('\n'))).toBeNull();
    // 3, not 4: `Intro.` is the first rendered paragraph and the window
    // ends with it. The heading below would have ended it anyway.
    expect(markerWindow(doc.split('\n'))).toEqual({ from: 1, to: 3 });
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

  it('greps the tree the documents are read from, naming no revision', () => {
    // The documents are read from the working tree, so the counts must come
    // from the same tree: measured against origin/main, a branch that updates
    // code and the doc that counts it together is reported as wrong. And a
    // hard-coded origin/main exits 128 in a shallow single-branch clone, which
    // took the whole audit to exit 2 before it produced a report.
    let seen;
    derive('grep-files src,tests Rule 3\\.7', { exec: (_c, args) => { seen = args; return ''; } });
    expect(seen).not.toContain('origin/main');
    // `-e` before the pattern, so a regex beginning with `-` is data.
    expect(seen.slice(0, 4)).toEqual(['grep', '-lE', '-e', 'Rule 3\\.7']);
    expect(seen.slice(-3)).toEqual(['--', 'src', 'tests']);
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
    ], { exec: () => 'f\n'.repeat(38) })).toEqual([]);
  });

  it('flags a claim the derivation contradicts', () => {
    const findings = checkClaims([
      { doc: 'CLAUDE.md', pattern: '(\\d+) files under `src/` and',
        derivation: 'grep-files src,tests Rule 3\\.7|§3\\.7' },
    ], { exec: () => 'f\n'.repeat(11) });
    expect(findings).toHaveLength(1);
    expect(findings[0].detail).toBe(
      'claims 38, `grep-files src,tests Rule 3\\.7|§3\\.7` gives 11');
  });
});

// The one assertion that must touch the real tree: that CLAUDE.md's "38 files
// reference Rule 3.7" is still true. It greps the working tree, so it runs in
// a shallow CI clone too; it used to need origin/main and was skipped there.
describe('count claims against the real tree', () => {
  it('confirms the one CLAUDE.md count that is currently correct', () => {
    expect(derive('grep-files src,tests Rule 3\\.7|§3\\.7')).toBe(38);
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

describe('anchor numbering', () => {
  it('does not collide with a naturally suffixed heading', () => {
    // A per-base counter gave `notes` and `notes-1` twice and never emitted
    // `notes-2`, which is what GitHub assigns the third heading -- so a valid
    // link to it read as dead.
    expect(headingAnchors('## Notes\n## Notes-1\n## Notes\n'))
      .toEqual(new Set(['notes', 'notes-1', 'notes-2']));
  });
});

describe('a marker-shaped line that is an example', () => {
  it('is not read as provenance when indented', () => {
    // Trimming before parsing let a four-space code sample count as the
    // marker, suppressed the real missing-marker finding, and --stamp then
    // replaced the example with an unindented live marker.
    const lines = ['# T', '', 'Example:', '',
      '    **Last reviewed:** 2026-01-01 . **Owner:** TBD', '', 'body'];
    expect(findMarker(lines)).toBeNull();
  });

  it('is not read as provenance inside a fenced block', () => {
    const lines = ['# T', '', '```', '**Last reviewed:** 2026-01-01 . **Owner:** TBD',
      '```', '', 'body'];
    expect(findMarker(lines)).toBeNull();
  });

  it('still finds a real unindented marker', () => {
    const lines = ['# T', '', '**Last reviewed:** 2026-01-01', '', 'body'];
    expect(findMarker(lines)).not.toBeNull();
  });

  it('knows which lines a fence covers', () => {
    expect([...fencedLines(['a', '```', 'x', '```', 'b'])].sort()).toEqual([1, 2, 3]);
  });
});

describe('a registry that says two things about one document', () => {
  const reg = (rows) => rows.map(([cls, glob]) => ({ cls, glob, codePaths: [], regions: [] }));

  it('reports equally specific rows that disagree', () => {
    // First-wins meant a stale `X` row could override a later `D` row and
    // silently suppress every content and provenance check.
    expect(classify('docs/a.md', reg([['X', 'docs/a.md'], ['D', 'docs/a.md']])).ambiguous)
      .toBe(true);
  });

  it('is quiet when the duplicate agrees', () => {
    expect(classify('docs/a.md', reg([['D', 'docs/a.md'], ['D', 'docs/a.md']])).ambiguous)
      .toBe(false);
  });

  it('is quiet when one row is genuinely more specific', () => {
    expect(classify('docs/a.md', reg([['X', 'docs/**'], ['D', 'docs/a.md']])).ambiguous)
      .toBe(false);
  });
});

describe('a malformed region regex', () => {
  it('is exit 2, not a documentation finding', () => {
    // new RegExp throws a plain SyntaxError, which the handler rethrows, and
    // Node exits 1 -- the status this CLI documents for findings.
    expect(() => ownedLines('# T\nbody\n', ['line:[unclosed'])).toThrow(AuditError);
    expect(() => ownedLines('# T\nbody\n', ['line:[unclosed']))
      .toThrow(/not a valid regular/);
  });

  it('still accepts a valid one', () => {
    expect(() => ownedLines('# T\nbody\n', ['line:body'])).not.toThrow();
  });
});

describe('drift in the working tree', () => {
  it('counts uncommitted changes under a declared path', () => {
    // The documents and count claims are read from the WORKING TREE, so an
    // uncommitted edit under a declared path makes the documentation stale
    // while the committed range reports nothing -- exactly the run a
    // developer does before committing.
    const exec = (_c, argv) => (argv[0] === 'diff' ? 'M\tsrc/a.ts\n' : '');
    const out = checkChangedSince('d.md', 'abc1234', ['src'], 'HEAD', { exec });
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/1 uncommitted change/);
  });

  it('is quiet when neither history nor the tree moved', () => {
    expect(checkChangedSince('d.md', 'abc1234', ['src'], 'HEAD',
      { exec: () => '' })).toEqual([]);
  });
});

describe('a handled AuditError', () => {
  it('exits 2 without a stack trace', () => {
    // process.exit(2) made the rethrow below it unreachable; switching to
    // exitCode so a piped report can flush made it reachable, so every handled
    // AuditError printed a stack trace and exited 1 -- the status reserved for
    // findings. A regression introduced by the flush fix.
    const res = spawnSync(process.execPath,
      [path.join(process.cwd(), 'scripts/docs-audit.mjs'), '--issues-snapshot', '/nope.json'],
      { encoding: 'utf8', cwd: process.cwd() });
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/^error: /m);
    expect(res.stderr).not.toMatch(/at \w+ \(/);
  });
});

describe('heading anchors and fenced code', () => {
  it('does not invent an anchor from a # line inside a fence', () => {
    // GitHub renders those as code and creates no anchor, so recording one
    // made a link to a nonexistent fragment PASS the dead-anchor check.
    expect(headingAnchors('# Real\n\n```\n# Not A Heading\n```\n'))
      .toEqual(new Set(['real']));
  });
});

describe('duplicate registry rows with different metadata', () => {
  const row = (cls, glob, codePaths, regions) => ({ cls, glob, codePaths, regions });

  it('are ambiguous even when the class agrees', () => {
    // Matching classes were treated as compatible, so the second row's
    // declared paths were silently discarded and changes under them never
    // triggered drift.
    const out = classify('docs/a.md', [
      row('D', 'docs/a.md', ['src/a'], []),
      row('D', 'docs/a.md', ['src/b'], []),
    ]);
    expect(out.ambiguous).toBe(true);
  });

  it('are ambiguous when only the regions differ', () => {
    const out = classify('docs/a.md', [
      row('A', 'docs/a.md', [], ['inventory:*']),
      row('A', 'docs/a.md', [], []),
    ]);
    expect(out.ambiguous).toBe(true);
  });

  it('are quiet when the rows are genuinely identical', () => {
    const out = classify('docs/a.md', [
      row('D', 'docs/a.md', ['src/a'], []),
      row('D', 'docs/a.md', ['src/a'], []),
    ]);
    expect(out.ambiguous).toBe(false);
  });
});

describe('a backticked path used as a link label', () => {
  it('is one finding, not two', () => {
    const ctx = { tracked: new Set(['d.md']), topLevelDirs: new Set(['src']),
      rootFiles: new Set(), knownRoot: new Set(), exts: new Set(['.ts']), basenames: new Set() };
    const out = checkDeadLinks('d.md', 'see [`src/gone.ts`](src/gone.ts)\n', ctx);
    expect(out).toHaveLength(1);
  });

  it('still reports a backticked citation that is not a link label', () => {
    const ctx = { tracked: new Set(['d.md']), topLevelDirs: new Set(['src']),
      rootFiles: new Set(), knownRoot: new Set(), exts: new Set(['.ts']), basenames: new Set() };
    const out = checkDeadLinks('d.md', 'see `src/gone.ts` in passing\n', ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/backticked path/);
  });
});

describe('checkMarkerDates', () => {
  it('rejects an impossible day in either field', () => {
    // MARKER_RE checks the SHAPE only, and the future test is lexicographic,
    // so an impossible date that sorts before today passed both.
    expect(checkMarkerDates('d.md', { date: '2026-02-30', scanned: null }, '2026-09-18')[0])
      .toMatchObject({ severity: 'P2' });
    expect(checkMarkerDates('d.md', { date: '2026-09-01', scanned: '2026-02-30' }, '2026-09-18')[0].detail)
      .toMatch(/last-scanned date/);
  });

  it('reports a future date in either field', () => {
    expect(checkMarkerDates('d.md', { date: '2026-09-01', scanned: '2099-01-01' }, '2026-09-18')[0])
      .toMatchObject({ severity: 'P1' });
  });

  it('is quiet on real past days and on unknown', () => {
    expect(checkMarkerDates('d.md',
      { date: '2026-09-01', scanned: '2026-09-18' }, '2026-09-18')).toEqual([]);
    expect(checkMarkerDates('d.md', { date: 'unknown', scanned: null }, '2026-09-18')).toEqual([]);
  });
});

describe('a whole run over a fixture repository', () => {
  // REPO is derived from the script's own location, so the audit is copied
  // into a throwaway tree and spawned there. This exists because four
  // separate fixes in this file were "covered" by tests that called the
  // helper directly and stayed green when the call site in main() was
  // deleted. A helper nobody calls is not a check.
  const fixture = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-e2e-'));
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.mkdirSync(path.join(dir, 'src'));
    fs.copyFileSync(path.join(process.cwd(), 'scripts/docs-audit.mjs'),
      path.join(dir, 'scripts/docs-audit.mjs'));
    // The character-reference table ships WITH the script and is read at
    // import time, so a fixture that copies one and not the other is a
    // broken install rather than a test tree.
    fs.copyFileSync(path.join(process.cwd(), 'scripts/docs-audit-entities.json'),
      path.join(dir, 'scripts/docs-audit-entities.json'));
    fs.writeFileSync(path.join(dir, 'docs/DOC_REGISTRY.md'),
      '# Registry\n\n## Registry\n\n| Class | Path glob | Declared code paths | Generated regions |\n'
      + '|---|---|---|---|\n| D | docs/DOC_REGISTRY.md | | |\n| D | docs/*.md | src | |\n');
    fs.writeFileSync(path.join(dir, 'src/a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(dir, 'issues.json'),
      JSON.stringify({ stocks: { 1: { state: 'open', reason: '', kind: 'ISSUE' } }, solyra: { 1: { state: 'open', reason: '', kind: 'ISSUE' } } }));
    for (const args of [['init', '-q', '-b', 'work'], ['config', 'user.email', 't@e.com'],
      ['config', 'user.name', 't'], ['config', 'commit.gpgsign', 'false'],
      ['add', '-A'], ['commit', '-qm', 'tree']]) {
      spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    }
    return dir;
  };

  const runAudit = (dir, extra = []) => {
    const res = spawnSync(process.execPath,
      [path.join(dir, 'scripts/docs-audit.mjs'), '--json', '--date', '2026-09-18',
        '--no-contract-check', '--issues-snapshot', path.join(dir, 'issues.json'), ...extra],
      { cwd: dir, encoding: 'utf8' });
    return res;
  };

  it('still emits its findings when a marker names a commit this clone lacks', () => {
    // A syntactically valid SHA the checkout does not HOLD -- an older
    // `Against` commit in a depth-one CI clone -- recorded its P2 and then
    // still reached checkChangedSince, whose `git log <sha>..<baseRef>` exits
    // 128 and raises. One unreadable marker took the WHOLE audit to exit 2
    // with no findings emitted at all. Only spawning the script can see this:
    // it is the interaction between two checks in main().
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'),
      '# D\n\n**Last reviewed:** 2026-01-01 · **Depth:** verified '
      + '· **Against:** `0123456789abcdef0123456789abcdef01234567` '
      + '· **Last scanned:** 2026-01-01\n\nbody\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const res = runAudit(dir);
    expect(res.status, res.stderr).not.toBe(2);
    const report = JSON.parse(res.stdout);
    const said = report.findings.filter(
      (f) => /not a commit this checkout holds/.test(f.detail));
    expect(said).toHaveLength(1);
  });

  it('refuses a verified stamp over a claim the audit disproved', () => {
    // `--verify` writes `Depth: verified` and today's date, which says "I read
    // this and its claims hold". A dead link is a claim this audit has
    // mechanically DISPROVEN, so writing that sentence over it is the tool
    // lying about itself -- and without `--check` the command exited 0 having
    // done exactly that. Only spawning the script can see it: the refusal is
    // an interaction between the content checks and the stamp loop in main().
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'), '# D\n\n[x](missing.md)\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const before = fs.readFileSync(path.join(dir, 'docs/d.md'), 'utf8');
    const res = runAudit(dir, ['--stamp', '--verify', 'docs/d.md']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/disproved a claim/);
    // Nothing was written: the whole batch is refused, not half of it.
    expect(fs.readFileSync(path.join(dir, 'docs/d.md'), 'utf8')).toBe(before);
  });

  it('still records a verified stamp when the document holds up', () => {
    // The refusal has to be narrow. A document whose only findings are the
    // MISSING provenance the stamp itself supplies must still be stampable,
    // or --verify becomes impossible on exactly the documents that need it.
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'), '# D\n\nbody\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const res = runAudit(dir, ['--stamp', '--verify', 'docs/d.md']);
    expect(res.stderr).not.toMatch(/disproved a claim/);
    expect(fs.readFileSync(path.join(dir, 'docs/d.md'), 'utf8'))
      .toMatch(/\*\*Depth:\*\* verified/);
  });

  it('matches a fragment against an anchor case-sensitively', () => {
    // A browser matches a fragment EXACTLY. A folded fallback was added to
    // keep `#Install` working against `<a name="Install">`, and it also
    // accepted `#Install` against a GENERATED `install`, which does not
    // navigate. Through main(), because the comparison needs the target
    // document on disk to read its anchors from.
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'),
      '# Install\n\n<a name="Keep"></a>\n\n'
      + '[a](#install)\n[b](#Install)\n[c](#Keep)\n[d](#keep)\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const report = JSON.parse(runAudit(dir).stdout);
    const dead = report.findings.filter((f) => f.check === 'dead-anchor')
      .map((f) => f.detail.replace(/^.*(#[^:]*).*$/, '$1')).sort();
    // `#install` matches the generated slug and `#Keep` the explicit anchor;
    // the other two match neither, in the two directions the fold hid.
    expect(dead).toEqual(['#Install', '#keep']);
  });

  it('reports an impossible marker date through main()', () => {
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'),
      '# D\n\n**Last reviewed:** 2026-02-30 · **Owner:** TBD\n\nbody\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const res = runAudit(dir);
    expect(res.stdout).toBeTruthy();
    const report = JSON.parse(res.stdout);
    const bad = report.findings.filter((f) => /not a real calendar day/.test(f.detail));
    expect(bad).toHaveLength(1);
    expect(bad[0].severity).toBe('P2');
  });

  it('reports two review markers through main()', () => {
    // The helper had a test; the CALL SITE did not, and a mutation disabling
    // the branch in main() left the suite green. It also had `lines` out of
    // scope there, which only spawning the script could catch.
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'),
      '# D\n\n**Last reviewed:** 2026-01-01\n**Last reviewed:** 2026-02-02\n\nbody\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const res = runAudit(dir);
    expect(res.stdout).toBeTruthy();
    const report = JSON.parse(res.stdout);
    const dup = report.findings.filter((f) => /2 review markers/.test(f.detail));
    expect(dup).toHaveLength(1);
    expect(dup[0].severity).toBe('P2');
  });

  it('reports a future last-scanned date through main()', () => {
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'),
      '# D\n\n**Last reviewed:** 2026-01-01 · **Last scanned:** 2099-01-01\n\nbody\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const report = JSON.parse(runAudit(dir).stdout);
    const future = report.findings.filter((f) => /is in the future/.test(f.detail));
    expect(future.length).toBeGreaterThanOrEqual(1);
    expect(future[0].severity).toBe('P1');
  });

  it('refuses to record a review against a commit that predates the document', () => {
    // The refusal lives in main(), beside the stamp call -- checkVerifyTargets
    // only RENDERS it, and a test that hands it the action by hand stays green
    // when the call site is deleted. Spawning the script is what binds it.
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/new.md'), '# New\n\nbody\n');
    spawnSync('git', ['add', 'docs/new.md'], { cwd: dir });
    const res = runAudit(dir, ['--stamp', '--verify', 'docs/new.md']);
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/baseline predating it/);
    expect(fs.readFileSync(path.join(dir, 'docs/new.md'), 'utf8'))
      .not.toMatch(/Last reviewed:/);
  });

  it('still records a review for a document the commit does contain', () => {
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/new.md'), '# New\n\nbody\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const res = runAudit(dir, ['--stamp', '--verify', 'docs/new.md']);
    expect(res.status).not.toBe(2);
    expect(fs.readFileSync(path.join(dir, 'docs/new.md'), 'utf8'))
      .toMatch(/\*\*Depth:\*\* verified/);
  });

  it('turns an unreadable document into exit 2, not a traceback', () => {
    // A tracked document the audit cannot open threw a plain filesystem error
    // that the handler rethrew, so Node exited 1 -- the status this CLI
    // documents for FINDINGS. Automation could not tell "this documentation
    // has problems" from "the audit never ran".
    //
    // A DIRECTORY at the committed path, not a dangling symlink. The symlink
    // was the original mechanism and is now intercepted by the symlink
    // refusal below -- a different, correct exit 2 that would have left this
    // test passing for the wrong reason. Committing the file first and then
    // replacing it on disk keeps it in the inventory, and readFileSync throws
    // EISDIR regardless of uid, which is what the symlink was chosen for.
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'), '# D\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    fs.rmSync(path.join(dir, 'docs/d.md'));
    fs.mkdirSync(path.join(dir, 'docs/d.md'));
    const res = runAudit(dir);
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/cannot be read/);
    expect(res.stderr).not.toMatch(/at Object|at Module/);
  });

  it('refuses a tracked symlink on READ, not only when stamping', () => {
    // Following one audits the target's machine-local bytes as though they
    // were committed under this path: a clean result another clone does not
    // reproduce, and a read that can leave the checkout entirely. writeStamps
    // already refused them, which made the refusal a property of the COMMAND
    // rather than of the tree -- an ordinary --check had no guard at all.
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/real.md'), '# Real\n');
    fs.symlinkSync('real.md', path.join(dir, 'docs/d.md'));
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const res = runAudit(dir);
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/tracked symlink/);
    expect(res.stderr).not.toMatch(/at Object|at Module/);
  });

  it('is quiet about dates on a well-formed marker', () => {
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'docs/d.md'),
      '# D\n\n**Last reviewed:** 2026-01-01 · **Last scanned:** 2026-09-18\n\nbody\n');
    spawnSync('git', ['add', '-A'], { cwd: dir });
    spawnSync('git', ['commit', '-qm', 'doc'], { cwd: dir });
    const report = JSON.parse(runAudit(dir).stdout);
    expect(report.findings.filter((f) => /calendar day|in the future/.test(f.detail)))
      .toEqual([]);
  });
});


// ── round 10 (ac2efaa) ──────────────────────────────────────────────────────

describe('a snapshot that names both repositories but records nothing', () => {
  it('is bad input, not a clean run', () => {
    // fetchIssueStates refuses to report on a repository that returned zero
    // issues; a snapshot read may not be laxer. With an empty map every cited
    // issue becomes a fabricated "could not be resolved" P2 and --check exits
    // 1 for findings that do not exist -- the shape Rule 4 refuses.
    const f = path.join(os.tmpdir(), `snap-empty-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify({ solyra: {}, stocks: {} }));
    expect(() => loadIssuesSnapshot(f)).toThrow(AuditError);
    expect(() => loadIssuesSnapshot(f)).toThrow(/empty "solyra" map/);
    fs.unlinkSync(f);
  });

  it('still accepts a map with one validated record', () => {
    const f = path.join(os.tmpdir(), `snap-one-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify({
      solyra: { 1: { state: 'open' } }, stocks: { 2: { state: 'closed' } },
    }));
    expect(loadIssuesSnapshot(f).solyra['1'].state).toBe('open');
    fs.unlinkSync(f);
  });
});

describe('a committed change of git object type', () => {
  it('counts as drift, as the same change already does uncommitted', () => {
    // A regular file becoming a symlink is `T` under --diff-filter=AMDRT. The
    // uncommitted branch counts T; the committed branch did not, so the change
    // went invisible the moment it was committed and the document reads
    // current over a surface that moved.
    expect(driftCommits('abc123456789\tmsg\nT\tsrc/a.ts\n')).toEqual(['abc123456789\tmsg']);
  });

  it('still ignores a pure rename', () => {
    expect(driftCommits('abc123456789\tmsg\nR100\tsrc/a.ts\tsrc/b.ts\n')).toEqual([]);
  });
});

describe('a link example inside a fence', () => {
  const ctx = linkContext(new Set(['src/a.ts']), new Set(), []);

  it('is an example, not a dead link', () => {
    // A living document showing Markdown syntax is not citing a path. The
    // marker and heading checks already skip fenced lines; this one did not,
    // so a syntax example failed --check.
    const doc = '# T\n\n```md\n[x](missing.md)\n`nowhere/gone.ts`\n```\n\nSee `src/a.ts`.\n';
    expect(checkDeadLinks('d.md', doc, ctx)).toEqual([]);
  });

  it('still flags the same link outside the fence', () => {
    expect(checkDeadLinks('d.md', '# T\n\n[x](missing.md)\n', ctx)).toHaveLength(1);
  });
});

describe('an issue URL in a casing GitHub accepts', () => {
  const states = { solyra: { 8: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };

  it('resolves against the same state map', () => {
    // github.com/teneikaaskew/Solyra/issues/8 is the same issue. A
    // case-sensitive match dropped the blocker entirely; adding only the `i`
    // flag would index states['Solyra'] and fabricate "could not be resolved".
    const out = checkClosedIssues('d.md',
      'blocked by https://github.com/teneikaaskew/Solyra/issues/8\n', states);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('P1');
    expect(out[0].ref).toBe('solyra#8');
  });
});

describe('a negated blocking cue', () => {
  const states = { solyra: { 8: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
  const cite = (prose) => checkClosedIssues('d.md',
    `${prose} https://github.com/TeneikaAskew/solyra/issues/8\n`, states);

  it('is not a citation of live work', () => {
    // An unbounded substring match saw `blocked by` inside `not blocked by`
    // and `blocking` inside `non-blocking`, so prose stating the opposite
    // produced a P1 and could fail --check.
    expect(cite('This is not blocked by')).toEqual([]);
    expect(cite('nonblocking:')).toEqual([]);
    expect(cite('A non-blocking note on')).toEqual([]);
    expect(cite('No longer blocking:')).toEqual([]);
  });

  it('still reads the unnegated forms as one', () => {
    expect(cite('blocked by')).toHaveLength(1);
    expect(cite('Blocking:')).toHaveLength(1);
    expect(cite('Work not started on')).toHaveLength(1);
    expect(cite('Still open:')).toHaveLength(1);
  });
});

describe('a malformed claim pattern', () => {
  it('is exit 2, not a documentation finding', () => {
    // Same input-versus-finding split the region-regex path already makes:
    // a registry typo is bad input, and a plain SyntaxError walks past the
    // AuditError handler and exits 1.
    expect(() => checkClaims([{ doc: 'README.md', pattern: '[unclosed', derivation: 'x' }]))
      .toThrow(AuditError);
    expect(() => checkClaims([{ doc: 'README.md', pattern: '[unclosed', derivation: 'x' }]))
      .toThrow(/not a valid regular/);
  });

  it('applies to a list-len derivation too', () => {
    expect(() => derive('list-len README.md [unclosed')).toThrow(AuditError);
    expect(() => derive('list-len README.md [unclosed')).toThrow(/not a valid regular/);
  });
});

describe('reference-style Markdown links', () => {
  const ctx = linkContext(new Set(['src/a.ts']), new Set(), []);

  it('flags a definition whose destination does not exist', () => {
    // `[guide][g]` plus `[g]: missing.md` matches neither MD_LINK_RE nor the
    // backticked-path pass, so the audit read clean over a link that is broken
    // for every reader.
    const out = checkDeadLinks('d.md', '# T\n\nSee [guide][g].\n\n[g]: missing.md\n', ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('missing.md');
  });

  it('leaves a bracket pair that is not a reference use alone', () => {
    // The USE half is deliberately unchecked, and that is a measurement:
    // across the stocks twin's 322 markdown documents there is 1 reference
    // definition and 204 bracket pairs, nearly all issue-title tags. Flagging
    // undefined uses produced 79 fabricated findings there.
    const doc = '# T\n\n| [#906](https://x/906) | P0 | [P0][Replay] Quarantine it |\n';
    expect(checkDeadLinks('d.md', doc, ctx)).toEqual([]);
  });

  it('keeps an inline dead anchor at its original wording', () => {
    // Sharing the message builder with reference links relabelled every inline
    // anchor finding `relative link ->`, churning 19 findings on the stocks
    // twin for no behaviour change.
    const real = linkContext(new Set(['README.md']), new Set(), []);
    const out = checkDeadLinks('d.md', '# T\n\n[x](README.md#no-such-heading-here)\n', real);
    expect(out).toHaveLength(1);
    expect(out[0].detail.startsWith('link -> README.md#no-such-heading-here')).toBe(true);
  });

  it('still carries a blocking cue on the plural "Open issues"', () => {
    // Word boundaries dropped `Open issues`: the trailing `s` leaves no
    // boundary after `issue`.
    expect(hasBlockingCue('| Open issues | [#838](x) |')).toBe(true);
    expect(hasBlockingCue('one open issue remains')).toBe(true);
  });

  it('is quiet when the definition resolves', () => {
    expect(checkDeadLinks('d.md', '# T\n\nSee [guide][g].\n\n[g]: src/a.ts\n', ctx)).toEqual([]);
  });

  it('leaves a definition pointing off the web alone', () => {
    expect(checkDeadLinks('d.md', '# T\n\nSee [g][g].\n\n[g]: https://example.com/x\n', ctx))
      .toEqual([]);
  });
});

describe('a registry glob that covers nothing', () => {
  it('is a finding, as an exact declaration covering nothing already is', () => {
    // `.claude/agents/*.md` can stop matching any tracked path -- every agent
    // deleted, or the glob mistyped -- and no document ever reaches classify()
    // to expose the inert declaration.
    const rows = [{ cls: 'A', glob: '.claude/agents/*.md', codePaths: [], regions: [] }];
    const out = checkRegistryPaths(new Set(['docs/x.md']), rows);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/matches no tracked document/);
  });

  it('is quiet when the glob covers something', () => {
    const rows = [{ cls: 'A', glob: 'docs/*.md', codePaths: [], regions: [] }];
    expect(checkRegistryPaths(new Set(['docs/x.md']), rows)).toEqual([]);
  });
});

// ── round 11 (59395d7) ──────────────────────────────────────────────────────

describe('an inline link carrying a title', () => {
  const ctx = linkContext(new Set(['src/a.ts']), new Set(), []);

  it('is still a link, and still checked', () => {
    // `[guide](missing.md "Guide")` is standard CommonMark. Requiring `)`
    // straight after the destination meant the pattern did not match at all,
    // so the audit reported clean over a missing target.
    const out = checkDeadLinks('d.md', '# T\n\n[guide](missing.md "Guide")\n', ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('missing.md');
  });

  it('keeps its fragment checkable', () => {
    const real = linkContext(new Set(['README.md']), new Set(), []);
    const out = checkDeadLinks('d.md', "# T\n\n[x](README.md#no-such-heading 'T')\n", real);
    expect(out).toHaveLength(1);
    expect(out[0].check).toBe('dead-anchor');
  });

  it('is quiet when the titled target resolves', () => {
    expect(checkDeadLinks('d.md', '# T\n\n[a](src/a.ts "The helper")\n', ctx)).toEqual([]);
  });
});

describe('a blocker example inside a fence', () => {
  const states = { solyra: { 8: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };

  it('is an example, not a citation', () => {
    // --check gates on closed-issue findings, so a document demonstrating what
    // a blocking citation looks like failed the audit over its own example.
    const doc = '# T\n\n```md\nBlocked by https://github.com/TeneikaAskew/solyra/issues/8\n```\n';
    expect(checkClosedIssues('d.md', doc, states)).toEqual([]);
  });

  it('still reports the same citation outside the fence', () => {
    const doc = '# T\n\nBlocked by https://github.com/TeneikaAskew/solyra/issues/8\n';
    expect(checkClosedIssues('d.md', doc, states)).toHaveLength(1);
  });
});

describe('a Claims row naming a document that cannot be read', () => {
  it('is exit 2, not a documentation finding', () => {
    // Same input-versus-finding split as the malformed pattern beside it: a
    // bare readFileSync throws a filesystem Error, which the handler rethrows,
    // and Node exits 1 with a stack trace.
    expect(() => checkClaims([{ doc: 'docs/gone.md', pattern: '(\\d+) things',
      derivation: 'grep-count src x' }])).toThrow(AuditError);
    // The MESSAGE changed when claim documents gained the tracked
    // precondition every derivation target already had: a document that is
    // gone is refused for not being tracked, one step earlier than the read.
    // Both are exit 2 rather than a finding, which is what this test is for;
    // the read error still covers a document that IS tracked and cannot be
    // read.
    expect(() => checkClaims([{ doc: 'docs/gone.md', pattern: '(\\d+) things',
      derivation: 'grep-count src x' }])).toThrow(/not tracked/);
  });
});

describe('a stale generated type', () => {
  it('is reported against the generated file, not the vendored snapshot', () => {
    // sync-api-contract emits a `stale`/`missing` verdict for
    // src/types/stocksOpenApi.gen.d.ts too, and routing it to the snapshot
    // told the reader the wrong invariant had failed.
    const spawn = () => ({ status: 1, stdout: '',
      stderr: '[api-contract] src/types/stocksOpenApi.gen.d.ts is stale against the '
            + 'snapshot — run: npm run contract:sync\n' });
    const out = checkContractSync({ spawn });
    expect(out).toHaveLength(1);
    expect(out[0].doc).toBe('src/types/stocksOpenApi.gen.d.ts');
    expect(out[0].detail).not.toMatch(/no longer matches stocks/);
  });

  it('still reports a stale snapshot against the snapshot', () => {
    const spawn = () => ({ status: 1, stdout: '',
      stderr: '[api-contract] vendored snapshot is STALE against stocks. Run: npm run '
            + 'contract:sync\n' });
    const out = checkContractSync({ spawn });
    expect(out).toHaveLength(1);
    expect(out[0].doc).toBe('tests/fixtures/stocks-openapi.json');
  });
});

describe("the README row's declared code paths", () => {
  it('cover the test surfaces the README documents', () => {
    // README.md documents the Playwright layout, the e2e launcher and the
    // three TypeScript projects. With only package.json and vite.config.ts
    // declared, all of that could go stale under a clean freshness marker.
    const row = loadRegistry(fs.readFileSync(path.join(process.cwd(), 'docs/DOC_REGISTRY.md'),
      'utf8')).find((r) => r.glob === 'README.md');
    for (const p of ['playwright.config.ts', 'scripts/e2e-server.mjs', 'tests',
      'tsconfig.json']) {
      expect(row.codePaths).toContain(p);
    }
  });
});

describe('the README table of commands', () => {
  it('describes the scope npm test actually runs', () => {
    // vite.config.ts includes scripts/docs-audit.test.mjs, so "only
    // src/**/*.test.ts{,x}" and "all colocated under src/" were both false.
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    expect(readme).toMatch(/scripts\/docs-audit\.test\.mjs/);
    expect(readme).not.toMatch(/Vitest unit tests \(`src\/\*\*\/\*\.test\.ts\{,x\}`\)/);
  });
});

// ── round 12 (c08f101) ──────────────────────────────────────────────────────

describe('a fence closing on an incompatible delimiter', () => {
  it('stays open until a matching one', () => {
    // A `~~~` line inside a ``` example is CODE. Toggling on any fence-looking
    // line closed the block there, so the rest of the example was read as
    // prose and the prose after the real closing fence was read as code.
    expect([...fencedLines(['```md', '~~~ example', '```', 'real prose'])])
      .toEqual([0, 1, 2]);
  });

  it('ignores an info string on the opener and requires a bare closer', () => {
    expect([...fencedLines(['~~~ts', 'code', '~~~', 'prose'])]).toEqual([0, 1, 2]);
  });
});

describe('a heading with closing ATX markers', () => {
  it('anchors on the text alone', () => {
    // `## Install ##` renders as `Install`; GitHub's anchor is `#install`.
    // Passing `Install ##` to headingSlug recorded `install-`, so a valid link
    // read as dead.
    expect([...headingAnchors('## Install ##\n')]).toEqual(['install']);
  });
});

describe('two citations on one line disagreeing about live work', () => {
  const U = (n) => `https://github.com/TeneikaAskew/solyra/issues/${n}`;
  const states = { solyra: {
    1: { state: 'closed', reason: 'completed', kind: 'ISSUE' },
    2: { state: 'open', reason: '', kind: 'ISSUE' } } };

  it('reads each against its own clause', () => {
    // One boolean for the whole line gave the closed #1 a P1 from #2's cue,
    // on a line that says in so many words that #1 no longer blocks.
    const line = `#1 ${U(1)} is no longer blocking; #2 ${U(2)} is still open\n`;
    expect(checkClosedIssues('d.md', line, states)).toEqual([]);
  });

  it('still falls back to the line when the clause carries no cue', () => {
    // A table row puts the cue and the citations in different cells, and
    // `| Open issues | #1 |` is a real finding. Scoping strictly to the clause
    // would lose it -- it is how stocks#838 is reported on the sibling tree.
    const line = `| Open issues | [#1](${U(1)}) |\n`;
    expect(checkClosedIssues('d.md', line, states)).toHaveLength(1);
  });
});

describe('a Markdown destination that is not a repository path', () => {
  const ctx = linkContext(new Set(['src/a.ts']), new Set(), []);

  it.each(['tel:+15551234', 'ftp://example.com/x', 'HTTPS://example.com/a',
    '//example.com/page'])('is left alone: %s', (tgt) => {
    // A narrow, case-sensitive `https?:|mailto:` allowlist sent all four down
    // the repository-path branch and produced a P2 for a file never meant to
    // exist locally.
    expect(checkDeadLinks('d.md', `# T\n\n[x](${tgt})\n`, ctx)).toEqual([]);
  });

  it('still resolves a genuine relative path', () => {
    expect(checkDeadLinks('d.md', '# T\n\n[x](missing.md)\n', ctx)).toHaveLength(1);
  });
});

describe('a backticked path spelled with dot segments', () => {
  const ctx = linkContext(new Set(['src/a.ts']), new Set(), []);

  it('does not hide a deleted file behind a leading ./', () => {
    // `./src/removed.ts` has the top-level component `.`, which is in no
    // topLevelDirs, so the citation was skipped and the deletion was invisible.
    const out = checkDeadLinks('d.md', '# T\n\n`./src/removed.ts`\n', ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('./src/removed.ts');
  });

  it('resolves a path that climbs and comes back', () => {
    expect(checkDeadLinks('d.md', '# T\n\n`docs/../src/a.ts`\n', ctx)).toEqual([]);
  });
});

describe('a local citation sharing a line with the word stocks', () => {
  const ctx = linkContext(new Set(['src/a.ts']), new Set(), []);

  it('is this repo’s to resolve when nothing names the sibling', () => {
    // ``src/removed.ts` formats stocks for the dashboard` is about the product
    // noun. A bare \\bstocks\\b handed the citation to the sibling repo and
    // skipped the existence check.
    const out = checkDeadLinks('d.md',
      '# T\n\n`src/removed.ts` formats stocks for the dashboard\n', ctx);
    expect(out).toHaveLength(1);
  });

  it.each(['https://github.com/TeneikaAskew/stocks/blob/main/x.py',
    'the stocks repo', 'a stocks PR', 'stocks/lib/x.py'])(
    'still defers on explicit evidence: %s',
    (evidence) => {
      expect(checkDeadLinks('d.md', `# T\n\n\`src/removed.ts\` -- ${evidence}\n`, ctx))
        .toEqual([]);
    });
});

describe('two complete blocks of one named region', () => {
  it('are both owned, not just the first', () => {
    // Unowned complements are allowed for mixed Class A documents, so the
    // second machine-written block was silently classified as hand-written
    // prose and findings inside it were routed to the wrong owner.
    const text = ['# T', '<!-- BEGIN GEN -->', 'a', '<!-- END GEN -->', 'prose',
      '<!-- BEGIN GEN -->', 'b', '<!-- END GEN -->'].join('\n');
    const { owned } = ownedLines(text, ['mark:GEN']);
    expect([...owned].sort((x, y) => x - y)).toEqual([2, 3, 4, 6, 7, 8]);
  });
});

describe('a prose region naming a prompt that is gone', () => {
  it('is a registry finding, not a silently model-owned document', () => {
    // The declaration marked the region matched without checking the path, so
    // the complement was labelled model-owned, stamping was disabled, and
    // nothing reported the vanished prompt.
    const rows = [{ cls: 'A', glob: 'docs/x.md', codePaths: [],
      regions: ['prose:.claude/prompts/gone.md'] }];
    const out = checkRegistryPaths(new Set(['docs/x.md']), rows);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/names a prompt that is not in the audited tree/);
  });

  it('is quiet when the prompt exists', () => {
    const rows = [{ cls: 'A', glob: 'docs/x.md', codePaths: [],
      regions: ['prose:p/own.md'] }];
    expect(checkRegistryPaths(new Set(['docs/x.md', 'p/own.md']), rows)).toEqual([]);
  });
});

// ── round 13 (ab0debc) ──────────────────────────────────────────────────────

describe('a fenced H1 example before the real title', () => {
  it('is not the document heading', () => {
    // markerWindow then missed a marker after the REAL heading, and --stamp
    // inserted a live marker inside the code block: the example corrupted, the
    // document still with no rendered provenance.
    expect(h1Index(['```md', '# Example', '```', '# Real Title'])).toBe(3);
  });
});

describe('a deleted root file cited as a link label', () => {
  it('is one finding, not two', () => {
    // inLinkLabel was consulted only by the slash-path loop, so the Markdown
    // pass and the root-file pass each reported the same missing file.
    const ctx = linkContext(new Set(['docs/d.md', 'src/a.ts']),
      new Set(['vite.config.ts']), []);
    const out = checkDeadLinks('docs/d.md',
      '# T\n\nSee [`vite.config.ts`](../vite.config.ts).\n', ctx);
    expect(out).toHaveLength(1);
  });
});

describe('an exact registry row overlapped by a longer wildcard', () => {
  it('wins, because length is not specificity', () => {
    // `docs/*a*.md` is longer than `docs/a.md`, so an exclusion row outranked
    // the living-document row it overlaps and suppressed every content, marker
    // and drift check for it -- without setting `ambiguous`, because the
    // lengths differ.
    const reg = loadRegistry('## Registry\n\n'
      + '| Class | Path glob | Declared code paths | Generated regions |\n|---|---|---|---|\n'
      + '| X | docs/*a*.md | | |\n| D | docs/a.md | src | |\n');
    const got = classify('docs/a.md', reg);
    expect(got.cls).toBe('D');
    expect(got.ambiguous).toBe(false);
  });

  it('ranks a wildcard matching more literal characters higher', () => {
    // Index 2, not 1: the tuple gained a `**`-depth field ahead of the
    // literal count so a recursive glob ranks below a single-segment one that
    // also matches. The comparison this test makes is unchanged.
    expect(globSpecificity('docs/api/*.md')[2])
      .toBeGreaterThan(globSpecificity('docs/*.md')[2]);
    // The new field, asserted directly.
    expect(globSpecificity('docs/**/*.md')[1])
      .toBeLessThan(globSpecificity('docs/*.md')[1]);
  });
});

describe('a generated header before the document H1', () => {
  it('does not refuse stamping, because the marker lands after the H1', () => {
    // A mixed Class A document with a complete generated header BEFORE its H1
    // has a minimum owned line below h1 + 2 by construction, so a legitimate
    // --verify ended as an AuditError though nothing generated is touched.
    const doc = '<!-- BEGIN gen -->\nheader\n<!-- END gen -->\n\n# T\n\nProse.\n';
    const { owned } = ownedLines(doc, ['mark:gen']);
    expect(stampGuard(doc, owned)).toBeNull();
  });
});

describe('a snapshot key that is not an issue number', () => {
  it('is bad input, not a map of unresolvable citations', () => {
    // `{"junk": {...}}` passed the nonempty-map guard and the row check, then
    // resolved no citation at all, so every numeric reference became a
    // fabricated "could not be resolved" P2.
    const f = path.join(os.tmpdir(), `snap-key-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify({
      solyra: { junk: { state: 'open' } }, stocks: { 1: { state: 'open' } } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(/not an issue number/);
    fs.unlinkSync(f);
  });

  it.each(['0', '01', '-1', '1.0'])('rejects the non-canonical key %s', (key) => {
    const f = path.join(os.tmpdir(), `snap-key2-${process.pid}.json`);
    fs.writeFileSync(f, JSON.stringify({
      solyra: { [key]: { state: 'open' } }, stocks: { 1: { state: 'open' } } }));
    expect(() => loadIssuesSnapshot(f)).toThrow(AuditError);
    fs.unlinkSync(f);
  });
});

describe('a list-len target that cannot be read', () => {
  it('is exit 2, not a documentation finding', () => {
    expect(() => derive('list-len docs/gone.md ^(.*)$')).toThrow(AuditError);
    expect(() => derive('list-len docs/gone.md ^(.*)$')).toThrow(/could not be read/);
  });
});

describe("the UI-SCREENS row's declared code paths", () => {
  it('cover src/App.tsx, which its opening claims are derived from', () => {
    // docs/UI-SCREENS.md derives its route count, auth topology, lazy loading,
    // error boundary and React Query defaults from src/App.tsx, so a routing
    // or provider change there must be able to trigger changed-since.
    const row = loadRegistry(fs.readFileSync(path.join(process.cwd(), 'docs/DOC_REGISTRY.md'),
      'utf8')).find((r) => r.glob === 'docs/UI-SCREENS.md');
    expect(row.codePaths).toContain('src/App.tsx');
  });
});

describe('the ref the link history is read from', () => {
  it('prefers the target branch over this one', () => {
    // resolveBaseRef prefers HEAD, so baseTracked was the same tree as
    // `tracked` and carried no history: once a root file or the last file
    // under a top-level directory was deleted in an earlier branch commit,
    // knownRootFiles and topLevelDirs forgot it had ever belonged here and
    // citations of the deleted path went silently uncheckable -- at the exact
    // moment they went dead.
    expect(HISTORY_REF_CANDIDATES[0]).toBe('origin/main');
    expect(HISTORY_REF_CANDIDATES).toContain('HEAD');
    expect(HISTORY_REF_CANDIDATES.indexOf('HEAD'))
      .toBeGreaterThan(HISTORY_REF_CANDIDATES.indexOf('origin/main'));
  });

  // Hermetic, because the answer depends on the CHECKOUT. The first version of
  // this asserted the history ref differs from HEAD "on a branch ahead of
  // main", which held in a full clone and turned CI red: actions/checkout
  // fetches the PR ref without a remote-tracking `origin/main`, so the
  // candidate list legitimately falls through to HEAD there. The behaviour was
  // right; the test had baked in one checkout shape.
  const spawnWith = (available) => (_cmd, argv) => ({
    status: available.includes(argv[argv.length - 1].replace(/\^\{tree\}$/, '')) ? 0 : 1,
    stdout: '',
  });

  it('uses the target branch when it resolves', () => {
    expect(resolveBaseRef(HISTORY_REF_CANDIDATES,
      { spawn: spawnWith(['origin/main', 'main', 'HEAD']) })).toBe('origin/main');
  });

  it('falls back to this branch in a checkout with no main, as CI has', () => {
    expect(resolveBaseRef(HISTORY_REF_CANDIDATES,
      { spawn: spawnWith(['HEAD']) })).toBe('HEAD');
  });

  it('still recognises a root file the history ref had and the tree does not', () => {
    // The mechanism the ref choice exists to feed.
    const ctx = linkContext(new Set(['src/a.ts']), new Set(['vite.config.ts']), []);
    expect(checkDeadLinks('d.md', 'See `vite.config.ts`.\n', ctx)).toHaveLength(1);
  });
});

// ── round 14 (f9f1221) ──────────────────────────────────────────────────────

describe('an ATX heading with up to three leading spaces', () => {
  it('is the document H1', () => {
    // Without it a document written that way had no H1 as far as this module
    // was concerned, so --stamp returned `skipped-no-h1` and the
    // missing-marker finding it reports could never be repaired.
    expect(h1Index(['   # Guide', 'body'])).toBe(0);
  });

  it('is not a heading at four spaces, which is code', () => {
    expect(h1Index(['    # Not a heading', 'body'])).toBeNull();
  });
});

describe('a link destination that is not a bare path', () => {
  const ctx = linkContext(new Set(['README.md', 'docs/guide.md']), new Set(), []);

  it('resolves through angle brackets', () => {
    // `[g](<guide.md>)` is the standard form for a destination with spaces;
    // the brackets are delimiters, not part of the path.
    expect(checkDeadLinks('d.md', '# T\n\n[g](<README.md>)\n', ctx)).toEqual([]);
  });

  it('resolves past a query string', () => {
    // The tracked-file lookup searched for the literal `guide.md?plain=1`.
    expect(checkDeadLinks('docs/d.md', '# T\n\n[s](guide.md?plain=1)\n', ctx)).toEqual([]);
  });

  it('still reports a missing target written either way', () => {
    expect(checkDeadLinks('d.md', '# T\n\n[g](<gone.md>)\n', ctx)).toHaveLength(1);
    expect(checkDeadLinks('d.md', '# T\n\n[g](gone.md?x=1)\n', ctx)).toHaveLength(1);
  });
});

describe('a four-space-indented code block', () => {
  const ctx = linkContext(new Set(['src/a.ts']), new Set(), []);

  it('is an example, like a fenced one', () => {
    expect(checkDeadLinks('d.md', '# T\n\nExample:\n\n    [x](missing.md)\n', ctx)).toEqual([]);
  });

  it('does not swallow a list continuation', () => {
    // Indented code cannot interrupt a list, and masking list continuations
    // would turn real findings invisible -- the worse direction.
    const doc = '# T\n\n- item\n\n    [x](missing.md)\n';
    expect(checkDeadLinks('d.md', doc, ctx)).toHaveLength(1);
  });

  it('is code after a table and a blank line, not a table continuation', () => {
    // This assertion used to be inverted. A blank line TERMINATES the table,
    // and after it four spaces is an indented code block whatever came
    // before -- so the example renders as code and a gating finding taken
    // from it is false. The old rule refused to mask any run whose preceding
    // content began with `|`, blank line or not.
    const doc = '# T\n\n| a | b |\n|---|---|\n\n    [x](missing.md)\n';
    expect(checkDeadLinks('d.md', doc, ctx)).toHaveLength(0);
    // Directly under the last row, with no blank line, it is still the
    // table's own continuation and the link is real.
    const tight = '# T\n\n| a | b |\n|---|---|\n    [x](missing.md)\n';
    expect(checkDeadLinks('d.md', tight, ctx)).toHaveLength(1);
  });
});

describe('a marker carrying a malformed owned field', () => {
  it('is not rewritten', () => {
    // MARKER_RE is not end-anchored, so `**Last scanned:** bad` matches on the
    // `Last reviewed` prefix and the malformed field lands in the tail. A
    // restamp added a canonical `Last scanned` beside it and kept the broken
    // one, leaving the document carrying two.
    const doc = '# T\n\n**Last reviewed:** 2026-01-01 · **Last scanned:** bad\n';
    const got = stamp(doc, '2026-09-18', 'scanned', 'abc1234', false);
    expect(got.action).toBe('skipped-malformed-marker');
    expect(got.text).toBe(doc);
  });

  it('still restamps a well-formed one', () => {
    const doc = '# T\n\n**Last reviewed:** 2026-01-01\n';
    expect(stamp(doc, '2026-09-18', 'scanned', 'abc1234', false).action).toBe('updated');
  });
});

describe('a list-len pattern with no capture group', () => {
  it('is exit 2, not a TypeError', () => {
    expect(() => derive('list-len README.md ^#')).toThrow(AuditError);
    expect(() => derive('list-len README.md ^#')).toThrow(/no capture group 1/);
  });
});

describe('an anchor target that is tracked but unreadable', () => {
  it('fails loudly rather than skipping the anchor check', () => {
    // Storing null made the anchor check skip silently, so a link to a
    // fragment that does not exist passed clean over a target the audit never
    // actually inspected.
    const ctx = linkContext(new Set(['docs/never-on-disk.md']), new Set(), []);
    expect(() => checkDeadLinks('d.md', '# T\n\n[x](docs/never-on-disk.md#nope)\n', ctx))
      .toThrow(/tracked but could not be read/);
  });
});

describe("the FRONTEND.md row's declared code paths", () => {
  it('cover the surfaces the document inventories', () => {
    // FRONTEND.md inventories src/hooks, src/stores, src/lib and src/types and
    // derives its routing topology from src/App.tsx, so a change to any of
    // them must be able to trigger changed-since.
    const row = loadRegistry(fs.readFileSync(path.join(process.cwd(), 'docs/DOC_REGISTRY.md'),
      'utf8')).find((r) => r.glob === 'FRONTEND.md');
    for (const p of ['src/hooks', 'src/stores', 'src/lib', 'src/types', 'src/App.tsx']) {
      expect(row.codePaths).toContain(p);
    }
  });
});

// ── round 16 (18a7b87) ──────────────────────────────────────────────────────

describe('an indented section heading', () => {
  it('ends the document-level marker window', () => {
    // Without it, a marker inside `  ## Thing` satisfied findMarker --
    // suppressing the missing top-level provenance finding and making --stamp
    // update the section's marker instead of inserting the document's.
    const lines = ['# T', 'body', '  ## Section', '**Last reviewed:** 2026-01-01', 'x'];
    expect(markerWindow(lines).to).toBe(2);
    expect(findMarker(lines)).toBeNull();
  });
});

describe('heading forms other than column-zero ATX', () => {
  it('offer anchors too', () => {
    // A column-zero ATX-only scan recorded no anchor for an indented heading
    // or a setext one, so a valid link to either was a dead-anchor P2.
    expect([...headingAnchors('  ## Install\n\nOther\n=====\n')].sort())
      .toEqual(['install', 'other']);
  });

  it('does not read a table delimiter as a setext heading', () => {
    expect([...headingAnchors('| a |\n|---|\n')]).toEqual([]);
  });
});

describe('two review markers in one document', () => {
  it('are a contradiction, not a first-wins', () => {
    const lines = ['# T', '', '**Last reviewed:** 2026-01-01',
      '**Last reviewed:** 2026-02-02', 'body'];
    expect(findMarkers(lines)).toEqual([2, 3]);
  });

  it('is one marker when there is one', () => {
    expect(findMarkers(['# T', '', '**Last reviewed:** 2026-01-01', 'body'])).toEqual([2]);
  });
});

describe('a fenced example of a registry row', () => {
  it('is documentation, not a rule', () => {
    // The example registered as live -- producing missing-path findings for
    // paths it never declared -- and a heading inside it could switch
    // `inRegistry` off and skip every real row after the fence.
    const head = '| Class | Path glob | Declared code paths | Generated regions |\n|---|---|---|---|\n';
    const text = `## Registry\n\n\`\`\`\n${head}| D | docs/EXAMPLE.md | src |  |\n`
      + `\`\`\`\n\n${head}| D | docs/real.md | src |  |\n`;
    expect(loadRegistry(text).map((r) => r.glob)).toEqual(['docs/real.md']);
  });
});

describe('a duplicate reference-link definition', () => {
  it('resolves against the first, as CommonMark does', () => {
    const ctx = linkContext(new Set(['README.md']), new Set(), []);
    const out = checkDeadLinks('d.md',
      '# T\n\nSee [g][g].\n\n[g]: missing.md\n[g]: README.md\n', ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toContain('missing.md');
  });
});

describe('a claim pattern whose capture is not a number', () => {
  it('is exit 2, not a fabricated count finding', () => {
    // `Number(undefined)` is NaN, and the audit emitted a count-claim finding
    // with exit 1 rather than treating the registry row as invalid input.
    expect(() => checkClaims([{ doc: 'README.md', pattern: 'Solyra',
      derivation: 'grep-count src x' }])).toThrow(/capture group 1/);
  });
});

describe('a derivation naming a path that does not exist', () => {
  it('is exit 2, not a zero', () => {
    // `git grep` exits 1 for "no matches" AND for a bad path, so the
    // derivation silently produced 0: a false clean result for a document
    // claiming zero, and a fabricated finding otherwise.
    expect(() => derive('grep-count src/nope-not-here thing')).toThrow(AuditError);
    expect(() => derive('grep-count src/nope-not-here thing')).toThrow(/does not exist/);
  });

  it('still counts a real zero as a zero', () => {
    expect(derive('grep-count src zzz-no-such-string-zzz')).toBe(0);
  });
});

describe('a named region that repeats its opener', () => {
  it('is reported rather than silently paired', () => {
    // First-opener-to-next-closer paired the first with that closer, set
    // `hit`, and never noticed the second -- so an `exhaustive` Class A file
    // could report nothing and classify the whole malformed span as generated.
    const text = ['# T', '<!-- BEGIN GEN -->', 'a', '<!-- BEGIN GEN -->', 'b',
      '<!-- END GEN -->'].join('\n');
    const { orphans } = ownedLines(text, ['mark:GEN']);
    expect(orphans.join(' ')).toMatch(/repeated opener/);
  });

  it('reports an opener with no closer', () => {
    const text = ['# T', '<!-- BEGIN GEN -->', 'a'].join('\n');
    expect(ownedLines(text, ['mark:GEN']).orphans.join(' ')).toMatch(/no closer/);
  });

  it('is quiet for two well-formed blocks', () => {
    const text = ['# T', '<!-- BEGIN GEN -->', 'a', '<!-- END GEN -->', 'prose',
      '<!-- BEGIN GEN -->', 'b', '<!-- END GEN -->'].join('\n');
    expect(ownedLines(text, ['mark:GEN']).orphans).toEqual([]);
  });
});

describe('the contract audit subprocess', () => {
  it('chooses the upstream it reports on', () => {
    // STOCKS_OPENAPI_FILE / _REF would point sync-api-contract at a local file
    // or a non-main ref while this check reports the invariant as "matches
    // stocks main" -- a clean Class A result for a stale snapshot.
    let passed = null;
    checkContractSync({ spawn: (_c, _a, opts) => { passed = opts.env; return { status: 0 }; } });
    expect(passed).toBeTruthy();
    expect('STOCKS_OPENAPI_FILE' in passed).toBe(false);
    expect('STOCKS_OPENAPI_REF' in passed).toBe(false);
  });
});

// ── round 18 (b5e17bd) ──────────────────────────────────────────────────────

describe('a setext H1', () => {
  it('is the document heading', () => {
    // Without it the audit reported a missing marker while --stamp answered
    // `skipped-no-h1`, so the command could not repair its own finding.
    expect(h1Index(['Title', '=====', 'body'])).toBe(0);
  });

  it('is not a level-two setext', () => {
    expect(h1Index(['Title', '-----', 'body'])).toBeNull();
  });
});

describe('an intraword underscore in a heading', () => {
  it('survives into the anchor, as GitHub keeps it', () => {
    // Stripping every underscore turned `## API_FIELD` into `apifield`, so a
    // valid link to `#api_field` read as a dead anchor while an incorrect
    // `#apifield` was accepted -- wrong in both directions at once.
    expect(headingSlug('API_FIELD')).toBe('api_field');
  });

  it('still strips emphasis markup', () => {
    expect(headingSlug('_em_')).toBe('em');
    expect(headingSlug('**Bold** thing')).toBe('bold-thing');
  });
});

describe('a table row with no padding around its pipes', () => {
  it('keeps its cells separate', () => {
    // `\S+` swallowed the `|` with the URL, so citationClause merged adjacent
    // cells and an issue described as no longer blocking inherited a live-work
    // cue from the next one.
    const u = 'https://github.com/TeneikaAskew/solyra/issues/';
    const line = `| ${u}1| still open ${u}2|`;
    expect(citationClause(line, line.indexOf(u), line.indexOf(u) + u.length + 1))
      .not.toContain('still open');
  });

  it('does not report a citation the next cell describes as live', () => {
    const u = 'https://github.com/TeneikaAskew/solyra/issues/';
    const states = { solyra: {
      1: { state: 'closed', reason: 'completed', kind: 'ISSUE' },
      2: { state: 'open', reason: '', kind: 'ISSUE' } } };
    expect(checkClosedIssues('d.md', `| ${u}1 is no longer blocking| still open ${u}2|\n`,
      states)).toEqual([]);
  });
});

describe('a destination with a literal percent sign', () => {
  it('is a dead link, not a crash', () => {
    // decodeURIComponent throws a plain URIError on `100%-coverage.md`: a
    // stack trace and exit 1, the status reserved for documentation findings.
    const ctx = linkContext(new Set(['a.md']), new Set(), []);
    const out = checkDeadLinks('d.md', '# T\n\n[c](100%-coverage.md)\n', ctx);
    expect(out.map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('a derivation written with repeated whitespace', () => {
  it('parses as it reads', () => {
    // Splitting on a literal single space made `target` empty and folded the
    // path into the regex, so the empty pathspec grepped the whole repository
    // and returned a plausible, wrong count.
    expect(derive('grep-count  src zzz-no-such-string-zzz')).toBe(0);
  });

  it('still refuses a derivation with no target at all', () => {
    expect(() => derive('grep-count')).toThrow(/no target/);
  });
});

describe('a title section longer than forty lines', () => {
  it('still contains its marker', () => {
    // A document opening with more than 40 lines of HTML metadata had the real
    // marker excluded from the window, so the audit reported it missing and
    // --stamp inserted a second one: contradictory provenance.
    // Metadata, not prose: the registry puts the marker at the first
    // rendered PARAGRAPH after the H1, and HTML comments render as nothing,
    // so forty-five of them do not displace it. The window is bounded by
    // what renders, never by a line count.
    const lines = ['# T', ...Array(45).fill('<!-- meta -->'),
      '**Last reviewed:** 2026-01-01'];
    expect(markerWindow(lines).to).toBeGreaterThan(45);
    expect(findMarker(lines)).not.toBeNull();
    // Forty-five lines of PROSE do displace it: the marker is then not the
    // first paragraph, which is the placement the registry requires.
    const prose = ['# T', ...Array(45).fill('x'), '**Last reviewed:** 2026-01-01'];
    expect(findMarker(prose)).toBeNull();
  });

  it('still stops at the next heading', () => {
    const lines = ['# T', 'body', '## Next', '**Last reviewed:** 2026-01-01'];
    expect(markerWindow(lines).to).toBe(2);
  });
});

describe('a fenced example row in the Claims table', () => {
  it('is documentation, not a claim', () => {
    const head = '| Doc | Pattern | Derivation |\n|---|---|---|\n';
    const text = `## Claims\n\n\`\`\`\n${head}| docs/EXAMPLE.md | (\\d+) x | grep-count src x |\n`
      + `\`\`\`\n\n${head}| README.md | (\\d+) y | grep-count src y |\n`;
    expect(loadClaims(text).map((c) => c.doc)).toEqual(['README.md']);
  });
});


// ── round 19: ported from the Python twin (stocks#1121) ─────────────────────

describe('a fenced example of a generated region', () => {
  it('is documentation, not a region', () => {
    // A document explaining the convention shows the delimiter pair in a code
    // block. Reading that example as a real region reported the span
    // generated, called a marker landing in it unstampable, and measured drift
    // against a code sample.
    const text = '# T\n\n```\n<!-- inventory:demo:start -->\n<!-- inventory:demo:end -->\n```\n';
    const { owned, orphans } = ownedLines(text, ['inventory:*']);
    expect([...owned]).toEqual([]);
    expect(orphans).toEqual([]);
  });

  it('does not swallow a real unbalanced marker beside it', () => {
    const text = '# T\n\n```\n<!-- inventory:demo:start -->\n```\n\n<!-- inventory:real:start -->\n';
    const { orphans } = ownedLines(text, ['inventory:*']);
    expect(orphans).toEqual(['inventory:real starts at line 7 with no end']);
  });

  it('applies to a mark: pair too', () => {
    const text = '# T\n\n```\n<!-- BEGIN demo -->\nx\n<!-- END demo -->\n```\n';
    const { owned } = ownedLines(text, ['mark:demo']);
    expect([...owned]).toEqual([]);
  });

  it('still owns fenced CONTENT between two real delimiters', () => {
    const text = '# T\n\n<!-- BEGIN demo -->\n```\nx\n```\n<!-- END demo -->\n';
    // Only the delimiter SCAN skips fences. A generated block is usually a
    // fenced table or code sample, so skipping its content would unown most
    // of what a renderer writes; both delimiters are part of the region.
    const { owned } = ownedLines(text, ['mark:demo']);
    expect([...owned].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7]);
  });
});

describe('a tracked extension longer than six characters', () => {
  it('is citable', () => {
    // Six covered `.drawio` and stopped one short of `.properties`. The bound
    // is not what filters: linkContext derives `exts` from the tree, so an
    // extension this tree does not track is skipped there. Raised on the
    // Python twin (stocks#1121), where a five-character cap made `.drawio`
    // uncitable outright.
    const ctx = linkContext(new Set(['docs/d.md', 'docs/here.properties']),
      new Set(), []);
    const out = checkDeadLinks('docs/d.md', 'See `docs/gone.properties`.\n', ctx);
    expect(out.map((f) => f.detail)).toEqual(['backticked path -> docs/gone.properties']);
    expect(checkDeadLinks('docs/d.md', 'See `docs/here.properties`.\n', ctx)).toEqual([]);
  });
});

describe('a blocker citation commented out', () => {
  it('does not gate the build', () => {
    // Commenting the row out is how a blocker list is retired without losing
    // it. The prose no longer renders; --check held the build red over it.
    const u = 'https://github.com/TeneikaAskew/solyra/issues/9';
    const states = { solyra: { 9: { state: 'closed', reason: 'completed' } } };
    expect(checkClosedIssues('d.md', `# T\n\n<!-- was: still open ${u} -->\n`, states))
      .toEqual([]);
    const live = checkClosedIssues('d.md', `# T\n\nstill open ${u}\n`, states);
    expect(live).toHaveLength(1);
    expect(live[0].severity).toBe('P1');
  });

  it('is a SPAN, so a citation beside the comment is still read', () => {
    const u = 'https://github.com/TeneikaAskew/solyra/issues/9';
    const states = { solyra: { 9: { state: 'closed', reason: 'completed' } } };
    const line = `still open ${u} <!-- superseded: ignore this -->`;
    expect(checkClosedIssues('d.md', `# T\n\n${line}\n`, states)).toHaveLength(1);
  });

  it('does not treat a backticked `<!--` as opening a comment', () => {
    // codeSpans masks inline code first; without it the rest of the document
    // reads as commented out and every later finding disappears.
    const spans = commentSpans(['an example of `<!--` in prose', 'a real citation']);
    expect(spans.size).toBe(0);
  });
});

describe('a review recorded against a commit that predates the document', () => {
  it('names why it was refused, not a bare slug', () => {
    // checkVerifyTargets turns the refusal into the error a user sees; an
    // action missing from STAMP_REFUSALS prints as its slug and explains
    // nothing.
    expect(() => checkVerifyTargets(new Set(['docs/new.md']),
      new Map([['docs/new.md', 'baseline-predates-doc']])))
      .toThrow(/baseline predating it/);
  });
});

describe('pathInCommit', () => {
  it('tells an absent path apart from an empty file', () => {
    // `git show <sha>:<doc>` yields '' for both, which is why the drift check
    // read a baseline the document predates as "nothing changed".
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-pic-'));
    const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
    git('init', '-q', '-b', 'work');
    git('config', 'user.email', 't@example.com');
    git('config', 'user.name', 't');
    fs.writeFileSync(path.join(dir, 'empty.md'), '');
    git('add', '-A');
    git('commit', '-q', '-m', 'one');
    const sha = git('rev-parse', 'HEAD').stdout.trim();
    const spawn = (cmd, args) => spawnSync(cmd, args, { cwd: dir, encoding: 'utf8' });
    expect(pathInCommit(sha, 'empty.md', { spawn })).toBe(true);
    expect(pathInCommit(sha, 'absent.md', { spawn })).toBe(false);
  });
});


// ── the two rounds on 4ce1044 and a8b00d3 ──────────────────────────────────

describe('a heading with a non-ASCII letter', () => {
  it('keeps that letter in its anchor', () => {
    // JavaScript's `\w` is ASCII-only, so `## Café` produced `caf`: a valid
    // link to `#café` read as a dead anchor AND the nonexistent `#caf` was
    // accepted -- wrong in both directions at once.
    expect(headingSlug('Café')).toBe('café');
    expect(headingSlug('Ärger und Mühe')).toBe('ärger-und-mühe');
    expect(headingSlug('API_FIELD')).toBe('api_field');
    expect(headingSlug('a: b!')).toBe('a-b');
  });
});

describe('a negated blocking cue with a modifier in between', () => {
  it('is still a negation', () => {
    // `is not currently blocking` and `is no longer an open issue` both say
    // the opposite of live work; requiring the negator flush against the cue
    // emitted a P1 contradicting the sentence it was reading.
    expect(hasBlockingCue('is not currently blocking')).toBe(false);
    expect(hasBlockingCue('is no longer an open issue')).toBe(false);
    expect(hasBlockingCue('is not blocking')).toBe(false);
  });

  it('does not reach across a clause it does not govern', () => {
    expect(hasBlockingCue('not done yet; the api rewrite is still open')).toBe(true);
    expect(hasBlockingCue('still blocking')).toBe(true);
  });

  it('is a negation when it is contracted', () => {
    // `isn't blocking release` says exactly what `is not blocking release`
    // says. The negator list held only the spelled-out form, so the
    // contracted sentence read as live work and a closed issue produced a P1
    // whose own source line states the opposite.
    expect(hasBlockingCue("isn't blocking release")).toBe(false);
    expect(hasBlockingCue("wasn't blocking")).toBe(false);
    expect(hasBlockingCue("aren't open issues")).toBe(false);
    // A curly apostrophe is the same word; a document written either way
    // renders the same sentence.
    expect(hasBlockingCue('wasn\u2019t blocking')).toBe(false);
  });

  it('is NOT a negation when the sentence says `not only`', () => {
    // `not only X but also Y` AFFIRMS X. The generic `not` branch read it as
    // a negation, so an issue the prose calls blocking was dropped from the
    // audit once it closed -- the direction that HIDES a finding.
    expect(hasBlockingCue('is not only blocking release but also deploys')).toBe(true);
    // And the ordinary `not` is untouched, so this is a carve-out rather
    // than a hole.
    expect(hasBlockingCue('is not blocking release')).toBe(false);
  });
});

describe('a Setext underline of a single hyphen', () => {
  it('is an H2, so its anchor exists', () => {
    // CommonMark resolves the ambiguity with an empty list item in the
    // underline's favour: `Title` over `-` renders an H2. Requiring two or
    // more rejected it, so the `title` anchor was missing and a working
    // `[x](#title)` was reported as a gating dead-anchor finding. The Python
    // twin (stocks#1121) has accepted `-+` since it was written.
    expect([...headingAnchors('# T\n\nTitle\n-\n')].sort()).toEqual(['t', 'title']);
    // A real LIST is untouched, because an underline needs a PARAGRAPH above
    // it and a list opening a block has none. That container rule, not the
    // delimiter count, is what keeps them apart.
    expect([...headingAnchors('# T\n\n-\n- item\n')]).toEqual(['t']);
  });
});

describe('a document titled with a Setext H1', () => {
  it('keeps its heading when stamped', () => {
    // markerAnchor exists because inserting after the TITLE splits the
    // heading: the underline becomes ordinary text and h1Index then returns
    // null, so the document ends with no H1 at all -- worse than the
    // `skipped-no-h1` the recognizer replaced.
    const res = stamp('Title\n=====\n\nBody.\n', '2026-09-18', 'verified', 'abc1234', true);
    expect(res.action).toBe('inserted');
    const lines = res.text.split('\n');
    expect(lines.slice(0, 2)).toEqual(['Title', '=====']);
    expect(h1Index(lines)).toBe(0);
    expect(lines[3]).toMatch(/^\*\*Last reviewed:\*\* 2026-09-18/);
  });

  it('anchors on the underline, not the title', () => {
    expect(markerAnchor(['Title', '=====', 'body'])).toBe(1);
    expect(markerAnchor(['# Title', 'body'])).toBe(0);
    expect(markerAnchor(['body only'])).toBeNull();
  });
});

describe('a heading inside an HTML comment', () => {
  it('is not the document H1', () => {
    // A retired title kept as `<!-- # Old title -->` above the real one was
    // chosen, so --stamp wrote the marker INSIDE the comment, reported
    // success, and left the rendered document with no provenance.
    expect(h1Index(['<!--', '# Old title', '-->', '# Current title'])).toBe(3);
    expect(commentedLines(['<!--', '# Old', '-->', 'x'])).toEqual(new Set([0, 1, 2]));
  });

  it('does not hide a line that merely contains a comment', () => {
    // Whole-line is the question an H1 asks; a line with a trailing comment
    // still renders.
    expect(commentedLines(['# Real <!-- note -->'])).toEqual(new Set());
  });
});

describe('a fenced heading in the title section', () => {
  it('does not end the marker window', () => {
    const lines = ['# T', '```', '## Example', '```', '**Last reviewed:** 2026-01-01'];
    expect(markerWindow(lines).to).toBe(5);
    expect(findMarker(lines)).not.toBeNull();
  });

  it('still stops at a real later heading', () => {
    expect(markerWindow(['# T', 'body', '## Next', 'x']).to).toBe(2);
  });
});

describe('an unmatched comment opener inside a fence', () => {
  it('comments nothing', () => {
    expect(commentSpans(['# T', '```', '<!-- unbalanced', '```', '## Real']).size).toBe(0);
  });

  it('but a comment closed on an indented line still closes', () => {
    // The regression the findings diff caught: masking every code line
    // wholesale destroyed a `-->` sitting on an indented continuation of the
    // comment above it, so the comment ran to EOF and FIVE real closed-issue
    // findings on docs/UI-SCREENS.md vanished.
    const lines = ['<!-- Moved from the stocks repo', '',
      '     which stayed there. -->', 'still blocked by #1'];
    expect(indentedCodeLines(lines).has(2)).toBe(true);
    expect([...commentSpans(lines).keys()]).toEqual([0, 2]);
  });
});

describe('a citation in ordinary prose with a cue in another clause', () => {
  it('does not inherit that cue', () => {
    // `Background: #1. Still blocked by #2.` gave #1 a finding from #2's cue.
    const u = 'https://github.com/TeneikaAskew/solyra/issues/9';
    const states = { solyra: { 9: { state: 'closed', reason: 'completed' } } };
    expect(checkClosedIssues('d.md', `# T\n\nBackground: ${u}. Still blocked by other work.\n`,
      states)).toEqual([]);
  });

  it('but a table row still puts its cue cell over its citation cell', () => {
    const u = 'https://github.com/TeneikaAskew/solyra/issues/9';
    const states = { solyra: { 9: { state: 'closed', reason: 'completed' } } };
    expect(checkClosedIssues('d.md', `# T\n\n| Open issues | ${u} |\n`, states))
      .toHaveLength(1);
  });

  it('and a label heading a list carries onto its items', () => {
    // `Blocked by:` over a list of links is the ordinary Markdown form, and
    // requiring the cue on the URL's own line skipped every one of them.
    const u = 'https://github.com/TeneikaAskew/solyra/issues/9';
    const states = { solyra: { 9: { state: 'closed', reason: 'completed' } } };
    expect(checkClosedIssues('d.md', `# T\n\nBlocked by:\n\n- ${u}\n`, states))
      .toHaveLength(1);
    // and stops at the end of the block
    expect(checkClosedIssues('d.md', `# T\n\nBlocked by:\n\n- x\n\nSee ${u}\n`, states))
      .toEqual([]);
    // and needs a cue in the label, not just a colon
    expect(checkClosedIssues('d.md', `# T\n\nSee also:\n\n- ${u}\n`, states)).toEqual([]);
  });
});

describe('a link destination with balanced parentheses', () => {
  it('is parsed whole', () => {
    const ctx = linkContext(new Set(['docs/d.md', 'docs/foo(bar).md']), new Set(), []);
    expect(checkDeadLinks('docs/d.md', 'See [g](foo(bar).md).\n', ctx)).toEqual([]);
  });
});

describe('link syntax shown as inline code', () => {
  it('is an example, not a link', () => {
    const ctx = linkContext(new Set(['docs/d.md']), new Set(), []);
    expect(checkDeadLinks('docs/d.md', 'Write `[x](missing.md)` to link.\n', ctx))
      .toEqual([]);
  });

  it('and a real link on the same line is still checked', () => {
    const ctx = linkContext(new Set(['docs/d.md']), new Set(), []);
    const out = checkDeadLinks('docs/d.md', 'Write `[x](a.md)` — see [y](gone.md).\n', ctx);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/gone\.md/);
  });
});

describe('a registry row declaring both prose and exhaustive ownership', () => {
  it('is contradictory input, not a clean region map', () => {
    // `prose:` says a model owns the complement; `exhaustive` says there is
    // none. Accepting both emptied the spans before the exhaustive check ran,
    // so content a regeneration will discard passed clean.
    // Driven through checkRegions: ownedLines only reports the specs, and a
    // push into its list after the findings were built reaches nobody -- which
    // is exactly what the first version of this fix did.
    const { findings } = checkRegions('a.md', '# T\n\nprose\n', ['prose:p.md', 'exhaustive']);
    expect(findings.some((f) => /both `prose:` and `exhaustive`/.test(f.detail))).toBe(true);
  });
});

describe('a single-star registry glob', () => {
  it('stays inside one path segment', () => {
    // As `.*` it also matched `.claude/agents/nested/example.md`, so a newly
    // nested document was silently classified instead of becoming unclassified
    // and forcing an explicit registry decision.
    const reg = loadRegistry('## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n| X | .claude/agents/*.md | |\n');
    expect(classify('.claude/agents/a.md', reg).cls).toBe('X');
    // `classify` reports no match as null; the caller is what calls that
    // "unclassified", and a document nobody has placed is the finding.
    expect(classify('.claude/agents/nested/a.md', reg).cls).toBeNull();
  });

  it('and `**` still crosses them', () => {
    const reg = loadRegistry('## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n| X | .claude/**/*.md | |\n');
    expect(classify('.claude/agents/nested/a.md', reg).cls).toBe('X');
  });
});


// ── the round on a932cad ───────────────────────────────────────────────────

describe('a recursive registry glob', () => {
  it('matches an immediate child as well as a nested one', () => {
    // A regression from the single-star fix one round earlier: compiling `**`
    // as `.*` left the following slash mandatory, so `docs/**/*.md` matched
    // `docs/sub/g.md` and NOT `docs/guide.md`. `**/` is ZERO or more segments.
    const reg = loadRegistry('## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n| X | docs/**/*.md | |\n');
    expect(classify('docs/guide.md', reg).cls).toBe('X');
    expect(classify('docs/sub/guide.md', reg).cls).toBe('X');
  });

  it('and a single star still does not cross a separator', () => {
    const reg = loadRegistry('## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n| X | .claude/agents/*.md | |\n');
    expect(classify('.claude/agents/a.md', reg).cls).toBe('X');
    expect(classify('.claude/agents/n/a.md', reg).cls).toBeNull();
  });
});

describe('a heading containing inline HTML', () => {
  it('anchors on its rendered text', () => {
    // GitHub renders `## Use <code>foo</code>` as "Use foo" and anchors it
    // `use-foo`; keeping the tag names recorded `use-codefoocode`, so a valid
    // link read dead and a nonexistent slug was accepted.
    expect(headingSlug('Use <code>foo</code>')).toBe('use-foo');
    expect(headingSlug('Plain heading')).toBe('plain-heading');
  });
});

describe('a fence nested in a block quote', () => {
  it('is still code', () => {
    expect([...fencedLines(['> ```md', '> [x](missing.md)', '> ```'])]).toEqual([0, 1, 2]);
  });

  it('and an unquoted fence still works', () => {
    expect([...fencedLines(['```', 'x', '```'])]).toEqual([0, 1, 2]);
  });
});

describe('a document whose registry rows disagree', () => {
  it('is skipped entirely, not processed on the first row', () => {
    // Recording the finding and then proceeding on the first-by-table-order
    // rule meant --stamp could write into a file whose ownership is
    // explicitly unresolved.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-amb-'));
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.copyFileSync(path.join(process.cwd(), 'scripts/docs-audit.mjs'),
      path.join(dir, 'scripts/docs-audit.mjs'));
    // The character-reference table ships WITH the script and is read at
    // import time, so a fixture that copies one and not the other is a
    // broken install rather than a test tree.
    fs.copyFileSync(path.join(process.cwd(), 'scripts/docs-audit-entities.json'),
      path.join(dir, 'scripts/docs-audit-entities.json'));
    fs.writeFileSync(path.join(dir, 'docs/DOC_REGISTRY.md'),
      '# Registry\n\n## Registry\n\n| Class | Path glob | Declared code paths | Generated regions |\n'
      + '|---|---|---|---|\n| D | docs/DOC_REGISTRY.md | | |\n'
      + '| D | docs/d.md | | |\n| X | docs/d.md | | |\n');
    fs.writeFileSync(path.join(dir, 'docs/d.md'), '# D\n\nbody\n');
    fs.writeFileSync(path.join(dir, 'issues.json'),
      JSON.stringify({ stocks: { 1: { state: 'open' } }, solyra: { 1: { state: 'open' } } }));
    for (const args of [['init', '-q', '-b', 'work'], ['config', 'user.email', 't@e.com'],
      ['config', 'user.name', 't'], ['add', '-A'], ['commit', '-qm', 'tree']]) {
      spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    }
    const res = spawnSync(process.execPath,
      [path.join(dir, 'scripts/docs-audit.mjs'), '--json', '--date', '2026-09-18',
        '--no-contract-check', '--issues-snapshot', path.join(dir, 'issues.json'), '--stamp'],
      { cwd: dir, encoding: 'utf8' });
    const report = JSON.parse(res.stdout);
    expect(report.findings.some((f) => /equally specific/.test(f.detail))).toBe(true);
    // Not stamped, and no marker written.
    expect(report.stamped.some((s) => s.doc === 'docs/d.md')).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'docs/d.md'), 'utf8'))
      .not.toMatch(/Last reviewed/);
  });
});

describe('a tracked Markdown symlink', () => {
  it('is refused by --stamp rather than written through', () => {
    // Both the read and the write follow the link, so --stamp edited the
    // TARGET rather than a repository document -- and a symlink committed on
    // a branch can point anywhere writable.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-link-'));
    const outside = path.join(dir, 'outside.md');
    fs.writeFileSync(outside, '# Outside\n\nuntouched\n');
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.symlinkSync(outside, path.join(dir, 'docs/link.md'));
    expect(() => writeStamps([{ doc: 'docs/link.md', text: '# X\n' }], { repo: dir }))
      .toThrow(/a tracked symlink/);
    expect(fs.readFileSync(outside, 'utf8')).toBe('# Outside\n\nuntouched\n');
  });

  it('is refused when an ANCESTOR directory is the link', () => {
    // The final-component check reports an ordinary file here: the kernel has
    // already resolved `docs` before it ever looks at `d.md`. So a checkout
    // that replaces a tracked DIRECTORY with a link to somewhere writable had
    // --stamp create its temp file and rename it through that link, landing
    // the write outside the repository with the document-level guard passing
    // the whole way. Codex filed this as a P1.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-anc-'));
    const outside = path.join(dir, 'elsewhere');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'd.md'), '# Outside\n\nuntouched\n');
    fs.symlinkSync(outside, path.join(dir, 'docs'));
    // The hole itself, asserted rather than described: the old check saw a
    // regular file.
    expect(fs.lstatSync(path.join(dir, 'docs/d.md')).isSymbolicLink()).toBe(false);
    expect(symlinkedComponent('docs/d.md', { repo: dir })).toBe('docs');
    expect(() => writeStamps([{ doc: 'docs/d.md', text: '# X\n' }], { repo: dir }))
      .toThrow(/through docs/);
    expect(fs.readFileSync(path.join(outside, 'd.md'), 'utf8'))
      .toBe('# Outside\n\nuntouched\n');
  });

  it('and an ordinary document is still written', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-plain-'));
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, 'docs/d.md'), '# D\n');
    writeStamps([{ doc: 'docs/d.md', text: '# D\n\nmarker\n' }], { repo: dir });
    expect(fs.readFileSync(path.join(dir, 'docs/d.md'), 'utf8')).toBe('# D\n\nmarker\n');
  });
});

describe('content hidden in an HTML comment', () => {
  it('offers no heading anchor', () => {
    expect([...headingAnchors('# T\n\n<!--\n## Hidden\n-->\n\n## Real\n')].sort())
      .toEqual(['real', 't']);
  });

  it('does not end the marker window', () => {
    const lines = ['# T', '<!--', '## Retired', '-->', '**Last reviewed:** 2026-01-01'];
    expect(markerWindow(lines).to).toBe(5);
    expect(findMarker(lines)).not.toBeNull();
  });

  it('and a registry that exists but cannot be read is exit 2', () => {
    // Fresh evidence in the same revision: audited-document reads became
    // AuditErrors while this prerequisite read stayed unwrapped, so a
    // permissions or filesystem failure on the registry exited 1 with a stack
    // trace -- the status this CLI documents for FINDINGS.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-reg-'));
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.copyFileSync(path.join(process.cwd(), 'scripts/docs-audit.mjs'),
      path.join(dir, 'scripts/docs-audit.mjs'));
    // The character-reference table ships WITH the script and is read at
    // import time, so a fixture that copies one and not the other is a
    // broken install rather than a test tree.
    fs.copyFileSync(path.join(process.cwd(), 'scripts/docs-audit-entities.json'),
      path.join(dir, 'scripts/docs-audit-entities.json'));
    // A DIRECTORY at the registry's path: `existsSync` says yes, so the
    // not-found guard above this read lets it through, and `readFileSync`
    // throws EISDIR. A chmod would not fail at all running as root, and a
    // dangling symlink is caught by the not-found guard instead -- which is
    // itself already correct, and so tests nothing about this read.
    fs.mkdirSync(path.join(dir, 'docs/DOC_REGISTRY.md'));
    fs.writeFileSync(path.join(dir, 'docs/DOC_REGISTRY.md/keep'), 'x\n');
    for (const args of [['init', '-q', '-b', 'work'], ['config', 'user.email', 't@e.com'],
      ['config', 'user.name', 't'], ['add', '-A'], ['commit', '-qm', 'tree']]) {
      spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    }
    const res = spawnSync(process.execPath,
      [path.join(dir, 'scripts/docs-audit.mjs'), '--json', '--date', '2026-09-18',
        '--no-contract-check'], { cwd: dir, encoding: 'utf8' });
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/cannot be read/);
    expect(res.stderr).not.toMatch(/at Object|at Module/);
  });

  it('is not a live registry row', () => {
    const reg = loadRegistry('## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n<!--\n| X | docs/gone/*.md | |\n-->\n| D | docs/*.md | |\n');
    expect(reg.map((r) => r.glob)).toEqual(['docs/*.md']);
  });

  it('is not a link to check', () => {
    const ctx = linkContext(new Set(['docs/d.md']), new Set(), []);
    expect(checkDeadLinks('docs/d.md', '<!-- [old](removed.md) -->\n', ctx)).toEqual([]);
    expect(checkDeadLinks('docs/d.md', '<!-- see `docs/gone.md` -->\n', ctx)).toEqual([]);
    // A visible link beside a comment on the same line is still checked.
    expect(checkDeadLinks('docs/d.md',
      '[gone](removed.md) <!-- [old](x.md) -->\n', ctx)).toHaveLength(1);
  });
});

describe('a setext section heading after the H1', () => {
  it('ends the marker window', () => {
    const lines = ['# T', 'body', 'Section', '---', '**Last reviewed:** 2026-01-01'];
    expect(markerWindow(lines).to).toBe(2);
    expect(findMarker(lines)).toBeNull();
  });

  it('but a thematic break and a table delimiter are not headings', () => {
    expect(isSetextUnderline(['# T', '', '---'], 2)).toBe(false);
    expect(isSetextUnderline(['| a |', '|---|'], 1)).toBe(false);
    expect(isSetextUnderline(['Section', '---'], 1)).toBe(true);
  });
});

describe('an angle-bracket link destination', () => {
  it('keeps its fragment out of the path', () => {
    // `[tests](<README.md#tests>)` captured `<README.md` and `tests>`, so a
    // tracked README was reported dead.
    // A real tracked file, because resolving the path means its anchors get
    // read from disk. The point is that the PATH parsed: a `dead-link` here
    // would mean `<DOC_REGISTRY.md` was looked up.
    const ctx = linkContext(new Set(['docs/d.md', 'docs/DOC_REGISTRY.md']), new Set(), []);
    const out = checkDeadLinks('docs/d.md', 'See [x](<DOC_REGISTRY.md#registry>).\n', ctx);
    expect(out.filter((f) => f.check === 'dead-link')).toEqual([]);
  });

  it('and admits a space, so a missing target is still checked', () => {
    const ctx = linkContext(new Set(['docs/d.md']), new Set(), []);
    expect(checkDeadLinks('docs/d.md', 'See [g](<user guide.md>).\n', ctx))
      .toHaveLength(1);
  });
});

describe('a future --date', () => {
  it('is refused before --stamp writes anything', () => {
    // A real but future date was written into every `Last scanned`, and the
    // same run compared markers against that same future "today" and saw
    // nothing wrong -- so the NEXT ordinary audit reported P1 future dates for
    // markers this tool had just written.
    expect(() => parseArgs(['--stamp', '--date', '2099-01-01']))
      .toThrow(/in the future/);
    expect(() => parseArgs(['--date', '2099-01-01'])).not.toThrow();
  });
});

// ── round 23 ────────────────────────────────────────────────────────────────

describe('a cue that renders as nothing', () => {
  const states = { stocks: { 861: { state: 'closed', reason: 'completed' } } };
  const URL = 'https://github.com/TeneikaAskew/stocks/issues/861';

  it('does not make a closed issue read as live work', () => {
    // Hiding only the URLs was half the job: the visible URL survived and the
    // commented phrase reached the classifier as live prose, so a closed issue
    // produced a false, GATING P1 from text that renders as nothing.
    expect(checkClosedIssues('d.md', `# T\n\n<!-- still open --> ${URL}\n`, states))
      .toHaveLength(0);
  });

  it('still reports the same line when the cue is visible', () => {
    expect(checkClosedIssues('d.md', `# T\n\nstill open ${URL}\n`, states))
      .toHaveLength(1);
  });
});

describe('a marker with one to three leading spaces', () => {
  it('is an ordinary rendered paragraph, not a code example', () => {
    // CommonMark needs a tab or four spaces for indented code. Rejecting any
    // whitespace reported the document as missing provenance and --stamp
    // inserted a second marker beside the visible original.
    expect(isCodeIndented('   **Last reviewed:** 2026-01-01')).toBe(false);
    expect(isCodeIndented('    **Last reviewed:** 2026-01-01')).toBe(true);
    expect(isCodeIndented('\t**Last reviewed:** 2026-01-01')).toBe(true);
    const lines = ['# T', '', '   **Last reviewed:** 2026-01-01'];
    expect(findMarker(lines)?.date).toBe('2026-01-01');
  });

  it('is not the marker when it is four spaces in', () => {
    expect(findMarker(['# T', '', '    **Last reviewed:** 2026-01-01'])).toBeNull();
  });
});

describe('a marker-shaped line inside an HTML comment', () => {
  it('is not the document provenance', () => {
    // It renders as nothing, so accepting it suppressed the missing-marker
    // finding and --stamp updated the hidden line, leaving the rendered
    // document with no visible marker at all.
    const lines = ['# T', '', '<!-- draft metadata',
      '**Last reviewed:** 2026-01-01 · **Owner:** TBD', '-->'];
    expect(findMarker(lines)).toBeNull();
    expect(findMarkers(lines)).toEqual([]);
  });
});

describe('a generated region with a stray closing delimiter', () => {
  it('is reported, not silently accepted by a later valid pair', () => {
    // The closer was handled only while an opener was live, so a stray one
    // before a valid pair produced no finding at all: the later pair set the
    // hit and an unbalanced machine-owned layout passed with a supposedly
    // valid region map. `inventory:*` has always reported this shape.
    const doc = '# T\n\n<!-- END gen -->\n<!-- BEGIN gen -->\nrows\n<!-- END gen -->\n';
    const { orphans } = ownedLines(doc, ['mark:gen']);
    expect(orphans).toEqual(['mark:gen: a closer with no opener']);
  });

  it('leaves a balanced region alone', () => {
    const doc = '# T\n\n<!-- BEGIN gen -->\nrows\n<!-- END gen -->\n';
    expect(ownedLines(doc, ['mark:gen']).orphans).toEqual([]);
  });
});

describe('a heading that merely starts with a section name', () => {
  it('does not re-enter registry or claims mode', () => {
    // `## Registry examples` re-entered registry mode and parsed its
    // illustrative table as live classification rules -- visible explanatory
    // prose becoming executable configuration.
    expect(headingIs('## Registry', '## Registry')).toBe(true);
    expect(headingIs('## Registry ##', '## Registry')).toBe(true);
    expect(headingIs('## Registry examples', '## Registry')).toBe(false);
    const doc = '## Registry\n\n| Class | Path glob |\n|---|---|\n| D | docs/real.md |\n'
      + '\n## Registry examples\n\n| Class | Path glob |\n|---|---|\n| A | docs/made-up.md |\n';
    expect(loadRegistry(doc).map((r) => r.glob)).toEqual(['docs/real.md']);
  });
});

describe('a claim pattern that begins with a hyphen', () => {
  it('is passed to git grep as data', () => {
    // Counting Markdown list items is the natural reason to write one, and in
    // option position git grep exits 129 with an unknown-switch error rather
    // than deriving anything.
    let seen;
    derive('grep-count src -\\s\\[', { exec: (_c, args) => { seen = args; return ''; } });
    expect(seen.indexOf('-e')).toBe(2);
    expect(seen[3]).toBe('-\\s\\[');
  });
});

describe('a marker repeating an owned field it cannot parse', () => {
  it('is reported by an ordinary check, not only by stamp', () => {
    // MARKER_RE is not end-anchored, so the dates and provenance read fine and
    // every other check passed. Only stamp() noticed, and an ordinary --check
    // never calls stamp(), so the contradiction sailed through the gate.
    const line = '**Last reviewed:** 2026-01-01 · **Owner:** TBD · **Last scanned:** bad';
    const prev = { date: '2026-01-01', scanned: null, sha: null };
    const out = checkMarkerDates('d.md', prev, '2026-09-18', line);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/repeats an owned field/);
    // A clean marker still reports nothing.
    expect(checkMarkerDates('d.md', prev, '2026-09-18',
      '**Last reviewed:** 2026-01-01 · **Owner:** TBD')).toEqual([]);
  });
});

describe('a --since that the audited history does not contain', () => {
  it('is refused before a verified review is written', () => {
    // Accepted, it was written into `Against:` and the very next ordinary run
    // reported that marker invalid via the ancestry check -- provenance the
    // tool manufactures and then rejects itself.
    const spawn = (_c, args) => (args[0] === 'merge-base'
      ? { status: 1, stdout: '' }
      : { status: 0, stdout: 'abcdef1234\n' });
    expect(() => resolveCommit('other-branch', { spawn, ancestorOf: 'origin/main' }))
      .toThrow(/not an ancestor of origin\/main/);
    // An ancestor is accepted.
    const ok = (_c, args) => (args[0] === 'merge-base'
      ? { status: 0, stdout: '' }
      : { status: 0, stdout: 'abcdef1234\n' });
    expect(resolveCommit('HEAD~2', { spawn: ok, ancestorOf: 'origin/main' }))
      .toBe('abcdef1234');
    // Without a verified write there is nothing to constrain.
    expect(resolveCommit('other-branch', { spawn })).toBe('abcdef1234');
  });
});

// ── round 24 ────────────────────────────────────────────────────────────────

describe('a fence opened by a list marker', () => {
  it('masks the whole block, not just the closer', () => {
    // A list marker is a container prefix like a blockquote. Admitting only
    // indentation left the opener unrecognised and then misread the indented
    // CLOSING fence as a new opener, so links inside the example were audited
    // as live content.
    expect([...fencedLines(['- ```md', '  [x](missing.md)', '  ```'])])
      .toEqual([0, 1, 2]);
    expect([...fencedLines(['1. ```md', '   x', '   ```'])]).toEqual([0, 1, 2]);
  });
});

describe('indented code directly under a heading', () => {
  it('is masked without an intervening blank line', () => {
    // Only a PARAGRAPH cannot be interrupted by indented code; after a heading
    // no blank line is needed.
    expect([...indentedCodeLines(['## Example', '    [x](missing.md)'])]).toEqual([1]);
    expect([...indentedCodeLines(['Title', '=====', '    x'])]).toEqual([2]);
    // A paragraph still is not interrupted.
    expect([...indentedCodeLines(['some prose', '    continued'])]).toEqual([]);
  });
});

describe('two markers where one is indented', () => {
  it('are both counted', () => {
    // findMarker accepts a marker with one to three leading spaces as a
    // rendered paragraph, but the duplicate scan applied the anchored regex to
    // the RAW line, so contradictory provenance was counted as one marker.
    expect(findMarkers(['# T', '', '   **Last reviewed:** 2026-01-01',
      '**Last reviewed:** 2026-02-01'])).toEqual([2, 3]);
  });
});

describe('a blocker citation rendered as inline code', () => {
  it('is an example, not a citation', () => {
    const states = { stocks: { 1: { state: 'closed', reason: 'completed' } } };
    const u = 'https://github.com/TeneikaAskew/stocks/issues/1';
    expect(checkClosedIssues('d.md', `# T\n\nSee \`still open ${u}\` here.\n`, states))
      .toHaveLength(0);
    expect(checkClosedIssues('d.md', `# T\n\nstill open ${u}\n`, states)).toHaveLength(1);
  });
});

describe('region delimiters rendered as inline code', () => {
  it('are examples, not delimiters', () => {
    // A balanced pair silently classified the prose between them as generated;
    // a lone one produced a false P1 orphan-region finding.
    const doc = '# T\n\nWrite `<!-- BEGIN AUTO -->` and `<!-- END AUTO -->`.\n';
    const r = ownedLines(doc, ['mark:AUTO']);
    expect(r.orphans).toEqual([]);
    expect(r.unmatched).toEqual(['mark:AUTO']);
    const real = '# T\n\n<!-- BEGIN AUTO -->\nx\n<!-- END AUTO -->\n';
    expect(ownedLines(real, ['mark:AUTO']).unmatched).toEqual([]);
  });
});

describe('a recursive glob against a single-segment one', () => {
  it('loses for an immediate child and wins below it', () => {
    // The literal-length metric ranked `docs/**/*.md` above `docs/*.md`
    // because its extra slash counted as a literal character.
    const reg = [{ cls: 'X', glob: 'docs/**/*.md' }, { cls: 'D', glob: 'docs/*.md' }];
    expect(classify('docs/a.md', reg).cls).toBe('D');
    expect(classify('docs/sub/a.md', reg).cls).toBe('X');
    // An exact row still beats both.
    expect(classify('docs/a.md',
      [{ cls: 'A', glob: 'docs/a.md' }, { cls: 'D', glob: 'docs/*.md' }]).cls).toBe('A');
  });
});

describe('a marker repeating a WELL-FORMED owned field', () => {
  it('is reported, because the two values can disagree', () => {
    // extraSegments strips every valid segment, so the malformed-field filter
    // saw nothing, the parser took the first value, and --stamp collapsed the
    // duplicate silently instead of requiring somebody to say which is true.
    const dup = '**Last reviewed:** 2026-01-01 · **Owner:** TBD '
      + '· **Last scanned:** 2026-02-02 · **Last scanned:** 2026-03-03';
    const out = checkMarkerDates('d.md', { date: '2026-01-01', scanned: '2026-02-02' },
      '2026-09-18', dup);
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/carries 2 .Last scanned/);
    const ok = '**Last reviewed:** 2026-01-01 · **Owner:** TBD · **Last scanned:** 2026-02-02';
    expect(checkMarkerDates('d.md', { date: '2026-01-01', scanned: '2026-02-02' },
      '2026-09-18', ok)).toEqual([]);
  });
});

describe('citations retained inside an HTML comment', () => {
  const ctx = () => ({ tracked: new Set(['docs/d.md']), topLevelDirs: new Set(['docs']),
    rootFiles: new Set(), knownRoot: new Set(), exts: new Set(['.md', '.ts']),
    basenames: new Set() });

  it('does not validate a reference definition Markdown never registers', () => {
    // A definition inside a multiline comment is not registered by Markdown at
    // all, so validating it produced a false gating dead-link for retired
    // content. The fenced exclusion was here; the comment one was not.
    const doc = '# T\n\n<!--\n[old]: docs/removed.md\n-->\n\nbody\n';
    expect(checkDeadLinks('docs/d.md', doc, ctx())).toEqual([]);
    // Outside the comment the same definition is still checked.
    const live = '# T\n\n[old]: docs/removed.md\n\nsee [x][old]\n';
    expect(checkDeadLinks('docs/d.md', live, ctx()).length).toBeGreaterThan(0);
  });

  it('does not report a root file cited inside a comment', () => {
    // The slash-path loop consulted the comment spans; this sibling root-file
    // loop only checked link labels, cross-repo ownership and extensions.
    // `knownRoot` has to carry the name, or the loop's weak-evidence rule
    // skips it for a reason unrelated to comments and the test proves nothing
    // -- which is exactly how the first version of this test passed with the
    // fix reverted.
    const c = { ...ctx(), knownRoot: new Set(['vite.config.ts']) };
    const visible = '# T\n\nretired: `vite.config.ts`\n';
    expect(checkDeadLinks('docs/d.md', visible, c)).toHaveLength(1);
    const doc = '# T\n\n<!-- retired: `vite.config.ts` -->\n\nbody\n';
    expect(checkDeadLinks('docs/d.md', doc, c)).toEqual([]);
  });
});

describe('a percent-encoded anchor fragment', () => {
  it('is decoded before it is compared', () => {
    // headingAnchors records the RENDERED slug `café`, so comparing the raw
    // `caf%C3%A9` reported a valid link as a gating dead anchor.
    const anchors = headingAnchors('# Café\n\nbody\n');
    expect(anchors.has('café')).toBe(true);
    expect(anchors.has('caf%c3%a9')).toBe(false);
    expect(decodeURIComponent('caf%C3%A9').toLowerCase()).toBe('café');
  });

  it('and so are Markdown escapes and character references', () => {
    // Both are resolved when the link is RENDERED, so `[x](#foo\\:bar)`
    // reaches `id="foo:bar"` and `[x](#a&amp;b)` reaches `id="a&b"`.
    // `headingAnchors` records the decoded id and this compared the source
    // spelling, so both working links were gating dead anchors.
    // A REAL file, because a fragment check reads the target's headings off
    // disk -- the same reason the tracked-symlink test writes one.
    const target = 'docs-audit-frag-target.md';
    fs.writeFileSync(target,
      '# Target\n\n<a id="foo:bar"></a>\n<a id="a&amp;b"></a>\n');
    try {
      const ctxWith = linkCtx(['d.md', target]);
      const doc = `# T\n\n[x](${target}#foo\\:bar) and [y](${target}#a&amp;b)\n`;
      expect(checkDeadLinks('d.md', doc, ctxWith)).toEqual([]);
      // A fragment that names nothing is still reported, so this is not
      // "decode until something matches".
      const broken = `# T\n\n[x](${target}#foo\\:baz)\n`;
      expect(checkDeadLinks('d.md', broken, ctxWith).map((f) => f.check))
        .toEqual(['dead-anchor']);
    } finally {
      fs.unlinkSync(target);
    }
  });
});

describe('two different prose owners on one Class A row', () => {
  it('are an invalid region declaration, reported once', () => {
    // The later assignment replaced the first silently, so the region map
    // reported itself valid, the complement was suppressed, and every prose
    // finding was routed to one prompt while the registry claimed two.
    // Parity with the Python twin (stocks#1121).
    const r = ownedLines('# T\n\nprose\n', ['prose:a.md', 'prose:b.md']);
    expect(r.unmatched).toEqual(['prose:b.md']);
    expect(r.prompt).toBe('a.md');
    // The same owner named twice is not a contradiction.
    expect(ownedLines('# T\n\nprose\n', ['prose:a.md', 'prose:a.md']).unmatched)
      .toEqual([]);
    expect(ownedLines('# T\n\nprose\n', ['prose:a.md']).prompt).toBe('a.md');
  });
});


const MARK = (d, o) => `**Last reviewed:** ${d} · **Depth:** scanned · **Against:** `
  + `\`abc123def456\` · **Last scanned:** ${d} · **Owner:** ${o}`;

const linkCtx = (tracked) => ({
  tracked: new Set(tracked), topLevelDirs: new Set([...tracked].filter((p) => p.includes('/')).map((p) => p.split('/')[0])),
  rootFiles: new Set(), knownRoot: new Set(), exts: new Set(['.md']), basenames: new Set(),
});

describe('a document with no H1', () => {
  it('offers no window a marker can live in, and is reported for the H1', () => {
    // The fallback scanned the first 40 lines, so a marker-shaped line
    // floating in a headingless document satisfied findMarker: the
    // missing-marker finding was suppressed and nothing reported the missing
    // H1 either, so the document passed --check carrying provenance in a
    // place the registry does not recognise.
    const lines = ['Intro prose with no heading at all.', '', MARK('2026-01-01', 'me'), '', 'Body.'];
    expect(markerWindow(lines)).toEqual({ from: 0, to: 0 });
    expect(findMarker(lines)).toBe(null);
    expect(findMarkers(lines)).toEqual([]);
  });

  it('is refused by stamp before the update path, not after it', () => {
    // `if (prev)` returned `updated` without ever consulting markerAnchor, so
    // the floating line was refreshed as though it were the document's
    // provenance. The refusal has to come FIRST.
    const lines = ['Intro prose.', '', MARK('2026-01-01', 'me'), '', 'Body.'];
    expect(stamp(lines.join('\n'), '2026-03-03', null, null).action).toBe('skipped-no-h1');
    // And the fix is not "never stamp": a document WITH an H1 still stamps.
    expect(stamp('# T\n\nBody.\n', '2026-03-03', null, null).action).toBe('inserted');
  });
});

describe('a second marker below the opening paragraph', () => {
  it('is counted as a duplicate although the canonical window stops earlier', () => {
    // markerWindow stops at the first rendered paragraph because that is
    // where the registry requires the marker. findMarkers inherited that
    // stop, so a contradictory second marker further down the SAME section
    // was invisible: the audit reported one marker and --stamp refreshed only
    // the first, leaving the stale one on the page.
    const lines = ['# T', '', MARK('2026-01-01', 'me'), '', 'Intro paragraph.', '',
      MARK('2020-01-01', 'old'), '', '## Next'];
    expect(findMarkers(lines)).toEqual([2, 6]);
    // The canonical selection is unchanged -- the two boundaries answer
    // different questions and both are still asked.
    expect(findMarker(lines).idx).toBe(2);
    expect(markerWindow(lines).to).toBe(5);
    expect(markerSection(lines).to).toBe(8);
  });

  it('does not swallow a marker belonging to a LATER section', () => {
    // The wider boundary must still stop at the next heading, or a section's
    // own metadata would be reported as the document's duplicate provenance.
    const lines = ['# T', '', MARK('2026-01-01', 'me'), '', '## Next', '', MARK('2020-01-01', 'old')];
    expect(findMarkers(lines)).toEqual([2]);
  });
});

describe('a reference definition whose destination is angle-bracketed', () => {
  it('keeps the spaces the brackets exist to allow', () => {
    // `\S+` stopped at the space, so `[g]: <docs/user guide.md>` captured
    // `<docs/user` and a tracked file was reported dead -- while the inline
    // link parser accepted the same destination form.
    const ctx = linkCtx(['docs/user guide.md', 'd.md']);
    expect(checkDeadLinks('d.md', '# T\n\n[guide][g]\n\n[g]: <docs/user guide.md>\n',
      ctx, { backtickedPaths: false })).toEqual([]);
    // Not "any bracketed destination passes": a missing one is still dead.
    const dead = checkDeadLinks('d.md', '# T\n\n[guide][g]\n\n[g]: <docs/no such file.md>\n',
      ctx, { backtickedPaths: false });
    expect(dead).toHaveLength(1);
    expect(dead[0].detail).toMatch(/no such file\.md/);
    // An empty destination is legal and must not throw on the bracket strip.
    expect(Array.isArray(checkDeadLinks('d.md', '# T\n\n[guide][g]\n\n[g]: <>\n',
      ctx, { backtickedPaths: false }))).toBe(true);
  });
});

describe('a heading carrying a character reference', () => {
  it('is slugged from the rendered text, not the entity spelling', () => {
    // Markdown decodes `&amp;` before GitHub derives the anchor, so the
    // reader's link is `#dogs--cats`. Slugging the raw text recorded
    // `dogs-amp-cats`: the working link reported dead, and a link to a slug
    // that exists nowhere accepted. Wrong in both directions.
    expect(headingSlug('Dogs &amp; Cats')).toBe('dogs--cats');
    expect(decodeCharRefs('A&#38;B')).toBe('A&B');
    expect(decodeCharRefs('A&#x26;B')).toBe('A&B');
    // An unrecognised name is literal text, which is what CommonMark does
    // with an invalid one -- decoding a guess would invent an anchor.
    // `&hearts;` used to be the example here, which was a statement about
    // the hand-written map rather than about HTML5: it is a real name and
    // now decodes. A name that exists in no table is the honest case.
    expect(decodeCharRefs('A&nosuchname;B')).toBe('A&nosuchname;B');
    expect(decodeCharRefs('A&hearts;B')).toBe('A\u2665B');
    // And a name the old curated map did not carry, which is the whole
    // point of generating it: `## A &colon; B` renders `A : B`.
    expect(decodeCharRefs('A &colon; B')).toBe('A : B');
    // The table is GENERATED from the WHATWG list, so its size is a fact
    // about that list rather than about who has needed a name. A truncated
    // or partially written file would otherwise degrade quietly back to the
    // curated behaviour this replaced.
    expect(namedCharRefCount()).toBe(2125);
    // Entity-escaped markup is CONTENT; a real tag is still markup.
    expect(headingSlug('Use &lt;code&gt;')).toBe('use-code');
    expect(headingSlug('Use <code>foo</code>')).toBe('use-foo');
    // An ordinary heading is untouched.
    expect(headingSlug('Plain Thing')).toBe('plain-thing');
  });
});

describe('a marker that omits the owner', () => {
  it('is incomplete provenance, not a clean pass', () => {
    // `Owner` is in the registry's required marker format and names who
    // answers for the claims. A marker with valid review, depth, SHA and scan
    // fields but no owner parsed cleanly and neither checkMarkerDates nor
    // checkProvenance said a word, so --check accepted it.
    const lines = ['# T', '', '**Last reviewed:** 2026-01-01 · **Depth:** verified · '
      + '**Against:** `abc123def456` · **Last scanned:** 2026-02-02', '', 'Body.'];
    const prev = findMarker(lines);
    expect(prev.owner).toBe(null);
    expect(checkProvenance('d.md', prev).some((f) => /no Owner/.test(f.detail))).toBe(true);
    // And a complete marker is still silent -- the check cannot be satisfied
    // by reporting every marker.
    const full = findMarker(['# T', '', MARK('2026-01-01', 'me').replace('scanned', 'verified'), '', 'B.']);
    expect(full.owner).toBe('me');
    expect(checkProvenance('d.md', full)).toEqual([]);
  });
});

describe('stamping a document that uses CRLF', () => {
  it('writes the document’s own line ending, leaving no mixed file', () => {
    // Splitting on '\n' leaves '\r' attached to every original line while an
    // inserted marker carries none, so --stamp in a Windows checkout wrote a
    // mixed-EOL document.
    const out = stamp(['# T', '', 'Body.'].join('\r\n'), '2026-03-03', null, null);
    expect(out.action).toBe('inserted');
    expect(out.text.split('\n').slice(0, -1).every((l) => l.endsWith('\r'))).toBe(true);
    // An UPDATE takes the same ending.
    const upd = stamp(['# T', '', MARK('2026-01-01', 'me'), '', 'Body.'].join('\r\n'),
      '2026-03-03', null, null);
    expect(upd.action).toBe('updated');
    expect(upd.text.split('\n').slice(0, -1).every((l) => l.endsWith('\r'))).toBe(true);
    // And an LF document gains no carriage returns -- the fix is not "always
    // write CRLF".
    expect(stamp('# T\n\nBody.\n', '2026-03-03', null, null).text).not.toContain('\r');
  });
});

describe('a raw-text HTML block', () => {
  it('is an example, masked exactly as a fence is', () => {
    // `<pre>` renders its bracket syntax literally, so `[x](missing.md)`
    // inside one is a sample. Only fenced and indented code were masked, so
    // the sample emitted a gating dead-link finding.
    const doc = '# T\n\n<pre>\n[x](missing.md)\n</pre>\n\n[y](also-missing.md)\n';
    expect([...rawHtmlBlockLines(doc.split('\n'))]).toEqual([2, 3, 4]);
    const out = checkDeadLinks('d.md', doc, linkCtx(['d.md']), { backtickedPaths: false });
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/also-missing/);
    // A one-line block closes on its own line, and prose after it is live.
    expect([...rawHtmlBlockLines(['<pre>a</pre>', '[x](m.md)'])]).toEqual([0]);
  });
});

describe('an indented code example inside a blockquote', () => {
  it('is code, because Markdown removes the container prefix first', () => {
    // The raw line starts with `>`, so the indentation count returned zero
    // and the link and closed-issue scanners read the example as live prose.
    expect(indentedCodeLines(['# T', '', '>     [x](missing.md)']).has(2)).toBe(true);
    const out = checkDeadLinks('d.md', '# T\n\n>     [x](missing.md)\n\n[y](also-missing.md)\n',
      linkCtx(['d.md']), { backtickedPaths: false });
    expect(out).toHaveLength(1);
    expect(out[0].detail).toMatch(/also-missing/);
    // Quoted PROSE is still prose -- the fix is not "mask every blockquote".
    expect(indentedCodeLines(['# T', '', '> [x](missing.md)']).has(2)).toBe(false);
    expect(indentedCodeLines(['# T', '', '    [x](missing.md)']).has(2)).toBe(true);
  });
});

describe('a grep derivation that matches whitespace', () => {
  it('counts the records rather than the trimmed text', () => {
    // `git grep -o` emits one whitespace-only line per match, and trimming
    // the whole result collapsed them to the empty string and returned 0 --
    // so an incorrect zero claim passed and a correct nonzero one was
    // reported stale.
    expect(derive('grep-count scripts [[:space:]]+', { exec: () => '  \n \n   \n' })).toBe(3);
    expect(derive('grep-count scripts x', { exec: () => '' })).toBe(0);
    expect(derive('grep-count scripts x', { exec: () => 'a\nb\n' })).toBe(2);
    expect(derive('grep-count scripts x', { exec: () => '\n' })).toBe(1);
  });
});


// ── round 28 (400263b) ──────────────────────────────────────────────────────

describe('a raw HTML opener that is not at the line start', () => {
  it('does not open a block, so the rest of the document stays audited', () => {
    // MY REGRESSION, from the raw-HTML mask one round earlier. Unanchored,
    // any prose mentioning `<pre>` opened a block, and with no closing tag on
    // that line the mask ran to the end of the document -- every real dead
    // link and closed blocker below it silently skipped. That is the
    // direction that HIDES findings, so it is worse than the bug the mask
    // was added to fix.
    expect([...rawHtmlBlockLines(['# T', '', 'Use `<pre>` for examples.', '',
      '[x](missing.md)'])]).toEqual([]);
    expect([...rawHtmlBlockLines(['# T', '<!-- <pre> -->', '[x](m.md)'])]).toEqual([]);
    // A real block-level opener still opens one.
    expect([...rawHtmlBlockLines(['# T', '', '<pre>', '[x](m.md)', '</pre>', '',
      '[y](n.md)'])]).toEqual([2, 3, 4]);
    expect([...rawHtmlBlockLines(['<pre>a</pre>', '[x](m.md)'])]).toEqual([0]);
    // Three spaces of container indentation is still block level; four is code.
    expect([...rawHtmlBlockLines(['   <pre>', 'x', '</pre>'])]).toEqual([0, 1, 2]);
  });
});

describe('a heading inside a raw HTML block', () => {
  it('offers no anchor, because Markdown renders it literally', () => {
    // headingAnchors masked fenced and commented lines but not raw blocks, so
    // `<pre>` + `## Fake` recorded `fake` and a broken link to `#fake` passed
    // the dead-anchor audit -- an invented destination, the same failure the
    // fenced exclusion exists to stop.
    expect([...headingAnchors('# T\n\n<pre>\n## Fake\n</pre>\n')]).toEqual(['t']);
    // A real heading after the block still counts.
    expect([...headingAnchors('# T\n\n<pre>\n## Fake\n</pre>\n\n## Real\n')])
      .toEqual(['t', 'real']);
  });
});

describe('a heading inside a blockquote', () => {
  it('is a heading, and offers its anchor', () => {
    // `> ## Quoted Heading` renders as a heading with the anchor
    // `quoted-heading`; matching the raw line omitted it, so a valid local
    // link produced a gating dead-anchor finding.
    expect([...headingAnchors('# T\n\n> ## Quoted Heading\n')])
      .toEqual(['t', 'quoted-heading']);
    // Setext inside a quote too -- the underline is read through the same
    // prefix, or the heading above it stops being one.
    expect([...headingAnchors('# T\n\n> Sub\n> ---\n')]).toEqual(['t', 'sub']);
  });
});

describe('a named character reference outside the old whitelist', () => {
  it('is decoded, because the reader sees the character', () => {
    // An 18-entry whitelist was wrong in the same two directions the decoder
    // exists to fix: `Caf&eacute;` slugged `cafeacute`, so the reader's link
    // to `#café` read as dead and a nonexistent source-spelling anchor was
    // accepted.
    expect(headingSlug('Caf&eacute;')).toBe('café');
    expect(decodeCharRefs('&Aacute;&ntilde;&ouml;&Ouml;')).toBe('ÁñöÖ');
    expect(decodeCharRefs('&alpha;&Omega;')).toBe('αΩ');
    expect(decodeCharRefs('&mdash;&hellip;&euro;')).toBe('—…€');
    // The whole Latin-1 block is present and correctly ordered.
    expect(decodeCharRefs('&nbsp;')).toBe(' ');
    expect(decodeCharRefs('&yuml;')).toBe('ÿ');
    // An unlisted HTML5-only name is still literal, which is the safe
    // direction -- decoding a guess would invent an anchor.
    expect(decodeCharRefs('A&nosuchname;B')).toBe('A&nosuchname;B');
  });
});

describe('a registry section ended by a Setext heading', () => {
  it('stops parsing, so an examples table is not executed as rules', () => {
    // Neither `Examples` nor its `--------` underline starts with `#`, so
    // section mode stayed on and an illustrative table below it became live
    // classification rules -- visible prose turning into configuration.
    const reg = '# R\n\n## Registry\n\n| Class | Path |\n|---|---|\n| D | real.md |\n'
      + '\nExamples\n--------\n\n| D | fake.md |\n';
    expect(loadRegistry(reg).map((r) => r.glob)).toEqual(['real.md']);
  });

  it('ignores an indented example row for the same reason', () => {
    // The mask omitted indentedCodeLines, and the `trim()` on the next line
    // turned the example straight back into an executable declaration.
    const reg = '# R\n\n## Registry\n\n| Class | Path |\n|---|---|\n| D | real.md |\n'
      + '\n    | D | indented.md |\n';
    expect(loadRegistry(reg).map((r) => r.glob)).toEqual(['real.md']);
  });
});

describe('a review marker inside a blockquote', () => {
  const QUOTED = '> # Title\n>\n> **Last reviewed:** 2026-01-01 · **Depth:** scanned '
    + '· **Last scanned:** 2026-01-01\n';

  it('is found rather than reported missing', () => {
    // `h1Index` reads through the container and this did not, so `>` on its
    // own -- the quoted spelling of a BLANK line -- looked like rendered
    // prose and closed the window before the marker. The audit reported the
    // visible marker missing and --stamp inserted a second, unquoted one.
    const lines = QUOTED.split('\n');
    expect(h1Index(lines)).toBe(0);
    expect(findMarker(lines)?.date).toBe('2026-01-01');
  });

  it('and is rewritten INSIDE its quote', () => {
    // The half that makes the first safe: reading a quoted marker without
    // carrying its prefix would have moved the provenance out of the block
    // on the next --stamp. That is a corruption, where the old miss was only
    // a false finding.
    const res = stamp(QUOTED, '2026-09-18', 'scanned', 'abc1234', false);
    expect(res.action).toBe('updated');
    expect(res.text.split('\n')[2]).toBe('> **Last reviewed:** 2026-01-01 '
      + '· **Depth:** scanned · **Last scanned:** 2026-09-18 · **Owner:** TBD');
    // Idempotent, which is what proves the prefix is not accumulating.
    expect(stamp(res.text, '2026-09-18', 'scanned', 'abc1234', false).action)
      .toBe('unchanged');
    // And an unquoted document is untouched by any of it.
    const plain = '# Title\n\n**Last reviewed:** 2026-01-01 · **Depth:** scanned '
      + '· **Last scanned:** 2026-01-01\n';
    expect(stamp(plain, '2026-09-18', 'scanned', 'abc1234', false).text.split('\n')[2])
      .toBe('**Last reviewed:** 2026-01-01 · **Depth:** scanned '
        + '· **Last scanned:** 2026-09-18 · **Owner:** TBD');
  });

  it('and counts toward the duplicate check at its own depth', () => {
    // A marker findMarker now reads has to be COUNTABLE, or a document with
    // two of them reports one and --stamp rewrites it with the other still
    // contradicting it. Both live at the H1's depth here.
    const two = ['> # Title', '>', '> **Last reviewed:** 2026-01-01 · **Depth:** scanned '
      + '· **Last scanned:** 2026-01-01',
    '> **Last reviewed:** 2026-02-02 · **Depth:** scanned · **Last scanned:** 2026-02-02'];
    expect(findMarkers(two)).toEqual([2, 3]);
    expect(markerShapedLines(['> # T', '>', '> **Last reviewed:** bad'])).toEqual([2]);
  });

  it('but a quoted ASIDE under an unquoted H1 is not a marker', () => {
    // The depth has to MATCH, not merely be stripped. FRONTEND.md in this
    // repo opens with an unquoted H1, its real marker, and then a
    // `> **Companion to** ...` note carrying `> **Last refreshed:** ...` --
    // a fact about the OTHER document. Reading markers through any container
    // turned that into a second review marker and produced a P2 saying the
    // two can disagree. The corpus caught it: the first version of this fix
    // moved the run from 25 findings to 26, and the 26th was false.
    const aside = ['# Title', '',
      '**Last reviewed:** 2026-01-01 · **Depth:** scanned · **Last scanned:** 2026-01-01',
      '', '> **Companion to** x', '> **Last refreshed:** 2026-05-22.'];
    expect(findMarkers(aside)).toEqual([2]);
    expect(findMarker(aside)?.date).toBe('2026-01-01');
  });
});

describe('an ordered list marker of ten digits', () => {
  it('is paragraph text, not a container, in every scanner', () => {
    // CommonMark caps an ordered-list marker at nine digits, so
    // `1234567890. # Fake` is ordinary paragraph text -- while stripping it
    // as a container let h1Index invent an H1, headingAnchors invent
    // `#fake`, and --stamp place provenance after a heading that does not
    // exist. Codex filed it on the Python twin (stocks#1121).
    expect(h1Index(['1234567890. # Fake', '', 'body'])).toBeNull();
    expect([...headingAnchors('1234567890. # Fake\n')]).toEqual([]);
    // Nine digits is still a list, so this bounds the rule rather than
    // removing it.
    expect(h1Index(['123456789. # Real', '', 'body'])).toBe(0);
    expect([...headingAnchors('123456789. # Real\n')]).toEqual(['real']);
  });

  it('and no scanner still carries the unbounded form', () => {
    // The cap has to hold in EVERY copy: this file had twelve of
    // `(?:[-*+]|\\d+[.)])`, one per scanner, and a rule that lives in twelve
    // places grows twelve versions. Reading the source is how the next one
    // gets caught, since a scanner nobody tested would otherwise keep the
    // old form silently.
    const src = fs.readFileSync(path.join('scripts', 'docs-audit.mjs'), 'utf8');
    expect(src).not.toMatch(/\\d\+\[\.\)\]/);
    expect(src.match(/\\d\{1,9\}\[\.\)\]/g)?.length).toBeGreaterThan(8);
  });
});

describe('a reference label differing only by case', () => {
  it('is the same label, by Unicode case folding', () => {
    // CommonMark compares labels by case folding, under which `Stra\u00dfe`
    // and `STRASSE` are the same label -- `toLowerCase` leaves the sharp s
    // alone and made them two, so a heading resolving one recorded an
    // invented anchor and a valid link to the real one was reported dead.
    expect([...headingAnchors('## [Title][STRASSE]\n\n[Stra\u00dfe]: ok.md\n')])
      .toEqual(['title']);
    // Two genuinely different labels stay different, so folding is not
    // collapsing everything.
    expect([...headingAnchors('## [Title][guides]\n\n[guide]: ok.md\n')])
      .toEqual(['titleguides']);
  });
});

describe('a registry row with an unrecognised class', () => {
  it('is refused rather than silently dropped', () => {
    // `documentSet` adds a non-Markdown artefact ONLY through an exact
    // registry row, so `| E | generated.json | | |` dropped that artefact
    // from classification and from every region and content check WITHOUT an
    // unclassified finding -- the registry quietly meaning something other
    // than what it displays.
    const base = '# R\n\n## Registry\n\n| Class | Path glob | Declared code paths '
      + '| Generated regions |\n|---|---|---|---|\n| D | real.md | | |\n';
    expect(loadRegistry(base).map((r) => r.glob)).toEqual(['real.md']);
    expect(() => loadRegistry(`${base}| E | generated.json | | |\n`))
      .toThrow(/not one of A, B, C, D or X/);
    // The HEADER and separator rows are not declarations, so recognising a
    // typo must not turn the table's own frame into an error.
    expect(loadRegistry(base).length).toBe(1);
  });

  it('and one with EXTRA cells is refused too', () => {
    // An unescaped pipe in a value -- a `line:^foo|bar$` region pattern is
    // the shape -- splits into a fifth cell, and the parser silently kept
    // `line:^foo` and dropped `bar$`: a BROADER ownership map than the row
    // displays. Refused rather than truncated, because the truncation is
    // invisible in the rendered table.
    const base = '# R\n\n## Registry\n\n| Class | Path glob | Declared code paths '
      + '| Generated regions |\n|---|---|---|---|\n| D | real.md | | |\n';
    expect(() => loadRegistry(`${base}| A | gen/y.md | lib | line:^foo|bar$ |\n`))
      .toThrow(/5 cells where the table declares 4/);
    // FEWER cells is a different case and still parses: the fourth column is
    // optional and only meaningful for Class A.
    expect(loadRegistry(`${base}| D | other.md | lib |\n`).map((r) => r.glob))
      .toEqual(['real.md', 'other.md']);
  });
});

describe('an empty ATX heading', () => {
  it('is an H1 a marker can go after', () => {
    // CommonMark allows a heading with no text, so `#` alone renders an H1.
    // Requiring a title character reported no H1 at all, so the audit
    // emitted a gating marker finding and --stamp answered `skipped-no-h1`:
    // the command refusing to repair the finding it raises.
    expect(h1Index(['#', '', 'body'])).toBe(0);
    // The closing hash run is syntax too -- `# #` is an EMPTY heading, not
    // one titled `#`.
    expect(h1Index(['# #', '', 'body'])).toBe(0);
    expect(h1Index(['# Title', '', 'body'])).toBe(0);
    // And a hash run with no space after it is still not a heading, which is
    // the rule that keeps `#123 is open` out.
    expect(h1Index(['#123 open', '', 'body'])).toBeNull();
  });
});

describe('the blocker cue vocabulary', () => {
  it('covers `blocked on` and the noun form', () => {
    // `Blocked on <url>` is the same statement as `blocked by`, and the cue
    // list held only the second -- so the URL loop was skipped and the issue
    // could close with the document still presenting it as a blocker.
    expect(hasBlockingCue('blocked on something')).toBe(true);
    expect(hasBlockingCue('a blocker remains')).toBe(true);
    expect(hasBlockingCue('two blockers remain')).toBe(true);
    // The negation rules reach the new spellings, rather than the vocabulary
    // growing a hole beside them.
    expect(hasBlockingCue('not blocked on anything')).toBe(false);
    expect(hasBlockingCue("isn't a blocker")).toBe(false);
    // And a word that merely CONTAINS one is still not a cue.
    expect(hasBlockingCue('nonblocking by design')).toBe(false);
  });
});

describe('a definition-shaped line with an invalid suffix', () => {
  it('defines nothing, so its destination is not a link', () => {
    // CommonMark renders `[g]: missing.md garbage` as ordinary text -- no
    // definition, no clickable link -- while a prefix-only match registered
    // the destination and reported a gating dead link for a target no reader
    // can reach.
    expect(checkDeadLinks('d.md', '[g]: missing.md garbage\n', linkCtx(['d.md'])))
      .toEqual([]);
    expect(checkDeadLinks('d.md', '[g]: missing.md "unclosed\n', linkCtx(['d.md'])))
      .toEqual([]);
    // Each of the three title forms, and no title at all, are still
    // definitions -- so this requires a valid remainder rather than an empty
    // one.
    for (const tail of ['', ' "t"', " 't'", ' (t)']) {
      expect(checkDeadLinks('d.md', `[g]: missing.md${tail}\n`, linkCtx(['d.md']))
        .map((f) => f.check)).toEqual(['dead-link']);
    }
  });
});

describe('a blocker label above a code block', () => {
  it('does not reach the list below it', () => {
    // A rendered code block INTERRUPTS the list a label introduces. The
    // early return skipped the block without clearing the carried cue, so a
    // later unrelated list item inherited it -- a gating finding on a closed
    // issue the prose never called a blocker.
    const closed = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
    const url = 'https://github.com/TeneikaAskew/solyra/issues/1';
    const across = `Blocked by:\n\n\`\`\`\nsample\n\`\`\`\n\n- unrelated ${url}\n`;
    expect(checkClosedIssues('d.md', across, closed)).toEqual([]);
    // The label still reaches its OWN list, so the carry is interrupted
    // rather than switched off.
    expect(checkClosedIssues('d.md', `Blocked by:\n\n- ${url}\n`, closed)
      .map((f) => f.check)).toEqual(['closed-issue']);
  });
});

describe('a tab-indented list item holding a fence', () => {
  it('measures the content column in columns, not characters', () => {
    // CommonMark advances a tab to the next multiple of four, so `-\titem`
    // puts the content column at four while counting characters gives two --
    // and a fence indented to the real column was then rejected as four
    // characters too deep, so the block was not code and a link DISPLAYED
    // inside it became a gating dead link.
    const lines = ['-\titem', '', '      ~~~', '      [x](missing.md)', '      ~~~'];
    expect([...fencedLines(lines)]).toEqual([2, 3, 4]);
  });
});

describe('a marker carrying two spellings of one field', () => {
  it('is a duplicate however it is cased', () => {
    // `**Owner:** Alice · **owner:** Bob` passed the duplicate count because
    // it was case-SENSITIVE while the malformed-field filter beside it and
    // `ownerOf` both read labels case-insensitively. The parser took Alice
    // and `--stamp` then deleted Bob silently, so conflicting provenance was
    // lost rather than reported and refused.
    const line = '**Last reviewed:** 2026-01-01 · **Owner:** Alice · **owner:** Bob';
    expect(checkMarkerDates('d.md', { date: '2026-01-01', scanned: null },
      '2026-09-18', line).map((f) => f.detail))
      .toEqual(['the marker carries 2 `Owner:` fields; they can disagree and '
        + 'only the first is read']);
    // One field is still one field.
    expect(checkMarkerDates('d.md', { date: '2026-01-01', scanned: null },
      '2026-09-18', '**Last reviewed:** 2026-01-01 · **Owner:** Alice')).toEqual([]);
  });

  it('and --stamp refuses it rather than picking one', () => {
    const doc = '# T\n\n**Last reviewed:** 2026-01-01 · **Owner:** Alice '
      + '· **owner:** Bob · **Last scanned:** 2026-01-01\n\nbody\n';
    expect(stamp(doc, '2026-09-18', 'scanned', 'abc1234', false).action)
      .toBe('skipped-duplicate-marker-field');
  });
});

describe('two review markers in the opening section', () => {
  it('stop --stamp rather than being half rewritten', () => {
    // `findMarker` picks the first and the update path rewrote only that
    // line, so `--stamp --verify` returned `updated` and exited successfully
    // while leaving a second, contradictory date and SHA in place -- a
    // document the same run had already reported as carrying duplicates. The
    // INSERTION path has refused a misplaced marker for rounds on exactly
    // this reasoning; the update path had no such check.
    const two = '# T\n\n**Last reviewed:** 2026-01-01 · **Depth:** scanned '
      + '· **Last scanned:** 2026-01-01\n**Last reviewed:** 2026-02-02 '
      + '· **Depth:** scanned · **Last scanned:** 2026-02-02\n\nbody\n';
    const res = stamp(two, '2026-09-18', 'scanned', 'abc1234', false);
    expect(res.action).toBe('skipped-duplicate-marker');
    expect(res.text).toBe(two);
    // One marker is still updated, so this refuses a specific shape rather
    // than switching the update path off.
    const one = '# T\n\n**Last reviewed:** 2026-01-01 · **Depth:** scanned '
      + '· **Last scanned:** 2026-01-01\n\nbody\n';
    expect(stamp(one, '2026-09-18', 'scanned', 'abc1234', false).action)
      .toBe('updated');
  });
});

describe('a fragment written as a character reference', () => {
  it('is the fragment, not part of the filename', () => {
    // `&#35;` resolves to `#` when the link is constructed, so
    // `[x](README.md&#35;tests)` gives the href `README.md#tests` and the
    // browser splits there -- while the audit looked for a tracked file
    // literally named `README.md#tests` and reported a gating dead link
    // against one that exists. The caller's split consumes references as
    // UNITS, deliberately, so it cannot see this one.
    const target = 'docs-audit-frag-anchor.md';
    fs.writeFileSync(target, '# Target\n\n## Tests\n\nbody\n');
    try {
      const ctxWith = linkCtx(['d.md', target]);
      expect(checkDeadLinks('d.md', `[x](${target}&#35;tests)\n`, ctxWith)).toEqual([]);
      // And the anchor is CHECKED, rather than merely skipped: a fragment
      // naming nothing is still reported.
      expect(checkDeadLinks('d.md', `[x](${target}&#35;gone)\n`, ctxWith)
        .map((f) => f.check)).toEqual(['dead-anchor']);
    } finally {
      fs.unlinkSync(target);
    }
  });

  it('and a BACKSLASH-escaped hash is left alone', () => {
    // Whether CommonMark percent-encodes an escaped `#` is a question I have
    // not put to a reference implementation, and two existing assertions say
    // `[x](a\\#b.md)` targets the tracked `a#b.md`. The split is therefore on
    // the decoded reference only -- which is why the decode happens in two
    // steps: references, split, then escapes.
    expect(checkDeadLinks('d.md', '[x](a\\#b.md)\n', linkCtx(['d.md', 'a#b.md'])))
      .toEqual([]);
  });
});

describe('tag-shaped text that is not a tag', () => {
  it('is left in the heading slug', () => {
    // `## A <span ???>B` renders the tag-shaped text LITERALLY and anchors
    // `a-span-b`, but a pattern that accepted "anything that is not an angle
    // bracket" after the name matched it and recorded `a-b` -- a valid
    // fragment link rejected and a nonexistent one accepted, the usual pair.
    // The attribute grammar CommonMark specifies is a name plus an optional
    // unquoted, single-quoted or double-quoted value.
    expect(headingSlug('A <span ???>B')).toBe('a-span-b');
    // The real forms are still markup, so this narrows the pattern to the
    // spec rather than switching it off.
    expect(headingSlug('Hello <em>world</em>')).toBe('hello-world');
    expect(headingSlug('A <span class="x">B')).toBe('a-b');
    expect(headingSlug('A <span data-x=1>B')).toBe('a-b');
    expect(headingSlug('A <br/> B')).toBe('a--b');
    // And an AUTOLINK is still not a tag: it renders as the URL.
    expect(headingSlug('A <https://example.com> B')).toBe('a-httpsexamplecom-b');
  });
});

describe('a tag inside a link destination or title', () => {
  it('creates no element, so it offers no anchor', () => {
    // A link's destination and title are metadata: tag-shaped text in either
    // renders inside a URL or a `title` attribute, never as an element. The
    // scan read it as one and registered `fake`, so a later `[y](#fake)`
    // passed against a destination that exists nowhere.
    expect([...headingAnchors('# T\n\n[x](README.md "<div id=fake>")\n')])
      .toEqual(['t']);
    expect([...headingAnchors('# T\n\n[x](<div id=fake>)\n')]).toEqual(['t']);
    // A real tag OUTSIDE a link, and one in the visible LABEL, are both
    // still elements -- the mask covers the metadata and nothing else.
    expect([...headingAnchors('# T\n\n<div id=real>\n')].sort())
      .toEqual(['real', 't']);
    expect([...headingAnchors('# T\n\n[<div id=inlabel>](README.md)\n')].sort())
      .toEqual(['inlabel', 't']);
  });
});

describe('a blocking cue and its citation on separate lines', () => {
  const closed = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
  const URL = 'https://github.com/TeneikaAskew/solyra/issues/1';
  const checks = (doc) => checkClosedIssues('d.md', doc, closed).map((f) => f.check);

  it('are one sentence when a SOFT break joins them', () => {
    // `Blocked by` then the URL on the next line renders as one sentence, but
    // the scan read physical lines, so the cue and the citation never met and
    // a closed issue produced no finding at all -- the direction that hides
    // them. The list form already carried its label; the plain paragraph did
    // not.
    expect(checks(`Blocked by\n${URL}\n`)).toEqual(['closed-issue']);
    expect(checks(`Blocked by ${URL}\n`)).toEqual(['closed-issue']);
  });

  it('and are not, across a block boundary', () => {
    // A blank line, a heading and a fence each end the paragraph, so a cue
    // above one does not reach the text below it. Without these the carry
    // would reach the whole document.
    expect(checks(`Blocked by\n\n${URL}\n`)).toEqual([]);
    expect(checks(`Blocked by\n# H\n${URL}\n`)).toEqual([]);
    expect(checks(`Blocked by\n\`\`\`\nx\n\`\`\`\n${URL}\n`)).toEqual([]);
    // And a NEGATED cue carries nothing, so the carry inherits the
    // negation rules rather than working around them.
    expect(checks(`isn't blocking\n${URL}\n`)).toEqual([]);
  });
});

describe('a Markdown link title', () => {
  const closed = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };

  it('is metadata, not prose the blocker scan reads', () => {
    // A title renders as the anchor's `title` attribute -- a tooltip, never
    // a followable citation -- so it says nothing about live work. The scan
    // read the cue and the URL as ordinary prose and emitted a gating P1
    // once that issue closed.
    const titled = '[x](README.md "Still open '
      + 'https://github.com/TeneikaAskew/solyra/issues/1")\n';
    expect(checkClosedIssues('d.md', titled, closed)).toEqual([]);
  });

  it('but the DESTINATION is still a citation', () => {
    // An issue URL in the destination is a link a reader can follow, so it
    // IS a citation -- the same split tagAttributeSpans makes for `href`.
    const linked = 'Blocked by [issue 1]'
      + '(https://github.com/TeneikaAskew/solyra/issues/1)\n';
    expect(checkClosedIssues('d.md', linked, closed).map((f) => f.check))
      .toEqual(['closed-issue']);
    // And bare prose is unchanged.
    expect(checkClosedIssues('d.md',
      'Still open https://github.com/TeneikaAskew/solyra/issues/1\n', closed)
      .map((f) => f.check)).toEqual(['closed-issue']);
  });
});

describe('a parenthesised heading suffix', () => {
  it('is stripped only when it is a valid inline link', () => {
    // `balancedClose` answers a narrower question than the one being asked:
    // it finds a matching parenthesis, not a link. A destination may not
    // carry whitespace unbracketed, and an unclosed title is not a title --
    // CommonMark renders each of these sources literally, so the stripper
    // removed VISIBLE text, recorded `x`, and rejected a link to the real
    // anchor while accepting a `#x` the page does not expose.
    expect(headingSlug('[x](foo bar)')).toBe('xfoo-bar');
    expect(headingSlug('[x](foo "unclosed)')).toBe('xfoo-unclosed');
    // The real shapes are still stripped, so this narrows the rule to what
    // CommonMark accepts rather than switching it off.
    expect(headingSlug('[x](foo.md)')).toBe('x');
    expect(headingSlug('[x](foo.md "t")')).toBe('x');
    expect(headingSlug('Real [x](guide.md)')).toBe('real-x');
  });

  it('and a reference label may carry an escaped bracket', () => {
    // `indexOf(']')` stops at an ESCAPED bracket, so `## [Guide][my\\]ref]`
    // with a matching definition failed to resolve and slugged as
    // `guidemyref` while the page exposes `guide`. The label walk beside
    // this one already skipped escapes; this second scan did not.
    expect(headingSlug('[Guide][my\\]ref]', new Set(['my\\]ref']))).toBe('guide');
    // An UNDEFINED label is still literal text, which is the rule that keeps
    // bracketed prose from being read as a reference.
    expect(headingSlug('[Guide][my\\]ref]', new Set())).toBe('guidemyref');
  });
});

describe('a combining mark in a heading', () => {
  it('stays in the slug', () => {
    // An NFD heading -- `Cafe` + U+0301 -- renders as `Café` and GitHub's
    // identifier keeps the mark. `\\p{M}` was missing from the allowlist, so
    // the slug came out `cafe`: the working encoded fragment rejected AND a
    // `#cafe` the page does not expose accepted, wrong in both directions.
    // NFD in, NFD out -- GitHub does not normalise either, so a `#café`
    // written NFC against an NFD heading genuinely does not navigate.
    expect(headingSlug('Cafe\u0301')).toBe('cafe\u0301');
    expect(headingSlug('Caf\u00e9')).toBe('caf\u00e9');
    // Ordinary punctuation is still stripped, so this widens the allowlist
    // by exactly one category rather than loosening it.
    expect(headingSlug('Dogs & Cats')).toBe('dogs--cats');
  });
});

describe('a marker-shaped example in a raw HTML block', () => {
  it('is not counted as a malformed marker', () => {
    // `<div>` around `**Last reviewed:** bad` SHOWS the shape without writing
    // a marker. `findMarkers` excludes raw HTML blocks and this did not, so
    // the valid-marker path correctly found none while this path counted it:
    // `stamp()` returned `skipped-malformed-marker`, and the document
    // demonstrating a bad marker could never be given a good one.
    const lines = ['# T', '', '<div>', '**Last reviewed:** bad', '</div>', '', 'Body.'];
    expect(markerShapedLines(lines)).toEqual([]);
    // Outside the block the same line IS malformed, so the exclusion is about
    // the container rather than about the text.
    expect(markerShapedLines(['# T', '', '**Last reviewed:** bad'])).toEqual([2]);
  });
});

describe('a repeated anchor attribute', () => {
  it('keeps only the first occurrence, as HTML parsing does', () => {
    // `<div id="real" id="fake">` offers `real` and nothing else; recording
    // both let a link to `#fake` pass the dead-anchor check against a
    // destination the page does not have.
    expect([...headingAnchors('<div id="real" id="fake">\n')]).toEqual(['real']);
    expect([...headingAnchors('<a name="real" name="fake"></a>\n')]).toEqual(['real']);
    // Two DIFFERENT tags each keep their own, so the rule is per tag.
    expect([...headingAnchors('<div id="a"><div id="b">\n')].sort()).toEqual(['a', 'b']);
  });
});

describe('a registry row shown inside a raw HTML block', () => {
  it('is displayed, not executed as a rule', () => {
    // `<pre>` renders `| D | fake.md |` literally. The collector's exclusion
    // set had fences, comments and indented examples and NOT this fourth
    // way of showing a row, so the example became a live rule -- a
    // fabricated missing-path finding, or a classification silently applied
    // to a real path.
    const reg = '# R\n\n## Registry\n\n| Class | Path |\n|---|---|\n| D | real.md |\n'
      + '\n<pre>\n| D | fake.md |\n</pre>\n';
    expect(loadRegistry(reg).map((r) => r.glob)).toEqual(['real.md']);
    // A RENDERED block is not the same thing: `<div>` shows a table as a
    // table, so a row there is not an example. Both directions, so this is
    // not "ignore anything near a tag".
    const rendered = '# R\n\n## Registry\n\n| Class | Path |\n|---|---|\n| D | real.md |\n'
      + '\n<div>\n\n| D | live.md |\n\n</div>\n';
    expect(loadRegistry(rendered).map((r) => r.glob)).toEqual(['real.md', 'live.md']);
  });
});

describe('a generated-region delimiter shown as an example', () => {
  it('is not registered as the region itself', () => {
    // A Class A document that has LOST its real region but demonstrates the
    // pair inside `<pre>`, or as an indented sample, had the EXAMPLE counted
    // as the region: the declared region read as matched, the missing-region
    // finding was suppressed, and the sample's own lines routed to the
    // renderer as generated. The fenced case was covered; these two were not.
    const raw = '# T\n\n<pre>\n<!-- inventory:x:start -->\nsample\n<!-- inventory:x:end -->\n</pre>\n';
    const fromRaw = ownedLines(raw, ['inventory:*']);
    expect([...fromRaw.owned]).toEqual([]);
    expect(fromRaw.unmatched).toEqual(['inventory:*']);
    const indented = '# T\n\n    <!-- inventory:x:start -->\n    sample\n    <!-- inventory:x:end -->\n';
    expect([...ownedLines(indented, ['inventory:*']).owned]).toEqual([]);
    // The real pair is still the region.
    const real = '# T\n\n<!-- inventory:x:start -->\nr\n<!-- inventory:x:end -->\n';
    expect([...ownedLines(real, ['inventory:*']).owned]).toEqual([3, 4, 5]);
  });
});

describe('a fixed-width glob against a star glob', () => {
  it('ranks the one that constrains the name higher', () => {
    // `?` matches EXACTLY one character, so `docs/??.md` is strictly narrower
    // than `docs/*.md` -- but counting wildcard TOKENS ranked the broader
    // rule first because it has fewer of them, and an `X` row on `docs/*.md`
    // could silently suppress a living `docs/??.md`.
    const q = globSpecificity('docs/??.md');
    const star = globSpecificity('docs/*.md');
    const cmp = (a, b) => { for (let i = 0; i < a.length; i += 1) { if (a[i] !== b[i]) return b[i] - a[i]; } return 0; };
    expect(cmp(q, star)).toBeLessThan(0);
    // An exact row still beats both, and the recursive ranking is unchanged.
    expect(cmp(globSpecificity('docs/ab.md'), q)).toBeLessThan(0);
    expect(cmp(globSpecificity('docs/*.md'), globSpecificity('docs/**/*.md')))
      .toBeLessThan(0);
  });
});

describe('a blocker label whose line ends in a hidden comment', () => {
  it('still carries its context to the list below', () => {
    // The equal-length mask leaves NULs after the colon, so the anchored
    // `:\s*$` failed, the carried context was cleared, and every closed issue
    // in the list below went unreported.
    const U = (n) => `https://github.com/TeneikaAskew/stocks/issues/${n}`;
    const states = { stocks: { 861: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
    expect(checkClosedIssues('d.md', `Blocked by: <!-- note -->\n\n- ${U(861)}\n`, states))
      .toHaveLength(1);
    // A plain label still works, and a line that is NOT a label still carries
    // nothing -- the fix is not "always carry context".
    expect(checkClosedIssues('d.md', `Blocked by:\n\n- ${U(861)}\n`, states)).toHaveLength(1);
    expect(checkClosedIssues('d.md', `Some prose.\n\n- ${U(861)}\n`, states)).toEqual([]);
  });
});

describe('a blocker cue split by emphasis', () => {
  it('is read from the rendered text, not the raw markup', () => {
    // `is still **open**` renders as "is still open" and plainly cites live
    // work, but the classifier saw the `**` between the words and found no
    // cue -- so a closed issue vanished from the audit entirely.
    expect(hasBlockingCue(stripEmphasis('Issue is still **open**'))).toBe(true);
    expect(hasBlockingCue(stripEmphasis('Issue is **blocked** by #1'))).toBe(true);
    // Offsets survive, which everything downstream depends on.
    expect(stripEmphasis('a **b** c')).toHaveLength('a **b** c'.length);
    // An intraword underscore is a literal character, not emphasis.
    expect(stripEmphasis('API_FIELD')).toBe('API_FIELD');
    // And prose with no cue still has none.
    expect(hasBlockingCue(stripEmphasis('Issue **merged** last April'))).toBe(false);
    const U = (n) => `https://github.com/TeneikaAskew/stocks/issues/${n}`;
    const states = { stocks: { 861: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
    expect(checkClosedIssues('d.md', `Issue is still **open**: ${U(861)}\n`, states))
      .toHaveLength(1);
  });
});

describe('a link destination carrying backslash escapes', () => {
  it('resolves to the file the rendered link points at', () => {
    // Markdown removes the escapes when the destination renders, so
    // `[x](docs/foo\(bar\).md)` links to the tracked `docs/foo(bar).md`;
    // keeping them reported a valid link as dead.
    const ctx = linkCtx(['docs/foo(bar).md', 'd.md']);
    expect(checkDeadLinks('d.md', '# T\n\n[x](docs/foo\\(bar\\).md)\n', ctx,
      { backtickedPaths: false })).toEqual([]);
    // A reference definition goes through the same check.
    expect(checkDeadLinks('d.md', '# T\n\n[x][g]\n\n[g]: docs/foo\\(bar\\).md\n', ctx,
      { backtickedPaths: false })).toEqual([]);
    // A genuinely missing one is still dead.
    expect(checkDeadLinks('d.md', '# T\n\n[x](docs/nope\\(y\\).md)\n', ctx,
      { backtickedPaths: false })).toHaveLength(1);
    // Only ASCII punctuation is unescaped -- a backslash elsewhere is a
    // literal character and dropping it would name a different path.
    expect(unescapeMarkdown('a\\(b\\)c')).toBe('a(b)c');
    expect(unescapeMarkdown('a\\qb')).toBe('a\\qb');
  });
});

// ── round 29 parity with the Python twin (stocks#1121) ──────────────────────

describe('an indented code line in the opening section', () => {
  it('is not read as a Setext heading', () => {
    // An indented line followed by `---` is a code block and a thematic
    // break. Omitted from the mask, isSetextUnderline read it as a heading
    // and `stop = j - 1` cut the window short of the code block entirely.
    const lines = ['# T', '', '    sample code', '---', '', MARK('2026-01-01', 'me'),
      '', 'Body.'];
    expect(markerWindow(lines).to).toBe(4);
    // findMarkers reads the wider section and now SEES the marker below it,
    // which is what lets the misplaced case below be reported rather than
    // silently duplicated.
    expect(findMarkers(lines)).toEqual([5]);
    // A real Setext heading still closes the window.
    expect(markerWindow(['# T', '', 'Sub', '---', '', MARK('2026-01-01', 'me'), '', 'B.'])
      .to).toBe(3);
  });
});

describe('a marker below the opening paragraph', () => {
  it('is misplaced, and stamp refuses rather than adding a second', () => {
    // findMarker did not select it (the registry puts the marker in the first
    // paragraph), so the audit reported "no review marker" and --stamp
    // inserted one ABOVE it -- leaving the document with two contradictory
    // markers, which is the failure the whole marker machinery exists to
    // prevent. findMarkers had the information all along.
    const lines = ['# T', '', 'Intro paragraph.', '', MARK('2026-01-01', 'me'), '', 'Body.'];
    expect(findMarker(lines)).toBe(null);
    expect(findMarkers(lines)).toEqual([4]);
    const out = stamp(lines.join('\n'), '2026-03-03', null, null);
    expect(out.action).toBe('skipped-misplaced-marker');
    expect(out.text.match(/Last reviewed/g)).toHaveLength(1);
    // A document with NO marker still gets one, and a properly placed marker
    // is still updated -- the refusal is not "never stamp".
    expect(stamp('# T\n\nBody.\n', '2026-03-03', null, null).action).toBe('inserted');
    expect(stamp(['# T', '', MARK('2026-01-01', 'me'), '', 'B.'].join('\n'),
      '2026-03-03', null, null).action).toBe('updated');
  });
});

describe('a list continuation line', () => {
  it('keeps the item’s code floor for the lines after it', () => {
    // Resetting the floor to four on a continuation meant the next four-space
    // line after a blank read as a code block, although a `- ` item needs six
    // -- so rendered continuation content was skipped by the link and blocker
    // checks. Parity with the Python twin.
    const doc = ['# T', '', '- item text', '', '    continuation', '',
      '    [x](missing.md) still in the item', ''];
    expect([...indentedCodeLines(doc)]).toEqual([]);
    // Six spaces inside the item IS code; a four-space block outside a list
    // still is; and the list ENDS at an unindented line.
    expect([...indentedCodeLines(['# T', '', '- item', '', '      cont', '',
      '      code', ''])]).toEqual([4, 6]);
    expect([...indentedCodeLines(['# T', '', '    code'])]).toEqual([2]);
    expect([...indentedCodeLines(['# T', '', '- item', '', 'back to prose', '',
      '    code', ''])]).toEqual([6]);
  });
});

describe('a backticked path with a non-ASCII character', () => {
  it('is checked like any other citation', () => {
    // The ASCII-only class never recognised it, so deleting or renaming that
    // file produced no dead-link finding -- while the git inventory preserves
    // such filenames and the percent-encoded Markdown link IS checked.
    const ctx = linkCtx(['docs/café.md', 'd.md']);
    const out = checkDeadLinks('d.md', '# T\n\nSee `docs/goneé.md` here.\n', ctx);
    expect(out.map((f) => f.detail)).toEqual(['backticked path -> docs/goneé.md']);
    // A tracked non-ASCII path is satisfied, and ASCII behaves as before.
    expect(checkDeadLinks('d.md', '# T\n\nSee `docs/café.md` here.\n', ctx)).toEqual([]);
    expect(checkDeadLinks('d.md', '# T\n\nSee `docs/gone.md` here.\n', ctx)
      .map((f) => f.detail)).toEqual(['backticked path -> docs/gone.md']);
  });
});

// ── round 30 (f06ecc0) ──────────────────────────────────────────────────────

const R30_STATES = { stocks: {}, solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
const R30_URL = 'https://github.com/TeneikaAskew/solyra/issues/1';

describe('a blocker list inside a blockquote', () => {
  it('keeps the label’s context, because the quote is a container', () => {
    // The `>` stayed in `visible`, so the list line was not recognised as an
    // item, the line cleared `carried`, and closed blockers in the quoted
    // list produced no finding at all.
    expect(checkClosedIssues('d.md', `> Blocked by:\n> - ${R30_URL}\n`, R30_STATES))
      .toHaveLength(1);
    // Unquoted still works, and a quoted line that is NOT a label still
    // carries nothing -- the fix is not "always carry context".
    expect(checkClosedIssues('d.md', `Blocked by:\n- ${R30_URL}\n`, R30_STATES))
      .toHaveLength(1);
    expect(checkClosedIssues('d.md', `> Some prose.\n> - ${R30_URL}\n`, R30_STATES))
      .toEqual([]);
  });
});

describe('an escaped link bracket', () => {
  it('is literal text, not a link', () => {
    // `\[x](missing.md)` renders as literal text, so a document
    // demonstrating link syntax that way drew a gating dead-link finding for
    // a destination no reader can follow.
    expect(checkDeadLinks('d.md', '# T\n\nWrite \\[x](missing.md) to show.\n',
      linkCtx(['d.md']), { backtickedPaths: false })).toEqual([]);
    // An unescaped one is still checked, and parity matters: `\\[x](y.md)` IS
    // a link preceded by a literal backslash.
    expect(checkDeadLinks('d.md', '# T\n\n[x](missing.md)\n', linkCtx(['d.md']),
      { backtickedPaths: false })).toHaveLength(1);
    expect([isEscaped('\\[x', 1), isEscaped('\\\\[x', 2), isEscaped('a[x', 1)])
      .toEqual([true, false, false]);
  });
});

describe('a raw HTML block that is not raw text', () => {
  it('is masked too, and ends at a blank line', () => {
    // CommonMark type 6: `<div>` runs to the next BLANK line, and renders its
    // bracket syntax literally exactly as `<pre>` does -- but only type 1 was
    // masked, so the sample emitted a gating dead-link finding.
    expect([...rawHtmlBlockLines(['# T', '', '<div>', '[x](m.md)', '</div>', '',
      '[y](n.md)'])]).toEqual([2, 3, 4]);
    // Prose mentioning the tag is not a block, an unknown tag is not a block,
    // and an inline-only tag is not a block.
    expect([...rawHtmlBlockLines(['# T', '', 'Use <div> in prose.', '', '[x](m.md)'])])
      .toEqual([]);
    // An unknown tag on a line of its OWN is a CommonMark type-7 block and
    // does open one -- this assertion said otherwise and was wrong against the
    // spec, which is the defect Codex reported on `bd0126a`. Prose merely
    // MENTIONING a tag still opens nothing, which is the assertion above.
    expect([...rawHtmlBlockLines(['<widget>', '[x](m.md)'])]).toEqual([0, 1]);
    expect([...rawHtmlBlockLines(['# T', '', '<span>x</span>', '', '[y](n.md)'])])
      .toEqual([]);
  });
});

describe('a code span that crosses a line break', () => {
  it('is still code', () => {
    // codeSpans is per physical line and cannot see either delimiter of a
    // span opened on one line and closed on the next, so a sample written
    // that way was scanned as live prose.
    expect(checkClosedIssues('d.md', `\`still open ${R30_URL}\n\`\n`, R30_STATES))
      .toEqual([]);
    // A real citation is still reported.
    expect(checkClosedIssues('d.md', `still open ${R30_URL}\n`, R30_STATES))
      .toHaveLength(1);
    expect([...codeSpanLines(['`a', 'b`']).keys()]).toEqual([0, 1]);
  });
});

describe('an explicit HTML anchor', () => {
  it('is a destination, so a link to it is not dead', () => {
    // `<a name="legacy"></a>` and any `id="..."` are rendered destinations
    // GitHub honours; recording only heading slugs made the dead-anchor check
    // reject a valid link and fail --check.
    expect([...headingAnchors('# T\n\n<a name="legacy"></a>\n\n## Real\n')])
      .toEqual(['t', 'real', 'legacy']);
    expect([...headingAnchors('# T\n\n<div id="sec-2">x</div>\n')]).toEqual(['t', 'sec-2']);
    // Inside a fence or a RAW-TEXT block the tag renders literally and
    // exposes nothing -- a type-6 block, by contrast, IS the anchor.
    expect([...headingAnchors('# T\n\n```\n<a name="nope"></a>\n```\n')]).toEqual(['t']);
    expect([...headingAnchors('# T\n\n<pre>\n<a name="nope"></a>\n</pre>\n')]).toEqual(['t']);
  });
});

describe('a host-root link destination', () => {
  it('is a URL, not a repository path', () => {
    // `[Dashboard](/dashboard)` is a route this app serves. Stripping the
    // slash and looking it up in `tracked` reported valid application links
    // as dead, and would have accepted one wherever a same-named directory
    // happened to exist.
    expect(checkDeadLinks('d.md', '# T\n\n[Dash](/dashboard)\n', linkCtx(['d.md']),
      { backtickedPaths: false })).toEqual([]);
    // A relative destination is still checked.
    expect(checkDeadLinks('d.md', '# T\n\n[x](docs/gone.md)\n',
      linkCtx(['d.md', 'docs/a.md']), { backtickedPaths: false })).toHaveLength(1);
  });
});

describe('a registry glob with a bracket expression', () => {
  it('compiles, rather than being silently inert', () => {
    // Every other reader treats `[` as a wildcard token, so escaping it here
    // made `docs/[ab].md` match nothing at all: a P1 inert-rule finding and
    // the documents it meant to cover left unclassified.
    const reg = (g) => loadRegistry(
      `# R\n\n## Registry\n\n| Class | Path |\n|---|---|\n| D | ${g} |\n`);
    expect(classify('docs/a.md', reg('docs/[ab].md')).cls).toBe('D');
    expect(classify('docs/c.md', reg('docs/[ab].md')).cls).toBe(null);
    // Glob negation, and the other wildcards unaffected -- the bracket
    // sentinel must not collide with the `**` one.
    expect(classify('docs/b.md', reg('docs/[!a].md')).cls).toBe('D');
    expect(classify('docs/a.md', reg('docs/[!a].md')).cls).toBe(null);
    expect(classify('docs/z.md', reg('docs/*.md')).cls).toBe('D');
    expect(classify('docs/s/z.md', reg('docs/**/*.md')).cls).toBe('D');
  });
});

describe('a link destination carrying a character reference', () => {
  it('resolves to the file the rendered link points at', () => {
    // Markdown resolves references before constructing the link, so
    // `[x](foo&amp;bar.md)` targets a tracked `foo&bar.md`.
    expect(checkDeadLinks('d.md', '# T\n\n[x](foo&amp;bar.md)\n',
      linkCtx(['foo&bar.md', 'd.md']), { backtickedPaths: false })).toEqual([]);
  });
});

describe('a derivation naming an untracked path', () => {
  it('is refused, because git grep would search no files', () => {
    // `git grep` searches the INDEX, so a path that exists but is untracked
    // made the existence check pass while the search covered no files and
    // exited 1 -- read as a legitimate count of zero, so a zero claim passed
    // having measured nothing. Measured: both cases exit 1.
    expect(() => derive('grep-count node_modules foo'))
      .toThrow(/is not tracked/);
    // A missing path keeps its own, more specific message, and a tracked path
    // with no matches is still a real zero.
    expect(() => derive('grep-count nosuchdir foo')).toThrow(/does not exist/);
    // A pattern that cannot occur in this file, which lives under `scripts/`
    // and would otherwise count its own fixture.
    expect(derive(`grep-count scripts qqx${'zz'}nomatch${'9'}qqx`)).toBe(0);
  });
});

describe('a Setext-titled document', () => {
  it('opens its marker window after the underline', () => {
    // h1Index returns the TITLE line, so the scan started on the document's
    // own `=====` underline, isSetextUnderline recognised it, and the window
    // closed before it opened -- `{from: 1, to: 0}`. A correctly placed
    // marker was reported missing and every --stamp inserted another.
    const lines = ['Title', '=====', '', MARK('2026-01-01', 'me'), '', 'Body.'];
    expect(markerWindow(lines)).toEqual({ from: 2, to: 6 });
    expect(findMarker(lines).idx).toBe(3);
    // An ATX title still behaves.
    expect(findMarker(['# T', '', MARK('2026-01-01', 'me'), '', 'B.']).idx).toBe(2);
  });
});

describe('a fence opener indented four spaces', () => {
  it('is indented code, measured against its container', () => {
    // Two indentation components side by side allowed six spaces with no
    // container at all, and `    ``` ` is a one-line indented code block.
    // Opening on it masked every real link and blocker below until another
    // fence appeared -- the direction that hides findings.
    expect([...fencedLines(['# T', '', '    ```', '[x](m.md)', '', '[y](n.md)'])])
      .toEqual([]);
    expect([...fencedLines(['# T', '', '   ```', 'x', '   ```'])]).toEqual([2, 3, 4]);
    // A flat three-space cap would be wrong the other way: inside a list the
    // fence sits at the item's content column. `- ` gives column 2, so 2..5
    // open and 6 does not; `1. ` gives 3, so 6 does.
    // The sample lines are indented INTO the item, because a column-zero line
    // ends the item and the fence with it -- see the case below. What this
    // block measures is the opener's cap, not where the block ends.
    expect([...fencedLines(['- item', '', '  ```', '  x', '  ```'])]).toEqual([2, 3, 4]);
    expect([...fencedLines(['- item', '', '     ```', '     x', '     ```'])]).toEqual([2, 3, 4]);
    expect([...fencedLines(['- item', '', '      ```', '      x', '      ```'])]).toEqual([]);
    expect([...fencedLines(['1. item', '', '      ```', '      x', '      ```'])]).toEqual([2, 3, 4]);
    // A column-zero line ENDS the item, so the fence ends with it and the
    // closing delimiter opens a new block. This assertion used to read
    // [2, 3, 4] and was wrong: rendered through marked, `x` comes out as its
    // own <p> OUTSIDE the <pre>, and the trailing delimiter opens a second,
    // empty code block. Fence-ends-with-its-list-item was raised by review on
    // this file; the correction to this expectation is part of that fix.
    expect([...fencedLines(['- item', '', '  ```', 'x', '  ```'])]).toEqual([2, 4]);
    // And the list ends at an unindented line.
    expect([...fencedLines(['- item', '', 'prose', '', '    ```', 'x'])]).toEqual([]);
  });
});

describe('a Markdown document with an alternate suffix', () => {
  it('is in the document set', () => {
    // `.md` alone left a tracked `docs/runbook.markdown` or `README.MD` out
    // COMPLETELY -- no unclassified finding, no marker, link or blocker
    // check -- although documentSet claims to enumerate Markdown documents.
    expect([isMarkdownPath('a.markdown'), isMarkdownPath('README.MD'),
      isMarkdownPath('a.mdown'), isMarkdownPath('a.txt')])
      .toEqual([true, true, true, false]);
    expect(documentSet(new Set(['docs/a.markdown', 'docs/b.md', 'c.txt']), []))
      .toEqual(['docs/a.markdown', 'docs/b.md']);
  });
});

describe('an atomic stamp of a file with a non-default mode', () => {
  it('keeps the mode the target had', () => {
    // The temp file is created with default permissions and then REPLACES the
    // original, so stamping a tracked executable Markdown file turned it from
    // 100755 to 100644 -- an unrelated diff, and a broken consumer wherever
    // the bit mattered.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-audit-mode-'));
    fs.writeFileSync(path.join(dir, 'a.md'), '# A\n');
    fs.chmodSync(path.join(dir, 'a.md'), 0o755);
    writeStamps([{ doc: 'a.md', text: '# A\n\nstamped\n' }], { repo: dir });
    expect(fs.statSync(path.join(dir, 'a.md')).mode & 0o777).toBe(0o755);
    // An ordinary file keeps its ordinary mode -- the fix is not "always 755".
    fs.writeFileSync(path.join(dir, 'b.md'), '# B\n');
    fs.chmodSync(path.join(dir, 'b.md'), 0o644);
    writeStamps([{ doc: 'b.md', text: '# B\n\nstamped\n' }], { repo: dir });
    expect(fs.statSync(path.join(dir, 'b.md')).mode & 0o777).toBe(0o644);
  });
});

// ── round 31 parity with the Python twin (stocks#1121) ──────────────────────

describe('a fence delimiter inside an HTML comment', () => {
  it('opens nothing, because it is commented-out HTML', () => {
    // An unmatched ``` inside `<!-- ... -->` opened a fence, and every visible
    // line after the comment was then classified as code -- dead-link,
    // blocker, marker and heading checks all suppressed until another fence
    // happened to occur.
    expect([...fencedLines(['# T', '<!--', '```', '-->', '', '[x](m.md)'])])
      .toEqual([]);
    // A real fence still opens, and a comment INSIDE a fence is part of the
    // example rather than a reason to stop.
    expect([...fencedLines(['# T', '', '```', 'x', '```'])]).toEqual([2, 3, 4]);
    expect([...fencedLines(['```', '<!-- x -->', '```'])]).toEqual([0, 1, 2]);
  });
});

describe('a line: region matching only inside inline code', () => {
  it('claims nothing, and reports itself unmatched', () => {
    // A pattern surviving only inside inline code still matched the raw line,
    // so the region's claim of coverage outlived the content and the sample's
    // line was routed and stamped as generated.
    const hidden = ownedLines('# T\n\nExample: `https://img.shields.io/x`\n',
      ['line:img\\.shields\\.io']);
    expect([...hidden.owned]).toEqual([]);
    expect(hidden.unmatched).toEqual(['line:img\\.shields\\.io']);
    // A real badge still claims its line -- the fix is not "line: matches
    // nothing".
    const real = ownedLines('# T\n\n![b](https://img.shields.io/x)\n',
      ['line:img\\.shields\\.io']);
    expect([...real.owned]).toEqual([3]);
    expect(real.unmatched).toEqual([]);
    // maskSpans keeps every offset where it was, which the blocker scan that
    // shares it depends on.
    expect(maskSpans('abcdef', [[1, 3]])).toHaveLength(6);
  });
});

describe('an indented code line before a thematic break', () => {
  it('offers no heading anchor', () => {
    // `    Fake` followed by `---` is a code block and a thematic break, not a
    // Setext heading -- omitted from the mask, a `fake` anchor the rendered
    // document does not offer was recorded and a link to it PASSED.
    expect([...headingAnchors('# T\n\n    Fake\n---\n')]).toEqual(['t']);
    // A real Setext heading still offers its anchor.
    expect([...headingAnchors('# T\n\nSub\n---\n')]).toEqual(['t', 'sub']);
  });
});

// ── round 32 (1d19c46) ──────────────────────────────────────────────────────

describe('a fragment on a document with an alternate suffix', () => {
  it('is validated like any other', () => {
    // MY REGRESSION. Alternate suffixes joined the document set a round ago
    // and this gate still tested lowercase `.md`, so a tracked
    // `guide.markdown` passed the path check and never reached anchorsOf --
    // `[x](guide.markdown#gone)` let a broken anchor through.
    // Driven through checkDeadLinks with the target on disk, because the
    // defect is the GATE, not the predicate -- a test asserting only
    // isMarkdownPath passes with the gate still reading `.md`.
    const target = path.join(process.cwd(), 'tmp-frag-target.markdown');
    fs.writeFileSync(target, '# Real Heading\n');
    try {
      const ctx = linkCtx(['d.md', 'tmp-frag-target.markdown']);
      const out = checkDeadLinks('d.md',
        'see [x](tmp-frag-target.markdown#nope)\n', ctx, { backtickedPaths: false });
      expect(out).toHaveLength(1);
      expect(out[0].check).toBe('dead-anchor');
      // And a fragment that DOES resolve is still quiet.
      expect(checkDeadLinks('d.md',
        'see [x](tmp-frag-target.markdown#real-heading)\n', ctx,
        { backtickedPaths: false })).toEqual([]);
    } finally {
      fs.unlinkSync(target);
    }
    expect([isMarkdownPath('README.MD'), isMarkdownPath('notes.txt')])
      .toEqual([true, false]);
  });
});

describe('a heading inside a raw HTML block before the real title', () => {
  it('is not the document H1', () => {
    // A document opening with `<pre>` containing a sample `# Fake` had the
    // sample chosen as its H1, so the real title then closed the marker
    // window, an existing marker was reported missing, and --stamp wrote a
    // live marker INSIDE the `<pre>` -- invisible, and corrupting the example.
    expect(h1Index(['<pre>', '# Fake', '</pre>', '', '# Real Title', ''])).toBe(4);
    // A plain document is unaffected, and the fenced case still behaves.
    expect(h1Index(['# Real', '', 'body'])).toBe(0);
    expect(h1Index(['```', '# Fake', '```', '', '# Real'])).toBe(4);
  });
});

describe('a comment-only line between a blocker label and its list', () => {
  it('does not clear the carried context', () => {
    // MY REGRESSION, from the hidden-suffix fix. The mask preserves length by
    // design, so a wholly hidden line masks to NULs, `bare.trim()` is
    // non-empty, and the label's context was reset -- closed issues in the
    // rendered list silently skipped. Emptiness has to be tested against the
    // mask character, not the string.
    const U = 'https://github.com/TeneikaAskew/solyra/issues/1';
    const st = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } }, stocks: {} };
    expect(checkClosedIssues('d.md', `Blocked by:\n<!-- note -->\n- ${U}\n`, st))
      .toHaveLength(1);
    // Real prose between them still clears it -- the fix is not "never clear".
    expect(checkClosedIssues('d.md', `Blocked by:\nSome prose.\n- ${U}\n`, st))
      .toEqual([]);
  });
});

describe('an HTML anchor inside a code span', () => {
  it('is an example, not a destination', () => {
    // MY REGRESSION, from adding explicit-anchor collection. A literal
    // `` `<a id="fake"></a>` `` registered `fake` as a real destination, so a
    // later `[x](#fake)` PASSED against an anchor the rendered document does
    // not have -- the invented-destination failure the scan exists to avoid,
    // reintroduced by the scan itself.
    expect([...headingAnchors('# T\n\nExample: `<a id="fake"></a>`\n')]).toEqual(['t']);
    // A real anchor is still collected, and a wrapped code span is masked too.
    expect([...headingAnchors('# T\n\n<a name="legacy"></a>\n')]).toEqual(['t', 'legacy']);
    expect([...headingAnchors('# T\n\n`<a id="a"\nid="b"></a>`\n')]).toEqual(['t']);
  });
});


// ── round 33 parity (stocks#1121 `3b70d46c`) ────────────────────────────────

describe('a fence opened inside a blockquote', () => {
  it('closes with the quote that contains it', () => {
    // CommonMark ends a quoted code block with its container, closing fence or
    // not. Holding it open classified everything after the quote as code, so
    // the dead link, the heading and any marker below it were silently skipped
    // -- the hiding direction, which is the worse one. Codex found this on the
    // Python twin; the same defect was live here and is not in this PR's
    // review.
    expect([...fencedLines(['# T', '', '> ```', '> sample', '',
      '[guide](missing.md)', '', '## Real'])]).toEqual([2, 3]);
    // An ordinary fence opens at depth 0 and nothing is below 0, so its blank
    // lines and its content still read as code.
    expect([...fencedLines(['# T', '```', 'code', '', 'more', '```', 'after'])])
      .toEqual([1, 2, 3, 4, 5]);
    // And a quoted fence that DOES close normally still closes at its own
    // delimiter rather than running to the end of the quote.
    expect([...fencedLines(['# T', '> ```', '> s', '> ```', '> prose'])])
      .toEqual([1, 2, 3]);
  });
});

describe('an H1 hidden in a partial comment', () => {
  it('is not the document H1', () => {
    // A comment closing partway through a heading-shaped line leaves a visible
    // suffix, so commentedLines does not exclude the line while H1_RE still
    // matches the hidden prefix. --stamp then inserted the marker after a
    // heading no reader can see and above the document's real H1.
    expect(h1Index(['<!--', '# Fake --> visible', '', '# Real Title', ''])).toBe(3);
    // Plain and fenced documents still behave: a change to H1 selection is
    // dangerous in both directions.
    expect(h1Index(['# Real', '', 'body'])).toBe(0);
    expect(h1Index(['```', '# Fake', '```', '', '# Real'])).toBe(4);
  });
});


// ── round 34 (bd0126a) ──────────────────────────────────────────────────────

describe('this test module', () => {
  it('has no duplicate named imports', () => {
    // It had five -- `globSpecificity`, `classify`, `hasBlockingCue`,
    // `documentSet`, `loadRegistry` -- which makes the file invalid ESM.
    // `npm test` did not notice: Vitest transforms through esbuild, which
    // dedupes them, so it ran 878 tests green while `node --input-type=module`
    // refused the file outright. A test suite that only loads under one
    // loader is a trap for the next person who reaches for another.
    const src = fs.readFileSync(
      path.join(process.cwd(), 'scripts/docs-audit.test.mjs'), 'utf8');
    const block = /^import \{$([\s\S]*?)^\} from/m.exec(src);
    const names = block[1].split('\n').map((l) => l.trim().replace(/,$/, ''))
      .filter(Boolean);
    expect(names.length).toBe(new Set(names).size);
  });
});

describe('a CommonMark type-7 HTML block', () => {
  it('masks its contents', () => {
    // A complete custom tag on a line of its own opens a block that runs to
    // the next blank line. `x-widget` is not in HTML_BLOCK_TAGS, so nothing
    // was masked and the example inside it was emitted as a gating dead link.
    expect([...rawHtmlBlockLines(
      ['# T', '', '<x-widget>', '[x](missing.md)', '</x-widget>', ''])])
      .toEqual([2, 3, 4]);
    // It cannot INTERRUPT a paragraph, which is what keeps it off ordinary
    // prose -- the direction that would hide real findings.
    expect([...rawHtmlBlockLines(
      ['# T', '', 'some paragraph', '<x-widget>', '[x](missing.md)', ''])])
      .toEqual([]);
    expect([...rawHtmlBlockLines(['# T', '', 'ordinary prose', ''])]).toEqual([]);
  });
});

describe('a comment opener inside a code span that crosses lines', () => {
  it('opens no comment', () => {
    // The comment scanner masked only same-line code spans, so a literal
    // `<!--` on the middle line of a valid wrapped span read as live: it then
    // masked everything through EOF and a real link below was silently
    // dropped from the dead-link audit.
    expect([...commentSpans(
      ['# T', '', '`opening', 'x <!--', 'closing`', '', '[x](missing.md)', ''])])
      .toEqual([]);
    // A real inline comment is still a comment.
    expect([...commentSpans(['# T', '', 'text <!-- hidden -->', ''])])
      .toEqual([[2, [[5, 20]]]]);
  });
});

describe('an HTML anchor inside a partial comment', () => {
  it('is not a rendered destination', () => {
    // commentedLines is whole-line, so an anchor sharing a line with prose was
    // never excluded and `fake` registered as real -- letting `[x](#fake)`
    // pass against an anchor the document does not have.
    expect([...headingAnchors('# T\n\nprose <!-- <a id="fake"></a> -->\n')])
      .toEqual(['t']);
    expect([...headingAnchors('# T\n\n<a name="legacy"></a>\n')])
      .toEqual(['t', 'legacy']);
  });
});

describe('a rendered HTML link', () => {
  it('has its destination validated like a Markdown one', () => {
    const ctx = linkContext(new Set(['docs/a.md', 'd.md']), new Set(), []);
    const run = (t) => checkDeadLinks('d.md', t, ctx, { backtickedPaths: false });
    expect(run('see <a href="missing.md">guide</a>\n').map((f) => f.check))
      .toEqual(['dead-link']);
    expect(run('see <a href="docs/a.md">g</a>\n')).toEqual([]);
    // The same three exclusions the Markdown pass makes: a comment, a code
    // span, and a raw-text block are all shown rather than rendered.
    expect(run('<!-- <a href="missing.md">g</a> -->\n')).toEqual([]);
    expect(run('ex `<a href="missing.md">g</a>`\n')).toEqual([]);
    expect(run('<pre>\n<a href="missing.md">g</a>\n</pre>\n')).toEqual([]);
  });
});

describe('a marker carrying one owned field twice', () => {
  it('is refused rather than silently collapsed', () => {
    // extraSegments CONSUMES a parseable owned value and pushes only its tail,
    // so a second well-formed `Last scanned` produced no extra segment and the
    // malformed-field refusal could not see it. --stamp then wrote one
    // canonical value over both, destroying the evidence of which was right.
    const dup = '**Last reviewed:** 2026-01-01 · **Depth:** scanned '
      + '· **Last scanned:** 2026-01-01 · **Last scanned:** 2026-09-01 '
      + '· **Owner:** TBD';
    expect(extraSegments(dup)).toEqual([]);
    const r = stamp(`# T\n\n${dup}\n\nbody\n`, '2026-09-22', 'scanned', 'abc1234',
      { reviewed: false });
    expect(r.action).toBe('skipped-duplicate-marker-field');
    expect(r.text).toContain('2026-09-01');
    // A marker with each field once still stamps -- the fix is not "never
    // stamp a document that already has one".
    const ok = '**Last reviewed:** 2026-01-01 · **Depth:** scanned '
      + '· **Last scanned:** 2026-01-01 · **Owner:** TBD';
    expect(stamp(`# T\n\n${ok}\n\nbody\n`, '2026-09-22', 'scanned', 'abc1234',
      { reviewed: false }).action).toBe('updated');
  });
});

describe('a registry glob the regex engine rejects', () => {
  it('is bad input, not a crash', () => {
    // `new RegExp` threw a plain SyntaxError past the AuditError handler, so
    // the CLI exited 1 with a stack trace -- the status it documents for "the
    // audit ran and found problems" rather than the exit 2 for "the run
    // itself failed".
    expect(() => classify('docs/a.md',
      [{ cls: 'D', glob: 'docs/[z-a].md', codePaths: [], regions: [] }]))
      .toThrow(AuditError);
    // An ordinary bracket expression still compiles and still matches.
    expect(classify('docs/a.md',
      [{ cls: 'D', glob: 'docs/[a-z].md', codePaths: [], regions: [] }]).cls)
      .toBe('D');
  });
});

describe('a registered artefact whose path carries a space', () => {
  it('stays in the registry', () => {
    // A space is valid in a git path, so the extension decides nothing. The
    // old rule kept a spaced glob only when it ended `.md`, and documentSet
    // adds a non-Markdown artefact ONLY through an exact registry row -- so
    // dropping the row dropped the artefact from the audit entirely, with no
    // finding anywhere saying so.
    const RG = '## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n';
    const rows = loadRegistry(`${RG}| A | Frontend diagram.drawio | src |\n`);
    expect(rows.map((r) => r.glob)).toEqual(['Frontend diagram.drawio']);
    expect(documentSet(new Set(['README.md', 'Frontend diagram.drawio']), rows))
      .toContain('Frontend diagram.drawio');
    // What the row must still look like is a PATH. Prose in the glob column is
    // the case the old rule was reaching for, and it is now said out loud.
    expect(() => loadRegistry(`${RG}| A | some prose row | src |\n`))
      .toThrow(AuditError);
  });
});

describe('a claim-shaped string that is only an example', () => {
  it('is not read as an assertion', () => {
    const doc = 'tmp-claim-fixture.md';
    const claim = [{ doc, pattern: '(\\d+) living docs',
      derivation: 'grep-files src fetch\\(' }];
    const exec = () => 'a\nb\nc\nd\ne\nf\ng\n';   // seven
    // `git add -N` so the fixture really IS tracked for the duration:
    // checkClaims now refuses an untracked claim document, because prose a
    // clean clone does not have is not prose this repository asserts. The
    // probe reads the real index by design, so the fixture has to enter it
    // rather than be stubbed past.
    const track = () => spawnSync('git', ['add', '-N', doc], { cwd: process.cwd() });
    const untrack = () => spawnSync('git', ['rm', '--cached', '-q', '--force', doc],
      { cwd: process.cwd() });
    const run = (body) => {
      fs.writeFileSync(path.join(process.cwd(), doc), body);
      track();
      try { return checkClaims(claim, { exec }); }
      finally { untrack(); fs.unlinkSync(path.join(process.cwd(), doc)); }
    };
    // Matching the derivation, the example kept the row passing after the real
    // assertion had been deleted. It now reports the row inert.
    //
    // An INDENTED example and a COMMENT come first deliberately. A fenced one
    // proves nothing about the mask: three backticks are a backtick run, so
    // codeSpans sees the whole fence as one span and the whole-span rule below
    // skips it either way -- a version of this test built only on fenced and
    // inline examples passed with the masking reverted. These two carry no
    // backticks, so only the mask can exclude them.
    expect(run('# C\n\n    7 living docs\n')[0].detail).toMatch(/matched nothing/);
    expect(run('# C\n\n<!-- 7 living docs -->\n')[0].detail).toMatch(/matched nothing/);
    expect(run('# C\n\n```\n7 living docs\n```\n')[0].detail)
      .toMatch(/matched nothing/);
    // A whole match inside ONE inline span is an example too -- that is the
    // code-span rule rather than the mask, and it is narrow on purpose: see
    // the assertion below for the claim shape it must NOT break.
    expect(run('# C\n\nExample: `3 living docs`\n')[0].detail)
      .toMatch(/matched nothing/);
    // A real assertion is still checked, in both outcomes.
    expect(run('# C\n\nThere are 3 living docs.\n')[0].detail)
      .toMatch(/claims 3, .* gives 7/);
    expect(run('# C\n\nThere are 7 living docs.\n')).toEqual([]);
    // And an assertion that SPELLS part of itself as inline code is still a
    // real assertion. This repo's own live Claims row is exactly this shape,
    // and masking code spans wholesale stopped it being checked at all.
    const inline = [{ doc, pattern: '(\\d+) files under `src/`',
      derivation: 'grep-files src fetch\\(' }];
    fs.writeFileSync(path.join(process.cwd(), doc), '# C\n\n7 files under `src/` do.\n');
    track();
    try {
      expect(checkClaims(inline, { exec })).toEqual([]);
    } finally { untrack(); fs.unlinkSync(path.join(process.cwd(), doc)); }
    // And the precondition itself: an UNTRACKED claim document is refused
    // rather than measured, the same rule each derivation target carries.
    fs.writeFileSync(path.join(process.cwd(), doc), '# C\n\n7 living docs\n');
    try {
      expect(() => checkClaims(claim, { exec })).toThrow(/not tracked/);
    } finally { fs.unlinkSync(path.join(process.cwd(), doc)); }
  });
});


// ── round 35 parity (stocks#1121 `b96e9fbf`) ────────────────────────────────

describe('a marker-shaped line that parses as neither form', () => {
  it('blocks the stamp rather than gaining a second marker above it', () => {
    // The date is not the format the marker declares, so both parsers decline
    // and the audit concluded there was no marker at all: --stamp inserted a
    // valid one ABOVE it and the document visibly carried two contradictory
    // provenance lines, which the duplicate check cannot see because only one
    // of the two parses. Codex found this on the Python twin, which has
    // refused it since round 21; this file had no such guard at all.
    for (const bad of ['**Last reviewed:** 2026-9-1', '**Last Updated:** 2026-9-1']) {
      const r = stamp(`# T\n\n${bad}\n\nbody\n`, '2026-09-22', 'scanned',
        'abc1234', { reviewed: false });
      expect(r.action).toBe('skipped-malformed-marker');
      expect(r.text).toBe(`# T\n\n${bad}\n\nbody\n`);
    }
    expect(markerShapedLines(['# T', '', '**Last reviewed:** 2026-9-1', '']))
      .toEqual([2]);
    // A WELL-FORMED marker of either spelling still stamps -- the fix is not
    // "never rewrite a document that already has one".
    expect(stamp('# T\n\n**Last updated:** 2026-01-01\n\nbody\n', '2026-09-22',
      'scanned', 'abc1234', { reviewed: false }).action).toBe('updated');
    expect(markerShapedLines(['# T', '', '**Last updated:** 2026-01-01', '']))
      .toEqual([]);
  });
});

describe('a Setext underline', () => {
  it('must share its heading container', () => {
    // `> Example` then an unquoted `---` ends the blockquote and renders a
    // THEMATIC BREAK. Reading it as a heading closed markerWindow above a real
    // marker below the break, so the audit reported the marker missing and
    // --stamp could insert a contradictory second one.
    expect(isSetextUnderline(['> Example', '---'], 1, new Set())).toBe(false);
    expect(isSetextUnderline(['- Example', '---'], 1, new Set())).toBe(false);
    // An ordinary heading is untouched, and an underline indented to a list
    // item's CONTENT column is still an underline: this is an indentation
    // rule, not a ban on underlines near lists.
    expect(isSetextUnderline(['Title', '---'], 1, new Set())).toBe(true);
    expect(isSetextUnderline(['- Example', '  ---'], 1, new Set())).toBe(true);
  });
});


// ── round 36 (03fbbe9) ──────────────────────────────────────────────────────

describe('a hash-prefixed line that is not a heading', () => {
  it('does not end a registry section', () => {
    // `#123 remains open` renders as ordinary prose -- a hash run needs
    // whitespace after it -- and it switched section mode off, so every
    // declaration below it was silently dropped. A row that vanishes takes its
    // class, its code paths and its region ownership with it, and nothing
    // reports the skip.
    const rg = '## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n| D | docs/a.md | src |\n\n#123 remains open\n\n'
      + '| D | docs/b.md | src |\n';
    expect(loadRegistry(rg).map((r) => r.glob)).toEqual(['docs/a.md', 'docs/b.md']);
    // A REAL heading still ends it, which is what the gate is for.
    const ended = '## Registry\n\n| Class | Path glob | Declared code paths |\n'
      + '|---|---|---|\n| D | docs/a.md | src |\n\n## Examples\n\n'
      + '| D | docs/b.md | src |\n';
    expect(loadRegistry(ended).map((r) => r.glob)).toEqual(['docs/a.md']);
  });
});

describe('indentation mixing spaces and a tab', () => {
  it('is measured in columns', () => {
    // A tab counted as four only in column zero and as nothing elsewhere, so
    // ` \t[x](missing.md)` measured 1 -- CommonMark advances the tab to column
    // 4 and renders the line as code, so the link and blocker scans inspected
    // an example as live prose and could emit a gating finding.
    expect(indentColumns(' \tx')).toBe(4);
    expect(indentColumns('\tx')).toBe(4);
    expect(indentColumns('   x')).toBe(3);
    expect(isCodeIndented(' \tx')).toBe(true);
    expect([...indentedCodeLines(['# T', '', ' \t[x](missing.md)', ''])]).toEqual([2]);
    // Three spaces is still a paragraph, not code.
    expect(isCodeIndented('   x')).toBe(false);
  });
});

describe('an H1 inside a blockquote', () => {
  it('is the document H1', () => {
    // `> # Quoted title` RENDERS as an H1 and headingAnchors already reads it
    // that way, but h1Index tested the raw line -- so the document was
    // reported as having no H1 while --stamp answered `skipped-no-h1`, leaving
    // the command unable to repair its own finding.
    expect(h1Index(['> # Quoted title', '', 'body'])).toBe(0);
    expect([...headingAnchors('> # Quoted title\n')]).toEqual(['quoted-title']);
    // An unquoted document is unaffected, and a quoted heading hidden in a
    // fence is still not the H1.
    expect(h1Index(['# Real', '', 'body'])).toBe(0);
    expect(h1Index(['```', '> # Fake', '```', '', '# Real'])).toBe(4);
  });
});

describe('an inventory marker shown as an inline example', () => {
  it('is not a delimiter', () => {
    // Both examples were read as real delimiters, so every hand-written line
    // between them was marked generated: findings misrouted, and with
    // `exhaustive` the unowned-content finding suppressed outright.
    const doc = ['<!-- a -->', '`<!-- inventory:x:start -->`', 'hand written prose',
      '`<!-- inventory:x:end -->`'].join('\n');
    expect([...ownedLines(doc, ['inventory:*']).owned]).toEqual([]);
    // Real delimiters still own their block.
    const real = ['<!-- inventory:x:start -->', 'generated', '<!-- inventory:x:end -->']
      .join('\n');
    expect([...ownedLines(real, ['inventory:*']).owned]).toEqual([1, 2, 3]);
  });
});

describe('a tracked path with a non-ASCII byte', () => {
  it('is read without git quoting', () => {
    // Under the default core.quotePath, `docs/café.md` arrives as
    // `"docs/caf\303\251.md"`, which no longer ends `.md` -- so documentSet
    // dropped it and the document got no classification, marker, link or
    // blocker check at all, with nothing reporting the skip.
    const calls = [];
    const exec = (_c, a) => {
      calls.push(a.join(' '));
      return a.includes('--deleted') ? '' : 'docs/café.md\u0000README.md\u0000';
    };
    expect([...workingTreeFiles({ exec })]).toEqual(['docs/café.md', 'README.md']);
    expect(calls.every((a) => a.includes('-z'))).toBe(true);
    // A deleted path is still removed, which is what the second read is for.
    const exec2 = (_c, a) => (a.includes('--deleted')
      ? 'README.md\u0000' : 'docs/a.md\u0000README.md\u0000');
    expect([...workingTreeFiles({ exec: exec2 })]).toEqual(['docs/a.md']);
  });
});

describe('a link inside a code span that crosses lines', () => {
  it('is an example, not a citation', () => {
    // On an interior physical line of the span, codeSpans sees neither
    // delimiter, so a literal link inside the example was scanned as live and
    // emitted a gating dead-link finding.
    const ctx = linkContext(new Set(['d.md']), new Set(), []);
    expect(checkDeadLinks('d.md', '`open\n[x](missing.md)\nclose`\n', ctx,
      { backtickedPaths: false })).toEqual([]);
    expect(checkDeadLinks('d.md', '`open\n<a href="missing.md">g</a>\nclose`\n', ctx,
      { backtickedPaths: false })).toEqual([]);
    // An unwrapped broken link is still reported.
    expect(checkDeadLinks('d.md', '[x](missing.md)\n', ctx,
      { backtickedPaths: false }).map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('a link label with nested brackets', () => {
  it('is still a link', () => {
    // CommonMark allows balanced brackets in link text; the label branch
    // stopped at the first `]` and matched nothing at all, so a broken
    // rendered link was reported clean.
    const ctx = linkContext(new Set(['d.md']), new Set(), []);
    expect(checkDeadLinks('d.md', '[outer [inner]](missing.md)\n', ctx,
      { backtickedPaths: false }).map((f) => f.check)).toEqual(['dead-link']);
    // An ordinary label and an escaped bracket both still parse.
    expect(checkDeadLinks('d.md', '[plain](missing.md)\n', ctx,
      { backtickedPaths: false }).map((f) => f.check)).toEqual(['dead-link']);
    expect(checkDeadLinks('d.md', '[esc\\]aped](missing.md)\n', ctx,
      { backtickedPaths: false }).map((f) => f.check)).toEqual(['dead-link']);
  });
});


// ── round 37 parity (stocks#1121 `e0e82caa`) ────────────────────────────────

describe('a marker inside a code span that crosses lines', () => {
  it('is an example, not the document provenance', () => {
    // A span that opens above the marker-shaped line and closes below makes it
    // an EXAMPLE. Accepting it suppressed the missing-marker finding and
    // --stamp then rewrote the example, leaving the document with no rendered
    // provenance -- the third hiding mechanism, after fenced and commented.
    const mk = '**Last reviewed:** 2026-09-01 · **Owner:** TBD';
    expect(findMarkers(['# T', '', '`open', mk, 'close`', ''])).toEqual([]);
    expect(findMarkers(['# T', '', '```', mk, '```', ''])).toEqual([]);
    // A real marker is still found.
    expect(findMarkers(['# T', '', mk, '']).length).toBe(1);
  });
});

describe('an escaped backtick', () => {
  it('does not open a code span', () => {
    // `` \` [x](y.md) \` `` renders two literal backticks and a LIVE link, and
    // masking the range between them made the dead-link and blocker passes
    // skip a real citation -- the hiding direction.
    expect(codeSpans('\\` [guide](missing.md) \\`')).toEqual([]);
    expect(codeSpans('a `code` b')).toEqual([[2, 8]]);
    const ctx = linkContext(new Set(['d.md']), new Set(), []);
    expect(checkDeadLinks('d.md', '\\` [guide](missing.md) \\`\n', ctx,
      { backtickedPaths: false }).map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('an inline comment example before a fence', () => {
  it('opens no comment for the fence scan', () => {
    // `` `<!--` `` in prose was read as a real unclosed comment, so fencedLines
    // ignored every later fence delimiter -- a heading inside the fenced
    // example could then terminate markerWindow before the real marker and
    // --stamp inserted a second, contradictory one. commentSpans learned this
    // a round ago; this standalone helper, which exists to break the recursion
    // between the two, did not.
    expect([...fencedLines(['# T', '', 'see `<!--` here', '', '```', '# Fake',
      '```', '', '# Real'])]).toEqual([4, 5, 6]);
    // A REAL unclosed comment still hides what follows it, fence included.
    expect([...fencedLines(['# T', '<!-- open', '```', 'x', '```'])]).toEqual([]);
  });
});


// ── round 38 (2cd73fa) ──────────────────────────────────────────────────────

const ctx38 = (t) => linkContext(new Set(t), new Set(), []);

describe('a character reference in a link destination', () => {
  it('is not split as a fragment', () => {
    // The `#` inside `&#38;` was read as the fragment separator BEFORE
    // decodeCharRefs ran, so `[x](foo&#38;bar.md)` -- a link to tracked
    // `foo&bar.md` -- was split into the path `foo&` and the fragment
    // `38;bar.md` and reported dead. A downstream decoder cannot undo a split
    // that already happened.
    const ctx = ctx38(['foo&bar.md', 'd.md']);
    expect(checkDeadLinks('d.md', '[x](foo&#38;bar.md)\n', ctx,
      { backtickedPaths: false })).toEqual([]);
    // A destination that really is missing is still reported, and a REAL
    // fragment is still a fragment.
    expect(checkDeadLinks('d.md', '[x](gone&#38;bar.md)\n', ctx,
      { backtickedPaths: false }).map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('a glob bracket expression', () => {
  it('counts as one position, not as its contents', () => {
    // Counting the characters inside made ADDING alternatives raise
    // specificity, so `docs/[ab].md` outranked `docs/[a].md` for `docs/a.md`
    // -- and where the broader row is Class X and the narrower is Class D,
    // classify silently chose X and suppressed every check on the document.
    expect(globSpecificity('docs/[ab].md')).toEqual(globSpecificity('docs/[a].md'));
    // A plain literal still beats a bracket, and a bracket still beats `*`.
    const cmp = (a, b) => {
      const x = globSpecificity(a);
      const y = globSpecificity(b);
      for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
      return 0;
    };
    expect(cmp('docs/a.md', 'docs/[a].md')).toBeGreaterThan(0);
    expect(cmp('docs/[a].md', 'docs/*.md')).toBeGreaterThan(0);
  });
});

describe('a Setext H1 inside a blockquote', () => {
  it('is the document H1', () => {
    // The ATX test read the stripped copy and the Setext branch still tested
    // the raw quoted lines, so `> Quoted title` over `> ====` returned null:
    // the audit reported no H1 and --stamp answered `skipped-no-h1`.
    expect(h1Index(['> Quoted title', '> ====', '', 'body'])).toBe(0);
    expect(h1Index(['Title', '====', '', 'body'])).toBe(0);
    expect(h1Index(['> # Quoted', '', 'body'])).toBe(0);
    // An indented H1 is a code block, not a heading.
    expect(h1Index(['    # Indented', '', '# Real'])).toBe(2);
  });
});

describe('an href inside a non-raw-text HTML block', () => {
  it('is still validated', () => {
    // Markdown is not PARSED inside a type-6 or type-7 block, but the HTML
    // renders: `<div>` then `<a href="missing.md">` is a link a reader clicks.
    // Excluding every raw-block line skipped the href pass with the Markdown
    // one, so those links were never checked at all.
    const ctx = ctx38(['d.md', 'docs/a.md']);
    const run = (t) => checkDeadLinks('d.md', t, ctx, { backtickedPaths: false })
      .map((f) => f.check);
    expect(run('<div>\n<a href="missing.md">g</a>\n</div>\n')).toEqual(['dead-link']);
    expect(run('<div>\n<a href="docs/a.md">g</a>\n</div>\n')).toEqual([]);
    // A RAW-TEXT block makes its tags literal, and Markdown inside an HTML
    // block is not parsed -- both still hold.
    expect(run('<pre>\n<a href="missing.md">g</a>\n</pre>\n')).toEqual([]);
    expect(run('<div>\n[x](missing.md)\n</div>\n')).toEqual([]);
  });
});

describe('a generated-region delimiter inside a wrapped code span', () => {
  it('is an example, not a delimiter', () => {
    // The `mark:` and `fence:` scanners masked only single-line spans, so a
    // span holding sample BEGIN/END lines across a line break had both read as
    // real delimiters and the hand-written prose between them classified as
    // generated.
    const doc = ['<!-- a -->', '`example:', '<!-- BEGIN X -->', 'hand written',
      '<!-- END X -->', '`'].join('\n');
    expect([...ownedLines(doc, ['mark:X']).owned]).toEqual([]);
    // Real delimiters still own their block.
    const real = ['<!-- BEGIN X -->', 'generated', '<!-- END X -->'].join('\n');
    expect([...ownedLines(real, ['mark:X']).owned]).toEqual([1, 2, 3]);
  });
});

describe('a hash-prefixed line that is not a heading, in the marker section', () => {
  it('does not close the section', () => {
    // `#123 remains open` renders as prose and closed the section, so a SECOND
    // marker below it fell outside the window: findMarkers saw only the first,
    // --stamp updated it, and the contradictory duplicate stayed on the page.
    const doc = ['# T', '', '**Last reviewed:** 2026-01-01 · **Owner:** TBD', '',
      '#123 remains open', '', '**Last reviewed:** 2026-02-01 · **Owner:** TBD', ''];
    expect(markerSection(doc).to).toBeGreaterThan(6);
    expect(findMarkers(doc).length).toBe(2);
    // A REAL heading still closes it.
    expect(markerSection(['# T', '', '**Last reviewed:** 2026-01-01 · **Owner:** TBD',
      '', '## Next', '', 'x']).to).toBe(4);
  });
});

describe('a fence opener indented inside a blockquote', () => {
  it('opens no fence', () => {
    // The whitespace AFTER the `>` was never measured, so `>     ``` ` -- an
    // indented code line containing literal backticks -- opened a fence and
    // masked a live link on the next quoted line.
    expect([...fencedLines(['# T', '>', '>     ```', '> [x](missing.md)', '>'])])
      .toEqual([]);
    // An ordinary quoted fence still opens and still closes.
    expect([...fencedLines(['# T', '> ```', '> s', '> ```', '> prose'])])
      .toEqual([1, 2, 3]);
    expect([...fencedLines(['# T', '```', 'code', '```', 'after'])]).toEqual([1, 2, 3]);
  });
});

describe('a blocker list continuation line', () => {
  it('keeps its item context', () => {
    // `Blocked by:`, then `- Upstream:`, then an indented line carrying the URL
    // renders as ONE list item, but only a fresh marker counted as "in the
    // list" -- so the continuation cleared the carried label and the closed
    // blocker on it was silently omitted.
    const u = 'https://github.com/TeneikaAskew/solyra/issues/1';
    const st = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } },
      stocks: {} };
    expect(checkClosedIssues('d.md', `Blocked by:\n- Upstream:\n  ${u}\n`, st))
      .toHaveLength(1);
    expect(checkClosedIssues('d.md', `Blocked by:\n- ${u}\n`, st)).toHaveLength(1);
    // Real prose still clears the context, and an UNindented line is not a
    // continuation -- the fix is an indentation rule, not "never clear".
    expect(checkClosedIssues('d.md', `Blocked by:\nSome prose.\n- ${u}\n`, st))
      .toEqual([]);
    expect(checkClosedIssues('d.md', `Blocked by:\n- Upstream:\n${u}\n`, st))
      .toEqual([]);
  });
});

describe('a raw HTML block inside a blockquote', () => {
  it('is recognised', () => {
    // The scanner tested the physical line, so `> <pre>` saw the `>` and
    // recognised no opener -- and `> [x](missing.md)` inside the example was
    // audited as a live link.
    expect([...rawHtmlBlockLines(['# T', '', '> <pre>', '> [x](missing.md)',
      '> </pre>', ''])]).toEqual([2, 3, 4]);
    expect([...rawHtmlBlockLines(['# T', '', '<pre>', '[x](missing.md)',
      '</pre>', ''])]).toEqual([2, 3, 4]);
  });
});

describe('a backticked repository path with a space', () => {
  it('is still checked', () => {
    // Git paths admit a space and the exact registry declarations already do,
    // so `` `docs/old guide.md` `` was never checked and the audit reported
    // clean while the documentation pointed readers at a nonexistent path.
    const ctx = ctx38(['d.md', 'docs/kept.md']);
    const run = (t) => checkDeadLinks('d.md', t, ctx, { backtickedPaths: true })
      .map((f) => f.check);
    expect(run('see `docs/old guide.md` here\n')).toHaveLength(1);
    expect(run('see `docs/gone.md` here\n')).toHaveLength(1);
    // Backticked PROSE is not a path: the first segment must still be a
    // directory this tree has, which is what keeps a sentence from matching.
    expect(run('see `the docs/kept.md file` here\n')).toEqual([]);
  });
});

describe('a Markdown link that crosses a line break', () => {
  it('is still a link', () => {
    // CommonMark lets a label run over a newline and lets whitespace follow
    // the opening parenthesis, so both shapes render as clickable links -- and
    // a per-line scan can never see either.
    const ctx = ctx38(['d.md', 'docs/a.md']);
    const run = (t) => checkDeadLinks('d.md', t, ctx, { backtickedPaths: false })
      .map((f) => f.check);
    expect(run('[long\nlabel](missing.md)\n')).toEqual(['dead-link']);
    expect(run('[x](\nmissing.md)\n')).toEqual(['dead-link']);
    // A single-line link is reported ONCE, not by both passes.
    expect(run('[x](missing.md)\n')).toEqual(['dead-link']);
    // A resolving one stays quiet, and the exclusions still apply.
    expect(run('[long\nlabel](docs/a.md)\n')).toEqual([]);
    expect(run('```\n[long\nlabel](missing.md)\n```\n')).toEqual([]);
    expect(run('`[long\nlabel](missing.md)`\n')).toEqual([]);
  });
});

describe('a list-len derivation target', () => {
  it('must be tracked, like the grep ones', () => {
    // The grep derivations reject an untracked path because a search over one
    // measures nothing; this branch read the file directly, so it produced a
    // real number from content a clean clone does not have.
    // A file that really EXISTS in this checkout and really is not tracked,
    // the same standard the grep test beside it uses: node_modules is present
    // after `npm ci` here and in CI, and git confirms it is untracked. A
    // temporary directory would not exercise the probe, which reads REPO.
    const untracked = 'node_modules/vitest/package.json';
    expect(fs.existsSync(path.join(process.cwd(), untracked))).toBe(true);
    expect(() => derive(`list-len ${untracked} "version": "(.*)"`, { exec: () => '' }))
      .toThrow(/not tracked/);
    // A TRACKED target still derives: this very file is tracked.
    expect(() => derive('list-len package.json "name": "(.*)"', { exec: () => '' }))
      .not.toThrow(/not tracked/);
  });
});



describe('a code span', () => {
  it('does not pair across a paragraph boundary', () => {
    // Inline content cannot cross a blank line, so an unmatched backtick in
    // one paragraph paired with another far below it -- masking every live
    // link in between and silently dropping their findings. Masking the blank
    // line is not equivalent: it contributes no characters to mask, so the
    // paragraphs stay adjacent in the joined subject and pair regardless.
    expect([...codeSpanLines(['a ` b', '', 'c ` d'])]).toEqual([]);
    // Within one paragraph it still wraps.
    expect([...codeSpanLines(['a ` b', 'c ` d'])]).toHaveLength(2);
    expect(paragraphBlocks(['a', '', 'b', 'c', '', 'd']))
      .toEqual([[0, 0], [2, 3], [5, 5]]);
    // A fence is a boundary too, when the caller passes one.
    expect(paragraphBlocks(['a', 'b', 'c'], new Set([1]))).toEqual([[0, 0], [2, 2]]);
  });
});

describe('an escaped backtick', () => {
  it('does not consume the real span opener', () => {
    // Filtering escaped openers AFTER the scan cannot recover the opener the
    // rejected match already ate: the escaped tick paired with the real
    // opener, the pair was discarded, and the genuine span went unmasked --
    // so the example link inside it was reported dead.
    const line = '\\` literal ` [x](y.md) `';
    expect(codeSpans(line)).toEqual([[11, 24]]);
    expect(line.slice(11, 24)).toBe('` [x](y.md) `');
  });
});

describe('a fence opened in a list item', () => {
  it('ends with the item, closing fence or not', () => {
    // CommonMark closes the code block where the item ends. Holding it open
    // classified every remaining line as code and suppressed the dead links,
    // blockers, headings and markers below it. Confirmed against marked: `x`
    // renders as its own paragraph outside the <pre>.
    expect([...fencedLines(['- item', '  ```', '  code', '', 'after [x](m.md)'])])
      .toEqual([1, 2, 3]);
    // A blank line does NOT end the item, so indented content after one stays
    // inside the block.
    expect([...fencedLines(['- item', '  ```', '  code', '', '  more', '  ```', 'after'])])
      .toEqual([1, 2, 3, 4, 5]);
    // A legally indented TOP-LEVEL fence, whose content may sit at column
    // zero, is untouched: there is no list container, so the rule is off.
    expect([...fencedLines([' ```', 'code', ' ```', 'after'])]).toEqual([0, 1, 2]);
  });
});

describe('a quoted Setext underline', () => {
  it('stays with its title, and a quoted break does not', () => {
    // Matching the raw underline always failed on the `>`, so a quoted Setext
    // heading exposed no anchor and markerAnchor pointed at the TITLE --
    // `--stamp` then inserted the marker between the title and its underline
    // and destroyed the rendered H1 it was meant to annotate.
    expect(isSetextUnderline(['> Title', '> ==='], 1)).toBe(true);
    expect(isSetextUnderline(['> Example', '---'], 1)).toBe(false);
    expect([...headingAnchors('> Title\n> ===\n')]).toEqual(['title']);
    expect(markerAnchor(['> Quoted title', '> ====', '', 'body'])).toBe(1);
    expect(markerAnchor(['Title', '====', '', 'body'])).toBe(1);
    expect(markerAnchor(['# Title', '', 'body'])).toBe(0);
    // An UNQUOTED underline below a quoted title is a different block, so it
    // is not adopted. This once expected 0 -- `> Quoted title` treated as a
    // one-line H1 -- which followed `h1Index` returning 0 for it. That was
    // the defect: the quote ENDS at the unquoted `====`, so the document
    // renders no H1 at all and there is nothing to anchor a marker to.
    // `--stamp` answers `skipped-no-h1`, which is the honest refusal.
    expect(h1Index(['> Quoted title', '====', '', 'body'])).toBeNull();
    expect(markerAnchor(['> Quoted title', '====', '', 'body'])).toBeNull();
    // A list container behaves the same way: a column-zero `===` ends it,
    // while an underline indented to the item's content column is still one.
    expect(h1Index(['- Title', '===', '', 'body'])).toBeNull();
    expect(h1Index(['- Title', '  ===', '', 'body'])).toBe(0);
    // An ATX H1 followed by a line of `===` does not own it: the underline
    // needs a PARAGRAPH above, and a heading is not one. Anchoring past it
    // would put the marker below a stray paragraph rather than after the H1.
    expect(markerAnchor(['# Title', '===', '', 'body'])).toBe(0);
  });
});

describe('an autolink in a heading', () => {
  it('is text, not markup to strip', () => {
    // The blanket `<[^>]+>` strip deleted `<https://example.com>` and recorded
    // an EMPTY slug, so a valid link to the URL-derived fragment was reported
    // dead. Only a tag NAME, optionally with attributes, is markup -- and now
    // that the strip is narrow, a comment inside a heading has to be masked
    // explicitly or it would slug as `---note----real`.
    expect(headingSlug('Hello <em>world</em>')).toBe('hello-world');
    expect(headingSlug('A <span class="x">tag</span>')).toBe('a-tag');
    expect([...headingAnchors('## <https://example.com>\n')]).toEqual(['httpsexamplecom']);
    expect([...headingAnchors('## <!-- note --> Real\n')]).toEqual(['real']);
    // A character reference that RENDERS as a tag is still text.
    expect(headingSlug('&lt;code&gt;')).toBe('code');
  });
});

describe('a heading introduced by a list marker', () => {
  it('is a heading, and a list item over a break is not', () => {
    // `- # Install` renders a real heading and GitHub exposes its anchor, but
    // stripping only the blockquote prefix left the marker in front of the ATX
    // syntax -- so a valid link to `#install` was a gating dead anchor.
    expect([...headingAnchors('- # Install\n')]).toEqual(['install']);
    expect([...headingAnchors('1. ## Setup\n')]).toEqual(['setup']);
    // The Setext branch now asks isSetextUnderline rather than an inline
    // pattern of its own: `- Example` over a column-zero `---` is a list item
    // that ENDS and a thematic break, and the inline copy recorded the
    // fabricated anchor `--example` for it.
    expect([...headingAnchors('- Example\n---\n')]).toEqual([]);
    expect([...headingAnchors('Title\n---\n')]).toEqual(['title']);
  });
});

describe('a quoted type-7 HTML block', () => {
  it('opens after a quoted blank line', () => {
    // Inside a blockquote the blank line is spelled `>`, which is nonempty
    // raw -- so the interruption check saw a paragraph still open, the custom
    // tag started nothing, and `[x](missing.md)` inside the block was audited
    // as a live link.
    expect([...rawHtmlBlockLines(['> prose', '>', '> <x-widget>', '> [x](m.md)'])])
      .toEqual([2, 3]);
  });
});

describe('the remaining CommonMark HTML block types', () => {
  it('mask their contents like every other raw block', () => {
    // A processing instruction, a declaration and a CDATA section each run raw
    // to their own closer, so Markdown inside one renders literally. None was
    // recognised, and `[x](missing.md)` in such a block produced a false
    // gating dead-link finding over content displayed verbatim.
    expect([...rawHtmlBlockLines(['<?php', '[x](m.md)', '?>', '# Real'])]).toEqual([0, 1, 2]);
    expect([...rawHtmlBlockLines(['<![CDATA[', '[x](m.md)', ']]>', '# Real'])]).toEqual([0, 1, 2]);
    // A declaration that closes on its own line is a one-line block.
    expect([...rawHtmlBlockLines(['<!DOCTYPE html>', '[x](m.md)'])]).toEqual([0]);
  });
});

describe('an HTML href', () => {
  it('resolves character references and the unquoted form', () => {
    // HTML decodes the attribute before anything else sees it, so
    // `foo&#38;bar.md` IS `foo&bar.md` -- and splitting the raw attribute at
    // the `#` INSIDE the reference gave the target `foo&` and the fragment
    // `38;bar.md`, a gating dead-link finding against a tracked file.
    expect(checkDeadLinks('d.md', '<a href="foo&#38;bar.md">g</a>\n',
      linkCtx(['d.md', 'foo&bar.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', '<a href="gone&#38;bar.md">g</a>\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
    // `<a href=guide.md>` is valid HTML and renders a real link; recording
    // only the quoted forms left its destination unchecked entirely.
    expect(checkDeadLinks('d.md', '<a href=missing.md>g</a>\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
    expect(checkDeadLinks('d.md', '<a href=docs/a.md>g</a>\n',
      linkCtx(['d.md', 'docs/a.md']))).toEqual([]);
  });
});

describe('an unquoted HTML id attribute', () => {
  it('declares an anchor, like the quoted forms', () => {
    // `<div id=section>` is valid HTML and the browser exposes `section`, but
    // recording only the quoted forms meant a valid `[x](#section)` was
    // reported as a gating dead anchor.
    expect([...headingAnchors('<div id=section>\n\ntext\n')]).toEqual(['section']);
    expect([...headingAnchors('<a name="legacy"></a>\n\ntext\n')]).toEqual(['legacy']);
  });
});

describe('a blocker citation inside a rendered HTML block', () => {
  it('is still checked, unlike one in a raw-text block', () => {
    // A `<div>` around `Blocked by <a href=".../issues/1">#1</a>` produces a
    // clickable citation a reader acts on, and masking the whole block meant a
    // closed issue cited there produced no finding at all. Only pre/script/
    // style/textarea display their contents literally.
    const states = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } }, stocks: {} };
    const rendered = '<div>\nBlocked by <a href="https://github.com/TeneikaAskew/solyra/issues/1">#1</a>\n</div>\n';
    expect(checkClosedIssues('d.md', rendered, states).map((f) => f.ref)).toEqual(['solyra#1']);
    const raw = '<pre>\nBlocked by https://github.com/TeneikaAskew/solyra/issues/1\n</pre>\n';
    expect(checkClosedIssues('d.md', raw, states)).toEqual([]);
  });
});

describe('a reference definition', () => {
  it('may put its destination on the next line, and respects its container', () => {
    // `[guide]:` then `  missing.md` is a definition CommonMark resolves, and
    // a per-line pattern could not capture it -- so, because reference USES
    // are deliberately not scanned, the broken destination produced no finding
    // at all. The finding is reported against the destination's line.
    const multi = checkDeadLinks('d.md', '[guide]:\n  missing.md\n', linkCtx(['d.md']));
    expect(multi.map((f) => [f.check, f.line])).toEqual([['dead-link', 2]]);
    expect(checkDeadLinks('d.md', '[guide]:\n  ok.md\n', linkCtx(['d.md', 'ok.md']))).toEqual([]);
    // A label with a BLANK line after it defines nothing.
    expect(checkDeadLinks('d.md', '[g]:\n\nmissing.md\n', linkCtx(['d.md']))).toEqual([]);
    // A quoted definition still defines; the anchored pattern saw `>` where it
    // needs a bracket, so every one went unchecked.
    expect(checkDeadLinks('d.md', '> [g]: missing.md\n', linkCtx(['d.md']))
      .map((f) => f.detail)).toEqual(['reference link [g] -> missing.md']);
    expect(checkDeadLinks('d.md', '> [g]: ok.md\n', linkCtx(['d.md', 'ok.md']))).toEqual([]);
    // One inside a wrapped code span is an EXAMPLE, not a definition.
    expect(checkDeadLinks('d.md', '`a\n[g]: missing.md\nb`\n', linkCtx(['d.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', '[g]: missing.md\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('an issue URL', () => {
  it('must sit at a host boundary', () => {
    // Unanchored, any other site whose PATH embeds the string matched, so a
    // link to example.com produced a stale-blocker finding against solyra#861.
    // The bare-host spelling is still accepted -- documents here write it.
    const states = { solyra: { 861: { state: 'closed', reason: 'completed', kind: 'ISSUE' } }, stocks: {} };
    const embedded = 'Blocking issues: https://example.com/archive/github.com/TeneikaAskew/solyra/issues/861';
    expect(checkClosedIssues('d.md', embedded, states)).toEqual([]);
    const bare = 'Blocking issues: github.com/TeneikaAskew/solyra/issues/861';
    expect(checkClosedIssues('d.md', bare, states).map((f) => f.ref)).toEqual(['solyra#861']);
  });
});

describe('a marker hidden in a partly commented line', () => {
  it('is not the document provenance', () => {
    // A comment closed PART WAY through a line leaves visible text after the
    // `-->`, so the line is not wholly commented -- and trimming it put the
    // hidden marker prefix first, where MARKER_RE matched and the `-->` landed
    // harmlessly in the tail. --stamp would then rewrite it inside the comment.
    const hidden = ['# T', '<!-- retired',
      '**Last reviewed:** 2026-09-20 (depth: full) --> tail'];
    expect(findMarkers(hidden)).toEqual([]);
    expect(findMarker(hidden)).toBeNull();
    expect(findMarkers(['# T', '**Last reviewed:** 2026-09-20 (depth: full)'])).toEqual([1]);
    expect([...commentedPrefixLines(['a', '<!-- x', 'y --> visible'])]).toEqual([1, 2]);
  });
});

describe('a link', () => {
  it('does not pair across a paragraph boundary', () => {
    // A `[` in one paragraph and a `](missing.md)` in the next render as
    // literal brackets. Scanning the whole document as one string paired them
    // and reported a destination no reader can click.
    expect(checkDeadLinks('d.md', 'text [label\n\nmore](missing.md)\n',
      linkCtx(['d.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', 'text [label\nmore](missing.md)\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('a query-only destination', () => {
  it('still has its fragment checked', () => {
    // Stripping the query empties the path, and returning there skipped the
    // anchor check entirely -- so `[x](?plain=1#missing)`, which navigates
    // within THIS document exactly as `#missing` does, passed.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qf-'));
    const rel = path.relative(process.cwd(), dir);
    try {
      fs.writeFileSync(path.join(dir, 'd.md'), '# Real\n\nsee [x](?plain=1#missing)\n');
      const text = fs.readFileSync(path.join(dir, 'd.md'), 'utf8');
      const doc = path.posix.join(rel.split(path.sep).join('/'), 'd.md');
      expect(checkDeadLinks(doc, text, linkCtx([doc])).map((f) => f.check))
        .toEqual(['dead-anchor']);
      fs.writeFileSync(path.join(dir, 'd.md'), '# Real\n\nsee [x](?plain=1#real)\n');
      const ok = fs.readFileSync(path.join(dir, 'd.md'), 'utf8');
      expect(checkDeadLinks(doc, ok, linkCtx([doc]))).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('a link to a tracked symlink', () => {
  it('is refused before its headings are read', () => {
    // The preflight guards the document being SCANNED, not the ones it cites.
    // Collecting a linked document's headings opened it directly, so a link to
    // a tracked symlink audited the target's machine-local bytes -- and one
    // pointing at a non-terminating special file hangs here.
    const real = 'docs-audit-symlink-real.md';
    const link = 'docs-audit-symlink-link.md';
    try {
      fs.writeFileSync(real, '# Real\n');
      fs.symlinkSync(real, link);
      expect(() => checkDeadLinks('d.md', `see [x](${link}#real)\n`,
        linkCtx(['d.md', link]))).toThrow(/tracked symlink/);
      // A regular file is read as before.
      expect(checkDeadLinks('d.md', `see [x](${real}#real)\n`,
        linkCtx(['d.md', real]))).toEqual([]);
    } finally {
      fs.rmSync(link, { force: true });
      fs.rmSync(real, { force: true });
    }
  });
});

describe('YAML front matter', () => {
  it('is not where the H1 lives', () => {
    // GitHub renders front matter as a metadata table, not as Markdown, so a
    // `# note` comment inside it is not a heading. Treating one as the H1 put
    // --stamp's marker and its blank lines INSIDE the `---` delimiters,
    // corrupting the front matter and leaving the real H1 unstamped.
    const lines = ['---', 'title: x', '# note', '---', '', '# Real title', ''];
    expect([...frontMatterLines(lines)]).toEqual([0, 1, 2, 3]);
    expect(h1Index(lines)).toBe(5);
    expect([...headingAnchors(lines.join('\n'))]).toEqual(['real-title']);
    // An UNTERMINATED opener is a thematic break, not front matter: masking
    // the whole document would hide every finding below it.
    expect([...frontMatterLines(['---', 'a', 'b'])]).toEqual([]);
  });
});

describe('a marker recording no review', () => {
  it('cannot also carry a depth or a baseline', () => {
    // `Last reviewed: unknown` says no review happened; a Depth or an Against
    // beside it claims one at a named baseline. Every field parses, so nothing
    // reported it and the run emitted only the non-gating P3 -- so it passed
    // --check while a drift calculation ran off provenance stamp never writes.
    const line = '**Last reviewed:** unknown · **Depth:** verified · '
      + '**Against:** `abc1234` · **Last scanned:** 2026-09-18 · **Owner:** TBD';
    const prev = findMarker(['# T', '', line]);
    const out = checkMarkerDates('d.md', prev, '2026-09-22', line);
    expect(out.map((f) => f.severity)).toEqual(['P2']);
    expect(out[0].detail).toMatch(/did not happen/);
    // A real review date carrying the same fields is fine.
    const ok = line.replace('unknown', '2026-08-31');
    expect(checkMarkerDates('d.md', findMarker(['# T', '', ok]), '2026-09-22', ok))
      .toEqual([]);
  });
});

// ── round 41 ────────────────────────────────────────────────────────────────

describe('an anchor whose tag spans a line break', () => {
  it('is still a link with a destination to check', () => {
    // `<a\n href="missing.md">` renders a clickable link, and the per-line
    // scan could never see the opening tag and its href together -- so a
    // missing destination produced no finding at all.
    expect(checkDeadLinks('d.md', '<a\n href="missing.md">g</a>\n', linkCtx(['d.md']))
      .map((f) => [f.check, f.line])).toEqual([['dead-link', 1]]);
    expect(checkDeadLinks('d.md', '<a\n href="docs/a.md">g</a>\n',
      linkCtx(['d.md', 'docs/a.md']))).toEqual([]);
    // The single-line form is reported ONCE, by the per-line pass.
    expect(checkDeadLinks('d.md', '<a href="missing.md">g</a>\n', linkCtx(['d.md'])))
      .toHaveLength(1);
    // A raw-TEXT block displays the tag rather than rendering it, and a tag
    // may not span a blank line.
    expect(checkDeadLinks('d.md', '<pre>\n<a\n href="missing.md">g</a>\n</pre>\n',
      linkCtx(['d.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', '<a\n\n href="missing.md">g</a>\n',
      linkCtx(['d.md']))).toEqual([]);
    // And an ESCAPED opener is text in THIS pass too. The single-line href
    // pass has checked that for rounds; this one did not, so the same escape
    // was clean on one line and a gating dead link across two.
    expect(checkDeadLinks('d.md', '\\<a\n href="missing.md">g</a>\n',
      linkCtx(['d.md']))).toEqual([]);
  });
});

describe('a character reference', () => {
  it('is consumed whole before a query or a fragment is separated', () => {
    // `&#63;` IS a `?`, so `[x](foo&#63;v=1)` renders a URL whose PATH is
    // `foo` -- splitting the raw destination first left the nonexistent path
    // `foo?v=1` once decoded. And `[g]: foo&#38;bar.md` links to the tracked
    // `foo&bar.md`; splitting at the `#` inside the reference gave the path
    // `foo&` and the fragment `38;bar.md`.
    expect(checkDeadLinks('d.md', '[x](foo&#63;v=1)\n', linkCtx(['d.md', 'foo'])))
      .toEqual([]);
    expect(checkDeadLinks('d.md', '[x](gone&#63;v=1)\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    expect(checkDeadLinks('d.md', '[g]: foo&#38;bar.md\n',
      linkCtx(['d.md', 'foo&bar.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', '[g]: gone&#38;bar.md\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    // An ordinary query is still removed, and the helper is honest about a
    // delimiter that really is one.
    expect(checkDeadLinks('d.md', '[x](guide.md?plain=1)\n',
      linkCtx(['d.md', 'guide.md']))).toEqual([]);
    expect(splitOutsideRefs('foo&#38;bar.md', '#')).toEqual(['foo&#38;bar.md', undefined]);
    expect(splitOutsideRefs('a.md#frag', '#')).toEqual(['a.md', 'frag']);
  });
});

describe('a heading introduced by a list marker', () => {
  it('is the document H1 too, not only an anchor', () => {
    // headingAnchors reads through the marker, so `- # Title` exposes its
    // anchor -- while h1Index saw the marker where it needs a `#` and the
    // audit reported no H1, with --stamp answering `skipped-no-h1`: the
    // finding it raises and then refuses to act on.
    expect(h1Index(['- # Title', '', 'body'])).toBe(0);
    expect(h1Index(['1. # Title', '', 'body'])).toBe(0);
    expect(h1Index(['- not a heading', '', 'body'])).toBeNull();
  });
});

describe('inline content', () => {
  it('ends at a heading, not only at a blank line', () => {
    // CommonMark ends the paragraph at the heading, so an unmatched backtick
    // above it cannot pair with one below -- and pairing them masked the live
    // broken link in between out of the audit.
    expect(paragraphBlocks(['a ` b', '# Heading', 'c ` d']))
      .toEqual([[0, 0], [1, 1], [2, 2]]);
    expect([...codeSpanLines(['a ` b', '# Heading', 'c ` d'])]).toEqual([]);
    // A thematic break is a block of its own for the same reason. It needs a
    // blank line above it to BE one: `a` over `---` is a Setext H2, which is
    // what this case originally asserted -- the heading and its underline are
    // one block, not two.
    expect(paragraphBlocks(['a', '', '---', 'b'])).toEqual([[0, 0], [2, 2], [3, 3]]);
    expect(paragraphBlocks(['a', '---', 'b'])).toEqual([[0, 1], [2, 2]]);
    // Ordinary consecutive prose is still one block.
    expect(paragraphBlocks(['a', 'b', '', 'c'])).toEqual([[0, 1], [3, 3]]);
  });
});

describe('a blocker label', () => {
  it('does not carry out of its blockquote', () => {
    // Stripping the quote prefix is what made a quoted blocker list
    // recognisable, and it also erased the boundary: `> Blocked by:`, a quoted
    // blank, then an UNQUOTED list applied the quoted label to the outside
    // list and reported a neutral closed-issue link as live work.
    const url = R30_URL;
    expect(checkClosedIssues('d.md', `> Blocked by:\n>\n- see ${url}\n`, R30_STATES))
      .toEqual([]);
    expect(checkClosedIssues('d.md', `> Blocked by:\n>\n> - see ${url}\n`, R30_STATES)
      .map((f) => f.ref)).toEqual(['solyra#1']);
    expect(checkClosedIssues('d.md', `Blocked by:\n\n- see ${url}\n`, R30_STATES)
      .map((f) => f.ref)).toEqual(['solyra#1']);
  });
});

describe('an explicit HTML anchor', () => {
  it('keeps its case, unlike a generated heading slug', () => {
    // The browser matches an `id`/`name` exactly, so `<a name="Install">` is
    // reached by `#Install` and not by `#install`. Lowercasing it here, with
    // the requested fragment folded later, accepted a link that does not
    // navigate.
    expect([...headingAnchors('<a name="Install"></a>\n\n# Real\n')].sort())
      .toEqual(['Install', 'real']);
  });
});

describe('a heading inside a raw HTML block', () => {
  it('does not end the marker window', () => {
    // A `<pre>` sample carrying `## Fake` above an existing marker ended the
    // window at the sample, so findMarker missed the real marker below the
    // block and --stamp inserted a second one near the H1.
    const doc = ['# T', '<pre>', '## Fake', '</pre>', '',
      '**Last reviewed:** 2026-09-20 · **Depth:** scanned · **Owner:** TBD',
      '', '## Next'];
    expect(findMarkers(doc)).toEqual([5]);
    expect(findMarker(doc).idx).toBe(5);
  });
});

describe('a backticked path', () => {
  it('may carry a space in every segment, not only the filename', () => {
    // `docs/user guides/old.md` and a spaced root file `old guide.md` matched
    // neither scanner, so a deleted citation written that way was reported
    // clean -- the hiding direction, and the same gap the filename fix closed
    // one segment over.
    const ctx = {
      tracked: new Set(['d.md']), topLevelDirs: new Set(['docs']),
      rootFiles: new Set(), knownRoot: new Set(['old guide.md']),
      exts: new Set(['.md']), basenames: new Set(),
    };
    expect(checkDeadLinks('d.md', 'see `docs/user guides/old.md`\n', ctx)
      .map((f) => f.detail)).toEqual(['backticked path -> docs/user guides/old.md']);
    expect(checkDeadLinks('d.md', 'see `old guide.md`\n', ctx)
      .map((f) => f.detail)).toEqual(['backticked root file -> old guide.md']);
    // A live spaced path stays quiet, and the plain form is unchanged.
    const live = { ...ctx, tracked: new Set(['d.md', 'docs/user guides/live.md']) };
    expect(checkDeadLinks('d.md', 'see `docs/user guides/live.md`\n', live)).toEqual([]);
    expect(checkDeadLinks('d.md', 'see `docs/gone.md`\n', ctx)
      .map((f) => f.detail)).toEqual(['backticked path -> docs/gone.md']);
  });
});

describe('a comment inside a rendered HTML block', () => {
  it('still hides what it contains', () => {
    // Masking every HTML-block line made commentSpans ignore the delimiters
    // there, so `<div>` containing a commented-out anchor handed retired
    // markup to the href pass as visible content. Inside `<pre>` the
    // delimiters are displayed rather than parsed, which is why those still
    // suppress comment parsing.
    expect(checkDeadLinks('d.md',
      '<div>\n<!-- <a href="missing.md">old</a> -->\n</div>\n', linkCtx(['d.md'])))
      .toEqual([]);
    // The same anchor NOT commented out is still checked.
    expect(checkDeadLinks('d.md', '<div>\n<a href="missing.md">old</a>\n</div>\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
  });
});

// ── round 42 parity (stocks#1121 `6048592a`) ────────────────────────────────

describe('a backticked path nested in a wider code span', () => {
  it('is sample text, not a citation', () => {
    // ``example `scripts/missing.py` here`` renders the inner backticks and
    // the path literally, so reporting it failed the audit over a document's
    // own illustration. STRICT enclosure, because an ordinary single-backtick
    // citation IS its own span -- mere overlap would skip every one.
    const ctx = {
      tracked: new Set(['d.md']), topLevelDirs: new Set(['scripts']),
      rootFiles: new Set(), knownRoot: new Set(['old.md']),
      exts: new Set(['.md', '.py']), basenames: new Set(),
    };
    const c = (t) => checkDeadLinks('d.md', t, ctx).map((f) => f.detail);
    expect(c('see ``example `scripts/missing.py` here``\n')).toEqual([]);
    expect(c('see `scripts/missing.py`\n'))
      .toEqual(['backticked path -> scripts/missing.py']);
    // The root-file scanner beside it gets the same rule.
    expect(c('see ``example `old.md` here``\n')).toEqual([]);
    expect(c('see `old.md`\n')).toEqual(['backticked root file -> old.md']);
  });
});

describe('a backslash escape in a destination', () => {
  it('is a unit, like a character reference', () => {
    // `[g]: a\#b.md` targets the tracked `a#b.md`; splitting at the `#` inside
    // the escape reported the path `a\` dead. MD_LINK_RE's destination class
    // already read both as units, and this helper read only one of them.
    expect(checkDeadLinks('d.md', String.raw`[g]: a\#b.md` + '\n',
      linkCtx(['d.md', 'a#b.md']))).toEqual([]);
    expect(splitOutsideRefs(String.raw`a\#b.md`, '#'))
      .toEqual([String.raw`a\#b.md`, undefined]);
    expect(splitOutsideRefs('a.md#frag', '#')).toEqual(['a.md', 'frag']);
  });
});

describe('an escaped link in a heading', () => {
  it('keeps its destination in the slug', () => {
    // `## Literal \[x](guide.md)` renders the brackets and the destination as
    // TEXT -- CommonMark makes no link -- so GitHub's anchor includes
    // `xguidemd`, while stripping it unconditionally recorded `literal-x`: a
    // working fragment reported dead AND an anchor the page does not expose
    // accepted.
    expect(headingSlug(String.raw`Literal \[x](guide.md)`)).toBe('literal-xguidemd');
    expect(headingSlug('Real [x](guide.md)')).toBe('real-x');
    expect(headingSlug('Use `foo`')).toBe('use-foo');
  });
});

// ── round 43 ────────────────────────────────────────────────────────────────

describe('an issue URL', () => {
  it('ends where its number ends', () => {
    // Without a trailing boundary `.../issues/1foo` captured the numeric
    // prefix and was read as a citation of issue 1, so a closed issue 1
    // produced a gating stale-blocker finding for a URL that identifies no
    // issue at all.
    expect(checkClosedIssues('d.md', `Blocked by ${R30_URL}foo\n`, R30_STATES))
      .toEqual([]);
    expect(checkClosedIssues('d.md', `Blocked by ${R30_URL}\n`, R30_STATES)
      .map((f) => f.ref)).toEqual(['solyra#1']);
    // A fragment and a query are legitimate suffixes and still resolve.
    expect(checkClosedIssues('d.md', `Blocked by ${R30_URL}#issuecomment-5\n`,
      R30_STATES).map((f) => f.ref)).toEqual(['solyra#1']);
  });
});

describe('an escaped underscore in a heading', () => {
  it('is kept, because the rendered text keeps it', () => {
    // CommonMark removes the escape and renders `## API\_FIELD` as
    // `API_FIELD`, whose slug keeps the intraword underscore -- but the raw
    // backslash sat between the letter and the `_`, so the lookbehind saw no
    // word character, the underscore was stripped as emphasis and the audit
    // recorded `apifield`: a valid link to `#api_field` rejected AND a
    // nonexistent `#apifield` accepted.
    expect(headingSlug(String.raw`API\_FIELD`)).toBe('api_field');
    expect(headingSlug('API_FIELD')).toBe('api_field');
    // Real emphasis is still markup.
    expect(headingSlug('_stress_ test')).toBe('stress-test');
  });
});

describe('a type-7 HTML block', () => {
  it('may begin after a completed block, not only after a blank line', () => {
    // A type-7 block may not INTERRUPT a paragraph, but it may begin right
    // after a completed one -- `# Title` then `<x-widget>` -- and the
    // blank-previous-line proxy missed exactly that, so the example below it
    // was audited as live prose.
    expect([...rawHtmlBlockLines(['# Title', '<x-widget>', '[x](m.md)'])])
      .toEqual([1, 2]);
    // It still may not interrupt an open paragraph.
    expect([...rawHtmlBlockLines(['prose', '<x-widget>', '[x](m.md)'])]).toEqual([]);
    expect([...rawHtmlBlockLines(['prose', '', '<x-widget>', '[x](m.md)'])])
      .toEqual([2, 3]);
  });
});

describe('an HTML element whose id sits on a later line', () => {
  it('still declares its anchor', () => {
    // `<div\n id="section">` exposes `section` to the browser, and a per-line
    // scan can never see the tag and its attribute together -- so a valid
    // `[x](#section)` was reported as a gating dead anchor.
    expect([...headingAnchors('<div\n id="section">\n\ntext\n')]).toEqual(['section']);
    expect([...headingAnchors('<div id="section">\n\ntext\n')]).toEqual(['section']);
    // An example inside a fence declares nothing, as before.
    expect([...headingAnchors('```\n<div\n id="fake">\n```\n')]).toEqual([]);
  });
});

describe('a reference definition opening a list item', () => {
  it('still defines', () => {
    // `- [g]: missing.md` is the first content of an item, and CommonMark
    // resolves a use of `[g]` inside that item as a clickable link. The
    // anchored pattern saw the marker where it needs a bracket, so the
    // definition went unparsed -- and because reference USES are deliberately
    // not scanned, its broken destination produced no finding at all.
    expect(checkDeadLinks('d.md', '- [g]: missing.md\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    expect(checkDeadLinks('d.md', '- [g]: ok.md\n', linkCtx(['d.md', 'ok.md'])))
      .toEqual([]);
    expect(checkDeadLinks('d.md', '[g]: missing.md\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('a line: region pattern', () => {
  it('is read through a wrapped code span', () => {
    // A pattern surviving only inside a span that opens above it and closes
    // below still matched the raw line, so the region's claim of coverage
    // outlived the real generated content: no unmatched-region finding, and
    // the example's line routed to the renderer as though generated.
    const spec = ['line:img\\.shields\\.io'];
    const hidden = ownedLines('# T\n\n`a\nhttps://img.shields.io/x\nb`\n', spec);
    expect([...hidden.owned]).toEqual([]);
    expect(hidden.unmatched).toEqual(spec);
    // Real generated content still matches and still counts as covered.
    const live = ownedLines('# T\n\nhttps://img.shields.io/x\n', spec);
    expect([...live.owned]).toEqual([3]);
    expect(live.unmatched).toEqual([]);
  });
});

describe('a fence delimiter inside a raw HTML block', () => {
  it('opens nothing', () => {
    // CommonMark does not parse Markdown inside an HTML block, so a literal
    // ``` between `<div>` and `</div>` is displayed text. Opening on it left
    // a fence that outlived the block's terminating blank line and swallowed
    // every later link, blocker, heading and marker as "code".
    const doc = ['<div>', '```', '</div>', '', '[x](missing.md)'];
    expect([...fencedLines(doc)]).toEqual([]);
    expect([...rawHtmlBlockLines(doc)].sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(checkDeadLinks('d.md', `${doc.join('\n')}\n`, linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
  });

  it('is not confused with an HTML opener inside a real fence', () => {
    // The other direction, and the reason the fence scan runs twice rather
    // than once against an HTML set computed without fences: a `<div>` inside
    // a fenced EXAMPLE must not open a block, because a block there would
    // suppress the next real fence and route its contents back to live prose.
    const doc = ['```text', '<div>', '```', 'prose', '```py', 'code', '```', '',
      '[x](missing.md)'];
    expect([...fencedLines(doc)].sort((a, b) => a - b)).toEqual([0, 1, 2, 4, 5, 6]);
    expect(checkDeadLinks('d.md', `${doc.join('\n')}\n`, linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    // And the ordinary cases the two passes must leave exactly as they were.
    expect([...fencedLines(['```', 'x', '```', 'y'])]).toEqual([0, 1, 2]);
    expect([...fencedLines(['~~~', '```', '~~~', 'y'])]).toEqual([0, 1, 2]);
  });
});

describe('an href attribute', () => {
  it('is matched only as a whole attribute name', () => {
    // `<a data-href="missing.md">` is not a clickable link, but the pattern
    // matched the `href` suffix and emitted a gating dead-link finding for a
    // destination no reader can reach. The same held for an `href=` written
    // inside another attribute's VALUE.
    const check = (t) => checkDeadLinks('d.md', t, linkCtx(['d.md']))
      .map((f) => f.check);
    expect(check('<a data-href="missing.md">x</a>\n')).toEqual([]);
    expect(check('<a title="href=missing.md">x</a>\n')).toEqual([]);
    // A real href is still a real link, quoted or not, and so is one that
    // follows other attributes.
    expect(check('<a href="missing.md">x</a>\n')).toEqual(['dead-link']);
    expect(check('<a href=missing.md>x</a>\n')).toEqual(['dead-link']);
    expect(check('<a class="c" data-x=\'1\' href="missing.md">x</a>\n'))
      .toEqual(['dead-link']);
  });
});

describe('an explicit anchor value', () => {
  it('has its character references decoded', () => {
    // `<div id="a&amp;b">` exposes the id `a&b` to the browser, but the raw
    // value was recorded, so a valid link to that fragment was reported as a
    // gating dead anchor while the literal `a&amp;b` was accepted.
    expect([...headingAnchors('<div id="a&amp;b">x</div>\n')]).toEqual(['a&b']);
    // Case is still preserved: the browser matches an explicit id exactly.
    expect([...headingAnchors('<a name="Install"></a>\n')]).toEqual(['Install']);
  });
});

describe('a destination beginning with two dots', () => {
  it('is only traversal when the dots are a parent component', () => {
    // `..missing.md` is a legal repository filename that normalizes to
    // itself, and treating it as traversal meant a deleted or misspelled
    // dot-prefixed target was never reported at all.
    expect(checkDeadLinks('d.md', '[x](..missing.md)\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    // A real parent component still leaves the repository and is exempt.
    expect(checkDeadLinks('d.md', '[x](../outside.md)\n', linkCtx(['d.md'])))
      .toEqual([]);
    // And a tracked dot-prefixed file is not a finding.
    expect(checkDeadLinks('d.md', '[x](..missing.md)\n',
      linkCtx(['d.md', '..missing.md']))).toEqual([]);
  });
});

describe('the GitHub host boundary', () => {
  it('belongs to the URL scheme, not to any double slash', () => {
    // Any `//` satisfied the lookbehind, so a URL whose host is example.com
    // read as a citation of Solyra issue 1 and a closed issue 1 produced a
    // gating stale-blocker finding for it.
    const states = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
    const ref = (t) => checkClosedIssues('d.md', t, states).map((f) => f.ref);
    expect(ref('Blocked by https://example.com//github.com/TeneikaAskew/solyra/issues/1'))
      .toEqual([]);
    // The real URL, and the bare-host spelling this repo's docs use, both still count.
    expect(ref('Blocked by https://github.com/TeneikaAskew/solyra/issues/1'))
      .toEqual(['solyra#1']);
    expect(ref('Blocked by github.com/TeneikaAskew/solyra/issues/1'))
      .toEqual(['solyra#1']);
  });
});

describe('heading whitespace', () => {
  it('becomes a hyphen whatever kind it is', () => {
    // `## Hello\tWorld` anchors as `hello-world` on GitHub, but keeping the
    // tab recorded an unusable slug -- so a valid `#hello-world` link was a
    // gating dead anchor while the tab-bearing spelling was accepted.
    expect(headingSlug('Hello\tWorld')).toBe('hello-world');
    expect(headingSlug('Hello World')).toBe('hello-world');
  });
});

describe('the Claims pass over HTML and across paragraphs', () => {
  const doc = 'tmp-claim-block-fixture.md';
  const claim = [{ doc, pattern: '(\\d+) living docs',
    derivation: 'grep-files src fetch\\(' }];
  const exec = () => 'a\nb\nc\nd\ne\nf\ng\n';   // seven
  const run = (body) => {
    fs.writeFileSync(path.join(process.cwd(), doc), body);
    spawnSync('git', ['add', '-N', doc], { cwd: process.cwd() });
    try { return checkClaims(claim, { exec }); }
    finally {
      spawnSync('git', ['rm', '--cached', '-q', '--force', doc], { cwd: process.cwd() });
      fs.unlinkSync(path.join(process.cwd(), doc));
    }
  };

  it('still reads prose a rendered HTML block displays', () => {
    // Plain text inside a `<div>` is rendered to readers and can be the
    // assertion a row watches, but masking every HTML block made the row
    // report its pattern inert instead of comparing the number.
    expect(run('# C\n\n<div>\nThere are 3 living docs.\n</div>\n')[0].detail)
      .toMatch(/claims 3, .* gives 7/);
    // A RAW-TEXT block displays its contents literally, so it is an example.
    expect(run('# C\n\n<pre>\nThere are 3 living docs.\n</pre>\n')[0].detail)
      .toMatch(/matched nothing/);
  });

  it('does not pair code-span delimiters across a paragraph boundary', () => {
    // An unmatched backtick in one paragraph was pairing with another after
    // the claim, swallowing the real assertion as an inline-code example --
    // reported as an inert pattern instead of compared.
    expect(run('# C\n\nA stray ` tick.\n\nThere are 3 living docs. `\n')[0].detail)
      .toMatch(/claims 3, .* gives 7/);
    // Within ONE paragraph the span still wraps, and a whole match inside it
    // is still an example.
    expect(run('# C\n\nExample: `3 living\ndocs` here.\n')[0].detail)
      .toMatch(/matched nothing/);
  });
});

describe('a reference definition interrupting a paragraph', () => {
  it('is not a definition', () => {
    // `paragraph` then `[g]: missing.md` with no blank line between them
    // renders literally -- CommonMark registers no reference there -- yet the
    // destination produced a gating dead-link finding for a link no reader
    // can follow.
    const check = (t) => checkDeadLinks('d.md', t, linkCtx(['d.md']))
      .map((f) => f.check);
    expect(check('paragraph\n[g]: missing.md\n')).toEqual([]);
    // Separated by a blank line it opens a block, so it defines.
    expect(check('paragraph\n\n[g]: missing.md\n')).toEqual(['dead-link']);
    // At the top of the document, and as a RUN, which CommonMark allows.
    expect(check('[g]: missing.md\n')).toEqual(['dead-link']);
    expect(checkDeadLinks('d.md', '[a]: ok.md\n[b]: missing.md\n',
      linkCtx(['d.md', 'ok.md'])).map((f) => f.check)).toEqual(['dead-link']);
    // A heading ends the block before it, so a definition may follow one.
    expect(check('# T\n[g]: missing.md\n')).toEqual(['dead-link']);
  });
});

describe('an issue URL inside an HTML tag attribute', () => {
  it('is metadata, not a blocker citation', () => {
    // `<div data-note="still open https://.../issues/1">` is neither visible
    // nor clickable, but the raw line carried both the cue and the URL into
    // the classifier and a closed issue produced a gating finding for it.
    const states = { solyra: { 1: { state: 'closed', reason: 'completed', kind: 'ISSUE' } } };
    const ref = (t) => checkClosedIssues('d.md', t, states).map((f) => f.ref);
    expect(ref('<div data-note="still open https://github.com/TeneikaAskew/solyra/issues/1">'))
      .toEqual([]);
    // An `href` is exempt: a rendered anchor to an issue IS a citation a
    // reader follows, which is why the rendered-HTML blocker pass exists.
    expect(ref('Blocked by <a href="https://github.com/TeneikaAskew/solyra/issues/1">x</a>'))
      .toEqual(['solyra#1']);
    // And ordinary prose is untouched.
    expect(ref('Blocked by https://github.com/TeneikaAskew/solyra/issues/1'))
      .toEqual(['solyra#1']);
  });
});

describe('HTML anchor attributes in any case', () => {
  it('still declare their fragment', () => {
    // Attribute names are case-insensitive and the browser exposes the
    // fragment either way, but without the `i` flag neither `<DIV ID="x">`
    // nor `<A NAME="y">` was recorded, so a valid link was a dead anchor.
    expect([...headingAnchors('<DIV ID="section">x</DIV>\n')]).toEqual(['section']);
    expect([...headingAnchors('<A NAME="legacy"></A>\n')]).toEqual(['legacy']);
    // The VALUE's case is still preserved; only the names are folded.
    expect([...headingAnchors('<div ID="Install">x</div>\n')]).toEqual(['Install']);
  });
});

describe('YAML front matter', () => {
  it('is metadata rather than body links', () => {
    // GitHub renders front matter as a metadata table, so a Markdown-shaped
    // value there is not a link a reader can click.
    const check = (t) => checkDeadLinks('d.md', t, linkCtx(['d.md']))
      .map((f) => f.check);
    expect(check('---\ntitle: "[guide](missing.md)"\n---\n\n# T\n')).toEqual([]);
    expect(check('---\n[g]: missing.md\n---\n\n# T\n')).toEqual([]);
    // The same link in the BODY is still a real link.
    expect(check('# T\n\n[guide](missing.md)\n')).toEqual(['dead-link']);
  });
});

describe('a reference label', () => {
  it('collapses internal whitespace when matched', () => {
    // CommonMark collapses it, so `[foo bar]` and `[foo   bar]` are the same
    // label and the first definition wins. Keying on the raw text validated
    // the second independently and reported a destination no reference
    // resolves to.
    expect(checkDeadLinks('d.md', '[foo bar]: ok.md\n\n[foo   bar]: missing.md\n',
      linkCtx(['d.md', 'ok.md']))).toEqual([]);
    // Genuinely distinct labels are still both checked.
    expect(checkDeadLinks('d.md', '[a]: ok.md\n\n[b]: missing.md\n',
      linkCtx(['d.md', 'ok.md'])).map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('a heading link', () => {
  it('keeps its label whatever the destination contains', () => {
    // The destination is scanned rather than matched, so parentheses inside
    // it cannot end it early: `## See [x](a(b).md) now` renders "See x now".
    expect(headingSlug('See [x](a(b).md) now')).toBe('see-x-now');
    expect(headingSlug('See [x](a(b(c)).md) now')).toBe('see-x-now');
    // An ESCAPED bracket makes no link, and an ordinary one still loses its
    // destination -- the controls from the rounds that shaped this.
    expect(headingSlug('Literal \\[x](guide.md)')).toBe('literal-xguidemd');
    expect(headingSlug('Real [x](guide.md)')).toBe('real-x');
  });

  it('resolves a defined reference to its visible label', () => {
    // `## See [guide][g]` with `[g]` defined renders as "See guide".
    // Definedness decides it: CommonMark renders an undefined reference
    // literally and the slug keeps both labels.
    expect([...headingAnchors('# T\n\n## See [guide][g]\n\n[g]: guide.md\n')].sort())
      .toEqual(['see-guide', 't']);
    expect([...headingAnchors('# T\n\n## See [guide][g]\n')].sort())
      .toEqual(['see-guideg', 't']);
    // A definition inside a fence defines nothing.
    expect([...headingAnchors('# T\n\n## See [guide][g]\n\n```\n[g]: guide.md\n```\n')].sort())
      .toEqual(['see-guideg', 't']);
  });
});

describe('a Setext heading opening a list item', () => {
  it('drops its marker before slugging', () => {
    // `- Title` over an indented `===` is a heading isSetextUnderline
    // deliberately accepts, but the raw `- Title` reached the slug and
    // recorded `--title`.
    expect([...headingAnchors('- Title\n  ===\n')]).toEqual(['title']);
    // The case the ATX-only rule guards is still refused: `- Example` over a
    // column-zero `---` ends the list and renders a thematic break.
    expect([...headingAnchors('- Example\n---\n')]).toEqual([]);
    expect([...headingAnchors('Title\n===\n')]).toEqual(['title']);
  });
});

describe('a raw HTML block opened inside a blockquote', () => {
  it('ends with its container', () => {
    // CommonMark ends a nested block where its container ends, so `> <pre>`
    // is closed by the quote whether or not a `</pre>` ever arrives. Holding
    // it open added every later line to the block, suppressing live body
    // content through EOF.
    const doc = ['> <pre>', '> sample', '', '[x](missing.md)'];
    expect([...rawHtmlBlockLines(doc)].sort((a, b) => a - b)).toEqual([0, 1]);
    expect(checkDeadLinks('d.md', `${doc.join('\n')}\n`, linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    // An UNQUOTED block opens at depth 0 and nothing is below 0, so it still
    // runs to its closing tag across blank lines.
    expect([...rawHtmlBlockLines(['<pre>', 'a', '', 'b', '</pre>'])]
      .sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('inline content at a container boundary', () => {
  it('does not pair across a new list item or a quote-depth change', () => {
    // A new list item opens its own paragraph, and so does a change of
    // blockquote depth. Grouping them into one block paired delimiters across
    // the boundary and masked a live broken link completely.
    expect(paragraphBlocks(['a ` b', '- [x](missing.md) `'], new Set()))
      .toEqual([[0, 0], [1, 1]]);
    expect(checkDeadLinks('d.md', 'a ` b\n- [x](missing.md) `\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    // The other direction: two items must not pair into one link.
    expect(checkDeadLinks('d.md', '- [open\n- label](missing.md)\n',
      linkCtx(['d.md']))).toEqual([]);
    expect(paragraphBlocks(['> a ` b', 'c ` d'], new Set()))
      .toEqual([[0, 0], [1, 1]]);
    // A CONTINUATION of an item carries no marker and stays in its block.
    expect(paragraphBlocks(['- one', '  two'], new Set())).toEqual([[0, 1]]);
  });
});

describe('a reference definition with no space after its colon', () => {
  it('still defines', () => {
    // CommonMark registers `[g]:missing.md` and resolves `[x][g]` against it,
    // but `\s+` skipped the definition -- and because reference USES are
    // deliberately not scanned, its broken destination produced no finding.
    const check = (t) => checkDeadLinks('d.md', t, linkCtx(['d.md']))
      .map((f) => f.check);
    expect(check('[g]:missing.md\n')).toEqual(['dead-link']);
    expect(check('[g]: missing.md\n')).toEqual(['dead-link']);
    // A colon with NOTHING after it is still the two-line head form.
    expect(check('[g]:\n\nmissing.md\n')).toEqual([]);
  });
});

describe('an escaped HTML anchor', () => {
  it('is literal text, not a link', () => {
    // `\<a href="missing.md">` escapes the `<`, so CommonMark renders the tag
    // as text. The Markdown pass has applied this check for rounds; the href
    // pass did not, so the same escape produced a gating finding there.
    const check = (t) => checkDeadLinks('d.md', t, linkCtx(['d.md']))
      .map((f) => f.check);
    expect(check('\\<a href="missing.md">x</a>\n')).toEqual([]);
    expect(check('<a href="missing.md">x</a>\n')).toEqual(['dead-link']);
  });
});

describe('a fence opener', () => {
  it('has its indentation measured in columns', () => {
    // CommonMark expands a tab to four columns, so `\t```` is an indented
    // code line rather than a fence opener. The column-zero fence on the last
    // line then opens one that runs to the end of the document.
    expect([...fencedLines(['\t```', 'x', '```'])]).toEqual([2]);
    // Three SPACES are a legal opener; four are indented code.
    expect([...fencedLines(['   ```', 'x', '```'])]).toEqual([0, 1, 2]);
    expect([...fencedLines(['    ```', 'x', '```'])]).toEqual([2]);
    // A quoted fence is measured inside its container, so it still opens.
    expect([...fencedLines(['> ```', '> x', '> ```'])]).toEqual([0, 1, 2]);
  });
});

describe('an angle-bracket destination', () => {
  it('may not span physical lines', () => {
    // `<...>` may hold a space, which is why an author reaches for it, but
    // CommonMark forbids a line ending there, so this is literal text.
    expect(checkDeadLinks('d.md', '[x](<missing\n.md>)\n', linkCtx(['d.md'])))
      .toEqual([]);
    // On ONE line the space is still allowed, which is the form this is for.
    expect(checkDeadLinks('d.md', '[x](<my missing.md>)\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('front-matter delimiters', () => {
  it('are recognised only at column zero', () => {
    // An indented `---` is a thematic break, so trimming the line excluded
    // every line between two of them as metadata and let a rendered link
    // between them pass unchecked.
    expect([...frontMatterLines(['  ---', '[x](missing.md)', '  ---'])]).toEqual([]);
    expect(checkDeadLinks('d.md', '  ---\n[x](missing.md)\n  ---\n', linkCtx(['d.md']))
      .map((f) => f.check)).toEqual(['dead-link']);
    // A real opener at column zero still delimits metadata.
    expect([...frontMatterLines(['---', 'a: 1', '---'])]).toEqual([0, 1, 2]);
  });
});

describe('a heading tag with a quoted greater-than sign', () => {
  it('is stripped whole', () => {
    // `[^<>]*` stopped at the `>` inside `data-x="a>b"` and left `b">` to be
    // slugged as visible text, recording `bhello`.
    expect(headingSlug('<span data-x="a>b">Hello</span>')).toBe('hello');
    expect(headingSlug('Hello <em>world</em>')).toBe('hello-world');
    // An AUTOLINK is text, not a tag, and must survive.
    expect(headingSlug('<https://example.com>')).not.toBe('');
  });
});

describe('a heading reference label', () => {
  it('is keyed the same way a definition is', () => {
    // CommonMark collapses internal whitespace when matching labels, so
    // `[guide][my   ref]` resolves against `[my ref]:`. Normalising only the
    // DEFINITIONS left the use unmatched, so the reference stayed literal
    // bracket syntax and slugged as `see-guidemy---ref`.
    expect([...headingAnchors('# T\n\n## See [guide][my   ref]\n\n[my ref]: guide.md\n')]
      .sort()).toEqual(['see-guide', 't']);
    // Both sides go through the same key, so the exact spelling still works
    // and an UNDEFINED label is still left literal.
    expect([...headingAnchors('# T\n\n## See [guide][g]\n\n[g]: guide.md\n')].sort())
      .toEqual(['see-guide', 't']);
    expect([...headingAnchors('# T\n\n## See [guide][g]\n')].sort())
      .toEqual(['see-guideg', 't']);
  });
});

describe('a code span in a heading', () => {
  it('keeps its contents literal', () => {
    // A code span renders its contents LITERALLY, so link and tag syntax
    // inside one is text. Unwrapping the span before the markup passes handed
    // it to the link stripper, which discarded the destination.
    expect(headingSlug('`[x](y)`')).toBe('xy');
    // The RUN form is one span too; a single-backtick pattern saw none.
    expect(headingSlug('``[x](missing.md)``')).toBe('xmissingmd');
    // Outside a span all three passes still apply.
    expect(headingSlug('Real [x](guide.md)')).toBe('real-x');
    expect(headingSlug('Hello <em>world</em>')).toBe('hello-world');
    expect([...headingAnchors('# T\n\n## AT&amp;T\n')].sort()).toEqual(['att', 't']);
  });
});

describe('a heading reference definition', () => {
  it('must open a block to define anything', () => {
    // `paragraph` then `[g]: x.md` renders literally, so collecting it let
    // `## [Guide][g]` resolve to `guide` when the page exposes `guideg`.
    expect([...headingAnchors('paragraph\n[g]: README.md\n\n## [Guide][g]\n')])
      .toEqual(['guideg']);
    // One that DOES open a block still defines, colon space or not.
    expect([...headingAnchors('# T\n\n[g]: README.md\n\n## [Guide][g]\n')].sort())
      .toEqual(['guide', 't']);
    expect([...headingAnchors('# T\n\n[g]:README.md\n\n## [Guide][g]\n')].sort())
      .toEqual(['guide', 't']);
  });
});

describe('a front-matter closing delimiter', () => {
  it('sits at column zero too', () => {
    // An indented `---` is not a delimiter, but `trim()` accepted one, so
    // everything through that line was masked as metadata. The OPENER has
    // required column zero since it was raised; the closer did not.
    expect([...frontMatterLines(['---', 'a: 1', '  ---', '[x](missing.md)'])])
      .toEqual([]);
    expect(checkDeadLinks('d.md', '---\na: 1\n  ---\n[x](missing.md)\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
    // A real closer at column zero, in both spellings, still delimits.
    expect([...frontMatterLines(['---', 'a: 1', '---'])]).toEqual([0, 1, 2]);
    expect([...frontMatterLines(['---', 'a: 1', '...'])]).toEqual([0, 1, 2]);
  });
});

describe('a Setext heading', () => {
  it('is its whole paragraph, not just the last line', () => {
    // `Hello` over `world` over `---` renders ONE heading anchored
    // `hello-world`. Slugging the final line alone recorded `world`.
    expect([...headingAnchors('Hello\nworld\n---\n')]).toEqual(['hello-world']);
    // The single-line forms this grew out of are unchanged.
    expect([...headingAnchors('Title\n===\n')]).toEqual(['title']);
    expect([...headingAnchors('- Title\n  ===\n')]).toEqual(['title']);
    expect([...headingAnchors('# T\n\n## Sub\n')].sort()).toEqual(['sub', 't']);
  });
});

describe('a tabbed list marker', () => {
  it('sets the nested-code floor in columns', () => {
    // `-\titem` advances the tab to column 4, but counting characters said 2
    // and set the floor to 6 -- so a six-space rendered continuation
    // paragraph was classified as code and skipped by the audits.
    expect([...indentedCodeLines(['-\titem', '', '      [x](missing.md)'])])
      .toEqual([]);
    // A SPACE marker really does put the floor at 6, so six spaces is code.
    expect([...indentedCodeLines(['- item', '', '      [x](missing.md)'])])
      .toEqual([2]);
  });
});


describe('a raw HTML block', () => {
  it('opens through a list marker', () => {
    // `- <pre>` opens a raw-text block whose contents display literally, so
    // the `[x](missing.md)` inside it is an EXAMPLE. Stripping only
    // blockquotes left the opener unrecognised and produced a gating
    // dead-link finding for a link no reader can click.
    expect([...rawHtmlBlockLines(['- <pre>', '  [x](missing.md)', '  </pre>'])])
      .toEqual([0, 1, 2]);
    expect(checkDeadLinks('d.md', '# T\n\n- <pre>\n  [x](missing.md)\n  </pre>\n',
      linkCtx(['d.md']))).toEqual([]);
    // The containers it already handled are unchanged.
    expect([...rawHtmlBlockLines(['<pre>', 'x', '</pre>'])]).toEqual([0, 1, 2]);
    expect([...rawHtmlBlockLines(['> <pre>', '> x', '> </pre>'])]).toEqual([0, 1, 2]);
  });
});

describe('an escaped comment opener', () => {
  it('opens no comment', () => {
    // `\<!--` displays the delimiter literally and leaves the rest of the line
    // live Markdown. Reading it as a real comment masked content through
    // `-->` or to EOF, suppressing every finding in between.
    expect([...commentSpans(['\\<!-- [x](missing.md)'])]).toEqual([]);
    expect(checkDeadLinks('d.md', '# T\n\n\\<!-- [x](missing.md)\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
    // A real opener still opens, and PARITY still decides: `\\<!--` is a
    // literal backslash followed by a live comment.
    expect([...commentSpans(['<!-- [x](missing.md)'])]).toEqual([[0, [[0, 20]]]]);
    expect([...commentSpans(['\\\\<!-- x'])]).toEqual([[0, [[2, 8]]]]);
    // Through `fencedLines`, which reads the standalone copy of this scan in
    // `commentHiddenLines`: a false comment there swallows every later fence
    // delimiter, so the example below it is audited as live content.
    expect([...fencedLines(['\\<!--', '```', 'x', '```'])]).toEqual([1, 2, 3]);
    expect([...fencedLines(['<!--', '```', 'x', '```'])]).toEqual([]);
  });
});

describe('an escaped angle bracket', () => {
  it('is reference destination content, not the delimiter', () => {
    // `[g]: <a\>b.md>` resolves to `a>b.md`. `[^<>\n]*` stopped at the escaped
    // `>`, captured `a\` and reported a tracked file dead.
    expect(checkDeadLinks('d.md', '# T\n\n[g]: <a\\>b.md>\n',
      linkCtx(['d.md', 'a>b.md']))).toEqual([]);
    // The two-line form reads its destination through the same alternative.
    expect(checkDeadLinks('d.md', '# T\n\n[g]:\n  <a\\>b.md>\n',
      linkCtx(['d.md', 'a>b.md']))).toEqual([]);
    // A destination with a SPACE is still what the angle form is for.
    expect(checkDeadLinks('d.md', '# T\n\n[g]: <my guide.md>\n',
      linkCtx(['d.md', 'my guide.md']))).toEqual([]);
  });
});

describe('a URI scheme', () => {
  it('is read off the rendered destination', () => {
    // `[x](https&#58;//example.com)` renders as an ordinary HTTPS link. The
    // scheme test ran on the encoded spelling, so the audit resolved it as a
    // repository-relative path and emitted a gating dead-link finding.
    expect(checkDeadLinks('d.md', '# T\n\n[x](https&#58;//example.com)\n',
      linkCtx(['d.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', '# T\n\n[x](https\\://example.com)\n',
      linkCtx(['d.md']))).toEqual([]);
    // A genuinely relative destination is still resolved and still checked.
    expect(checkDeadLinks('d.md', '# T\n\n[x](missing.md)\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
  });
});

describe('a Setext underline', () => {
  it('ends the inline-parsing block', () => {
    // An unmatched backtick in a multiline Setext heading paired with one in
    // the paragraph BELOW the underline, and codeSpanLines masked a live
    // `[x](missing.md)` between them out of the audit.
    const lines = ['Head `a', '====', '[x](missing.md) `b'];
    expect(paragraphBlocks(lines)).toEqual([[0, 1], [2, 2]]);
    expect([...codeSpanLines(lines)]).toEqual([]);
    expect(checkDeadLinks('d.md', 'Head `a\n====\n[x](missing.md) `b\n',
      linkCtx(['d.md'])).map((f) => f.check)).toEqual(['dead-link']);
    // The heading itself is still its whole paragraph.
    expect([...headingAnchors('Head\nTwo\n===\n\npara\n')]).toEqual(['head-two']);
    expect([...headingAnchors('Head Two\n---\n')]).toEqual(['head-two']);
  });
});

describe('a case-variant Owner field', () => {
  it('is read rather than duplicated', () => {
    // `**owner:** Alice` is a field every reader recognises. Reading it
    // case-sensitively returned null, the variant was kept as free text, and
    // --stamp wrote a canonical `**Owner:** TBD` beside it -- one line
    // asserting two different owners, reported as updated.
    const line = '**Last reviewed:** 2026-01-01 · **owner:** Alice';
    expect(ownerOf(line)).toBe('Alice');
    expect(extraSegments(line)).toEqual([]);
    const { text } = stamp(`# T\n\n${line}\n\nBody.\n`,
      '2026-09-22', 'scanned', 'abc1234567ab');
    expect(text).toContain('**Owner:** Alice');
    expect(text).not.toContain('**Owner:** TBD');
    expect(text.match(/wner:\*\*/g)).toHaveLength(1);
    // The canonical spelling still reads.
    expect(ownerOf('**Owner:** Bob')).toBe('Bob');
    // A variant of a field that HAS a value stays in the tail, so the
    // malformed-field checks still see it and the rewrite is refused.
    expect(extraSegments('**Last reviewed:** 2026-01-01 · **depth:** verified'))
      .toEqual(['**depth:** verified']);
  });
});

describe('an inline link destination', () => {
  it('nests parentheses to any depth', () => {
    // `docs/a(b(c(d))).md` is a destination CommonMark resolves, and a
    // fixed-depth alternative could not match such a link at all -- so a
    // deleted target spelled that way produced no finding.
    for (const dest of ['docs/a(b).md', 'docs/a(b(c)).md', 'docs/a(b(c(d))).md']) {
      expect(checkDeadLinks('d.md', `# T\n\n[x](${dest})\n`,
        linkCtx(['d.md'])).map((f) => f.detail)).toEqual([`relative link -> ${dest}`]);
    }
    // An escaped hash stays in the PATH; a character reference is a unit.
    expect(checkDeadLinks('d.md', '# T\n\n[x](a\\#b.md)\n',
      linkCtx(['d.md', 'a#b.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', '# T\n\n[x](foo&#38;bar.md)\n',
      linkCtx(['d.md', 'foo&bar.md']))).toEqual([]);
    // The angle form still admits a space, and a title still closes the link.
    expect(checkDeadLinks('d.md', '# T\n\n[x](<docs/my guide.md>)\n',
      linkCtx(['d.md', 'docs/my guide.md']))).toEqual([]);
    expect(checkDeadLinks('d.md', '# T\n\n[x](docs/g.md "title")\n',
      linkCtx(['d.md'])).map((f) => f.detail)).toEqual(['relative link -> docs/g.md']);
  });
});

describe('a heading label', () => {
  it('reads the two-line reference definition form', () => {
    // `[g]:` over `  guide.md` defines `g`, so `## See [guide][g]` renders
    // anchored `see-guide`. Reading only the single-line form recorded
    // `see-guideg` and reported a working fragment link dead.
    expect([...headingAnchors('[g]:\n  guide.md\n\n## See [guide][g]\n')])
      .toEqual(['see-guide']);
    expect([...headingAnchors('[g]: guide.md\n\n## See [guide][g]\n')])
      .toEqual(['see-guide']);
    // An UNDEFINED label still keeps both halves, which is how it renders.
    expect([...headingAnchors('## See [guide][g]\n')]).toEqual(['see-guideg']);
  });
});

describe('a heading slug', () => {
  it('renders a code span without its boundary spaces', () => {
    // CommonMark strips ONE leading and trailing space when a span's content
    // begins and ends with one, so `## A ` foo ` B` anchors `a-foo-b`.
    // Appending the raw capture recorded `a--foo--b`.
    expect(headingSlug('A ` foo ` B')).toBe('a-foo-b');
    // Content that is ENTIRELY spaces is the rule's own exception.
    expect(headingSlug('a `  ` b')).toBe('a----b');
    expect(headingSlug('A `x` B')).toBe('a-x-b');
  });

  it('keeps an escaped emphasis character as text', () => {
    // `## \_foo` renders `_foo` and GitHub's id keeps the underscore.
    // Unescaping before the boundary rule ran recorded `foo`.
    expect(headingSlug('\\_foo')).toBe('_foo');
    expect(headingSlug('foo\\_')).toBe('foo_');
    // The intraword case this grew out of, and genuine emphasis, are as they were.
    expect(headingSlug('API\\_FIELD')).toBe('api_field');
    expect(headingSlug('API_FIELD')).toBe('api_field');
    expect(headingSlug('_emphasis_')).toBe('emphasis');
  });

  it('strips only HTML the source actually wrote', () => {
    // `## \<em>foo` and `## &lt;em&gt;foo` both render the characters
    // `<em>foo`, whose id is `emfoo`. Stripping the tag-shaped run regardless
    // of the escape, and after decoding, recorded `foo`.
    expect(headingSlug('\\<em>foo')).toBe('emfoo');
    expect(headingSlug('&lt;em&gt;foo')).toBe('emfoo');
    // Real inline HTML is still markup; an autolink is still not a tag; a
    // quoted attribute value may still contain `>`.
    expect(headingSlug('Hello <em>world</em>')).toBe('hello-world');
    expect(headingSlug('<https://example.com>')).toBe('httpsexamplecom');
    expect(headingSlug('<span data-x="a>b">Hello</span>')).toBe('hello');
  });

  it('removes a comment from heading text rather than blanking it', () => {
    // A slug does not collapse whitespace runs, so blanking a comment to keep
    // offsets recorded `hello---------------real` where GitHub exposes
    // `hello--real`. The Setext branch reread the raw line and did not mask
    // at all, recording `hello----note---`.
    expect([...headingAnchors('Hello <!-- note -->\n---\n')]).toEqual(['hello']);
    expect([...headingAnchors('## Hello <!-- note --> Real\n')]).toEqual(['hello--real']);
    // A comment BEFORE the `#` no longer pushes the heading past the
    // three-column limit, so it is still a heading.
    expect([...headingAnchors('<!-- x --> ## H\n')]).toEqual(['h']);
    expect([...headingAnchors('Hello\nworld\n---\n')]).toEqual(['hello-world']);
  });
});

describe('an HTML attribute value', () => {
  const states = { 'TeneikaAskew/solyra': { 1: { state: 'closed', reason: 'completed', kind: 'issue' } } };
  const url = 'https://github.com/TeneikaAskew/solyra/issues/1';
  const findings = (body) => checkClosedIssues('d.md', `# T\n\n${body}\n`, states);

  it('is metadata, not a citation', () => {
    // `<div data-issue="...">Outstanding</div>` shows a reader the word
    // `Outstanding` and nothing else: the URL is neither visible nor
    // clickable, and scanning it produced a gating stale-blocker finding.
    expect(findings(`<div data-issue="${url}">Outstanding</div>`)).toEqual([]);
    // `href` is exempt only on an ANCHOR: `<a href>` is a citation readers
    // follow, and on any other element it renders no link at all.
    expect(findings(`<a href="${url}">Outstanding</a>`)).not.toEqual([]);
    expect(findings(`<div href="${url}">Outstanding</div>`)).toEqual([]);
    // Ordinary prose is still scanned, which is what the check is for.
    expect(findings(`Outstanding: ${url}`)).not.toEqual([]);
  });

  it('is read across a multiline opening tag', () => {
    // `<div\n data-note="...">` is ONE tag, and a per-line scan finds no
    // opener on the second line at all -- so the URL and its cue were read as
    // visible prose.
    expect([...tagAttributeSpans(['<div', '  data-note="Still open">'])])
      .toEqual([[1, [[13, 23]]]]);
    expect(findings(`<div\n  data-note="Still open ${url}">Text</div>`)).toEqual([]);
  });
});

describe('a marker inside raw HTML', () => {
  it('is not the document provenance', () => {
    // Markdown inside `<pre>` or `<div>` is not parsed, so a marker-shaped
    // line there renders as literal characters. Accepting it let `--stamp
    // --verify` rewrite it and report the document covered.
    const marker = '**Last reviewed:** 2026-09-01 · **Owner:** X';
    for (const tag of ['pre', 'div']) {
      expect(findMarkers(['# Real', '', `<${tag}>`, marker, `</${tag}>`, '', 'body']))
        .toEqual([]);
    }
    // The fenced equivalent was already excluded, and a real marker is found.
    expect(findMarkers(['# Real', '', '```', marker, '```'])).toEqual([]);
    expect(findMarkers(['# Real', '', marker])).toHaveLength(1);
  });
});

describe('claim-bearing prose', () => {
  it('excludes HTML attribute values', () => {
    // When the only occurrence of a registered claim sits in
    // `<div data-note="3 routes">`, the row passed while the document no
    // longer makes the assertion in prose -- or emitted a count finding
    // against metadata a reader never sees.
    expect(visibleClaimText(['<div data-note="3 routes"></div>']))
      .not.toContain('3 routes');
    // A RENDERED block shows its text, so a claim inside a `<div>` is still
    // an assertion the document makes; only the raw-text kinds hide one.
    expect(visibleClaimText(['<div>', 'There are 3 routes', '</div>']))
      .toContain('3 routes');
    expect(visibleClaimText(['<pre>', 'There are 3 routes', '</pre>']))
      .not.toContain('3 routes');
    expect(visibleClaimText(['There are 3 routes'])).toContain('3 routes');
  });
});

describe('a backslash escape', () => {
  it('survives every link delimiter', () => {
    // Three delimiters stopped at an ESCAPED copy of themselves, and each
    // failure left the whole link unmatched -- so a missing destination
    // produced no finding at all, which is the hiding direction.
    const ctx = linkCtx(['d.md', 'a>b.md', 'g.md']);
    const dead = (body) => checkDeadLinks('d.md', `# T\n\n${body}\n`, ctx)
      .map((f) => f.detail);
    // An angle-bracketed destination: `[x](<a\>b.md>)` resolves to `a>b.md`.
    expect(dead('[x](<a\\>b.md>)')).toEqual([]);
    expect(checkDeadLinks('d.md', '# T\n\n[x](<a\\>b.md>)\n', linkCtx(['d.md'])))
      .not.toEqual([]);
    // A title may carry its own delimiter when escaped, in all three forms.
    expect(dead('[x](g.md "a \\" quote")')).toEqual([]);
    expect(dead("[x](g.md 'a \\' quote')")).toEqual([]);
    expect(dead('[x](g.md (a \\) title))')).toEqual([]);
    expect(dead('[x](missing.md "a \\" quote")')).toEqual(['relative link -> missing.md']);
    // A reference label may carry an escaped bracket.
    expect(dead('[x\\]]: missing.md')).toEqual(['reference link [x\\]] -> missing.md']);
    // And the forms these grew out of are unchanged: a footnote still defines
    // no destination, a plain title still closes a link, and the angle form
    // still admits a space.
    expect([...headingAnchors('[^1]: note\n\n## [G][^1]\n')]).toEqual(['g1']);
    expect(dead('[x](g.md "t")')).toEqual([]);
    expect(checkDeadLinks('d.md', '# T\n\n[x](<my guide.md>)\n',
      linkCtx(['d.md', 'my guide.md']))).toEqual([]);
  });
});

describe('an explicit HTML anchor', () => {
  const ids = (src) => [...headingAnchors(`${src}\n`)];

  it('is read as a real tag attribute, not as text', () => {
    // `id=` inside ANOTHER attribute's value invented an anchor a link could
    // then resolve against, and a `>` inside a quoted value hid a real one --
    // wrong in both directions, the invented ids being the worse half.
    expect(ids('<div data-note=" id=fake">')).toEqual([]);
    expect(ids('<div title=\' id="fake"\'>')).toEqual([]);
    expect(ids('<div title="a > b" id="section">')).toEqual(['section']);
    // `id` names a destination on any element; `name` only on an anchor.
    expect(ids('<meta name="viewport">')).toEqual([]);
    expect(ids('<a name="legacy"></a>')).toEqual(['legacy']);
    // The forms it already handled are unchanged.
    expect(ids('<div id=section>')).toEqual(['section']);
    expect(ids('<div id="a&amp;b">')).toEqual(['a&b']);
    expect([...headingAnchors('<div\n  id="section">\n')]).toEqual(['section']);
    expect([...headingAnchors('<pre>\n<a id="fake"></a>\n</pre>\n')]).toEqual([]);
    // An ESCAPED opener is not an element. CommonMark renders the `<` in
    // `\\<div id="fake">` literally, so `#fake` reaches nothing -- but the
    // tokeniser parsed it like any other tag and registered the id, which is
    // how a link to a destination the document does not offer PASSED. A doc
    // demonstrating tag syntax escapes it exactly this way.
    expect(ids('\\<div id="fake">')).toEqual([]);
    // An escaped BACKSLASH is a literal backslash, so the tag below it is
    // real -- the escape rule has a false direction too.
    expect(ids('\\\\<div id="real">')).toEqual(['real']);
  });

  it('is matched case-sensitively, and so is a generated slug', () => {
    // A browser matches an explicit id EXACTLY. A folded fallback was added
    // here to keep `#Install` working against `<a name="Install">`, and it
    // also accepted `#Install` against a GENERATED `install`, which does not
    // navigate -- the false direction.
    expect([...headingAnchors('<a name="Install"></a>\n')]).toEqual(['Install']);
    expect([...headingAnchors('# Install\n')]).toEqual(['install']);
  });
});
