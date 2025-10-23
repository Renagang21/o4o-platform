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
import { referenceFetcher } from './reference-fetcher.service';

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
}

export interface GenerateRequest {
  prompt: string;
  template?: 'landing' | 'about' | 'product' | 'blog';
  config: AIConfig;
  onProgress?: (progress: number, message: string) => void;
  signal?: AbortSignal;
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
   * 메인 생성 메서드
   */
  async generatePage(request: GenerateRequest): Promise<Block[]> {
    const { prompt, template = 'landing', config, onProgress, signal } = request;

    const updateProgress = (progress: number, message: string) => {
      onProgress?.(progress, message);
    };

    try {
      updateProgress(5, '서버에서 최신 참조 데이터 로드 중...');

      // 서버 우선 전략으로 참조 데이터 가져오기
      const availableBlocks = await this.fetchReferenceData();

      updateProgress(10, 'AI 프록시 서버에 연결 중...');

      const systemPrompt = this.getSystemPrompt(template, availableBlocks);
      const userPrompt = this.buildUserPrompt(prompt);

      updateProgress(30, 'AI 응답 생성 중...');

      // Sprint 2 - P1: Use server-side proxy (single call)
      const blocks = await this.generateWithProxy(
        systemPrompt,
        userPrompt,
        config,
        signal,
        updateProgress
      );

      updateProgress(80, '응답 처리 중...');

      // 블록 검증 및 ID 추가
      const validatedBlocks = this.validateBlocks(blocks);

      updateProgress(100, '페이지 생성 완료!');

      return validatedBlocks;

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
  ): Promise<Block[]> {
    try {
      const response = await authClient.api.post('/ai/generate', {
        provider: config.provider,
        model: config.model,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: config.provider === 'gemini' ? 8192 : 4000,
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

      return successData.result.blocks || [];
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
   * 서버 우선 전략으로 참조 데이터 가져오기
   */
  private async fetchReferenceData(): Promise<string> {
    return await referenceFetcher.fetchCompleteReference();
  }

  /**
   * 템플릿별 시스템 프롬프트
   */
  private getSystemPrompt(template: string, availableBlocks: string): string {
    const baseRules = `
중요한 규칙:
1. 반드시 JSON 형식으로만 응답하세요: {"blocks": [...]}
2. 이미지 URL은 절대 사용하지 마세요 (placeholder 사이트 포함)
3. 이미지 블록에는 alt 텍스트만 포함하고 src는 비워두세요
4. 버튼은 실제 링크 대신 "#" 사용
5. 한국어로 작성하세요
6. 사용자가 요청한 내용에 정확히 맞춰 생성하세요`;

    const prompts = {
      landing: `${baseRules}

${availableBlocks}

랜딩 페이지 구성 요소:
- 매력적인 헤드라인 (H1)
- 부제목 설명 (H2)
- 주요 기능/장점 3개 (단락)
- CTA 버튼
- 이미지는 alt 텍스트만 (src 없음)
- 필요시 숏코드 활용 (예: 상품 그리드, 문의 폼 등)`,

      about: `${baseRules}

${availableBlocks}

회사 소개 페이지 구성:
- 회사 소개 헤드라인
- 회사 비전/미션
- 핵심 가치 3-4개 (리스트 사용)
- 팀 소개 섹션
- 연락처 정보 (필요시 [form] 숏코드 활용)`,

      product: `${baseRules}

${availableBlocks}

제품 소개 페이지 구성:
- 제품명과 한 줄 설명
- 주요 기능 소개 (리스트 활용)
- 제품 장점 3-5개
- 사용법/활용 사례
- 가격 정보 (있다면 [product] 숏코드 활용 가능)
- CTA 버튼 또는 [add_to_cart] 숏코드`,

      blog: `${baseRules}

${availableBlocks}

블로그 포스트 구성:
- 매력적인 제목 (H1)
- 서론 (문제 제기)
- 본문 3-4개 섹션 (H2 제목 + 단락)
- 인용구나 코드 블록 활용 가능
- 실용적인 팁이나 해결책 (리스트 활용)
- 결론 및 요약
- 관련 글: [recent_posts] 숏코드 활용 가능`
    };

    return prompts[template as keyof typeof prompts] || prompts.landing;
  }

  /**
   * 사용자 프롬프트 구성
   */
  private buildUserPrompt(prompt: string): string {
    return `다음 요구사항으로 페이지를 정확히 생성하세요: ${prompt}

블록 형식 예시:
{
  "blocks": [
    {
      "type": "o4o/heading",
      "content": {"text": "제목"},
      "attributes": {"level": 1}
    },
    {
      "type": "o4o/paragraph",
      "content": {"text": "내용"},
      "attributes": {}
    },
    {
      "type": "o4o/image",
      "content": {"alt": "이미지 설명"},
      "attributes": {}
    },
    {
      "type": "o4o/button",
      "content": {"text": "버튼 텍스트", "url": "#"},
      "attributes": {}
    }
  ]
}

중요: 이미지 src는 절대 포함하지 말고, alt 텍스트만 사용하세요. 외부 URL 사용 금지.`;
  }

  /**
   * 블록 검증 및 ID 추가
   * core/ prefix를 o4o/ prefix로 자동 변환
   */
  private validateBlocks(blocks: any[]): Block[] {
    if (!Array.isArray(blocks)) {
      throw new Error('유효하지 않은 블록 형식입니다');
    }

    return blocks.map((block, index) => {
      // core/ prefix를 o4o/ prefix로 자동 변환
      let blockType = block.type || 'o4o/paragraph';
      if (blockType.startsWith('core/')) {
        blockType = blockType.replace('core/', 'o4o/');
      }

      return {
        id: `block-${Date.now()}-${index}`,
        type: blockType,
        content: block.content || { text: '' },
        attributes: block.attributes || {}
      };
    });
  }
}

// 싱글톤 인스턴스
export const simpleAIGenerator = new SimpleAIGenerator();
