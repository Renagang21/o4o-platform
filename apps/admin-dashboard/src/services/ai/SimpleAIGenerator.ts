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
            maxOutputTokens: 8192
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
      // Gemini 응답에서 JSON 부분 추출
      let jsonContent = content;
      
      // 마크다운 코드 블록이나 기타 텍스트 제거
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        jsonContent = jsonMatch[1] || jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonContent);
      const blocks = parsed.blocks || (Array.isArray(parsed) ? parsed : [parsed]);
      
      return blocks;
    } catch (error) {
      
      throw new Error('Gemini 응답을 파싱할 수 없습니다. AI가 올바른 JSON 형식을 반환하지 않았습니다.');
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
    const baseRules = `
중요한 규칙:
1. 반드시 JSON 형식으로만 응답하세요: {"blocks": [...]}
2. 이미지 URL은 절대 사용하지 마세요 (placeholder 사이트 포함)
3. 이미지 블록에는 alt 텍스트만 포함하고 src는 비워두세요
4. 버튼은 실제 링크 대신 "#" 사용
5. 한국어로 작성하세요
6. 사용자가 요청한 내용에 정확히 맞춰 생성하세요`;

    // 사용 가능한 블록 및 숏코드 레퍼런스
    const availableBlocks = `
=== 사용 가능한 블록 (Gutenberg Blocks) ===

텍스트 블록:
- core/paragraph: 일반 단락 텍스트 {"type": "core/paragraph", "content": {"text": "내용"}}
- core/heading: 제목 (H1-H6) {"type": "core/heading", "content": {"text": "제목"}, "attributes": {"level": 1}}
- core/list: 리스트 (ordered/unordered) {"type": "core/list", "content": {"items": ["항목1", "항목2"]}, "attributes": {"ordered": false}}
- core/quote: 인용구 {"type": "core/quote", "content": {"text": "인용문", "citation": "출처"}}
- core/code: 코드 블록 {"type": "core/code", "content": {"code": "코드", "language": "javascript"}}

미디어 블록:
- core/image: 이미지 (src 없이 alt만) {"type": "core/image", "content": {"alt": "이미지 설명"}}
- core/video: 비디오 {"type": "core/video", "content": {"caption": "설명"}}
- core/gallery: 갤러리 {"type": "core/gallery", "content": {"images": []}}

디자인 블록:
- core/button: 버튼 {"type": "core/button", "content": {"text": "버튼", "url": "#"}, "attributes": {"variant": "primary"}}
- core/columns: 다단 레이아웃 {"type": "core/columns", "content": {"columns": []}}
- core/separator: 구분선 {"type": "core/separator"}

=== 사용 가능한 숏코드 (Shortcodes) ===

E-commerce:
- [product id="123"]: 단일 상품 표시
- [product_grid category="전자제품" limit="8"]: 상품 그리드
- [add_to_cart id="123"]: 장바구니 버튼
- [featured_products limit="4"]: 추천 상품

Forms:
- [form id="contact-form"]: 폼 삽입
- [view id="submissions"]: 데이터 뷰

Media:
- [video url="https://youtube.com/..."]: 비디오 임베드
- [gallery ids="1,2,3"]: 이미지 갤러리

Content:
- [recent_posts limit="5"]: 최근 게시물
- [author id="john"]: 작성자 정보

숏코드는 core/shortcode 블록으로 삽입:
{"type": "core/shortcode", "content": {"shortcode": "[product id=\\"123\\"]"}}
`;

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
      "type": "core/heading",
      "content": {"text": "제목"},
      "attributes": {"level": 1}
    },
    {
      "type": "core/paragraph", 
      "content": {"text": "내용"},
      "attributes": {}
    },
    {
      "type": "core/image",
      "content": {"alt": "이미지 설명"},
      "attributes": {}
    },
    {
      "type": "core/button",
      "content": {"text": "버튼 텍스트", "url": "#"},
      "attributes": {}
    }
  ]
}

중요: 이미지 src는 절대 포함하지 말고, alt 텍스트만 사용하세요. 외부 URL 사용 금지.`;
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