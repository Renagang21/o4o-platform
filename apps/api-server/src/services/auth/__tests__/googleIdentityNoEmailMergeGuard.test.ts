/**
 * WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1 (WO-2B) §5-B — 정적 guard (TypeScript AST)
 *
 * auth 모듈 안에서 "Google/OAuth/social 흐름이 email 로 users·linked_accounts 를 찾아 link/merge/login 하는"
 * 코드가 다시 들어오면 실패한다. 단순 grep 이 아니라 TS AST 로 다음을 검사한다.
 *
 *  G1  legacy `socialAuthService` 파일이 없고, auth 모듈 어디서도 import 하지 않는다.
 *  G2  OAuth/Google/social/link/merge 문맥(파일명 또는 둘러싼 함수/메서드명)에 있는 repository 조회
 *      (`findOne` · `findOneBy` · `find` · `findBy` · `exists` · `count`) 의 `where` 에 `email` 키가 없다.
 *      — email/password 로그인(`handleEmailLogin`) · 조회 서비스는 문맥 밖이므로 그대로 허용된다.
 *  G3  `AuthLoginService` 에 `handleOAuthLogin` 메서드 · `oauthProfile` 식별자 · `linkOAuthAccount` 호출이 없다.
 *  G4  `passportDynamic` strategy verify callback 안에 repository 조회/저장 · `handleSocialAuth` 호출이 없다.
 *  G5  `google-identity.service.ts` 는 `email` · `provider_id` · `users.provider` 를 조회 조건/식별자로 쓰지 않는다.
 *  G6  `AccountLinkingService.mergeAccounts` 가 없다.
 *  G7  Google Identity 자동 병합 응답 신호(`autoLinked`) 가 auth 타입/서비스에 없다.
 *
 * 스캔 범위 = auth 모듈: services/auth/** · services/account-linking.service.ts · services/authentication.service.ts
 *            · modules/auth/** · config/passportDynamic.ts · config/google-identity.config.ts (테스트 파일 제외)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const SRC = path.resolve(__dirname, '../../..');

const SCAN_ROOTS = [
  'services/auth',
  'modules/auth',
];
const SCAN_FILES = [
  'services/account-linking.service.ts',
  'services/authentication.service.ts',
  'config/passportDynamic.ts',
  'config/google-identity.config.ts',
];

const REPO_QUERY_METHODS = new Set(['findOne', 'findOneBy', 'find', 'findBy', 'exists', 'existsBy', 'count', 'countBy', 'findAndCount']);
const OAUTH_CONTEXT = /oauth|google|social|link|merge|passport|strategy/i;

function listTs(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      out.push(...listTs(full));
    } else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = [
  ...SCAN_ROOTS.flatMap((r) => listTs(path.join(SRC, r))),
  ...SCAN_FILES.map((f) => path.join(SRC, f)).filter((f) => fs.existsSync(f)),
];

const sources = new Map<string, ts.SourceFile>();
for (const f of files) {
  sources.set(f, ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true));
}

const rel = (f: string) => path.relative(SRC, f).replace(/\\/g, '/');

/** 노드를 둘러싼 함수/메서드 이름 체인(가까운 것부터). */
function enclosingNames(node: ts.Node): string[] {
  const names: string[] = [];
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isMethodDeclaration(cur) || ts.isFunctionDeclaration(cur) || ts.isFunctionExpression(cur) || ts.isArrowFunction(cur)) {
      const n = (cur as ts.MethodDeclaration | ts.FunctionDeclaration).name;
      if (n && ts.isIdentifier(n)) names.push(n.text);
      else if (ts.isVariableDeclaration(cur.parent) && ts.isIdentifier(cur.parent.name)) names.push(cur.parent.name.text);
    }
    cur = cur.parent;
  }
  return names;
}

function propName(p: ts.ObjectLiteralElementLike): string | undefined {
  if ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
    return p.name.text;
  }
  return undefined;
}

/** `where: {...}` / `where: [{...}, {...}]` 안의 최상위 키. 직접 `findOneBy({...})` 형태도 포함. */
function whereKeys(call: ts.CallExpression, method: string): string[] {
  const arg = call.arguments[0];
  if (!arg || !ts.isObjectLiteralExpression(arg)) return [];
  const keysOf = (o: ts.Expression): string[] =>
    ts.isObjectLiteralExpression(o) ? o.properties.map(propName).filter((k): k is string => !!k)
    : ts.isArrayLiteralExpression(o) ? o.elements.flatMap(keysOf)
    : [];
  if (/By$/.test(method)) return keysOf(arg);
  const where = arg.properties.find((p) => propName(p) === 'where');
  if (!where || !ts.isPropertyAssignment(where)) return [];
  return keysOf(where.initializer);
}

function walk(sf: ts.SourceFile, visit: (n: ts.Node) => void): void {
  const rec = (n: ts.Node) => { visit(n); ts.forEachChild(n, rec); };
  rec(sf);
}

function calledMethodName(call: ts.CallExpression): string | undefined {
  const e = call.expression;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  if (ts.isIdentifier(e)) return e.text;
  return undefined;
}

describe('WO-2B 정적 guard — OAuth/Google 흐름의 email lookup · 자동 병합 재도입 차단', () => {
  it('스캔 대상이 존재한다', () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files.some((f) => rel(f) === 'services/auth/auth-login.service.ts')).toBe(true);
    expect(files.some((f) => rel(f) === 'services/auth/google-identity.service.ts')).toBe(true);
    expect(files.some((f) => rel(f) === 'config/passportDynamic.ts')).toBe(true);
  });

  it('G1 legacy socialAuthService 파일 부재 · import 0', () => {
    expect(fs.existsSync(path.join(SRC, 'services/socialAuthService.ts'))).toBe(false);
    const importers: string[] = [];
    for (const [f, sf] of sources) {
      walk(sf, (n) => {
        if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && /socialAuthService/i.test(n.moduleSpecifier.text)) importers.push(rel(f));
        if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && /socialAuthService/i.test(n.arguments[0].text)) importers.push(rel(f));
      });
    }
    expect(importers).toEqual([]);
  });

  it('G2 OAuth/Google/social/link/merge 문맥의 repository 조회 where 에 email 키 없음', () => {
    const violations: string[] = [];
    for (const [f, sf] of sources) {
      const fileCtx = OAUTH_CONTEXT.test(path.basename(f));
      walk(sf, (n) => {
        if (!ts.isCallExpression(n)) return;
        const m = calledMethodName(n);
        if (!m || !REPO_QUERY_METHODS.has(m)) return;
        const keys = whereKeys(n, m);
        if (!keys.includes('email')) return;
        const fnNames = enclosingNames(n);
        const fnCtx = fnNames.some((name) => OAUTH_CONTEXT.test(name) && !/^handleEmailLogin$|^linkEmailAccount$|^verifyEmailLinking$/.test(name));
        if (fileCtx || fnCtx) {
          const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
          violations.push(`${rel(f)}:${line + 1} ${m}(where.email) in ${fnNames[0] ?? '<module>'}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('G3 AuthLoginService — handleOAuthLogin · oauthProfile · linkOAuthAccount 호출 없음 · provider !== email 은 거절', () => {
    const f = path.join(SRC, 'services/auth/auth-login.service.ts');
    const sf = sources.get(f)!;
    const found: string[] = [];
    walk(sf, (n) => {
      if (ts.isMethodDeclaration(n) && ts.isIdentifier(n.name) && /oauth/i.test(n.name.text)) found.push(`method ${n.name.text}`);
      if (ts.isIdentifier(n) && n.text === 'oauthProfile') found.push('identifier oauthProfile');
      if (ts.isCallExpression(n) && calledMethodName(n) === 'linkOAuthAccount') found.push('call linkOAuthAccount');
    });
    expect(found).toEqual([]);

    // login() 본문에 provider !== 'email' 거절 분기가 있다 (email 전용 축소).
    let loginBody = '';
    walk(sf, (n) => {
      if (ts.isMethodDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'login' && n.body) loginBody = n.body.getText(sf);
    });
    expect(loginBody).toMatch(/provider\s*!==\s*'email'/);
    expect(loginBody).not.toMatch(/handleOAuthLogin/);
  });

  it('G4 passportDynamic strategy verify callback — repository 조회/저장 · handleSocialAuth 호출 없음', () => {
    const f = path.join(SRC, 'config/passportDynamic.ts');
    const sf = sources.get(f)!;
    const violations: string[] = [];
    walk(sf, (n) => {
      if (!ts.isMethodDeclaration(n) || !ts.isIdentifier(n.name) || !/^configure\w+Strategy$/.test(n.name.text)) return;
      walk(n as unknown as ts.SourceFile, (inner) => {
        if (!ts.isCallExpression(inner)) return;
        const m = calledMethodName(inner);
        if (!m) return;
        if (REPO_QUERY_METHODS.has(m) || /^(save|insert|update|upsert|getRepository|query|handleSocialAuth|linkOAuthAccount|mergeAccounts)$/.test(m)) {
          violations.push(`${n.name.getText(sf)} → ${m}`);
        }
      });
    });
    expect(violations).toEqual([]);
  });

  it('G5 google-identity.service.ts — email · provider_id · users.provider 를 조회 키로 쓰지 않는다', () => {
    const f = path.join(SRC, 'services/auth/google-identity.service.ts');
    const sf = sources.get(f)!;
    const violations: string[] = [];
    walk(sf, (n) => {
      if (ts.isCallExpression(n)) {
        const m = calledMethodName(n);
        if (m && REPO_QUERY_METHODS.has(m)) {
          const keys = whereKeys(n, m);
          if (keys.includes('email')) violations.push(`${m}(where.email)`);
          if (keys.includes('provider_id')) violations.push(`${m}(where.provider_id)`);
          if (!keys.includes('providerId') || !keys.includes('provider')) violations.push(`${m} must query (provider, providerId)`);
        }
      }
      if (ts.isIdentifier(n) && n.text === 'provider_id') violations.push('identifier provider_id');
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && /entities\/User\.js$/.test(n.moduleSpecifier.text)) violations.push('imports User entity');
    });
    expect(violations).toEqual([]);
  });

  it('G6 AccountLinkingService.mergeAccounts 없음', () => {
    const f = path.join(SRC, 'services/account-linking.service.ts');
    const sf = sources.get(f)!;
    const methods: string[] = [];
    walk(sf, (n) => {
      if (ts.isMethodDeclaration(n) && ts.isIdentifier(n.name)) methods.push(n.name.text);
    });
    expect(methods).not.toContain('mergeAccounts');
    expect(methods).toContain('linkOAuthAccount'); // WO-2C 골격 유지
    expect(methods).toContain('getMergedProfile'); // login 응답 사용
  });

  it('G7 autoLinked 신호가 auth 타입/서비스에 없다', () => {
    const typesFile = path.join(SRC, 'types/account-linking.ts');
    const typesSf = ts.createSourceFile(typesFile, fs.readFileSync(typesFile, 'utf8'), ts.ScriptTarget.Latest, true);
    const hits: string[] = [];
    for (const [f, sf] of [...sources, [typesFile, typesSf] as const]) {
      walk(sf, (n) => {
        if (ts.isIdentifier(n) && n.text === 'autoLinked') hits.push(rel(f));
      });
    }
    expect(hits).toEqual([]);
  });
});
