/**
 * AI Prompts — 공통 진입점
 *
 * WO-AI-PROMPT-STRUCTURE-DESIGN-V1
 *
 * outputType 기반으로 시스템 프롬프트 / 사용자 프롬프트 / 응답 파서를 반환한다.
 * 라우트는 이 파일만 import하여 사용한다.
 */

export type { NormalizedAiContentResponse } from './common.js';
export { normalizeAiResponse } from './common.js';

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

// ---------------------------------------------------------------------------
// 지원 outputType 목록 및 builder 디스패처
// ---------------------------------------------------------------------------

export type OutputType = 'product_detail' | 'blog' | 'pop';

export const SUPPORTED_OUTPUT_TYPES: OutputType[] = ['product_detail', 'blog', 'pop'];

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
import type { NormalizedAiContentResponse } from './common.js';

interface PromptOptions {
  tone?: string;
  length?: string;
  audience?: string;
}

/**
 * outputType에 따라 시스템 프롬프트를 반환한다.
 */
export function buildSystemPrompt(outputType: OutputType, options: PromptOptions): string {
  switch (outputType) {
    case 'product_detail':
      return buildProductDetailSystemPrompt(options);
    case 'blog':
      return buildBlogSystemPrompt(options);
    case 'pop':
      return buildPopSystemPrompt(options);
  }
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
  }

  return { ...partial, type: outputType };
}
