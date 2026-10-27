import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { configuration, loadKey, jwt, issue, request, checkGitAuthConfig, checkGitRemote, childEnvironment, main, parse, PROFILES, REPOSITORY } from './github-app-token.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const config = { appId: '123', installationId: '456', keyFile: '/not-a-real-secret.pem' };
const env = { O4O_GITHUB_APP_ID: config.appId, O4O_GITHUB_APP_INSTALLATION_ID: config.installationId,
  O4O_GITHUB_APP_PRIVATE_KEY_FILE: config.keyFile, GH_TOKEN: 'existing-platform-placeholder', HTTPS_PROXY: 'http://proxy:8080' };
const now = Date.now();
const fixtureToken = 'synthetic_fixture_token_never_issued';

function fixture(overrides = {}) {
  const calls = [];
  const api = (method, path, auth, body) => {
    calls.push({ method, path, auth, body });
    if (method === 'DELETE') return null;
    if (path.endsWith('/access_tokens')) return { token: fixtureToken, expires_at: new Date(now + 3600_000).toISOString(),
      permissions: { ...PROFILES.read, metadata: 'read' }, ...overrides.minted };
    if (path.startsWith('/installation/repositories')) {
      if (overrides.lookupError) throw new Error('Simulated repository lookup failure.');
      return { total_count: 1, repositories: [{ full_name: REPOSITORY }], ...overrides.repos };
    }
    return { account: { login: 'Renagang21' }, suspended_at: null, ...overrides.installation };
  };
  return { api, calls };
}

test('RS256 signature verifies and JWT lifetime includes clock skew within 10 minutes', () => {
  const token = jwt(config.appId, privateKey, now);
  const [header, payload, signature] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.iss, config.appId);
  assert.equal(claims.iat, Math.floor(now / 1000) - 60);
  assert.equal(claims.exp - claims.iat, 600);
  assert.ok(verify('RSA-SHA256', Buffer.from(header + '.' + payload), publicKey, Buffer.from(signature, 'base64url')));
});

test('configuration fails closed without exposing supplied values', () => {
  assert.deepEqual(configuration(env), config);
  assert.throws(() => configuration({ ...env, O4O_GITHUB_APP_ID: 'invalid-private-value' }), error => !error.message.includes('invalid-private-value'));
  assert.throws(() => configuration({ ...env, O4O_GITHUB_APP_PRIVATE_KEY_FILE: 'relative.pem' }), /absolute/);
});

test('private key must be outside Git worktrees and owner-only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'o4o-app-key-test-'));
  try {
    const repo = join(dir, 'repo'); mkdirSync(repo); mkdirSync(join(repo, '.git')); writeFileSync(join(repo, '.git', 'HEAD'), 'ref: refs/heads/main');
    const key = join(dir, 'key.pem');
    writeFileSync(key, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    assert.equal(loadKey(key, repo).asymmetricKeyType, 'rsa');
    const tracked = join(repo, 'key.pem');
    writeFileSync(tracked, 'not-key-material', { mode: 0o600 });
    assert.throws(() => loadKey(tracked, repo), /outside/);
    const otherRepo = join(dir, 'other'); mkdirSync(otherRepo); writeFileSync(join(otherRepo, '.git'), 'gitdir: fixture');
    const otherKey = join(otherRepo, 'key.pem'); writeFileSync(otherKey, 'not-key-material', { mode: 0o600 });
    assert.throws(() => loadKey(otherKey, repo), /every Git/);
    if (process.platform !== 'win32') {
      chmodSync(key, 0o644);
      assert.throws(() => loadKey(key, repo), /owner-only/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('issuance requests one repository and least privileges, then verifies effective scope', () => {
  const { api, calls } = fixture();
  const lease = issue(config, privateKey, 'read', api, now);
  assert.equal(lease.token, fixtureToken);
  assert.deepEqual(calls[1].body, { repositories: ['o4o-platform'], permissions: PROFILES.read });
  assert.equal(calls[2].auth, fixtureToken);
  assert.equal(calls.length, 3);
});

test('wrong installation owner or suspended installation never mints', () => {
  for (const installation of [{ account: { login: 'someone-else' } }, { suspended_at: '2026-01-01' }]) {
    const { api, calls } = fixture({ installation });
    assert.throws(() => issue(config, privateKey, 'read', api, now), /installation/);
    assert.equal(calls.length, 1);
  }
});

test('overbroad permissions, repository scope, or expiry are revoked', () => {
  for (const overrides of [
    { minted: { permissions: { ...PROFILES.read, contents: 'write' } } },
    { minted: { permissions: { ...PROFILES.read, administration: 'write' } } },
    { minted: { expires_at: new Date(now - 1).toISOString() } },
    { minted: { expires_at: new Date(now + 7200_000).toISOString() } },
    { repos: { total_count: 2 } },
    { repos: { repositories: [{ full_name: 'Renagang21/wrong-repository' }] } },
    { lookupError: true },
  ]) {
    const { api, calls } = fixture(overrides);
    assert.throws(() => issue(config, privateKey, 'read', api, now));
    assert.equal(calls.at(-1).method, 'DELETE');
    assert.equal(calls.at(-1).auth, fixtureToken);
  }
});

test('transport keeps credentials off argv, retains proxy/TLS, refuses redirects and withholds bodies', () => {
  const response = request('POST', '/app/installations/456/access_tokens', fixtureToken, { repositories: ['o4o-platform'] }, (bin, args, opts) => {
    assert.equal(bin, 'curl');
    assert.ok(!args.join(' ').includes(fixtureToken));
    assert.ok(opts.input.includes(fixtureToken));
    assert.ok(!args.includes('--insecure'));
    assert.ok(!args.includes('--location'));
    assert.equal(args[0], '--disable');
    assert.equal(opts.env, undefined); // inherited proxy and credential-injection environment
    return { status: 0, stdout: '{"ok":true}\n201' };
  });
  assert.deepEqual(response, { ok: true });
  assert.throws(() => request('GET', '/installation/repositories?per_page=100', fixtureToken, undefined,
    () => ({ status: 0, stdout: 'secret response body\n403' })), e => e.message.includes('403') && !e.message.includes('secret response'));
  assert.throws(() => request('GET', 'https://other-host/', fixtureToken), /Unexpected/);
});

test('identity selection is explicit and token-printing/auth or shell commands are rejected', () => {
  assert.throws(() => parse(['exec', '--', 'gh', 'api', '/repos/' + REPOSITORY]), /Explicit/);
  for (const command of [['sh', '-c', 'env'], ['gh', 'auth', 'token'], ['gh', 'repo', 'clone', REPOSITORY],
    ['gh', 'pr', 'checkout', '1'], ['gh', 'pr', 'create'], ['gh', 'api', '--hostname=other-host', '/'], ['git', '-c', 'anything']]) {
    assert.throws(() => parse(['exec', '--use-app-identity', '--', ...command]), /approved/);
  }
  assert.equal(parse(['exec', '--use-app-identity', '--profile', 'author', '--', 'git', 'push', 'origin', 'wo/example']).profile, 'author');
  for (const profile of ['constructor', '__proto__', 'unknown']) {
    assert.throws(() => parse(['check', '--profile', profile]));
    assert.throws(() => issue(config, privateKey, profile, () => assert.fail('No request allowed'), now));
  }
});

test('child identity is scoped to process; inherited parent and Git config are preserved', () => {
  const parent = { ...env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'fixture.key', GIT_CONFIG_VALUE_0: 'original' };
  const child = childEnvironment(fixtureToken, parent);
  assert.equal(parent.GH_TOKEN, 'existing-platform-placeholder');
  assert.equal(child.GH_TOKEN, fixtureToken);
  assert.equal(child.HTTPS_PROXY, parent.HTTPS_PROXY);
  assert.equal(child.GIT_CONFIG_VALUE_0, 'original');
  assert.equal(child.GIT_CONFIG_COUNT, '4');
  assert.ok(!Object.values(child).filter(v => typeof v === 'string' && v.includes('helper')).join('').includes(fixtureToken));
});

test('real Git credential protocol receives only the selected child token', () => {
  const dir = mkdtempSync(join(tmpdir(), 'o4o-app-git-test-'));
  try {
    const isolated = { ...process.env, GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
      GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'credential.helper', GIT_CONFIG_VALUE_0: '!exit 99' };
    const result = spawnSync('git', ['credential', 'fill'], { cwd: dir, env: childEnvironment(fixtureToken, isolated),
      input: 'protocol=https\nhost=github.com\npath=Renagang21/o4o-platform.git\n\n', encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes('username=x-access-token'));
    assert.ok(result.stdout.includes('password=' + fixtureToken));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SSH remotes cannot silently select another identity and inherited restrictions remain effective', () => {
  assert.throws(() => childEnvironment(fixtureToken, { GIT_ALLOW_PROTOCOL: 'file' }), /transport policy/);
  const child = childEnvironment(fixtureToken, { ...process.env, GIT_ALLOW_PROTOCOL: 'https:ssh', GIT_SSH_COMMAND: 'o4o-ssh-must-not-run' });
  assert.equal(child.GIT_ALLOW_PROTOCOL, 'https');
  for (const remote of ['git@github.com:Renagang21/o4o-platform.git', 'ssh://git@github.com/Renagang21/o4o-platform.git']) {
    const result = spawnSync('git', ['ls-remote', remote], { env: child, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /transport 'ssh' not allowed/);
    assert.ok(!result.stderr.includes('o4o-ssh-must-not-run'));
  }
});

test('configured HTTP headers cannot override explicit App identity, and configuration errors fail closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'o4o-app-header-test-'));
  try {
    const base = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_COUNT: '0' };
    const run = (bin, args, opts) => spawnSync(bin, args, { ...opts, cwd: dir });
    checkGitAuthConfig(base, run);
    for (const key of ['http.extraHeader', 'http.https://github.com/.extraheader', 'http.https://github.com/Renagang21/o4o-platform/.extraheader']) {
      const conflicting = { ...base, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: key, GIT_CONFIG_VALUE_0: 'Authorization: Basic synthetic-secret-value' };
      assert.throws(() => checkGitAuthConfig(conflicting, run), e => /extraHeader/.test(e.message) && !e.message.includes('synthetic-secret-value'));
      assert.throws(() => main(['exec', '--use-app-identity', '--', 'git', 'push', 'origin', 'wo/fixture'], {
        env: conflicting, configRun: run, api: () => assert.fail('No token may be issued before identity validation'),
      }), /extraHeader/);
    }
    assert.throws(() => checkGitAuthConfig(base, () => ({ status: 2 })), /Cannot verify/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('resolved push URLs cannot select embedded credentials, another host, or another repository', () => {
  const git = ['git', 'push', 'origin', 'wo/fixture'];
  const run = url => (bin, args) => {
    assert.deepEqual(args, ['remote', 'get-url', '--all', '--push', 'origin']);
    return { status: 0, stdout: url + '\n' };
  };
  checkGitRemote(git, {}, run('https://github.com/Renagang21/o4o-platform.git'));
  for (const url of ['https://user:synthetic-private-value@github.com/Renagang21/o4o-platform.git',
    'https://other-host.test/Renagang21/o4o-platform.git', 'https://github.com/Renagang21/other.git',
    'git@github.com:Renagang21/o4o-platform.git', 'https://github.com/Renagang21/o4o-platform.git?auth=synthetic-private-value']) {
    assert.throws(() => checkGitRemote(git, {}, run(url)), e => /credential-free HTTPS/.test(e.message) && !e.message.includes('synthetic-private-value'));
  }
  assert.throws(() => checkGitRemote(['git','push','--all']), /named Git remote/);
});

test('inherited explicit configuration and netrc are rejected before token issuance', () => {
  for (const inherited of [
    { GIT_CONFIG_PARAMETERS: "'credential.helper=synthetic-private-value'" },
    { GIT_CONFIG: '/synthetic/custom-config' }, { NETRC: '/synthetic/netrc' },
  ]) {
    assert.throws(() => checkGitAuthConfig(inherited, () => assert.fail('Must fail before reading Git configuration')),
      e => !e.message.includes('synthetic-private-value'));
  }
  const dir = mkdtempSync(join(tmpdir(), 'o4o-app-netrc-test-'));
  try {
    writeFileSync(join(dir, '.netrc'), 'synthetic-fixture-only', { mode: 0o600 });
    assert.throws(() => checkGitAuthConfig({ HOME: dir }), /netrc/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('each command gets a fresh lease and revokes even after child failure; metadata omits token', () => {
  const { api, calls } = fixture();
  let output = '';
  const dependencies = { env, loadKey: () => privateKey, api, output: line => { output += line; },
    spawn: (bin, args, options) => { assert.equal(options.env.GH_TOKEN, fixtureToken); return { status: 7 }; } };
  assert.equal(main(['check'], dependencies), 0);
  assert.ok(output.includes('"revoked":true'));
  assert.ok(!output.includes(fixtureToken));
  assert.equal(main(['exec', '--use-app-identity', '--', 'gh', 'api', '/repos/' + REPOSITORY], dependencies), 7);
  assert.equal(calls.filter(c => c.method === 'POST').length, 2);
  assert.equal(calls.filter(c => c.method === 'DELETE').length, 2);
});
