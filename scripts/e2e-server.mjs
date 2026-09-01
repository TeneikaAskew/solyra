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
 * identified as a Vite dev server (command line contains "vite"). If it
 * cannot identify the listener it fails loud with instructions instead of
 * killing blind.
 */
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
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

function killPid(pid) {
  if (process.platform === 'win32') {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    process.kill(pid, 'SIGTERM')
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function guardLockfile() {
  if (!existsSync(LOCK_FILE)) return
  let lock = null
  try {
    lock = JSON.parse(readFileSync(LOCK_FILE, 'utf8'))
  } catch {
    /* unreadable lock → treat as stale */
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

async function guardPort() {
  if (!(await portIsListening())) return
  const pid = findListenerPid()
  const cmd = pid ? commandLineOf(pid) : null
  const looksLikeVite = cmd !== null && /vite/i.test(cmd)
  if (!pid || !looksLikeVite) {
    fail(
      `Port :${port} is already in use and the listener ${pid ? `(PID ${pid}, command: ${cmd ?? 'unreadable'})` : 'PID could not be determined'}.`,
      `Not killing a process this script cannot positively identify as a Vite dev server.`,
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

function removeLock() {
  rmSync(LOCK_FILE, { force: true })
}

await guardLockfile()
await guardPort()

writeFileSync(
  LOCK_FILE,
  JSON.stringify({ pid: process.pid, port, startedAt: new Date().toISOString() }) + '\n',
)

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
