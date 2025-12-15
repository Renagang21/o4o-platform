/**
 * AI Routine Generator Service
 *
 * Phase 6-F: Influencer Tools Expansion
 * - 피부타입/피부고민 기반 자동 루틴 생성
 * - Product metadata 기반 추천
 * - Text + Structure hybrid 형태 결과 출력
 */

import { Repository, DataSource, In } from 'typeorm';

// Types for AI Routine Generation
export interface GenerateRoutineDto {
  skinTypes: string[];
  concerns: string[];
  budget?: 'low' | 'medium' | 'high' | 'premium';
  preferredBrands?: string[];
  routineType?: 'morning' | 'evening' | 'weekly' | 'special';
  stepCount?: number;
}

export interface AIRoutineStep {
  order: number;
  category: string;
  productName: string;
  productId?: string;
  description: string;
  duration?: string;
  tips?: string;
}

export interface GeneratedRoutine {
  title: string;
  description: string;
  routineType: 'morning' | 'evening' | 'weekly' | 'special';
  skinTypes: string[];
  concerns: string[];
  steps: AIRoutineStep[];
  reasoning: string;
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Skincare step categories and their order
const SKINCARE_CATEGORIES = {
  morning: [
    { category: 'cleanser', name: '세안', order: 1 },
    { category: 'toner', name: '토너', order: 2 },
    { category: 'essence', name: '에센스', order: 3 },
    { category: 'serum', name: '세럼', order: 4 },
    { category: 'moisturizer', name: '보습제', order: 5 },
    { category: 'sunscreen', name: '선크림', order: 6 },
  ],
  evening: [
    { category: 'makeup_remover', name: '메이크업 리무버', order: 1 },
    { category: 'cleanser', name: '클렌저', order: 2 },
    { category: 'toner', name: '토너', order: 3 },
    { category: 'essence', name: '에센스', order: 4 },
    { category: 'serum', name: '세럼', order: 5 },
    { category: 'eye_cream', name: '아이크림', order: 6 },
    { category: 'moisturizer', name: '보습제', order: 7 },
    { category: 'sleeping_mask', name: '수면팩', order: 8 },
  ],
  weekly: [
    { category: 'exfoliator', name: '각질 제거', order: 1 },
    { category: 'mask', name: '마스크팩', order: 2 },
    { category: 'ampoule', name: '앰플', order: 3 },
    { category: 'special_care', name: '스페셜 케어', order: 4 },
  ],
  special: [
    { category: 'treatment', name: '트리트먼트', order: 1 },
    { category: 'intensive_serum', name: '집중 세럼', order: 2 },
    { category: 'mask', name: '마스크', order: 3 },
    { category: 'recovery', name: '리커버리', order: 4 },
  ],
};

// Concern-based product recommendations
const CONCERN_PRODUCTS: Record<string, { categories: string[]; ingredients: string[] }> = {
  주름: {
    categories: ['serum', 'eye_cream', 'ampoule'],
    ingredients: ['레티놀', '펩타이드', '콜라겐', '아데노신'],
  },
  색소침착: {
    categories: ['serum', 'essence', 'ampoule'],
    ingredients: ['비타민C', '나이아신아마이드', '알부틴', '감초추출물'],
  },
  모공: {
    categories: ['toner', 'serum', 'mask'],
    ingredients: ['BHA', '살리실산', '티트리', '녹차'],
  },
  여드름: {
    categories: ['cleanser', 'toner', 'serum'],
    ingredients: ['살리실산', 'BHA', '티트리', '센텔라'],
  },
  건조: {
    categories: ['essence', 'moisturizer', 'sleeping_mask'],
    ingredients: ['히알루론산', '세라마이드', '스쿠알란', '시어버터'],
  },
  유수분불균형: {
    categories: ['toner', 'essence', 'moisturizer'],
    ingredients: ['나이아신아마이드', '히알루론산', '판테놀', '알로에'],
  },
};

// Skin type specific adjustments
const SKIN_TYPE_TIPS: Record<string, string> = {
  건성: '유분기 있는 제품 선택, 클렌징 시 마찰 최소화',
  지성: '가벼운 제형 선택, 이중 세안 권장',
  복합성: 'T존과 U존 분리 케어, 부분별 다른 제품 사용',
  민감성: '무향료/저자극 제품 선택, 패치 테스트 필수',
  중성: '균형 잡힌 제품 사용, 계절별 조절',
};

export class AIRoutineService {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate AI-powered skincare routine
   */
  async generateRoutine(dto: GenerateRoutineDto): Promise<GeneratedRoutine> {
    const {
      skinTypes,
      concerns,
      budget = 'medium',
      preferredBrands = [],
      routineType = 'morning',
      stepCount,
    } = dto;

    // Get base steps for routine type
    const baseSteps = SKINCARE_CATEGORIES[routineType];

    // Filter and customize steps based on concerns
    const customizedSteps = this.customizeStepsForConcerns(
      baseSteps,
      concerns,
      skinTypes,
      stepCount
    );

    // Generate routine title
    const title = this.generateTitle(routineType, concerns, skinTypes);

    // Generate description
    const description = this.generateDescription(routineType, concerns, skinTypes);

    // Generate reasoning
    const reasoning = this.generateReasoning(concerns, skinTypes, customizedSteps);

    // Calculate estimated time
    const estimatedTime = this.calculateEstimatedTime(customizedSteps.length, routineType);

    // Determine difficulty
    const difficulty = this.determineDifficulty(customizedSteps.length, concerns.length);

    return {
      title,
      description,
      routineType,
      skinTypes,
      concerns,
      steps: customizedSteps,
      reasoning,
      estimatedTime,
      difficulty,
    };
  }

  /**
   * Customize steps based on skin concerns
   */
  private customizeStepsForConcerns(
    baseSteps: { category: string; name: string; order: number }[],
    concerns: string[],
    skinTypes: string[],
    maxSteps?: number
  ): AIRoutineStep[] {
    const steps: AIRoutineStep[] = [];

    // Determine which categories are priority based on concerns
    const priorityCategories = new Set<string>();
    concerns.forEach((concern) => {
      const config = CONCERN_PRODUCTS[concern];
      if (config) {
        config.categories.forEach((cat) => priorityCategories.add(cat));
      }
    });

    // Build steps
    baseSteps.forEach((baseStep, index) => {
      const isPriority = priorityCategories.has(baseStep.category);

      // Get recommended ingredients for this step
      const recommendedIngredients: string[] = [];
      concerns.forEach((concern) => {
        const config = CONCERN_PRODUCTS[concern];
        if (config && config.categories.includes(baseStep.category)) {
          recommendedIngredients.push(...config.ingredients);
        }
      });

      // Generate product recommendation
      const productName = this.generateProductName(
        baseStep.category,
        baseStep.name,
        [...new Set(recommendedIngredients)].slice(0, 2)
      );

      // Generate description with tips
      const description = this.generateStepDescription(
        baseStep.category,
        skinTypes,
        concerns
      );

      // Generate tips
      const tips = this.generateStepTips(baseStep.category, skinTypes, isPriority);

      steps.push({
        order: index + 1,
        category: baseStep.category,
        productName,
        description,
        duration: this.getStepDuration(baseStep.category),
        tips,
      });
    });

    // Limit steps if specified
    if (maxSteps && steps.length > maxSteps) {
      return steps.slice(0, maxSteps);
    }

    return steps;
  }

  /**
   * Generate product name with ingredients
   */
  private generateProductName(
    category: string,
    baseName: string,
    ingredients: string[]
  ): string {
    if (ingredients.length === 0) {
      return baseName;
    }
    return `${ingredients.join(' + ')} ${baseName}`;
  }

  /**
   * Generate step description
   */
  private generateStepDescription(
    category: string,
    skinTypes: string[],
    concerns: string[]
  ): string {
    const descriptions: Record<string, string> = {
      cleanser: '피부 노폐물과 잔여물을 깨끗이 제거합니다.',
      makeup_remover: '메이크업과 선크림을 부드럽게 녹여 제거합니다.',
      toner: '피부 pH 밸런스를 맞추고 다음 단계 흡수를 돕습니다.',
      essence: '피부에 깊은 수분과 영양을 공급합니다.',
      serum: '집중 케어 성분을 피부 깊숙이 전달합니다.',
      eye_cream: '민감한 눈가 피부를 보호하고 탄력을 부여합니다.',
      moisturizer: '수분을 가두고 피부 장벽을 강화합니다.',
      sunscreen: '자외선으로부터 피부를 보호합니다.',
      sleeping_mask: '밤새 영양을 공급하고 피부 재생을 돕습니다.',
      exfoliator: '묵은 각질을 제거하여 피부결을 정돈합니다.',
      mask: '집중적인 영양과 수분을 공급합니다.',
      ampoule: '고농축 성분으로 피부 컨디션을 끌어올립니다.',
      special_care: '특별한 피부 고민에 맞춤 케어를 제공합니다.',
      treatment: '피부 문제에 집중 케어를 제공합니다.',
      intensive_serum: '고농축 성분으로 집중 케어합니다.',
      recovery: '피부 진정과 회복을 돕습니다.',
    };

    return descriptions[category] || '피부 케어를 진행합니다.';
  }

  /**
   * Generate step tips
   */
  private generateStepTips(
    category: string,
    skinTypes: string[],
    isPriority: boolean
  ): string {
    const baseTips: Record<string, string> = {
      cleanser: '미온수로 충분히 거품을 내어 마사지하듯 세안하세요.',
      toner: '화장솜보다 손으로 부드럽게 패팅하는 것을 권장합니다.',
      serum: '손바닥으로 따뜻하게 데운 후 눌러 흡수시키세요.',
      moisturizer: '마사지하듯 펴 바른 후 손으로 감싸 흡수시키세요.',
      sunscreen: '외출 30분 전 충분한 양을 도포하세요.',
    };

    let tip = baseTips[category] || '';

    // Add skin type specific tips
    skinTypes.forEach((type) => {
      if (SKIN_TYPE_TIPS[type]) {
        tip += ` (${type} 피부: ${SKIN_TYPE_TIPS[type]})`;
      }
    });

    if (isPriority) {
      tip += ' ★ 핵심 단계';
    }

    return tip;
  }

  /**
   * Get estimated duration for each step
   */
  private getStepDuration(category: string): string {
    const durations: Record<string, string> = {
      cleanser: '1-2분',
      makeup_remover: '1-2분',
      toner: '30초',
      essence: '30초',
      serum: '1분',
      eye_cream: '30초',
      moisturizer: '1분',
      sunscreen: '30초',
      sleeping_mask: '1분',
      exfoliator: '2-3분',
      mask: '15-20분',
      ampoule: '1분',
    };

    return durations[category] || '1분';
  }

  /**
   * Generate routine title
   */
  private generateTitle(
    routineType: string,
    concerns: string[],
    skinTypes: string[]
  ): string {
    const typeNames: Record<string, string> = {
      morning: '모닝',
      evening: '이브닝',
      weekly: '주간 스페셜',
      special: '집중 케어',
    };

    const mainConcern = concerns[0] || '기본';
    const mainSkinType = skinTypes[0] || '';

    return `${mainSkinType} 피부를 위한 ${mainConcern} 개선 ${typeNames[routineType]} 루틴`;
  }

  /**
   * Generate routine description
   */
  private generateDescription(
    routineType: string,
    concerns: string[],
    skinTypes: string[]
  ): string {
    const concernText = concerns.join(', ');
    const skinTypeText = skinTypes.join(', ');

    return `${skinTypeText} 피부 타입에 최적화된 ${concernText} 케어 루틴입니다. AI가 분석한 피부 고민에 맞춰 최적의 스킨케어 순서와 제품을 추천합니다.`;
  }

  /**
   * Generate reasoning for the routine
   */
  private generateReasoning(
    concerns: string[],
    skinTypes: string[],
    steps: AIRoutineStep[]
  ): string {
    const parts: string[] = [];

    parts.push(`피부 타입(${skinTypes.join(', ')})과 고민(${concerns.join(', ')})을 분석했습니다.`);

    concerns.forEach((concern) => {
      const config = CONCERN_PRODUCTS[concern];
      if (config) {
        parts.push(
          `${concern} 개선을 위해 ${config.ingredients.slice(0, 2).join(', ')} 성분을 권장합니다.`
        );
      }
    });

    parts.push(`총 ${steps.length}단계의 루틴으로 구성하여 효과적인 케어가 가능합니다.`);

    return parts.join(' ');
  }

  /**
   * Calculate estimated time for routine
   */
  private calculateEstimatedTime(stepCount: number, routineType: string): string {
    const baseTimes: Record<string, number> = {
      morning: 5,
      evening: 10,
      weekly: 30,
      special: 20,
    };

    const baseTime = baseTimes[routineType] || 10;
    const totalMinutes = baseTime + stepCount * 1.5;

    if (totalMinutes < 10) {
      return `약 ${Math.round(totalMinutes)}분`;
    } else if (totalMinutes < 30) {
      return `약 ${Math.round(totalMinutes / 5) * 5}분`;
    } else {
      return `약 ${Math.round(totalMinutes / 10) * 10}분`;
    }
  }

  /**
   * Determine routine difficulty
   */
  private determineDifficulty(
    stepCount: number,
    concernCount: number
  ): 'beginner' | 'intermediate' | 'advanced' {
    const score = stepCount + concernCount * 2;

    if (score <= 6) return 'beginner';
    if (score <= 10) return 'intermediate';
    return 'advanced';
  }

  /**
   * Get routine templates for quick generation
   */
  async getRoutineTemplates(): Promise<
    Array<{ id: string; name: string; description: string; config: GenerateRoutineDto }>
  > {
    return [
      {
        id: 'hydrating-morning',
        name: '수분 충전 모닝 루틴',
        description: '건조한 피부를 위한 촉촉한 아침 케어',
        config: {
          skinTypes: ['건성'],
          concerns: ['건조'],
          routineType: 'morning',
          stepCount: 5,
        },
      },
      {
        id: 'anti-aging-evening',
        name: '안티에이징 이브닝 루틴',
        description: '주름 개선과 탄력을 위한 저녁 케어',
        config: {
          skinTypes: ['건성', '중성'],
          concerns: ['주름'],
          routineType: 'evening',
          stepCount: 7,
        },
      },
      {
        id: 'acne-care',
        name: '트러블 진정 케어',
        description: '여드름과 모공 관리를 위한 루틴',
        config: {
          skinTypes: ['지성', '복합성'],
          concerns: ['여드름', '모공'],
          routineType: 'morning',
          stepCount: 5,
        },
      },
      {
        id: 'brightening-special',
        name: '브라이트닝 스페셜 케어',
        description: '칙칙한 피부톤 개선을 위한 집중 케어',
        config: {
          skinTypes: ['중성'],
          concerns: ['색소침착'],
          routineType: 'special',
          stepCount: 4,
        },
      },
      {
        id: 'sensitive-gentle',
        name: '민감 피부 순한 케어',
        description: '민감한 피부를 위한 저자극 루틴',
        config: {
          skinTypes: ['민감성'],
          concerns: ['건조'],
          routineType: 'morning',
          stepCount: 4,
        },
      },
    ];
  }
}
