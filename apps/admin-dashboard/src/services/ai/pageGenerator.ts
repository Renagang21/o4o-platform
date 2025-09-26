import { v4 as uuidv4 } from 'uuid';

export interface Block {
  id: string;
  type: string;
  content?: any;
  attributes?: Record<string, any>;
  innerBlocks?: Block[];
}

export interface AIProvider {
  name: 'openai' | 'claude' | 'gemini';
  apiKey?: string;
  model?: string;
}

export interface PageTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  exampleBlocks?: Block[];
}

// 페이지 템플릿 정의
const PAGE_TEMPLATES: Record<string, PageTemplate> = {
  landing: {
    name: '랜딩 페이지',
    description: '제품이나 서비스를 소개하는 랜딩 페이지',
    systemPrompt: `당신은 WordPress Gutenberg 블록 형식으로 페이지를 생성하는 전문가입니다.
    랜딩 페이지를 생성할 때 다음 블록들을 사용하세요:
    - core/heading: 제목과 부제목
    - core/paragraph: 설명 텍스트
    - core/image: 이미지 (placeholder 사용)
    - core/columns: 다단 레이아웃
    - core/button: CTA 버튼
    - core/separator: 구분선
    
    JSON 형식으로 블록 배열을 반환하세요.`,
  },
  about: {
    name: '회사 소개',
    description: '회사나 팀을 소개하는 페이지',
    systemPrompt: `회사 소개 페이지를 생성합니다. 다음 구조를 따르세요:
    - 회사 비전과 미션
    - 핵심 가치
    - 팀 소개
    - 연혁
    - 연락처 정보`,
  },
  product: {
    name: '제품 소개',
    description: '제품의 특징과 장점을 설명하는 페이지',
    systemPrompt: `제품 소개 페이지를 생성합니다. 다음을 포함하세요:
    - 제품명과 설명
    - 주요 기능
    - 장점과 이점
    - 가격 정보
    - 고객 후기`,
  },
  blog: {
    name: '블로그 포스트',
    description: '블로그 형식의 글',
    systemPrompt: `블로그 포스트를 생성합니다. 다음 구조를 사용하세요:
    - 제목 (h1)
    - 소개 단락
    - 본문 섹션들 (h2, h3)
    - 이미지
    - 결론`,
  },
};

export class AIPageGenerator {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  /**
   * 프롬프트를 기반으로 페이지 블록을 생성합니다
   */
  async generateBlocks(
    prompt: string,
    template: keyof typeof PAGE_TEMPLATES = 'landing'
  ): Promise<Block[]> {
    const pageTemplate = PAGE_TEMPLATES[template];
    
    try {
      let blocks: Block[] = [];

      switch (this.provider.name) {
        case 'openai':
          blocks = await this.generateWithOpenAI(prompt, pageTemplate);
          break;
        case 'claude':
          blocks = await this.generateWithClaude(prompt, pageTemplate);
          break;
        case 'gemini':
          blocks = await this.generateWithGemini(prompt, pageTemplate);
          break;
        default:
          // 개발/테스트용 모의 생성
          blocks = this.generateMockBlocks(prompt, template);
      }

      // 블록 ID 생성 및 검증
      return this.validateAndNormalizeBlocks(blocks);
    } catch (error) {
      console.error('AI 페이지 생성 실패:', error);
      throw new Error('페이지 생성 중 오류가 발생했습니다');
    }
  }

  /**
   * OpenAI API를 사용한 블록 생성
   */
  private async generateWithOpenAI(
    prompt: string,
    template: PageTemplate
  ): Promise<Block[]> {
    if (!this.provider.apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다');
    }

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
            content: template.systemPrompt,
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
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API 오류');
    }

    try {
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI 응답 파싱 실패:', error);
      return this.generateMockBlocks(prompt, 'landing');
    }
  }

  /**
   * Claude API를 사용한 블록 생성
   */
  private async generateWithClaude(
    prompt: string,
    template: PageTemplate
  ): Promise<Block[]> {
    if (!this.provider.apiKey) {
      throw new Error('Claude API 키가 설정되지 않았습니다');
    }

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
            content: `${template.systemPrompt}
            
            다음 요구사항으로 페이지를 생성하세요: ${prompt}
            
            WordPress Gutenberg 블록 JSON 배열만 반환하세요.`,
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Claude API 오류');
    }

    try {
      const content = data.content[0].text;
      return JSON.parse(content);
    } catch (error) {
      console.error('Claude 응답 파싱 실패:', error);
      return this.generateMockBlocks(prompt, 'landing');
    }
  }

  /**
   * Gemini API를 사용한 블록 생성
   */
  private async generateWithGemini(
    prompt: string,
    template: PageTemplate
  ): Promise<Block[]> {
    if (!this.provider.apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.provider.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${template.systemPrompt}
                  
                  다음 요구사항으로 페이지를 생성하세요: ${prompt}
                  
                  WordPress Gutenberg 블록 JSON 배열만 반환하세요.`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API 오류');
    }

    try {
      const content = data.candidates[0].content.parts[0].text;
      return JSON.parse(content);
    } catch (error) {
      console.error('Gemini 응답 파싱 실패:', error);
      return this.generateMockBlocks(prompt, 'landing');
    }
  }

  /**
   * 개발/테스트용 모의 블록 생성
   */
  private generateMockBlocks(prompt: string, template: string): Block[] {
    const blocks: Block[] = [];

    // 제목 추가
    blocks.push({
      id: uuidv4(),
      type: 'core/heading',
      content: { text: prompt },
      attributes: { level: 1, textAlign: 'center' },
    });

    // 템플릿별 기본 구조
    switch (template) {
      case 'landing':
        blocks.push(
          {
            id: uuidv4(),
            type: 'core/paragraph',
            content: {
              text: '혁신적인 솔루션으로 여러분의 비즈니스를 한 단계 발전시키세요.',
            },
            attributes: { align: 'center', fontSize: 'large' },
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
                    content: { text: '빠른 성능' },
                    attributes: { level: 3 },
                  },
                  {
                    id: uuidv4(),
                    type: 'core/paragraph',
                    content: {
                      text: '최적화된 코드로 빠른 로딩 속도를 제공합니다.',
                    },
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
                    content: { text: '쉬운 사용' },
                    attributes: { level: 3 },
                  },
                  {
                    id: uuidv4(),
                    type: 'core/paragraph',
                    content: {
                      text: '직관적인 인터페이스로 누구나 쉽게 사용할 수 있습니다.',
                    },
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
                    content: { text: '24/7 지원' },
                    attributes: { level: 3 },
                  },
                  {
                    id: uuidv4(),
                    type: 'core/paragraph',
                    content: {
                      text: '언제든지 전문가의 도움을 받을 수 있습니다.',
                    },
                  },
                ],
              },
            ],
          },
          {
            id: uuidv4(),
            type: 'core/button',
            content: { text: '지금 시작하기' },
            attributes: {
              url: '#',
              backgroundColor: '#007cba',
              textColor: '#ffffff',
              align: 'center',
            },
          }
        );
        break;

      case 'about':
        blocks.push(
          {
            id: uuidv4(),
            type: 'core/heading',
            content: { text: '우리의 비전' },
            attributes: { level: 2 },
          },
          {
            id: uuidv4(),
            type: 'core/paragraph',
            content: {
              text: '우리는 기술을 통해 더 나은 세상을 만들어갑니다.',
            },
          },
          {
            id: uuidv4(),
            type: 'core/heading',
            content: { text: '핵심 가치' },
            attributes: { level: 2 },
          },
          {
            id: uuidv4(),
            type: 'core/list',
            content: {
              values: ['혁신', '협력', '신뢰', '고객 중심'],
            },
          }
        );
        break;

      case 'product':
        blocks.push(
          {
            id: uuidv4(),
            type: 'core/image',
            attributes: {
              url: '/images/product-placeholder.jpg',
              alt: '제품 이미지',
              align: 'center',
            },
          },
          {
            id: uuidv4(),
            type: 'core/heading',
            content: { text: '주요 기능' },
            attributes: { level: 2 },
          },
          {
            id: uuidv4(),
            type: 'core/list',
            content: {
              values: [
                '실시간 데이터 동기화',
                '강력한 보안 시스템',
                '직관적인 대시보드',
                '맞춤형 리포트',
              ],
            },
          }
        );
        break;

      case 'blog':
        blocks.push(
          {
            id: uuidv4(),
            type: 'core/paragraph',
            content: {
              text: '오늘은 흥미로운 주제에 대해 이야기해보겠습니다.',
            },
          },
          {
            id: uuidv4(),
            type: 'core/heading',
            content: { text: '서론' },
            attributes: { level: 2 },
          },
          {
            id: uuidv4(),
            type: 'core/paragraph',
            content: {
              text: '이 주제가 왜 중요한지 설명합니다...',
            },
          },
          {
            id: uuidv4(),
            type: 'core/heading',
            content: { text: '본론' },
            attributes: { level: 2 },
          },
          {
            id: uuidv4(),
            type: 'core/paragraph',
            content: {
              text: '핵심 내용을 자세히 다룹니다...',
            },
          },
          {
            id: uuidv4(),
            type: 'core/quote',
            content: {
              value: '인용문을 통해 신뢰성을 높입니다.',
              citation: '출처',
            },
          },
          {
            id: uuidv4(),
            type: 'core/heading',
            content: { text: '결론' },
            attributes: { level: 2 },
          },
          {
            id: uuidv4(),
            type: 'core/paragraph',
            content: {
              text: '오늘 다룬 내용을 정리하면...',
            },
          }
        );
        break;

      default:
        blocks.push({
          id: uuidv4(),
          type: 'core/paragraph',
          content: {
            text: 'AI가 생성한 콘텐츠가 여기에 표시됩니다.',
          },
        });
    }

    // 페이지 끝에 구분선 추가
    blocks.push({
      id: uuidv4(),
      type: 'core/separator',
      attributes: {},
    });

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
   * 프롬프트에서 템플릿 자동 추론
   */
  inferTemplate(prompt: string): keyof typeof PAGE_TEMPLATES {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('랜딩') || lowerPrompt.includes('landing')) {
      return 'landing';
    } else if (lowerPrompt.includes('회사') || lowerPrompt.includes('소개')) {
      return 'about';
    } else if (lowerPrompt.includes('제품') || lowerPrompt.includes('product')) {
      return 'product';
    } else if (lowerPrompt.includes('블로그') || lowerPrompt.includes('blog')) {
      return 'blog';
    }

    return 'landing';
  }

  /**
   * 사용 가능한 템플릿 목록 반환
   */
  getTemplates() {
    return Object.entries(PAGE_TEMPLATES).map(([key, template]) => ({
      key,
      name: template.name,
      description: template.description,
    }));
  }
}

export default AIPageGenerator;