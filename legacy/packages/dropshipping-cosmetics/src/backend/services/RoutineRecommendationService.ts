import { DataSource } from 'typeorm';

/**
 * RoutineRecommendationService
 *
 * Provides routine recommendations based on skin type and concerns.
 * Currently uses a simple rule-based algorithm.
 */
export class RoutineRecommendationService {
  constructor(private dataSource: DataSource) {}

  /**
   * Recommend a skincare routine based on user preferences
   */
  async recommendRoutine(request: RoutineRequest): Promise<RoutineRecommendation> {
    const { skinType, concerns, timeOfUse } = request;

    const routine: RoutineStep[] = [];

    // Step 1: Cleansing (always first)
    const cleanser = await this.findProduct({
      category: 'cleansing',
      skinType,
      step: 1
    });
    if (cleanser) {
      routine.push({
        step: 1,
        stepName: '클렌징',
        product: cleanser,
        reason: '피부 표면의 노폐물과 메이크업을 제거합니다'
      });
    }

    // Step 2: Toner
    const toner = await this.findProduct({
      category: 'skincare',
      skinType,
      routineStep: 'toner',
      concerns,
      step: 2
    });
    if (toner) {
      routine.push({
        step: 2,
        stepName: '토너',
        product: toner,
        reason: '피부 결을 정리하고 다음 단계 흡수를 돕습니다'
      });
    }

    // Step 3: Essence/Serum (based on primary concern)
    if (concerns && concerns.length > 0) {
      const serum = await this.findProduct({
        category: 'skincare',
        skinType,
        routineStep: 'serum',
        concerns: [concerns[0]], // Primary concern
        step: 3
      });
      if (serum) {
        routine.push({
          step: 3,
          stepName: '세럼',
          product: serum,
          reason: this.getConcernReason(concerns[0])
        });
      }
    }

    // Step 4: Cream (evening) or Light moisturizer (morning)
    const moisturizer = await this.findProduct({
      category: 'skincare',
      skinType,
      routineStep: timeOfUse === 'morning' ? 'lotion' : 'cream',
      step: 4
    });
    if (moisturizer) {
      routine.push({
        step: 4,
        stepName: timeOfUse === 'morning' ? '로션' : '크림',
        product: moisturizer,
        reason: '수분을 공급하고 피부 장벽을 강화합니다'
      });
    }

    // Step 5: Sunscreen (morning only)
    if (timeOfUse === 'morning') {
      const sunscreen = await this.findProduct({
        category: 'suncare',
        skinType,
        step: 5
      });
      if (sunscreen) {
        routine.push({
          step: 5,
          stepName: '선크림',
          product: sunscreen,
          reason: '자외선으로부터 피부를 보호합니다 (필수)'
        });
      }
    }

    // Additional: Mask (weekly care)
    if (timeOfUse === 'weekly' && concerns && concerns.length > 0) {
      const mask = await this.findProduct({
        category: 'mask',
        skinType,
        concerns,
        step: 6
      });
      if (mask) {
        routine.push({
          step: 6,
          stepName: '마스크팩',
          product: mask,
          reason: '집중 케어를 통해 피부 고민을 완화합니다'
        });
      }
    }

    return {
      skinType,
      concerns: concerns || [],
      timeOfUse,
      routine,
      totalSteps: routine.length,
      estimatedTime: this.calculateEstimatedTime(routine.length),
      tips: this.getRoutineTips(skinType, concerns, timeOfUse)
    };
  }

  /**
   * Find a product matching the criteria
   */
  private async findProduct(criteria: ProductCriteria): Promise<any | null> {
    const queryBuilder = this.dataSource
      .getRepository('Product')
      .createQueryBuilder('product')
      .where("product.metadata->>'productType' = :productType", { productType: 'cosmetics' });

    // Filter by category
    if (criteria.category) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->>'productCategory' = :category",
        { category: criteria.category }
      );
    }

    // Filter by skin type
    if (criteria.skinType) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'skinType' ? :skinType",
        { skinType: criteria.skinType }
      );
    }

    // Filter by routine step
    if (criteria.routineStep) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'routineInfo'->>'step' = :step",
        { step: criteria.routineStep }
      );
    }

    // Filter by concerns
    if (criteria.concerns && criteria.concerns.length > 0) {
      queryBuilder.andWhere(
        "product.metadata->'cosmetics'->'concerns' ?| :concerns",
        { concerns: criteria.concerns }
      );
    }

    // Order by rating or popularity (if available)
    queryBuilder.orderBy('product.createdAt', 'DESC');

    const product = await queryBuilder.getOne();
    return product;
  }

  /**
   * Get reason text for a specific concern
   */
  private getConcernReason(concern: string): string {
    const reasons: Record<string, string> = {
      acne: '여드름을 진정시키고 피지 생성을 조절합니다',
      whitening: '피부 톤을 밝게 하고 잡티를 완화합니다',
      wrinkle: '주름을 개선하고 피부 탄력을 높입니다',
      pore: '모공을 관리하고 피부 결을 매끄럽게 합니다',
      soothing: '피부를 진정시키고 자극을 완화합니다',
      moisturizing: '수분을 공급하고 건조함을 예방합니다',
      elasticity: '피부 탄력을 높이고 처짐을 개선합니다',
      trouble: '트러블을 완화하고 피부 건강을 회복합니다'
    };
    return reasons[concern] || '피부 고민을 완화합니다';
  }

  /**
   * Calculate estimated time for routine
   */
  private calculateEstimatedTime(steps: number): string {
    const baseTime = 2; // minutes per step
    const totalMinutes = steps * baseTime;
    return `약 ${totalMinutes}분`;
  }

  /**
   * Get routine tips based on skin type and concerns
   */
  private getRoutineTips(
    skinType: string,
    concerns?: string[],
    timeOfUse?: string
  ): string[] {
    const tips: string[] = [];

    // Skin type specific tips
    if (skinType === 'dry') {
      tips.push('건성 피부는 수분 공급이 중요합니다. 토너를 충분히 사용하세요.');
      tips.push('크림은 풍부하게 발라 수분을 잠가주세요.');
    } else if (skinType === 'oily') {
      tips.push('지성 피부는 유분 조절이 중요합니다. 가벼운 제형을 선택하세요.');
      tips.push('클렌징을 철저히 하되 과도한 세안은 피하세요.');
    } else if (skinType === 'sensitive') {
      tips.push('민감성 피부는 자극을 최소화해야 합니다.');
      tips.push('새 제품 사용 전 패치 테스트를 진행하세요.');
    }

    // Time of use tips
    if (timeOfUse === 'morning') {
      tips.push('아침에는 선크림이 필수입니다. SPF 30 이상을 사용하세요.');
      tips.push('가벼운 제형으로 메이크업 베이스를 준비하세요.');
    } else if (timeOfUse === 'evening') {
      tips.push('저녁에는 더블 클렌징으로 하루 노폐물을 제거하세요.');
      tips.push('집중 케어 제품은 저녁에 사용하는 것이 효과적입니다.');
    }

    // Concern specific tips
    if (concerns?.includes('acne')) {
      tips.push('여드름 피부는 손으로 만지지 않도록 주의하세요.');
    }
    if (concerns?.includes('wrinkle')) {
      tips.push('주름 케어는 꾸준함이 중요합니다. 최소 3개월 이상 사용하세요.');
    }

    return tips;
  }
}

// Type definitions
export interface RoutineRequest {
  skinType: string;
  concerns?: string[];
  timeOfUse: 'morning' | 'evening' | 'weekly';
}

export interface RoutineStep {
  step: number;
  stepName: string;
  product: any;
  reason: string;
}

export interface RoutineRecommendation {
  skinType: string;
  concerns: string[];
  timeOfUse: string;
  routine: RoutineStep[];
  totalSteps: number;
  estimatedTime: string;
  tips: string[];
}

interface ProductCriteria {
  category?: string;
  skinType?: string;
  routineStep?: string;
  concerns?: string[];
  step?: number;
}
