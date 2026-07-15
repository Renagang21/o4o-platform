/**
 * 초안 bodyMarkdown → HTML (승격 스크립트 공용) — **인용 블록 = 내부 편집 주석이라 렌더 제외**
 *
 * WO-O4O-MDTOHTML-BLOCKQUOTE-SAFETY-GUARD-V1
 *
 * ⚠️ **이 변환기는 2차 안전망이다.** 1차 원칙은 그대로다:
 *   **OTC bodyMarkdown 은 소비자 렌더 소스로 쓰지 않는다** — 소비자 본문은 구조화 필드에서 만든다
 *   (drug-otc-description-consumer-html.ts, WO-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1).
 *   본 함수는 그 원칙을 대체하지 않으며, 과거 경로가 남아 있거나 재사용될 때의 방어일 뿐이다.
 *
 * 인용(`>`) 처리 정책 = **렌더 제외**. 근거(실측):
 *   - OTC 초안 95건 전수에서 `>` 는 **100% 내부 편집 주석**(선두 인용 33 / 본문 중간 인용 0).
 *   - 소비자용 인용문 용례 **0건** → blockquote 렌더가 필요한 사례가 없다.
 *   - 주석은 `bodyMarkdown` 에 그대로 보존되고 번역자에게는 translatorNote 로 전달된다(CR-021)
 *     → 렌더에서 빼도 **정보가 사라지지 않는다**.
 *   근거 = CHECK-O4O-OTC-TRANSLATOR-NOTE-SEPARATION-V1 · CHECK-O4O-OTC-TRANSLATOR-NOTE-DERIVATION-V1
 *
 * 소비자용 인용문이 필요한 초안 형식이 생기면 이 정책을 재검토한다(무조건 삭제가 아니라 문맥 확인 후 결정).
 */

export interface DraftMarkdownToHtmlResult {
  html: string;
  /** 렌더에서 제외한 인용 블록 수. >0 이면 내부 주석이 소비자 경로로 들어올 뻔했다는 신호. */
  droppedQuoteBlocks: number;
}

const QUOTE_LINE = /^\s*>/;

/**
 * 초안 본문 마크다운 → HTML.
 * 지원: `#` 제목 / 파이프 표 / `**볼드**` / 문단. 인용(`>`)은 **출력하지 않는다**.
 */
export function draftMarkdownToHtml(md: string): DraftMarkdownToHtmlResult {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let droppedQuoteBlocks = 0;
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '') {
      flushPara();
      continue;
    }
    // 인용 블록 = 내부 편집 주석 → 소비자 HTML 에 출력하지 않는다(CR-021).
    // 연속된 인용 줄을 한 블록으로 소비한다. 삭제가 아니라 렌더 제외이며 원문은 bodyMarkdown 에 남는다.
    if (QUOTE_LINE.test(trimmed)) {
      flushPara();
      while (i < lines.length && QUOTE_LINE.test(lines[i].trim())) i++;
      i--; // 마지막 non-quote 라인 되돌림
      droppedQuoteBlocks++;
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      continue;
    }
    if (trimmed.startsWith('|')) {
      flushPara();
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim());
        i++;
      }
      i--; // 마지막 non-table 라인 되돌림
      const cells = (r: string) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const isSep = (r: string) => /^\|?[\s:|-]+\|?$/.test(r) && r.includes('-');
      const header = rows[0] && !isSep(rows[0]) ? cells(rows[0]) : null;
      const bodyRows = rows.filter((r, idx) => !(idx === 0 && header) && !isSep(r));
      const thead = header
        ? `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`
        : '';
      const tbody = `<tbody>${bodyRows
        .map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }
    para.push(trimmed);
  }
  flushPara();
  return { html: out.join('\n'), droppedQuoteBlocks };
}
