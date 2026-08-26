#!/usr/bin/env node
/**
 * WO-O4O-TYPEORM-ENTITY-REGISTRY-INTEGRITY-GUARD-AND-CI-ADOPTION-V1
 * TypeORM entity 정의 ↔ runtime registry 정합성 가드
 *
 * 배경 (2026-08-25 장애):
 *   `AiEngine` / `AiQueryPolicy` / `AiQueryLog` 는 `@Entity()` 로 정의돼 있었고
 *   runtime 에서 `AppDataSource.getRepository(AiEngine)` 로 소비됐지만
 *   `apps/api-server/src/database/entities.ts` 에 등록돼 있지 않았다.
 *   → `EntityMetadataNotFoundError` → `/api/ai/admin/**` 전면 500.
 *
 *   이 스크립트의 이전 버전은 그 사고를 **탐지하지 못했다**. 이유는 두 가지다.
 *     (1) registry 가 `connection.ts` 인라인 배열에서 `database/entities.ts` 로 분리된 뒤에도
 *         `connection.ts` 의 `entities: [...]` 를 정규식으로 찾고 있었다 → 파싱 실패 → exit 2.
 *     (2) scan 범위가 `src/modules` · `src/routes` 뿐이어서 `src/entities/` 가 통째로 빠져 있었다.
 *         장애를 낸 세 entity 가 전부 `src/entities/` 에 있었다.
 *   그래서 이번에는 정규식이 아니라 **TypeScript AST** 로 읽고, scan 범위를 `src/**` 전체로 넓힌다.
 *
 * 정본 계약:
 *   `apps/api-server/src/database/entities.ts` 의 `export const entities = [...]` 가
 *   runtime entity registry 의 SSOT 다. glob 자동 등록도, `synchronize: true` 도 쓰지 않는다.
 *
 * 검출 규칙 (5종):
 *   D1  DEFINED_BUT_UNREGISTERED        `@Entity()` 정의됐는데 registry 배열에 없다
 *   D2  REGISTERED_BUT_SOURCE_MISSING   registry 가 import 하는 상대경로 모듈이 존재하지 않는다
 *   D3  IMPORT_EXISTS_BUT_ARRAY_MISSING registry 가 entity 를 import 했는데 배열에 넣지 않았다
 *   D4  ARRAY_ENTRY_WITHOUT_IMPORT      배열에 있는 식별자가 import 되지도 선언되지도 않았다
 *   D5  DUPLICATE_REGISTRATION          같은 식별자가 배열에 두 번 이상 있다
 *
 * D1 의 판정 (여기가 이 가드의 핵심이다):
 *   미등록 entity 는 두 부류로 갈린다.
 *     (a) **runtime 도달 가능한 코드가 repository 로 소비하는 entity**
 *         = `main.ts` 에서 import 그래프를 따라 도달하는 파일에서
 *           `getRepository(X)` / `Repository<X>` / `InjectRepository(X)` 등으로 쓰인다.
 *         → 이게 2026-08-25 장애의 형태다. **항상 실패시킨다. allowlist 로 덮을 수 없다.**
 *     (b) 도달 가능한 소비처가 없는 legacy 정의 (dead entity)
 *         → 등록해도 얻는 게 없고, 개중에는 table 조차 없는 것도 있어 등록이 오히려 위험하다.
 *           `UNREGISTERED_INVENTORY` 에 **파일 경로와 근거를 적어 개별 등재**한 것만 통과시킨다.
 *
 *   즉 allowlist 는 "규칙에서 빼주는 장치" 가 아니라 **동결된 재고 목록** 이다.
 *   - 목록에 없는 새 미등록 entity → 실패 (신규 entity 는 등록하거나 근거를 남겨야 한다)
 *   - 목록에 있어도 도달 가능한 소비처가 생기면 → 실패 (a 규칙이 우선한다)
 *   - 목록 항목이 등록됐거나 사라지면 → 실패 (stale allowlist 를 방치하지 않는다)
 *   광범위 ignore 패턴(디렉터리 통째 제외 등)은 쓰지 않는다.
 *
 * 사용:
 *   node scripts/check-typeorm-entities.mjs          # 위반 시 exit 1
 *   node scripts/check-typeorm-entities.mjs --json   # 결과를 JSON 으로 출력
 *   node scripts/check-typeorm-entities.mjs --registry-source <path>
 *                                                    # registry 내용만 다른 파일에서 읽는다 (회귀 테스트용)
 *
 * 테스트:
 *   `analyzeEntityRegistry()` 는 순수 함수로 export 되고, CLI 는 `--registry-source` 로 입력을 주입받는다.
 *   덕분에 실제 `entities.ts` 를 수정하지 않고 "registry 에서 entity 를 뺀 상태" 를 재현해 검증할 수 있다.
 *   → `apps/api-server/src/__tests__/typeorm-entity-registry-guard.spec.ts`
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
/** @type {import('typescript')} */
const ts = require('typescript');

const posix = (p) => p.split('\\').join('/');

// ---------------------------------------------------------------------------
// 동결 재고 — 도달 가능한 repository 소비처가 없는 미등록 entity
// (2026-08-26 산출. 각 항목은 파일 경로까지 일치해야 하며, 등록되거나 삭제되면 이 목록에서 빼야 한다.)
// ---------------------------------------------------------------------------
const DEAD = 'DEAD_ENTITY: runtime 도달 가능한 repository 소비처 없음 (legacy 정의)';
const DEAD_UNREACHABLE_SERVICE = (svc) =>
  `DEAD_ENTITY: ${svc} 에서만 repository 로 쓰이며, 그 모듈이 main.ts import 그래프에서 도달 불가`;

export const UNREGISTERED_INVENTORY = new Map([
  // --- src/entities/ 내 legacy 정의 ---
  ['AIReference', { file: 'apps/api-server/src/entities/AIReference.ts', reason: DEAD }],
  ['Alert', { file: 'apps/api-server/src/entities/Alert.ts', reason: DEAD_UNREACHABLE_SERVICE('services/CircuitBreakerService.ts · services/degradation/**') }],
  ['AnalyticsReport', { file: 'apps/api-server/src/entities/AnalyticsReport.ts', reason: DEAD }],
  ['AutomationLog', { file: 'apps/api-server/src/entities/AutomationLog.ts', reason: DEAD }],
  ['AutomationRule', { file: 'apps/api-server/src/entities/AutomationRule.ts', reason: DEAD }],
  ['BusinessInfo', { file: 'apps/api-server/src/entities/BusinessInfo.ts', reason: DEAD_UNREACHABLE_SERVICE('services/CommissionCalculator.ts') }],
  ['CmsContentRecommendation', { file: 'apps/api-server/src/entities/CmsContentRecommendation.entity.ts', reason: DEAD }],
  ['CommissionPolicy', { file: 'apps/api-server/src/entities/CommissionPolicy.ts', reason: DEAD_UNREACHABLE_SERVICE('services/PolicyResolutionService.ts') }],
  ['ExternalChannel', { file: 'apps/api-server/src/entities/ExternalChannel.ts', reason: DEAD }],
  ['NotificationTemplate', { file: 'apps/api-server/src/entities/NotificationTemplate.ts', reason: DEAD }],
  ['OperationsDashboard', { file: 'apps/api-server/src/entities/OperationsDashboard.ts', reason: DEAD }],
  ['PostRevision', { file: 'apps/api-server/src/entities/PostRevision.ts', reason: DEAD }],
  ['Product', { file: 'apps/api-server/src/entities/Product.ts', reason: DEAD_UNREACHABLE_SERVICE('services/CommissionCalculator.ts · services/PolicyResolutionService.ts') }],
  ['ScreenTemplate', { file: 'apps/api-server/src/entities/ScreenTemplate.ts', reason: DEAD }],
  ['ShippingCarrier', { file: 'apps/api-server/src/entities/ShippingCarrier.ts', reason: DEAD }],
  ['StatusPageIncident', { file: 'apps/api-server/src/entities/StatusPage.ts', reason: DEAD }],
  ['StatusPageComponent', { file: 'apps/api-server/src/entities/StatusPage.ts', reason: DEAD }],
  ['StatusPageMetric', { file: 'apps/api-server/src/entities/StatusPage.ts', reason: DEAD }],
  ['StatusPageMaintenance', { file: 'apps/api-server/src/entities/StatusPage.ts', reason: DEAD }],
  ['StatusPageSubscriber', { file: 'apps/api-server/src/entities/StatusPage.ts', reason: DEAD }],
  ['Store', { file: 'apps/api-server/src/entities/Store.ts', reason: DEAD }],
  ['Supplier', { file: 'apps/api-server/src/entities/Supplier.ts', reason: DEAD_UNREACHABLE_SERVICE('services/PolicyResolutionService.ts') }],
  ['SystemMetrics', { file: 'apps/api-server/src/entities/SystemMetrics.ts', reason: DEAD_UNREACHABLE_SERVICE('services/CircuitBreakerService.ts · services/degradation/**') }],
  ['Template', { file: 'apps/api-server/src/entities/Template.ts', reason: DEAD_UNREACHABLE_SERVICE('controllers/templatesController.ts') }],
  ['UrlRedirect', { file: 'apps/api-server/src/entities/UrlRedirect.ts', reason: DEAD }],
  ['UserAction', { file: 'apps/api-server/src/entities/UserAction.ts', reason: DEAD }],
  ['UserSession', { file: 'apps/api-server/src/entities/UserSession.ts', reason: DEAD }],
  ['Wishlist', { file: 'apps/api-server/src/entities/Wishlist.ts', reason: DEAD }],
  ['WorkflowState', { file: 'apps/api-server/src/entities/WorkflowState.ts', reason: DEAD }],
  ['WorkflowTransition', { file: 'apps/api-server/src/entities/WorkflowTransition.ts', reason: DEAD }],

  // --- module / route 하위 legacy 정의 ---
  ['OfferServicePrice', { file: 'apps/api-server/src/modules/neture/entities/OfferServicePrice.entity.ts', reason: DEAD }],
  ['CosmeticsContent', { file: 'apps/api-server/src/routes/cosmetics/entities/cosmetics-content.entity.ts', reason: DEAD }],
  ['GlycopharmPharmacy', { file: 'apps/api-server/src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts', reason: DEAD }],
  ['KpaCourseRequest', { file: 'apps/api-server/src/routes/kpa/entities/kpa-course-request.entity.ts', reason: DEAD }],
  ['KpaInstructorQualification', { file: 'apps/api-server/src/routes/kpa/entities/kpa-instructor-qualification.entity.ts', reason: DEAD }],
  ['StoreEvent', { file: 'apps/api-server/src/routes/platform/entities/store-event.entity.ts', reason: DEAD }],

  // --- signage extension (routes/signage/extensions/**) — repository 는 있으나 route 가 등록되지 않아 도달 불가 ---
  ['CosmeticsBrandContent', { file: 'apps/api-server/src/routes/signage/extensions/cosmetics/entities/CosmeticsBrandContent.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/cosmetics/repositories/**') }],
  ['CosmeticsContentPreset', { file: 'apps/api-server/src/routes/signage/extensions/cosmetics/entities/CosmeticsContentPreset.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/cosmetics/repositories/**') }],
  ['CosmeticsTrendCard', { file: 'apps/api-server/src/routes/signage/extensions/cosmetics/entities/CosmeticsTrendCard.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/cosmetics/repositories/**') }],
  ['PharmacyCategory', { file: 'apps/api-server/src/routes/signage/extensions/pharmacy/entities/PharmacyCategory.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/pharmacy/repositories/**') }],
  ['PharmacyContent', { file: 'apps/api-server/src/routes/signage/extensions/pharmacy/entities/PharmacyContent.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/pharmacy/repositories/**') }],
  ['PharmacySeasonalCampaign', { file: 'apps/api-server/src/routes/signage/extensions/pharmacy/entities/PharmacySeasonalCampaign.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/pharmacy/repositories/**') }],
  ['PharmacyTemplatePreset', { file: 'apps/api-server/src/routes/signage/extensions/pharmacy/entities/PharmacyTemplatePreset.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/pharmacy/repositories/**') }],
  ['SellerCampaign', { file: 'apps/api-server/src/routes/signage/extensions/seller/entities/SellerCampaign.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/seller/repositories/**') }],
  ['SellerContent', { file: 'apps/api-server/src/routes/signage/extensions/seller/entities/SellerContent.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/seller/repositories/**') }],
  ['SellerContentMetric', { file: 'apps/api-server/src/routes/signage/extensions/seller/entities/SellerContentMetric.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/seller/repositories/**') }],
  ['SellerMetricEvent', { file: 'apps/api-server/src/routes/signage/extensions/seller/entities/SellerContentMetric.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/seller/repositories/**') }],
  ['SellerPartner', { file: 'apps/api-server/src/routes/signage/extensions/seller/entities/SellerPartner.entity.ts', reason: DEAD_UNREACHABLE_SERVICE('routes/signage/extensions/seller/repositories/**') }],
]);

const SKIP_DIR = new Set(['node_modules', 'dist', 'build', 'coverage', 'migrations', '__tests__', '__mocks__']);
const SKIP_FILE = /\.(test|spec)\.tsx?$|\.d\.ts$/;

// ---------------------------------------------------------------------------
// 파일 수집 / 모듈 해석
// ---------------------------------------------------------------------------
function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue;
      walk(p, out);
    } else if (e.name.endsWith('.ts') && !SKIP_FILE.test(e.name)) {
      out.push(posix(p));
    }
  }
  return out;
}

/** 상대 import specifier(ESM `.js` 확장자 포함) → 실제 `.ts` 파일 경로 */
function resolveRelative(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = posix(resolve(dirname(fromFile), spec)).replace(/\.js$/, '');
  for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(cand) && statSync(cand).isFile()) return posix(cand);
  }
  return null;
}

const IMPORT_SPEC =
  /(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

/** entry 파일들에서 상대 import 그래프를 따라 도달 가능한 파일 집합 */
function computeReachable(entryFiles, readFile) {
  const seen = new Set();
  const stack = entryFiles.filter((f) => existsSync(f)).map(posix);
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let text;
    try {
      text = readFile(file);
    } catch {
      continue;
    }
    IMPORT_SPEC.lastIndex = 0;
    let m;
    while ((m = IMPORT_SPEC.exec(text))) {
      const next = resolveRelative(file, m[1] || m[2] || m[3] || m[4]);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// registry(entities.ts) AST 파싱
// ---------------------------------------------------------------------------
function unwrap(node) {
  let n = node;
  while (n && (ts.isAsExpression(n) || ts.isParenthesizedExpression(n) || ts.isSatisfiesExpression?.(n))) {
    n = n.expression;
  }
  return n;
}

export function parseRegistry(sourceText, registryFile) {
  const sf = ts.createSourceFile(registryFile, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = new Map(); // localName -> { module, imported, kind, typeOnly }
  const localDecls = new Set(); // registry 파일 안에서 직접 선언/재선언된 식별자
  const arrayEntries = []; // { name, spread }
  let arrayFound = false;

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && st.importClause) {
      const mod = st.moduleSpecifier.text;
      const clause = st.importClause;
      if (clause.name) {
        imports.set(clause.name.text, { module: mod, imported: 'default', kind: 'default', typeOnly: clause.isTypeOnly });
      }
      const nb = clause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          imports.set(el.name.text, {
            module: mod,
            imported: el.propertyName ? el.propertyName.text : el.name.text,
            kind: el.propertyName ? 'alias' : 'named',
            typeOnly: Boolean(clause.isTypeOnly || el.isTypeOnly),
          });
        }
      }
      if (nb && ts.isNamespaceImport(nb)) {
        imports.set(nb.name.text, { module: mod, imported: '*', kind: 'namespace', typeOnly: clause.isTypeOnly });
      }
      continue;
    }
    if (ts.isClassDeclaration(st) && st.name) localDecls.add(st.name.text);
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        localDecls.add(d.name.text);
        if (d.name.text !== 'entities') continue;
        const init = unwrap(d.initializer);
        if (!init || !ts.isArrayLiteralExpression(init)) continue;
        arrayFound = true;
        for (const el of init.elements) {
          if (ts.isSpreadElement(el)) arrayEntries.push({ name: el.expression.getText(sf), spread: true });
          else arrayEntries.push({ name: el.getText(sf), spread: false });
        }
      }
    }
  }
  return { imports, localDecls, arrayEntries, arrayFound };
}

// ---------------------------------------------------------------------------
// @Entity 클래스 수집
// ---------------------------------------------------------------------------
function hasEntityDecorator(node) {
  const decorators = ts.getDecorators ? ts.getDecorators(node) || [] : [];
  return decorators.some((d) => {
    const ex = d.expression;
    const name = ts.isCallExpression(ex) ? ex.expression.getText() : ex.getText();
    return name === 'Entity' || name.endsWith('.Entity');
  });
}

export function collectDefinedEntities(files, readFile) {
  const defined = new Map(); // className -> { file, abstract, exported, tableName }
  for (const file of files) {
    let text;
    try {
      text = readFile(file);
    } catch {
      continue;
    }
    if (!text.includes('@Entity')) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isClassDeclaration(node) && node.name && hasEntityDecorator(node)) {
        const mods = node.modifiers || [];
        defined.set(node.name.text, {
          file,
          abstract: mods.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword),
          exported: mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
        });
      }
      node.forEachChild(visit);
    };
    sf.forEachChild(visit);
  }
  return defined;
}

// ---------------------------------------------------------------------------
// repository 소비처 탐지
// ---------------------------------------------------------------------------
function repositoryUseRegex(name) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    [
      `getRepository\\s*(?:<[^>]*>)?\\s*\\(\\s*${n}\\s*[,)]`,
      `getTreeRepository\\s*\\(\\s*${n}\\s*[,)]`,
      `getMongoRepository\\s*\\(\\s*${n}\\s*[,)]`,
      `getCustomRepository\\s*\\(\\s*${n}\\s*[,)]`,
      `InjectRepository\\s*\\(\\s*${n}\\s*[,)]`,
      `Repository\\s*<\\s*${n}\\s*>`,
      `getMetadata\\s*\\(\\s*${n}\\s*\\)`,
      `createQueryBuilder\\s*\\(\\s*${n}\\s*[,)]`,
      `\\bmanager\\.\\w+\\s*\\(\\s*${n}\\s*[,)]`,
    ].join('|')
  );
}

// ---------------------------------------------------------------------------
// 본체
// ---------------------------------------------------------------------------
/**
 * @param {object} opts
 * @param {string} opts.root                리포지토리 루트 (절대경로)
 * @param {string} [opts.registryFile]      registry 파일 경로 (기본: apps/api-server/src/database/entities.ts)
 * @param {string} [opts.registrySource]    registry 소스 override — 테스트용. 파일 경로는 그대로 두고 내용만 바꾼다.
 * @param {string} [opts.srcRoot]           scan 루트 (기본: apps/api-server/src)
 * @param {string[]} [opts.entryFiles]      runtime entry (기본: apps/api-server/src/main.ts)
 * @param {Map} [opts.allowlist]            동결 재고 목록 override — 테스트용
 */
export function analyzeEntityRegistry(opts = {}) {
  const root = posix(opts.root || process.cwd());
  const registryFile = posix(opts.registryFile || join(root, 'apps/api-server/src/database/entities.ts'));
  const srcRoot = posix(opts.srcRoot || join(root, 'apps/api-server/src'));
  const entryFiles = (opts.entryFiles || [join(srcRoot, 'main.ts')]).map(posix);
  const allowlist = opts.allowlist || UNREGISTERED_INVENTORY;

  const cache = new Map();
  const readFile = (f) => {
    const key = posix(f);
    if (key === registryFile && typeof opts.registrySource === 'string') return opts.registrySource;
    if (!cache.has(key)) cache.set(key, readFileSync(key, 'utf8'));
    return cache.get(key);
  };

  const errors = [];
  const notes = [];
  const rel = (f) => posix(relative(root, f));

  if (!existsSync(registryFile)) {
    return { ok: false, fatal: `registry 파일이 없다: ${rel(registryFile)}`, errors: [], notes: [], stats: {} };
  }

  const { imports, localDecls, arrayEntries, arrayFound } = parseRegistry(readFile(registryFile), registryFile);
  if (!arrayFound) {
    return {
      ok: false,
      fatal: `${rel(registryFile)} 에서 \`export const entities = [...]\` 배열을 찾지 못했다. registry SSOT 가 옮겨졌는지 확인한다.`,
      errors: [],
      notes: [],
      stats: {},
    };
  }

  const identifierEntries = arrayEntries.filter((e) => !e.spread);
  const spreadEntries = arrayEntries.filter((e) => e.spread);
  const registeredLocals = new Set(identifierEntries.map((e) => e.name));

  // alias 를 원래 클래스명으로 되돌린다 (`View as CMSView` → View)
  const originalOf = (local) => {
    const info = imports.get(local);
    if (!info || info.imported === 'default' || info.imported === '*') return local;
    return info.imported;
  };
  const registeredOriginals = new Set([...registeredLocals].map(originalOf));

  const files = walk(srcRoot).filter((f) => f !== registryFile);
  const defined = collectDefinedEntities(files, readFile);
  const reachable = computeReachable(entryFiles, readFile);

  // --- D5 DUPLICATE_REGISTRATION -------------------------------------------
  const counts = new Map();
  for (const e of identifierEntries) counts.set(e.name, (counts.get(e.name) || 0) + 1);
  for (const [name, n] of counts) {
    if (n > 1) errors.push({ code: 'DUPLICATE_REGISTRATION', entity: name, detail: `entities 배열에 ${n}회 중복 등록됐다` });
  }
  const spreadCounts = new Map();
  for (const e of spreadEntries) spreadCounts.set(e.name, (spreadCounts.get(e.name) || 0) + 1);
  for (const [name, n] of spreadCounts) {
    if (n > 1) errors.push({ code: 'DUPLICATE_REGISTRATION', entity: `...${name}`, detail: `spread 가 ${n}회 중복 등록됐다` });
  }

  // --- D4 ARRAY_ENTRY_WITHOUT_IMPORT ---------------------------------------
  for (const name of new Set([...registeredLocals, ...spreadEntries.map((e) => e.name)])) {
    if (!imports.has(name) && !localDecls.has(name)) {
      errors.push({ code: 'ARRAY_ENTRY_WITHOUT_IMPORT', entity: name, detail: 'entities 배열에 있으나 import 도 선언도 되지 않았다' });
    }
  }

  // --- D2 REGISTERED_BUT_SOURCE_MISSING ------------------------------------
  for (const name of new Set([...registeredLocals, ...spreadEntries.map((e) => e.name)])) {
    const info = imports.get(name);
    if (!info || !info.module.startsWith('.')) continue; // 패키지 import 는 workspace 빌드/type-check 가 잡는다
    if (!resolveRelative(registryFile, info.module)) {
      errors.push({
        code: 'REGISTERED_BUT_SOURCE_MISSING',
        entity: name,
        detail: `import 원본 모듈이 존재하지 않는다: ${info.module}`,
      });
    }
  }

  // --- D3 IMPORT_EXISTS_BUT_ARRAY_MISSING ----------------------------------
  for (const [local, info] of imports) {
    if (registeredLocals.has(local)) continue;
    if (info.typeOnly) continue; // `import type` 은 등록 대상이 아니다
    const original = originalOf(local);
    if (!defined.has(original)) continue; // entity 가 아닌 import (util, enum, type ...)
    errors.push({
      code: 'IMPORT_EXISTS_BUT_ARRAY_MISSING',
      entity: local,
      detail: `entities.ts 가 import 했지만 entities 배열에 넣지 않았다 (${rel(defined.get(original).file)})`,
    });
  }

  // --- D1 DEFINED_BUT_UNREGISTERED -----------------------------------------
  const unregistered = [];
  for (const [name, info] of defined) {
    if (registeredOriginals.has(name)) continue;
    if (info.abstract) {
      notes.push({ code: 'ABSTRACT_BASE', entity: name, file: rel(info.file) });
      continue;
    }
    unregistered.push({ name, ...info });
  }

  const liveConsumerOf = new Map();
  if (unregistered.length) {
    const scanFiles = files.filter((f) => reachable.has(f));
    for (const u of unregistered) {
      const re = repositoryUseRegex(u.name);
      const hits = scanFiles.filter((f) => re.test(readFile(f)));
      if (hits.length) liveConsumerOf.set(u.name, hits.map(rel));
    }
  }

  for (const u of unregistered) {
    const live = liveConsumerOf.get(u.name);
    if (live) {
      errors.push({
        code: 'DEFINED_BUT_UNREGISTERED',
        entity: u.name,
        detail:
          `runtime 도달 가능한 코드가 repository 로 소비하는데 entities.ts 에 등록되지 않았다 ` +
          `→ EntityMetadataNotFoundError (HTTP 500). 정의: ${rel(u.file)} / 소비: ${live.join(', ')}`,
      });
      continue;
    }
    const allowed = allowlist.get(u.name);
    if (!allowed) {
      errors.push({
        code: 'DEFINED_BUT_UNREGISTERED',
        entity: u.name,
        detail:
          `entities.ts 에 등록되지 않았다 (정의: ${rel(u.file)}). ` +
          `등록하거나, 등록하지 않는 근거를 scripts/check-typeorm-entities.mjs 의 UNREGISTERED_INVENTORY 에 남긴다.`,
      });
      continue;
    }
    if (posix(allowed.file) !== rel(u.file)) {
      errors.push({
        code: 'DEFINED_BUT_UNREGISTERED',
        entity: u.name,
        detail: `UNREGISTERED_INVENTORY 의 경로(${allowed.file})와 실제 정의 위치(${rel(u.file)})가 다르다. 재판정이 필요하다.`,
      });
      continue;
    }
    notes.push({ code: 'KNOWN_UNREGISTERED', entity: u.name, file: rel(u.file), reason: allowed.reason });
  }

  // --- allowlist 위생 -------------------------------------------------------
  const unregisteredNames = new Set(unregistered.map((u) => u.name));
  for (const [name, meta] of allowlist) {
    if (unregisteredNames.has(name)) continue;
    const why = defined.has(name) ? '이미 registry 에 등록됐다' : '해당 entity 정의를 더 이상 찾을 수 없다';
    errors.push({
      code: 'STALE_INVENTORY_ENTRY',
      entity: name,
      detail: `${why} — UNREGISTERED_INVENTORY 에서 제거한다 (${meta.file})`,
    });
  }

  return {
    ok: errors.length === 0,
    fatal: null,
    errors,
    notes,
    stats: {
      registryFile: rel(registryFile),
      arrayEntries: arrayEntries.length,
      registeredIdentifiers: registeredLocals.size,
      spreads: spreadEntries.map((e) => e.name),
      importsParsed: imports.size,
      scannedFiles: files.length,
      reachableFiles: reachable.size,
      definedEntities: defined.size,
      unregistered: unregistered.length,
      knownUnregistered: notes.filter((n) => n.code === 'KNOWN_UNREGISTERED').length,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
  const asJson = process.argv.includes('--json');
  // `--registry-source <path>`: registry 배열의 **내용만** 다른 파일에서 읽는다.
  // 경로 해석(import 원본 확인 등)은 원래 registry 위치를 그대로 쓴다.
  // 회귀 테스트가 실제 entities.ts 를 건드리지 않고 "entity 가 빠진 registry" 를 재현하기 위한 입력 주입이다.
  // CI 는 이 옵션 없이 실행한다.
  const srcIdx = process.argv.indexOf('--registry-source');
  const registrySource = srcIdx !== -1 && process.argv[srcIdx + 1] ? readFileSync(process.argv[srcIdx + 1], 'utf8') : undefined;
  const result = analyzeEntityRegistry({ root: process.cwd(), registrySource });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.fatal ? 2 : result.ok ? 0 : 1);
  }

  if (result.fatal) {
    console.error(`\n❌ TypeORM entity registry guard: ${result.fatal}\n`);
    process.exit(2);
  }

  const s = result.stats;
  console.log('TypeORM entity registry guard');
  console.log(`  registry SSOT       : ${s.registryFile}`);
  console.log(`  registry 배열 항목   : ${s.arrayEntries} (식별자 ${s.registeredIdentifiers} + spread ${s.spreads.length}${s.spreads.length ? `: ${s.spreads.join(', ')}` : ''})`);
  console.log(`  scan 파일            : ${s.scannedFiles} (runtime 도달 ${s.reachableFiles})`);
  console.log(`  @Entity 정의         : ${s.definedEntities}`);
  console.log(`  미등록                : ${s.unregistered} (동결 재고 등재 ${s.knownUnregistered})`);

  if (result.errors.length) {
    console.error(`\n❌ ${result.errors.length}건의 registry 정합성 위반\n`);
    const byCode = new Map();
    for (const e of result.errors) {
      if (!byCode.has(e.code)) byCode.set(e.code, []);
      byCode.get(e.code).push(e);
    }
    for (const [code, list] of byCode) {
      console.error(`  [${code}] ${list.length}건`);
      for (const e of list) console.error(`    - ${e.entity}: ${e.detail}`);
      console.error('');
    }
    console.error('  해결: apps/api-server/src/database/entities.ts 에 import + entities 배열 등록을 함께 추가한다.');
    console.error('        glob 자동 등록 · synchronize:true 는 도입하지 않는다.\n');
    process.exit(1);
  }

  console.log('\n✅ entity registry 정합성 통과 (DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale reference 0)\n');
  process.exit(0);
}

const invokedDirectly = process.argv[1] && posix(process.argv[1]).endsWith('check-typeorm-entities.mjs');
if (invokedDirectly) main();
