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
// Whole cues, not substrings. An unbounded `blocking|blocked by|...` matched
// inside `nonblocking` and `not blocked by`, so prose stating an issue is NOT
// a blocker produced a P1 against it once it closed -- a finding whose own
// source line says the opposite. `\b` alone stops `nonblocking`; the negator
// scan below stops the spaced and hyphenated forms.
const BLOCKING_CUE_RE =
  /\b(?:blocking|blocked by|open issues?|still open|outstanding|in progress|not started|pending)\b/gi;
// Text immediately before a cue that inverts it. `not started` is itself a
// cue, so what precedes it is what is tested -- the leading `not` is never
// read as negating the phrase it belongs to.
const CUE_NEGATOR_RE = /\b(?:not|non|never|no longer|without|un)[\s-]*$/i;

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
const URL_RE = /https?:\/\/\S+/g;

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
export function citesLiveWork(line, start, end) {
  const clause = citationClause(line, start, end);
  BLOCKING_CUE_RE.lastIndex = 0;
  if (BLOCKING_CUE_RE.test(clause)) return hasBlockingCue(clause);
  return hasBlockingCue(line);
}
// The fragment is CAPTURED, not discarded. Dropping it meant a link to a real
// file but a heading that does not exist always passed. The Python twin had
// the same gap, where 35 such links were measured (stocks#1121).
// The optional TITLE is admitted and discarded. `[guide](missing.md "Guide")`
// is standard CommonMark; requiring `)` straight after the destination meant
// the pattern did not match at all, so a missing target reported clean rather
// than dead.
const MD_LINK_RE =
  /\[[^\]]*\]\(([^)#\s]*)(?:#([^)\s]+))?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g;
// Two shapes: a path with a slash, and a bare root-level filename. Requiring a
// slash meant `vite.config.ts`, `playwright.config.ts` and `package.json` --
// which the living docs cite constantly -- could never produce a dead-path
// finding. The bare shape must admit a dotted stem: `vite.config.ts` and
// `playwright.config.ts` are the two most-cited root files here (12 and 15
// mentions) and a stem of `[A-Za-z0-9_-]+` matched neither. A bare name is
// only checked against the root files this repo tracks (see checkDeadLinks),
// because the docs also name `mocks.ts`, `main.py`, `deploy.sh` and a hundred
// other bare files that live under a directory or in the sibling repo.
// The extension admits six characters because `.drawio` has six, and a
// five-character cap made both diagrams uncitable rather than unchecked.
// A citation may carry a source location after the path: `src/App.tsx:44-72`,
// `vite.config.ts:7,45,93`, `SwingMode.tsx:156`. Requiring the closing
// backtick right after the extension made every such citation invisible.
const LINE_SUFFIX = '(?::\\d+(?:-\\d+)?(?:,\\d+(?:-\\d+)?)*)?';
const BACKTICK_PATH_RE = new RegExp(`\`([A-Za-z0-9_./-]+/[A-Za-z0-9_.-]+\\.[A-Za-z0-9]{1,6})${LINE_SUFFIX}\``, 'g');
const BACKTICK_ROOT_FILE_RE = new RegExp(`\`([A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+)*\\.[A-Za-z0-9]{1,6})${LINE_SUFFIX}\``, 'g');
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
export function resolveCommit(ref, { spawn = spawnSync } = {}) {
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
  return sha;
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

export function documentSet(tracked, registry) {
  const named = new Set(registry.filter((r) => !/[*?[]/.test(r.glob)).map((r) => r.glob));
  return [...tracked].filter((p) => p.endsWith('.md') || named.has(p)).sort();
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
  return [wildcards === 0 ? 1 : 0, glob.replace(/[*?[\]]/g, '').length, -wildcards];
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
      let from = 0;
      for (;;) {
        const lo = lines.findIndex((l, n) => n >= from && begin.test(l));
        if (lo < 0) break;
        const hi = lines.findIndex((l, n) => n > lo && end.test(l));
        if (hi < 0) break;
        for (let n = lo + 1; n <= hi + 1; n += 1) owned.add(n);
        hit = true;
        from = hi + 1;
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
      lines.forEach((line, i) => {
        if (pat.test(line)) { owned.add(i + 1); hit = true; }
      });
    } else if (spec === 'exhaustive') {
      exhaustive = true;
      hit = true;
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
  const spans = prompt ? [] : unownedSpans(text, owned);
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

/**
 * Where a DOCUMENT-level marker may live: after the H1, before the next heading.
 *
 * A flat first-40-lines scan had two failure modes. It let a later section's
 * metadata stand in for the document's provenance, and — because `stamp`
 * inserts after the H1 wherever that is — it could not find its own marker in a
 * file with more than 40 lines of front matter, so the next run reported the
 * marker missing and inserted a duplicate.
 */
export function markerWindow(lines, limit = 40) {
  const h1 = h1Index(lines);
  if (h1 === null) return { from: 0, to: Math.min(limit, lines.length) };
  let stop = lines.length;
  for (let j = h1 + 1; j < Math.min(h1 + 1 + limit, lines.length); j += 1) {
    if (lines[j].startsWith('#')) { stop = j; break; }
  }
  return { from: h1 + 1, to: Math.min(stop, h1 + 1 + limit, lines.length) };
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
export function checkMarkerDates(doc, prev, today) {
  const out = [];
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
  if (!missing.length) return [];
  return [{ check: 'marker', doc, severity: 'P3',
    detail: `incomplete provenance: ${missing.join('; ')}` }];
}

/** Lines inside a fenced code block, which are examples rather than content. */
export function fencedLines(lines) {
  const fenced = new Set();
  // The OPENING delimiter is remembered. Toggling on any fence-looking line
  // meant a `~~~` inside a ``` example closed the block, so the rest of the
  // example was read as prose and the prose after the real closing fence was
  // read as code -- false findings and suppressed ones from one line.
  // CommonMark: a fence closes only on the same character, at least as long,
  // and with no info string.
  let open = null;
  lines.forEach((line, i) => {
    const m = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!open) {
      // An opening ``` fence may not carry a backtick in its info string.
      if (m && !(m[1][0] === '`' && m[2].includes('`'))) {
        open = m[1];
        fenced.add(i);
      }
      return;
    }
    fenced.add(i);
    if (m && m[1][0] === open[0] && m[1].length >= open.length && m[2].trim() === '') {
      open = null;
    }
  });
  return fenced;
}

export function findMarker(lines) {
  const { from, to } = markerWindow(lines);
  const fenced = fencedLines(lines);
  for (let i = from; i < to; i += 1) {
    // An INDENTED marker-shaped line is an example, not the document's
    // provenance: trimming before parsing let a four-space code sample count
    // as the marker, suppressed the real missing-marker finding, and --stamp
    // then replaced the example with an unindented live marker, destroying
    // the example's structure. Fenced blocks are excluded for the same reason.
    if (fenced.has(i) || /^\s/.test(lines[i])) continue;
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
  // A fenced `# Example` before the real title was returned as the H1, so
  // markerWindow missed a marker after the REAL heading and --stamp inserted a
  // live marker inside the code block: the example corrupted, the document
  // still carrying no rendered provenance. The heading and marker scanners
  // already skip fenced lines.
  const fenced = fencedLines(lines);
  for (let i = 0; i < lines.length; i += 1) {
    if (!fenced.has(i) && H1_RE.test(lines[i])) return i;
  }
  return null;
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
  const h1 = h1Index(lines);
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
  // Both blanks, not just the leading one. An H1 followed straight by body
  // text gave `# Title` / '' / marker / body, and Markdown renders the marker
  // and the opening sentence as a SINGLE paragraph -- not the first-paragraph
  // marker shape this promises, and it changes how the opening content reads.
  // The Python twin already inserts both (stocks#1121).
  else lines.splice(h1 + 1, 0, '', marker, '');
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
  const fenced = fencedLines(lines);
  lines.forEach((line, i) => {
    if (fenced.has(i)) return;
    if (!hasBlockingCue(line)) return;
    for (const m of line.matchAll(ISSUE_URL_RE)) {
      if (!citesLiveWork(line, m.index, m.index + m[0].length)) continue;
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
export function headingSlug(heading) {
  let s = heading.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/[*_]/g, '').trim().toLowerCase();
  return s.replace(/[^\w\s-]/g, '').replace(/ /g, '-');
}

/** Every anchor a document offers, duplicates numbered as GitHub numbers them. */
export function headingAnchors(text) {
  const seen = new Map();
  const out = new Set();
  // A `# ` line inside a fenced block is code, and GitHub creates no anchor
  // for it -- docs/E2E_TEST_PLAN.md:59 has exactly that. Recording it invented
  // an anchor, so a link to a fragment that does not exist PASSED the
  // dead-anchor check. Marker parsing already excludes fenced lines; this is
  // the same rule for the same reason.
  const lines = text.split('\n');
  const fenced = fencedLines(lines);
  for (const [i, line] of lines.entries()) {
    if (fenced.has(i)) continue;
    // `## Install ##` renders as `Install`, and GitHub's anchor is `install`.
    // Passing `Install ##` to headingSlug recorded `install-`, so a valid link
    // to `#install` was reported dead.
    const m = /^#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(line);
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
  return out;
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
      } catch {
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
  const fenced = fencedLines(lines);

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
  lines.forEach((line, i) => {
    if (fenced.has(i)) return;
    const m = /^ {0,3}\[([^\]^][^\]]*)\]:\s+(\S+)/.exec(line);
    if (m) refDefs.set(m[1].trim().toLowerCase(), { target: m[2].replace(/^<|>$/g, ''), line: i + 1 });
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
      norm = path.posix.normalize(tgt.startsWith('/') ? tgt.slice(1) : path.posix.join(base, tgt));
      if (norm.startsWith('..')) return;
      if (!tracked.has(norm) && !isTrackedDir(tracked, norm)) {
        out.push({ check: 'dead-link', doc, line: lineNo, severity: 'P2', detail: what });
        return;
      }
    }
    if (frag && norm.endsWith('.md')) {
      const have = anchorsOf(norm);
      if (have && !have.has(frag.toLowerCase())) {
        out.push({ check: 'dead-anchor', doc, line: lineNo, severity: 'P2',
          detail: `${anchorWhat}#${frag}: the target has no such heading` });
      }
    }
  };

  for (const [label, { target, line }] of refDefs) {
    const [tgt, frag] = target.split('#');
    checkTarget(tgt, frag, line, label);
  }
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
    for (const m of line.matchAll(MD_LINK_RE)) checkTarget(m[1], m[2], i + 1);
    // A backticked path is this repo's to resolve only when nothing says
    // otherwise: its extension is one this tree tracks, and the citation is
    // not the sibling repo's. Ownership is decided per citation, not per
    // line: docs/TEST_COVERAGE_AUDIT.md:104 has a stocks docs/API.md link in
    // one cell and a local src/lib path in another, and a line-level marker
    // hid the local one.
    if (!backtickedPaths) return;
    const crossRepo = crossRepoCitations(line);
    for (const m of line.matchAll(BACKTICK_PATH_RE)) {
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
      if (inLinkLabel(m.index) || crossRepo.has(m.index)
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
    // No revision: the documents are read from the working tree, so the
    // counts come from the same tree. Measured against origin/main, a branch
    // that updates code and the doc counting it together was reported as
    // wrong; and in a shallow single-branch clone origin/main does not
    // resolve, which took the whole audit to exit 2 before any report.
    // Exit 1 is git grep's "no matches", and a real answer. Everything else
    // aborts the run.
    const out = exec('git', ['grep', flag, pattern, '--', ...paths], { okExitCodes: [1] });
    return out.trim() ? out.trim().split('\n').length : 0;
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
  const res = spawn('node', ['scripts/sync-api-contract.mjs', '--check'],
    { cwd: REPO, encoding: 'utf8' });
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
  return a;
}

/** The stamp actions that leave the requested review recorded on disk. */
export const RECORDS_REVIEW = new Set(['inserted', 'updated', 'unchanged']);

const STAMP_REFUSALS = {
  'skipped-no-h1': 'no H1 to place a marker after',
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
  const done = [];
  for (const w of writes) {
    try {
      fsImpl.writeFileSync(path.join(repo, w.doc), w.text);
    } catch (err) {
      throw new AuditError(`--stamp failed writing ${w.doc}: ${err.message}. `
        + `${done.length} of ${writes.length} documents were already stamped`
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
  const head = resolveCommit(args.since ?? baseRef);

  const regPath = path.join(REPO, REGISTRY);
  if (!fs.existsSync(regPath)) {
    process.stderr.write(`error: ${REGISTRY} not found; every doc would be unclassified\n`);
    return 2;
  }
  const registry = loadRegistry(fs.readFileSync(regPath, 'utf8'));

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
              + 'checks are silently not running' });
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

    const text = fs.readFileSync(path.join(REPO, doc), 'utf8');

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

    const prev = findMarker(text.split('\n'));
    if (!prev) {
      findings.push({ check: 'marker', doc, severity: 'P2', detail: 'no review marker' });
    } else {
      if (prev.legacy) {
        findings.push({ check: 'marker', doc, severity: 'P3',
          detail: `legacy label, date ${prev.date}; normalise to Last reviewed` });
      }
      findings.push(...checkMarkerDates(doc, prev, today));
      if (prev.sha) {
        // `git merge-base --is-ancestor` reports through its EXIT STATUS and
        // prints nothing, so testing its stdout for '' treats every SHA --
        // ancestor or not -- as suspect. Read the status.
        const anc = spawnSync('git', ['merge-base', '--is-ancestor', prev.sha, baseRef],
          { cwd: REPO, encoding: 'utf8' });
        if (anc.status !== 0) {
          findings.push({ check: 'marker', doc, severity: 'P2',
            detail: `reviewed-against ${prev.sha} is not an ancestor of ${baseRef}` });
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
      findings.push(...checkChangedSince(doc, prev.sha, codePaths, baseRef));
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
