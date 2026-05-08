/**
 * AI Prompts — 공통 진입점
 *
 * WO-AI-PROMPT-STRUCTURE-DESIGN-V1
 *
 * outputType 기반으로 시스템 프롬프트 / 사용자 프롬프트 / 응답 파서를 반환한다.
 * 라우트는 이 파일만 import하여 사용한다.
 */

export type { NormalizedAiContentResponse } from './common.js';
export { normalizeAiResponse, buildCustomPromptInstruction } from './common.js';

import { buildCustomPromptInstruction } from './common.js';

export {
  buildProductDetailSystemPrompt,
  buildProductDetailUserPrompt,
  parseProductDetailResponse,
} from './productDetail.js';

export {
  buildBlogSystemPrompt,
  buildBlogUserPrompt,
  parseBlogResponse,
} from './blog.js';

export {
  buildPopSystemPrompt,
  buildPopUserPrompt,
  parsePopResponse,
} from './pop.js';

export {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  parseSummaryResponse,
} from './summary.js';

export {
  buildTitleSuggestSystemPrompt,
  buildTitleSuggestUserPrompt,
  parseTitleSuggestResponse,
} from './titleSuggest.js';

export {
  buildStoreQrSystemPrompt,
  buildStoreQrUserPrompt,
  parseStoreQrResponse,
} from './storeQr.js';

export {
  buildStoreSnsSystemPrompt,
  buildStoreSnsUserPrompt,
  parseStoreSnsResponse,
} from './storeSns.js';

// ---------------------------------------------------------------------------
// 지원 outputType 목록 및 builder 디스패처
// ---------------------------------------------------------------------------

export type OutputType = 'product_detail' | 'blog' | 'pop' | 'summary' | 'title_suggest' | 'store_qr' | 'store_sns';

export const SUPPORTED_OUTPUT_TYPES: OutputType[] = ['product_detail', 'blog', 'pop', 'summary', 'title_suggest', 'store_qr', 'store_sns'];

export function isSupportedOutputType(value: string): value is OutputType {
  return SUPPORTED_OUTPUT_TYPES.includes(value as OutputType);
}

import {
  buildProductDetailSystemPrompt,
  buildProductDetailUserPrompt,
  parseProductDetailResponse,
} from './productDetail.js';
import { buildBlogSystemPrompt, buildBlogUserPrompt, parseBlogResponse } from './blog.js';
import { buildPopSystemPrompt, buildPopUserPrompt, parsePopResponse } from './pop.js';
import { buildSummarySystemPrompt, buildSummaryUserPrompt, parseSummaryResponse } from './summary.js';
import { buildTitleSuggestSystemPrompt, buildTitleSuggestUserPrompt, parseTitleSuggestResponse } from './titleSuggest.js';
import { buildStoreQrSystemPrompt, buildStoreQrUserPrompt, parseStoreQrResponse } from './storeQr.js';
import { buildStoreSnsSystemPrompt, buildStoreSnsUserPrompt, parseStoreSnsResponse } from './storeSns.js';
import type { NormalizedAiContentResponse } from './common.js';

interface PromptOptions {
  tone?: string;
  length?: string;
  audience?: string;
  /**
   * WO-O4O-AI-CONTENT-CUSTOM-PROMPT-AND-CORE-EXTENSION-AUDIT-V1:
   *   사용자가 모달 등에서 자유 텍스트로 입력한 추가 요청.
   *   각 outputType 시스템 프롬프트 뒤에 별도 [사용자 추가 요청] 블록으로 주입된다.
   *   미입력 시 기존 동작과 동일.
   */
  customPrompt?: string;
}

/**
 * outputType에 따라 시스템 프롬프트를 반환한다.
 *
 * 최종 구조:
 *   [base + outputType + tone/length/audience + output schema] + [사용자 추가 요청(optional)]
 */
export function buildSystemPrompt(outputType: OutputType, options: PromptOptions): string {
  // customPrompt 는 outputType별 builder 가 아닌 dispatcher 단계에서 통합 주입한다 →
  // 7개 builder 시그니처 변경 없이 모든 outputType 에 균일 적용.
  const { customPrompt, ...rest } = options;

  let base: string;
  switch (outputType) {
    case 'product_detail':
      base = buildProductDetailSystemPrompt(rest);
      break;
    case 'blog':
      base = buildBlogSystemPrompt(rest);
      break;
    case 'pop':
      base = buildPopSystemPrompt(rest);
      break;
    case 'summary':
      base = buildSummarySystemPrompt(rest);
      break;
    case 'title_suggest':
      base = buildTitleSuggestSystemPrompt(rest);
      break;
    case 'store_qr':
      base = buildStoreQrSystemPrompt(rest);
      break;
    case 'store_sns':
      base = buildStoreSnsSystemPrompt(rest);
      break;
  }

  return base + buildCustomPromptInstruction(customPrompt);
}

/**
 * outputType에 따라 사용자 프롬프트를 반환한다.
 */
export function buildUserPrompt(outputType: OutputType, input: string): string {
  switch (outputType) {
    case 'product_detail':
      return buildProductDetailUserPrompt(input);
    case 'blog':
      return buildBlogUserPrompt(input);
    case 'pop':
      return buildPopUserPrompt(input);
    case 'summary':
      return buildSummaryUserPrompt(input);
    case 'title_suggest':
      return buildTitleSuggestUserPrompt(input);
    case 'store_qr':
      return buildStoreQrUserPrompt(input);
    case 'store_sns':
      return buildStoreSnsUserPrompt(input);
  }
}

/**
 * outputType에 따라 AI 응답(파싱된 객체 + rawText)을 정규화한다.
 */
export function parseResponse(
  outputType: OutputType,
  parsed: Record<string, any>,
  rawText: string
): NormalizedAiContentResponse {
  let partial: Omit<NormalizedAiContentResponse, 'type'>;

  switch (outputType) {
    case 'product_detail':
      partial = parseProductDetailResponse(parsed, rawText);
      break;
    case 'blog':
      partial = parseBlogResponse(parsed, rawText);
      break;
    case 'pop':
      partial = parsePopResponse(parsed, rawText);
      break;
    case 'summary':
      partial = parseSummaryResponse(parsed, rawText);
      break;
    case 'title_suggest':
      partial = parseTitleSuggestResponse(parsed, rawText);
      break;
    case 'store_qr':
      partial = parseStoreQrResponse(parsed, rawText);
      break;
    case 'store_sns':
      partial = parseStoreSnsResponse(parsed, rawText);
      break;
  }

  return { ...partial, type: outputType };
}
