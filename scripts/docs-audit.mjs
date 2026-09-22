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

// Up to three leading spaces is still a rendered ATX heading. Without them a
// document written that way had no H1 as far as this module was concerned, so
// --stamp returned `skipped-no-h1` and the missing-marker finding it reports
// could never be repaired by the command that reports it.
const H1_RE = /^ {0,3}#\s+\S/;
// Whole cues, not substrings. An unbounded `blocking|blocked by|...` matched
// inside `nonblocking` and `not blocked by`, so prose stating an issue is NOT
// a blocker produced a P1 against it once it closed -- a finding whose own
// source line says the opposite. `\b` alone stops `nonblocking`; the negator
// scan below stops the spaced and hyphenated forms.
// `\s+` between the words, not a literal space. Emphasis is stripped by
// blanking its delimiters in place -- offsets have to survive -- so
// `still **open**` arrives as `still   open` and a single-space cue no
// longer matched it: a closed issue that the prose plainly calls live
// vanished from the audit entirely.
const BLOCKING_CUE_RE =
  /\b(?:blocking|blocked\s+by|open\s+issues?|still\s+open|outstanding|in\s+progress|not\s+started|pending)\b/gi;
// Text immediately before a cue that inverts it. `not started` is itself a
// cue, so what precedes it is what is tested -- the leading `not` is never
// read as negating the phrase it belongs to.
// An intervening modifier or article is admitted: `is not currently blocking`
// and `is no longer an open issue` both invert the cue, and requiring the
// negator to sit flush against it read them as live work and emitted a P1
// saying the opposite of the sentence. The window is bounded to two such words
// so a negation cannot reach across a clause it does not govern.
const CUE_NEGATOR_RE =
  /\b(?:not|non|never|no longer|without|un)[\s-]*(?:\w+[\s-]+){0,2}$/i;

/**
 * Does this line cite live work? True when at least ONE cue occurrence is not
 * negated: a line may say one issue still blocks and another no longer does.
 */
export function hasBlockingCue(line) {
  BLOCKING_CUE_RE.lastIndex = 0;
  for (const m of line.matchAll(BLOCKING_CUE_RE)) {
    if (!CUE_NEGATOR_RE.test(line.slice(0, m.index))) return true;
  }
  return false;
}

// Case-insensitive, because GitHub resolves `teneikaaskew/Solyra` to the same
// repository and a document may cite it that way. The `i` flag ALONE would be
// worse than the bug: the captured name would index `states['Solyra']`, miss,
// and fabricate a "could not be resolved" P2 against a live issue. The
// capture is lower-cased at the call site (see normaliseRepo).
const ISSUE_URL_RE = new RegExp(
  `github\\.com/${OWNER}/(solyra|stocks)/(issues|pull)/(\\d+)`,
  'gi'
);

/** The state map is keyed by the canonical repository names, in lower case. */
export function normaliseRepo(repo) {
  return repo.toLowerCase();
}

// What bounds a clause: sentence punctuation, a semicolon, or a table-cell
// edge. Not a comma. Ported from the Python twin (stocks#1121).
const CLAUSE_SPLIT_RE = /[.;|]/g;
// Not `\S+`: a table may omit padding (`| .../issues/1| still open ...|`), and
// swallowing the `|` merged adjacent cells -- so an issue described as no
// longer blocking inherited a live-work cue from the next cell. Trailing
// sentence punctuation is excluded for the same reason it is on the Python
// twin: it ends the sentence, not the URL.
const URL_RE = /https?:\/\/[^\s|]*[^\s|.,;:!?)\]]/g;

/**
 * The prose around ONE citation. URLs are masked at equal length first, so a
 * `.` or `/` inside `github.com` does not split the clause the citation sits
 * in, and offsets stay valid.
 */
export function citationClause(line, start, end) {
  const masked = line.replace(URL_RE, (u) => '\u0000'.repeat(u.length));
  let lo = 0;
  for (const m of masked.matchAll(CLAUSE_SPLIT_RE)) {
    if (m.index < start) lo = m.index + 1; else break;
  }
  let hi = line.length;
  for (const m of masked.matchAll(CLAUSE_SPLIT_RE)) {
    if (m.index >= end) { hi = m.index; break; }
  }
  return line.slice(lo, hi);
}

/**
 * Is THIS citation cited as live work?
 *
 * A line-level answer put every URL on the line under one verdict, so
 * `#1 is no longer blocking; #2 is still open` gave #1 a P1 from #2's cue.
 * The clause decides when it carries a cue at all; otherwise the line does,
 * because a table row puts the cue and the citations in different cells --
 * `| Open issues | #838 · #839 |` is a real finding whose citations sit in a
 * clause with no cue of its own.
 */
export function citesLiveWork(line, start, end, { context = null } = {}) {
  const clause = citationClause(line, start, end);
  BLOCKING_CUE_RE.lastIndex = 0;
  if (BLOCKING_CUE_RE.test(clause)) return hasBlockingCue(clause);
  // No cue in the citation's own clause. Two things can still supply one, and
  // ordinary prose is neither.
  //
  // `context` is a label heading a list -- `Blocked by:` above a list of
  // links, the ordinary Markdown form, which the caller carries down.
  if (context !== null) return hasBlockingCue(context);
  // A TABLE ROW puts the cue in one cell and the citations in another:
  // `| Open issues | #838 · #839 |`. Applied to ordinary PROSE the same
  // fallback recreated the cross-clause false positive this function exists to
  // prevent -- `Background: #1. Still blocked by #2.` gave #1 a finding from
  // #2's cue. A pipe is what tells the two apart.
  return line.includes('|') ? hasBlockingCue(line) : false;
}
// The fragment is CAPTURED, not discarded. Dropping it meant a link to a real
// file but a heading that does not exist always passed. The Python twin had
// the same gap, where 35 such links were measured (stocks#1121).
// The optional TITLE is admitted and discarded. `[guide](missing.md "Guide")`
// is standard CommonMark; requiring `)` straight after the destination meant
// the pattern did not match at all, so a missing target reported clean rather
// than dead.
// One level of BALANCED parentheses is admitted in the destination. `[g](docs/foo(bar).md)`
// is a valid link; stopping at the first `)` validated `docs/foo(bar` and
// reported a tracked file dead. One level is what CommonMark's own examples
// need and what a regex can express honestly -- deeper nesting is rare enough
// that failing to match (and so not reporting) beats reporting a wrong path.
// `<...>` FIRST, as a destination form of its own. It is how CommonMark writes
// a destination containing a space, and the bare branch both rejects the
// whitespace (so `[g](<docs/user guide.md>)` did not match at all and a missing
// target reported clean) and split `[tests](<README.md#tests>)` into the path
// `<README.md` and the fragment `tests>` -- reporting a tracked README dead.
/**
 * Is the character at `i` escaped by an odd number of backslashes?
 *
 * `\[x](missing.md)` renders as literal text, so a document demonstrating
 * link syntax that way was reported as a gating dead link for a destination
 * no reader can follow. Parity counts, because `\\[x](y.md)` IS a link
 * preceded by a literal backslash.
 */
export function isEscaped(text, i) {
  let n = 0;
  for (let k = i - 1; k >= 0 && text[k] === '\\'; k -= 1) n += 1;
  return n % 2 === 1;
}

const MD_LINK_RE =
  /\[[^\]]*\]\(\s*(?:<([^<>#]*)(?:#([^>\s]+))?>|((?:[^()#\s]|\([^()\s]*\))*)(?:#([^)\s]+))?)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
// Two shapes: a path with a slash, and a bare root-level filename. Requiring a
// slash meant `vite.config.ts`, `playwright.config.ts` and `package.json` --
// which the living docs cite constantly -- could never produce a dead-path
// finding. The bare shape must admit a dotted stem: `vite.config.ts` and
// `playwright.config.ts` are the two most-cited root files here (12 and 15
// mentions) and a stem of `[A-Za-z0-9_-]+` matched neither. A bare name is
// only checked against the root files this repo tracks (see checkDeadLinks),
// because the docs also name `mocks.ts`, `main.py`, `deploy.sh` and a hundred
// other bare files that live under a directory or in the sibling repo.
// The extension admits ten characters. Six covered `.drawio` and stopped one
// short of `.properties`; the bound is not what does the filtering, so there
// is no reason for it to be tight. `linkContext` derives `exts` from the
// tree, and an extension this tree does not track is skipped there -- that is
// what keeps a wide bound from inventing findings. Raised on the Python twin
// (stocks#1121), where a five-character cap made `.drawio` uncitable outright.
// A citation may carry a source location after the path: `src/App.tsx:44-72`,
// `vite.config.ts:7,45,93`, `SwingMode.tsx:156`. Requiring the closing
// backtick right after the extension made every such citation invisible.
const LINE_SUFFIX = '(?::\\d+(?:-\\d+)?(?:,\\d+(?:-\\d+)?)*)?';
// `\p{L}\p{N}_` rather than `A-Za-z0-9_`, with the `u` flag: a tracked path may
// hold a non-ASCII character, and the ASCII-only class never recognised a
// citation of one -- so deleting or renaming that file produced no dead-link
// finding, while the git inventory preserves such filenames and the
// percent-encoded Markdown link IS checked. The extension stays ASCII,
// because a suffix is. Parity with the Python twin (stocks#1121).
const PW = '[\\p{L}\\p{N}_]';
const BACKTICK_PATH_RE = new RegExp(`\`((?:${PW}|[./-])+/(?:${PW}|[.-])+\\.[A-Za-z0-9]{1,10})${LINE_SUFFIX}\``, 'gu');
const BACKTICK_ROOT_FILE_RE = new RegExp(`\`((?:${PW}|-)+(?:\\.(?:${PW}|-)+)*\\.[A-Za-z0-9]{1,10})${LINE_SUFFIX}\``, 'gu');
// A line that names the sibling repo is citing its tree, not this one:
// CLAUDE.md says `scripts/export_openapi.py` is a stocks file on the line
// that cites it, and the design briefs wrap stocks paths in a
// github.com/TeneikaAskew/stocks link. `scripts` and `docs` are also
// top-level directories here, so without the marker those read as rot.
// Cross-repo ownership needs EVIDENCE, not the bare product noun. A citation
// on `\`src/removed.ts\` formats stocks for the dashboard` is about stocks the
// asset class, and handing it to the sibling repo skipped the existence check
// so the deletion went unreported. What counts: an explicit repository URL, a
// path under `stocks/`, or the repo named against a repository noun --
// `stocks repo`, `stocks PR`, `stocks main`. Measured over this tree: the
// tightening changes no finding, so it suppresses nothing real.
const CROSS_REPO_NOUN = '(?:repo|repository|PR|pull request|issue|main|branch|tree|side|CI)';
const CROSS_REPO_RE = new RegExp(
  `github\\.com/${OWNER}/${SIBLING_REPO}\\b`
  + `|\\b${SIBLING_REPO}\\s+${CROSS_REPO_NOUN}\\b`
  + `|\\b${SIBLING_REPO}/`, 'i');
const CROSS_REPO_LINK_RE = new RegExp(`^\\]\\(https?://github\\.com/${OWNER}/${SIBLING_REPO}[/)]`, 'i');
const LINK_TAIL_RE = /^\]\([^)\s]*\)/;

export class AuditError extends Error {}

/**
 * Does this commit contain this path?
 *
 * `git show <sha>:<doc>` cannot answer it: the command exits 128 for a path
 * the commit lacks and yields an empty string, which is the same value an
 * empty file gives.
 */
export function pathInCommit(sha, doc, { spawn = spawnSync } = {}) {
  return spawn('git', ['cat-file', '-e', `${sha}:${doc}`],
    { cwd: REPO, encoding: 'utf8' }).status === 0;
}

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

// ── the base ref ────────────────────────────────────────────────────────────

// HEAD first, deliberately. The documents, their contents and every count
// claim are read from the WORKING TREE, so ending the drift range at
// `origin/main` excluded the branch's own commits: the audit reported no
// drift for exactly the changes under review, and any document the branch
// added was never enumerated at all. The Python twin leads with HEAD for the
// same reason (stocks#1121, 686fdea).
export const BASE_REF_CANDIDATES = ['HEAD', 'origin/main', 'main'];
// Where "what USED to be here" is read from. resolveBaseRef prefers HEAD, so
// baseTracked was the same tree as `tracked` and carried no history at all:
// once a root file or the last file under a top-level directory was deleted in
// an earlier branch commit, knownRootFiles and topLevelDirs forgot it had ever
// belonged to this repo and citations of the deleted path became silently
// uncheckable -- at the exact moment they went dead.
export const HISTORY_REF_CANDIDATES = ['origin/main', 'main', 'HEAD'];

/**
 * The ref this run audits against: the first candidate git can resolve.
 *
 * Hard-coding `origin/main` aborts every documented invocation in a detached
 * or shallow checkout — including the actions/checkout case this module's own
 * `run()` describes. `--since` did not work around it, because the ls-tree,
 * ancestry and drift reads each named the ref separately.
 *
 * Falling back is not a silent fallback: the ref used is reported in the run's
 * output, so a run against `HEAD` cannot be mistaken for one against the
 * trunk. Inventing an answer when nothing resolves would be, so that throws.
 */
export function resolveBaseRef(candidates = BASE_REF_CANDIDATES, { spawn = spawnSync } = {}) {
  for (const ref of candidates) {
    const r = spawn('git', ['rev-parse', '--verify', '--quiet', ref], { cwd: REPO, encoding: 'utf8' });
    if (r.status !== 0) continue;
    // A commit that resolves is not a tree that can be read: in a partial or
    // stale clone `main` verifies while its tree is missing, and accepting
    // it here made the later ls-tree abort the audit instead of falling
    // through to the next candidate.
    const t = spawn('git', ['cat-file', '-e', `${ref}^{tree}`], { cwd: REPO, encoding: 'utf8' });
    if (t.status === 0) return ref;
  }
  throw new AuditError(
    `none of ${candidates.join(', ')} resolves in this checkout; there is nothing to audit against`,
  );
}

// ── the tree being audited ──────────────────────────────────────────────────

/**
 * Every tracked file in the working tree: the index, minus anything deleted
 * on disk but not yet staged. This is the tree the documents are read from
 * (`fs.readFileSync`), so it is the tree they are enumerated from and checked
 * against. `git ls-tree <baseRef>` was neither: it missed every document added
 * on the branch -- docs/DOC_REGISTRY.md itself, on the branch that introduced
 * it -- and kept a branch-deleted one for readFileSync to abort on.
 */
export function workingTreeFiles({ exec = run } = {}) {
  const cached = exec('git', ['ls-files', '--cached']).trim().split('\n').filter(Boolean);
  const deleted = new Set(exec('git', ['ls-files', '--deleted']).trim().split('\n').filter(Boolean));
  return new Set(cached.filter((p) => !deleted.has(p)));
}

/**
 * The commit a review is recorded against, abbreviated. `--since deadbeef`
 * used to be written into the marker verbatim as `Against: deadbeef` next to
 * `Depth: verified`, for a revision nobody had audited; the ancestry check
 * reads only the PREVIOUS marker, so the same run reported the document as
 * newly verified. A branch name would have been written verbatim too, and
 * the marker parser reads only a hex SHA.
 */
// Long enough to be unambiguous, and comfortably inside MARKER_RE's 7-40
// whatever core.abbrev says locally.
export const MARKER_SHA_LEN = 12;

/**
 * The SHA a marker will carry, in a form the marker parser reads back.
 *
 * Bare `--short` honours `core.abbrev`, which can be set below 7:
 * `git -c core.abbrev=4 rev-parse --short HEAD` emits four characters while
 * MARKER_RE requires 7-40. A marker written with a shorter id does not fail to
 * parse -- `Against` is an OPTIONAL group, so the line still matches, the
 * group captures nothing, and the `Last scanned` field after it is swallowed
 * by the unmatched tail. The verified review then reads as having no
 * reviewed-against SHA and its drift check silently stops running.
 *
 * So the round trip is the check: the rendered marker must give the value
 * back. Asserting the line merely matches would pass a four-character id.
 */
export function resolveCommit(ref, { spawn = spawnSync, ancestorOf = null } = {}) {
  const r = spawn('git', ['rev-parse', '--verify', '--quiet', `--short=${MARKER_SHA_LEN}`,
    `${ref}^{commit}`], { cwd: REPO, encoding: 'utf8' });
  const sha = (r.stdout ?? '').trim();
  if (r.status !== 0 || !sha) {
    throw new AuditError(`--since ${ref} does not resolve to a commit in this checkout`);
  }
  // Positional group 3 is `Against`, matching findMarker; this regex uses
  // numbered groups, so there is no `.groups` to read.
  const parsed = MARKER_RE.exec(`**Last reviewed:** unknown · **Against:** \`${sha}\``);
  if (!parsed || parsed[3] !== sha) {
    throw new AuditError(`the resolved SHA '${sha}' is not a form the marker parser reads back `
      + '(expects 7-40 hex characters); refusing to write it');
  }
  // And it has to be IN the history the audit judges against. A `--since` on
  // an unrelated branch, or a descendant the base ref does not contain, was
  // accepted and written into `Against:` -- and the very next ordinary run
  // reported that marker invalid via the ancestry check. The tool was
  // manufacturing provenance it rejects itself.
  if (ancestorOf) {
    const anc = spawn('git', ['merge-base', '--is-ancestor', sha, ancestorOf],
      { cwd: REPO, encoding: 'utf8' });
    if (anc.status !== 0) {
      throw new AuditError(`--since ${ref} (${sha}) is not an ancestor of ${ancestorOf}, `
        + 'so a marker written against it would be reported invalid by the next '
        + 'ordinary audit; refusing to write it');
    }
  }
  return sha;
}

// ── registry ────────────────────────────────────────────────────────────────

const REGISTRY_HEADING = '## Registry';

/** A heading line that IS this heading, ignoring trailing `#`s and spacing. */
export function headingIs(line, heading) {
  return line.replace(/\s+#*\s*$/, '').trim().toLowerCase() === heading.toLowerCase();
}

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
  // A FENCED example of a registry row is documentation, not a rule. Without
  // this the example registered as live -- producing missing-path findings for
  // paths it never meant to declare -- and a heading-shaped line inside the
  // same example could switch `inRegistry` off and skip every real row after
  // the fence.
  const allLines = text.split('\n');
  // And a row COMMENTED OUT rather than deleted, which is how a rule or a
  // claim is retired without losing it: it still registered as live, and a
  // heading-shaped line in the same comment could switch the section flag
  // off and skip every real row below it.
  // And an INDENTED example, which `trim()` on the next line turns straight
  // back into an executable declaration: `    | D | fake.md | | |` produced a
  // gating missing-path finding, and an indented heading in the same example
  // could end the section and skip every real row below it.
  const fenced = new Set([...fencedLines(allLines), ...commentedLines(allLines),
    ...indentedCodeLines(allLines)]);
  for (const [i, raw] of allLines.entries()) {
    if (fenced.has(i)) continue;
    const line = raw.trim();
    // A SETEXT heading ends the section too. Neither `Examples` nor its
    // `--------` underline starts with `#`, so section mode stayed on and an
    // illustrative table below it was executed as live configuration. The
    // heading is the line ABOVE the underline, so the section ends there.
    if (isSetextUnderline(allLines, i, fenced)) {
      inRegistry = false;
      continue;
    }
    if (line.startsWith('#')) {
      // EXACTLY, not by prefix: a later `## Registry examples` section
      // re-entered registry mode and parsed its illustrative table as live
      // classification rules -- visible explanatory prose becoming executable
      // configuration.
      inRegistry = headingIs(line, REGISTRY_HEADING);
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
  // `*` and `?` stay INSIDE one path segment, which is what a path glob means
  // everywhere else. As `.*` a row like `.claude/agents/*.md` also swallowed
  // `.claude/agents/nested/example.md`, so a newly nested document was
  // silently classified by that row instead of becoming unclassified and
  // forcing an explicit registry decision -- the audit going quiet about a
  // document nobody has placed. `**` keeps the recursive meaning.
  // `**/` is ZERO or more complete segments, not "at least one". Compiling it
  // as `.*` left the following slash mandatory, so `docs/**/*.md` matched
  // `docs/sub/g.md` and NOT `docs/guide.md` -- immediate children reported
  // unclassified, or the row itself reported as matching nothing. A regression
  // from the single-star fix one round earlier, caught by Codex on the same PR.
  // A BRACKET EXPRESSION compiles, rather than being escaped into a literal.
  // Every other reader -- globSpecificity, documentSet, knownRootFiles --
  // treats `[` as a wildcard token, so escaping it here made a row like
  // `docs/[ab].md` match nothing at all: a P1 inert-rule finding, and the
  // documents it meant to cover left unclassified. Held out of the escape
  // pass by a sentinel, then translated (`[!a]` is glob's negation).
  // `\u0002`, not `\u0001`: that one is already the `**` sentinel below, and
  // reusing it turned a bracket expression into `.*`.
  const held = [];
  const withBrackets = glob.replace(/\[!?\]?[^\]]*\]/g, (b) => {
    const neg = b[1] === '!';
    held.push(`[${neg ? '^' : ''}${b.slice(neg ? 2 : 1, -1)}]`);
    return '\u0002';
  });
  const escaped = withBrackets
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '(?:[^/]+/)*')
    .replace(/\u0001/g, '.*')
    .replace(/\u0002/g, () => held.shift());
  return new RegExp(`^${escaped}$`);
}

/**
 * Every file this audit treats as a document: Markdown, plus any file the
 * registry names outright. A bare `.md` filter drops registered non-Markdown
 * artefacts before classification, so their declared regions are never checked.
 * Glob rows are deliberately not expanded — a directory rule is not a licence
 * to run the content checks over everything beneath it.
 */
/**
 * Every explicit registry declaration must name something that exists.
 *
 * Two silent failures of the same shape -- a declaration resolving to nothing,
 * read as "nothing to report" rather than "this declaration is wrong":
 *
 * - An exactly-named document that has been DELETED is absent from `tracked`,
 *   so `documentSet` never yields it, the main loop never classifies it, and
 *   the report is clean because a maintained document disappeared while
 *   DOC_REGISTRY.md still claims it exists.
 * - A declared code path that does not exist makes the drift check vacuous:
 *   `git log -- does/not/exist` exits 0 with empty output, so the document
 *   citing it can never be queued for re-review whatever its real surface
 *   does. `tailwind.config.ts` on the Design System row was exactly this.
 *
 * Ported from the Python twin's check_registry_paths (stocks#1121).
 */
export function checkRegistryPaths(tracked, registry) {
  const dirs = new Set();
  for (const p of tracked) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join('/'));
  }
  const out = [];
  for (const row of registry) {
    if (!/[*?[]/.test(row.glob)) {
      if (!tracked.has(row.glob)) {
        out.push({ check: 'registry', doc: row.glob, severity: 'P1',
          detail: 'registry names this document exactly, but it is not in the audited '
                + 'tree -- it was deleted, moved, or never existed' });
      }
    // A wildcard row covering nothing is the same failure one step out: every
    // document it named has been deleted, or the glob is mistyped. Nothing
    // reaches classify(), so the declaration goes inert and the audit reports
    // no registry finding while a whole rule quietly stops applying.
    } else if (![...tracked].some((p) => globToRe(row.glob).test(p))) {
      out.push({ check: 'registry', doc: row.glob, severity: 'P1',
        detail: 'registry declaration matches no tracked document, so the rule it '
              + 'carries covers nothing' });
    }
    // A `prose:PATH` region names the prompt that owns the complement. An
    // empty or deleted path marked the region matched anyway, so the document
    // was labelled model-owned, stamping was disabled, and nothing reported
    // the vanished prompt.
    for (const spec of row.regions ?? []) {
      if (!spec.startsWith('prose:')) continue;
      const prompt = spec.slice(6).trim();
      if (!prompt || (!tracked.has(prompt) && !isTrackedDir(tracked, prompt))) {
        out.push({ check: 'registry', doc: row.glob, severity: 'P2',
          detail: `region \`${spec}\` names a prompt that is not in the audited tree, `
                + 'so the complement is marked model-owned by a declaration that '
                + 'points at nothing' });
      }
    }
    for (const cp of row.codePaths ?? []) {
      if (!tracked.has(cp) && !dirs.has(cp)) {
        out.push({ check: 'registry', doc: row.glob, severity: 'P2',
          detail: `declared code path \`${cp}\` does not exist, so the drift check `
                + 'for this document can never fire' });
      }
    }
  }
  return out;
}

// Every suffix this repository treats as Markdown. `.md` alone left a tracked
// `docs/runbook.markdown`, `guide.mdown` or `README.MD` out of the set
// COMPLETELY -- no unclassified finding, no marker, link or blocker check --
// although documentSet claims to enumerate the Markdown documents. Matched
// case-insensitively, because a suffix's case is not its meaning.
export const MARKDOWN_EXTS = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdwn'];

export function isMarkdownPath(p) {
  const lower = p.toLowerCase();
  return MARKDOWN_EXTS.some((e) => lower.endsWith(e));
}

export function documentSet(tracked, registry) {
  const named = new Set(registry.filter((r) => !/[*?[]/.test(r.glob)).map((r) => r.glob));
  return [...tracked].filter((p) => isMarkdownPath(p) || named.has(p)).sort();
}

/**
 * Root files a bare backticked name may legitimately refer to even when no
 * tracked sibling shares its stem: the ones the registry registers outright,
 * and the ones the base ref had that the tree no longer has. The stem anchor
 * alone cannot see a deletion -- once package.json is gone, so is the stem
 * that would have anchored the finding -- so the base ref is the persistent
 * record of what used to be here.
 */
export function knownRootFiles(registry, baseTracked, tracked) {
  const known = new Set(
    registry.map((r) => r.glob).filter((g) => !g.includes('/') && !/[*?[]/.test(g)),
  );
  for (const p of baseTracked) if (!p.includes('/') && !tracked.has(p)) known.add(p);
  return known;
}

const stem = (name) => name.split('.').slice(0, -1).join('.');

/**
 * Everything checkDeadLinks needs to know about the tree, derived once.
 *
 * `exts` is the set of extensions the tree actually tracks, not an allowlist:
 * a fixed list omitted `.css` while the registry declared `src/index.css` as
 * design-system surface, and `.drawio` and `.html` with it. Whatever this tree
 * or the base ref tracks is, by definition, an extension a path here can have -- and
 * an extension it does not track (`.py`; this repo has no Python) is one no
 * path here can have, which is the first cross-repo rule.
 */
export function linkContext(tracked, baseTracked, registry) {
  return {
    tracked,
    // Tree and base ref both: deleting the last file under a directory must
    // not make every citation of that directory uncheckable at the moment
    // it goes dead.
    topLevelDirs: new Set([...tracked, ...baseTracked].filter((p) => p.includes('/')).map((p) => p.split('/')[0])),
    rootFiles: new Set([...tracked].filter((p) => !p.includes('/')).map(stem).filter(Boolean)),
    basenames: new Set([...tracked].map((p) => path.posix.basename(p))),
    knownRoot: knownRootFiles(registry, baseTracked, tracked),
    // The base ref counts too: a deleted file's extension is still one a path
    // here can have, or the deletion itself becomes uncheckable.
    exts: new Set([...tracked, ...baseTracked].map((p) => path.posix.extname(p)).filter(Boolean)),
  };
}

/** Most specific match wins, so a file rule beats the directory rule. */
/** Do two equally specific rows say the same thing, in full? */
export function sameRule(a, b) {
  return a.cls === b.cls
    && a.codePaths.join('\u0000') === b.codePaths.join('\u0000')
    && a.regions.join('\u0000') === b.regions.join('\u0000');
}

/**
 * How specific a registry glob is, most significant first.
 *
 * Raw character length is not specificity: `docs/*a*.md` is longer than
 * `docs/a.md`, so an exclusion row could outrank the exact living-document row
 * it overlaps and silently suppress every content, marker and drift check for
 * it -- without setting `ambiguous`, because the lengths differ. An exact row
 * wins outright; among wildcards, the one matching more literal characters
 * (and, failing that, using fewer wildcards) is the more specific.
 */
export function globSpecificity(glob) {
  const wildcards = (glob.match(/[*?[]/g) ?? []).length;
  // A `**/` segment is RANKED DOWN, not counted as literal. For an immediate
  // child like `docs/a.md` both `docs/*.md` and `docs/**/*.md` match, and
  // the literal-length metric put the recursive one ahead because its extra
  // slash counts as a literal character -- so a broad recursive row could
  // outrank the narrower single-segment row it overlaps, and when the two
  // disagree the recursive one silently won instead of the narrower rule or
  // an ambiguity finding. Literals are counted with the `**` segments removed.
  const recursive = (glob.match(/\*\*/g) ?? []).length;
  const literals = glob.replace(/\*\*\//g, '').replace(/[*?[\]]/g, '').length;
  // `?` matches EXACTLY one character, so it constrains the name where `*`
  // does not: `docs/??.md` is strictly narrower than `docs/*.md`, yet counting
  // wildcard TOKENS ranked the broader rule first because it has fewer of
  // them. When the two rows disagree -- an `X` on `docs/*.md` beside a living
  // `docs/??.md` -- the broad rule silently won and suppressed the checks.
  // Fixed-width wildcards are counted with the literals they stand in for;
  // only open-ended ones count as breadth.
  const fixed = (glob.match(/[?[]/g) ?? []).length;
  const stars = wildcards - fixed;
  return [wildcards === 0 ? 1 : 0, -recursive, literals + fixed, -stars, -wildcards];
}

function cmpSpecificity(a, b) {
  const x = globSpecificity(a);
  const y = globSpecificity(b);
  for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

export function classify(doc, registry) {
  let best = null;
  let tied = false;
  for (const row of registry) {
    if (!globToRe(row.glob).test(doc)) continue;
    if (best === null || cmpSpecificity(row.glob, best.glob) > 0) {
      best = row;
      tied = false;
    } else if (cmpSpecificity(row.glob, best.glob) === 0 && !sameRule(row, best)) {
      // Equally specific and disagreeing. First-wins meant a stale `X` or `B`
      // row could silently override a later `D` row and suppress every content
      // and provenance check for that document, while checkRegistryPaths
      // happily accepted both declarations.
      tied = true;
    }
  }
  return best
    ? { cls: best.cls, codePaths: best.codePaths, regions: best.regions, ambiguous: tied }
    : { cls: null, codePaths: [], regions: [], ambiguous: false };
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
  // '' is zero lines, not one empty one. `split('\n')` returns [''] for it, so
  // a Class A artifact truncated to nothing reported ONE generated line and
  // its `all` region counted as matched -- suppressing the P1 this audit
  // promises for a renderer that emitted nothing.
  if (text === '') return [];
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
 *   exhaustive    this file is wholly machine-owned: ANY line outside the
 *                 declared regions is a defect, not expected prose
 *
 * A spec matching nothing is returned as unmatched rather than ignored: a
 * renderer that stopped emitting its block leaves the registry claiming a
 * coverage that no longer exists, which is the same silent rot this module is
 * about, one level up.
 */
export function ownedLines(text, specs) {
  const lines = docLines(text);
  // The region DELIMITERS are HTML comments, and a document explaining the
  // convention shows a pair inside a code block. Reading that example as a
  // real region put the ownership map on prose: the span reported generated,
  // a marker landing in it called unstampable, and drift measured against a
  // code sample. Only the delimiter scan skips fences -- content BETWEEN two
  // real delimiters is owned whether or not it is fenced, which it usually is,
  // and `line:` matches generated lines that are frequently inside a fence.
  // Raised on the Python twin (stocks#1121).
  const fencedHere = fencedLines(lines);
  const owned = new Set();
  const unmatched = [];
  const orphans = [];
  let prompt = null;
  let exhaustive = false;

  for (const spec of specs) {
    let hit = false;
    if (spec === 'all') {
      for (let n = 1; n <= lines.length; n += 1) owned.add(n);
      hit = lines.length > 0;
    } else if (spec === 'inventory:*') {
      const openAt = new Map();
      lines.forEach((line, i) => {
        if (fencedHere.has(i)) return;
        const m = INVENTORY_RE.exec(line);
        if (!m) return;
        if (m[2] === 'start') {
          if (openAt.has(m[1])) {
            orphans.push(`inventory:${m[1]} opened twice (lines ${openAt.get(m[1])} and ${i + 1})`);
          }
          openAt.set(m[1], i + 1);
        } else if (openAt.has(m[1])) {
          for (let n = openAt.get(m[1]); n <= i + 1; n += 1) owned.add(n);
          openAt.delete(m[1]);
          hit = true;
        } else {
          orphans.push(`inventory:${m[1]} ends at line ${i + 1} with no start`);
        }
      });
      for (const [name, n] of [...openAt.entries()].sort((a, b) => a[1] - b[1])) {
        orphans.push(`inventory:${name} starts at line ${n} with no end`);
      }
    } else if (spec.startsWith('mark:') || spec.startsWith('fence:')) {
      const name = spec.slice(spec.indexOf(':') + 1);
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const [begin, end] = spec.startsWith('mark:')
        ? [new RegExp(`<!--\\s*BEGIN ${esc}\\s*-->`), new RegExp(`<!--\\s*END ${esc}\\s*-->`)]
        : [new RegExp(`<!--\\s*${esc}:BEGIN\\s*-->`), new RegExp(`<!--\\s*${esc}:END\\s*-->`)];
      // EVERY complete pair, not just the first. Two `mark:NAME` blocks in a
      // mixed Class A document left the second silently classified as
      // hand-written prose, so findings inside machine-written content were
      // routed to the wrong owner.
      // Delimiter BALANCE, not first-opener-to-next-closer. A block that
      // repeats its opener before a single closer paired the first with that
      // closer, set `hit`, and never noticed the second -- so an `exhaustive`
      // Class A file could report no findings at all and classify the whole
      // malformed span as generated.
      let open = -1;
      let nested = false;
      // A CLOSER with no opener was ignored outright, so a stray one before an
      // otherwise valid pair produced no finding at all -- the later pair set
      // `hit` and the unbalanced layout passed with a supposedly valid region
      // map. `inventory:*` has always reported this shape.
      let stray = false;
      // A delimiter inside INLINE code is an example of the syntax, not a
      // delimiter. Masking only block fences let a Class A document that
      // explains its own generated-region convention turn its backticked
      // samples into real delimiters: a balanced pair silently classified the
      // hand-written prose between them as generated, and a lone one produced
      // a false P1 orphan-region finding.
      const bare = (l) => {
        const spans = codeSpans(l);
        return spans.length
          ? spans.reduce((acc, [lo, hi]) =>
            acc.slice(0, lo) + ' '.repeat(hi - lo) + acc.slice(hi), l)
          : l;
      };
      lines.forEach((raw, n) => {
        if (fencedHere.has(n)) return;
        const l = bare(raw);
        if (begin.test(l)) {
          if (open >= 0) nested = true;
          else open = n;
        } else if (end.test(l)) {
          if (open < 0) {
            stray = true;
          } else {
            for (let k = open + 1; k <= n + 1; k += 1) owned.add(k);
            hit = true;
            open = -1;
          }
        }
      });
      if (nested || open >= 0 || stray) {
        const why = nested ? 'a repeated opener before its closer'
          : open >= 0 ? 'an opener with no closer'
            : 'a closer with no opener';
        orphans.push(`${spec}: ${why}`);
        hit = true;
      }
    } else if (spec.startsWith('line:')) {
      // A registry typo is bad INPUT, not a documentation finding. new RegExp
      // throws a plain SyntaxError, which the handler rethrows, and Node exits
      // 1 -- the status this CLI documents for findings.
      let pat;
      try {
        pat = new RegExp(spec.slice(5));
      } catch (err) {
        throw new AuditError(`registry region \`${spec}\` is not a valid regular `
          + `expression: ${err.message}`);
      }
      // SPANS as well as the whole-line exclusions below. A pattern
      // surviving only inside inline code or a partial comment still matched
      // the raw line, so the missing-region finding stayed suppressed after
      // the real content went away and the sample's line was routed and
      // stamped as generated. Blanked rather than removed, since `pat` may be
      // anchored. Parity with the Python twin (stocks#1121).
      const spans = commentSpans(lines);
      lines.forEach((line, i) => {
        const visibleLine = maskSpans(line,
          [...(spans.get(i) ?? []), ...codeSpans(line)]);
        if (pat.test(visibleLine)) { owned.add(i + 1); hit = true; }
      });
    } else if (spec === 'exhaustive') {
      exhaustive = true;
      hit = true;
    } else if (spec.startsWith('prose:') && prompt !== null && spec.slice(6) !== prompt) {
      // A second, DIFFERENT prose owner. The later assignment replaced the
      // first silently, so the region map reported itself valid, the
      // complement was suppressed, and every prose finding was routed to one
      // prompt while the registry claimed two. Parity with the Python twin,
      // where Codex filed this as stocks#1121.
      unmatched.push(spec);
      continue;
    } else if (spec.startsWith('prose:')) {
      prompt = spec.slice(6);
      hit = true;
    } else {
      unmatched.push(spec);
      continue;
    }
    if (!hit) unmatched.push(spec);
  }
  return { owned, unmatched, prompt, orphans, exhaustive };
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

/**
 * May a Class A document be stamped?
 *
 * A valid region map is a PRECONDITION, not an implication of
 * `prompt === null`. With no declarations, with every declaration unmatched,
 * or on an `exhaustive` file whose complement is nonblank, `owned` is empty
 * or incomplete and the unresolved content reads as hand-written prose -- so
 * `--stamp` would insert a marker into an artifact `checkRegions` has just
 * identified as wholly machine-owned or impossible to map, where the next
 * regeneration discards it and nobody can say what was lost.
 *
 * The Python twin carries the same `map_valid` term (stocks#1121).
 */
export function classAIsStampable(region, text) {
  const mapValid = region.regionMap !== null
    && !region.findings.some((f) => f.severity === 'P1' && f.check === 'unowned');
  return mapValid && region.prompt === null && unownedSpans(text, region.owned).length > 0;
}

export function checkRegions(doc, text, specs) {
  if (!specs.length) {
    return {
      findings: [{ check: 'unowned', doc, severity: 'P2',
        detail: 'Class A doc with no generated regions declared; the registry '
              + 'cannot say which lines a job writes' }],
      owned: new Set(),
      prompt: null,
      regionMap: null,
    };
  }
  const { owned, unmatched, prompt, orphans, exhaustive } = ownedLines(text, specs);
  const findings = unmatched.map((spec) => ({
    check: 'unowned', doc, severity: 'P1',
    detail: `declared region \`${spec}\` matched nothing -- a renderer stopped `
          + 'emitting it, or the registry is stale',
  }));
  for (const o of orphans) {
    findings.push({ check: 'unowned', doc, severity: 'P1', detail: `unbalanced generated region: ${o}` });
  }
  // The unowned complement is NOT a finding. It is the expected shape of a
  // mixed Class A document, and emitting one per span gave those documents
  // permanent findings that no amount of reviewing could clear — so --check
  // could never go green and the gate was worthless. The spans drive routing
  // and stamping; they are reported as a map, not as defects. What IS a
  // finding is a declared region that no longer exists.
  // `prose:` says a model owns the complement; `exhaustive` says there is no
  // legitimate complement at all. Declaring both emptied `spans` before the
  // exhaustive check ran, so a wholly machine-owned file reported zero unowned
  // lines instead of the promised P1 -- content a regeneration will discard,
  // passing clean. The registry has to say which it means.
  if (prompt && exhaustive) {
    findings.push({ check: 'unowned', doc, severity: 'P1',
      detail: 'the registry declares both `prose:` and `exhaustive` for this file: '
            + 'one says a model owns the complement, the other that there is none' });
  }
  const spans = prompt && !exhaustive ? [] : unownedSpans(text, owned);
  // A doc the registry declares `exhaustive` has no legitimate complement: it
  // is wholly machine-owned, so anything outside the regions is content a
  // regeneration will destroy with nobody able to say what it was. AGENTS.md
  // is the case — a paragraph added below the Lovable fence vanishes on the
  // next sync. That is the opposite of a mixed doc, where the complement is
  // the hand-written half and reporting it would make --check permanently red.
  if (exhaustive) {
    for (const [lo, hi] of spans) {
      findings.push({ check: 'unowned', doc, line: lo, severity: 'P1',
        detail: `lines ${lo}-${hi} sit outside every declared region of a wholly `
              + 'machine-owned file; the next regeneration will discard them' });
    }
  }
  const regionMap = {
    lines: docLines(text).length,
    generated: owned.size,
    prompt,
    unowned_spans: spans.map(([lo, hi]) => [lo, hi]),
    unowned_lines: spans.reduce((n, [lo, hi]) => n + hi - lo + 1, 0),
  };
  return { findings, owned, prompt, regionMap };
}

// ── markers ─────────────────────────────────────────────────────────────────

/** Can this legacy marker be rewritten without losing anything? */
export function legacyTailIsBare(rest) {
  return BARE_TAIL_RE.test(rest || '');
}

// `-` needs two or more: a single `-` under text is a list bullet's sibling
// far more often than a heading, and CommonMark's own `---` case is covered.
const SETEXT_UNDERLINE_RE = /^ {0,3}(?:=+|-{2,})\s*$/;

/**
 * Does line `i` underline a Setext heading written on line `i - 1`?
 *
 * Three things are NOT one: a thematic break (`---` after a blank line, with
 * no heading text above it), a table's delimiter row (`|---|---|`, which the
 * pattern rejects outright), and a real underline. The line above separates
 * them. Ported from the Python twin (stocks#1121).
 */
export function isSetextUnderline(lines, i, masked = new Set()) {
  if (i <= 0 || masked.has(i) || masked.has(i - 1)) return false;
  if (!SETEXT_UNDERLINE_RE.test(lines[i] ?? '')) return false;
  const above = lines[i - 1] ?? '';
  return Boolean(above.trim()) && !/^ {0,3}#/.test(above);
}

/**
 * Where a DOCUMENT-level marker may live: after the H1, before the next heading.
 *
 * A flat first-40-lines scan had two failure modes. It let a later section's
 * metadata stand in for the document's provenance, and — because `stamp`
 * inserts after the H1 wherever that is — it could not find its own marker in a
 * file with more than 40 lines of front matter, so the next run reported the
 * marker missing and inserted a duplicate.
 */
export function markerWindow(lines, limit = 40, { stopAtParagraph = true } = {}) {
  // The whole H1, not its title line. A Setext H1 is TWO lines, so scanning
  // from `h1Index + 1` started on the document's own `=====` underline,
  // isSetextUnderline recognised it, and `stop = j - 1` closed the window
  // BEFORE it opened -- `{from: 1, to: 0}`. A correctly placed marker was
  // then reported missing and every --stamp inserted another one. The Python
  // twin already starts from the anchor (stocks#1121); this is the parity fix.
  const h1 = markerAnchor(lines);
  // EMPTY, not the first `limit` lines. The registry places the marker in the
  // first paragraph after the first H1, so a document with no H1 has nowhere
  // the marker may live. Falling back to a flat scan let a marker-shaped line
  // floating in a headingless document satisfy findMarker, which suppressed
  // the missing-marker finding while nothing reported the missing H1 either --
  // the document passed --check carrying provenance in a place the registry
  // does not recognise. The missing H1 is reported on its own; `stamp` refuses
  // rather than writing into a shape it cannot place.
  if (h1 === null) return { from: 0, to: 0 };
  const fencedHere = fencedLines(lines);
  const commentedHere = commentedLines(lines);
  // Indented code too. An indented line followed by `---` is a code block and
  // a thematic break, not a Setext heading -- omitted, isSetextUnderline read
  // it as one, closed the window above a real marker below it, and --stamp
  // inserted a second contradictory marker. Parity with the Python twin
  // (stocks#1121).
  const masked = new Set([...fencedHere, ...commentedHere,
    ...indentedCodeLines(lines)]);
  let stop = lines.length;
  // To the next HEADING, with no additional line cap. A document opening with
  // more than 40 lines of HTML metadata before its marker had the real marker
  // excluded from the window, so the audit reported it missing and --stamp
  // inserted a second one: contradictory provenance. The section boundary is
  // the thing being asked about; the line count was a proxy for it.
  for (let j = h1 + 1; j < lines.length; j += 1) {
    // The same optional indentation H1_RE admits. Without it, a later
    // section written `  ## Thing` did not end the document-level window, so a
    // marker inside that section satisfied findMarker -- suppressing the
    // missing top-level provenance finding and making --stamp update the
    // section's marker instead of inserting the document's.
    // A heading inside a FENCE is an example, not the next section. Treating
    // it as one ended the search early, so an existing marker below the fence
    // was reported missing and --stamp inserted a second one above it.
    // And a heading hidden in an HTML COMMENT, which renders as nothing:
    // treating it as the next section excluded the real marker below it, so
    // the audit reported the marker missing and --stamp added a second one.
    if (fencedHere.has(j) || commentedHere.has(j)) continue;
    if (/^ {0,3}#/.test(lines[j])) { stop = j; break; }
    // Setext is a section heading too, and its underline marks the heading on
    // the line ABOVE -- so the section starts there, not at the underline.
    // Reading only `#` let a `Last reviewed` inside that section stand in for
    // the whole document's provenance. Ported from the Python twin.
    if (isSetextUnderline(lines, j, masked)) {
      stop = j - 1;
      break;
    }
    // docs/DOC_REGISTRY.md puts the marker at "the first paragraph after the
    // first H1". The window ran to the next HEADING instead, so a document
    // with an introduction paragraph and a marker somewhere below it passed,
    // and --stamp merely refreshed the misplaced marker rather than restoring
    // the required placement. Blank lines, fenced blocks, commented metadata
    // and badge lines are skipped above or here; the first other rendered
    // paragraph ends it.
    if (!lines[j].trim()) continue;
    if (MARKER_RE.test(lines[j].trim()) || LEGACY_MARKER_RE.test(lines[j].trim())) continue;
    if (isCodeIndented(lines[j])) continue;
    // Duplicate detection asks a different question and needs the wider span:
    // see markerSection.
    if (!stopAtParagraph) continue;
    stop = j + 1;
    break;
  }
  return { from: h1 + 1, to: Math.min(stop, lines.length) };
}

/**
 * What a marker still owes, when it parses but claims nothing.
 *
 * A marker reading `Last reviewed: unknown`, or carrying no `Against`, passes
 * every other check while supporting no drift check at all -- `findMarker`
 * returns something, so the missing-marker branch stays quiet, and the absent
 * SHA makes `checkChangedSince` a no-op. `--stamp` writes exactly that form
 * for a scan-only pass, so once the unrelated findings are fixed `--check`
 * could report clean over documents that explicitly say nobody has read them.
 *
 * P3, because --check gates on P1/P2: these belong on the standing worklist
 * and must not hold a build red forever. Same severity and reasoning as the
 * Python twin (stocks#1121).
 */
/**
 * Every date a marker carries has to name a real day, and be in the past.
 *
 * MARKER_RE checks the SHAPE only, so `2026-02-30` parses. With a verified
 * depth and a valid ancestor SHA nothing else looked at it, and the future
 * test is LEXICOGRAPHIC -- an impossible date that sorts before today passes
 * that too. `Last scanned` was never date-checked at all. So a marker could
 * record provenance that cannot be true and the audit reported clean.
 *
 * P2 for an impossible day: it is not an absent review, it is a recorded one
 * that cannot be true, which is worse than `unknown` -- that at least says so.
 * P1 for a future date, matching the twin, and applied to BOTH fields: a scan
 * date is the one field a machine writes, so a future value there means the
 * clock or the file is wrong.
 */
export function checkMarkerDates(doc, prev, today, line = null) {
  const out = [];
  // A marker may parse cleanly and still carry a DUPLICATE malformed owned
  // field after the valid prefix -- `... · **Last scanned:** bad`. MARKER_RE
  // is not end-anchored, so the dates and provenance read fine and every other
  // check passed. Only stamp() noticed, by returning skipped-malformed-marker,
  // and an ordinary --check never calls stamp(), so the contradiction sailed
  // through the gate it should have held.
  const bad = line === null ? [] : extraSegments(line).filter(
    (seg) => OWNED_FIELDS.some((f) => seg.startsWith(`**${f}`)));
  for (const seg of bad) {
    out.push({ check: 'marker', doc, severity: 'P2',
      detail: `the marker repeats an owned field in a form it cannot parse: ${seg}` });
  }
  // And a field repeated in a form it CAN parse, with a conflicting value --
  // two well-formed `Last scanned` segments carrying different dates.
  // extraSegments strips every valid segment, so the filter above saw nothing,
  // the parser took the first value, and `--stamp` collapsed the duplicate
  // silently instead of requiring somebody to say which date is true.
  if (line !== null) {
    const seen = new Map();
    for (const raw of line.split(DOT)) {
      const s = raw.trim();
      const field = OWNED_FIELDS.find((f) => s.startsWith(`**${f}`));
      if (field) seen.set(field, (seen.get(field) ?? 0) + 1);
    }
    for (const [field, n] of seen) {
      if (n > 1) {
        out.push({ check: 'marker', doc, severity: 'P2',
          detail: `the marker carries ${n} \`${field}\` fields; they can disagree and `
                + 'only the first is read' });
      }
    }
  }
  for (const [field, label] of [['date', 'review date'], ['scanned', 'last-scanned date']]) {
    const value = prev[field];
    if (value === undefined || value === null || value === '' || value === 'unknown') continue;
    if (!isCalendarDate(value)) {
      out.push({ check: 'marker', doc, severity: 'P2',
        detail: `${label} ${value} is not a real calendar day` });
    } else if (value > today) {
      out.push({ check: 'marker', doc, severity: 'P1',
        detail: `${label} ${value} is in the future` });
    }
  }
  return out;
}

export function checkProvenance(doc, prev) {
  const missing = [];
  if (prev.date === 'unknown') missing.push('never reviewed');
  if (!prev.sha) missing.push('no reviewed-against SHA, so drift cannot be checked');
  // The registry defines `verified` as the only depth meaning a human reread
  // the claims; `scanned` is what --stamp writes mechanically. A marker with
  // a real date and SHA but scan-only depth dropped off the worklist and could
  // yield a clean audit after nothing but a machine pass.
  if (prev.date !== 'unknown' && prev.depth !== 'verified') {
    missing.push(`depth is ${prev.depth ?? 'unset'}, not verified, so no human has `
      + 'confirmed the claims');
  }
  // `Last scanned` is the field the registry's marker format requires and the
  // weekly pass writes. A current-format marker omitting it parses with
  // `scanned: null`, so checkMarkerDates has nothing to range-check and every
  // provenance check stayed quiet: a document could pass --check carrying no
  // record of ever having been scanned.
  if (!prev.legacy && !prev.scanned) {
    missing.push('no Last scanned date, so nothing records when the mechanical '
      + 'checks last ran');
  }
  // `Owner` is in the registry's required marker format, and it is the field
  // that says who answers for the claims. A marker carrying valid review,
  // depth, SHA and scan fields but no owner parsed cleanly and neither
  // checkMarkerDates nor this function said a word, so an ordinary --check
  // accepted provenance the registry does not consider complete. A legacy
  // marker predates the field and is reported as legacy instead.
  if (!prev.legacy && !prev.owner) {
    missing.push('no Owner, so nothing records who answers for the claims');
  }
  if (!missing.length) return [];
  return [{ check: 'marker', doc, severity: 'P3',
    detail: `incomplete provenance: ${missing.join('; ')}` }];
}

/** Lines inside a fenced code block, which are examples rather than content. */
/**
 * Lines inside a four-space-indented code block.
 *
 * CommonMark's indented code, which `fencedLines` does not see: an example
 * written that way was inspected as live prose, so `[x](missing.md)` or a
 * blocking citation in it could fail --check.
 *
 * Deliberately narrow. Indented code cannot interrupt a paragraph, and inside
 * a list item the indentation is the list's, not a code block's -- so a run
 * starts only after a blank line whose own preceding content is neither a list
 * item nor a table row. Anything less careful masks list continuations and
 * turns real findings invisible, which is the worse direction.
 */
/**
 * A blockquote's container prefix: `>` with up to three spaces of lead and one
 * optional space after, repeatable for nesting.
 *
 * `fencedLines` already strips this, for the same reason. Markdown removes the
 * prefix and interprets what remains, so `>     [x](missing.md)` is a
 * four-space indented code example inside a quote.
 */
const BLOCKQUOTE_PREFIX_RE = /^(?: {0,3}> ?)+/;

export function indentedCodeLines(lines) {
  const out = new Set();
  let blankSeen = true;
  let floor = 4;
  let listIndent = 0;
  let inCode = false;
  let lastWasHeading = false;
  for (const [i, raw] of lines.entries()) {
    // Every measurement below reads the CONTENT, not the raw line. Counting
    // indentation on the raw line returned zero for a quoted example, so the
    // link and closed-issue scanners inspected it as live prose and could emit
    // a gating finding from a document's own teaching material. Measuring only
    // the indent and leaving the blank/heading/list tracking on the raw line
    // would be worse than either: `>` alone is a blank line inside the quote,
    // and the two views would disagree about where a block starts.
    const line = raw.replace(BLOCKQUOTE_PREFIX_RE, '');
    if (!line.trim()) { blankSeen = true; continue; }
    const indent = line.startsWith('\t') ? 4 : line.length - line.replace(/^ +/, '').length;
    if (inCode && indent >= floor) { out.add(i); continue; }
    inCode = false;
    if (indent >= floor && (blankSeen || lastWasHeading)) {
      // Only a PARAGRAPH cannot be interrupted by indented code. After a
      // heading no blank line is needed, so `## Example` followed directly by
      // a four-space sample left the sample unmasked and the link and blocker
      // checks could emit gating findings from it.
      inCode = true;
      out.add(i);
    } else {
      const bullet = /^(\s*(?:[-*+]|\d+[.)])\s+)/.exec(line);
      if (bullet) {
        listIndent = bullet[1].length;
        floor = listIndent + 4;
      } else if (listIndent > 0 && indent >= listIndent) {
        // A CONTINUATION of the item, which carries no new bullet. Resetting
        // the floor to four here meant the next four-space line after a blank
        // read as a code block, although a `- ` item needs six to open one --
        // so rendered continuation content was skipped by the dead-link and
        // closed-issue checks. Parity with the Python twin (stocks#1121).
      } else {
        listIndent = 0;
        floor = 4;
      }
    }
    lastWasHeading = /^ {0,3}#{1,6}\s/.test(line) || /^ {0,3}(?:=+|-+)\s*$/.test(line);
    blankSeen = false;
  }
  return out;
}

/**
 * Lines inside a raw-text HTML block, whose bracket syntax renders literally.
 *
 * CommonMark's HTML block type 1: `<pre>`, `<script>`, `<style>` or
 * `<textarea>` opens it and the line carrying the matching close tag ends it.
 * Everything between is raw text, so `[x](missing.md)` inside a `<pre>` is an
 * EXAMPLE exactly as it would be inside a fence -- but only fenced and
 * indented code was masked, so such a sample emitted a gating dead-link.
 *
 * The block runs to the closing tag's own line inclusive, and an unclosed
 * block runs to the end of the document, both as the spec says. A fence wins
 * where the two overlap, because inside a fence the tag is itself an example.
 */
// ANCHORED, after at most three spaces of container indentation. CommonMark
// starts an HTML block only on a line that BEGINS with the opener; unanchored,
// any prose mentioning `<pre>` -- including ``Use `<pre>` for examples`` -- was
// read as a block opener, and with no closing tag on that line the mask ran to
// the end of the document and every real dead link and closed blocker below it
// was silently skipped. That is the direction that hides findings, so it is
// worse than the bug the mask was added to fix.
const RAW_TEXT_OPEN_RE = /^ {0,3}<(pre|script|style|textarea)(?:[\s>/]|$)/i;

// CommonMark HTML block type 6: a known block-level tag, opened or closed,
// running to the next BLANK line rather than to a matching close tag. `<div>`
// followed by `[x](missing.md)` and `</div>` with no blank line between them
// renders the bracket syntax literally exactly as `<pre>` does, but only
// type 1 was masked, so the sample emitted a gating dead-link finding.
const HTML_BLOCK_TAGS = new Set(('address article aside base basefont blockquote body caption '
  + 'center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer '
  + 'form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main '
  + 'menu menuitem nav noframes ol optgroup option p param search section summary table '
  + 'tbody td tfoot th thead title tr track ul').split(' '));

const HTML_BLOCK_OPEN_RE = /^ {0,3}<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:[\s/>]|$)/;

export function rawHtmlBlockLines(lines, { rawTextOnly = false } = {}) {
  const out = new Set();
  const fenced = fencedLines(lines);
  // An INDENTED example of an opener is an example, not a block.
  const indented = indentedCodeLines(lines);
  // Comment state is tracked in THIS pass rather than read from
  // `commentedLines`. It cannot be read from there: `commentSpans` already
  // masks raw blocks, so calling it here is mutual recursion -- which is
  // exactly what happened, and the stack overflow is the only reason it was
  // not a silent wrong answer. An HTML comment is itself a raw-text block, so
  // tracking it beside the others costs nothing.
  let inComment = false;
  let open = null;
  lines.forEach((line, i) => {
    if (fenced.has(i)) return;
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      return;
    }
    if (open === null) {
      if (indented.has(i)) return;
      // A comment OPENING on this line hides anything after it, including a
      // `<pre>` on a later line of the same comment.
      const c = line.indexOf('<!--');
      if (c !== -1 && !line.slice(c).includes('-->')) {
        inComment = true;
        // The text before the opener is still live, so an opener there still
        // starts a block.
        if (!RAW_TEXT_OPEN_RE.test(line.slice(0, c))) return;
      }
      const m = RAW_TEXT_OPEN_RE.exec(line);
      if (!m) {
        // Type 6. Sentinel rather than a tag name, because the block does not
        // close on one -- a blank line ends it whatever tags are inside.
        if (rawTextOnly) return;
        const b = HTML_BLOCK_OPEN_RE.exec(line);
        if (b && HTML_BLOCK_TAGS.has(b[1].toLowerCase())) {
          open = '\u0000';
          out.add(i);
        }
        return;
      }
      open = m[1].toLowerCase();
      out.add(i);
      // A one-line block: `<pre>...</pre>` closes on the line it opened.
      if (new RegExp(`</${open}\\s*>`, 'i').test(line.slice(m.index + m[0].length))) open = null;
      return;
    }
    out.add(i);
    if (open === '\u0000') {
      // A type-6 block ends at the next BLANK line, not at a close tag.
      if (!line.trim()) { out.delete(i); open = null; }
      return;
    }
    if (new RegExp(`</${open}\\s*>`, 'i').test(line)) open = null;
  });
  return out;
}

/**
 * Indices wholly inside an HTML comment, computed WITHOUT the fence scan.
 *
 * `fencedLines` needs this and `commentedLines` cannot supply it: that one
 * reaches `commentSpans`, which masks raw HTML blocks, which reaches back
 * here. An HTML comment is delimited by text rather than by block structure,
 * so a standalone scan answers the one question the fence scan asks -- is
 * this delimiter commented out? Parity with the Python twin (stocks#1121).
 */
function commentHiddenLines(lines) {
  const out = new Set();
  let inside = false;
  for (const [i, line] of lines.entries()) {
    if (inside) {
      out.add(i);
      if (line.includes('-->')) inside = false;
      continue;
    }
    const at = line.indexOf('<!--');
    if (at !== -1 && !line.slice(at).includes('-->')) {
      out.add(i);
      inside = true;
    }
  }
  return out;
}

export function fencedLines(lines) {
  const fenced = new Set();
  // The OPENING delimiter is remembered. Toggling on any fence-looking line
  // meant a `~~~` inside a ``` example closed the block, so the rest of the
  // example was read as prose and the prose after the real closing fence was
  // read as code -- false findings and suppressed ones from one line.
  // CommonMark: a fence closes only on the same character, at least as long,
  // and with no info string.
  let open = null;
  // The enclosing list item's content column, so a fence indented to it is a
  // fence rather than indented code. Reset by a non-blank line at column 0.
  let listIndent = 0;
  // A delimiter inside an HTML COMMENT is commented-out HTML, not a fence. An
  // unmatched ``` inside `<!-- ... -->` opened one, and every visible line
  // after the comment was then classified as code.
  const commentHidden = commentHiddenLines(lines);
  lines.forEach((line, i) => {
    if (!open && commentHidden.has(i)) return;
    if (!open && line.trim()) {
      // Any list item sets the column, not just one that also carries a
      // fence -- the fence is normally on a LATER line of the item, which is
      // the whole case this exists for.
      const item = /^([ \t]*)((?:[-*+]|\d+[.)])\s+)/.exec(line);
      if (item) listIndent = item[1].length + item[2].length;
      else if (!/^[ \t]/.test(line)) listIndent = 0;
    }
    // A container prefix -- a blockquote `>`, or list indentation -- precedes
    // the fence rather than replacing it. `> ```md` is the shape this repo's
    // own docs use, and seeing the `>` marked none of the block as code, so
    // links and blocker citations in the sample were audited as live prose.
    // A LIST MARKER is a container prefix too: `- \`\`\`md` opens a fence
    // inside the item. Admitting only indentation and blockquotes left the
    // opener unrecognised and then misread the indented CLOSING fence as a new
    // opener, so links inside the example were audited as live content and the
    // prose after the block could be masked instead.
    // Indentation is measured RELATIVE to the enclosing container, which is
    // what CommonMark's "up to three spaces" means. Two indentation
    // components side by side allowed six spaces with no container at all --
    // and `    \`\`\`` is a one-line indented code block, not a fence.
    // Opening on it masked every real link and blocker below until another
    // fence appeared, the direction that hides findings. A flat three-space
    // cap is wrong in the other direction: a fence inside a list item sits at
    // the item's content column, which is commonly deeper, so `listIndent`
    // carries that column the way indentedCodeLines does.
    const m = /^([ \t]*)((?:> ?)*)((?:[-*+]|\d+[.)])\s+)?[ \t]*(`{3,}|~{3,})(.*)$/
      .exec(line);
    if (m) {
      // Relative to the container: a blockquote prefix or a list marker on
      // THIS line is itself the container, so its own lead is the baseline.
      const base = m[2] || m[3] ? m[1].length : listIndent;
      if (m[1].length - base > 3) return;
    }
    if (!open) {
      // An opening ``` fence may not carry a backtick in its info string.
      if (m && !(m[4][0] === '`' && m[5].includes('`'))) {
        open = m[4];
        fenced.add(i);
      }
      return;
    }
    fenced.add(i);
    if (m && m[4][0] === open[0] && m[4].length >= open.length && m[5].trim() === '') {
      open = null;
    }
  });
  return fenced;
}

/**
 * Offset ranges of every inline code span on one line.
 *
 * A run of N backticks opens a span that only a run of exactly N closes, so
 * `` ``a ` b`` `` is one span rather than two.
 */
export function codeSpans(line) {
  const re = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;
  const out = [];
  for (const m of line.matchAll(re)) out.push([m.index, m.index + m[0].length]);
  return out;
}

/**
 * Code-span ranges per line index, for spans that CROSS line breaks.
 *
 * `codeSpans` is per physical line and so cannot see a span whose opening and
 * closing backticks are on different lines -- a sample written that way was
 * scanned as live prose and could emit a gating closed-issue finding. The
 * whole document is scanned once here and the ranges split back per line, so
 * the callers keep their per-line offsets.
 */
export function codeSpanLines(lines) {
  const text = lines.join('\n');
  const starts = [];
  let at = 0;
  for (const line of lines) { starts.push(at); at += line.length + 1; }
  const out = new Map();
  for (const [lo, hi] of codeSpans(text)) {
    for (let i = 0; i < lines.length; i += 1) {
      const from = starts[i];
      const to = from + lines[i].length;
      if (hi <= from || lo >= to) continue;
      if (!out.has(i)) out.set(i, []);
      out.get(i).push([Math.max(lo - from, 0), Math.min(hi - from, lines[i].length)]);
    }
  }
  return out;
}

/**
 * Offset ranges inside an HTML comment, per line index.
 *
 * SPANS, not whole lines: commenting a citation out is how a blocker list is
 * retired without losing it, and it is usually done to part of a line -- a
 * table row with a trailing `<!-- superseded: ... -->`. A whole-line rule
 * cannot see that, and on the Python twin a whole-line rule also cost a real
 * finding on a line whose balanced inline comment was an EXAMPLE in backticks.
 *
 * A `<!--` inside a code span is not a comment, so code spans are masked
 * first -- which is what makes that same line parse right. Ported from
 * stocks#1121.
 */
export function commentSpans(lines) {
  // ONE ordered scan, because a fence and a comment compete for the same text
  // and whichever opens first wins until it closes. Masking every fenced line
  // wholesale looked equivalent and was not: docs/UI-SCREENS.md opens with a
  // multi-line comment whose closing `-->` sits on an indented continuation
  // line, so masking destroyed the closer, the comment ran to EOF, and FIVE
  // real closed-issue findings vanished. The findings diff is what caught it.
  //
  // So: a code line cannot OPEN a comment -- `<!--` shown inside a code block
  // is a sample -- but it can close one, because inside a comment nothing is
  // code. An unmatched `<!--` in a fence therefore comments nothing, and a
  // comment that encloses a fence still covers it.
  const code = new Set([...fencedLines(lines), ...indentedCodeLines(lines), ...rawHtmlBlockLines(lines)]);
  const out = new Map();
  const add = (i, a, b) => {
    if (a >= b) return;
    if (!out.has(i)) out.set(i, []);
    out.get(i).push([a, b]);
  };
  let openAt = null;
  lines.forEach((line, i) => {
    let pos = 0;
    for (;;) {
      if (openAt === null) {
        if (code.has(i)) return;
        const spans = codeSpans(line);
        let a = line.indexOf('<!--', pos);
        while (a >= 0 && spans.some(([lo, hi]) => lo <= a && a < hi)) {
          a = line.indexOf('<!--', a + 1);
        }
        if (a < 0) return;
        openAt = [i, a];
        pos = a + 4;
      } else {
        const from = openAt[0] === i ? openAt[1] : 0;
        const b = line.indexOf('-->', openAt[0] === i ? pos : 0);
        if (b < 0) { add(i, from, line.length); return; }
        add(i, from, b + 3);
        openAt = null;
        pos = b + 3;
      }
    }
  });
  return out;
}

/**
 * Line indices ENTIRELY inside an HTML comment, which renders as nothing.
 *
 * Whole-line, because that is the question a marker or an H1 asks. A line with
 * a comment in the MIDDLE still renders, and the link and closed-issue checks
 * use `commentSpans` so they can skip the commented part and read the rest.
 * Ported from the Python twin (stocks#1121).
 */
export function commentedLines(lines) {
  const spans = commentSpans(lines);
  const out = new Set();
  lines.forEach((line, i) => {
    const stop = line.replace(/\s+$/, '').length;
    for (const [a, b] of spans.get(i) ?? []) {
      if (a === 0 && b >= stop) { out.add(i); break; }
    }
  });
  return out;
}

/**
 * Every marker in the document-level window, not just the first.
 *
 * `findMarker` stops at the first match, which is right for READING a
 * document's provenance and wrong for judging it: a second marker below
 * carries a different date, owner or reviewed-against SHA and nothing said so.
 * `--stamp` updated the first, reported success, and left the contradiction.
 */
/**
 * Is this line indented ENOUGH to be a code example rather than a paragraph?
 *
 * Any leading whitespace used to disqualify a marker, but one to three spaces
 * still render as an ordinary paragraph -- CommonMark needs a tab or four
 * spaces for indented code. Such a document was reported as missing
 * provenance and `--stamp` inserted a SECOND marker while the visible
 * original stayed put.
 */
export function isCodeIndented(line) {
  return line ? /^(?:\t| {4,})/.test(line) : false;
}

/**
 * The whole opening SECTION: after the H1, to the next heading.
 *
 * `markerWindow` stops at the first rendered paragraph because that is where
 * the registry requires the canonical marker to sit, and stopping there is
 * what makes a misplaced marker visible as "no marker". Duplicate detection
 * is the opposite question -- what a reader can SEE contradicting the first
 * marker -- and the narrow window answered it wrongly: a second marker below
 * an introduction paragraph was excluded, so the audit reported one marker,
 * `--stamp` refreshed only the first, and the stale one stayed on the page
 * with nothing to report it.
 */
export function markerSection(lines) {
  return markerWindow(lines, Infinity, { stopAtParagraph: false });
}

export function findMarkers(lines) {
  const { from, to } = markerSection(lines);
  const fenced = fencedLines(lines);
  // A marker-shaped line inside an HTML COMMENT renders as nothing, so it is
  // not the document's provenance. Accepting it suppressed the missing-marker
  // finding and `--stamp` then updated the hidden line, leaving the rendered
  // document with no visible marker at all.
  const commented = commentedLines(lines);
  const out = [];
  for (let i = from; i < to; i += 1) {
    if (fenced.has(i) || commented.has(i) || isCodeIndented(lines[i])) continue;
    // Trimmed, exactly as findMarker parses it. The anchored regex was
    // applied to the RAW line, so a marker with one to three leading spaces --
    // which findMarker accepts as a rendered paragraph -- was invisible here
    // and two contradictory markers were counted as one.
    const line = lines[i].trim();
    if (MARKER_RE.test(line) || LEGACY_MARKER_RE.test(line)) out.push(i);
  }
  return out;
}

export function findMarker(lines) {
  const { from, to } = markerWindow(lines);
  const fenced = fencedLines(lines);
  const commented = commentedLines(lines);
  for (let i = from; i < to; i += 1) {
    // An INDENTED marker-shaped line is an example, not the document's
    // provenance: trimming before parsing let a four-space code sample count
    // as the marker, suppressed the real missing-marker finding, and --stamp
    // then replaced the example with an unindented live marker, destroying
    // the example's structure. Fenced blocks are excluded for the same reason.
    if (fenced.has(i) || commented.has(i) || isCodeIndented(lines[i])) continue;
    const line = lines[i].trim();
    const m = MARKER_RE.exec(line);
    if (m) {
      // Captured HERE rather than re-derived at each call site: `checkProvenance`
      // took only the parsed fields and so could not see the owner at all, and a
      // current-format marker omitting `Owner` passed every provenance check
      // although the registry's marker format requires it.
      return { idx: i, date: m[1], depth: m[2] ?? null, sha: m[3] ?? null, scanned: m[4] ?? null, owner: ownerOf(line), legacy: false };
    }
    const l = LEGACY_MARKER_RE.exec(line);
    if (l) {
      return { idx: i, date: l[1], depth: null, sha: null, scanned: null, owner: ownerOf(line), legacy: true, bare: legacyTailIsBare(l[2]) };
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
  // A fenced `# Example` before the real title was returned as the H1, so
  // markerWindow missed a marker after the REAL heading and --stamp inserted a
  // live marker inside the code block: the example corrupted, the document
  // still carrying no rendered provenance. The heading and marker scanners
  // already skip fenced lines.
  // And commented-out ones. A document that retires an old title as
  // `<!-- # Old title -->` above its real one had the hidden heading chosen,
  // so --stamp wrote the marker INSIDE the comment, reported success, and left
  // the rendered document with no provenance at all.
  // And a RAW HTML block. A document opening with `<pre>` containing a sample
  // `# Fake` had the sample chosen as its H1, so the real title then closed
  // the marker window, an existing marker was reported missing, and --stamp
  // wrote a live marker INSIDE the `<pre>` -- invisible to readers and
  // corrupting the example. Same failure as the fenced case it sits beside.
  const fenced = new Set([...fencedLines(lines), ...commentedLines(lines),
    ...rawHtmlBlockLines(lines)]);
  for (let i = 0; i < lines.length; i += 1) {
    if (fenced.has(i)) continue;
    if (H1_RE.test(lines[i])) return i;
    // Setext level one (`Title` over `===`). Without it the audit reported a
    // missing marker on such a document while --stamp answered
    // `skipped-no-h1`, so the command could not repair its own finding.
    if (lines[i].trim() && !/^ {0,3}#/.test(lines[i]) && !fenced.has(i + 1)
        && /^ {0,3}=+\s*$/.test(lines[i + 1] ?? '')) return i;
  }
  return null;
}

/**
 * The line a new marker goes AFTER, which is not always the H1's own line.
 *
 * A Setext H1 is TWO lines -- the title and its `===` underline -- so
 * inserting after the title splits the heading in half and leaves the document
 * with no H1 at all (`h1Index` returns null for the result). That is strictly
 * worse than the `skipped-no-h1` the recognizer replaced: it corrupts the
 * document instead of declining to touch it.
 */
export function markerAnchor(lines) {
  const h1 = h1Index(lines);
  if (h1 === null) return null;
  return /^ {0,3}=+\s*$/.test(lines[h1 + 1] ?? '') ? h1 + 1 : h1;
}

/**
 * The value shape of each field this script owns. `Owner:` is absent on
 * purpose: its value is free text that `ownerOf` carries whole, so there is no
 * recognised prefix after which a caveat could begin.
 */
const OWNED_VALUE_RE = {
  'Last reviewed:': /^(?:\d{4}-\d{2}-\d{2}|unknown)/,
  'Depth:': /^(?:verified|scanned)/,
  'Against:': /^`[0-9a-f]{7,40}`/,
  'Last scanned:': /^\d{4}-\d{2}-\d{2}/,
};

/**
 * The parts of a marker line this script does not own, so a restamp keeps them.
 *
 * Dropping any segment that merely STARTS with an owned field also deleted the
 * prose riding on it: `**Last reviewed:** 2026-08-31 — deployment only` lost
 * the caveat silently, which is exactly what `legacyTailIsBare` refuses to do
 * for legacy lines. An owned segment contributes back whatever trails its
 * recognised value, and only that: taking "the first token" as the value made
 * `**Owner:** Jane Doe` yield a tail of `Doe`, which a restamp appended as a
 * new segment and then appended again on every run after.
 */
export function extraSegments(line) {
  const out = [];
  for (const raw of line.split(DOT)) {
    const s = raw.trim();
    if (!s) continue;
    const field = OWNED_FIELDS.find((f) => s.startsWith(`**${f}`));
    if (!field) { out.push(s); continue; }
    const valueRe = OWNED_VALUE_RE[field];
    if (!valueRe) continue; // Owner: the whole segment is the value.
    const afterLabel = s.slice(`**${field}**`.length).trim();
    const v = valueRe.exec(afterLabel);
    // An owned label with a value this script did not write is kept whole
    // rather than guessed at; the parser will have rejected the line anyway.
    if (!v) { out.push(s); continue; }
    const tail = afterLabel.slice(v[0].length).trim();
    if (tail) out.push(tail);
  }
  return out;
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

/**
 * Why a document must not be stamped, or null. Two cases, in order: an
 * existing marker that sits inside a generated region (rewriting it edits a
 * line the registry declares machine-owned; the old guard only asked
 * whether the FIRST owned line was near the H1, so a block starting on line
 * 4 with the marker on line 5 was rewritten), and, with no marker yet, an
 * insertion point that a region already occupies.
 */
export function stampGuard(text, owned) {
  if (!owned.size) return null;
  const lines = text.split('\n');
  const prev = findMarker(lines);
  if (prev) {
    const n = prev.idx + 1;
    if (!owned.has(n)) return null;
    let lo = n;
    let hi = n;
    while (owned.has(lo - 1)) lo -= 1;
    while (owned.has(hi + 1)) hi += 1;
    return `not stamped: the existing marker on line ${n} sits inside a generated region `
      + `(lines ${lo}-${hi}); move it into hand-written prose or let the renderer own it`;
  }
  // The anchor, not the H1's own line: a Setext H1 is two lines, so the marker
  // lands one lower and a region starting there was not detected.
  const h1 = markerAnchor(lines);
  // Where the marker would LAND, not the earliest owned line anywhere. A mixed
  // Class A document with a complete generated header BEFORE its H1 and
  // hand-written prose after it has a minimum owned line below h1 + 2 by
  // construction, so a legitimate --verify ended as an AuditError though
  // nothing generated would be touched.
  const insertAt = h1 === null ? null : h1 + 3;
  if (insertAt !== null && (owned.has(insertAt) || owned.has(insertAt - 1))) {
    return `not stamped: the marker would land on line ${insertAt}, inside a `
      + 'generated region; move the region or let the renderer own the provenance';
  }
  return null;
}

export function stamp(text, date, depth, sha, reviewed = false) {
  const lines = text.split('\n');

  // BEFORE the update path below, not after it. The `prev` branch returned
  // `updated` without ever consulting markerAnchor, so a document with NO H1
  // but a marker-shaped line in its opening lines had that line refreshed as
  // though it were the document's provenance -- and because findMarker
  // accepted it, the audit reported neither a missing marker nor the missing
  // H1. The registry places the marker in the first paragraph after the first
  // H1; a document with no H1 has nowhere it may live, and that is a refusal,
  // not a write.
  if (markerAnchor(lines) === null) return { text, action: 'skipped-no-h1' };

  // A CRLF document splits on '\n' with the '\r' still attached to every line,
  // so a marker written without one leaves the file mixed-EOL -- noisy in a
  // Windows checkout's diff and enough to break tools that expect a single
  // convention. Lines this function WRITES take the document's ending; lines
  // it does not touch keep exactly the bytes they had, so the diff stays
  // marker-only even in a file that was already inconsistent.
  const crlf = lines.some((l) => l.endsWith('\r'));
  const eol = (line) => (crlf ? `${line}\r` : line);

  const prev = findMarker(lines);

  // A content-bearing legacy line is left exactly as it is: rewriting it would
  // delete the prose it carries and read in the diff as a tidy one-liner.
  if (prev?.legacy && prev.bare === false) return { text, action: 'skipped-legacy-content' };

  // MARKER_RE is not end-anchored, so `**Last scanned:** bad` matches on the
  // `Last reviewed` prefix and the malformed field lands in the tail. A
  // restamp would then add a canonical `Last scanned` beside it and keep the
  // broken one, leaving the document carrying two. Refuse instead.
  if (prev && !prev.legacy && extraSegments(lines[prev.idx]).some(
    (seg) => OWNED_FIELDS.some((f) => seg.startsWith(`**${f}`)))) {
    return { text, action: 'skipped-malformed-marker' };
  }

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
    lines[prev.idx] = eol(marker);
    return { text: lines.join('\n'), action: 'updated' };
  }
  // The line the marker goes AFTER. For a Setext H1 that is the `===`
  // underline, not the title: inserting between them split the heading and
  // left the document with no H1 at all -- worse than the `skipped-no-h1` the
  // recognizer replaced, because it corrupts rather than declines. The null
  // case is refused at the top of this function.
  // A visible marker the canonical window did not select -- one below the
  // opening paragraph, which is where the registry does NOT allow it. It is
  // misplaced, not missing, and inserting here gave the document TWO
  // contradictory markers: the audit reported "no review marker" and --stamp
  // then made the report true of neither. `findMarkers` reads the whole
  // opening section, so the information to refuse was already in hand.
  if (findMarkers(lines).length) return { text, action: 'skipped-misplaced-marker' };

  const h1 = markerAnchor(lines);
  // Target shape: "# Title" / "" / marker / "" / body.
  if (h1 + 1 < lines.length && lines[h1 + 1].trim() === '') lines.splice(h1 + 2, 0, eol(marker), eol(''));
  // Both blanks, not just the leading one. An H1 followed straight by body
  // text gave `# Title` / '' / marker / body, and Markdown renders the marker
  // and the opening sentence as a SINGLE paragraph -- not the first-paragraph
  // marker shape this promises, and it changes how the opening content reads.
  // The Python twin already inserts both (stocks#1121).
  else lines.splice(h1 + 1, 0, eol(''), eol(marker), eol(''));
  return { text: lines.join('\n'), action: 'inserted' };
}

// ── github state ────────────────────────────────────────────────────────────

/**
 * The only values checkClosedIssues branches on. "Any string" is not enough:
 * it tests `st.state === 'closed'` and falls through everything else, so a row
 * reading `bogus` silently drops a cited blocker from the report -- the same
 * clean-bill-of-health failure the row check exists to stop, one value in.
 * GitHub's issues API returns exactly these two.
 */
export const ISSUE_STATES = new Set(['open', 'closed']);

/**
 * Read an issues snapshot written by --write-issues-snapshot. A missing or
 * malformed file threw past the AuditError handler and Node exited 1, which
 * is the documented status for "findings", not for "the run could not
 * happen"; automation could not tell bad input from stale documentation.
 */
export function loadIssuesSnapshot(file) {
  let states;
  try {
    states = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new AuditError(`--issues-snapshot ${file} could not be read: ${err.message}`);
  }
  for (const repo of [THIS_REPO, SIBLING_REPO]) {
    const entry = states?.[repo];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new AuditError(`--issues-snapshot ${file} has no "${repo}" entry; every ${repo} citation `
        + 'would read as unresolvable');
    }
    // An empty map is not "a repository with no open work": fetchIssueStates
    // refuses to report on a repository that returned zero issues, and a
    // snapshot read may not be laxer than the live path it stands in for.
    // Accepting `{}` turns every citation of that repo into a fabricated
    // "could not be resolved" P2 and exits 1 for findings that do not exist.
    if (Object.keys(entry).length === 0) {
      throw new AuditError(`--issues-snapshot ${file} has an empty "${repo}" map; the live `
        + 'read refuses to report on zero issues and a snapshot may not either -- every '
        + `${repo} citation would become a fabricated "could not be resolved" finding`);
    }
    // "It is an object" is not enough. checkClosedIssues reads st.state once
    // it has decided the row is not nullish, so a row with no state is
    // neither closed nor unresolved and a cited blocker DISAPPEARS from the
    // report. A null row is the opposite error: it takes the unresolvable
    // branch and fabricates a finding against a live issue (Rule 4).
    for (const num of Object.keys(entry).sort()) {
      // The key is what a citation is looked up BY. `{"junk": {...}}` passed
      // the nonempty-map guard and the row check, then resolved no citation at
      // all, so every numeric reference became a fabricated "could not be
      // resolved" P2 instead of failing the run.
      if (!/^[1-9]\d*$/.test(num)) {
        throw new AuditError(`--issues-snapshot ${file}: "${repo}" has the key `
          + `${JSON.stringify(num)}, which is not an issue number; a citation is looked `
          + 'up by number and this row can never be found');
      }
      const rec = entry[num];
      if (!rec || typeof rec !== 'object' || !ISSUE_STATES.has(rec.state)) {
        throw new AuditError(`--issues-snapshot ${file}: ${repo}#${num} has no usable state `
          + `(${JSON.stringify(rec)}); expected one of ${[...ISSUE_STATES].join(', ')}. `
          + 'A row the audit cannot read is not a row it may report on');
      }
    }
  }
  return states;
}

/**
 * Reading an unusable snapshot is exit 2; failing to WRITE one was exit 1,
 * because a filesystem error walks straight past the AuditError handler at the
 * bottom of this file. An unwritable path, a missing parent directory or a
 * full disk all mean the run did not happen, not that the docs have findings.
 */
export function writeIssuesSnapshot(file, states) {
  try {
    fs.writeFileSync(file, JSON.stringify(states, null, 1));
  } catch (err) {
    throw new AuditError(`--write-issues-snapshot ${file} could not be written: ${err.message}`);
  }
}

export const ISSUE_PAGE_SIZE = 100;
// A runaway guard, not a ceiling on real data: reaching it RAISES rather than
// truncating. `page < 40` stopped at 3,900 combined issues and PRs and said
// nothing, so every older cited blocker past that point read as "could not be
// resolved" -- fabricated findings from a silent cap, which is the shape this
// module refuses everywhere else.
export const ISSUE_PAGE_GUARD = 1000;

/** One paginated read per repo, never one call per reference. */
export function fetchIssueStates(repo, { exec = run } = {}) {
  const states = {};
  for (let page = 1; ; page += 1) {
    const out = exec('gh', [
      'api',
      `repos/${OWNER}/${repo}/issues?state=all&per_page=${ISSUE_PAGE_SIZE}&page=${page}`,
      '--jq',
      // A PR has no state_reason; whether it merged is the fact that matters
      // for a document citing it as live work, so it goes in the same column.
      '.[] | [.number, .state, (.state_reason // (if .pull_request.merged_at then "merged" else "" end)), '
      + '(if .pull_request then "PR" else "ISSUE" end)] | @tsv',
    ]);
    const rows = out.trim().split('\n').filter(Boolean);
    for (const row of rows) {
      const p = row.split('\t');
      if (p.length === 4) states[Number(p[0])] = { state: p[1], reason: p[2], kind: p[3] };
    }
    if (rows.length < ISSUE_PAGE_SIZE) break;
    if (page >= ISSUE_PAGE_GUARD) {
      // Loud, not silent. A guard that fires means the assumption behind it
      // is wrong and the result cannot be trusted: exit 2, never a short
      // answer.
      throw new AuditError(`${repo}: still reading issues after ${ISSUE_PAGE_GUARD} pages `
        + `(${Object.keys(states).length} so far); refusing to report on a truncated read`);
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
  const lines = text.split('\n');
  // --check gates on these findings, so a document DEMONSTRATING what a
  // blocking citation looks like failed the audit over its own example. The
  // link, heading and marker checks already skip fenced lines.
  const fenced = new Set([...fencedLines(lines), ...indentedCodeLines(lines), ...rawHtmlBlockLines(lines)]);
  // And text commented OUT, which is how a blocker list is retired without
  // losing it: the prose no longer renders, but --check still held the build
  // red over it. Raised on the Python twin (stocks#1121).
  const commented = commentSpans(lines);
  // Code spans that CROSS line breaks. `codeSpans` is per physical line and
  // cannot see either delimiter of a span opened on one line and closed on
  // the next, so a sample written that way was scanned as live prose and
  // could emit a gating closed-issue finding.
  const wrapped = codeSpanLines(lines);
  // A cue can head a BLOCK rather than sit on the citation's own line:
  // `Blocked by:` followed by a list of issue links is the ordinary Markdown
  // form, and requiring the cue on the URL's physical line skipped every one
  // of them -- closed blockers passing the audit because the label and the
  // list are on adjacent lines. The context is carried only across list items
  // and table rows, and only from a line that ENDS in a cue-bearing label, so
  // it cannot leak into the prose after the block.
  const CUE_LABEL_RE = /:\s*$/;
  let carried = null;
  lines.forEach((line, i) => {
    if (fenced.has(i)) return;
    // Inline code as well as commented-out text. Inline code renders
    // literally, never as a live citation, so a document showing what a
    // blocker row looks like drew a gating finding once its sample issue
    // closed -- while the fenced and indented forms of the same example were
    // already ignored.
    const hidden = [...(commented.get(i) ?? []), ...codeSpans(line),
      ...(wrapped.get(i) ?? [])];
    // The hidden spans are masked OUT before any cue is read, at the same
    // length so every offset below still lines up. Hiding only the URLs was
    // half the job: `<!-- still open --> https://.../issues/1` kept the
    // visible URL and handed the commented phrase to the classifier as live
    // prose, so a closed issue produced a false, GATING P1 from text that
    // renders as nothing.
    const visible = maskSpans(line, hidden);
    // Structure is read through the CONTAINER prefix. A quoted blocker list --
    // `> Blocked by:` then `> - <url>` -- left the `>` in `visible`, so the
    // list line was not recognised as an item, the line cleared `carried`,
    // and closed blockers in the list produced no finding at all. Offsets are
    // untouched: only the structural tests read the stripped copy.
    const bare = visible.replace(BLOCKQUOTE_PREFIX_RE, '');
    const isItem = /^\s*(?:[-*+]|\d+[.)])\s/.test(bare) || /^\s*\|/.test(bare);
    // Emphasis is MARKUP: `is still **open**` renders as "is still open" and
    // plainly cites live work, but the classifier saw the `**` between the
    // words and found no cue at all -- so a closed issue vanished from the
    // audit entirely, which is the direction that hides findings. Replaced
    // with spaces rather than removed, because every offset below is an
    // offset into this line.
    const cueText = stripEmphasis(visible);
    // The label terminator is tested against the text with the hidden tail
    // REMOVED, not masked. `Blocked by: <!-- note -->` renders as a label
    // ending in `:`, but the equal-length mask leaves NULs after the colon
    // and the anchored `:\s*$` fails -- so the carried context was cleared
    // and every closed issue in the list below went unreported. Offsets are
    // preserved everywhere they are used; only this one anchored test reads
    // the trimmed form.
    const labelText = stripEmphasis(bare).replace(/\u0000+\s*$/, '');
    // A blank line between the label and its list is the normal spelling, so
    // it must not clear the context; any other non-item line does.
    // A line that is ENTIRELY hidden renders as nothing, so it must not clear
    // the carried label -- `Blocked by:` / `<!-- note -->` / the list was
    // losing its context because masking leaves NUL characters and
    // `bare.trim()` is therefore non-empty. My own regression from the
    // hidden-suffix fix: the mask preserves length by design, so emptiness
    // has to be tested against the mask character rather than the string.
    if (!isItem && bare.replace(/\u0000/g, '').trim()) {
      carried = hasBlockingCue(cueText) && CUE_LABEL_RE.test(labelText) ? cueText : null;
    }
    const context = isItem ? carried : null;
    if (!hasBlockingCue(cueText) && context === null) return;
    for (const m of line.matchAll(ISSUE_URL_RE)) {
      if (hidden.some(([lo, hi]) => lo <= m.index && m.index < hi)) continue;
      if (!citesLiveWork(cueText, m.index, m.index + m[0].length, { context })) continue;
      const [, rawRepo, rawKind, num] = m;
      const repo = normaliseRepo(rawRepo);
      const kind = rawKind.toLowerCase();
      // A pull request cited as a blocker is live work too. `/pull/` used to
      // be skipped outright, so "blocked by #60" stayed invisible after #60
      // merged, though the issue-state read already carried PR records; the
      // blocking-cue filter above is what keeps ordinary PR lineage out.
      const isPr = kind === 'pull';
      const st = states[repo]?.[Number(num)];
      const label = `${repo}#${num}${isPr ? ' (PR)' : ''}`;
      if (!st) {
        out.push({ check: 'closed-issue', doc, line: i + 1, severity: 'P2',
          detail: `${label} could not be resolved` });
      } else if (st.state === 'closed') {
        const reason = st.reason || (isPr ? 'closed' : 'completed');
        out.push({ check: 'closed-issue', doc, line: i + 1,
          severity: reason === 'not_planned' ? 'P2' : 'P1',
          detail: `${label} is CLOSED (${reason}) but cited as live work`,
          ref: `${repo}#${num}`, reason });
      }
    }
  });
  return out;
}

/**
 * Which backticked citations on a line belong to the sibling repo, by start
 * offset. A citation is the sibling's when its own markdown link targets
 * that repo, or when the repo's name sits between it and the nearest other
 * citation or table-cell edge on either side. A link's URL is part of the
 * citation it belongs to, so a stocks URL never counts as free text next to
 * the citation after it. Free text is bounded by other citations and by
 * cell pipes, not by sentence punctuation: CLAUDE.md cites a stocks file
 * and names the repo after a semicolon.
 */
export function crossRepoCitations(line) {
  const cites = [];
  for (const re of [BACKTICK_PATH_RE, BACKTICK_ROOT_FILE_RE]) {
    for (const m of line.matchAll(re)) {
      let end = m.index + m[0].length;
      const tail = LINK_TAIL_RE.exec(line.slice(end));
      const link = tail ? tail[0] : '';
      if (link) end += link.length;
      cites.push({ start: m.index, end, link });
    }
  }
  cites.sort((a, b) => a.start - b.start);
  const out = new Set();
  cites.forEach((c, i) => {
    if (CROSS_REPO_LINK_RE.test(c.link)) { out.add(c.start); return; }
    const cellStart = line.lastIndexOf('|', c.start);
    const cellEnd = line.indexOf('|', c.end);
    const lo = Math.max(cellStart + 1, i > 0 ? cites[i - 1].end : 0);
    const hi = Math.min(cellEnd === -1 ? line.length : cellEnd, i + 1 < cites.length ? cites[i + 1].start : line.length);
    if (CROSS_REPO_RE.test(line.slice(lo, c.start)) || CROSS_REPO_RE.test(line.slice(c.end, hi))) out.add(c.start);
  });
  return out;
}

/** Does any tracked path live under this one? Then it is a real directory. */
/**
 * GitHub's anchor for a heading.
 *
 * The ORDER is the whole point: lowercase, strip everything that is not a word
 * character, space or hyphen, and THEN replace each space with a hyphen. Runs
 * are not collapsed, so a heading like `A — B / C` loses the em dash and the
 * slash and keeps the spaces either side, giving doubled hyphens. Collapsing
 * whitespace here would reproduce the broken links' own spelling and call
 * every one of them valid.
 */
/**
 * The named character references, as HTML 4.01 defines them.
 *
 * A closed, complete list of 252: the whole Latin-1 block, the five XML
 * names, and the symbol, arrow, maths and Greek sets. An 18-entry whitelist
 * was not enough and was wrong in the same two directions the decoder exists
 * to fix -- `Caf&eacute;` slugged `cafeacute`, so the reader's link to
 * `#café` read as dead and a nonexistent source-spelling anchor was accepted.
 *
 * Not the full HTML5 list of ~2,231, which is mostly aliases and mathematical
 * names that do not appear in a heading, and which is too large to carry
 * correctly by hand. An unrecognised name stays literal -- what CommonMark
 * does with a genuinely invalid one, and the safe direction, since decoding a
 * name got wrong would invent an anchor. Numeric references need no table.
 */
// U+00A0..U+00FF in order, so the whole Latin-1 block is one list rather than
// ninety-six hand-written pairs that could each be wrong.
const LATIN1_NAMES = (
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr '
  + 'deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 '
  + 'frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute '
  + 'Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml '
  + 'times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc '
  + 'atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml '
  + 'eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml '
  + 'yacute thorn yuml'
).split(' ');

const NAMED_CHAR_REFS = new Map([
  ...LATIN1_NAMES.map((name, i) => [name, String.fromCodePoint(0xa0 + i)]),
  ...Object.entries({
    // The five XML names, which are not in the Latin-1 block.
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    // Punctuation, symbols and Greek that occur in headings.
    ndash: '\u2013', mdash: '\u2014', hellip: '\u2026', lsquo: '\u2018',
    rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d', sbquo: '\u201a',
    bdquo: '\u201e', dagger: '\u2020', Dagger: '\u2021', bull: '\u2022',
    permil: '\u2030', prime: '\u2032', Prime: '\u2033', lsaquo: '\u2039',
    rsaquo: '\u203a', oline: '\u203e', frasl: '\u2044', euro: '\u20ac',
    trade: '\u2122', larr: '\u2190', uarr: '\u2191', rarr: '\u2192',
    darr: '\u2193', harr: '\u2194', lArr: '\u21d0', uArr: '\u21d1',
    rArr: '\u21d2', dArr: '\u21d3', hArr: '\u21d4', minus: '\u2212',
    lowast: '\u2217', radic: '\u221a', infin: '\u221e', asymp: '\u2248',
    ne: '\u2260', equiv: '\u2261', le: '\u2264', ge: '\u2265',
    sum: '\u2211', prod: '\u220f', part: '\u2202', int: '\u222b',
    forall: '\u2200', exist: '\u2203', empty: '\u2205', nabla: '\u2207',
    isin: '\u2208', notin: '\u2209', cap: '\u2229', cup: '\u222a',
    sub: '\u2282', sup: '\u2283', sube: '\u2286', supe: '\u2287',
    and: '\u2227', or: '\u2228', there4: '\u2234', loz: '\u25ca',
    OElig: '\u0152', oelig: '\u0153', Scaron: '\u0160', scaron: '\u0161',
    Yuml: '\u0178', fnof: '\u0192', circ: '\u02c6', tilde: '\u02dc',
    Alpha: '\u0391', Beta: '\u0392', Gamma: '\u0393', Delta: '\u0394',
    Epsilon: '\u0395', Zeta: '\u0396', Eta: '\u0397', Theta: '\u0398',
    Iota: '\u0399', Kappa: '\u039a', Lambda: '\u039b', Mu: '\u039c',
    Nu: '\u039d', Xi: '\u039e', Omicron: '\u039f', Pi: '\u03a0',
    Rho: '\u03a1', Sigma: '\u03a3', Tau: '\u03a4', Upsilon: '\u03a5',
    Phi: '\u03a6', Chi: '\u03a7', Psi: '\u03a8', Omega: '\u03a9',
    alpha: '\u03b1', beta: '\u03b2', gamma: '\u03b3', delta: '\u03b4',
    epsilon: '\u03b5', zeta: '\u03b6', eta: '\u03b7', theta: '\u03b8',
    iota: '\u03b9', kappa: '\u03ba', lambda: '\u03bb', mu: '\u03bc',
    nu: '\u03bd', xi: '\u03be', omicron: '\u03bf', pi: '\u03c0',
    rho: '\u03c1', sigmaf: '\u03c2', sigma: '\u03c3', tau: '\u03c4',
    upsilon: '\u03c5', phi: '\u03c6', chi: '\u03c7', psi: '\u03c8',
    omega: '\u03c9',
  }),
]);

const CHAR_REF_RE = /&(?:#([0-9]{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,31}));/g;

/**
 * Markdown decodes a character reference BEFORE the anchor is derived.
 *
 * `## Dogs &amp; Cats` renders as "Dogs & Cats" and GitHub anchors it
 * `dogs--cats`. Passing the raw text to the slugger recorded `dogs-amp-cats`
 * instead, so the link a reader follows was reported dead while a link to the
 * literal-entity slug -- an anchor that exists nowhere -- was accepted. Wrong
 * in both directions, the same shape as the inline-HTML and `\w`-ASCII bugs
 * `headingSlug` already carries.
 */
export function decodeCharRefs(text) {
  return text.replace(CHAR_REF_RE, (whole, dec, hex, name) => {
    if (name !== undefined) return NAMED_CHAR_REFS.get(name) ?? whole;
    const cp = Number.parseInt(dec ?? hex, dec !== undefined ? 10 : 16);
    // A reference outside Unicode, or to a surrogate, is not a character.
    // CommonMark renders those as U+FFFD; leaving the source text alone is
    // the same non-fabricating choice as an unknown name above.
    if (!Number.isFinite(cp) || cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return whole;
    return String.fromCodePoint(cp);
  });
}

export function headingSlug(heading) {
  // Inline HTML is MARKUP: GitHub renders `## Use <code>foo</code>` as
  // "Use foo" and anchors it `use-foo`, while keeping the tag names recorded
  // `use-codefoocode` -- a valid link reported dead and a nonexistent slug
  // accepted, wrong in both directions.
  // AFTER the tag strip, not before: `&lt;code&gt;` is literal text that
  // renders as `<code>`, and decoding first would turn it into a tag for the
  // strip above to delete -- removing content GitHub keeps.
  let s = decodeCharRefs(heading.replace(/<[^>]+>/g, '')
    .replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'));
  // Emphasis MARKUP only. Stripping every underscore turned `## API_FIELD`
  // into `apifield`, so a valid link to `#api_field` read as a dead anchor
  // while an incorrect `#apifield` was accepted. CommonMark does not treat an
  // intraword `_` as emphasis and GitHub's anchor keeps it.
  s = s.replace(/\*/g, '').replace(/(?<!\w)_+|_+(?!\w)/g, '').trim().toLowerCase();
  // `\w` is ASCII-only in JavaScript, so `## Café` produced `caf` -- a valid
  // link to `#café` read as a dead anchor while the nonexistent `#caf` was
  // accepted, wrong in both directions at once. `\p{L}\p{N}_` is what `\w`
  // means in the Python twin, whose `re` module is Unicode by default; `_` has
  // to be named because it is not a letter or a number.
  return s.replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/ /g, '-');
}

/**
 * Emphasis delimiters blanked, every other offset left where it was.
 *
 * `*` in both spellings, and `_` only where CommonMark treats it as emphasis
 * -- an intraword `_` is a literal character, and blanking it would break
 * `API_FIELD` into two words for the cue scan.
 */
/**
 * The line with `spans` blanked, keeping every other offset where it was.
 *
 * NUL rather than deletion: the callers compute match offsets against the
 * ORIGINAL line, so a shorter masked copy would silently shift every span
 * that follows one. Extracted from the blocker scan, which had this inline,
 * so the region scan masks the same way. Parity with the Python twin's
 * `mask_spans` (stocks#1121).
 */
export function maskSpans(line, spans) {
  return spans.reduce(
    (acc, [lo, hi]) => acc.slice(0, lo) + '\u0000'.repeat(hi - lo) + acc.slice(hi), line);
}

export function stripEmphasis(line) {
  return line.replace(/\*+/g, (m) => ' '.repeat(m.length))
    .replace(/(?<!\w)_+|_+(?!\w)/g, (m) => ' '.repeat(m.length));
}

/** Every anchor a document offers, duplicates numbered as GitHub numbers them. */
export function headingAnchors(text) {
  const seen = new Map();
  const out = new Set();
  // A heading inside an HTML comment renders as nothing, so GitHub exposes no
  // anchor for it -- recording one let a broken link to `#hidden` pass.
  // A `# ` line inside a fenced block is code, and GitHub creates no anchor
  // for it -- docs/E2E_TEST_PLAN.md:59 has exactly that. Recording it invented
  // an anchor, so a link to a fragment that does not exist PASSED the
  // dead-anchor check. Marker parsing already excludes fenced lines; this is
  // the same rule for the same reason.
  const lines = text.split('\n');
  // Raw-text HTML blocks too. `<pre>` renders `## Fake` literally and GitHub
  // exposes no anchor for it, so recording one let a broken link to `#fake`
  // pass the dead-anchor check -- the same invented-destination failure as
  // the fenced case, which the link scans around this already mask.
  // Indented code too. `    Fake` followed by `---` is a code block and a
  // thematic break, not a Setext heading -- omitted, isSetextUnderline
  // recorded a `fake` anchor the rendered document does not offer and a link
  // to it PASSED. markerWindow already excludes indented code. Parity with
  // the Python twin (stocks#1121).
  const fenced = new Set([...fencedLines(lines), ...commentedLines(lines),
    ...rawHtmlBlockLines(lines), ...indentedCodeLines(lines)]);
  for (const [i, raw] of lines.entries()) {
    if (fenced.has(i)) continue;
    // A heading may sit inside a container and still be a heading: `> ## Q`
    // renders with the anchor `q`. Matching the raw line omitted it, so a
    // valid local link produced a gating dead-anchor finding. The prefix is
    // consumed for the heading test exactly as `fencedLines` and
    // `indentedCodeLines` consume it for theirs.
    const line = raw.replace(BLOCKQUOTE_PREFIX_RE, '');
    // `## Install ##` renders as `Install`, and GitHub's anchor is `install`.
    // Passing `Install ##` to headingSlug recorded `install-`, so a valid link
    // to `#install` was reported dead.
    // Indented ATX, and setext (`Title` over `===` or `---`). A column-zero
    // ATX-only scan recorded no anchor for either, so a valid link to one was
    // emitted as a dead-anchor P2 and could fail --check.
    // The underline is read through the same container prefix, or a quoted
    // Setext heading would lose its underline and stop being one.
    const next = (lines[i + 1] ?? '').replace(BLOCKQUOTE_PREFIX_RE, '');
    const setext = line.trim() && !fenced.has(i + 1)
      && /^ {0,3}(=+|-{2,})\s*$/.test(next) && !/^ {0,3}#/.test(line);
    const m = setext
      ? [null, line.trim()]
      : /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(line);
    if (!m) continue;
    const base = headingSlug(m[1]);
    // Advance until the slug is unused, rather than trusting a per-base
    // counter. `## Notes`, `## Notes-1`, `## Notes` gave `notes` and
    // `notes-1` twice and never emitted `notes-2`, which is what GitHub
    // assigns the third -- so a valid link to it read as dead.
    let n = seen.get(base) ?? 0;
    let slug = n === 0 ? base : `${base}-${n}`;
    while (out.has(slug)) { n += 1; slug = `${base}-${n}`; }
    seen.set(base, n + 1);
    out.add(slug);
  }
  // Explicit HTML anchors. `<a name="legacy"></a>` and any `id="..."` are
  // rendered destinations GitHub honours, so a link to `#legacy` is valid
  // with no heading of that name -- and recording only heading slugs made the
  // dead-anchor check reject it and fail --check. Read from the same
  // unmasked lines, so one inside a fence or a comment is still an example.
  // A narrower mask than the heading scan's: a type-6 block such as `<div
  // id="x">` IS the anchor, so masking it would discard the very thing being
  // read. Only a RAW-TEXT block (pre/script/style/textarea) renders the tag
  // literally and exposes nothing.
  const literal = new Set([...fencedLines(lines), ...commentedLines(lines),
    ...rawHtmlBlockLines(lines, { rawTextOnly: true })]);
  // Inline code too, single-line and wrapped. A literal example --
  // `` `<a id="fake"></a>` `` -- registered `fake` as a real destination, so a
  // later `[x](#fake)` PASSED against an anchor the rendered document does not
  // have. That is the invented-destination failure this whole scan exists to
  // avoid, reintroduced by the scan itself.
  const wrappedSpans = codeSpanLines(lines);
  for (const [i, raw] of lines.entries()) {
    if (literal.has(i)) continue;
    const visible = maskSpans(raw,
      [...codeSpans(raw), ...(wrappedSpans.get(i) ?? [])]);
    for (const mm of visible.matchAll(/<[a-zA-Z][^>]*?\s(?:id|name)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      const id = mm[2] ?? mm[3];
      if (id) out.add(id.toLowerCase());
    }
  }
  return out;
}

/**
 * CommonMark backslash escapes removed, as rendering removes them.
 *
 * Only before ASCII punctuation, which is the whole set CommonMark allows an
 * escape before. A backslash anywhere else is a literal character, and
 * dropping it would turn one path into a different one -- inventing a
 * destination rather than resolving the real one.
 */
export function unescapeMarkdown(text) {
  return text.replace(/\\([!-/:-@[-`{-~])/g, '$1');
}

export function isTrackedDir(tracked, norm) {
  const prefix = `${norm}/`;
  for (const p of tracked) if (p.startsWith(prefix)) return true;
  return false;
}

export function checkDeadLinks(doc, text, ctx, { backtickedPaths = true } = {}) {
  const { tracked, topLevelDirs, rootFiles, knownRoot, exts, basenames } = ctx;
  const out = [];
  const base = path.posix.dirname(doc);
  const anchorCache = new Map();
  const anchorsOf = (p) => {
    if (!anchorCache.has(p)) {
      try {
        anchorCache.set(p, headingAnchors(fs.readFileSync(path.join(REPO, p), 'utf8')));
      } catch (err) {
        // A TRACKED Markdown file that cannot be read is not a document with
        // no headings. Storing null made the anchor check skip silently, so a
        // link to a fragment that does not exist passed clean over a target
        // the audit never actually inspected.
        if (tracked.has(p)) {
          throw new AuditError(`${doc} links into ${p}, which is tracked but could not be `
            + `read (${err.message}); its anchors were never checked`);
        }
        anchorCache.set(p, null);
      }
    }
    return anchorCache.get(p);
  };
  const lines = text.split('\n');
  // A fenced block is an EXAMPLE, not a citation. A document demonstrating
  // Markdown syntax with `[x](missing.md)`, or showing a path that has since
  // moved, was read as rendered documentation and failed --check over its own
  // teaching material. The marker and heading checks already skip these lines.
  const fenced = new Set([...fencedLines(lines), ...indentedCodeLines(lines), ...rawHtmlBlockLines(lines)]);

  // Reference-style Markdown: `[guide][g]` with `[g]: docs/guide.md` further
  // down. Neither shape matches MD_LINK_RE, so a broken reference link -- the
  // form the CommonMark spec calls standard and readers see as an ordinary
  // link -- produced a clean audit. The DEFINITION's destination is validated
  // exactly as an inline link's is.
  // A footnote (`[^1]: ...`) is deliberately excluded: it defines a note, not
  // a destination.
  // A USE (`[text][label]`) is excluded too, and that is a measurement, not a
  // shortcut: across the stocks twin's 322 markdown documents there is 1
  // reference definition and 204 bracket pairs, nearly all of them issue-title
  // tags -- `| #906 | P0 | [P0][Replay] Quarantine ...` is a title, not a
  // link, and indistinguishable from a full reference use. Checking uses
  // produced 79 fabricated findings there. The definition's destination is the
  // half that certainly names a path, so that is the half this checks.
  const refDefs = new Map();
  // A definition retained inside a multiline HTML comment is not registered by
  // Markdown at all, so validating it produced a false gating dead-link for
  // retired content. The fenced exclusion was here; the comment one was not.
  const commentedDefs = commentedLines(lines);
  lines.forEach((line, i) => {
    if (fenced.has(i) || commentedDefs.has(i)) return;
    // `<...>` is the standard destination form and the ONLY one that may
    // contain a space, which is exactly why an author reaches for it.
    // `\S+` stopped at the space, so `[guide]: <docs/user guide.md>` captured
    // `<docs/user` and a tracked file was reported dead. The inline-link
    // parser already accepts this form; the definition parser did not.
    const m = /^ {0,3}\[([^\]^][^\]]*)\]:\s+(?:<([^<>\n]*)>|(\S+))/.exec(line);
    // The FIRST definition wins, as CommonMark resolves it. Overwriting with
    // the last emitted a false dead-link when the first destination exists and
    // the duplicate is stale, and missed the link readers follow in the
    // reverse order.
    const label = m && m[1].trim().toLowerCase();
    // Group 2 is the angle-bracketed form, group 3 the bare one. Group 2 can
    // legitimately be the EMPTY string (`[x]: <>`), so the branch tests for
    // `undefined` rather than truthiness -- `m[2] || m[3]` would fall through
    // to an undefined bare group and throw on the replace below.
    const dest = m && (m[2] !== undefined ? m[2] : m[3]);
    if (m && !refDefs.has(label)) {
      refDefs.set(label, { target: dest, line: i + 1 });
    }
  });

  // One destination, validated exactly as an inline link's is: same tracked
  // paths, same anchors. A different spelling must not buy a laxer check.
  const checkTarget = (tgt, frag, lineNo, label = null) => {
    const what = label === null ? `relative link -> ${tgt}` : `reference link [${label}] -> ${tgt}`;
    const anchorWhat = label === null ? `link -> ${tgt}` : what;
    // Any scheme, case-insensitively, plus a protocol-relative `//host/path`.
    // A narrow `https?:|mailto:` allowlist sent `tel:`, `ftp:`, `HTTPS:` and
    // `//example.com/x` down the repository-path branch and produced a P2 for
    // a local file that was never meant to exist.
    if (/^[a-z][a-z0-9+.-]*:/i.test(tgt) || tgt.startsWith('//')) return;
    let norm;
    if (!tgt) {
      norm = doc;
    } else {
      // `[g](<guide.md>)` is the standard form for a destination with spaces,
      // and the angle brackets are delimiters, not part of the path. A query
      // (`guide.md?plain=1`) is not part of it either -- the tracked-file
      // lookup searched for the literal filename including the `?`.
      // And a backslash escape is MARKUP: Markdown removes it when the
      // destination renders, so `[x](docs/foo\(bar\).md)` links to the
      // tracked file `docs/foo(bar).md`. Keeping the backslashes reported
      // that valid link as dead. Only the ASCII punctuation CommonMark
      // allows an escape before -- a backslash anywhere else is a literal
      // character and removing it would invent a different path.
      // Character references are resolved before the link is constructed, so
      // `[x](foo&amp;bar.md)` targets a tracked `foo&bar.md`; leaving `&amp;`
      // intact reported that valid link as dead. Decoded here for the same
      // reason heading text is decoded before its anchor is generated.
      const raw = decodeCharRefs(
        unescapeMarkdown(tgt.replace(/^<(.*)>$/, '$1').split('?')[0]));
      // `100%-coverage.md` is a literal percent, and decodeURIComponent throws
      // a plain URIError on it -- a stack trace and exit 1, the status
      // reserved for documentation findings. An undecodable destination is
      // simply used as written.
      let bare;
      try {
        bare = decodeURIComponent(raw);
      } catch {
        bare = raw;
      }
      if (!bare) return;
      // A slash-prefixed destination is a HOST-ROOT URL, not a repository
      // path: `[Dashboard](/dashboard)` is a route this app serves. Stripping
      // the slash and looking it up in `tracked` reported valid application
      // links as dead, and would have accepted one by accident wherever a
      // same-named directory happened to exist.
      if (bare.startsWith('/')) return;
      norm = path.posix.normalize(path.posix.join(base, bare));
      if (norm.startsWith('..')) return;
      if (!tracked.has(norm) && !isTrackedDir(tracked, norm)) {
        out.push({ check: 'dead-link', doc, line: lineNo, severity: 'P2', detail: what });
        return;
      }
    }
    // The same predicate documentSet uses. After alternate suffixes were
    // admitted a round ago, a tracked `guide.markdown` or `README.MD` passed
    // the path check and never reached anchorsOf, so `[x](guide.markdown#gone)`
    // let a broken anchor through -- my own regression, one gate behind.
    if (frag && isMarkdownPath(norm)) {
      const have = anchorsOf(norm);
      // Decoded, exactly as the destination path above is. A link may
      // percent-encode non-ASCII -- `[Café](#caf%C3%A9)` -- while
      // headingAnchors records the rendered slug `café`, so comparing the raw
      // fragment reported a valid link as a gating dead anchor. An undecodable
      // fragment is used as written, for the same reason paths are.
      let wanted;
      try {
        wanted = decodeURIComponent(frag);
      } catch {
        wanted = frag;
      }
      if (have && !have.has(wanted.toLowerCase())) {
        out.push({ check: 'dead-anchor', doc, line: lineNo, severity: 'P2',
          detail: `${anchorWhat}#${frag}: the target has no such heading` });
      }
    }
  };

  for (const [label, { target, line }] of refDefs) {
    const [tgt, frag] = target.split('#');
    checkTarget(tgt, frag, line, label);
  }
  // Offsets inside an HTML comment, per line: retired Markdown kept that way
  // is not rendered, so it is not a citation. Spans rather than whole lines,
  // matching checkClosedIssues, so a visible link beside a comment still counts.
  const commentedSpans = commentSpans(lines);
  lines.forEach((line, i) => {
    if (fenced.has(i)) return;
    // Spans a backticked citation occupies purely as a Markdown link's LABEL.
    // ``[`src/gone.ts`](../src/gone.ts)`` is ONE broken link, and reporting it
    // from both passes doubles the finding and the summary count.
    const labelSpans = [...line.matchAll(/\[([^\]]*)\]\([^)\s]*(?:\s+[^)]*)?\)/g)]
      .map((m) => [m.index + 1, m.index + 1 + m[1].length]);
    const inLinkLabel = (idx) => labelSpans.some(([lo, hi]) => idx >= lo && idx < hi);
    // `[x](#heading)` carries no path, so the anchor is checked against this
    // same document. A target that climbs out of the repository is cross-repo
    // prose this tree cannot resolve and must not call rot. Filesystem
    // existence answers DIRECTORY only: an ignored, generated or
    // staged-for-deletion file is present here and absent for anyone who
    // clones, so letting it satisfy a link produced a clean audit over a
    // committed link broken for every reader. All of that now lives in
    // checkTarget, shared with the reference-style definitions above.
    // Link SYNTAX shown as inline code renders literally: `` `[x](missing.md)` ``
    // displays the brackets. Scanning it produced gating dead-link findings
    // over a document's own syntax examples. Only THIS pass is masked -- the
    // backtick pass below needs code spans, because a backticked path IS its
    // subject. The Python twin masks the same way (stocks#1121).
    const codeHere = codeSpans(line);
    const hiddenHere = commentedSpans.get(i) ?? [];
    for (const m of line.matchAll(MD_LINK_RE)) {
      // An ESCAPED opening bracket renders as literal text, so a document
      // demonstrating link syntax as `\[x](missing.md)` was reported as a
      // gating dead link for a destination no reader can follow. Parity
      // matters: `\\[x](y.md)` IS a link after a literal backslash.
      if (isEscaped(line, m.index)) continue;
      if (codeHere.some(([lo, hi]) => lo <= m.index && m.index < hi)) continue;
      // Retired Markdown kept in an HTML comment is not rendered, so it is not
      // a citation: `<!-- [old](removed.md) -->` produced a gating dead-link
      // finding over content no reader can see. A SPAN, so a visible link
      // beside a comment on the same line is still checked -- which is what
      // checkClosedIssues already does.
      if (hiddenHere.some(([lo, hi]) => lo <= m.index && m.index < hi)) continue;
      // Either destination form: `<...>` is a separate branch in the pattern
      // because it admits a space, and both name the same thing here.
      const [tgt, frag] = m[1] !== undefined ? [m[1], m[2]] : [m[3], m[4]];
      checkTarget(tgt, frag, i + 1);
    }
    // A backticked path is this repo's to resolve only when nothing says
    // otherwise: its extension is one this tree tracks, and the citation is
    // not the sibling repo's. Ownership is decided per citation, not per
    // line: docs/TEST_COVERAGE_AUDIT.md:104 has a stocks docs/API.md link in
    // one cell and a local src/lib path in another, and a line-level marker
    // hid the local one.
    if (!backtickedPaths) return;
    const crossRepo = crossRepoCitations(line);
    for (const m of line.matchAll(BACKTICK_PATH_RE)) {
      if (hiddenHere.some(([lo, hi]) => lo <= m.index && m.index < hi)) continue;
      const cited = m[1];
      // `./src/removed.ts` and `docs/../src/live.ts` name the same files as
      // their plain spellings. Comparing the raw string meant the first hid a
      // deleted file (its top-level component is `.`, which is in no
      // topLevelDirs) and the second could be called dead though it resolves.
      const p = path.posix.normalize(cited);
      if (p.startsWith('..')) continue;
      if (inLinkLabel(m.index) || crossRepo.has(m.index)
          || !exts.has(path.posix.extname(p))) continue;
      // Tracked membership for files, same rule as the Markdown-link branch
      // above: an ignored or generated file, or one recreated after a staged
      // deletion, is present here and absent for everyone who clones. The
      // previous fix corrected one branch and left this one.
      if (tracked.has(p) || isTrackedDir(tracked, p)) continue;
      // Only flag paths shaped like this repo's layout, so a deliberate
      // cross-repo citation is not reported as rot.
      if (topLevelDirs.has(p.split('/')[0])) {
        out.push({ check: 'dead-link', doc, line: i + 1, severity: 'P2',
          detail: `backticked path -> ${cited}` });
      }
    }
    for (const m of line.matchAll(BACKTICK_ROOT_FILE_RE)) {
      const f = m[1];
      // inLinkLabel was consulted only by the slash-path loop. A deleted root
      // file cited as ``[`vite.config.ts`](../vite.config.ts)`` was reported
      // once by the Markdown pass and again here -- one broken link, two
      // findings and a doubled summary count.
      // And the comment spans, which this sibling loop never consulted though
      // the slash-path loop above does: a deleted root file retained inside a
      // comment -- `<!-- retired: \`vite.config.ts\` -->` -- drew a gating
      // dead-link finding over content no reader can see.
      if (inLinkLabel(m.index) || crossRepo.has(m.index)
          || hiddenHere.some(([lo, hi]) => lo <= m.index && m.index < hi)
          || !exts.has(path.posix.extname(f))) continue;
      // A bare name that is the basename of some tracked file is a citation
      // of that file, wherever it lives: `index.css` in the design docs is
      // src/index.css, and the stem rule below would otherwise read it as a
      // renamed root index.html.
      if (tracked.has(f) || basenames.has(f)) continue;
      // A bare name is weak evidence: the docs cite over a hundred bare
      // filenames that live under a directory or in the sibling repo. It is
      // reported only when a tracked root file shares its stem (a rename or
      // an extension change) or the name is a root file this repo knows --
      // registered outright, or present at the base ref and gone now.
      if (!rootFiles.has(stem(f)) && !knownRoot.has(f)) continue;
      out.push({ check: 'dead-link', doc, line: i + 1, severity: 'P2', detail: `backticked root file -> ${f}` });
    }
  });
  return out;
}

/**
 * The content checks a class is subject to. Class C keeps its LINK check but
 * not its issue check, and the split is the point: a dated record citing an
 * issue that has since closed was true on its date, so reporting it builds a
 * backlog whose only resolution is "leave it". A dead link is different: the
 * record still means what it said, but its evidence can no longer be reached,
 * and repointing the link changes nothing the record asserts. The registry
 * promises Class C is read for cross-references; this is that promise.
 */
export function contentChecks(cls, doc, text, ctx) {
  // A Class C record keeps its links checked but NOT its historical file
  // names. A dated record truthfully lists the files an old commit touched;
  // once one is renamed or deleted, a live-tree path check turns that truth
  // into a finding whose only remedy is rewriting the record -- which is the
  // one thing Class C exists to prevent. Measured on the shipped
  // docs/LOVABLE_COMMITS_REVIEW.md: 16 P2 findings, every one of them a file
  // an old commit really did touch, including src/styles.css.
  //
  // Markdown links are different and stay checked: a link is a promise to the
  // reader NOW, not a record of what was true then.
  const links = checkDeadLinks(doc, text, ctx, { backtickedPaths: cls !== 'C' });
  if (cls === 'C') return links;
  return [...checkClosedIssues(doc, text, ctx.states), ...links];
}

/**
 * Commits in a `--format=%h%x09%s --name-status` listing that changed content
 * under the pathspec: an add, a modify, a delete, or a rename that did not
 * keep 100% of its content. A pure rename (`R100`) is not drift; a moved file
 * with an edit (`R089`) is exactly as much drift as the edit alone, and
 * `--diff-filter=AMD` dropped the whole commit because git files it under R.
 */
export function driftCommits(out) {
  const commits = [];
  let current = null;
  for (const line of out.split('\n')) {
    const header = /^([0-9a-f]{7,40})\t/.exec(line);
    if (header) { current = { line, drift: false }; commits.push(current); continue; }
    const status = /^([AMDRCT])(\d{3})?\t/.exec(line);
    if (!status || !current) continue;
    const [, kind, score] = status;
    // T (the git object type changed -- a regular file became a symlink, or a
    // submodule a file) is drift like any other: the described surface is not
    // what it was. The uncommitted branch below already counted it, so leaving
    // it out here made the same change invisible the moment it was committed.
    if ('AMDT'.includes(kind) || (kind === 'R' && Number(score) < 100)) current.drift = true;
  }
  return commits.filter((c) => c.drift).map((c) => c.line);
}

export function checkChangedSince(doc, sha, codePaths, baseRef = 'origin/main', { exec = run } = {}) {
  if (!sha || codePaths.length === 0) return [];
  // `git log` exits 0 with empty output when the range holds no commits, so
  // there is no non-zero code that means "no matches" here. A bad SHA exits
  // 128 and must abort: reporting "nothing changed since <sha>" for a SHA the
  // repo does not have is the same fabrication as a count of zero. The marker
  // check reports the unknown SHA separately.
  // AMDR with the rename score read per file, not M: a declared path GAINING a
  // route under src/routes or LOSING a documented component changes the
  // described surface as much as editing one, and a file moved WITH an edit
  // is drift that `--diff-filter=AMD` filed under R and dropped. Only a pure
  // rename (R100) is excluded, which is what the filter was for: the
  // 2026-09-07 file-move wave must not flag every document.
  // --abbrev=12 overrides core.abbrev, which can be set below 7. Without it
  // `%h` emits e.g. `abcd\tmessage`, driftCommits' header pattern rejects it,
  // no status line is associated with any commit, and the drift check reports
  // nothing however much the declared paths moved.
  // The working tree too, not only committed history. The documents, their
  // contents and every count claim are read from the working tree, so an
  // uncommitted edit under a declared path makes the documentation stale while
  // `sha..HEAD` reports nothing -- exactly the run a developer does before
  // committing.
  const pending = exec('git', ['diff', '--name-status', '-M', '--diff-filter=AMDRT',
    'HEAD', '--', ...codePaths]);
  const out = exec('git', ['log', '--abbrev=12', '--format=%h%x09%s', '--name-status', '-M',
    '--diff-filter=AMDRT',
    `${sha}..${baseRef}`, '--', ...codePaths]);
  const commits = driftCommits(out);
  // A bare status listing with no commit header: driftCommits needs one, so
  // the uncommitted changes are counted directly.
  const uncommitted = pending.split('\n')
    .filter((l) => /^([AMDRCT])(\d{3})?\t/.test(l))
    .filter((l) => { const [, k, s] = /^([AMDRCT])(\d{3})?\t/.exec(l);
      return 'AMDT'.includes(k) || (k === 'R' && Number(s ?? 100) < 100); });
  if (commits.length === 0 && uncommitted.length === 0) return [];
  const parts = [];
  if (commits.length) parts.push(`${commits.length} content commit(s)`);
  if (uncommitted.length) parts.push(`${uncommitted.length} uncommitted change(s)`);
  return [{ check: 'changed-since', doc, severity: 'P2',
    detail: `${parts.join(' and ')} to ${codePaths.join(', ')} since ${sha}`,
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
  // A FENCED example row is documentation, not a claim -- the same rule
  // loadRegistry already applies. Parsing it made the audit try to read an
  // example document or run an example derivation and fail the whole run with
  // exit 2, and a heading inside the fence could switch `inClaims` off and
  // skip every real row after it.
  const allLines = text.split('\n');
  // And a row COMMENTED OUT rather than deleted, which is how a rule or a
  // claim is retired without losing it: it still registered as live, and a
  // heading-shaped line in the same comment could switch the section flag
  // off and skip every real row below it.
  // And an INDENTED example, which `trim()` on the next line turns straight
  // back into an executable declaration: `    | D | fake.md | | |` produced a
  // gating missing-path finding, and an indented heading in the same example
  // could end the section and skip every real row below it.
  const fenced = new Set([...fencedLines(allLines), ...commentedLines(allLines),
    ...indentedCodeLines(allLines)]);
  for (const [i, raw] of allLines.entries()) {
    if (fenced.has(i)) continue;
    const line = raw.trim();
    // A SETEXT heading ends the section too. Neither `Examples` nor its
    // `--------` underline starts with `#`, so section mode stayed on and an
    // illustrative table below it was executed as live configuration. The
    // heading is the line ABOVE the underline, so the section ends there.
    if (isSetextUnderline(allLines, i, fenced)) {
      inClaims = false;
      continue;
    }
    if (line.startsWith('#')) {
      // Exactly, for the reason given at the registry reader: `## Claims
      // methodology` is documentation about the mechanism, not claims.
      inClaims = headingIs(line, CLAIMS_HEADING);
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
  // Split on RUNS of whitespace. `grep-count  src foo` made `target` the empty
  // string and folded the path into the regex, so the empty pathspec grepped
  // the whole repository and returned a plausible, wrong count.
  const [kind, target, ...rest] = derivation.trim().split(/\s+/);
  const pattern = rest.join(' ');
  if (!target) throw new AuditError(`derivation has no target: ${derivation}`);
  if (!pattern) throw new AuditError(`derivation has no pattern: ${derivation}`);
  if (kind === 'grep-count' || kind === 'grep-files') {
    const flag = kind === 'grep-count' ? '-ohE' : '-lE';
    const paths = target.split(',').filter(Boolean);
    // No revision: the documents are read from the working tree, so the
    // counts come from the same tree. Measured against origin/main, a branch
    // that updates code and the doc counting it together was reported as
    // wrong; and in a shallow single-branch clone origin/main does not
    // resolve, which took the whole audit to exit 2 before any report.
    // Exit 1 is git grep's "no matches", and a real answer. Everything else
    // aborts the run.
    // ...and exit 1 is ALSO what a deleted or mistyped path gives, so a
    // derivation naming one silently derived zero: a false clean result for a
    // document claiming zero, and a fabricated count finding otherwise. The
    // paths are checked first, so exit 1 can only mean "no matches".
    // TRACKED, not merely present on disk. `git grep` searches the index, so a
    // path that exists but is untracked -- an ignored generated directory is
    // the ordinary case -- made this existence check pass while the search
    // covered no files and exited 1, which the caller then read as a
    // legitimate count of zero. A zero claim passed having measured nothing,
    // the same fabricated-result shape the existence check itself was added
    // to close.
    for (const p of paths) {
      if (!fs.existsSync(path.join(REPO, p))) {
        throw new AuditError(`derivation path \`${p}\` does not exist, so `
          + `\`${derivation}\` would derive 0 from a search that never ran`);
      }
      // `run`, not the injected `exec`: this is a precondition on the
      // REPOSITORY, the same category as the `fs.existsSync` check above it,
      // which also reads the real tree. `exec` is injected so a test can
      // control the MEASUREMENT, and a stub that answered this probe would be
      // asserting about a repository it does not have.
      if (!run('git', ['ls-files', '--', p], { okExitCodes: [1, 128] }).trim()) {
        throw new AuditError(`derivation path \`${p}\` is not tracked, so `
          + `\`${derivation}\` would derive 0 from a git grep that searched `
          + 'no files');
      }
    }
    // `-e` before the pattern, so a regex BEGINNING with `-` is read as data.
    // Counting Markdown list items is the natural reason to write one, and in
    // option position git grep exits 129 with an unknown-switch error rather
    // than deriving anything -- every regex the claims grammar admits has to
    // survive the trip.
    const out = exec('git', ['grep', flag, '-e', pattern, '--', ...paths], { okExitCodes: [1] });
    // RECORDS, not trimmed content. A derivation may deliberately match
    // whitespace -- `[[:space:]]+` is the natural way to count indentation --
    // and `git grep -o` then emits one whitespace-only line per match.
    // Trimming the whole result collapsed those to the empty string and
    // returned 0, so an incorrect zero claim passed and a correct nonzero one
    // was reported stale. Only the single trailing newline git appends is
    // removed; every other line is a match.
    return out ? out.replace(/\n$/, '').split('\n').length : 0;
  }
  if (kind === 'list-len') {
    let body;
    try {
      body = fs.readFileSync(path.join(REPO, target), 'utf8');
    } catch (err) {
      // Same split as claimPattern and the Claims document read: a registry
      // row naming a moved or deleted target is bad INPUT, and a bare
      // filesystem Error walks past the AuditError handler and exits 1.
      throw new AuditError(`list-len target \`${target}\` could not be read: ${err.message}`);
    }
    const m = claimPattern(pattern, '', 'list-len pattern').exec(body);
    if (!m) throw new AuditError(`list-len: ${pattern} matched nothing in ${target}`);
    // A valid regex that matches but has no group 1 left `m[1]` undefined, and
    // `.split` on it threw a plain TypeError: a stack trace and exit 1, the
    // status reserved for documentation findings.
    if (m[1] === undefined) {
      throw new AuditError(`list-len pattern \`${pattern}\` has no capture group 1; `
        + 'the list it counts is whatever group 1 holds');
    }
    return m[1].split(',').filter((s) => s.trim()).length;
  }
  throw new AuditError(`unknown derivation kind: ${kind}`);
}

/**
 * A registry pattern is INPUT. `new RegExp` throws a plain SyntaxError, which
 * walks past the AuditError handler and exits 1 -- the status this CLI
 * documents for documentation findings. The region path already made this
 * split; the Claims table needs it too, so a typo there exits 2.
 */
function claimPattern(pattern, flags, where) {
  try {
    return new RegExp(pattern, flags);
  } catch (err) {
    throw new AuditError(`${where} \`${pattern}\` is not a valid regular expression: `
      + err.message);
  }
}

export function checkClaims(claims, { exec = run } = {}) {
  const out = [];
  for (const { doc, pattern, derivation } of claims) {
    let text;
    try {
      text = fs.readFileSync(path.join(REPO, doc), 'utf8');
    } catch (err) {
      // Same split as claimPattern beside it: a registry row naming a moved or
      // deleted document is bad INPUT. A bare filesystem Error walks past the
      // AuditError handler and exits 1, the status reserved for findings.
      throw new AuditError(`claim document \`${doc}\` could not be read: ${err.message}`);
    }
    const re = claimPattern(pattern, 'g', 'claim pattern');
    const actual = derive(derivation, { exec });
    let hits = 0;
    for (const m of text.matchAll(re)) {
      hits += 1;
      // A pattern that matches prose without group 1 made `Number(undefined)`
      // NaN, and the audit emitted a fabricated count-claim finding with exit
      // 1 rather than treating the registry row as invalid input with exit 2.
      if (m[1] === undefined || !/^\d+$/.test(m[1].trim())) {
        throw new AuditError(`claim pattern \`${pattern}\` for ${doc} matched, but capture `
          + `group 1 is ${JSON.stringify(m[1])} rather than a number; the claim it `
          + 'watches is whatever group 1 holds');
      }
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
const CONTRACT_STALE_RE = /^\[api-contract\] .*\b(?:stale|missing)\b/im;
// The same run reports two different broken invariants. Naming the vendored
// snapshot for a stale GENERATED type tells the reader the snapshot no longer
// matches stocks when it matches fine, and points the fix at the wrong file.
const CONTRACT_GENERATED_RE =
  /^\[api-contract\] .*stocksOpenApi\.gen\.d\.ts\b.*\b(?:stale|missing)\b/im;
const GENERATED_TYPES = 'src/types/stocksOpenApi.gen.d.ts';

export function checkContractSync({ spawn = spawnSync } = {}) {
  // STOCKS_OPENAPI_FILE / _REF would point sync-api-contract at a local file
  // or a non-main ref while this check reports the invariant as "matches
  // stocks main" -- a clean Class A result for a snapshot that is stale
  // against main. The audit states the upstream, so it also chooses it.
  const env = { ...process.env };
  delete env.STOCKS_OPENAPI_FILE;
  delete env.STOCKS_OPENAPI_REF;
  const res = spawn('node', ['scripts/sync-api-contract.mjs', '--check'],
    { cwd: REPO, encoding: 'utf8', env });
  const why = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim();
  if (res.error) throw new AuditError(`contract:check could not run: ${res.error.message}`);
  if (res.status === 0) return [];
  // sync-api-contract.mjs exits 1 for "compared, and stale" and 2 for a non-OK
  // HTTP response. But Node ALSO exits 1 for anything it did not catch -- a
  // DNS failure inside fetch(), a malformed body in JSON.parse, a missing
  // package -- so the exit status alone cannot separate a verdict from a
  // crash. The script's verdict is the `[api-contract] ... stale|missing`
  // line it writes to stderr; nothing else counts. Reporting an unreachable
  // upstream as "the snapshot is stale, run contract:sync" tells someone to
  // resync against a contract that was never compared -- a fabricated result,
  // which is the rule this module exists to enforce (Rule 4).
  const verdict = res.status === 1 && CONTRACT_STALE_RE.test(res.stderr ?? '');
  if (!verdict) {
    throw new AuditError(
      `contract:check could not compare the snapshot (exit ${res.status}, a transport `
      + `or execution failure, not a verdict); the audit cannot report on the vendored `
      + `OpenAPI contract. (${why.split('\n').slice(0, 2).join(' ').slice(0, 200)})`);
  }
  const tail = why.split('\n').slice(0, 3).join(' ').slice(0, 200);
  if (CONTRACT_GENERATED_RE.test(res.stderr ?? '')) {
    return [{ check: 'class-a', doc: GENERATED_TYPES, severity: 'P1',
      detail: `contract:check is red: the generated types no longer match the vendored `
            + `OpenAPI snapshot, so the assignability checks over them prove nothing. `
            + `Run \`npm run contract:sync\`. (${tail})` }];
  }
  return [{ check: 'class-a', doc: 'tests/fixtures/stocks-openapi.json', severity: 'P1',
    detail: `contract:check is red: the vendored OpenAPI snapshot no longer matches `
          + `stocks main, so every type and fixture derived from it is unverified. `
          + `Run \`npm run contract:sync\`. (${tail})` }];
}

// ── cli ─────────────────────────────────────────────────────────────────────

const VALUE_FLAGS = {
  '--since': 'since',
  '--issues-snapshot': 'issuesSnapshot',
  '--write-issues-snapshot': 'writeIssuesSnapshot',
  '--date': 'date',
};

/**
 * Parse argv, rejecting anything unrecognised.
 *
 * Silently ignoring an unknown option meant `--chek` left `args.check` false:
 * the audit printed its findings and exited 0, so a typo in a CI invocation
 * turned the gate off without a word. Exit status is this CLI's contract with
 * automation, and a contract that a misspelling can void is not one.
 */
/** A YYYY-MM-DD string that names a real day: `2026-02-30` rolls over. */
export function isCalendarDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
}

export function parseArgs(argv) {
  const a = { verify: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--json') a.json = true;
    else if (t === '--check') a.check = true;
    else if (t === '--stamp') a.stamp = true;
    else if (t === '--verify') {
      const before = a.verify.length;
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) a.verify.push(argv[++i]);
      // `--stamp --verify` with the path forgotten is a scan-only pass the
      // operator believes recorded a review.
      if (a.verify.length === before) throw new AuditError(`${t} needs a value`);
    } else if (t === '--contract-check' || t === '--no-contract-check') {
      a.contractCheck = t === '--contract-check';
    } else if (VALUE_FLAGS[t]) {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) {
        throw new AuditError(`${t} needs a value`);
      }
      a[VALUE_FLAGS[t]] = v;
    } else {
      throw new AuditError(`unknown option: ${t}`);
    }
  }
  // `--stamp --date bad` wrote `bad` into every marker as Last scanned; on
  // the next run MARKER_RE stopped at the prefix, extraSegments kept the
  // malformed field as prose, and each document ended up with two.
  if (a.date !== undefined && !isCalendarDate(a.date)) {
    throw new AuditError(`--date ${a.date} is not a calendar day (YYYY-MM-DD)`);
  }
  // A review is recorded only by writing a marker; --verify without --stamp
  // is a no-op that reads as if it had recorded one.
  if (a.verify.length && !a.stamp) throw new AuditError('--verify requires --stamp');
  // A real but FUTURE --date passed validation and was written into every
  // `Last scanned`, while the same run compared existing markers against that
  // same future "today" and saw nothing wrong. The next ordinary audit then
  // emitted P1 future-date findings for markers this tool had just written.
  if (a.date && a.stamp && a.date > new Date().toISOString().slice(0, 10)) {
    throw new AuditError(`--date ${a.date} is in the future; --stamp would write `
      + 'markers that the next ordinary audit reports as future-dated');
  }
  return a;
}

/** The stamp actions that leave the requested review recorded on disk. */
export const RECORDS_REVIEW = new Set(['inserted', 'updated', 'unchanged']);

const STAMP_REFUSALS = {
  'baseline-predates-doc': 'the reviewed-against commit does not contain the document, '
    + 'so the review would name a baseline predating it; commit it first',
  'skipped-no-h1': 'no H1 to place a marker after',
  'skipped-misplaced-marker': 'a marker outside the first paragraph after the H1; '
    + 'move it there rather than adding a second',
  'skipped-legacy-content': 'a legacy marker carrying prose that rewriting would delete',
};

/**
 * Every --verify path must have been consumed by a document whose marker was
 * actually written, or the review it was asked to record was never recorded:
 * `--verify nope.md` used to stamp everything else scan-only and exit 0
 * without a word.
 *
 * This takes the ACTIONS rather than a set of candidates on purpose. The set
 * was filled before stamp() ran, so a document stamp() declines --
 * `skipped-no-h1`, or `skipped-legacy-content` for a legacy line carrying
 * prose that rewriting would delete -- still satisfied the check, and
 * `--stamp --verify <doc>` exited 0 having written nothing. Passing the
 * action makes that ordering unrepresentable rather than merely corrected.
 *
 * `unchanged` counts: the marker on disk is already byte-identical to what
 * would be written, so refusing it would fail a re-run of a review that IS
 * recorded.
 */
export function checkVerifyTargets(verify, stampActions) {
  const missing = [...verify].filter((v) => !RECORDS_REVIEW.has(stampActions.get(v)));
  if (missing.length) {
    const named = missing.map((d) => {
      const action = stampActions.get(d);
      return action ? `${d} (${STAMP_REFUSALS[action] ?? action})` : d;
    });
    throw new AuditError(`--verify ${named.join(', ')}: the review could not be recorded `
      + '(not a tracked doc, or Class B/C/X, or a machine-owned file with nowhere to stamp)');
  }
}

/** What a stamp did, with a depth only when something was written. */
export function stampRecord(doc, res, reviewed) {
  const wrote = res.action === 'inserted' || res.action === 'updated';
  return { doc, action: res.action, depth: wrote ? (reviewed ? 'verified' : 'scan-only') : null };
}

/**
 * Write every marker, or refuse before writing any.
 *
 * Each marker went out through a bare writeFileSync, so a read-only or deleted
 * document threw a plain filesystem error, the handler at the bottom of this
 * file rethrew it, and Node exited 1 -- the status reserved for findings. The
 * writes are also sequential, so it could stop partway and leave the tree half
 * stamped with nothing saying where.
 *
 * Every target is checked first. That narrows the window rather than closing
 * it: a full disk still fails mid-loop, and accessSync answers for the calling
 * uid, which under root calls a mode-444 file writable. So the loop reports how
 * far it got instead of pretending the operation was atomic.
 */
export function writeStamps(writes, { repo = REPO, fsImpl = fs } = {}) {
  const unwritable = writes
    .map((w) => w.doc)
    .filter((doc) => {
      try {
        fsImpl.accessSync(path.join(repo, doc), fsImpl.constants.W_OK);
        return false;
      } catch {
        return true;
      }
    });
  if (unwritable.length) {
    throw new AuditError(`--stamp cannot write ${unwritable.sort().join(', ')}: missing or `
      + 'not writable. Nothing was written.');
  }
  // A tracked `.md` SYMLINK is not a document this command may write. Both the
  // read and the write follow it, so --stamp edited the link's target rather
  // than a repository file -- and a symlink committed on a branch could point
  // anywhere writable, inside the checkout or outside it. Checked before any
  // write, so one bad path stops the whole batch rather than half of it.
  const links = writes
    .map((w) => w.doc)
    .filter((doc) => {
      try {
        return fsImpl.lstatSync(path.join(repo, doc)).isSymbolicLink();
      } catch {
        return false;
      }
    });
  if (links.length) {
    throw new AuditError(`--stamp refuses ${links.sort().join(', ')}: a tracked `
      + 'symlink, so the write would land on its target rather than a document '
      + 'in this repository. Nothing was written.');
  }
  const done = [];
  for (const w of writes) {
    try {
      // Temp file in the SAME directory, then rename. `writeFileSync` opens
      // with O_TRUNC, so a failure part-way through -- a full disk is the
      // ordinary cause -- leaves the document truncated while the error
      // reports only the previously completed entries and implies this one
      // was untouched. A rename within a directory is atomic, so a failed
      // stamp leaves the original intact and the error tells the truth.
      const target = path.join(repo, w.doc);
      const tmp = path.join(path.dirname(target), `.${path.basename(target)}.stamp-tmp`);
      try {
        fsImpl.writeFileSync(tmp, w.text);
        // The temp file is created with default permissions and then REPLACES
        // the original, so stamping a tracked executable Markdown file turned
        // it from mode 100755 to 100644 -- an unrelated diff, and a broken
        // consumer wherever the bit mattered. Carried over before the rename.
        // Best effort: a filesystem that cannot report or set a mode is not a
        // reason to refuse the stamp, and the rename below is still atomic.
        try {
          if (fsImpl.statSync && fsImpl.chmodSync) {
            fsImpl.chmodSync(tmp, fsImpl.statSync(target).mode);
          }
        } catch { /* mode unavailable -- the write itself still stands */ }
        fsImpl.renameSync(tmp, target);
      } catch (err) {
        // Best effort, and never masking the original error: the temp file is
        // this function's litter, and failing to remove it is not the failure
        // worth reporting.
        try { fsImpl.unlinkSync(tmp); } catch { /* cleanup only */ }
        throw err;
      }
    } catch (err) {
      // `${w.doc} is unchanged` is now true, and was not before: the write
      // goes to a temp file and is renamed into place, so a failure leaves
      // the original document byte-for-byte as it was. The earlier wording
      // said only "the tree is partially stamped", which left a reader
      // unable to tell whether the named document had been truncated.
      throw new AuditError(`--stamp failed writing ${w.doc}: ${err.message}. `
        + `${w.doc} is unchanged; ${done.length} of ${writes.length} documents `
        + 'were already stamped'
        + (done.length ? ` (${done.join(', ')})` : '')
        + '; the tree is partially stamped.');
    }
    done.push(w.doc);
  }
  return done;
}

/**
 * What `--check` exits with. P1 and P2 only.
 *
 * P3 is the standing worklist -- legacy marker lines a human must merge, and
 * documents nobody has reviewed yet. Both are real and both are reported;
 * neither is a reason to fail a build, and a gate that can never go green is
 * not a gate. `checkProvenance` emits P3 for exactly that reason, and gating
 * on `findings.length` contradicted it: the moment every actionable finding
 * was cleared, --check stayed red on the worklist forever. Same rule as the
 * Python twin.
 */
export const BLOCKING_SEVERITIES = new Set(['P1', 'P2']);

export function checkExitCode(check, findings) {
  if (!check) return 0;
  return findings.some((f) => BLOCKING_SEVERITIES.has(f.severity)) ? 1 : 0;
}

export function summariseStamps(stamped) {
  const changed = stamped.filter((s) => s.action === 'inserted' || s.action === 'updated').length;
  const unchanged = stamped.filter((s) => s.action === 'unchanged').length;
  return { changed, unchanged, skipped: stamped.length - changed - unchanged };
}

export function main(argv) {
  const args = parseArgs(argv);
  const today = args.date || new Date().toISOString().slice(0, 10);
  const baseRef = resolveBaseRef();
  // Both paths go through resolveCommit: see there for why a bare --short is
  // not safe to write into a marker.
  // The ancestry constraint applies only when a review is being RECORDED: an
  // ordinary scan against the base ref is trivially contained, and an explicit
  // --since used to read drift is a question, not a claim written to disk.
  const head = resolveCommit(args.since ?? baseRef,
    args.since && args.verify.length ? { ancestorOf: baseRef } : {});

  const regPath = path.join(REPO, REGISTRY);
  if (!fs.existsSync(regPath)) {
    process.stderr.write(`error: ${REGISTRY} not found; every doc would be unclassified\n`);
    return 2;
  }
  // Exit 2, matching the audited-document reads. A registry that exists but
  // cannot be read is an audit that could not run, not a documentation
  // finding, and a bare throw here exited 1 with a stack trace.
  let registryText;
  try {
    registryText = fs.readFileSync(regPath, 'utf8');
  } catch (err) {
    throw new AuditError(`${REGISTRY} exists but cannot be read (${err.message}); `
      + 'every document would be unclassified, so the audit cannot run');
  }
  const registry = loadRegistry(registryText);

  // The documents come from the working tree; the base ref is consulted only
  // for what USED to be there (drift, ancestry, deleted root files).
  const tracked = workingTreeFiles();
  // A DIFFERENT ref from baseRef on purpose: the tree before this branch, so a
  // path deleted on the branch is still recognised as this repo's. Falls back
  // to baseRef in a checkout with no main, where there is no history to read.
  const historyRef = resolveBaseRef(HISTORY_REF_CANDIDATES);
  const baseTracked = new Set(
    run('git', ['ls-tree', '-r', historyRef, '--name-only']).trim().split('\n'));
  const docs = documentSet(tracked, registry);

  let states;
  if (args.issuesSnapshot) states = loadIssuesSnapshot(args.issuesSnapshot);
  else states = { [THIS_REPO]: fetchIssueStates(THIS_REPO), [SIBLING_REPO]: fetchIssueStates(SIBLING_REPO) };
  if (args.writeIssuesSnapshot) writeIssuesSnapshot(args.writeIssuesSnapshot, states);
  const ctx = { states, ...linkContext(tracked, baseTracked, registry) };

  // Registry rows are validated against the tree before anything is
  // classified: a row naming a deleted document, or a code path that no
  // longer exists, is a declaration resolving to nothing rather than
  // nothing to report.
  const findings = checkRegistryPaths(tracked, registry);
  const regionMaps = {};
  // Class A delivery: is this repo's one machine-written artefact in sync?
  // This used to be skipped whenever --issues-snapshot was passed, which
  // coupled an OpenAPI check to an unrelated flag: an offline issue-state run
  // reported Class A clean no matter how stale the vendored snapshot was.
  // The opt-out is now its own flag, and it defaults to running.
  if (args.contractCheck !== false) findings.push(...checkContractSync());
  findings.push(...checkClaims(loadClaims(fs.readFileSync(regPath, 'utf8'))));
  const stamped = [];
  const stampTargets = new Map();
  const writes = [];
  const verify = new Set(args.verify.map((v) => v.replace(/^\.\//, '')));
  const counts = { A: 0, B: 0, C: 0, D: 0, X: 0, unclassified: 0 };

  for (const doc of docs) {
    const { cls, codePaths, regions, ambiguous } = classify(doc, registry);
    if (ambiguous) {
      findings.push({ check: 'registry', doc, severity: 'P1',
        detail: 'two equally specific registry rows give this document different '
              + 'classes; the audit picked one by table order, so the other row\'s '
              + 'checks are silently not running, and the document is skipped '
              + 'entirely until the registry says which rule owns it' });
      // And SKIP it. Recording the finding and then proceeding on the
      // first-by-table-order rule meant --stamp could write into a file whose
      // ownership is explicitly unresolved -- inserting a marker into content
      // the other rule declares machine-owned, or stamping a document the
      // other rule freezes. An unresolved owner is not a licence to pick one.
      continue;
    }
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

    // Exit 2, not a traceback. A tracked document made unreadable by
    // permissions, or deleted between the inventory read and here, threw a
    // plain filesystem error that the handler rethrew -- Node then exited 1,
    // the status this CLI documents for FINDINGS, so automation could not tell
    // "this documentation has problems" from "the audit never ran".
    // A SYMLINK is refused before it is read, not only before it is written.
    // Following one audits the target's machine-local bytes as though they
    // were committed under this path: a clean result another clone does not
    // reproduce, and a read that can leave the checkout entirely. writeStamps
    // already refuses them; a read-only --check had no such guard, which made
    // the refusal a property of the command rather than of the tree.
    let text;
    try {
      if (fs.lstatSync(path.join(REPO, doc)).isSymbolicLink()) {
        throw new AuditError(`${doc} is a tracked symlink, so reading it would audit `
          + 'its target rather than a document in this repository; the result would '
          + 'not reproduce in another clone');
      }
      text = fs.readFileSync(path.join(REPO, doc), 'utf8');
    } catch (err) {
      if (err instanceof AuditError) throw err;
      throw new AuditError(`${doc} is in the audited tree but cannot be read `
        + `(${err.message}); the audit cannot report on a document it could not open`);
    }

    // Class C is read for cross-references and nothing else: no issue
    // freshness, no marker, no rewriting. See contentChecks for why.
    if (cls === 'C') {
      findings.push(...contentChecks(cls, doc, text, ctx));
      continue;
    }

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
      if (r.regionMap) regionMaps[doc] = r.regionMap;
      stampable = classAIsStampable(r, text);
    }

    const content = contentChecks(cls, doc, text, ctx);
    if (cls === 'A') for (const f of content) f.region = regionOf(f.line ?? 0, owned, prompt);
    findings.push(...content);

    if (!stampable) continue;

    const docLinesForMarker = text.split('\n');
    const prev = findMarker(docLinesForMarker);
    const allMarkers = findMarkers(docLinesForMarker);
    if (h1Index(docLinesForMarker) === null) {
      // Reported in its own right, and BEFORE the missing-marker case, because
      // it is the reason the marker has nowhere to go. Saying only "no review
      // marker" sends someone to add one, and --stamp then refuses with
      // `skipped-no-h1` and no explanation of what to do instead.
      findings.push({ check: 'marker', doc, severity: 'P2',
        detail: 'no H1, so there is nowhere a review marker may live; the registry '
              + 'places it in the first paragraph after the first H1' });
    } else if (!prev && allMarkers.length) {
      // Misplaced, not missing. Reporting "no review marker" sent someone to
      // add one, and --stamp then refuses -- or, before it refused, inserted
      // a second beside the visible original.
      findings.push({ check: 'marker', doc, severity: 'P2',
        detail: `a review marker sits on line ${allMarkers[0] + 1}, outside the first `
              + 'paragraph after the H1 where the registry places it; move it there '
              + 'rather than adding a second' });
    } else if (!prev) {
      findings.push({ check: 'marker', doc, severity: 'P2', detail: 'no review marker' });
    } else if (allMarkers.length > 1) {
      findings.push({ check: 'marker', doc, severity: 'P2',
        detail: `${allMarkers.length} review markers in the opening section `
              + `(lines ${allMarkers.map((n) => n + 1).join(', ')}); they can disagree `
              + 'about date, owner or reviewed-against SHA, and --stamp updates only '
              + 'the first' });
    } else {
      if (prev.legacy) {
        findings.push({ check: 'marker', doc, severity: 'P3',
          detail: `legacy label, date ${prev.date}; normalise to Last reviewed` });
      }
      findings.push(...checkMarkerDates(doc, prev, today, docLinesForMarker[prev.idx]));
      // Whether the drift range can be asked for at all. A syntactically
      // valid SHA the checkout does not HOLD -- an older `Against` commit in
      // a depth-one CI clone is the ordinary case -- recorded the P2 below and
      // then still reached checkChangedSince, whose `git log <sha>..<baseRef>`
      // exits 128 and raises. One unreadable marker took the whole audit to
      // exit 2 with no findings emitted at all, which is the opposite of what
      // a per-document finding is for.
      let driftable = Boolean(prev.sha);
      if (prev.sha) {
        // `git merge-base --is-ancestor` reports through its EXIT STATUS and
        // prints nothing, so testing its stdout for '' treats every SHA --
        // ancestor or not -- as suspect. Read the status.
        const anc = spawnSync('git', ['merge-base', '--is-ancestor', prev.sha, baseRef],
          { cwd: REPO, encoding: 'utf8' });
        if (anc.status !== 0) {
          // 128 is "no such commit", any other non-zero is "not an ancestor".
          // Neither can support a drift range, and they are different facts,
          // so they are reported as different findings rather than one.
          findings.push({ check: 'marker', doc, severity: 'P2',
            detail: anc.status === 128
              ? `reviewed-against ${prev.sha} is not a commit this checkout holds, `
                + 'so drift since the review cannot be measured'
              : `reviewed-against ${prev.sha} is not an ancestor of ${baseRef}` });
          driftable = false;
        }
      }
      // A marker reading `unknown`, or carrying no `Against`, passes every
      // check above while supporting no drift check at all -- so `--stamp`
      // could clear the missing-marker finding with nobody having reviewed
      // anything, and once the unrelated findings are fixed `--check` reports
      // clean over documents that explicitly say nobody has read them.
      //
      // P3, because --check gates on P1/P2: these belong on the standing
      // worklist and must not hold a build red forever. The Python twin uses
      // the same severity for the same reason (stocks#1121).
      findings.push(...checkProvenance(doc, prev));
      findings.push(...checkChangedSince(doc, driftable ? prev.sha : null, codePaths, baseRef));
    }

    if (args.stamp) {
      // Never write a marker into a generated region, whether it would be
      // inserted there or already sits there.
      const why = stampGuard(text, owned);
      if (why) {
        findings.push({ check: 'unowned', doc, severity: 'P2', detail: why });
        continue;
      }
      const reviewed = verify.has(doc);
      // A review records "these claims were true against THIS revision". For a
      // document the revision does not contain -- a staged-new file, the case
      // that reaches here -- that sentence is simply false, and nothing later
      // catches it: this module has no document-level drift check, so the SHA
      // is never read back against the document at all. Raised on the Python
      // twin (stocks#1121), where the doc-drift check DOES read it and, given
      // an absent blob, reported "nothing changed". The answer either way is
      // to commit the document and stamp against a revision that holds it.
      if (reviewed && !pathInCommit(head, doc)) {
        stampTargets.set(doc, 'baseline-predates-doc');
        continue;
      }
      const res = stamp(text, today, reviewed ? 'verified' : 'scanned', head, reviewed);
      stampTargets.set(doc, res.action);
      const record = stampRecord(doc, res, reviewed);
      if (record.depth) writes.push({ doc, text: res.text });
      stamped.push(record);
    }
  }

  // Nothing is written until every requested review has a document to land
  // on, so a misspelled --verify aborts the run instead of half of it.
  if (args.stamp) {
    checkVerifyTargets(verify, stampTargets);
    writeStamps(writes);
  }

  const summary = {};
  for (const f of findings) summary[f.check] = (summary[f.check] ?? 0) + 1;
  const report = { date: today, baseRef, head, docs: docs.length, classes: counts,
    regions: regionMaps, findings, stamped, summary };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`docs ${docs.length}  classes ${JSON.stringify(counts)}  head ${head} (${baseRef})\n`);
    for (const [d, rm] of Object.entries(regionMaps).sort()) {
      if (rm.unowned_lines) {
        process.stdout.write(`  region: ${d} — ${rm.unowned_lines} of ${rm.lines} lines hand-written (audit as Class D)\n`);
      }
    }
    for (const [k, v] of Object.entries(summary).sort()) process.stdout.write(`  ${k}: ${v}\n`);
    for (const f of findings) {
      process.stdout.write(`  [${f.severity}] ${f.check}: ${f.doc}${f.line ? `:${f.line}` : ''} — ${f.detail}\n`);
    }
    if (stamped.length) {
      const { changed, unchanged, skipped } = summariseStamps(stamped);
      process.stdout.write(`  stamped: ${changed} changed, ${unchanged} unchanged, ${skipped} skipped\n`);
      for (const s of stamped) {
        if (!s.depth) process.stdout.write(`    ${s.action}: ${s.doc}\n`);
      }
    }
  }

  return checkExitCode(args.check, findings);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    // exitCode, not exit(): process.exit() can terminate Node before a
    // buffered write to a pipe has flushed, truncating a large JSON report
    // while still returning the intended status.
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof AuditError) {
      // RETURN. This used to be process.exit(2), which made the rethrow below
      // unreachable; switching to exitCode so a piped report can flush made it
      // reachable, so every handled AuditError printed a stack trace and
      // exited 1 -- the status reserved for findings. A regression introduced
      // by the flush fix, not a pre-existing one.
      process.stderr.write(`error: ${err.message}\n`);
      process.exitCode = 2;
    } else {
      throw err;
    }
  }
}
