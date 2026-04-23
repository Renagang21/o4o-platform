/**
 * AI Clipboard Utilities — WO-HUB-COPY-TEXT-INCLUDE-V1
 *
 * HUB 항목 → AI 입력용 plain text 변환.
 * AiContentModal textarea에 바로 붙여넣기 가능한 포맷으로 구성.
 */

/** HTML 태그 제거 + HTML 엔티티 디코딩 → plain text */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * KPA/TipTap 블록 배열 → plain text
 *
 * KPA 포맷: { type: 'text'|'list'|'image', content?: string, items?: string[] }
 * TipTap 포맷: { type: 'paragraph', data: { content?: string, text?: string } }
 */
export function blocksToText(blocks: any[]): string {
  return blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return '';
      if (block.type === 'list' && Array.isArray(block.items)) {
        return block.items.map((item: any) => (typeof item === 'string' ? item : '')).join(', ');
      }
      const raw =
        block.content ??
        block.text ??
        block.data?.content ??
        block.data?.text ??
        '';
      return typeof raw === 'string' ? stripHtml(raw) : '';
    })
    .filter(Boolean)
    .join('\n');
}

export interface AiClipboardItem {
  index: number;
  title: string;
  url: string;
  content: string;
}

/**
 * AI 입력용 텍스트 포맷 생성
 *
 * 포맷:
 * [항목 1]
 * 제목: ...
 * 출처: https://...
 * 내용:
 * ...
 *
 * ---
 */
export function buildAiClipboardText(items: AiClipboardItem[]): string {
  return items
    .map(({ index, title, url, content }) =>
      [`[항목 ${index}]`, `제목: ${title}`, `출처: ${url}`, '내용:', content || '(내용 없음)'].join(
        '\n',
      ),
    )
    .join('\n\n---\n\n');
}
