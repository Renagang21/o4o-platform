/**
 * POP Composer 공통 helper — WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * 두 서비스에 동일 코드로 복사돼 있던 변환/판정 함수. 알고리즘 신규 도입 없음.
 */

import type {
  PopAiContent,
  PopGeneratePayload,
  PopLayout,
  PopLocalProductItem,
  PopLocalProductRaw,
} from './types';

/** HTML 본문 → POP 문구용 plain text (신규 요약 알고리즘 없음) */
export function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** router state 의 prefillPop → POP 문구 모델 */
export function parsePopPrefillState(
  state: unknown,
): PopAiContent | null {
  const pf = (state as { prefillPop?: { title?: string; content?: string; excerpt?: string } } | null)
    ?.prefillPop;
  if (!pf) return null;
  return {
    title: pf.title || '',
    bullets: [],
    shortText: (pf.excerpt || '').trim(),
    longText: htmlToPlainText(pf.content || ''),
  };
}

/** 서비스 localProduct 응답 → POP 표시 모델 */
export function normalizeLocalProductForPop(p: PopLocalProductRaw): PopLocalProductItem {
  const detail = p.detail_html ?? p.detailHtml ?? null;
  return {
    id: p.id,
    title: p.name,
    description:
      (p.summary?.trim() || null)
      ?? (detail ? htmlToPlainText(detail) || null : null)
      ?? (p.description?.trim() || null),
    imageUrl: p.thumbnail_url ?? p.images?.[0] ?? null,
  };
}

/** 404 = 미존재 또는 다른 조직 상품(차단). 그 외 = 조회 실패. */
export function isPopNotFoundError(e: unknown): boolean {
  const err = e as { response?: { status?: number }; status?: number } | null;
  return err?.response?.status === 404 || err?.status === 404;
}

/** POP 문구 → 저장용 HTML 본문 */
export function popAiContentToHtml(content: PopAiContent): string {
  return [
    content.shortText ? `<p>${content.shortText}</p>` : '',
    content.bullets.length ? `<ul>${content.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : '',
    content.longText ? `<p>${content.longText}</p>` : '',
  ].filter(Boolean).join('');
}

/** 생성 payload 조립 — 기존 계약과 필드·조건 동일 */
export function buildPopGeneratePayload(input: {
  supplierItemIds: string[];
  localItems: PopLocalProductItem[];
  layout: PopLayout;
  templateId: string;
  aiContent: PopAiContent | null;
  qrId: string;
}): PopGeneratePayload {
  const hasLocal = input.localItems.length > 0;
  return {
    ...(input.supplierItemIds.length ? { supplierItemIds: input.supplierItemIds } : {}),
    ...(hasLocal ? { localProductItemIds: input.localItems.map((p) => p.id) } : {}),
    layout: input.layout,
    templateId: input.templateId,
    ...(input.aiContent ? { aiContent: input.aiContent } : {}),
    ...(input.qrId ? { qrId: input.qrId } : {}),
    ...(hasLocal
      ? { save: true, title: `${input.aiContent?.title || input.localItems[0].title} POP` }
      : {}),
  };
}
