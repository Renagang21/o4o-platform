/**
 * WO-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1
 *
 * 소비자 본문의 렌더 소스가 구조화 필드로 고정됐는지 보장한다.
 * 회귀 시 내부 편집 주석(CR-021)이 소비자 화면에 노출되므로 테스트로 잠근다.
 */
import { buildDrugOtcConsumerHtml } from '../../drug-import/drug-otc-description-consumer-html.js';

/** P3 나프록센나트륨 275mg 정 — 주석에 "550mg = 전문의약품" 이 있다(소비자 노출 금지). */
const P3 = {
  summaryTable: {
    분류: '일반의약품',
    성분: '나프록센나트륨 275mg',
    작용: '해열, 진통, 소염',
    '주의 대상': '위장장애, 심혈관·신장 질환, 임부',
  },
  efficacy: '골관절염·류마티양 관절염에 사용합니다.',
  usage: '통증에는 처음 2정(550mg)을 복용하고 6~8시간 간격으로 1정(275mg)씩 복용합니다.',
  usageLabel: '복용 안내',
  caution: '소화성궤양, 2세 이하는 복용하지 않습니다.',
  ingredientSelection: '제품명보다 성분·함량을 기준으로 약사에게 확인하세요.',
  bodyMarkdown:
    '> 같은 성분 550mg 정은 전문의약품이다(§6). 이 설명서는 275mg OTC 그룹에 한정한다.\n\n| 항목 | 내용 |\n|---|---|\n| 성분 | 나프록센나트륨 275mg |',
};

/** P4 클로트리마졸 100mg 질정 — doseForm='정' 이지만 질 내 투여(DR-019). */
const P4 = {
  summaryTable: { 분류: '일반의약품', 성분: '클로트리마졸 100mg (질정)', 작용: '항진균(칸디다 억제)' },
  efficacy: '칸디다성 질염에 사용합니다.',
  usage: '성인은 1회 1정을 1일 1회 취침 시 질 내 깊숙이 삽입합니다. 이 약은 질에만 사용하고 내복하지 않습니다.',
  usageLabel: '사용 안내',
  caution: '생리 기간 중에는 사용하지 않습니다.',
  bodyMarkdown: "> 이름은 '정'이지만 **질 내 삽입 질정**이다(내복 금지). §3.6에 따라 수동 큐레이션 대상.",
};

describe('buildDrugOtcConsumerHtml — 렌더 소스 = 구조화 필드', () => {
  it('내부 편집 주석을 소비자 HTML 에 포함하지 않는다 (CR-021)', () => {
    const { html } = buildDrugOtcConsumerHtml(P3, { title: '나프록센나트륨 275mg 정' });
    expect(html).not.toContain('전문의약품이다');
    expect(html).not.toContain('한정한다');
    expect(html).not.toContain('§6');
    expect(html).not.toContain('&gt;'); // bodyMarkdown 인용이 escape 되어 새는 경로
  });

  it('bodyMarkdown 을 읽지 않는다 — 주석만 있는 초안도 본문이 동일하다', () => {
    const withNote = buildDrugOtcConsumerHtml(P3, { title: 'T' }).html;
    const withoutNote = buildDrugOtcConsumerHtml({ ...P3, bodyMarkdown: '' }, { title: 'T' }).html;
    expect(withNote).toBe(withoutNote);
  });

  it('구조화 4필드 내용을 누락 없이 담는다', () => {
    const { html } = buildDrugOtcConsumerHtml(P3, { title: '나프록센나트륨 275mg 정' });
    expect(html).toContain('골관절염');
    expect(html).toContain('2정(550mg)'); // 275mg 2정 합계 — 수치 원문 유지
    expect(html).toContain('6~8시간');
    expect(html).toContain('2세 이하');
    expect(html).toContain('나프록센나트륨 275mg');
  });

  it('summaryTable 을 sd-core 로 변환하고 <table> 을 쓰지 않는다 (디자인 GUIDE §8-E)', () => {
    const { html } = buildDrugOtcConsumerHtml(P3, { title: 'T' });
    expect(html).toContain('sd-core');
    expect(html).toContain('sd-item');
    expect(html).not.toContain('<table');
  });

  it('주의사항을 sd-warn 으로 낸다 — sd-who 재사용 금지 (CR-020 §2-1)', () => {
    const { html } = buildDrugOtcConsumerHtml(P3, { title: 'T' });
    expect(html).toContain('<ul class="sd-warn">');
    expect(html).not.toContain('<ul class="sd-who">');
    // 경고 항목이 실제로 sd-warn 안에 들어간다
    const warn = html.slice(html.indexOf('sd-warn'), html.indexOf('</ul>', html.indexOf('sd-warn')));
    expect(warn).toContain('2세 이하');
  });

  it('sd-* 계약을 지킨다 — <style>·인라인 style 없음 (CR-020)', () => {
    const { html } = buildDrugOtcConsumerHtml(P3, { title: 'T' });
    expect(html).toContain('sd-card');
    expect(html).not.toContain('<style');
    expect(html).not.toContain('style=');
  });

  it('usageLabel 로 투여경로를 반영한다 — 제형명으로 추정하지 않는다 (DR-019)', () => {
    expect(buildDrugOtcConsumerHtml(P4, { title: 'T' }).html).toContain('<h2>사용 안내</h2>');
    expect(buildDrugOtcConsumerHtml(P3, { title: 'T' }).html).toContain('<h2>복용 안내</h2>');
  });

  it('구조화 필드가 불완전하면 html 을 만들지 않고 missing 을 돌려준다 (승격 보류)', () => {
    const r = buildDrugOtcConsumerHtml(
      { efficacy: 'x', usage: null, caution: '', summaryTable: {} },
      { title: 'T' },
    );
    expect(r.html).toBe('');
    expect(r.missing).toEqual(['usage', 'caution', 'summaryTable']);
  });

  it('HTML 특수문자를 escape 한다', () => {
    const { html } = buildDrugOtcConsumerHtml(
      { ...P3, efficacy: '<script>alert(1)</script> & "따옴표"' },
      { title: 'T' },
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });
});
