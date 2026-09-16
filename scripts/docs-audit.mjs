#!/usr/bin/env node
/**
 * Audit documentation against the current repo, its issues and its PRs.
 *
 * Why this exists
 * ---------------
 * This repo has no documentation tooling at all, and its docs make claims that
 * have quietly gone false: `docs/UI-SCREENS.md` cites four stocks issues as
 * blocking that are all closed, `docs/options_flow_data_contract.md` points at
 * `src/data/heatseekerSwingMock.ts` which no longer exists, and 23 of 29 living
 * docs carry no indication of when anyone last confirmed them.
 *
 * The sibling repo's `scripts/maintenance/docs_audit.py` is the same tool in
 * Python; the two share a CLI, a marker format and a doc-class model on
 * purpose, so a reviewer moving between repos reads one convention. Keep them
 * in step when either changes.
 *
 * What is mechanical and what is not
 * ----------------------------------
 * Everything here is deterministic: reference state, link resolution, marker
 * parsing, drift against declared code paths. Whether a document's PROSE still
 * describes the code is not mechanical and is deliberately left to the
 * reviewer — this produces their worklist, not their verdict.
 *
 * Usage
 *   node scripts/docs-audit.mjs --json
 *   node scripts/docs-audit.mjs --check
 *   node scripts/docs-audit.mjs --stamp
 *   node scripts/docs-audit.mjs --stamp --verify docs/UI-SCREENS.md
 *   node scripts/docs-audit.mjs --write-issues-snapshot issues.json
 *   node scripts/docs-audit.mjs --issues-snapshot issues.json --json
 *
 * Exit: 0 clean, 1 findings (with --check), 2 the run itself failed. A failed
 * `gh` read is exit 2, never a silent empty result (CLAUDE.md Rule 4).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'TeneikaAskew';
const THIS_REPO = 'solyra';
const SIBLING_REPO = 'stocks';
const REGISTRY = 'docs/DOC_REGISTRY.md';

/** U+00B7, the separator the existing `**Last reviewed:**` lines already use. */
export const DOT = '·';

const MARKER_RE = new RegExp(
  '^\\*\\*Last reviewed:\\*\\*\\s*(\\d{4}-\\d{2}-\\d{2}|unknown)' +
    `(?:\\s*${DOT}\\s*\\*\\*Depth:\\*\\*\\s*(verified|scanned))?` +
    `(?:\\s*${DOT}\\s*\\*\\*Against:\\*\\*\\s*\`([0-9a-f]{7,40})\`)?` +
    `(?:\\s*${DOT}\\s*\\*\\*Last scanned:\\*\\*\\s*(\\d{4}-\\d{2}-\\d{2}))?`
);

// Older human-review labels normalised onto `**Last reviewed:**`. A machine's
// `Generated <date>` footer and a dated record's `**Date:**` creation stamp are
// deliberately absent: different facts, different owners.
const LEGACY_MARKER_RE =
  /^\*\*(?:Last updated|Last Updated|Last refreshed|Last verified|Verified):?\*\*:?\s*(\d{4}-\d{2}-\d{2})(.*)$/;

const BARE_TAIL_RE = new RegExp(`^[.\\s]*(?:${DOT}\\s*\\*\\*Owner:\\*\\*[^${DOT}]*)?[.\\s]*$`);
const OWNED_FIELDS = ['Last reviewed:', 'Depth:', 'Against:', 'Last scanned:', 'Owner:'];

const H1_RE = /^#\s+\S/;
const BLOCKING_CUE_RE =
  /blocking|blocked by|open issue|still open|outstanding|in progress|not started|pending/i;
const ISSUE_URL_RE = new RegExp(
  `github\\.com/${OWNER}/(solyra|stocks)/(issues|pull)/(\\d+)`,
  'g'
);
const MD_LINK_RE = /\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)/g;
const BACKTICK_PATH_RE = /`([A-Za-z0-9_./-]+\/[A-Za-z0-9_.-]+\.[A-Za-z0-9]{1,5})`/g;
const CODE_EXTS = new Set(['.py', '.ts', '.tsx', '.js', '.mjs', '.sql', '.sh', '.yml', '.yaml', '.json', '.md']);

export class AuditError extends Error {}

/**
 * Run a command, treating only the listed non-zero exits as answers.
 *
 * `okExitCodes` replaced a boolean `allowFail`, which conflated two different
 * things and produced a fabricated measurement. `git grep` exits 1 for "ran
 * fine, no matches" and 128 for "could not resolve that revision"; swallowing
 * both as '' made a broken read look like a count of zero. CI caught it because
 * actions/checkout does a shallow single-branch clone with no `origin/main`
 * ref, so every grep exited 128 and `derive` reported 0 where the answer was
 * 37 -- which would have had the audit report a correct document as wrong.
 * That is the silent fallback Rule 4 forbids, in the tool built to find them.
 */
export function run(cmd, args, { okExitCodes = [] } = {}) {
  try {
    return execFileSync(cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    if (okExitCodes.includes(err.status)) return '';
    throw new AuditError(
      `${cmd} ${args.slice(0, 3).join(' ')}... exited ${err.status}: `
      + String(err.stderr || err.message).slice(0, 400));
  }
}

// ── registry ────────────────────────────────────────────────────────────────

const REGISTRY_HEADING = '## Registry';

/**
 * Strip markdown emphasis and code ticks without eating a trailing glob `*`.
 * Trimming the character class "`* " looks right and is not: it turns the glob
 * `docs/archive/*` into `docs/archive/`, which matches nothing and silently
 * drops every file under it into "unclassified".
 */
export function cell(raw) {
  let t = raw.trim();
  t = t.replace(/^\*\*(.*?)\*\*$/, '$1').trim();
  // Markdown requires a literal pipe inside a table cell be written `\|`.
  // A claim derivation whose regex needs alternation is the only place this
  // comes up, and dropping the escape silently truncated the pattern into a
  // `git grep` with a trailing backslash.
  return t.replace(/^`|`$/g, '').replace(/\\\|/g, '|').trim();
}

/** Split a table row on unescaped pipes only. */
export function splitRow(line) {
  return line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/);
}

/**
 * Parse the pipe table under `## Registry`. Only that section: the explanatory
 * tables above it also start their rows with a class letter, and parsing those
 * registers English sentences as path globs.
 */
export function loadRegistry(text) {
  const rows = [];
  let inRegistry = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#')) {
      inRegistry = line.startsWith(REGISTRY_HEADING);
      continue;
    }
    if (!inRegistry || !line.startsWith('|')) continue;
    const cells = splitRow(line);
    if (cells.length < 2) continue;
    const cls = cell(cells[0]).toUpperCase();
    if (!['A', 'B', 'C', 'D', 'X'].includes(cls)) continue;
    const glob = cell(cells[1]);
    if (!glob || (glob.includes(' ') && !glob.endsWith('.md'))) continue;
    const codePaths =
      cells.length > 2 && !['', '—', '-'].includes(cell(cells[2]))
        ? cells[2].split(',').map(cell).filter(Boolean)
        : [];
    // The fourth column is optional and only meaningful for Class A. It is
    // semicolon-separated so commas stay available to the code-path column.
    const regions =
      cells.length > 3 && !['', '—', '-'].includes(cell(cells[3]))
        ? cells[3].split(';').map(cell).filter(Boolean)
        : [];
    rows.push({ cls, glob, codePaths, regions });
  }
  return rows;
}

function globToRe(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/** Most specific match wins, so a file rule beats the directory rule. */
export function classify(doc, registry) {
  let best = null;
  for (const row of registry) {
    if (globToRe(row.glob).test(doc) && (best === null || row.glob.length > best.glob.length)) {
      best = row;
    }
  }
  return best
    ? { cls: best.cls, codePaths: best.codePaths, regions: best.regions }
    : { cls: null, codePaths: [], regions: [] };
}

// ── generated regions (Class A) ─────────────────────────────────────────────

const INVENTORY_RE = /<!--\s*inventory:([\w.-]+):(start|end)\s*-->/;

/**
 * Lines as `wc -l` counts them: a trailing newline does not add a line.
 *
 * `split('\n')` on a file ending in a newline yields a final '' that is not a
 * line of the document. Counting it made every reported total one higher than
 * the file, which is the kind of off-by-one that makes a measurement useless.
 */
export function docLines(text) {
  return text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
}

/**
 * Which 1-based lines a job writes, which specs matched nothing, and the prompt.
 *
 * The spec grammar is deliberately tiny, because the registry is read by people
 * before it is read by this function:
 *
 *   all           every line (a wholly rendered artefact)
 *   inventory:*   every `<!-- inventory:NAME:start/end -->` pair
 *   mark:NAME     the `<!-- BEGIN NAME -->`..`<!-- END NAME -->` pair
 *   line:REGEX    every line matching REGEX
 *   fence:NAME    the `<!-- NAME:BEGIN -->`..`<!-- NAME:END -->` pair, which is
 *                 the shape Lovable writes into AGENTS.md
 *   prose:PATH    everything not otherwise claimed is model-written, by PATH
 *
 * A spec matching nothing is returned as unmatched rather than ignored: a
 * renderer that stopped emitting its block leaves the registry claiming a
 * coverage that no longer exists, which is the same silent rot this module is
 * about, one level up.
 */
export function ownedLines(text, specs) {
  const lines = docLines(text);
  const owned = new Set();
  const unmatched = [];
  let prompt = null;

  for (const spec of specs) {
    let hit = false;
    if (spec === 'all') {
      for (let n = 1; n <= lines.length; n += 1) owned.add(n);
      hit = lines.length > 0;
    } else if (spec === 'inventory:*') {
      const openAt = new Map();
      lines.forEach((line, i) => {
        const m = INVENTORY_RE.exec(line);
        if (!m) return;
        if (m[2] === 'start') openAt.set(m[1], i + 1);
        else if (openAt.has(m[1])) {
          for (let n = openAt.get(m[1]); n <= i + 1; n += 1) owned.add(n);
          openAt.delete(m[1]);
          hit = true;
        }
      });
    } else if (spec.startsWith('mark:') || spec.startsWith('fence:')) {
      const name = spec.slice(spec.indexOf(':') + 1);
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const [begin, end] = spec.startsWith('mark:')
        ? [new RegExp(`<!--\\s*BEGIN ${esc}\\s*-->`), new RegExp(`<!--\\s*END ${esc}\\s*-->`)]
        : [new RegExp(`<!--\\s*${esc}:BEGIN\\s*-->`), new RegExp(`<!--\\s*${esc}:END\\s*-->`)];
      const lo = lines.findIndex((l) => begin.test(l)) + 1;
      const hi = lines.findIndex((l) => end.test(l)) + 1;
      if (lo && hi && hi >= lo) {
        for (let n = lo; n <= hi; n += 1) owned.add(n);
        hit = true;
      }
    } else if (spec.startsWith('line:')) {
      const pat = new RegExp(spec.slice(5));
      lines.forEach((line, i) => {
        if (pat.test(line)) { owned.add(i + 1); hit = true; }
      });
    } else if (spec.startsWith('prose:')) {
      prompt = spec.slice(6);
      hit = true;
    } else {
      unmatched.push(spec);
      continue;
    }
    if (!hit) unmatched.push(spec);
  }
  return { owned, unmatched, prompt };
}

/**
 * Contiguous runs of lines no job writes, ignoring blank-only runs — a blank
 * line between two generated blocks is not documentation, and reporting it
 * would bury the spans that matter.
 */
export function unownedSpans(text, owned) {
  const lines = docLines(text);
  const spans = [];
  let start = null;
  for (let n = 1; n <= lines.length; n += 1) {
    if (owned.has(n)) {
      if (start !== null) { spans.push([start, n - 1]); start = null; }
    } else if (start === null) start = n;
  }
  if (start !== null) spans.push([start, lines.length]);
  return spans.filter(([a, b]) => lines.slice(a - 1, b).some((l) => l.trim()));
}

/** Where a finding on this line must be fixed. */
export function regionOf(line, owned, prompt) {
  if (owned.has(line)) return 'generated';
  return prompt ? 'model-prose' : 'unowned';
}

export function checkRegions(doc, text, specs) {
  if (!specs.length) {
    return {
      findings: [{ check: 'unowned', doc, severity: 'P2',
        detail: 'Class A doc with no generated regions declared; the registry '
              + 'cannot say which lines a job writes' }],
      owned: new Set(),
      prompt: null,
    };
  }
  const { owned, unmatched, prompt } = ownedLines(text, specs);
  const findings = unmatched.map((spec) => ({
    check: 'unowned', doc, severity: 'P1',
    detail: `declared region \`${spec}\` matched nothing -- a renderer stopped `
          + 'emitting it, or the registry is stale',
  }));
  if (prompt === null) {
    let total = 0;
    for (const [lo, hi] of unownedSpans(text, owned)) {
      total += hi - lo + 1;
      findings.push({ check: 'unowned', doc, line: lo, severity: 'P2',
        detail: `lines ${lo}-${hi} (${hi - lo + 1}) are in no generated region: `
              + 'no job writes them, audit as Class D' });
    }
    if (total) {
      findings.push({ check: 'unowned', doc, severity: 'P2',
        detail: `${total} of ${docLines(text).length} lines are hand-written prose `
              + 'inside a doc labelled machine-owned' });
    }
  }
  return { findings, owned, prompt };
}

// ── markers ─────────────────────────────────────────────────────────────────

/** Can this legacy marker be rewritten without losing anything? */
export function legacyTailIsBare(rest) {
  return BARE_TAIL_RE.test(rest || '');
}

export function findMarker(lines) {
  for (let i = 0; i < Math.min(lines.length, 40); i += 1) {
    const line = lines[i].trim();
    const m = MARKER_RE.exec(line);
    if (m) {
      return { idx: i, date: m[1], depth: m[2] ?? null, sha: m[3] ?? null, scanned: m[4] ?? null, legacy: false };
    }
    const l = LEGACY_MARKER_RE.exec(line);
    if (l) {
      return { idx: i, date: l[1], depth: null, sha: null, scanned: null, legacy: true, bare: legacyTailIsBare(l[2]) };
    }
  }
  return null;
}

/**
 * Index of the first H1. Not a fixed line number on purpose: several docs open
 * with an HTML comment and carry their H1 on line 9, where a line-3 insert
 * lands inside the comment.
 */
export function h1Index(lines) {
  for (let i = 0; i < lines.length; i += 1) if (H1_RE.test(lines[i])) return i;
  return null;
}

/** Segments of an existing marker line this script does not own, e.g. a
 *  `**Status:**` field or a trailing caveat sentence. Rebuilding the line from
 *  only the known fields silently deletes them. */
export function extraSegments(line) {
  return line
    .split(DOT)
    .map((s) => s.trim())
    .filter((s) => s && !OWNED_FIELDS.some((f) => s.startsWith(`**${f}`)));
}

export function ownerOf(line) {
  const m = new RegExp(`\\*\\*Owner:\\*\\*\\s*([^${DOT}]+)`).exec(line ?? '');
  return m ? m[1].trim() : null;
}

/**
 * Two facts, kept apart on purpose. `Last reviewed` is when someone last
 * confirmed the claims and only ever moves on an actual review; `Last scanned`
 * moves every run. Collapsing them lets a weekly script overwrite a human's
 * review date with its own automated pass.
 */
export function renderMarker(date, depth, sha, scanned, owner, extras = []) {
  const parts = [`**Last reviewed:** ${date}`];
  if (depth) parts.push(`**Depth:** ${depth}`);
  if (sha) parts.push(`**Against:** \`${sha}\``);
  parts.push(`**Last scanned:** ${scanned}`);
  if (owner) parts.push(`**Owner:** ${owner}`);
  return parts.concat(extras).join(` ${DOT} `);
}

export function stamp(text, date, depth, sha, reviewed = false) {
  const lines = text.split('\n');
  const prev = findMarker(lines);

  // A content-bearing legacy line is left exactly as it is: rewriting it would
  // delete the prose it carries and read in the diff as a tidy one-liner.
  if (prev?.legacy && prev.bare === false) return { text, action: 'skipped-legacy-content' };

  const owner = ownerOf(prev ? lines[prev.idx] : null) ?? 'TBD';
  let rDate;
  let rDepth;
  let rSha;
  if (reviewed) {
    [rDate, rDepth, rSha] = [date, depth, sha];
  } else if (prev && prev.date !== 'unknown') {
    [rDate, rDepth, rSha] = [prev.date, prev.depth, prev.sha];
  } else {
    [rDate, rDepth, rSha] = ['unknown', null, null];
  }
  const extras = prev && !prev.legacy ? extraSegments(lines[prev.idx]) : [];
  const marker = renderMarker(rDate, rDepth, rSha, date, owner, extras);

  if (prev) {
    if (lines[prev.idx].trim() === marker) return { text, action: 'unchanged' };
    lines[prev.idx] = marker;
    return { text: lines.join('\n'), action: 'updated' };
  }
  const h1 = h1Index(lines);
  if (h1 === null) return { text, action: 'skipped-no-h1' };
  // Target shape: "# Title" / "" / marker / "" / body.
  if (h1 + 1 < lines.length && lines[h1 + 1].trim() === '') lines.splice(h1 + 2, 0, marker, '');
  else lines.splice(h1 + 1, 0, '', marker);
  return { text: lines.join('\n'), action: 'inserted' };
}

// ── github state ────────────────────────────────────────────────────────────

/** One paginated read per repo, never one call per reference. */
export function fetchIssueStates(repo) {
  const states = {};
  for (let page = 1; page < 40; page += 1) {
    const out = run('gh', [
      'api',
      `repos/${OWNER}/${repo}/issues?state=all&per_page=100&page=${page}`,
      '--jq',
      '.[] | [.number, .state, (.state_reason // ""), (if .pull_request then "PR" else "ISSUE" end)] | @tsv',
    ]);
    const rows = out.trim().split('\n').filter(Boolean);
    if (rows.length === 0) break;
    for (const row of rows) {
      const p = row.split('\t');
      if (p.length === 4) states[Number(p[0])] = { state: p[1], reason: p[2], kind: p[3] };
    }
  }
  if (Object.keys(states).length === 0) {
    throw new AuditError(`no issues returned for ${repo}; refusing to report a clean run on no data`);
  }
  return states;
}

// ── checks ──────────────────────────────────────────────────────────────────

export function checkClosedIssues(doc, text, states) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (!BLOCKING_CUE_RE.test(line)) return;
    for (const m of line.matchAll(ISSUE_URL_RE)) {
      const [, repo, kind, num] = m;
      if (kind !== 'issues') continue;
      const st = states[repo]?.[Number(num)];
      if (!st) {
        out.push({ check: 'closed-issue', doc, line: i + 1, severity: 'P2',
          detail: `${repo}#${num} could not be resolved` });
      } else if (st.state === 'closed') {
        const reason = st.reason || 'completed';
        out.push({ check: 'closed-issue', doc, line: i + 1,
          severity: reason === 'not_planned' ? 'P2' : 'P1',
          detail: `${repo}#${num} is CLOSED (${reason}) but cited as live work`,
          ref: `${repo}#${num}`, reason });
      }
    }
  });
  return out;
}

export function checkDeadLinks(doc, text, tracked, topLevelDirs) {
  const out = [];
  const base = path.posix.dirname(doc);
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(MD_LINK_RE)) {
      const tgt = m[1];
      if (/^(https?:|mailto:|#)/.test(tgt)) continue;
      const norm = path.posix.normalize(tgt.startsWith('/') ? tgt.slice(1) : path.posix.join(base, tgt));
      if (!tracked.has(norm) && !fs.existsSync(path.join(REPO, norm))) {
        out.push({ check: 'dead-link', doc, line: i + 1, severity: 'P2', detail: `relative link -> ${tgt}` });
      }
    }
    for (const m of line.matchAll(BACKTICK_PATH_RE)) {
      const p = m[1];
      if (!CODE_EXTS.has(path.posix.extname(p))) continue;
      if (tracked.has(p) || fs.existsSync(path.join(REPO, p))) continue;
      // Only flag paths shaped like this repo's layout, so a deliberate
      // cross-repo citation is not reported as rot.
      if (topLevelDirs.has(p.split('/')[0])) {
        out.push({ check: 'dead-link', doc, line: i + 1, severity: 'P2', detail: `backticked path -> ${p}` });
      }
    }
  });
  return out;
}

export function checkChangedSince(doc, sha, codePaths) {
  if (!sha || codePaths.length === 0) return [];
  // `git log` exits 0 with empty output when the range holds no commits, so
  // there is no non-zero code that means "no matches" here. A bad SHA exits
  // 128 and must abort: reporting "nothing changed since <sha>" for a SHA the
  // repo does not have is the same fabrication as a count of zero. The marker
  // check reports the unknown SHA separately.
  const out = run('git', ['log', '--oneline', '--diff-filter=M', `${sha}..origin/main`, '--', ...codePaths]);
  const commits = out.trim().split('\n').filter(Boolean);
  if (commits.length === 0) return [];
  return [{ check: 'changed-since', doc, severity: 'P2',
    detail: `${commits.length} content commit(s) to ${codePaths.join(', ')} since ${sha}`,
    commits: commits.slice(0, 10) }];
}

// ── prose count claims (A3 without a doc_inventory.py) ──────────────────────

const CLAIMS_HEADING = '## Claims';

/**
 * Parse the `## Claims` table: a doc's numeric assertions and how to re-derive
 * each one. stocks delegates counting to `doc_inventory.py`; this repo has no
 * counter, so the registry declares the derivation instead of a person
 * remembering to re-check.
 *
 * Columns: Doc | Pattern (capture 1 is the claimed number) | Derivation.
 */
export function loadClaims(text) {
  const rows = [];
  let inClaims = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#')) {
      inClaims = line.startsWith(CLAIMS_HEADING);
      continue;
    }
    if (!inClaims || !line.startsWith('|')) continue;
    const cells = splitRow(line).map(cell);
    if (cells.length < 3 || cells[0] === 'Doc' || cells[0].startsWith('---')) continue;
    rows.push({ doc: cells[0], pattern: cells[1], derivation: cells[2] });
  }
  return rows;
}

/**
 * Re-derive a claimed number. The grammar is a fixed set of derivations rather
 * than a shell string on purpose: a registry row is documentation, and
 * documentation that executes arbitrary commands is a different thing.
 *
 *   grep-count <paths> <regex>   total matches across the pathspec
 *   grep-files <paths> <regex>   files with at least one match
 *   list-len   <path> <regex>    comma-separated items in capture 1
 *
 * `<paths>` is comma-separated, because the pattern may contain spaces and
 * splitting on the first space alone silently folded `src tests <pattern>` into
 * a search for "tests <pattern>" under `src` -- a check that ran, returned a
 * number, and measured the wrong thing.
 */
export function derive(derivation, { exec = run } = {}) {
  const [kind, target, ...rest] = derivation.split(' ');
  const pattern = rest.join(' ');
  if (!pattern) throw new AuditError(`derivation has no pattern: ${derivation}`);
  if (kind === 'grep-count' || kind === 'grep-files') {
    const flag = kind === 'grep-count' ? '-ohE' : '-lE';
    const paths = target.split(',').filter(Boolean);
    // Exit 1 is git grep's "no matches", and a real answer. Everything else --
    // 128 for an unresolvable ref above all -- aborts the run.
    const out = exec('git', ['grep', flag, pattern, 'origin/main', '--', ...paths], { okExitCodes: [1] });
    return out.trim() ? out.trim().split('\n').length : 0;
  }
  if (kind === 'list-len') {
    const body = fs.readFileSync(path.join(REPO, target), 'utf8');
    const m = new RegExp(pattern).exec(body);
    if (!m) throw new AuditError(`list-len: ${pattern} matched nothing in ${target}`);
    return m[1].split(',').filter((s) => s.trim()).length;
  }
  throw new AuditError(`unknown derivation kind: ${kind}`);
}

export function checkClaims(claims, { exec = run } = {}) {
  const out = [];
  for (const { doc, pattern, derivation } of claims) {
    const text = fs.readFileSync(path.join(REPO, doc), 'utf8');
    const re = new RegExp(pattern, 'g');
    const actual = derive(derivation, { exec });
    let hits = 0;
    for (const m of text.matchAll(re)) {
      hits += 1;
      const claimed = Number(m[1]);
      if (claimed !== actual) {
        const line = text.slice(0, m.index).split('\n').length;
        out.push({ check: 'count-claim', doc, line, severity: 'P2',
          detail: `claims ${claimed}, \`${derivation}\` gives ${actual}` });
      }
    }
    if (!hits) {
      out.push({ check: 'count-claim', doc, severity: 'P2',
        detail: `claim pattern \`${pattern}\` matched nothing; the prose it `
              + 'watched was reworded and the check is now inert' });
    }
  }
  return out;
}

// ── Class A delivery (A1) ───────────────────────────────────────────────────

/**
 * Did this repo's machine-owned surface actually land on `main`?
 *
 * stocks asks whether the monthly refresh PR merged. The same question here is
 * whether `tests/fixtures/stocks-openapi.json` still matches stocks `main`:
 * `contract:sync` writes it, `contract:check` gates it, and `main` has been red
 * on that gate at least four times (#60, #64, CI run 220 on 2026-09-15, #68) —
 * each time meaning the vendored snapshot was claiming a freshness it did not
 * have. A doc having an owning job is not evidence the job delivered.
 */
export function checkContractSync() {
  const res = spawnSync('node', ['scripts/sync-api-contract.mjs', '--check'],
    { cwd: REPO, encoding: 'utf8' });
  const why = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim();
  if (res.error) throw new AuditError(`contract:check could not run: ${res.error.message}`);
  // A check that could not EXECUTE is not a check that FAILED. Reporting a
  // missing dependency as "the snapshot is stale" sends someone to run
  // contract:sync over a contract that was never compared (Rule 4).
  if (res.status !== 0 && /ERR_MODULE_NOT_FOUND|Cannot find (module|package)|ENOENT/.test(why)) {
    throw new AuditError(
      `contract:check could not run -- the audit cannot report on the vendored `
      + `OpenAPI snapshot. Run \`npm ci\`. (${why.split('\n').slice(0, 2).join(' ').slice(0, 200)})`);
  }
  if (res.status === 0) return [];
  return [{ check: 'class-a', doc: 'tests/fixtures/stocks-openapi.json', severity: 'P1',
    detail: `contract:check is red: the vendored OpenAPI snapshot no longer matches `
          + `stocks main, so every type and fixture derived from it is unverified. `
          + `Run \`npm run contract:sync\`. (${why.split('\n').slice(0, 3).join(' ').slice(0, 200)})` }];
}

// ── cli ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = { verify: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--json') a.json = true;
    else if (t === '--check') a.check = true;
    else if (t === '--stamp') a.stamp = true;
    else if (t === '--verify') { while (argv[i + 1] && !argv[i + 1].startsWith('--')) a.verify.push(argv[++i]); }
    else if (t === '--since') a.since = argv[++i];
    else if (t === '--issues-snapshot') a.issuesSnapshot = argv[++i];
    else if (t === '--write-issues-snapshot') a.writeIssuesSnapshot = argv[++i];
    else if (t === '--date') a.date = argv[++i];
  }
  return a;
}

export function main(argv) {
  const args = parseArgs(argv);
  const today = args.date || new Date().toISOString().slice(0, 10);
  const head = args.since || run('git', ['rev-parse', '--short', 'origin/main']).trim();

  const regPath = path.join(REPO, REGISTRY);
  if (!fs.existsSync(regPath)) {
    process.stderr.write(`error: ${REGISTRY} not found; every doc would be unclassified\n`);
    return 2;
  }
  const registry = loadRegistry(fs.readFileSync(regPath, 'utf8'));

  const tracked = new Set(run('git', ['ls-tree', '-r', 'origin/main', '--name-only']).trim().split('\n'));
  const topLevelDirs = new Set([...tracked].filter((p) => p.includes('/')).map((p) => p.split('/')[0]));
  const docs = [...tracked].filter((p) => p.endsWith('.md')).sort();

  let states;
  if (args.issuesSnapshot) states = JSON.parse(fs.readFileSync(args.issuesSnapshot, 'utf8'));
  else states = { [THIS_REPO]: fetchIssueStates(THIS_REPO), [SIBLING_REPO]: fetchIssueStates(SIBLING_REPO) };
  if (args.writeIssuesSnapshot) fs.writeFileSync(args.writeIssuesSnapshot, JSON.stringify(states, null, 1));

  const findings = [];
  // Class A delivery: is this repo's one machine-written artefact actually in
  // sync? Skipped with --issues-snapshot so the tests stay hermetic.
  if (!args.issuesSnapshot) findings.push(...checkContractSync());
  findings.push(...checkClaims(loadClaims(fs.readFileSync(regPath, 'utf8'))));
  const stamped = [];
  const verify = new Set(args.verify.map((v) => v.replace(/^\.\//, '')));
  const counts = { A: 0, B: 0, C: 0, D: 0, X: 0, unclassified: 0 };

  for (const doc of docs) {
    const { cls, codePaths, regions } = classify(doc, registry);
    if (cls === null) {
      counts.unclassified += 1;
      findings.push({ check: 'unclassified', doc, severity: 'P2',
        detail: 'no rule in docs/DOC_REGISTRY.md covers this doc' });
      continue;
    }
    counts[cls] += 1;
    // X is a deliberate exclusion, B a frozen snapshot; both silent. Keeping
    // them distinct from "unclassified" matters: unclassified means the
    // registry has a gap, which is a finding worth acting on.
    if (cls === 'B' || cls === 'X') continue;

    const text = fs.readFileSync(path.join(REPO, doc), 'utf8');

    // Class C is exempt from the content checks, not merely from rewriting. A
    // dated record citing an issue that has since closed was TRUE on its date;
    // reporting it builds a backlog whose only correct resolution is "leave it".
    if (cls === 'C') continue;

    // Class A is write-restricted per REGION, not per file. Map the regions
    // first: the complement is prose no job writes, and that prose is Class D
    // in everything but the label -- audited, corrected and stamped here.
    // Findings inside a generated region are reported with where the fix
    // belongs, and never edited in place.
    let owned = new Set();
    let prompt = null;
    let stampable = cls === 'D';
    if (cls === 'A') {
      const r = checkRegions(doc, text, regions);
      findings.push(...r.findings);
      ({ owned, prompt } = r);
      stampable = prompt === null && unownedSpans(text, owned).length > 0;
    }

    const content = [
      ...checkClosedIssues(doc, text, states),
      ...checkDeadLinks(doc, text, tracked, topLevelDirs),
    ];
    if (cls === 'A') for (const f of content) f.region = regionOf(f.line ?? 0, owned, prompt);
    findings.push(...content);

    if (!stampable) continue;

    const prev = findMarker(text.split('\n'));
    if (!prev) {
      findings.push({ check: 'marker', doc, severity: 'P2', detail: 'no review marker' });
    } else {
      if (prev.legacy) {
        findings.push({ check: 'marker', doc, severity: 'P3',
          detail: `legacy label, date ${prev.date}; normalise to Last reviewed` });
      }
      if (prev.date !== 'unknown' && prev.date > today) {
        findings.push({ check: 'marker', doc, severity: 'P1', detail: `review date ${prev.date} is in the future` });
      }
      if (prev.sha) {
        // `git merge-base --is-ancestor` reports through its EXIT STATUS and
        // prints nothing, so testing its stdout for '' treats every SHA --
        // ancestor or not -- as suspect. Read the status.
        const anc = spawnSync('git', ['merge-base', '--is-ancestor', prev.sha, 'origin/main'],
          { cwd: REPO, encoding: 'utf8' });
        if (anc.status !== 0) {
          findings.push({ check: 'marker', doc, severity: 'P2',
            detail: `reviewed-against ${prev.sha} is not an ancestor of origin/main` });
        }
      }
      findings.push(...checkChangedSince(doc, prev.sha, codePaths));
    }

    if (args.stamp) {
      // Never write a marker into a generated region. The marker goes after
      // the H1, so the question is whether anything a job owns sits that high.
      const h1 = h1Index(text.split('\n'));
      if (owned.size && h1 !== null && Math.min(...owned) <= h1 + 2) {
        findings.push({ check: 'unowned', doc, severity: 'P2',
          detail: `not stamped: a generated region starts at line ${Math.min(...owned)}, `
                + `too close to the H1 on line ${h1 + 1}` });
        continue;
      }
      const reviewed = verify.has(doc);
      const res = stamp(text, today, reviewed ? 'verified' : 'scanned', head, reviewed);
      if (res.action === 'inserted' || res.action === 'updated') {
        fs.writeFileSync(path.join(REPO, doc), res.text);
      }
      stamped.push({ doc, action: res.action, depth: reviewed ? 'verified' : 'scan-only' });
    }
  }

  const summary = {};
  for (const f of findings) summary[f.check] = (summary[f.check] ?? 0) + 1;
  const report = { date: today, head, docs: docs.length, classes: counts, findings, stamped, summary };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`docs ${docs.length}  classes ${JSON.stringify(counts)}  head ${head}\n`);
    for (const [k, v] of Object.entries(summary).sort()) process.stdout.write(`  ${k}: ${v}\n`);
    for (const f of findings) {
      process.stdout.write(`  [${f.severity}] ${f.check}: ${f.doc}${f.line ? `:${f.line}` : ''} — ${f.detail}\n`);
    }
    if (stamped.length) {
      const acted = stamped.filter((s) => s.action !== 'unchanged').length;
      process.stdout.write(`  stamped: ${acted} changed, ${stamped.length - acted} unchanged\n`);
    }
  }

  return args.check && findings.length ? 1 : 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    if (err instanceof AuditError) {
      process.stderr.write(`error: ${err.message}\n`);
      process.exit(2);
    }
    throw err;
  }
}
