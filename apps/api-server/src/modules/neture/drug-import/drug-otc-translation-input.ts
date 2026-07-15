/**
 * OTC 설명서 번역 입력 — 소비자 소스 / 번역자 참고 주석 분리
 *
 * WO-O4O-OTC-TRANSLATOR-NOTE-DERIVATION-V1
 *
 * CR-021: 내부 편집 주석은 **소비자 노출 대상에서 제외**하되 **번역자 입력에서 제거하지 않는다**.
 * 주석에만 있는 안전 근거(같은 성분 고함량이 전문의약품 / 제형명과 실제 투여경로 불일치 등)가
 * 오역을 막는 유일한 근거이기 때문이다 — 설계 = CHECK-O4O-OTC-TRANSLATOR-NOTE-SEPARATION-V1.
 *
 * 파생만 한다(read-only). `bodyMarkdown` 은 수정하지 않고 DB 에 새로 저장하지도 않는다.
 * 소비자 HTML 은 구조화 필드에서만 만든다 — drug-otc-description-consumer-html.ts.
 */

import { deriveOtcRoute, type OtcRouteResult } from './drug-otc-route.js';

/** 파생 입력. 소비자 HTML 빌더와 달리 주석 원천인 bodyMarkdown 을 읽는다. */
export interface DrugOtcDraftContent {
  summaryTable?: Record<string, string> | null;
  efficacy?: string | null;
  usage?: string | null;
  usageLabel?: string | null;
  caution?: string | null;
  ingredientSelection?: string | null;
  /** 원문 무손실 보존본. 내부 편집 주석을 포함한다 — 소비자 렌더 소스로 쓰지 않는다. */
  bodyMarkdown?: string | null;
}

export interface TranslatorNoteResult {
  /** 선두 인용 블록에서 파생한 주석. 없으면 null. */
  translatorNote: string | null;
  /**
   * 본문 중간 인용이 발견됨. 자동 추출하지 않고 **사람 검토 대상**으로 표시한다.
   * (95건 전수 조사에서 0건이었으나, 향후 초안이 이 형태를 쓰면 조용히 놓치지 않기 위한 신호.)
   */
  midBodyQuoteNeedsReview: boolean;
}

/** 번역자에게 전달하는 입력. consumerSource 만 번역 대상이다. */
export interface DrugOtcTranslationInput {
  /** 번역 대상 — 이것만 번역한다. */
  consumerSource: {
    efficacy: string | null;
    usage: string | null;
    /** '복용 안내'(경구) | '사용 안내'(비경구). 투여경로 신호 — 제형명으로 추정하지 않는다(DR-019). */
    usageLabel: string | null;
    caution: string | null;
    summaryTable: Record<string, string>;
  };
  /** 번역 참고 전용. 번역 대상이 아니며 영문 산출물에 포함하지 않는다(CR-021). */
  translatorNote: string | null;
  meta: {
    title: string;
    groupKey: string | null;
    midBodyQuoteNeedsReview: boolean;
    /**
     * 투여경로 파생값(DR-019). 제형명으로 추정하지 않으며 근거 없으면 route=null·needs_review.
     * 번역자는 이 값으로 take/insert 등 동사를 정한다(G-01).
     */
    route: OtcRouteResult;
  };
}

const QUOTE_LINE = /^\s*>\s?(.*)$/;

/**
 * `bodyMarkdown` 선두의 **연속된 인용 블록**을 translatorNote 로 파생한다.
 *
 * - 인용 표기(`>`)와 여분 공백을 정리한다. 내용 문자열은 바꾸지 않는다.
 * - 선두에 인용이 없으면 `translatorNote=null` (오탐 방지 — 내용 기반 추정을 하지 않는다).
 * - 본문 중간 인용은 **추출하지 않고** `midBodyQuoteNeedsReview=true` 로 표시한다.
 */
export function deriveTranslatorNote(bodyMarkdown: string | null | undefined): TranslatorNoteResult {
  const raw = (bodyMarkdown ?? '').replace(/\r\n/g, '\n');
  if (raw.trim() === '') return { translatorNote: null, midBodyQuoteNeedsReview: false };

  const lines = raw.split('\n');
  const noteLines: string[] = [];
  let i = 0;

  // 선두 공백 줄 건너뛰기
  while (i < lines.length && lines[i].trim() === '') i++;
  const quoteStart = i;

  // 연속된 인용 줄 수집 (빈 인용 줄 '>' 은 문단 구분으로 취급)
  while (i < lines.length) {
    const m = QUOTE_LINE.exec(lines[i]);
    if (!m) break;
    noteLines.push(m[1].trim());
    i++;
  }
  const hadLeadingQuote = i > quoteStart;

  // 남은 본문에 인용이 또 있나 → 자동 추출 대상 아님(검토 신호)
  const midBodyQuoteNeedsReview = lines.slice(i).some((l) => QUOTE_LINE.test(l));

  if (!hadLeadingQuote) return { translatorNote: null, midBodyQuoteNeedsReview };

  const translatorNote = noteLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { translatorNote: translatorNote === '' ? null : translatorNote, midBodyQuoteNeedsReview };
}

/**
 * 초안 → 번역 입력. 소비자 소스와 번역자 참고 주석을 **분리해서** 제공한다.
 *
 * translatorNote 는 `consumerSource` 에 병합하지 않는다 — 번역자가 읽는 값일 뿐,
 * 그 내용을 영문 본문에 옮기면 T-04(원문에 없는 정보 추가) 위반이다.
 */
export function buildDrugOtcTranslationInput(
  content: DrugOtcDraftContent,
  opts: { title: string; groupKey?: string | null },
): DrugOtcTranslationInput {
  const { translatorNote, midBodyQuoteNeedsReview } = deriveTranslatorNote(content.bodyMarkdown);
  return {
    consumerSource: {
      efficacy: content.efficacy ?? null,
      usage: content.usage ?? null,
      usageLabel: content.usageLabel ?? null,
      caution: content.caution ?? null,
      summaryTable: content.summaryTable ?? {},
    },
    translatorNote,
    meta: {
      title: opts.title,
      groupKey: opts.groupKey ?? null,
      midBodyQuoteNeedsReview,
      route: deriveOtcRoute({
        groupKey: opts.groupKey ?? null,
        usageLabel: content.usageLabel ?? null,
        summaryTable: content.summaryTable ?? null,
        title: opts.title,
      }),
    },
  };
}
