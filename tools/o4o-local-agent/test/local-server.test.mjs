import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCAL_AGENT_PORT, startLocalServer } from '../src/local-server.mjs';

test('retired PH origins cannot obtain or consume a pairing nonce; Neture pairing remains available', async (t) => {
  const grants = [];
  const server = await startLocalServer({
    agentVersion: 'test',
    isConnected: () => false,
    onPair: async (grant) => { grants.push(grant); return { ok: true, status: 'paired' }; },
    log: () => {},
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const send = (origin, endpoint, options = {}) => fetch(`http://127.0.0.1:${LOCAL_AGENT_PORT}${endpoint}`, {
    ...options, headers: { Origin: origin, Connection: 'close', ...options.headers },
  });
  const currentOrigin = 'https://neture.co.kr';
  const health = await send(currentOrigin, '/health');
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('access-control-allow-origin'), currentOrigin);
  const { nonce } = await health.json();
  assert.equal(typeof nonce, 'string');
  const body = JSON.stringify({ nonce, grant: 'test-grant' });

  for (const origin of ['https://pharmacyhub.co.kr', 'https://www.pharmacyhub.co.kr']) {
    for (const [endpoint, options] of [
      ['/pair', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } }],
      ['/health', {}],
      ['/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }],
    ]) {
      const denied = await send(origin, endpoint, options);
      assert.equal(denied.status, 403, `${origin} ${options.method ?? 'GET'} ${endpoint}`);
      assert.equal(denied.headers.get('access-control-allow-origin'), null);
      assert.equal(denied.headers.get('access-control-allow-private-network'), null);
      const text = await denied.text();
      if (options.method !== 'OPTIONS') assert.equal(JSON.parse(text).code, 'ORIGIN_NOT_ALLOWED');
    }
  }
  assert.deepEqual(grants, []);

  const preflight = await send(currentOrigin, '/pair', { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), currentOrigin);
  const paired = await send(currentOrigin, '/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal(paired.status, 200);
  assert.equal((await paired.json()).status, 'paired');
  assert.deepEqual(grants, ['test-grant']);
});
