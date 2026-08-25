/**
 * Operator Resources Console — lifecycle 계약 정적 고정
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3·§5
 *
 * 고정 대상:
 *   1. 공통 console 에 serviceKey 분기가 없다 (§3 금지).
 *   2. default lifecycle = 기존 `{service}_contents` 3 service 의 현행 behavior 그대로.
 *   3. cms_contents lifecycle 은 서버 CMS_ALLOWED_TRANSITIONS 를 정확히 미러링하고,
 *      존재하지 않는 delete CTA 를 만들지 않는다.
 *   4. 소비 3 service wrapper 는 lifecycle 을 지정하지 않는다(= default 유지 → 회귀 0).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_RESOURCES_LIFECYCLE,
  SERVICE_LEDGER_RESOURCES_LIFECYCLE,
  CMS_CONTENTS_RESOURCES_LIFECYCLE,
} from '../lifecycle';

const ROOT = resolve(__dirname, '../../../../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CONSOLE = 'packages/operator-core-ui/src/modules/resources/OperatorResourcesConsolePage.tsx';

describe('공통 console 은 service 분기를 두지 않는다 (§3)', () => {
  const src = stripComments(read(CONSOLE));
  for (const forbidden of ['pharmacy-hub', 'kpa-society', 'glycopharm', 'k-cosmetics', 'serviceKey ===']) {
    it(`console 에 "${forbidden}" 분기가 없다`, () => {
      expect(src).not.toContain(forbidden);
    });
  }
});

describe('default lifecycle = 기존 3 service 현행 behavior (§5)', () => {
  it('default 는 service ledger lifecycle 이다', () => {
    expect(DEFAULT_RESOURCES_LIFECYCLE).toBe(SERVICE_LEDGER_RESOURCES_LIFECYCLE);
  });

  it('전이 규칙이 기존 노출 조건(published 아니면 노출 / published 면 숨김)과 같다', () => {
    expect(SERVICE_LEDGER_RESOURCES_LIFECYCLE.allowedTransitions).toEqual({
      draft: ['published'],
      private: ['published'],
      published: ['private'],
    });
  });

  it('삭제와 상세 보기는 유지되고 등록/편집은 열리지 않는다', () => {
    expect(SERVICE_LEDGER_RESOURCES_LIFECYCLE.supportsDelete).toBe(true);
    expect(SERVICE_LEDGER_RESOURCES_LIFECYCLE.visibleActions).toEqual(['view', 'delete']);
  });

  it('컬럼 capability 가 전부 켜져 있다(기존 화면 그대로)', () => {
    expect(SERVICE_LEDGER_RESOURCES_LIFECYCLE.fieldCapabilities).toEqual({
      sourceType: true,
      usageType: true,
      sourceFileOrLink: true,
      viewCount: true,
      author: true,
      search: true,
    });
  });

  for (const [name, path] of [
    ['KPA-Society', 'services/web-kpa-society/src/pages/operator/OperatorResourcesPage.tsx'],
    ['GlycoPharm', 'services/web-glycopharm/src/pages/operator/OperatorResourcesPage.tsx'],
    ['K-Cosmetics', 'services/web-k-cosmetics/src/pages/operator/OperatorResourcesPage.tsx'],
  ] as const) {
    it(`${name} wrapper 는 lifecycle 을 지정하지 않는다 (default 유지)`, () => {
      expect(stripComments(read(path))).not.toContain('lifecycle=');
    });
  }
});

describe('cms_contents lifecycle 은 서버 계약을 미러링한다 (§3·§4)', () => {
  it('전이가 서버 CMS_ALLOWED_TRANSITIONS 와 동일하다', () => {
    const server = stripComments(
      // WO-...-FULL-PARITY-CLOSURE-V1: CMS_ALLOWED_TRANSITIONS 는 SSOT 인 cms-content-utils 로 옮겼다.
      read('apps/api-server/src/routes/cms-content/cms-content-utils.ts'),
    );
    // 서버 정본이 바뀌면 이 테스트가 먼저 깨지도록 원문을 함께 고정한다.
    expect(server).toContain("draft: ['pending', 'archived']");
    expect(server).toContain("pending: ['published', 'draft']");
    expect(server).toContain("published: ['archived']");
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.allowedTransitions).toEqual({
      draft: ['pending', 'archived'],
      pending: ['published', 'draft'],
      published: ['archived'],
      archived: [],
    });
  });

  it('delete API 가 없으므로 삭제 CTA 를 만들지 않는다', () => {
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.supportsDelete).toBe(false);
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.visibleActions).not.toContain('delete');
  });

  it('상태가 섞인 다중 선택에서 불가능한 전이가 나오지 않도록 bulk 전이를 열지 않는다', () => {
    expect(
      CMS_CONTENTS_RESOURCES_LIFECYCLE.transitionActions.every((t) => !t.bulkConfirm),
    ).toBe(true);
  });

  it('cms_contents 에 없는 컬럼(source_type · usage_type · view_count)은 끈다', () => {
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.fieldCapabilities.sourceType).toBe(false);
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.fieldCapabilities.usageType).toBe(false);
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.fieldCapabilities.viewCount).toBe(false);
  });

  it('등록/편집 폼이 열려 있다 (PH 자료실 등록 경로)', () => {
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.visibleActions).toEqual(['view', 'edit', 'create']);
    expect(CMS_CONTENTS_RESOURCES_LIFECYCLE.form?.fields).toEqual({
      summary: true,
      body: true,
      link: true,
    });
  });
});

describe('PharmacyHub 채택 (§4)', () => {
  const ph = read('services/web-pharmacy-hub/src/pages/operator/ResourcesPage.tsx');

  it('PH 자료실은 공통 console 을 소비한다 (전용 사본 폐기)', () => {
    expect(ph).toContain('OperatorResourcesConsolePage');
    expect(ph).toContain('CMS_CONTENTS_RESOURCES_LIFECYCLE');
  });

  it('PH 페이지에 표/상태 사본이 남아있지 않다', () => {
    const src = stripComments(ph);
    expect(src).not.toContain('DataTable');
    expect(src).not.toContain('STATUS_LABEL');
    expect(src).not.toContain('NEXT_STATUSES');
  });

  it('PH 공지·뉴스 관리는 공통 CmsContentManager 를 소비한다', () => {
    const content = read('services/web-pharmacy-hub/src/pages/operator/ContentPage.tsx');
    expect(content).toContain('CmsContentManager');
    expect(content).toContain('/api/v1/pharmacy-hub');
  });
});
