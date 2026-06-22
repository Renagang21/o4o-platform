/**
 * MultilingualContentBadge — 상품 다국어 콘텐츠 연결 상태 배지
 *
 * WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1
 *
 * 매장 상품 목록/상세에서 해당 상품에 store-scoped 다국어 콘텐츠가
 * 연결되어 있는지(지원 언어 수/목록)를 한눈에 보여준다.
 *
 * - 연결 없음(summary=undefined): 목록에서는 아무것도 렌더하지 않는다(과도한 표시 방지).
 * - QR/타블렛 관련 표현은 이 단계에서 사용하지 않는다.
 */

import { Languages } from 'lucide-react';
import type { StoreMlcSummaryItem } from '../api/multilingualProductContentStore';

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어', en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ภาษาไทย', id: 'Bahasa',
};

export function localeLabel(locale: string): string {
  return LOCALE_LABELS[locale] || locale;
}

interface Props {
  summary?: StoreMlcSummaryItem;
  /** 코드 목록(ko · en)까지 함께 표시할지 여부 (목록 셀에서 true 권장) */
  showLocales?: boolean;
}

export function MultilingualContentBadge({ summary, showLocales = true }: Props) {
  if (!summary || summary.localeCount === 0) return null;

  const codes = summary.locales.join(' · ');
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700"
      title={`다국어 콘텐츠 · 언어 ${summary.localeCount}개${codes ? ` (${codes})` : ''}`}
    >
      <Languages className="w-3 h-3" />
      다국어 {summary.localeCount}
      {showLocales && codes && <span className="text-indigo-400 font-normal">· {codes}</span>}
    </span>
  );
}

export default MultilingualContentBadge;
