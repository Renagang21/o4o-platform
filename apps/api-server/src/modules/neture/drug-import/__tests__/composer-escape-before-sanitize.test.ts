/**
 * Unit tests — WO-O4O-OTC-COMPOSER-ESCAPE-BEFORE-SANITIZE-V1
 *
 * 허가 원문의 `<`, `>`, `&` 가 HTML 조합 → sanitize 경로에서 유실되지 않음을 검증.
 * 실 DB 불필요 (PURE composer + sanitize-on-write).
 */

import {
  composeEasyDrugContent,
  escapeHtmlPreservingEntities,
} from '../easy-drug-shared-description-derive.service.js';
import { sanitizeDescriptionHtml } from '../../utils/sanitize-description-html.util.js';

/** 실제 write-path 재현: compose → sanitize (derive.service run() 과 동일 순서). */
function writePath(caution: string): string {
  return sanitizeDescriptionHtml(composeEasyDrugContent({ caution }));
}

describe('escapeHtmlPreservingEntities (WO-...-COMPOSER-ESCAPE-BEFORE-SANITIZE-V1)', () => {
  it('bare < > & 를 엔티티로 escape 한다', () => {
    expect(escapeHtmlPreservingEntities('A < B')).toBe('A &lt; B');
    expect(escapeHtmlPreservingEntities('A > B')).toBe('A &gt; B');
    expect(escapeHtmlPreservingEntities('A & B')).toBe('A &amp; B');
  });

  it('붙어있는 < (AST<3배) 도 escape 한다', () => {
    expect(escapeHtmlPreservingEntities('AST<3배')).toBe('AST&lt;3배');
    expect(escapeHtmlPreservingEntities('혈소판<10만')).toBe('혈소판&lt;10만');
  });

  it('기존 유효 엔티티는 이중 escape 하지 않는다', () => {
    expect(escapeHtmlPreservingEntities('청소율 &lt; 10mL/min')).toBe('청소율 &lt; 10mL/min');
    expect(escapeHtmlPreservingEntities('농도 &gt; 5')).toBe('농도 &gt; 5');
    expect(escapeHtmlPreservingEntities('결합 &amp; 반응')).toBe('결합 &amp; 반응');
    expect(escapeHtmlPreservingEntities('공백 &nbsp; 유지')).toBe('공백 &nbsp; 유지');
    expect(escapeHtmlPreservingEntities('수치 &#60; 10')).toBe('수치 &#60; 10');
  });

  it('엔티티가 아닌 & (뒤에 공백/비엔티티) 는 escape 한다', () => {
    expect(escapeHtmlPreservingEntities('Tom & Jerry')).toBe('Tom &amp; Jerry');
    // 엔티티처럼 보이지만 세미콜론 없음 → bare 로 취급
    expect(escapeHtmlPreservingEntities('A &lt B')).toBe('A &amp;lt B');
  });

  it('한글·괄호·줄바꿈 등 일반 텍스트는 변경하지 않는다', () => {
    const plain = '괄호(참고)와\n줄바꿈이 포함된 긴 주의사항입니다.';
    expect(escapeHtmlPreservingEntities(plain)).toBe(plain);
  });
});

describe('composeEasyDrugContent + sanitize write-path (문장 유실 0)', () => {
  it('bare < 가 붙은 표기의 문장이 유실되지 않는다 (기존 결함 재현·해소)', () => {
    const html = writePath('A<B 이고 C>D 이다');
    // 기존 결함: DOMPurify 가 <B 이고 C> 를 <b> 태그로 파싱해 "B 이고 C" 유실
    expect(html).toContain('A&lt;B 이고 C&gt;D 이다');
    expect(html).not.toContain('<b>');
  });

  it('부등호 원문(bare / 엔티티) 둘 다 화면 표시값이 동일하다', () => {
    const bare = writePath('크레아티닌 청소율 <10mL/min');
    const entity = writePath('크레아티닌 청소율 &lt;10mL/min');
    expect(bare).toContain('청소율 &lt;10mL/min');
    expect(entity).toContain('청소율 &lt;10mL/min');
    // 이중 escape 없음
    expect(entity).not.toContain('&amp;lt;');
  });

  it('WO 검증 입력 5종 — 문장 유실 0', () => {
    const inputs = [
      '크레아티닌 청소율 < 10 mL/min',
      '크레아티닌 청소율 &lt; 10 mL/min',
      'A > B',
      'A & B',
      '괄호(참고)와\n줄바꿈이 포함된 긴 주의사항',
    ];
    for (const inp of inputs) {
      const html = writePath(inp);
      // 원문의 한글/숫자 토큰이 모두 살아있는지 (특수문자 제외 후 비교)
      const tokens = inp.replace(/[<>&;]|&lt|&gt|&amp/g, ' ').split(/\s+/).filter((t) => t.length > 1);
      for (const t of tokens) expect(html).toContain(t);
      expect(html).not.toContain('&amp;lt;'); // 이중 escape 없음
      expect(html).not.toContain('&amp;gt;');
    }
  });

  it('HTML injection 은 차단(escape) 되고 주변 텍스트는 보존된다', () => {
    const html = writePath('<script>alert(1)</script> 신부전 환자 주의');
    expect(html).not.toContain('<script>'); // 실행 태그로 남지 않음
    expect(html).toContain('&lt;script&gt;'); // 리터럴 텍스트로 escape
    expect(html).toContain('신부전 환자 주의'); // 주변 문장 유실 0
  });

  it('일반 텍스트 설명서 출력 회귀 없음 (특수문자 없는 입력은 escape 무영향)', () => {
    const html = writePath('이 약은 감기 증상을 완화합니다. 하루 3회 복용하십시오.');
    expect(html).toContain('<p><strong>사용상 주의사항</strong>');
    expect(html).toContain('이 약은 감기 증상을 완화합니다. 하루 3회 복용하십시오.');
  });

  it('여러 섹션 구조(효능/용법/주의)가 유지된다', () => {
    const html = sanitizeDescriptionHtml(
      composeEasyDrugContent({ efficacy: '감기', usage: '1일 3회', caution: 'AST<3배 주의' }),
    );
    expect(html).toContain('<strong>효능·효과</strong>');
    expect(html).toContain('<strong>용법·용량</strong>');
    expect(html).toContain('<strong>사용상 주의사항</strong>');
    expect(html).toContain('AST&lt;3배 주의');
  });
});
