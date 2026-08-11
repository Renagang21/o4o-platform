/**
 * WO-O4O-COSMETICS-PRODUCTMASTER-APPLY-PILOT-V1 — 운영 DB 접속 헬퍼
 *
 * 프로덕션 DB 는 방화벽으로 직접 TCP 접속이 막혀 있다. Cloud SQL Auth Proxy 를 **이 프로세스가 직접 띄우고**
 * 작업이 끝나면 반드시 내린다. 자격증명은 Cloud Run 서비스 env 에서 읽으며 **파일·로그에 남기지 않는다.**
 *
 * 기본은 read-only 다. 쓰기는 `withDb(fn, { write: true })` 로 명시한 경우에만 허용한다(WO §8 2단계).
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

const INSTANCE = 'netureyoutube:asia-northeast3:o4o-platform-db';
const PROXY = 'C:/Users/home/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/cloud-sql-proxy.exe';
const PORT = Number(process.env.PILOT_PGPORT ?? 15499);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { shell: true, windowsHide: true });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exit ${code}: ${err.slice(0, 400)}`))));
  });
}

/** Cloud Run 서비스 env 에서 DB 자격증명을 읽는다. 값은 메모리에만 둔다. */
async function loadCredentials() {
  const json = await run('gcloud', [
    'run', 'services', 'describe', 'o4o-core-api',
    '--region', 'asia-northeast3', '--format=json',
  ]);
  const env = JSON.parse(json).spec.template.spec.containers[0].env ?? [];
  const pick = (name) => env.find((e) => e.name === name)?.value;
  const user = pick('DB_USERNAME');
  const password = pick('DB_PASSWORD');
  const database = pick('DB_NAME');
  if (!user || !password || !database) throw new Error('Cloud Run env 에서 DB 자격증명을 찾지 못했다');
  return { user, password, database };
}

async function startProxy() {
  const p = spawn(PROXY, [INSTANCE, '--port', String(PORT)], { windowsHide: true, stdio: 'ignore' });
  p.unref();
  await sleep(4000);
  return p;
}

/**
 * @param {(q: (sql: string, params?: unknown[]) => Promise<import('pg').QueryResult>) => Promise<void>} fn
 * @param {{ write?: boolean }} [opts] write=false 면 세션을 read-only 로 강제한다.
 */
export async function withDb(fn, opts = {}) {
  const creds = await loadCredentials();
  const proxy = await startProxy();
  const client = new pg.Client({ host: '127.0.0.1', port: PORT, ...creds });
  try {
    await client.connect();
    if (!opts.write) await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    const q = (sql, params) => client.query(sql, params);
    return await fn(q, client);
  } finally {
    try {
      await client.end();
    } catch {
      /* 접속 실패 시 무시 */
    }
    proxy.kill();
  }
}
