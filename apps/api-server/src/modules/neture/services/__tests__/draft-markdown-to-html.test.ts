/**
 * WO-O4O-MDTOHTML-BLOCKQUOTE-SAFETY-GUARD-V1
 *
 * 2차 안전망: 초안 bodyMarkdown 이 소비자 렌더 경로로 들어오더라도
 * 내부 편집 주석(인용 블록)은 HTML 에 나가지 않는다(CR-021).
 * 일반 문단·제목·표·escape 는 기존 동작을 유지해야 한다(회귀 금지).
 */
import { describe, it, expect } from 'vitest';
import { draftMarkdownToHtml } from '../../drug-import/draft-markdown-to-html.js';

/** P3 실물 형태 — 선두 주석에 "550mg = 전문의약품" */
const P3_BODY =
  '> 같은 성분 550mg 정은 전문의약품이다(§6). 이 설명서는 275mg OTC 그룹에 한정한다.\n' +
  '\n' +
  '| 항목 | 내용 |\n|---|---|\n| 성분 | 나프록센나트륨 275mg |\n| 분류 | 일반의약품 |\n' +
  '\n' +
  '**효능·효과**\n골관절염·류마티양 관절염에 사용합니다.';

/** P4 실물 형태 — 선두 주석에 "질정, 내복 금지" */
const P4_BODY =
  "> 이름은 '정'이지만 **질 내 삽입 질정**이다(내복 금지). §3.6에 따라 수동 큐레이션 대상.\n" +
  '\n' +
  '**효능·효과**\n칸디다성 질염에 사용합니다.';

describe('draftMarkdownToHtml — 인용 블록 = 내부 주석 → 렌더 제외', () => {
  it('P3 내부 주석이 소비자 HTML 에 노출되지 않는다', () => {
    const { html, droppedQuoteBlocks } = draftMarkdownToHtml(P3_BODY);
    expect(html).not.toContain('전문의약품이다');
    expect(html).not.toContain('한정한다');
    expect(html).not.toContain('§6');
    expect(html).not.toContain('&gt;'); // 인용이 문단으로 escape 되어 새던 경로
    expect(droppedQuoteBlocks).toBe(1);
  });

  it('P4 내부 주석이 소비자 HTML 에 노출되지 않는다', () => {
    const { html, droppedQuoteBlocks } = draftMarkdownToHtml(P4_BODY);
    expect(html).not.toContain('내복 금지');
    expect(html).not.toContain('큐레이션');
    expect(html).not.toContain('&gt;');
    expect(droppedQuoteBlocks).toBe(1);
    // 주석을 뺐어도 본문은 남는다
    expect(html).toContain('칸디다성 질염에 사용합니다');
  });

  it('주석을 뺀 나머지 본문은 그대로 렌더한다', () => {
    const { html } = draftMarkdownToHtml(P3_BODY);
    expect(html).toContain('<table>');
    expect(html).toContain('나프록센나트륨 275mg');
    expect(html).toContain('<strong>효능·효과</strong>');
    expect(html).toContain('골관절염');
  });

  it('여러 줄 연속 인용을 한 블록으로 제외한다', () => {
    const { html, droppedQuoteBlocks } = draftMarkdownToHtml('> 주석1\n> 주석2\n\n본문');
    expect(html).toBe('<p>본문</p>');
    expect(droppedQuoteBlocks).toBe(1);
  });

  it('본문 중간 인용도 제외한다 (문맥 미검증 구간이라 노출하지 않는다)', () => {
    const { html, droppedQuoteBlocks } = draftMarkdownToHtml('앞 문단\n\n> 중간 주석\n\n뒤 문단');
    expect(html).toBe('<p>앞 문단</p>\n<p>뒤 문단</p>');
    expect(droppedQuoteBlocks).toBe(1);
  });

  it('인용이 없으면 droppedQuoteBlocks=0 이고 결과가 바뀌지 않는다', () => {
    const md = '# 제목\n\n본문 문단\n\n| a | b |\n|---|---|\n| 1 | 2 |';
    const { html, droppedQuoteBlocks } = draftMarkdownToHtml(md);
    expect(droppedQuoteBlocks).toBe(0);
    expect(html).toContain('<h1>제목</h1>');
    expect(html).toContain('<p>본문 문단</p>');
    expect(html).toContain('<table>');
  });
});

describe('draftMarkdownToHtml — 기존 변환 동작 회귀 없음', () => {
  it('제목 레벨을 유지한다', () => {
    expect(draftMarkdownToHtml('## 둘째').html).toBe('<h2>둘째</h2>');
    expect(draftMarkdownToHtml('###### 여섯째').html).toBe('<h6>여섯째</h6>');
  });

  it('표를 thead/tbody 로 변환한다', () => {
    const { html } = draftMarkdownToHtml('| 항목 | 내용 |\n|---|---|\n| 성분 | X |');
    expect(html).toBe('<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>성분</td><td>X</td></tr></tbody></table>');
  });

  it('문단 내 개행은 <br>, 빈 줄은 문단 분리', () => {
    expect(draftMarkdownToHtml('한 줄\n두 줄\n\n다음 문단').html).toBe('<p>한 줄<br>두 줄</p>\n<p>다음 문단</p>');
  });

  it('**볼드** 를 <strong> 으로 변환한다', () => {
    expect(draftMarkdownToHtml('**강조** 문구').html).toBe('<p><strong>강조</strong> 문구</p>');
  });

  it('HTML escape 를 유지한다', () => {
    const { html } = draftMarkdownToHtml('<script>alert(1)</script> & "x"');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('빈 입력은 빈 문자열', () => {
    expect(draftMarkdownToHtml('').html).toBe('');
  });
});
