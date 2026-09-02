#!/usr/bin/env node
/**
 * E2E dev-server launcher with port + concurrency hygiene (issue #9).
 *
 * Playwright's webServer runs THIS instead of `npm run dev` directly, closing
 * the two failure modes measured on 2026-09-01 (docs/TEST_COVERAGE_AUDIT.md §6):
 *
 *  1. LEAKED SERVER — a hard-killed run (closed terminal, SIGKILL) strands its
 *     Vite holding the strict port, and every later run aborts with
 *     "http://localhost:5199 is already used". This launcher detects the
 *     leak, verifies the listener really is a Vite from this repo, kills it,
 *     and proceeds.
 *
 *  2. CONCURRENT RUNS — two Playwright runs on one strict port share whichever
 *     server is up, contend for CPU, and see each other's teardown as
 *     ERR_CONNECTION_REFUSED; both runs' results are garbage. A lockfile
 *     (.e2e-server.lock, PID-liveness-checked) makes the second run refuse to
 *     start, loudly, instead.
 *
 * Vite is spawned directly from node_modules (not through `npm run dev`) so
 * there are no intermediate shell/npm processes for a process-tree kill to
 * miss — that extra layer is exactly how servers got stranded on Windows.
 *
 * Safety posture: this script only ever kills a process it has positively
 * identified as THIS CHECKOUT'S Vite dev server (command line contains
 * "vite" AND the process's command path or working directory is rooted in
 * this repo). Anything else — another project's Vite included — fails loud
 * with instructions instead of being killed blind.
 */
import { spawn, execFileSync } from 'node:child_process'
import { closeSync, openSync, readFileSync, readlinkSync, rmSync, writeSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const LOCK_FILE = path.join(repoRoot, '.e2e-server.lock')

const portArgIdx = process.argv.indexOf('--port')
const port = portArgIdx > -1 ? Number(process.argv[portArgIdx + 1]) : NaN
if (!Number.isInteger(port)) {
  console.error('[e2e-server] usage: node scripts/e2e-server.mjs --port <port>')
  process.exit(1)
}

function fail(...lines) {
  for (const line of lines) console.error(`[e2e-server] ${line}`)
  process.exit(1)
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM = alive but not ours; ESRCH = gone.
    return err.code === 'EPERM'
  }
}

function portIsListening() {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const settle = (up) => {
      socket.destroy()
      resolve(up)
    }
    socket.setTimeout(500)
    socket.once('connect', () => settle(true))
    socket.once('timeout', () => settle(false))
    socket.once('error', () => settle(false))
    socket.connect(port, '127.0.0.1')
  })
}

/** PID of the process LISTENING on the port, or null if it can't be found. */
function findListenerPid() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' })
      for (const line of out.split('\n')) {
        const cols = line.trim().split(/\s+/)
        if (cols[1]?.endsWith(`:${port}`) && cols[3] === 'LISTENING') return Number(cols[4])
      }
      return null
    }
    // POSIX: lsof is present on macOS and most Linux; fall back to ss on Linux.
    try {
      const out = execFileSync('lsof', ['-nP', '-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
        encoding: 'utf8',
      })
      const pid = Number(out.trim().split('\n')[0])
      return Number.isInteger(pid) ? pid : null
    } catch {
      const out = execFileSync('ss', ['-ltnpH', `sport = :${port}`], { encoding: 'utf8' })
      const m = out.match(/pid=(\d+)/)
      return m ? Number(m[1]) : null
    }
  } catch {
    return null
  }
}

/** Best-effort command line of a PID; null when it can't be read. */
function commandLineOf(pid) {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync(
        'powershell',
        ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`],
        { encoding: 'utf8' },
      )
      return out.trim() || null
    }
    if (process.platform === 'linux') {
      return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ').trim() || null
    }
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim() || null
  } catch {
    return null
  }
}

/** Best-effort working directory of a PID; null when it can't be read. */
function cwdOf(pid) {
  try {
    if (process.platform === 'linux') return readlinkSync(`/proc/${pid}/cwd`)
    if (process.platform === 'darwin') {
      const out = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], {
        encoding: 'utf8',
      })
      const m = out.match(/^n(.+)$/m)
      return m ? m[1] : null
    }
    // win32: no dependency-free way to read another process's cwd — the
    // command-line check below covers it, because this launcher always
    // spawns Vite by its absolute node_modules path under repoRoot.
    return null
  } catch {
    return null
  }
}

/**
 * A Vite on the E2E port is only OURS to kill when it provably belongs to
 * THIS checkout — its command line references repoRoot (how this launcher
 * spawns it) or its working directory is rooted there. A Vite from another
 * checkout or project that happens to hold the port is refused, not killed
 * (caught by Codex on PR #21).
 */
function belongsToThisCheckout(pid, cmd) {
  if (cmd !== null && cmd.includes(repoRoot)) return true
  const cwd = cwdOf(pid)
  return cwd !== null && (cwd === repoRoot || cwd.startsWith(repoRoot + path.sep))
}

function killPid(pid) {
  if (process.platform === 'win32') {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    process.kill(pid, 'SIGTERM')
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Acquire the lock ATOMICALLY via exclusive create (open flag 'wx'), so two
 * launchers racing to start can never both pass a check-then-write gap —
 * exactly one open('wx') succeeds (caught by Codex on PR #21). On EEXIST the
 * holder is inspected: a live PID means an active run (refuse), a dead one
 * means a stale lock (remove and retry the exclusive create — a concurrent
 * racer may legitimately win the recreate, which the next attempt sees as an
 * active holder).
 */
function acquireLock() {
  const payload =
    JSON.stringify({ pid: process.pid, port, startedAt: new Date().toISOString() }) + '\n'
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const fd = openSync(LOCK_FILE, 'wx')
      writeSync(fd, payload)
      closeSync(fd)
      return
    } catch (err) {
      if (err.code !== 'EEXIST') throw err
    }
    let lock = null
    try {
      lock = JSON.parse(readFileSync(LOCK_FILE, 'utf8'))
    } catch {
      /* unreadable or vanished between open and read → treat as stale */
    }
    if (lock && isPidAlive(lock.pid)) {
      fail(
        `Another E2E run appears ACTIVE against this repo (launcher PID ${lock.pid}, since ${lock.startedAt}).`,
        `Refusing to start a second server on :${port} — two runs on one strict port contaminate`,
        `each other's results (issue #9). Wait for that run to finish, or if you are certain it is`,
        `dead, delete ${LOCK_FILE} and retry.`,
      )
    }
    console.log('[e2e-server] removing stale lockfile from a dead run')
    rmSync(LOCK_FILE, { force: true })
  }
  fail(`could not acquire ${LOCK_FILE} after repeated attempts — another launcher keeps racing it.`)
}

async function guardPort() {
  if (!(await portIsListening())) return
  const pid = findListenerPid()
  const cmd = pid ? commandLineOf(pid) : null
  const looksLikeVite = cmd !== null && /vite/i.test(cmd)
  if (!pid || !looksLikeVite || !belongsToThisCheckout(pid, cmd)) {
    fail(
      `Port :${port} is already in use and the listener ${pid ? `(PID ${pid}, command: ${cmd ?? 'unreadable'})` : 'PID could not be determined'}.`,
      `Not killing a process this script cannot positively identify as THIS checkout's Vite dev`,
      `server (${repoRoot}) — it may be another project's server that happens to hold the port.`,
      `Free the port yourself, then re-run. (Linux/macOS: lsof -ti tcp:${port} | xargs kill;`,
      `Windows PowerShell: Get-NetTCPConnection -State Listen -LocalPort ${port} | % { Stop-Process -Id $_.OwningProcess -Force })`,
    )
  }
  console.log(`[e2e-server] killing leaked E2E dev server (PID ${pid}) holding :${port}`)
  killPid(pid)
  for (let i = 0; i < 20; i++) {
    if (!(await portIsListening())) return
    await sleep(250)
  }
  // SIGTERM ignored → escalate once on POSIX, then give up loudly.
  if (process.platform !== 'win32') {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      /* already gone */
    }
    for (let i = 0; i < 12; i++) {
      if (!(await portIsListening())) return
      await sleep(250)
    }
  }
  fail(`Port :${port} is still occupied after killing PID ${pid}. Free it manually and re-run.`)
}

/** Remove the lock ONLY when it is ours — a launcher that lost the
 *  acquisition race must never delete the winner's lock on its way out. */
function removeLock() {
  try {
    const lock = JSON.parse(readFileSync(LOCK_FILE, 'utf8'))
    if (lock.pid !== process.pid) return
  } catch {
    return // absent or unreadable — nothing of ours to remove
  }
  rmSync(LOCK_FILE, { force: true })
}

// Lock FIRST, then the port: holding the lock makes the leak-kill decision
// mutually exclusive too, so two racing launchers can't both conclude the
// same listener is leaked.
acquireLock()
await guardPort()

const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const child = spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: 'inherit',
})

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    child.kill(sig)
  })
}
process.on('exit', removeLock)
child.on('exit', (code, signal) => {
  removeLock()
  process.exit(code ?? (signal ? 1 : 0))
})
