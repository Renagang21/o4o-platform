import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

it('binds the local launcher to loopback and does not inherit provider credentials', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'o4o-review-launcher-'));
  try {
    const dist = join(fixture, 'apps/api-server/dist'); mkdirSync(dist, { recursive: true });
    writeFileSync(join(dist, 'main.js'), `console.log(JSON.stringify({ host: process.env.HOST, mode: process.env.REVIEW_DEMO_ENVIRONMENT, provider: !!process.env.GEMINI_API_KEY }))`);
    const result = spawnSync(process.execPath, [resolve(__dirname, '../../../../../deploy/chatgpt-review-demo/run-local-api.mjs')], {
      cwd: fixture, encoding: 'utf8', env: {
        HOST: '0.0.0.0', GEMINI_API_KEY: randomUUID(),
        REVIEW_DEMO_ENVIRONMENT: 'isolated', REVIEW_DEMO_DB_HOST: '127.0.0.1',
        REVIEW_DEMO_DB_NAME: 'o4o_chatgpt_review_demo', REVIEW_DEMO_DB_USERNAME: 'o4o_review_demo',
        REVIEW_DEMO_DB_PASSWORD: randomUUID(), REVIEW_DEMO_JWT_SECRET: randomUUID(),
        REVIEW_DEMO_JWT_REFRESH_SECRET: randomUUID(), REVIEW_DEMO_CREDENTIAL_KEY: randomUUID(),
        REVIEW_DEMO_API_ORIGIN: 'http://localhost:13002', REVIEW_DEMO_WEB_ORIGIN: 'http://localhost:13000',
        REVIEW_DEMO_STORE_ORIGIN: 'http://localhost:13001', REVIEW_DEMO_REDIRECT_URIS: 'http://localhost/callback',
      },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ host: '127.0.0.1', mode: 'isolated', provider: false });
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
