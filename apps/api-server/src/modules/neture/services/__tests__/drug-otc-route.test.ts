/**
 * WO-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1 · DR-019
 *
 * 경로 오판은 질정을 "take/swallow" 로 옮기는 오역·오투여로 직결된다(G-01).
 * "제형명으로 추정하지 않는다" 와 "근거 없으면 추정 대신 needs_review" 를 테스트로 잠근다.
 */
import { deriveOtcRoute } from '../../drug-import/drug-otc-route.js';

describe('deriveOtcRoute — 신호 우선순위', () => {
  it('groupKey route 축이 최우선이다 (DR-010 명시값)', () => {
    const r = deriveOtcRoute({ groupKey: 'drug_otc::combo::oral::A06AB52', usageLabel: '복용 안내' });
    expect(r.route).toBe('oral');
    expect(r.basis).toBe('group_key');
  });

  it("usageLabel='복용 안내' → oral (작성자 저작 신호)", () => {
    const r = deriveOtcRoute({ groupKey: '트리메부틴말레산염|200밀리그램|정', usageLabel: '복용 안내' });
    expect(r.route).toBe('oral');
    expect(r.basis).toBe('usage_label');
  });

  it("usageLabel='사용 안내' + 명시 제형 토큰 → 구체 경로", () => {
    const r = deriveOtcRoute({
      groupKey: '클로트리마졸|100밀리그램|정',
      usageLabel: '사용 안내',
      summaryTable: { 성분: '클로트리마졸 100mg (질정)' },
      title: '클로트리마졸 100mg 질정',
    });
    expect(r.route).toBe('vaginal');
    expect(r.basis).toBe('form_token');
    expect(r.expectedUsageLabel).toBe('사용 안내');
  });
});

describe('deriveOtcRoute — 제형명 추정 금지 (DR-019 핵심)', () => {
  it("doseForm='정' 은 경로 판단에 쓰이지 않는다 — 질정과 경구정이 같은 값이다", () => {
    const vaginal = deriveOtcRoute({
      usageLabel: '사용 안내',
      summaryTable: { 성분: '클로트리마졸 100mg (질정)' },
      title: '클로트리마졸 100mg 질정',
    });
    const oral = deriveOtcRoute({ usageLabel: '복용 안내', title: '트리메부틴말레산염 200mg 정' });
    // 둘 다 doseForm='정' 이지만 경로가 갈린다
    expect(vaginal.route).toBe('vaginal');
    expect(oral.route).toBe('oral');
  });

  it('경로 신호가 없으면 추정하지 않고 needs_review', () => {
    const r = deriveOtcRoute({ groupKey: '어떤성분|100밀리그램|정', usageLabel: null, title: '어떤성분 100mg 정' });
    expect(r.route).toBeNull();
    expect(r.basis).toBe('needs_review');
    expect(r.reason).toContain('DR-019');
  });

  it("usageLabel='사용 안내' 인데 제형 토큰이 없으면 구체 경로를 추정하지 않는다", () => {
    const r = deriveOtcRoute({ usageLabel: '사용 안내', title: '어떤성분 100mg' });
    expect(r.route).toBeNull();
    expect(r.basis).toBe('needs_review');
    expect(r.expectedUsageLabel).toBe('사용 안내');
  });

  it('본문 서술을 경로 근거로 쓰지 않는다 — "항문검사" 오탐 방지 (디오스민 경구정 실사례)', () => {
    const r = deriveOtcRoute({
      groupKey: '디오스민|600밀리그램|정',
      usageLabel: '복용 안내',
      summaryTable: { 성분: '디오스민 600mg', '주의 대상': '증상이 나아지지 않으면 항문검사를 받으세요' },
      title: '디오스민 600mg 정',
    });
    expect(r.route).toBe('oral'); // rectal 로 오분류되지 않는다
  });
});

describe('deriveOtcRoute — 모순 감지', () => {
  it("usageLabel='복용 안내' 인데 비경구 제형 토큰이면 needs_review", () => {
    const r = deriveOtcRoute({
      usageLabel: '복용 안내',
      summaryTable: { 성분: '클로트리마졸 100mg (질정)' },
      title: '클로트리마졸 100mg 질정',
    });
    expect(r.route).toBeNull();
    expect(r.basis).toBe('needs_review');
    expect(r.usageLabelMismatch).toBe(true);
  });

  it('groupKey route 와 제형 토큰이 어긋나면 자동 확정하지 않는다', () => {
    const r = deriveOtcRoute({
      groupKey: 'drug_otc::single::oral::x',
      usageLabel: '사용 안내',
      title: '어떤성분 질정',
    });
    expect(r.route).toBeNull();
    expect(r.basis).toBe('needs_review');
    expect(r.reason).toContain('불일치');
  });

  it('route 에 맞는 expectedUsageLabel 을 돌려준다', () => {
    expect(deriveOtcRoute({ usageLabel: '복용 안내' }).expectedUsageLabel).toBe('복용 안내');
    expect(
      deriveOtcRoute({ usageLabel: '사용 안내', title: '어떤성분 점안액' }).expectedUsageLabel,
    ).toBe('사용 안내');
  });
});
