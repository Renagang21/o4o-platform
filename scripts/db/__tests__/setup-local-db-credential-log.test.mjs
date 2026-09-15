/**
 * scripts/setup-local-db.sh credential non-exposure test (node --test)
 * WO-O4O-MIGRATION-HISTORICAL-MANIFEST-IDENTITY-AND-LOCAL-DB-CREDENTIAL-LOG-FINAL-CLOSURE-V1
 *
 *   node --test scripts/db/__tests__/setup-local-db-credential-log.test.mjs
 *
 * Runs the real script under bash with PATH shims for `sudo`, `psql` and `systemctl` (no PostgreSQL,
 * no root) and a fake canary password. The shims record every argv they receive and their stdin.
 * Asserts, for the success path and for both failure paths (CREATE USER error · connection error):
 *   stdout / stderr / every process argument / every created file except the 0600 .env
 *   contain the canary 0 times. Static checks cover `set -x`, echo/printf of the password variable,
 *   DATABASE_URL and `.env` dumps. Skips (explicitly) when bash is not available.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, chmodSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
// O4O_SETUP_LOCAL_DB_SCRIPT: run the same harness against another copy (used to prove the BEFORE script fails)
const SCRIPT = process.env.O4O_SETUP_LOCAL_DB_SCRIPT || join(REPO, 'scripts', 'setup-local-db.sh');
const CANARY = 'O4O_TEST_DB_PASSWORD_CANARY_7f3a9c1e5b2d';

const bashProbe = spawnSync('bash', ['-c', 'echo ok'], { encoding: 'utf8' });
const hasBash = bashProbe.status === 0 && bashProbe.stdout.trim() === 'ok';
const toBashPath = (p) => (process.platform === 'win32' ? p.replace(/^([A-Za-z]):\\/, (_, d) => `/${d.toLowerCase()}/`).replace(/\\/g, '/') : p);

/** Build a sandbox: shim bin dir + argv/stdin log + env file target. */
function sandbox({ psqlFailOn = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'o4o-local-db-canary-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  const log = join(dir, 'argv.log');
  const stdinLog = join(dir, 'stdin.log');
  const envFile = join(dir, 'api.env');
  // sudo shim: drop `-u <user>` and exec the rest (so `sudo -u postgres psql …` runs the psql shim)
  writeFileSync(join(bin, 'sudo'), `#!/bin/bash
printf 'sudo %s\\n' "$*" >> "${toBashPath(log)}"
if [ "$1" = "-u" ]; then shift 2; fi
exec "$@"
`);
  // psql shim: records argv + stdin; fails when the recorded stdin/argv matches psqlFailOn
  writeFileSync(join(bin, 'psql'), `#!/bin/bash
printf 'psql %s\\n' "$*" >> "${toBashPath(log)}"
input=""
if [ ! -t 0 ]; then input="$(cat)"; printf '%s\\n' "$input" >> "${toBashPath(stdinLog)}"; fi
${psqlFailOn === 'create' ? 'case "$input" in *"CREATE USER"*) echo "ERROR:  syntax error at or near \\"WITH\\"" >&2; echo "LINE 1: $input" >&2; exit 1;; esac' : ''}
${psqlFailOn === 'connect' ? 'case "$*" in *"-w -h localhost"*) echo "psql: error: connection to server failed: password authentication failed (PGPASSWORD=$PGPASSWORD)" >&2; exit 2;; esac' : ''}
exit 0
`);
  writeFileSync(join(bin, 'systemctl'), `#!/bin/bash\nprintf 'systemctl %s\\n' "$*" >> "${toBashPath(log)}"\nexit 0\n`);
  for (const f of ['sudo', 'psql', 'systemctl']) chmodSync(join(bin, f), 0o755);
  return { dir, bin, log, stdinLog, envFile };
}

function run(sb, script = SCRIPT) {
  const r = spawnSync('bash', [toBashPath(script)], {
    encoding: 'utf8',
    env: {
      PATH: `${sb.bin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
      LOCAL_DB_PASSWORD: CANARY,
      O4O_API_ENV_FILE: toBashPath(sb.envFile),
      HOME: process.env.HOME ?? '',
      SYSTEMROOT: process.env.SYSTEMROOT ?? '',
      TMP: process.env.TMP ?? '', TEMP: process.env.TEMP ?? '',
      MSYS_NO_PATHCONV: '1',
    },
    timeout: 60_000,
  });
  const argvLog = existsSync(sb.log) ? readFileSync(sb.log, 'utf8') : '';
  const stdinLog = existsSync(sb.stdinLog) ? readFileSync(sb.stdinLog, 'utf8') : '';
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', argvLog, stdinLog };
}

const count = (hay, needle) => hay.split(needle).length - 1;

function assertNoCanary(r, sb, { expectEnv }) {
  assert.equal(count(r.stdout, CANARY), 0, `canary in stdout:\n${r.stdout}`);
  assert.equal(count(r.stderr, CANARY), 0, `canary in stderr:\n${r.stderr}`);
  assert.equal(count(r.argvLog, CANARY), 0, `canary in a process argument:\n${r.argvLog}`);
  // the script's built-in development default (read from the script itself so the value is not repeated here)
  const defaultPw = /DB_PASSWORD="\$\{LOCAL_DB_PASSWORD:-([^}]+)\}"/.exec(readFileSync(SCRIPT, 'utf8'))?.[1];
  if (defaultPw) assert.equal(count(`${r.stdout}${r.stderr}${r.argvLog}`, defaultPw), 0, 'default password printed');
  assert.doesNotMatch(`${r.stdout}${r.stderr}`, /postgres(ql)?:\/\/[^\s]*:[^\s]*@/i, 'connection URL with credentials printed');
  // created files: only the .env may contain the password, and it must be 0600
  for (const f of readdirSync(sb.dir)) {
    const p = join(sb.dir, f);
    if (statSync(p).isDirectory()) continue;
    const content = readFileSync(p, 'utf8');
    if (p === sb.envFile) continue;
    if (p === sb.stdinLog) continue; // psql stdin is the intended (non-argv, non-log) channel for CREATE USER
    assert.equal(count(content, CANARY), 0, `canary in created file ${f}`);
  }
  if (expectEnv) {
    assert.ok(existsSync(sb.envFile), '.env not created');
    assert.equal(count(readFileSync(sb.envFile, 'utf8'), `DB_PASSWORD=${CANARY}\n`), 1, '.env must carry the password exactly once');
    if (process.platform !== 'win32') assert.equal(statSync(sb.envFile).mode & 0o777, 0o600, '.env must be 0600');
  }
}

test('static: no set -x, no echo/printf of the password variable, no DATABASE_URL / .env dump, password never a psql argument', () => {
  const src = readFileSync(SCRIPT, 'utf8');
  assert.doesNotMatch(src, /^\s*set\s+-x|bash\s+-x/m);
  assert.doesNotMatch(src, /^\s*(echo|printf)\b[^\n]*\$\{?(DB_PASSWORD|LOCAL_DB_PASSWORD|PGPASSWORD)\b/m, 'password variable echoed');
  assert.doesNotMatch(src, /DATABASE_URL/);
  assert.doesNotMatch(src, /^\s*cat\s+"?\$ENV_FILE/m, '.env dumped');
  assert.doesNotMatch(src, /psql[^\n]*-c[^\n]*PASSWORD/i, 'password passed to psql on the command line');
  assert.match(src, /PGPASSWORD="\$DB_PASSWORD" psql -w/, 'connection test must pass the password as a per-process env var');
  assert.match(src, /^\s*set \+x/m);
});

test('bash -n: shell syntax', { skip: hasBash ? false : 'bash not available on this machine (CI runs it on ubuntu)' }, () => {
  const r = spawnSync('bash', ['-n', toBashPath(SCRIPT)], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('success path: canary appears 0× in stdout / stderr / argv / other files; .env carries it once', { skip: hasBash ? false : 'bash not available' }, () => {
  const sb = sandbox();
  try {
    const r = run(sb);
    assert.equal(r.status, 0, `script failed:\n${r.stdout}\n${r.stderr}`);
    assertNoCanary(r, sb, { expectEnv: true });
    assert.match(r.stdout, /Database password: SET/);
    assert.match(r.stdout, /Local database connection: SUCCESS/);
    assert.match(r.stdout, /Local database configuration: COMPLETE/);
    // CREATE USER reached psql via stdin, never via argv
    assert.equal(count(r.stdinLog, `\\set db_pw '${CANARY}'`), 1);
    assert.match(r.stdinLog, /CREATE USER o4o_user WITH PASSWORD :'db_pw';/);
    assert.equal(count(r.argvLog, 'CREATE USER'), 0);
    // setup function preserved: drop/create/grant + connection test + .env
    assert.match(r.stdinLog, /CREATE DATABASE o4o_platform OWNER o4o_user;/);
    assert.match(r.stdinLog, /GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;/);
    assert.match(r.argvLog, /psql -w -h localhost -U o4o_user -d o4o_platform -c SELECT version\(\);/);
    assert.match(readFileSync(sb.envFile, 'utf8'), /DB_USERNAME=o4o_user\nDB_PASSWORD=.*\nDB_NAME=o4o_platform\n/);
  } finally { rmSync(sb.dir, { recursive: true, force: true }); }
});

test('failure path (CREATE USER error — psql echoes the statement on stderr): still 0× canary', { skip: hasBash ? false : 'bash not available' }, () => {
  const sb = sandbox({ psqlFailOn: 'create' });
  try {
    const r = run(sb);
    assert.notEqual(r.status, 0);
    assertNoCanary(r, sb, { expectEnv: false });
    assert.match(r.stdout, /Database user\/database setup: FAILED/);
    assert.ok(!existsSync(sb.envFile), '.env must not be written after a setup failure');
  } finally { rmSync(sb.dir, { recursive: true, force: true }); }
});

test('failure path (connection test error — libpq-style message mentioning PGPASSWORD): still 0× canary', { skip: hasBash ? false : 'bash not available' }, () => {
  const sb = sandbox({ psqlFailOn: 'connect' });
  try {
    const r = run(sb);
    assert.notEqual(r.status, 0);
    assertNoCanary(r, sb, { expectEnv: true });
    assert.match(r.stdout, /Local database connection: FAILED/);
  } finally { rmSync(sb.dir, { recursive: true, force: true }); }
});

// self-check: the harness must actually catch an exposure (mutants of the real script)
for (const [label, from, to] of [
  ['stdout echo of the password', 'echo "Database password: SET"', 'echo "Database password: $DB_PASSWORD"'],
  ['password inside a psql command-line argument', "sudo -u postgres psql -q -c \"DROP USER IF EXISTS $DB_USER;\" >/dev/null 2>&1 || true", "sudo -u postgres psql -q -c \"ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';\" >/dev/null 2>&1 || true"],
  ['stderr leak from an un-suppressed psql failure', '>/dev/null 2>&1 <<SQL', '>/dev/null <<SQL'],
]) {
  test(`harness self-check: mutant with ${label} is caught`, { skip: hasBash ? false : 'bash not available' }, () => {
    const sb = sandbox({ psqlFailOn: label.startsWith('stderr') ? 'create' : null });
    try {
      const src = readFileSync(SCRIPT, 'utf8');
      assert.ok(src.includes(from), `mutation anchor missing: ${from}`);
      const mutant = join(sb.dir, 'mutant.sh');
      writeFileSync(mutant, src.replace(from, to));
      const r = run(sb, mutant);
      assert.throws(() => assertNoCanary(r, sb, { expectEnv: false }), /canary in/);
    } finally { rmSync(sb.dir, { recursive: true, force: true }); }
  });
}

test('missing / invalid password is reported as MISSING / INVALID without echoing a value', { skip: hasBash ? false : 'bash not available' }, () => {
  const sb = sandbox();
  try {
    const base = { PATH: `${sb.bin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`, O4O_API_ENV_FILE: toBashPath(sb.envFile), SYSTEMROOT: process.env.SYSTEMROOT ?? '', MSYS_NO_PATHCONV: '1' };
    const bad = spawnSync('bash', [toBashPath(SCRIPT)], { encoding: 'utf8', env: { ...base, LOCAL_DB_PASSWORD: `x'${CANARY}` } });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stdout, /Database password: INVALID/);
    assert.equal(count(`${bad.stdout}${bad.stderr}`, CANARY), 0);
  } finally { rmSync(sb.dir, { recursive: true, force: true }); }
});
