/**
 * WO-O4O-STORE-CONTENTS-SELECTOR-INLINE-POP-TO-V2-MIGRATION-V1
 *
 * KPA `StoreContentsSelector` 의 인라인 "POP 만들기" 가 legacy 즉시 PDF 생성
 * (POST /pharmacy/pop/generate) 대신 POP V2 canonical handoff 로 진입하는 것을 회귀 고정한다.
 *
 *   §1 selector — StorePopCreateModal / generateStorePop 을 import·렌더하지 않는다.
 *                 CANONICAL_STORE_POP_V2_ROUTE + buildPopV2HandoffState(popV2HandoffFromProductionItem) 로 navigate.
 *   §2 origin   — row origin 3종(direct / execution-asset / snapshot) 이 V2 어휘(direct / library / snapshot) 로
 *                 1:1 변환되고, 그 3종 모두 backend resolveContentPopSource 가 organization 격리로 읽는다.
 *   §3 handoff  — 계약은 식별자만 싣는다(본문 필드 없음). 순수 함수로 실제 변환 결과를 확인한다.
 *   §4 legacy   — KPA 인라인 caller = 0 (import graph). legacy page/API/service 는 KEEP_TEMPORARY 로 그대로.
 *   §5 boundary — KCos / PH 화면·공통 Core 는 변경되지 않았다.
 *
 * DB 는 붙이지 않는다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  popV2HandoffFromProductionItem,
  buildPopV2HandoffState,
  parsePopV2HandoffState,
  CANONICAL_STORE_POP_V2_ROUTE,
} from '../../../../packages/store-ui-core/src/components/pop-v2/handoff';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(...p), 'utf-8');
const stripComments = (s: string) =>
  s
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

const KPA = join(REPO, 'services', 'web-kpa-society', 'src');
const KCOS = join(REPO, 'services', 'web-k-cosmetics', 'src');
const PH = join(REPO, 'services', 'web-pharmacy-hub', 'src');

// ─────────────────────────────────────────────────────────────────────────────
describe('§1 selector — 인라인 POP 만들기 = POP V2 handoff', () => {
  const src = stripComments(read(KPA, 'pages', 'pharmacy', 'StoreContentsSelector.tsx'));

  it('StorePopCreateModal / generateStorePop / api/storePop 을 import 하지 않는다', () => {
    expect(src).not.toMatch(/StorePopCreateModal|InlinePopTarget|generateStorePop|api\/storePop/);
  });

  it('V2 handoff 계약(CANONICAL_STORE_POP_V2_ROUTE · buildPopV2HandoffState · popV2HandoffFromProductionItem) 을 쓴다', () => {
    expect(src).toMatch(/CANONICAL_STORE_POP_V2_ROUTE/);
    expect(src).toMatch(/buildPopV2HandoffState\(\s*popV2HandoffFromProductionItem\(/);
    expect(src).toMatch(/navigate\(CANONICAL_STORE_POP_V2_ROUTE,/);
  });

  it("execution-asset → 'library' 매핑을 POP handoff 에도 적용한다", () => {
    const m = src.match(/handleCreatePop = useCallback\(\(\) => \{([\s\S]*?)\}, \[/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/origin === 'execution-asset' \? 'library' : r\.origin/);
  });

  it('legacy generate endpoint 문자열이 없다', () => {
    expect(src).not.toMatch(/pop\/generate/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§2 origin — 3종 모두 V2 resolver 가 조직 격리로 읽는다', () => {
  const resolver = stripComments(read(SRC, 'services', 'store', 'pop-v2-source.service.ts'));
  const fn = resolver.slice(resolver.indexOf('export async function resolveContentPopSource'));

  it("direct → KpaStoreContent {id, organization_id}", () => {
    expect(fn).toMatch(/origin === 'direct'[\s\S]*?organization_id:\s*organizationId/);
  });
  it("library → StoreExecutionAsset {id, organizationId}", () => {
    expect(fn).toMatch(/origin === 'library'[\s\S]*?organizationId/);
  });
  it("snapshot → AssetSnapshot {id, organizationId}", () => {
    expect(fn).toMatch(/origin === 'snapshot'[\s\S]*?organizationId/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§3 handoff — 식별자만 싣는 순수 변환', () => {
  const rows = [
    { id: 'd1', title: '직접 작성', origin: 'direct' as const },
    { id: 'e1', title: '제작 자료', origin: 'execution-asset' as const },
    { id: 's1', title: '가져온 콘텐츠', origin: 'snapshot' as const },
  ];
  const toV2 = (r: (typeof rows)[number]) =>
    popV2HandoffFromProductionItem({
      id: r.id,
      title: r.title,
      origin: r.origin === 'execution-asset' ? 'library' : r.origin,
    });

  it.each(rows.map((r) => [r.origin, r] as const))('%s → content handoff', (_o, r) => {
    const h = toV2(r);
    expect(h.sourceKind).toBe('content');
    expect(h.sourceId).toBe(r.id);
    expect(h.suggestedTitle).toBe(r.title);
    expect(Object.keys(h).sort()).toEqual(['origin', 'sourceId', 'sourceKind', 'suggestedTitle']);
  });

  it('origin 어휘: direct→direct / execution-asset→library / snapshot→snapshot', () => {
    expect(rows.map((r) => toV2(r).origin)).toEqual(['direct', 'library', 'snapshot']);
  });

  it('router state 로 실었다가 다시 파싱하면 동일하다 (V2 page 가 그대로 소비)', () => {
    for (const r of rows) {
      const h = toV2(r);
      expect(parsePopV2HandoffState(buildPopV2HandoffState(h))).toEqual(h);
    }
  });

  it('canonical route 는 KPA StorePopV2Page 가 마운트된 경로다', () => {
    expect(CANONICAL_STORE_POP_V2_ROUTE).toBe('/store/marketing/pop-v2');
    expect(read(KPA, 'App.tsx')).toMatch(/path="marketing\/pop-v2"\s+element=\{<StorePopV2Page \/>\}/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§4 legacy — KPA 인라인 caller 0 · legacy 축 KEEP_TEMPORARY', () => {
  it('StorePopCreateModal 을 import 하는 KPA 소스가 없다 (dead file, ④ 제거 대상)', () => {
    const files = [
      'pages/pharmacy/StoreContentsSelector.tsx',
      'pages/pharmacy/StoreLibraryContentsPage.tsx',
      'pages/pharmacy/StorePopPage.tsx',
      'pages/pharmacy/StorePopV2Page.tsx',
      'App.tsx',
    ];
    for (const f of files) {
      expect(stripComments(read(KPA, f))).not.toMatch(/components\/store\/StorePopCreateModal/);
    }
  });

  it('dead 파일 2개는 @deprecated 로 표기되어 남아 있다', () => {
    expect(read(KPA, 'components', 'store', 'StorePopCreateModal.tsx')).toMatch(/@deprecated WO-O4O-STORE-CONTENTS-SELECTOR-INLINE-POP-TO-V2-MIGRATION-V1/);
    expect(read(KPA, 'api', 'storePop.ts')).toMatch(/@deprecated WO-O4O-STORE-CONTENTS-SELECTOR-INLINE-POP-TO-V2-MIGRATION-V1/);
  });

  it('legacy generate route 는 아직 등록되어 있다 (이번 회차는 retirement 아님)', () => {
    const ctrl = stripComments(read(SRC, 'routes', 'o4o-store', 'controllers', 'store-pop.controller.ts'));
    expect(ctrl).toMatch(/'\/pharmacy\/pop\/generate'/);
    const kpaPage = stripComments(read(KPA, 'pages', 'pharmacy', 'StorePopPage.tsx'));
    expect(kpaPage).toMatch(/pharmacy\/pop\/generate/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§5 boundary — KCos / PH / 공통 Core 무변경', () => {
  it('KCos 자료함은 B+D(direct/library) 그대로이며 snapshot origin 을 만들지 않는다', () => {
    const src = stripComments(read(KCOS, 'pages', 'store', 'StoreLibraryContentsPage.tsx'));
    expect(src).toMatch(/origin: 'direct' as const/);
    expect(src).toMatch(/origin: 'library' as const/);
    expect(src).not.toMatch(/'snapshot'/);
  });

  it('PH 에 StoreContentsSelector / snapshot handoff 를 도입하지 않았다', () => {
    const ph = stripComments(read(PH, 'App.tsx'));
    expect(ph).not.toMatch(/StoreContentsSelector/);
  });

  it('공통 handoff 계약·resolver 에 serviceKey 분기가 없다', () => {
    const handoff = stripComments(read(REPO, 'packages', 'store-ui-core', 'src', 'components', 'pop-v2', 'handoff.ts'));
    expect(handoff).not.toMatch(/serviceKey|'kpa'|'cosmetics'|'pharmacy-hub'/);
    const resolver = stripComments(read(SRC, 'services', 'store', 'pop-v2-source.service.ts'));
    expect(resolver).not.toMatch(/serviceKey|'cosmetics'|'pharmacy-hub'/);
  });
});
