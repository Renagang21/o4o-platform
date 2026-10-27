#!/usr/bin/env node
// Explicit GitHub App identity; never refresh or mutate a platform-managed token.
import { createPrivateKey, sign } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const REPOSITORY = 'Renagang21/o4o-platform';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PROFILES = Object.freeze({
  read: Object.freeze({ contents: 'read', pull_requests: 'read', actions: 'read', checks: 'read', statuses: 'read' }),
  author: Object.freeze({ contents: 'write', pull_requests: 'write', actions: 'read', checks: 'read', statuses: 'read' }),
});
class SafeError extends Error {}
const fail = message => { throw new SafeError(message); };

export function configuration(env = process.env) {
  const appId = env.O4O_GITHUB_APP_ID;
  const installationId = env.O4O_GITHUB_APP_INSTALLATION_ID;
  const keyFile = env.O4O_GITHUB_APP_PRIVATE_KEY_FILE;
  if (![appId, installationId].every(v => typeof v === 'string' && /^[1-9][0-9]{0,19}$/.test(v))) {
    fail('Configure O4O_GITHUB_APP_ID and O4O_GITHUB_APP_INSTALLATION_ID.');
  }
  if (!keyFile || !isAbsolute(keyFile)) fail('Configure an absolute O4O_GITHUB_APP_PRIVATE_KEY_FILE.');
  return { appId, installationId, keyFile };
}

export function loadKey(keyFile, root = ROOT) {
  const actual = realpathSync(keyFile);
  const rel = relative(realpathSync(root), actual);
  if (!rel || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel))) {
    fail('The private key must be outside the repository.');
  }
  for (let dir = dirname(actual); ; dir = dirname(dir)) {
    const git = resolve(dir, '.git');
    if (existsSync(git) && (statSync(git).isFile() || existsSync(resolve(git, 'HEAD')))) {
      fail('The private key must be outside every Git worktree.');
    }
    if (dirname(dir) === dir) break;
  }
  const stat = statSync(actual);
  if (!stat.isFile() || stat.size > 32768 || (process.platform !== 'win32' && (stat.mode & 0o077))) {
    fail('Use a regular private key file with owner-only permissions (0600).');
  }
  let key;
  try { key = createPrivateKey(readFileSync(actual)); } catch { fail('Cannot load the configured RSA private key.'); }
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) {
    fail('The App private key must be RSA with at least 2048 bits.');
  }
  return key;
}

export function jwt(appId, key, now = Date.now()) {
  const seconds = Math.floor(now / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({ iat: seconds - 60, exp: seconds + 540, iss: appId });
  return unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url');
}

// curl inherits proxy/CA policy. Secrets go through stdin, never argv or diagnostics.
export function request(method, path, credential, body, run = spawnSync) {
  if (!/^\/(?:app\/installations\/[1-9][0-9]*(?:\/access_tokens)?|installation\/(?:repositories\?per_page=100|token))$/.test(path)) {
    fail('Unexpected GitHub App endpoint.');
  }
  const config = [
    'header = ' + JSON.stringify('Authorization: Bearer ' + credential),
    'header = "Accept: application/vnd.github+json"',
    'header = "X-GitHub-Api-Version: 2022-11-28"',
    'header = "Content-Type: application/json"',
    'header = "User-Agent: o4o-github-app-token"',
  ];
  if (body !== undefined) config.push('data = ' + JSON.stringify(JSON.stringify(body)));
  const args = ['--disable', '--silent', '--proto', '=https', '--max-time', '30', '--max-redirs', '0',
    '--request', method, '--url', 'https://api.github.com' + path, '--write-out', '\n%{http_code}', '--config', '-'];
  const ca = process.env.CURL_CA_BUNDLE || process.env.SSL_CERT_FILE || process.env.NODE_EXTRA_CA_CERTS;
  if (ca) args.push('--cacert', ca);
  const result = run('curl', args, { input: config.join('\n') + '\n', encoding: 'utf8', maxBuffer: 1_000_000 });
  if (result.error || result.status !== 0) fail('GitHub transport failed; proxy and TLS verification were retained.');
  const split = result.stdout.lastIndexOf('\n');
  const status = Number(result.stdout.slice(split + 1));
  if ((method === 'POST' && status !== 201) || (method === 'GET' && status !== 200) || (method === 'DELETE' && status !== 204)) {
    fail('GitHub App request failed (HTTP ' + status + '); response withheld.');
  }
  if (status === 204) return null;
  try { return JSON.parse(result.stdout.slice(0, split)); } catch { fail('Invalid GitHub response; body withheld.'); }
}

export function permissionsMatch(actual, expected) {
  return actual && Object.entries(expected).every(([k, v]) => actual[k] === v)
    && Object.entries(actual).every(([k, v]) => expected[k] === v || k === 'metadata' && v === 'read');
}

export function issue(config, key, profile, api = request, now = Date.now()) {
  if (!Object.hasOwn(PROFILES, profile)) fail('Unknown permission profile.');
  const permissions = PROFILES[profile];
  const appJwt = jwt(config.appId, key, now);
  const installation = api('GET', '/app/installations/' + config.installationId, appJwt);
  if (installation.account?.login?.toLowerCase() !== REPOSITORY.split('/')[0].toLowerCase() || installation.suspended_at) {
    fail('The App installation must belong to the expected repository owner and be active.');
  }
  const minted = api('POST', '/app/installations/' + config.installationId + '/access_tokens', appJwt,
    { repositories: [REPOSITORY.split('/')[1]], permissions });
  if (typeof minted.token !== 'string' || !/^[A-Za-z0-9_]{20,512}$/.test(minted.token)) fail('No valid installation token returned.');
  try {
    const expiry = Date.parse(minted.expires_at);
    if (!Number.isFinite(expiry) || expiry - now < 300_000 || expiry - now > 3_660_000 || !permissionsMatch(minted.permissions, permissions)) {
      fail('Token expiry or granted permissions differ from the requested scope.');
    }
    const repos = api('GET', '/installation/repositories?per_page=100', minted.token);
    if (repos.total_count !== 1 || !Array.isArray(repos.repositories) || repos.repositories.length !== 1
        || repos.repositories[0].full_name?.toLowerCase() !== REPOSITORY.toLowerCase()) {
      fail('Token must access exactly the configured repository.');
    }
    return { token: minted.token, expiresAt: minted.expires_at, profile };
  } catch (error) {
    try { api('DELETE', '/installation/token', minted.token); }
    catch { fail('Token validation and revocation failed; revoke the App installation credential externally.'); }
    throw error;
  }
}

export function checkGitAuthConfig(env = process.env, run = spawnSync) {
  // Query names only: existing Authorization values must never enter diagnostics.
  // Conservatively refuse all extraHeader configurations, including URL scopes.
  const result = run('git', ['config', '--name-only', '--get-regexp', '^http(\\..*)?\\.extraheader$'],
    { env, stdio: 'ignore' });
  if (result.error || ![0, 1].includes(result.status)) fail('Cannot verify inherited Git authentication configuration.');
  if (result.status === 0) fail('Existing Git HTTP extraHeader configuration conflicts with explicit App identity.');
}

export function checkGitRemote(command, env = process.env, run = spawnSync) {
  const remote = command[2];
  if (!remote || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(remote)) {
    fail('Specify a named Git remote immediately after fetch/push/ls-remote.');
  }
  const args = ['remote', 'get-url', '--all', ...(command[1] === 'push' ? ['--push'] : []), remote];
  // get-url expands insteadOf/pushInsteadOf. Captured URLs never enter diagnostics.
  const result = run('git', args, { env, encoding: 'utf8', maxBuffer: 65536 });
  if (result.error || result.status !== 0 || !result.stdout?.trim()) fail('Cannot verify the selected Git remote.');
  const valid = result.stdout.trim().split(/\r?\n/).every(value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'github.com' && !url.port
        && !url.username && !url.password && !url.search && !url.hash
        && url.pathname.replace(/\/$/, '').replace(/\.git$/, '').toLowerCase() === '/' + REPOSITORY.toLowerCase();
    } catch { return false; }
  });
  if (!valid) fail('Git remote must be credential-free HTTPS for exactly the configured repository.');
}

export function childEnvironment(token, env = process.env) {
  // Explicit opt-in identity selection happens in CLI; no parent/global config changes.
  if (env.GIT_ALLOW_PROTOCOL !== undefined && !env.GIT_ALLOW_PROTOCOL.split(':').includes('https')) {
    fail('Inherited Git transport policy does not permit HTTPS.');
  }
  // SSH bypasses HTTPS credential helpers and would silently select an SSH user.
  // Narrow the child transport policy; never execute an inherited SSH identity.
  const child = { ...env, GH_TOKEN: token, GH_HOST: 'github.com', GIT_ALLOW_PROTOCOL: 'https' };
  const count = Number(child.GIT_CONFIG_COUNT || 0);
  if (!Number.isInteger(count) || count < 0 || count > 100) fail('Unexpected inherited Git config count.');
  const entries = [
    ['credential.https://github.com.helper', ''],
    ['credential.https://github.com.helper', '!f() { if test "$1" = get; then printf "username=x-access-token\\npassword=%s\\n" "$GH_TOKEN"; fi; }; f'],
    ['credential.https://github.com.useHttpPath', 'true'],
  ];
  entries.forEach(([key, value], i) => {
    child['GIT_CONFIG_KEY_' + (count + i)] = key;
    child['GIT_CONFIG_VALUE_' + (count + i)] = value;
  });
  child.GIT_CONFIG_COUNT = String(count + entries.length);
  return child;
}

export function parse(args) {
  const [mode, ...rest] = args;
  let profile = 'read';
  let selected = false;
  let command = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--profile') { profile = rest[++i]; continue; }
    if (rest[i] === '--use-app-identity') { selected = true; continue; }
    if (rest[i] === '--') { command = rest.slice(i + 1); break; }
    fail('Unexpected option.');
  }
  if (!Object.hasOwn(PROFILES, profile) || !['check', 'exec'].includes(mode)) fail('Usage: check [--profile read|author] | exec --use-app-identity [--profile read|author] -- gh|git ...');
  if (mode === 'check' && command.length) fail('Check does not execute commands.');
  if (mode === 'exec') {
    if (!selected) fail('Explicit --use-app-identity is required; no automatic token fallback.');
    const allowed = { gh: ['api', 'pr', 'run', 'workflow', 'repo', 'issue'], git: ['fetch', 'push', 'ls-remote'] };
    if (!Object.hasOwn(allowed, command[0]) || !allowed[command[0]].includes(command[1])
        || command.some(a => a === '--hostname' || a.startsWith('--hostname='))) {
      fail('Only approved gh/git commands on github.com may receive the token.');
    }
  }
  return { mode, profile, command };
}

export function main(args, dependencies = {}) {
  const { mode, profile, command } = parse(args);
  const env = dependencies.env || process.env;
  if (mode === 'exec' && command[0] === 'git') {
    checkGitAuthConfig(env, dependencies.configRun || spawnSync);
    checkGitRemote(command, env, dependencies.configRun || spawnSync);
  }
  const config = configuration(env);
  const key = (dependencies.loadKey || loadKey)(config.keyFile);
  const api = dependencies.api || request;
  const lease = issue(config, key, profile, api);
  let exit = 0;
  try {
    if (mode === 'exec') {
      const result = (dependencies.spawn || spawnSync)(command[0], command.slice(1), { env: childEnvironment(lease.token, env), stdio: 'inherit' });
      exit = result.error || result.signal ? 1 : result.status ?? 1;
    }
  } finally {
    api('DELETE', '/installation/token', lease.token);
  }
  if (mode === 'check') (dependencies.output || console.log)(JSON.stringify({ repository: REPOSITORY, profile,
    expiresAt: lease.expiresAt, identity: 'github-app-installation', tokenStored: false, revoked: true }));
  return exit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) {
    // Only errors generated above are safe; OS/crypto errors may contain paths/inputs.
    console.error(error instanceof SafeError ? error.message : 'GitHub App token operation failed; details withheld.');
    process.exitCode = 1;
  }
}
