/**
 * 운영 스크립트 DB 로그인 identity 계약 — WO-O4O-REPOSITORY-DB-IDENTITY-AND-LEGACY-OPERATIONAL-SCRIPTS-CLEANUP-V1
 *
 * `o4o_api` 는 NOLOGIN owner role 이다(SETUP.md §4). 스크립트는 로그인 identity 를 코드에서
 * 추정하지 않고 `DB_USERNAME` 이 없으면 즉시 실패한다.
 *
 *   ① helper 는 DB_USERNAME 이 없거나 공백이면 throw 한다
 *   ② ACTIVE / PAUSED 스크립트는 helper(또는 동일 inline 검사)를 쓰고 o4o_api 로그인이 없다
 *   ③ o4o_api 로그인을 하드코딩한 파일은 동결 목록(LEGACY) 안에만 있다 — 목록은 줄어들기만 한다
 *
 * DB 에 연결하지 않는다.
 */
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const SCRIPTS = path.resolve(__dirname, '..');
const HELPER = path.join(SCRIPTS, 'require-db-username.mjs');

// o4o_api 로 로그인하는 형태 — 설명 문장(owner role 언급)은 잡지 않는다.
const LOGIN_RE =
  /(user(name)?['"]?\s*:\s*['"]o4o_api['"])|((\|\||\?\?)\s*['"]o4o_api['"])|(USER(NAME)?=o4o_api(?!_v2)\b)|(-U\s*o4o_api(?!_v2)\b)/;

const PAUSED_MJS = [
  'hff-en-c01-apply.mjs',
  'hff-en-c01-fix-speckle.mjs',
  'hff-en-c01-glossary.mjs',
  'hff-en-c01-regression.mjs',
  'hff-en-c01-survey.mjs',
  'hff-en-c01-verify.mjs',
  'hff-en-census-fetch.mjs',
  'hff-ja-b04-apply.mjs',
  'hff-ja-b04-measure.mjs',
  'hff-ja-b04-regression.mjs',
  'hff-ja-b04-verify.mjs',
];
const ACTIVE_INLINE = ['check-tables.ts', 'dev/init-kpa-signage.ts'];

function runHelper(env: Record<string, string | undefined>) {
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  delete childEnv.DB_USERNAME;
  Object.assign(childEnv, env);
  const code = `import(${JSON.stringify('file://' + HELPER.replace(/\\/g, '/'))}).then(m => console.log(m.requireDbUsername()))`;
  return spawnSync(process.execPath, ['-e', code], { env: childEnv, encoding: 'utf-8' });
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'data' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(m?[jt]s|mts|cjs)$/.test(e.name)) out.push(path.relative(SCRIPTS, p).split(path.sep).join('/'));
  }
  return out;
}

describe('① helper fail-fast', () => {
  it('DB_USERNAME 미설정이면 throw', () => {
    const r = runHelper({});
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/DB_USERNAME is required/);
  });
  it('DB_USERNAME 공백이면 throw', () => {
    const r = runHelper({ DB_USERNAME: '   ' });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/DB_USERNAME is required/);
  });
  it('DB_USERNAME 이 있으면 그 값을 그대로 쓴다 (기본값 없음)', () => {
    const r = runHelper({ DB_USERNAME: 'explicit_login' });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('explicit_login');
  });
});

describe('② ACTIVE / PAUSED 스크립트', () => {
  it.each(PAUSED_MJS)('%s 는 helper 로 로그인 identity 를 받는다', (f) => {
    const src = fs.readFileSync(path.join(SCRIPTS, f), 'latin1');
    expect(src).toContain("import { requireDbUsername } from './require-db-username.mjs';");
    expect(src).toMatch(/user: requireDbUsername\(\)/);
    expect(src).not.toMatch(LOGIN_RE);
  });
  it.each(ACTIVE_INLINE)('%s 는 fallback 없이 DB_USERNAME 을 요구한다', (f) => {
    const src = fs.readFileSync(path.join(SCRIPTS, f), 'utf-8');
    expect(src).toMatch(/user: requireDbUsername\(\)/);
    expect(src).toMatch(/if \(!user\) throw new Error\('DB_USERNAME is required/);
    expect(src).not.toMatch(LOGIN_RE);
  });
});

describe('③ o4o_api 로그인 하드코딩은 동결 LEGACY 목록 안에만', () => {
  const frozen: string[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'legacy-o4o-api-login-frozen.json'), 'utf-8'),
  ).files;
  const frozenSet = new Set(frozen);

  it('동결 목록 밖의 스크립트에 o4o_api 로그인이 없다', () => {
    const offenders = walk(SCRIPTS).filter(
      (f) => !frozenSet.has(f) && LOGIN_RE.test(fs.readFileSync(path.join(SCRIPTS, f), 'latin1')),
    );
    expect(offenders).toEqual([]);
  });
  it('ACTIVE / PAUSED 파일은 동결 목록에 없다', () => {
    for (const f of [...PAUSED_MJS, ...ACTIVE_INLINE]) expect(frozenSet.has(f)).toBe(false);
  });
});
