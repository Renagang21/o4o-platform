/**
 * AI Routine Builder Service
 *
 * AI 기반 루틴 자동 생성 엔진
 *
 * @package @o4o/partner-ai-builder
 */

// ========================================
// Types
// ========================================

export type AllowedIndustry = 'COSMETICS' | 'HEALTH' | 'GENERAL';

export interface ProductMetadata {
  productId: string;
  productName: string;
  productType: AllowedIndustry;
  ingredients?: string[];
  functions?: string[];
  usage?: string;
  category?: string;
  brandName?: string;
}

export interface RoutineStep {
  stepNumber: number;
  title: string;
  description: string;
  duration?: string;
  tips?: string;
  productId?: string;
}

export interface GeneratedRoutine {
  title: string;
  description: string;
  industry: AllowedIndustry;
  steps: RoutineStep[];
  recommendedProducts: string[];
  disclaimer: string;
  tags: string[];
  estimatedDuration?: string;
  generatedAt: Date;
}

export interface RoutineGenerationRequest {
  industry: AllowedIndustry;
  baseProducts: ProductMetadata[];
  routineGoal: string;
  targetAudience?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  preferredStepCount?: number;
}

export interface RoutineGenerationResult {
  success: boolean;
  routine?: GeneratedRoutine;
  error?: string;
}

// ========================================
// Configuration
// ========================================

export interface AiRoutineConfig {
  aiModel: string;
  maxTokens: number;
  temperature: number;
  routineStepsRange: { min: number; max: number };
  blockedIndustries: string[];
}

const DEFAULT_CONFIG: AiRoutineConfig = {
  aiModel: 'gpt-4o-mini',
  maxTokens: 2000,
  temperature: 0.7,
  routineStepsRange: { min: 3, max: 7 },
  blockedIndustries: ['PHARMACEUTICAL'],
};

// ========================================
// Industry Disclaimers
// ========================================

const INDUSTRY_DISCLAIMERS: Record<AllowedIndustry, string> = {
  COSMETICS: '본 루틴은 일반적인 스킨케어 가이드이며, 피부 상태에 따라 결과가 다를 수 있습니다. 알레르기 반응이 있는 경우 즉시 사용을 중단하세요.',
  HEALTH: '본 루틴은 일반적인 건강 관리 가이드이며, 의학적 조언을 대체하지 않습니다. 건강 문제가 있는 경우 전문 의료진과 상담하세요.',
  GENERAL: '본 루틴은 일반적인 가이드라인이며, 개인 상황에 따라 적절히 조정하여 사용하세요.',
};

// ========================================
// Service Class
// ========================================

export class AiRoutineBuilderService {
  private config: AiRoutineConfig;

  constructor(config: Partial<AiRoutineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 산업군 검증 - PHARMACEUTICAL 차단
   */
  validateIndustry(industry: string): { valid: boolean; error?: string } {
    if (this.config.blockedIndustries.includes(industry)) {
      return {
        valid: false,
        error: `${industry} 산업군은 AI 루틴 생성이 허용되지 않습니다. 의약품 관련 콘텐츠는 전문가의 검토가 필요합니다.`,
      };
    }
    if (!['COSMETICS', 'HEALTH', 'GENERAL'].includes(industry)) {
      return {
        valid: false,
        error: `지원되지 않는 산업군입니다: ${industry}`,
      };
    }
    return { valid: true };
  }

  /**
   * 제품 목록에서 PHARMACEUTICAL 제품 필터링
   */
  filterBlockedProducts(products: ProductMetadata[]): ProductMetadata[] {
    return products.filter(
      (p) => !this.config.blockedIndustries.includes(p.productType)
    );
  }

  /**
   * AI 프롬프트 생성
   */
  private buildPrompt(request: RoutineGenerationRequest): string {
    const { industry, baseProducts, routineGoal, targetAudience, difficulty, preferredStepCount } = request;
    const stepCount = preferredStepCount || 5;

    const productList = baseProducts
      .map((p) => `- ${p.productName} (${p.category || '일반'}): ${p.usage || '기본 사용'}`)
      .join('\n');

    return `당신은 ${industry === 'COSMETICS' ? '뷰티/스킨케어' : industry === 'HEALTH' ? '건강/웰니스' : '라이프스타일'} 전문가입니다.

다음 제품들을 활용한 ${routineGoal} 루틴을 생성해주세요.

제품 목록:
${productList}

요구사항:
- 대상: ${targetAudience || '일반 사용자'}
- 난이도: ${difficulty || 'intermediate'}
- 단계 수: ${stepCount}개 (${this.config.routineStepsRange.min}-${this.config.routineStepsRange.max}개 범위)

다음 JSON 형식으로 응답해주세요:
{
  "title": "루틴 제목",
  "description": "루틴 설명 (2-3문장)",
  "steps": [
    {
      "stepNumber": 1,
      "title": "단계 제목",
      "description": "상세 설명",
      "duration": "소요 시간 (예: 2분)",
      "tips": "팁 (선택)",
      "productId": "관련 제품 ID (선택)"
    }
  ],
  "tags": ["관련", "태그", "목록"],
  "estimatedDuration": "전체 소요 시간"
}

주의사항:
- 각 단계는 구체적이고 실행 가능해야 합니다
- 제품의 실제 용도에 맞게 사용해주세요
- 의학적 주장이나 치료 효과 언급은 피해주세요`;
  }

  /**
   * AI 응답 파싱
   */
  private parseAiResponse(
    response: string,
    request: RoutineGenerationRequest
  ): GeneratedRoutine | null {
    try {
      // JSON 블록 추출
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        title: parsed.title || `${request.routineGoal} 루틴`,
        description: parsed.description || '',
        industry: request.industry,
        steps: (parsed.steps || []).map((step: any, index: number) => ({
          stepNumber: step.stepNumber || index + 1,
          title: step.title || `Step ${index + 1}`,
          description: step.description || '',
          duration: step.duration,
          tips: step.tips,
          productId: step.productId,
        })),
        recommendedProducts: request.baseProducts.map((p) => p.productId),
        disclaimer: INDUSTRY_DISCLAIMERS[request.industry],
        tags: parsed.tags || [],
        estimatedDuration: parsed.estimatedDuration,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('[AiRoutineBuilder] Failed to parse AI response:', error);
      return null;
    }
  }

  /**
   * 루틴 생성 (메인 메서드)
   */
  async generateRoutine(
    request: RoutineGenerationRequest
  ): Promise<RoutineGenerationResult> {
    // 1. 산업군 검증
    const industryValidation = this.validateIndustry(request.industry);
    if (!industryValidation.valid) {
      return { success: false, error: industryValidation.error };
    }

    // 2. 차단된 제품 필터링
    const filteredProducts = this.filterBlockedProducts(request.baseProducts);
    if (filteredProducts.length === 0) {
      return {
        success: false,
        error: '유효한 제품이 없습니다. PHARMACEUTICAL 제품은 AI 루틴 생성에 사용할 수 없습니다.',
      };
    }

    // 3. 프롬프트 생성
    const prompt = this.buildPrompt({
      ...request,
      baseProducts: filteredProducts,
    });

    // 4. AI 호출 (Mock - 실제 구현에서는 OpenAI API 사용)
    const aiResponse = await this.callAiApi(prompt);

    // 5. 응답 파싱
    const routine = this.parseAiResponse(aiResponse, {
      ...request,
      baseProducts: filteredProducts,
    });

    if (!routine) {
      return { success: false, error: 'AI 응답 파싱에 실패했습니다.' };
    }

    // 6. 단계 수 검증
    if (
      routine.steps.length < this.config.routineStepsRange.min ||
      routine.steps.length > this.config.routineStepsRange.max
    ) {
      console.warn(
        `[AiRoutineBuilder] Step count ${routine.steps.length} outside range ${this.config.routineStepsRange.min}-${this.config.routineStepsRange.max}`
      );
    }

    return { success: true, routine };
  }

  /**
   * AI API 호출 (Mock 구현)
   * 실제 구현에서는 OpenAI API 사용
   */
  private async callAiApi(prompt: string): Promise<string> {
    // Mock response for development
    // In production, this would call OpenAI API
    console.log('[AiRoutineBuilder] Calling AI API with prompt length:', prompt.length);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return mock response
    return JSON.stringify({
      title: '데일리 스킨케어 루틴',
      description: '건강하고 빛나는 피부를 위한 기본 스킨케어 루틴입니다. 아침과 저녁 모두 적용할 수 있습니다.',
      steps: [
        {
          stepNumber: 1,
          title: '클렌징',
          description: '미지근한 물로 얼굴을 적신 후 클렌저를 부드럽게 마사지하며 세안합니다.',
          duration: '2분',
          tips: '너무 뜨거운 물은 피부를 건조하게 할 수 있습니다.',
        },
        {
          stepNumber: 2,
          title: '토너',
          description: '화장솜에 토너를 적셔 얼굴 전체를 부드럽게 닦아줍니다.',
          duration: '1분',
          tips: '손바닥으로 두드려 흡수시켜도 좋습니다.',
        },
        {
          stepNumber: 3,
          title: '세럼/에센스',
          description: '적당량을 손바닥에 덜어 얼굴에 펴 바른 후 가볍게 두드려 흡수시킵니다.',
          duration: '2분',
        },
        {
          stepNumber: 4,
          title: '보습',
          description: '크림이나 로션을 얼굴 전체에 골고루 펴 바릅니다.',
          duration: '1분',
        },
        {
          stepNumber: 5,
          title: '자외선 차단',
          description: '낮 시간에는 자외선 차단제를 마지막 단계로 바릅니다.',
          duration: '1분',
          tips: '실내에서도 자외선 차단이 필요합니다.',
        },
      ],
      tags: ['스킨케어', '데일리', '기초', '보습'],
      estimatedDuration: '7-10분',
    });
  }

  /**
   * 루틴 개선 제안 생성
   */
  async suggestImprovements(
    existingRoutine: GeneratedRoutine,
    feedback?: string
  ): Promise<{
    suggestions: string[];
    alternativeSteps?: RoutineStep[];
  }> {
    // Mock implementation
    return {
      suggestions: [
        '세럼 단계 전에 토너 에센스를 추가하면 흡수력이 높아집니다.',
        '주 2-3회 각질 제거 단계를 추가해보세요.',
        '저녁 루틴에는 나이트 크림으로 대체하면 좋습니다.',
      ],
    };
  }
}

export default AiRoutineBuilderService;
