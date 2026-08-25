/**
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 · §12
 *
 * 회원 Content write 정책과 PharmacyHub 채택 mount 를 **정적으로** 고정한다.
 *
 * §6 최종 판정 (이전 잠정 판정을 뒤집는다):
 *   앞선 판정은 "회원 Content write 는 어느 서비스에도 없다" 였으나, 실제 KPA/GlycoPharm/
 *   K-Cosmetics 라우터를 읽으면 셋 다 `POST /contents` 가 `authenticate` 만 걸린
 *   **회원 작성 경로**를 갖고 있다(kpa.routes.ts 의 contentRouter, cosmetics/glycopharm 의
 *   `createMemberWriteHandlers`). 즉 회원 작성은 3원장 서비스의 공통 회원 capability 이고,
 *   PH 에 없는 것은 MISSING_ADOPTION 이다 — INTENTIONAL_DIFFERENCE 가 아니다.
 *
 *   그 서비스들의 회원 원장은 각자의 `{service}_contents` 이고, PH 의 회원 원장은 공통
 *   `cms_contents` 다. 따라서 능력은 **공통 경로 위에 원장-바인딩 기준의 capability 등록표**
 *   (`cms-content-member-authoring.ts`)로 붙인다:
 *     - 신규 table(`pharmacy_hub_contents`) 0 · migration 0 · cms-core 변경 0
 *     - 등록표가 비어 있는 서비스는 동작이 한 글자도 바뀌지 않는다
 *     - 운영자 write 판정(`authorizeCmsMutation`)은 종전 그대로이고, 회원 경로는
 *       그 판정이 거부됐을 때만 평가되는 **fallback** 이다
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

/** 주석은 설계 근거 서술이므로 분기 검사는 코드만 본다. */
const readCode = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const MUTATION = 'src/routes/cms-content/cms-content-mutation.handler.ts';
const PH_ROUTES = 'src/routes/pharmacy-hub/pharmacy-hub.routes.ts';

const MEMBER_AUTHORING = 'src/routes/cms-content/cms-content-member-authoring.ts';
const CMS_UTILS = 'src/routes/cms-content/cms-content-utils.ts';

describe('§6 운영자 Content write — cms_contents 권한 계약(무변화)', () => {
  it('운영자 write 권한은 platform admin 또는 {serviceKey}:admin|operator 로만 파생된다', () => {
    // 파생식 자체는 공통 util 로 옮겨졌다 — 판정 규칙은 그대로다.
    const code = readCode(CMS_UTILS);
    expect(code).toContain('`${serviceKey}:admin`');
    expect(code).toContain('`${serviceKey}:operator`');
    expect(readCode(MUTATION)).toContain('isCmsPlatformAdmin');
    expect(readCode(MUTATION)).toContain('hasCmsServiceOperatorRole');
  });

  it('serviceKey 없는 요청은 service-scoped write 로 통과하지 않는다', () => {
    const code = readCode(MUTATION);
    expect(code).toMatch(/if \(!serviceKey\) return \{ allowed: false/);
  });

  it('특정 서비스만 예외 허용하는 하드코딩 분기가 없다', () => {
    for (const rel of [MUTATION, CMS_UTILS]) {
      const code = readCode(rel);
      for (const key of ['pharmacy-hub', 'kpa-society', 'k-cosmetics', 'glycopharm']) {
        expect(code).not.toContain(key);
      }
    }
  });

  it('pharmacy_hub_contents 전용 원장을 만들지 않는다', () => {
    for (const rel of [MUTATION, PH_ROUTES, MEMBER_AUTHORING]) {
      expect(readCode(rel)).not.toContain('pharmacy_hub_contents');
    }
  });
});

describe('§6 회원 Content write — 원장-바인딩 capability 등록표', () => {
  it('서비스 분기가 아니라 등록표로만 켜진다', () => {
    const code = readCode(MEMBER_AUTHORING);
    // `if (serviceKey === '...')` 류의 서비스 분기 금지 (WO §2 금지 항목)
    expect(code).not.toMatch(/serviceKey\s*===\s*['\`"]/);
    expect(code).toContain('CMS_MEMBER_AUTHORING_LEDGERS');
  });

  it('회원 작성은 authorRole=community · visibilityScope=service · 초기 draft 로 고정된다', () => {
    const code = readCode(MEMBER_AUTHORING);
    expect(code).toContain("authorRole: 'community'");
    expect(code).toContain("visibilityScope: 'service'");
    expect(code).toContain("initialStatus: 'draft'");
  });

  it('회원 경로는 운영자 판정이 거부됐을 때만 평가되는 fallback 이다', () => {
    const code = readCode(MUTATION);
    expect(code).toMatch(/if \(!allowed\)[\s\S]{0,200}authorizeCmsMemberCreate/);
  });

  it('회원은 스스로 게시(published)로 올리지 못한다 — 검토(pending)까지만', () => {
    const code = readCode(MEMBER_AUTHORING);
    expect(code).toMatch(/draft:\s*\['pending',\s*'archived'\]/);
    expect(code).toMatch(/pending:\s*\['draft'\]/);
  });
});

describe('§4 · §7 PharmacyHub 채택 mount', () => {
  const code = readCode(PH_ROUTES);

  it('운영자 공지·뉴스는 공통 news controller 를 마운트한다', () => {
    expect(code).toContain('createNewsController');
  });

  it('매장 마케팅 분석은 공통 store-analytics factory 를 같은 형태로 마운트한다', () => {
    expect(code).toContain('createStoreAnalyticsController');
    expect(code).toContain("'pharmacy-hub'");
  });

  it('공통 factory 를 복제한 PH 전용 분석 구현이 없다', () => {
    expect(code).not.toMatch(/store_qr_scan_events/);
  });
});
