/** Reproduce auth/contact checks against disposable PostgreSQL, never an app DB.
 * Prerequisites: SETUP.md install/build; initdb, pg_ctl and psql on PATH (PG15).
 * Run from any directory: node scripts/testing/auth-operational-postgres.mjs
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pinned = JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8')).volta;
// operator-inbox.integration.spec.ts deliberately fixes this non-production port.
const port = 55439;
const databases = [
  'o4o_auth_hardening_test', 'o4o_auth_phase2_test', 'o4o_auth_phase4a_test',
  'o4o_signup_test', 'o4o_operator_inbox_fixture', 'o4o_platform',
];
const tests = [
  'src/services/auth/__tests__/token-membership-hardening.integration.test.ts',
  'src/services/auth/__tests__/browserSession.integration.test.ts',
  'src/services/auth/__tests__/sessionAuthMethod.integration.test.ts',
  'src/services/auth/__tests__/socialAuth.integration.test.ts',
  'src/services/auth/__tests__/signupPolicy.integration.test.ts',
  'src/services/auth/__tests__/mainMembershipProjection.test.ts',
  'src/modules/contact-inquiry/__tests__/contact-flow.postgres.spec.ts',
  'src/modules/contact-inquiry/__tests__/contact-reply.service.spec.ts',
  'src/modules/contact-inquiry/__tests__/notification-scope.postgres.spec.ts',
  'src/__tests__/operator-inbox.integration.spec.ts',
];
// Do not propagate real DB selectors or test-account credentials to the fixture.
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/^(DB_|PG|O4O_TEST_)/.test(key) && key !== 'DATABASE_URL',
));
Object.assign(environment, {
  NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_PORT: String(port),
  DB_USERNAME: 'operator_inbox_fixture', DB_NAME: 'o4o_operator_inbox_fixture',
  DB_PASSWORD: randomUUID(), JWT_SECRET: randomUUID(), JWT_REFRESH_SECRET: randomUUID(),
  PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'o4o_local', PGDATABASE: 'postgres',
});
let interruption;
let activeCommand;
let cleaning = false;
function signalCommand(command, signal) {
  if (!command?.interruptible || !command.child.pid) return;
  try { process.kill(-command.child.pid, signal); }
  catch (error) {
    if (error.code !== 'ESRCH') command.child.kill(signal);
  }
}
function onInterrupt(signal) {
  if (!interruption) console.error(`Interrupted by ${signal}; cleaning disposable fixtures`);
  interruption ??= signal;
  if (!cleaning) signalCommand(activeCommand, signal);
}
const signalHandlers = new Map(['SIGINT', 'SIGTERM'].map(signal => {
  const handler = () => onInterrupt(signal);
  process.on(signal, handler);
  return [signal, handler];
}));

async function run(command, args, { capture = false, required = true, env = environment } = {}) {
  if (interruption && !cleaning) throw new Error(`Interrupted by ${interruption}`);
  // Interrupt the whole pnpm/Jest process group. Let short PG administration
  // commands finish so startup/shutdown cannot race removal of the data directory.
  const current = {
    interruptible: command === 'pnpm',
    child: spawn(command, args, {
      cwd: repository, env, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      detached: command === 'pnpm',
    }),
  };
  activeCommand = current;
  const result = await new Promise(done => {
    let stdout = '';
    let error;
    current.child.stdout?.setEncoding('utf8').on('data', data => { stdout += data; });
    current.child.stderr?.resume();
    current.child.once('error', value => { error = value; });
    current.child.once('close', (status, signal) => done({ status, signal, error, stdout }));
  });
  if (activeCommand === current) activeCommand = undefined;
  if (interruption && !cleaning) {
    // pnpm may exit before a grandchild. Retire the remaining owned process group.
    signalCommand(current, 'SIGKILL');
    throw new Error(`Interrupted by ${interruption}`);
  }
  if (required && (result.error || result.status !== 0)) {
    throw new Error(`${command} failed (${result.error?.code ?? result.status ?? result.signal})`);
  }
  return result;
}
async function sql(statement, capture = false) {
  return (await run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement], { capture })).stdout?.trim();
}
async function requireFreePort() {
  await new Promise((done, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error('Fixture port is occupied; no existing server will be reused or stopped')));
    probe.listen(port, '127.0.0.1', () => probe.close(error => error ? reject(error) : done()));
  });
}

let directory;
let clusterCreated = false;
let failure = false;
try {
  if (process.platform !== 'linux') throw new Error('These Unix-socket fixtures require Linux');
  if (process.versions.node !== pinned.node) throw new Error('Activate the Node version pinned by SETUP.md');
  if ((await run('pnpm', ['--version'], { capture: true })).stdout.trim() !== pinned.pnpm) {
    throw new Error('Activate the pnpm version pinned by SETUP.md');
  }
  if (!/PostgreSQL\) 15\./.test((await run('initdb', ['--version'], { capture: true })).stdout)) {
    throw new Error('PostgreSQL 15 tools are required');
  }
  await requireFreePort();
  directory = mkdtempSync('/tmp/o4o-auth-operational-');
  const data = join(directory, 'data');
  const socket = join(directory, 'socket');
  mkdirSync(socket, { mode: 0o700 });
  // Administrative SQL uses our private socket, never an existing TCP listener.
  environment.PGHOST = socket;
  clusterCreated = true;
  await run('initdb', ['-D', data, '-U', 'o4o_local', '--auth=trust', '--encoding=UTF8', '--locale=C']);
  await run('pg_ctl', ['-D', data, '-l', join(directory, 'server.log'), '-o', `-h 127.0.0.1 -p ${port} -k ${socket}`, '-w', 'start']);
  await sql('CREATE ROLE o4o_fixture LOGIN SUPERUSER');
  await sql('CREATE ROLE operator_inbox_fixture LOGIN SUPERUSER');
  await sql('CREATE DATABASE o4o_operator_inbox_fixture OWNER operator_inbox_fixture');

  // Use the actual baseline + incremental manifest and fingerprint assertions.
  // These explicit selectors point only at the cluster just created above.
  console.log('Applying canonical schema to the disposable fixture');
  await run('pnpm', ['--filter', '@o4o/api-server', 'run', 'migration:run']);
  for (const name of ['o4o_auth_phase2_test', 'o4o_auth_phase4a_test']) {
    await sql(`CREATE DATABASE ${name} OWNER o4o_fixture TEMPLATE o4o_operator_inbox_fixture`);
  }
  for (const name of ['o4o_auth_hardening_test', 'o4o_signup_test']) {
    await sql(`CREATE DATABASE ${name} OWNER o4o_fixture`);
  }
  await sql('CREATE DATABASE o4o_platform OWNER o4o_local');
  console.log('Running auth/contact fixtures (provider and SMTP transports remain mocked)');
  await run('pnpm', ['--filter', '@o4o/api-server', 'exec', 'jest', '--runInBand', '--runTestsByPath', ...tests, '--silent'], {
    env: {
      ...environment, O4O_AUTH_HARDENING_TEST_PORT: String(port),
      O4O_AUTH_SESSION_TEST_PORT: String(port), O4O_SIGNUP_TEST_PORT: String(port),
      CONTACT_REVIEW_PG_SOCKET: socket, O4O_OPERATOR_INBOX_PG_TEST: '1',
    },
  });
} catch (error) {
  failure = true;
  console.error(error.message);
} finally {
  cleaning = true;
  if (clusterCreated) {
    const data = join(directory, 'data');
    const running = (await run('pg_ctl', ['-D', data, 'status'], { capture: true, required: false })).status === 0;
    let cleaned = !running;
    if (running) {
      try {
        for (const name of databases) await sql(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
        const remaining = await sql(`SELECT count(*) FROM pg_database WHERE datname IN (${databases.map(name => `'${name}'`).join(',')})`, true);
        if (remaining !== '0') throw new Error('Fixture databases remain');
        console.log('Remaining fixture databases: 0');
        cleaned = true;
      } catch (error) {
        failure = true;
        console.error(`Fixture cleanup failed: ${error.message}`);
      }
      const stopped = await run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'], { required: false });
      if (stopped.status !== 0) { failure = true; cleaned = false; }
    }
    if (cleaned) {
      rmSync(directory, { recursive: true });
      console.log('Disposable cluster removed');
    } else {
      console.error(`Owned fixture retained for investigation: ${directory}`);
    }
  } else if (directory) {
    rmSync(directory, { recursive: true });
  }
  for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
}
process.exitCode = interruption ? (interruption === 'SIGINT' ? 130 : 143) : failure ? 1 : 0;
