/** Run the full migration sequence against a disposable local PostgreSQL and print the schema fingerprint.
 *
 * PRODUCTION-MIGRATION-STANDARD Step 4 (Register the Expected Schema State) without touching any app DB:
 *   - starts a throw-away cluster bound to 127.0.0.1 on a free port, in a fresh temporary directory
 *   - drops every inherited DB_ / PG / DATABASE_URL variable, so a real DB selector can never leak in
 *   - runs `pnpm --filter @o4o/api-server migration:run` (FRESH_EMPTY → bootstrap → every incremental migration)
 *   - prints the SCHEMA_ASSERTION / FINGERPRINT lines, then stops the cluster and deletes its directory
 * The exit code is the migration job's. An unregistered new state prints POST_MIGRATION_SCHEMA_ASSERTION = FAILED
 * with LIVE_FINGERPRINT — register it in expected-schema-states.ts and run again for PASS.
 *
 * Prerequisites: SETUP.md install; PostgreSQL server binaries (initdb · pg_ctl · psql) on PATH or under
 * /usr/lib/postgresql/<major>/bin. The standard pins PostgreSQL 15; a different major is reported so the
 * result can be judged (the previous registered fingerprint must reproduce unchanged first).
 * When run as root (cloud containers), the cluster runs as the `postgres` OS user.
 *
 * Run from any directory: node scripts/testing/migration-fingerprint-postgres.mjs
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chownSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

function findBin() {
  const onPath = spawnSync('sh', ['-c', 'command -v initdb'], { encoding: 'utf8' }).stdout.trim();
  if (onPath) return dirname(onPath);
  const base = '/usr/lib/postgresql';
  if (!existsSync(base)) return null;
  const majors = readdirSync(base).filter((v) => existsSync(join(base, v, 'bin', 'initdb')));
  // Prefer the pinned major (15), otherwise the newest available.
  majors.sort((a, b) => (a === '15' ? -1 : b === '15' ? 1 : Number(b) - Number(a)));
  return majors.length ? join(base, majors[0], 'bin') : null;
}

function freePort() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });
}

const bin = findBin();
if (!bin) {
  console.error('PostgreSQL server binaries (initdb) not found — install PostgreSQL 15 (SETUP.md) or run this step LOCAL.');
  process.exit(2);
}
const version = spawnSync(join(bin, 'postgres'), ['--version'], { encoding: 'utf8' }).stdout.trim();
console.log(`POSTGRES = ${version}${/\s15\./.test(version) ? '' : '  (standard pins 15 — confirm the previous fingerprint reproduces)'}`);

// A root-owned 0700 directory under a non-traversable TMPDIR would be unreadable for `postgres`.
const root = mkdtempSync(join(isRoot ? '/var/tmp' : tmpdir(), 'o4o-migration-fp-'));
const data = join(root, 'data');
const port = await freePort();
const password = randomUUID();
const superuser = 'o4o_fixture';
const database = 'o4o_migration_fingerprint';

function pg(command, args, { capture = false } = {}) {
  const full = [join(bin, command), ...args];
  const [cmd, argv] = isRoot ? ['runuser', ['-u', 'postgres', '--', ...full]] : [full[0], full.slice(1)];
  const result = spawnSync(cmd, argv, { encoding: 'utf8', stdio: capture ? 'pipe' : ['ignore', 'ignore', 'inherit'] });
  if (result.status !== 0) throw new Error(`${command} failed (exit ${result.status})${capture ? `: ${result.stderr}` : ''}`);
  return result.stdout;
}

let started = false;
let exitCode = 1;
try {
  if (isRoot) {
    const id = (flag) => Number(spawnSync('id', [flag, 'postgres'], { encoding: 'utf8' }).stdout.trim());
    chownSync(root, id('-u'), id('-g'));
  }
  pg('initdb', ['-D', data, '-A', 'trust', '-U', superuser, '--no-instructions']);
  pg('pg_ctl', ['-D', data, '-w', '-l', join(root, 'server.log'), '-o', `-c listen_addresses=127.0.0.1 -p ${port} -k ${root}`, 'start']);
  started = true;
  const psql = (sql) => pg('psql', ['-h', '127.0.0.1', '-p', String(port), '-U', superuser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qc', sql]);
  psql(`ALTER USER ${superuser} PASSWORD '${password}'`);
  psql(`CREATE DATABASE ${database}`);

  // Never propagate real DB selectors to the migration job.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DB_|PG)/.test(key) && key !== 'DATABASE_URL'));
  Object.assign(env, { NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_PORT: String(port), DB_USERNAME: superuser, DB_PASSWORD: password, DB_NAME: database });
  const job = spawnSync('pnpm', ['--filter', '@o4o/api-server', 'migration:run'], { cwd: repository, env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const output = `${job.stdout ?? ''}${job.stderr ?? ''}`;
  for (const line of output.split('\n')) {
    if (/SCHEMA_ASSERTION|FINGERPRINT|EXPECTED_SCHEMA_STATE|ERROR/.test(line)) console.log(line.replace(/^.*?(INFO|ERROR): /, '$1: '));
  }
  exitCode = job.status ?? 1;
  console.log(`MIGRATION_JOB_EXIT = ${exitCode}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  if (started) {
    try { pg('pg_ctl', ['-D', data, '-w', '-m', 'fast', 'stop']); } catch (error) { console.error(String(error)); }
  }
  rmSync(root, { recursive: true, force: true });
}
process.exit(exitCode);
