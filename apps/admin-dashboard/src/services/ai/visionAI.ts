import { ImageAnalysis } from '@/components/ai/ImageUploader';

export interface VisionAIConfig {
  provider: 'openai' | 'gemini' | 'claude';
  apiKey: string;
  model?: string;
}

export interface VisionAIResult {
  description: string;
  objects: string[];
  colors: string[];
  mood: string;
  style: string;
  suggestions: string[];
  context?: string; // AI 생성에 활용할 컨텍스트
}

class VisionAIService {
  private config: VisionAIConfig | null = null;

  /**
   * Vision AI 설정
   */
  setConfig(config: VisionAIConfig) {
    this.config = config;
  }

  /**
   * 이미지를 Base64로 변환
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64, 부분 제거
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * OpenAI Vision API로 이미지 분석
   */
  private async analyzeWithOpenAI(imageBase64: string): Promise<VisionAIResult> {
    if (!this.config?.apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `이 이미지를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:
                {
                  "description": "이미지에 대한 상세한 설명 (한국어)",
                  "objects": ["감지된 주요 객체들"],
                  "colors": ["주요 색상들"],
                  "mood": "이미지의 분위기나 감정",
                  "style": "이미지의 스타일 (예: 현대적, 클래식, 미니멀 등)",
                  "suggestions": ["이 이미지가 웹사이트에서 어떻게 활용될 수 있는지 제안"],
                  "context": "AI 페이지 생성 시 활용할 수 있는 컨텍스트 정보"
                }`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI Vision API 오류');
    }

    try {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('JSON 파싱 실패');
    } catch (error) {
      throw new Error('OpenAI 응답 파싱 실패');
    }
  }

  /**
   * Gemini Vision API로 이미지 분석
   */
  private async analyzeWithGemini(imageBase64: string): Promise<VisionAIResult> {
    if (!this.config?.apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다');
    }

    const modelName = this.config.model || 'gemini-2.0-flash';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${this.config.apiKey}`,
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
                  text: `이 이미지를 분석하여 다음 JSON 형식으로 응답해주세요:
                  {
                    "description": "이미지에 대한 상세한 설명 (한국어)",
                    "objects": ["감지된 주요 객체들"],
                    "colors": ["주요 색상들"],
                    "mood": "이미지의 분위기나 감정",
                    "style": "이미지의 스타일",
                    "suggestions": ["웹사이트 활용 제안"],
                    "context": "AI 페이지 생성용 컨텍스트"
                  }`
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json'
          }
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini Vision API 오류');
    }

    try {
      const content = data.candidates[0].content.parts[0].text;
      return JSON.parse(content);
    } catch (error) {
      throw new Error('Gemini 응답 파싱 실패');
    }
  }

  /**
   * Claude Vision API로 이미지 분석
   */
  private async analyzeWithClaude(imageBase64: string): Promise<VisionAIResult> {
    if (!this.config?.apiKey) {
      throw new Error('Claude API 키가 설정되지 않았습니다');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `이 이미지를 분석하여 다음 JSON 형식으로 응답해주세요:
                {
                  "description": "이미지에 대한 상세한 설명 (한국어)",
                  "objects": ["감지된 주요 객체들"],
                  "colors": ["주요 색상들"],
                  "mood": "이미지의 분위기나 감정",
                  "style": "이미지의 스타일",
                  "suggestions": ["웹사이트 활용 제안"],
                  "context": "AI 페이지 생성용 컨텍스트"
                }`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Claude Vision API 오류');
    }

    try {
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('JSON 파싱 실패');
    } catch (error) {
      throw new Error('Claude 응답 파싱 실패');
    }
  }

  /**
   * 모의 분석 (개발/테스트용)
   */
  private async mockAnalyze(): Promise<VisionAIResult> {
    // 실제 분석을 시뮬레이션하기 위한 지연
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockResults = [
      {
        description: '현대적인 오피스 환경에서 노트북을 사용하는 전문직 여성',
        objects: ['노트북', '사람', '책상', '의자', '식물', '커피컵'],
        colors: ['파란색', '흰색', '회색', '녹색', '갈색'],
        mood: '집중적이고 전문적인 분위기',
        style: '깔끔하고 현대적인 비즈니스 스타일',
        suggestions: [
          '비즈니스 서비스 소개 페이지에 적합',
          '생산성 도구 마케팅에 활용',
          '기업 블로그의 메인 이미지로 사용',
          '원격근무 관련 콘텐츠에 활용'
        ],
        context: '전문적이고 현대적인 비즈니스 환경을 강조하는 콘텐츠. 생산성, 효율성, 혁신을 키워드로 하는 페이지에 적합.'
      },
      {
        description: '자연광이 들어오는 카페에서 독서하는 모습',
        objects: ['책', '사람', '테이블', '의자', '창문', '식물'],
        colors: ['따뜻한 베이지', '갈색', '녹색', '흰색'],
        mood: '편안하고 차분한 분위기',
        style: '자연스럽고 라이프스타일 지향적',
        suggestions: [
          '교육 서비스 마케팅에 활용',
          '독서 클럽이나 도서관 웹사이트에 적합',
          '라이프스타일 블로그의 헤더 이미지',
          '휴식과 여가 관련 콘텐츠에 사용'
        ],
        context: '학습과 성장, 여유로운 라이프스타일을 강조하는 콘텐츠. 교육, 독서, 자기계발을 주제로 하는 페이지에 적합.'
      },
      {
        description: '최신 기술 제품들이 배치된 미니멀한 작업공간',
        objects: ['스마트폰', '태블릿', '헤드폰', '키보드', '마우스'],
        colors: ['검은색', '흰색', '은색', '회색'],
        mood: '세련되고 혁신적인 분위기',
        style: '미니멀하고 테크놀로지 중심적',
        suggestions: [
          '기술 제품 소개 페이지에 최적',
          'IT 서비스 회사 홈페이지에 활용',
          '디지털 마케팅 콘텐츠에 사용',
          '혁신과 기술을 강조하는 브랜드에 적합'
        ],
        context: '최신 기술과 혁신을 강조하는 콘텐츠. IT, 디지털 전환, 스마트 솔루션을 주제로 하는 페이지에 적합.'
      }
    ];

    return mockResults[Math.floor(Math.random() * mockResults.length)];
  }

  /**
   * 이미지 분석 실행
   */
  async analyzeImage(file: File): Promise<VisionAIResult> {
    if (!this.config) {
      // 설정이 없으면 모의 분석 실행
      return this.mockAnalyze();
    }

    try {
      const imageBase64 = await this.fileToBase64(file);

      switch (this.config.provider) {
        case 'openai':
          return await this.analyzeWithOpenAI(imageBase64);
        case 'gemini':
          return await this.analyzeWithGemini(imageBase64);
        case 'claude':
          return await this.analyzeWithClaude(imageBase64);
        default:
          return await this.mockAnalyze();
      }
    } catch (error) {
      console.error('이미지 분석 오류:', error);
      // 실패 시 모의 분석으로 폴백
      return this.mockAnalyze();
    }
  }

  /**
   * 여러 이미지의 컨텍스트를 통합
   */
  combineImageContexts(analyses: VisionAIResult[]): string {
    if (analyses.length === 0) return '';

    const contexts = analyses
      .filter(analysis => analysis.context)
      .map(analysis => analysis.context);

    if (contexts.length === 0) return '';

    // 공통 키워드 추출
    const allObjects = analyses.flatMap(a => a.objects);
    const allColors = analyses.flatMap(a => a.colors);
    const allMoods = analyses.map(a => a.mood);
    const allStyles = analyses.map(a => a.style);

    const combinedContext = `
이미지 기반 컨텍스트:
- 주요 객체: ${[...new Set(allObjects)].join(', ')}
- 색상 팔레트: ${[...new Set(allColors)].join(', ')}
- 전체 분위기: ${[...new Set(allMoods)].join(', ')}
- 스타일: ${[...new Set(allStyles)].join(', ')}

세부 컨텍스트:
${contexts.join('\n')}

이 이미지들의 스타일과 분위기에 맞는 콘텐츠를 생성해주세요.
    `.trim();

    return combinedContext;
  }
}

// 싱글톤 인스턴스 내보내기
export const visionAI = new VisionAIService();