/**
 * Simplified AI Page Generator (2025)
 * Sprint 2 - P1: Use server-side proxy instead of direct LLM calls
 *
 * Security:
 * - NO API keys in frontend code
 * - All LLM calls go through /api/ai/generate proxy
 * - Server handles authentication, rate limiting, and key injection
 */

import { authClient } from '@o4o/auth-client';
import {
  buildSimpleGeneratorV2,
  buildSimpleGeneratorLegacy,
  SIMPLE_GENERATOR_USER_PROMPT,
  SIMPLE_GENERATOR_BLOCK_FORMAT_EXAMPLE,
} from '@o4o/ai-prompts/admin';
import { referenceFetcher } from './reference-fetcher.service';
import {
  AIResponse,
  AIResponseV1,
  AIResponseV2,
  isAIResponseV1,
  isAIResponseV2,
  NewBlockRequest,
  ShortcodeBlockAttributes,
  PlaceholderBlockAttributes,
} from './types';

// 2025년 최신 AI 모델 목록
export const AI_MODELS = {
  // OpenAI GPT-5 시리즈 (2025)
  'gpt-5': 'GPT-5 (최신 추론 모델)',
  'gpt-5-mini': 'GPT-5 Mini (빠르고 경제적)',
  'gpt-5-nano': 'GPT-5 Nano (초고속)',
  'gpt-4.1': 'GPT-4.1 (복잡한 작업용)',
  'gpt-4o': 'GPT-4o (멀티모달)',

  // Google Gemini 2025
  'gemini-2.5-flash': 'Gemini 2.5 Flash (권장)',
  'gemini-2.5-pro': 'Gemini 2.5 Pro (최강력)',
  'gemini-2.0-flash': 'Gemini 2.0 Flash (멀티모달)',
  // Gemini 3 models - Coming soon (not yet supported by Google API)

  // Claude 2025 (Anthropic)
  'claude-sonnet-4.5': 'Claude Sonnet 4.5 (최신)',
  'claude-opus-4': 'Claude Opus 4 (최강력)',
  'claude-sonnet-4': 'Claude Sonnet 4',
} as const;

export type AIModel = keyof typeof AI_MODELS;

export interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: Record<string, any>;
  clientId?: string;
  innerBlocks?: Block[];
}

// Sprint 2 - P1: Removed apiKey from config (server-side only)
export interface AIConfig {
  provider: 'openai' | 'gemini' | 'claude';
  model: AIModel;
  maxTokens?: number;
}

export interface GenerateRequest {
  prompt: string;
  template?: 'landing' | 'about' | 'product' | 'blog';
  config: AIConfig;
  onProgress?: (progress: number, message: string) => void;
  signal?: AbortSignal;
}

export interface GenerateResult {
  blocks: Block[];
  newBlocksRequest?: NewBlockRequest[];
}

/**
 * AI Proxy Error Response
 */
interface AIProxyError {
  success: false;
  error: string;
  type: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'PROVIDER_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR';
  retryable: boolean;
  requestId?: string;
}

/**
 * AI Proxy Success Response
 */
interface AIProxyResponse {
  success: true;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  result: {
    blocks: any[];
  };
  requestId?: string;
}

/**
 * 단순화된 AI 페이지 생성기
 * - Sprint 2 - P1: 모든 LLM 호출을 서버 프록시로 변경
 * - API 키 제거 (서버에서만 보관)
 * - 표준화된 에러 처리
 */
export class SimpleAIGenerator {
  /**
   * 메인 생성 메서드 (V2 지원)
   * V1/V2 포맷을 모두 수용하며, new_blocks_request를 함께 반환
   */
  async generatePage(request: GenerateRequest): Promise<GenerateResult> {
    const { prompt, template = 'landing', config, onProgress, signal } = request;

    const updateProgress = (progress: number, message: string) => {
      onProgress?.(progress, message);
    };

    try {
      updateProgress(5, '서버에서 최신 참조 데이터 로드 중...');

      // Phase 1-B: JSON 기반 참조 데이터 가져오기
      const { blockRegistry, designTokens } = await this.fetchReferenceDataJSON();

      updateProgress(10, 'AI 프록시 서버에 연결 중...');

      const systemPrompt = this.getSystemPromptV2(template, blockRegistry, designTokens);
      const userPrompt = this.buildUserPrompt(prompt);

      updateProgress(30, 'AI 응답 생성 중...');

      // Sprint 2 - P1: Use server-side proxy (single call)
      // Sprint 3: Pro→Flash 자동 폴백 (500 에러 및 타임아웃 대응)
      let aiResponse: any;
      try {
        aiResponse = await this.generateWithProxy(
          systemPrompt,
          userPrompt,
          config,
          signal,
          updateProgress
        );
      } catch (error: any) {
        // Pro 모델에서 500 에러나 타임아웃 발생 시 Flash로 자동 폴백
        const shouldFallback =
          config.model === 'gemini-2.5-pro' &&
          (error.response?.status === 500 ||
           error.type === 'TIMEOUT_ERROR' ||
           error.message?.includes('timeout'));

        if (shouldFallback) {
          updateProgress(40, 'Flash 모델로 재시도 중...');
          console.warn('⚠️ Pro 모델 실패, Flash로 폴백:', error.message);

          aiResponse = await this.generateWithProxy(
            systemPrompt,
            userPrompt,
            { ...config, model: 'gemini-2.5-flash' },
            signal,
            updateProgress
          );
        } else {
          throw error;
        }
      }

      updateProgress(80, '응답 처리 중...');

      // 블록 검증 및 ID 추가 (V1/V2 포맷 모두 수용)
      const { validatedBlocks, newBlocksRequest } = this.validateAndNormalizeBlocks(aiResponse);

      updateProgress(100, '페이지 생성 완료!');

      return {
        blocks: validatedBlocks,
        newBlocksRequest,
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('생성이 취소되었습니다');
      }

      // Handle proxy errors
      if (error.type) {
        throw new Error(this.formatProxyError(error));
      }

      throw new Error(error.message || 'AI 페이지 생성 중 오류가 발생했습니다');
    }
  }

  /**
   * Sprint 2 - P1: Call server-side AI proxy
   * Replaces direct OpenAI/Gemini/Claude calls
   */
  private async generateWithProxy(
    systemPrompt: string,
    userPrompt: string,
    config: AIConfig,
    signal?: AbortSignal,
    updateProgress?: (progress: number, message: string) => void
  ): Promise<any> {
    try {
      const response = await authClient.api.post('/ai/generate', {
        provider: config.provider,
        model: config.model,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: config.maxTokens || (config.provider === 'gemini' ? 16384 : 8192),
      });

      const data: AIProxyResponse | AIProxyError = response.data;

      // Handle error response
      if (!data.success) {
        const errorData = data as AIProxyError;
        throw errorData;
      }

      // Success response
      const successData = data as AIProxyResponse;

      // Update progress with usage info
      if (updateProgress && successData.usage?.totalTokens) {
        updateProgress(70, `AI 응답 수신 완료 (토큰: ${successData.usage.totalTokens})`);
      }

      // Return the result object (not just blocks array) for validation
      return successData.result || { blocks: [] };
    } catch (error: any) {
      // Handle authClient errors
      if (error.response) {
        const status = error.response.status;

        if (status === 429) {
          const retryAfter = error.response.headers?.['retry-after'];
          const waitTime = retryAfter ? `${retryAfter}초` : '잠시';
          throw new Error(`요청 한도를 초과했습니다. ${waitTime} 후 다시 시도해 주세요.`);
        }

        if (status === 401) {
          throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
        }

        if (status === 504) {
          throw new Error('요청 시간이 초과되었습니다. 프롬프트를 간단히 하거나 다시 시도해 주세요.');
        }
      }

      throw error;
    }
  }

  /**
   * Format proxy error message for user
   */
  private formatProxyError(error: AIProxyError): string {
    const errorMessages: Record<string, string> = {
      VALIDATION_ERROR: `잘못된 요청: ${error.error}`,
      AUTH_ERROR: '인증 오류: 로그인이 필요합니다.',
      PROVIDER_ERROR: `AI 서비스 오류: ${error.error}`,
      TIMEOUT_ERROR: '요청 시간 초과: 프롬프트를 간단히 하거나 다시 시도해 주세요.',
      RATE_LIMIT_ERROR: `요청 한도 초과: ${error.error}`,
    };

    const baseMessage = errorMessages[error.type] || error.error;

    if (error.retryable) {
      return `${baseMessage}\n다시 시도할 수 있습니다.`;
    }

    return baseMessage;
  }

  /**
   * Phase 1-B: JSON 기반 참조 데이터 가져오기
   */
  private async fetchReferenceDataJSON(): Promise<{
    blockRegistry: any;
    designTokens: any;
  }> {
    const [blockRegistry, designTokens] = await Promise.all([
      referenceFetcher.fetchBlockRegistryJSON(),
      referenceFetcher.fetchDesignTokensJSON(),
    ]);

    return {
      blockRegistry,
      designTokens,
    };
  }

  /**
   * Phase 1-B: V2 System Prompt (JSON 기반, 4개 섹션 구조)
   */
  private getSystemPromptV2(template: string, blockRegistry: any, designTokens: any): string {
    return buildSimpleGeneratorV2({
      template,
      blockRegistryJSON: JSON.stringify(blockRegistry, null, 2),
      blockListFormatted: this.formatBlockList(blockRegistry),
      designTokensJSON: JSON.stringify(designTokens, null, 2),
    });
  }

  /**
   * Block Registry에서 블록 목록을 포맷팅
   */
  private formatBlockList(blockRegistry: any): string {
    if (!blockRegistry || !blockRegistry.blocks) {
      return '- o4o/heading\n- o4o/paragraph\n- o4o/button';
    }

    return blockRegistry.blocks
      .map((block: any) => `- ${block.name}: ${block.description || block.title}`)
      .join('\n');
  }

  /**
   * 템플릿별 시스템 프롬프트 (Legacy - Phase 1-A 호환)
   */
  private getSystemPrompt(template: string, availableBlocks: string): string {
    return buildSimpleGeneratorLegacy(template, availableBlocks);
  }

  /**
   * 사용자 프롬프트 구성
   *
   * UPDATED 2025-10-26: Upgraded block structure
   * - Heading/Paragraph blocks now use Slate.js: content={}, data in attributes
   * - Columns/Column blocks support innerBlocks
   */
  private buildUserPrompt(prompt: string): string {
    return `${SIMPLE_GENERATOR_USER_PROMPT}${prompt}
${SIMPLE_GENERATOR_BLOCK_FORMAT_EXAMPLE}`;
  }

  /**
   * Phase 1-A: V1/V2 포맷 모두 수용하는 블록 검증 및 정규화
   *
   * 변경 사항:
   * - Shortcode 블록 제거 로직 삭제 (o4o/shortcode로 정상 통합)
   * - V1/V2 포맷 자동 감지 및 정규화
   * - Placeholder 블록 처리 로직 추가
   * - new_blocks_request 반환 지원
   */
  private validateAndNormalizeBlocks(response: any): {
    validatedBlocks: Block[];
    newBlocksRequest?: NewBlockRequest[];
  } {
    // V2 포맷 감지
    if (isAIResponseV2(response)) {
      return {
        validatedBlocks: this.normalizeBlocks(response.layout.blocks),
        newBlocksRequest: response.new_blocks_request,
      };
    }

    // V1 포맷 (legacy)
    if (isAIResponseV1(response)) {
      return {
        validatedBlocks: this.normalizeBlocks(response.blocks),
      };
    }

    // Unknown format - 에러 발생
    throw new Error('유효하지 않은 AI 응답 형식입니다');
  }

  /**
   * 블록 정규화 (core/ → o4o/, content → attributes 등)
   * ⚠️ Shortcode 블록 제거 로직 삭제됨 (Phase 1-A)
   */
  private normalizeBlocks(blocks: any[]): Block[] {
    if (!Array.isArray(blocks)) {
      throw new Error('블록은 배열 형식이어야 합니다');
    }

    return blocks.map((block, index) => {
      // core/ prefix를 o4o/ prefix로 자동 변환
      let blockType = block.type || 'o4o/paragraph';
      if (blockType.startsWith('core/')) {
        blockType = blockType.replace('core/', 'o4o/');
      }

      // ⭐ Phase 1-A: shortcode 타입 정규화
      // shortcode/xxx → o4o/shortcode로 통합
      if (blockType.includes('shortcode') && blockType !== 'o4o/shortcode') {
        blockType = 'o4o/shortcode';
      }

      let content = block.content || {};
      let attributes = block.attributes || {};

      // heading 블록: content.text → attributes.content, content.level → attributes.level
      if (blockType === 'o4o/heading') {
        if (typeof content === 'string') {
          // content가 문자열인 경우
          attributes = {
            ...attributes,
            content: content,
            level: attributes.level || 2
          };
          content = {}; // 객체 구조 유지
        } else if (typeof content === 'object' && (content.text || content.level)) {
          // AI가 content에 text, level을 넣은 경우 → attributes로 이동
          const level = content.level || attributes.level || 2;
          attributes = {
            ...attributes,
            content: content.text || '',
            level
          };
          content = {}; // 객체 구조 유지
        } else if (!attributes.content) {
          // attributes에 content가 없는 경우
          attributes = {
            ...attributes,
            content: '',
            level: attributes.level || 2
          };
          content = {};
        } else {
          // attributes.content가 이미 있는 경우
          content = {};
        }
      }

      // paragraph 블록: content.text → attributes.content
      if (blockType === 'o4o/paragraph') {
        if (typeof content === 'string') {
          // content가 문자열인 경우
          attributes = {
            ...attributes,
            content: content
          };
          content = {}; // 객체 구조 유지
        } else if (typeof content === 'object' && content.text) {
          // AI가 content에 text를 넣은 경우 → attributes로 이동
          attributes = {
            ...attributes,
            content: content.text
          };
          content = {}; // 객체 구조 유지
        } else if (!attributes.content) {
          // attributes에 content가 없는 경우
          attributes = {
            ...attributes,
            content: ''
          };
          content = {};
        } else {
          // attributes.content가 이미 있는 경우
          content = {};
        }
      }

      // list 블록: content.items → attributes로 이동 (✨ UPDATED 2025-10-26)
      if (blockType === 'o4o/list') {
        if (typeof content === 'object' && Array.isArray(content.items)) {
          // AI가 content에 items를 넣은 경우 → attributes로 이동
          const ordered = content.ordered || false;
          attributes = {
            ...attributes,
            items: content.items,
            ordered,
            type: ordered ? 'ordered' : 'unordered'
          };
          content = {}; // 빈 객체로 변환
        } else if (!attributes.items) {
          // attributes에 items가 없는 경우 - 기본값 설정
          attributes = {
            ...attributes,
            items: [],
            ordered: false,
            type: 'unordered'
          };
          content = {};
        } else {
          // attributes.items가 이미 있는 경우 - content만 빈 객체로
          // type 속성 자동 추가
          if (!attributes.type) {
            attributes.type = attributes.ordered ? 'ordered' : 'unordered';
          }
          content = {};
        }
      }

      // button 블록: content는 빈 객체, 데이터는 attributes에
      if (blockType === 'o4o/button') {
        if (typeof content === 'object' && content.text) {
          // 잘못된 형식: content에 데이터가 있음
          attributes = {
            ...attributes,
            text: content.text,
            url: content.url || '#'
          };
        }
        // content는 항상 빈 객체
        content = {};
      }

      // image 블록: content는 빈 객체, 데이터는 attributes에
      if (blockType === 'o4o/image') {
        if (typeof content === 'object' && (content.url || content.alt)) {
          // 잘못된 형식: content에 데이터가 있음
          attributes = {
            ...attributes,
            url: content.url || '',
            alt: content.alt || ''
          };
        }
        // content는 항상 빈 객체
        content = {};
      }

      // ⭐ Phase 1-A: shortcode 블록 처리
      if (blockType === 'o4o/shortcode') {
        // shortcode는 attributes.shortcode에 저장
        if (typeof content === 'object' && content.shortcode) {
          attributes = {
            ...attributes,
            shortcode: content.shortcode,
          };
        } else if (typeof content === 'string') {
          attributes = {
            ...attributes,
            shortcode: content,
          };
        }
        // content는 항상 빈 객체
        content = {};
      }

      // ⭐ Phase 1-A: placeholder 블록 처리
      if (blockType === 'o4o/placeholder') {
        // placeholder는 attributes에 componentName, reason 등 저장
        if (typeof content === 'object') {
          attributes = {
            ...attributes,
            componentName: content.componentName || attributes.componentName || 'Unknown',
            reason: content.reason || attributes.reason || '',
            props: content.props || attributes.props,
            style: content.style || attributes.style,
            placeholderId: content.placeholderId || attributes.placeholderId,
          };
        }
        // content는 항상 빈 객체
        content = {};
      }

      // ✨ UPDATED 2025-10-26: columns 블록 처리
      if (blockType === 'o4o/columns') {
        // columnCount 기본값 설정
        if (!attributes.columnCount) {
          // innerBlocks에서 column 개수 추론
          const columnCount = block.innerBlocks?.length || 2;
          attributes.columnCount = columnCount;
        }
        // 기본 설정값
        if (!attributes.verticalAlignment) {
          attributes.verticalAlignment = 'top';
        }
        if (attributes.isStackedOnMobile === undefined) {
          attributes.isStackedOnMobile = true;
        }
        content = {};
      }

      // ✨ UPDATED 2025-10-26: column 블록 처리
      if (blockType === 'o4o/column') {
        // width 기본값 설정
        if (!attributes.width) {
          // 부모 columns에서 균등 분할
          attributes.width = 50; // 기본 2열 레이아웃
        }
        if (!attributes.verticalAlignment) {
          attributes.verticalAlignment = 'top';
        }
        content = {};
      }

      // innerBlocks 재귀 처리 (columns, column 등 컨테이너 블록)
      let innerBlocks: Block[] | undefined = undefined;
      if (block.innerBlocks && Array.isArray(block.innerBlocks)) {
        // 재귀적으로 innerBlocks 정규화
        innerBlocks = this.normalizeBlocks(block.innerBlocks);
      }

      return {
        id: `block-${Date.now()}-${index}`,
        type: blockType,
        content,
        attributes,
        ...(innerBlocks && innerBlocks.length > 0 ? { innerBlocks } : {})
      };
    });
  }
}

// 싱글톤 인스턴스
export const simpleAIGenerator = new SimpleAIGenerator();
