import { v4 as uuidv4 } from 'uuid';
import { shortcodeIntegrator } from './shortcodeIntegrator';
import { blockGuideLoader } from './blockGuideLoader';
import { visionAI, VisionAIResult } from './visionAI';

export interface Block {
  id: string;
  type: string;
  content?: any;
  attributes?: Record<string, any>;
  innerBlocks?: Block[];
}

export interface AIProvider {
  name: 'openai' | 'claude' | 'gemini' | 'mock';
  apiKey?: string;
  model?: string;
}

// 2025년 최신 Gemini 모델 목록
export const GEMINI_MODELS = {
  'gemini-1.5-flash': 'Gemini 1.5 Flash (2025년 9월 종료 예정)',
  'gemini-1.5-pro': 'Gemini 1.5 Pro (2025년 9월 종료 예정)', 
  'gemini-2.0-flash': 'Gemini 2.0 Flash (최신 멀티모달)',
  'gemini-2.5-flash': 'Gemini 2.5 Flash (안정 버전)',
  'gemini-2.5-pro': 'Gemini 2.5 Pro (최강력 모델)',
} as const;

// OpenAI 모델 목록
export const OPENAI_MODELS = {
  'gpt-4': 'GPT-4',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
} as const;

// Claude 모델 목록  
export const CLAUDE_MODELS = {
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
} as const;


// 진행률 콜백 타입
export interface ProgressCallback {
  (progress: number, message: string): void;
}

// 생성 옵션 타입
export interface GenerateOptions {
  prompt: string;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  useShortcodes?: boolean; // shortcode 사용 여부
  shortcodeCategories?: string[]; // 포함할 shortcode 카테고리
  imageAnalyses?: VisionAIResult[]; // 업로드된 이미지의 Vision AI 분석 결과
}


export class AIPageGenerator {
  private provider: AIProvider;
  private abortController?: AbortController;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  /**
   * 동적 시스템 프롬프트 생성 (자유형)
   */
  private async buildDynamicSystemPrompt(): Promise<string> {
    try {
      // 블록 가이드 로드
      const blockGuide = await blockGuideLoader.getAIPrompt();
      
      // 완전한 시스템 프롬프트 생성 (템플릿 제약 없음)
      return `당신은 WordPress Gutenberg 블록 형식으로 페이지를 생성하는 전문가입니다.

${blockGuide}

페이지 생성 원칙:
- 사용자의 요청을 정확히 분석하여 가장 적합한 구조와 블록을 선택하세요
- 창의적이고 독창적인 레이아웃을 구성하세요
- 콘텐츠의 목적과 맥락에 맞는 블록을 자유롭게 조합하세요
- 사용자가 명시적으로 요청하지 않은 구조는 강요하지 마세요

응답 형식:
- 반드시 JSON 배열 형식으로만 응답하세요
- 각 블록은 {"type": "", "content": {}, "attributes": {}} 형식
- 설명이나 추가 텍스트는 포함하지 마세요`;
      
    } catch (error) {
      console.error('동적 프롬프트 생성 실패:', error);
      
      // Fallback: 기본 프롬프트 사용
      return this.getFallbackPrompt();
    }
  }


  /**
   * Fallback 프롬프트 (블록 가이드 로드 실패 시)
   */
  private getFallbackPrompt(): string {
    return `당신은 WordPress Gutenberg 블록 전문가입니다.

기본 블록 사용법:
- core/heading: 제목 (level 1-6)
- core/paragraph: 본문 텍스트
- core/image: 이미지 (alt만, src 없음)
- core/button: 버튼 (url="#")
- core/columns: 다단 레이아웃
- enhanced/gallery: 갤러리/슬라이더
- core/separator: 구분선

중요: 슬라이드 요청 시 enhanced/gallery 사용, core/image 반복 금지

사용자의 요청을 자유롭게 해석하여 가장 적합한 블록 구조를 생성하세요.

JSON 배열 형식으로만 응답하세요.`;
  }

  /**
   * 프롬프트를 기반으로 페이지 블록을 생성합니다 (개선된 버전)
   */
  async generateBlocks(options: GenerateOptions): Promise<Block[]> {
    const { 
      prompt, 
      onProgress, 
      signal, 
      useShortcodes = true, 
      shortcodeCategories,
      imageAnalyses = []
    } = options;
    
    // 진행률 업데이트 헬퍼
    const updateProgress = (progress: number, message: string) => {
      if (onProgress) {
        onProgress(progress, message);
      }
    };

    try {
      // 0단계: Shortcode 정보 로드 (5%)
      updateProgress(0, 'Shortcode 정보를 로드 중...');
      let enhancedPrompt = prompt;
      
      if (useShortcodes) {
        try {
          enhancedPrompt = await shortcodeIntegrator.buildEnhancedAIPrompt(prompt, {
            includeCategories: shortcodeCategories,
            maxShortcodes: 20,
            includeExamples: true,
            includeUsageHints: true
          });
          updateProgress(5, 'Shortcode 정보가 로드되었습니다');
        } catch (error) {
          updateProgress(5, '기본 프롬프트로 진행합니다');
        }
      }

      // 0.5단계: 이미지 컨텍스트 통합 (3%)
      if (imageAnalyses.length > 0) {
        updateProgress(6, '이미지 컨텍스트를 통합 중...');
        const imageContext = visionAI.combineImageContexts(imageAnalyses);
        if (imageContext.trim()) {
          enhancedPrompt = `${enhancedPrompt}

${imageContext}`;
          updateProgress(8, `${imageAnalyses.length}개 이미지의 컨텍스트가 통합되었습니다`);
        }
      }

      // 1단계: AI 모델 연결 (15%)
      updateProgress(10, 'AI 모델에 연결 중...');
      
      // AbortSignal 체크
      if (signal?.aborted) {
        throw new Error('생성이 취소되었습니다');
      }

      let blocks: Block[] = [];

      // 2단계: 프롬프트 처리 (40%)
      updateProgress(20, '프롬프트를 처리하고 있습니다...');
      
      switch (this.provider.name) {
        case 'openai':
          blocks = await this.generateWithOpenAI(enhancedPrompt, updateProgress, signal);
          break;
        case 'claude':
          blocks = await this.generateWithClaude(enhancedPrompt, updateProgress, signal);
          break;
        case 'gemini':
          blocks = await this.generateWithGemini(enhancedPrompt, updateProgress, signal);
          break;
        default:
          // 테스트/개발용 모의 생성
          updateProgress(30, '테스트 데이터를 생성 중...');
          blocks = await this.generateMockBlocks(enhancedPrompt, updateProgress);
      }

      // 3단계: 블록 검증 및 정규화 (30%)
      updateProgress(70, '생성된 블록을 검증하고 있습니다...');
      blocks = this.validateAndNormalizeBlocks(blocks);

      // 4단계: 완료 (10%)
      updateProgress(90, '페이지 생성을 완료하고 있습니다...');
      
      // 완료
      updateProgress(100, '페이지가 성공적으로 생성되었습니다!');
      
      return blocks;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === '생성이 취소되었습니다') {
        throw new Error('생성이 취소되었습니다');
      }
      // Error logged internally
      throw new Error(error.message || '페이지 생성 중 오류가 발생했습니다');
    }
  }

  /**
   * 이전 버전과의 호환성을 위한 래퍼 메서드
   */
  async generateBlocksLegacy(
    prompt: string
  ): Promise<Block[]> {
    return this.generateBlocks({ prompt });
  }

  /**
   * OpenAI API를 사용한 블록 생성
   */
  private async generateWithOpenAI(
    prompt: string,
    updateProgress: (progress: number, message: string) => void,
    signal?: AbortSignal
  ): Promise<Block[]> {
    if (!this.provider.apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다');
    }

    updateProgress(30, 'OpenAI GPT-4에 요청을 전송 중...');
    
    // 동적 프롬프트 생성 (템플릿 제약 없음)
    const systemPrompt = await this.buildDynamicSystemPrompt();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: this.provider.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `다음 요구사항으로 페이지를 생성하세요: ${prompt}
            
            JSON 배열 형식으로 WordPress 블록들을 반환하세요.
            예시:
            [
              {
                "type": "core/heading",
                "content": { "text": "제목" },
                "attributes": { "level": 1 }
              }
            ]`,
          },
        ],
        temperature: 0.7,
      }),
      signal,
    });

    updateProgress(50, 'AI 응답을 처리하고 있습니다...');

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API 오류');
    }

    updateProgress(60, '블록 데이터를 파싱하고 있습니다...');

    try {
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      // Fallback to mock blocks
      return this.generateMockBlocks(prompt, updateProgress);
    }
  }

  /**
   * Claude API를 사용한 블록 생성
   */
  private async generateWithClaude(
    prompt: string,
    updateProgress: (progress: number, message: string) => void,
    signal?: AbortSignal
  ): Promise<Block[]> {
    if (!this.provider.apiKey) {
      throw new Error('Claude API 키가 설정되지 않았습니다');
    }

    updateProgress(30, 'Claude AI에 요청을 전송 중...');
    
    // 동적 프롬프트 생성 (템플릿 제약 없음)
    const systemPrompt = await this.buildDynamicSystemPrompt();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.provider.model || 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}
            
            다음 요구사항으로 페이지를 생성하세요: ${prompt}
            
            WordPress Gutenberg 블록 JSON 배열만 반환하세요.`,
          },
        ],
      }),
      signal,
    });

    updateProgress(50, 'Claude 응답을 처리하고 있습니다...');

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Claude API 오류');
    }

    updateProgress(60, '블록 데이터를 파싱하고 있습니다...');

    try {
      const content = data.content[0].text;
      return JSON.parse(content);
    } catch (error) {
      // Fallback to mock blocks
      return this.generateMockBlocks(prompt, updateProgress);
    }
  }

  /**
   * Gemini API를 사용한 블록 생성 (2025년 최신 버전)
   */
  private async generateWithGemini(
    prompt: string,
    updateProgress: (progress: number, message: string) => void,
    signal?: AbortSignal
  ): Promise<Block[]> {
    if (!this.provider.apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다. Google AI Studio에서 API 키를 발급받으세요.');
    }

    // 기본 모델 설정 - 2025년 권장 모델 사용
    let modelName = this.provider.model || 'gemini-2.5-flash';
    
    // 구 모델명을 신 모델명으로 자동 변환
    if (modelName === 'gemini-pro') {
      // gemini-pro 모델은 더 이상 지원되지 않습니다. gemini-2.5-flash로 변경합니다.
      modelName = 'gemini-2.5-flash';
    }
    
    // 1.5 모델 경고 (2025년 9월 종료 예정)
    if (modelName.includes('1.5')) {
      // ${modelName}는 2025년 9월에 종료됩니다. gemini-2.5 모델로 마이그레이션을 권장합니다.
    }

    updateProgress(30, `Google Gemini ${modelName}에 요청을 전송 중...`);

    // API 버전 결정 - 2.5 모델은 v1 사용, 나머지는 v1beta
    const apiVersion = modelName.includes('2.5') ? 'v1' : 'v1beta';
    
    // 동적 프롬프트 생성 (템플릿 제약 없음)
    const dynamicSystemPrompt = await this.buildDynamicSystemPrompt();
    
    const systemInstruction = `${dynamicSystemPrompt}
    
중요: 반드시 유효한 JSON 배열 형식으로만 응답하세요.
각 블록은 다음 구조를 가져야 합니다:
{
  "type": "블록 타입 (예: core/heading)",
  "content": { "text": "내용" },
  "attributes": { "level": 1 }
}`;

    const userPrompt = `다음 요구사항으로 WordPress Gutenberg 페이지를 생성하세요: ${prompt}

JSON 배열 형식으로만 응답하세요. 다른 설명이나 텍스트는 포함하지 마세요.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${this.provider.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: systemInstruction + '\n\n' + userPrompt
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    type: { type: 'STRING' },
                    content: { 
                      type: 'OBJECT',
                      properties: {
                        text: { type: 'STRING' }
                      }
                    },
                    attributes: { 
                      type: 'OBJECT',
                      properties: {}
                    }
                  }
                }
              }
            },
          }),
          signal,
        }
      );

      updateProgress(50, 'Gemini 응답을 처리하고 있습니다...');

      const data = await response.json();
      
      if (!response.ok) {
        // Gemini API Error
        
        // 모델이 없는 경우 대체 모델 사용
        if (data.error?.message?.includes('is not found')) {
          // ${modelName} 모델을 찾을 수 없습니다. 기본 모델로 재시도합니다.
          this.provider.model = 'gemini-2.5-flash';
          return this.generateWithGemini(prompt, updateProgress, signal);
        }
        
        throw new Error(data.error?.message || `Gemini API 오류: ${response.status}`);
      }

      updateProgress(60, '블록 데이터를 파싱하고 있습니다...');

      try {
        // 응답 구조 확인 및 파싱
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error('Gemini 응답에 콘텐츠가 없습니다');
        }
        
        // JSON 파싱 시도
        let blocks;
        try {
          blocks = JSON.parse(content);
        } catch (parseError) {
          // JSON이 아닌 경우 코드 블록 제거 후 재시도
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            blocks = JSON.parse(jsonMatch[1]);
          } else {
            blocks = JSON.parse(content);
          }
        }
        
        if (!Array.isArray(blocks)) {
          throw new Error('응답이 배열 형식이 아닙니다');
        }
        
        return blocks;
      } catch (error) {
        // Gemini 응답 파싱 실패
        // Fallback to mock blocks
        updateProgress(60, '기본 템플릿을 사용합니다...');
        return this.generateMockBlocks(prompt, updateProgress);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      // Gemini API 호출 실패
      throw new Error(`Gemini API 오류: ${error.message}`);
    }
  }

  /**
   * 개발/테스트용 모의 블록 생성
   */
  private async generateMockBlocks(
    prompt: string,
    updateProgress?: (progress: number, message: string) => void
  ): Promise<Block[]> {
    // 모의 지연을 추가하여 실제 API 호출처럼 보이게 함
    if (updateProgress) {
      updateProgress(40, '템플릿을 준비하고 있습니다...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (updateProgress) {
      updateProgress(50, '콘텐츠를 생성하고 있습니다...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const blocks: Block[] = [];

    // 제목 추가
    blocks.push({
      id: uuidv4(),
      type: 'core/heading',
      content: { text: prompt },
      attributes: { level: 1, textAlign: 'center' },
    });

    if (updateProgress) {
      updateProgress(60, '블록을 구성하고 있습니다...');
    }

    // 간단한 블록 구조만 생성 (배치 중심, 내용 최소화)
    blocks.push(
      {
        id: uuidv4(),
        type: 'core/paragraph',
        content: { text: '' }, // 빈 내용
        attributes: { placeholder: '여기에 설명을 입력하세요' },
      },
      {
        id: uuidv4(),
        type: 'core/columns',
        innerBlocks: [
          {
            id: uuidv4(),
            type: 'core/column',
            innerBlocks: [
              {
                id: uuidv4(),
                type: 'core/heading',
                content: { text: '' },
                attributes: { level: 3, placeholder: '제목 입력' },
              },
              {
                id: uuidv4(),
                type: 'core/paragraph',
                content: { text: '' },
                attributes: { placeholder: '내용 입력' },
              },
            ],
          },
          {
            id: uuidv4(),
            type: 'core/column',
            innerBlocks: [
              {
                id: uuidv4(),
                type: 'core/heading',
                content: { text: '' },
                attributes: { level: 3, placeholder: '제목 입력' },
              },
              {
                id: uuidv4(),
                type: 'core/paragraph',
                content: { text: '' },
                attributes: { placeholder: '내용 입력' },
              },
            ],
          },
        ],
      },
      {
        id: uuidv4(),
        type: 'core/button',
        content: { text: '' },
        attributes: {
          url: '#',
          placeholder: '버튼 텍스트 입력',
          align: 'center',
        },
      }
    );

    return blocks;
  }

  /**
   * 블록 검증 및 정규화
   */
  private validateAndNormalizeBlocks(blocks: Block[]): Block[] {
    return blocks.map((block) => {
      // ID가 없으면 생성
      if (!block.id) {
        block.id = uuidv4();
      }

      // type이 없으면 기본값 설정
      if (!block.type) {
        block.type = 'core/paragraph';
      }

      // innerBlocks 재귀 처리
      if (block.innerBlocks && Array.isArray(block.innerBlocks)) {
        block.innerBlocks = this.validateAndNormalizeBlocks(block.innerBlocks);
      }

      return block;
    });
  }



  /**
   * 생성 취소
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

export default AIPageGenerator;