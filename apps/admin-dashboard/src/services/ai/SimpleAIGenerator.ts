/**
 * Simplified AI Page Generator (2025)
 * 복잡성을 제거하고 최신 AI API 패턴을 적용한 단순화된 버전
 */

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
  content?: any;
  attributes?: Record<string, any>;
}

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'claude';
  model: AIModel;
  apiKey: string;
}

export interface GenerateRequest {
  prompt: string;
  template?: 'landing' | 'about' | 'product' | 'blog';
  config: AIConfig;
  onProgress?: (progress: number, message: string) => void;
  signal?: AbortSignal;
}

/**
 * 단순화된 AI 페이지 생성기
 * - 복잡한 추상화 제거
 * - 2025년 최신 API 패턴 적용
 * - 에러 처리 단순화
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
      updateProgress(10, 'AI 모델에 연결 중...');
      
      const systemPrompt = this.getSystemPrompt(template);
      const userPrompt = this.buildUserPrompt(prompt);
      
      updateProgress(30, 'AI 응답 생성 중...');
      
      let blocks: Block[];
      
      switch (config.provider) {
        case 'openai':
          blocks = await this.generateWithOpenAI(systemPrompt, userPrompt, config, signal);
          break;
        case 'gemini':
          blocks = await this.generateWithGemini(systemPrompt, userPrompt, config, signal);
          break;
        case 'claude':
          blocks = await this.generateWithClaude(systemPrompt, userPrompt, config, signal);
          break;
        default:
          throw new Error(`지원하지 않는 AI 제공자: ${config.provider}`);
      }
      
      updateProgress(80, '응답 처리 중...');
      
      // 블록 검증 및 ID 추가
      const validatedBlocks = this.validateBlocks(blocks);
      
      updateProgress(100, '페이지 생성 완료!');
      
      return validatedBlocks;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('생성이 취소되었습니다');
      }
      throw new Error(error.message || 'AI 페이지 생성 중 오류가 발생했습니다');
    }
  }

  /**
   * OpenAI API 호출 (2025년 최신 패턴)
   */
  private async generateWithOpenAI(
    systemPrompt: string,
    userPrompt: string,
    config: AIConfig,
    signal?: AbortSignal
  ): Promise<Block[]> {
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        // 2025년 최신 파라미터
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        // GPT-5 전용 파라미터
        ...(config.model.startsWith('gpt-5') && {
          verbosity: 'medium',
          reasoning_effort: 'standard'
        })
      }),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API 오류');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      return parsed.blocks || parsed;
    } catch {
      throw new Error('AI 응답을 파싱할 수 없습니다');
    }
  }

  /**
   * Gemini API 호출 (2025년 최신 패턴)
   */
  private async generateWithGemini(
    systemPrompt: string,
    userPrompt: string,
    config: AIConfig,
    signal?: AbortSignal
  ): Promise<Block[]> {
    
    // 2025년 Gemini API 버전 자동 선택
    const apiVersion = config.model.includes('2.5') ? 'v1' : 'v1beta';
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/${apiVersion}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            // 2025년 응답 스키마 (구조화된 출력)
            responseSchema: {
              type: 'OBJECT',
              properties: {
                blocks: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      type: { type: 'STRING' },
                      content: { type: 'OBJECT' },
                      attributes: { type: 'OBJECT' }
                    }
                  }
                }
              }
            }
          }
        }),
        signal
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API 오류');
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('Gemini로부터 응답을 받지 못했습니다');
    }

    try {
      const parsed = JSON.parse(content);
      return parsed.blocks || parsed;
    } catch {
      throw new Error('Gemini 응답을 파싱할 수 없습니다');
    }
  }

  /**
   * Claude API 호출 (2025년 최신 패턴)
   */
  private async generateWithClaude(
    systemPrompt: string,
    userPrompt: string,
    config: AIConfig,
    signal?: AbortSignal
  ): Promise<Block[]> {
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2025-01-01',
        // 2025년 Claude 4 전용 헤더
        'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }],
        temperature: 0.7,
        // Claude 4 전용 기능
        ...(config.model.includes('4') && {
          stream: false,
          stop_sequences: ['</json>']
        })
      }),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API 오류');
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    
    if (!content) {
      throw new Error('Claude로부터 응답을 받지 못했습니다');
    }

    try {
      const parsed = JSON.parse(content);
      return parsed.blocks || parsed;
    } catch {
      throw new Error('Claude 응답을 파싱할 수 없습니다');
    }
  }

  /**
   * 템플릿별 시스템 프롬프트
   */
  private getSystemPrompt(template: string): string {
    const prompts = {
      landing: `WordPress Gutenberg 블록 형식으로 랜딩 페이지를 생성하세요.
사용 가능한 블록: core/heading, core/paragraph, core/image, core/button, core/columns, core/separator
반드시 JSON 형식으로 응답하세요: {"blocks": [...]}`,
      
      about: `회사 소개 페이지를 생성하세요. 회사 비전, 핵심 가치, 팀 소개를 포함하세요.
JSON 형식으로 응답하세요: {"blocks": [...]}`,
      
      product: `제품 소개 페이지를 생성하세요. 제품명, 주요 기능, 장점, 가격 정보를 포함하세요.
JSON 형식으로 응답하세요: {"blocks": [...]}`,
      
      blog: `블로그 포스트를 생성하세요. 제목, 소개, 본문 섹션, 결론을 포함하세요.
JSON 형식으로 응답하세요: {"blocks": [...]}`
    };
    
    return prompts[template as keyof typeof prompts] || prompts.landing;
  }

  /**
   * 사용자 프롬프트 구성
   */
  private buildUserPrompt(prompt: string): string {
    return `다음 요구사항으로 페이지를 생성하세요: ${prompt}

블록 형식 예시:
{
  "blocks": [
    {
      "type": "core/heading",
      "content": {"text": "제목"},
      "attributes": {"level": 1}
    },
    {
      "type": "core/paragraph", 
      "content": {"text": "내용"},
      "attributes": {}
    }
  ]
}`;
  }

  /**
   * 블록 검증 및 ID 추가
   */
  private validateBlocks(blocks: any[]): Block[] {
    if (!Array.isArray(blocks)) {
      throw new Error('유효하지 않은 블록 형식입니다');
    }

    return blocks.map((block, index) => ({
      id: `block-${Date.now()}-${index}`,
      type: block.type || 'core/paragraph',
      content: block.content || { text: '' },
      attributes: block.attributes || {}
    }));
  }
}

// 싱글톤 인스턴스
export const simpleAIGenerator = new SimpleAIGenerator();