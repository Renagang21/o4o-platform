/**
 * ProductHintService
 *
 * 제품 유형 힌트 생성 서비스 (최소 계약 기반)
 *
 * 원칙:
 * - 특정 제품 아닌 유형만 ⭕
 * - 추천 ❌ (isRecommendation: false)
 * - 규칙 + AI 혼합 허용
 *
 * @package @o4o/pharmacy-ai-insight
 */

import type { AiInsightInput, ProductHint } from '../dto/index.js';
import { getVariabilityLevel } from '../utils/glucoseUtils.js';

export class ProductHintService {
  /**
   * 제품 힌트 생성
   */
  async generateHints(input: AiInsightInput): Promise<ProductHint[]> {
    const hints: ProductHint[] = [];

    // 1. 혈당 데이터 기반 힌트
    if (input.glucoseSummary) {
      hints.push(...this.getGlucoseBasedHints(input.glucoseSummary));
    }

    // 2. 구매 이력 기반 힌트
    if (input.purchaseHistory) {
      hints.push(...this.getPurchaseBasedHints(input.purchaseHistory));
    }

    // 3. 계절 기반 힌트
    if (input.context.season) {
      hints.push(...this.getSeasonalHints(input.context.season));
    }

    // 4. 기본 힌트 (데이터 없을 때)
    if (hints.length === 0) {
      hints.push(...this.getDefaultHints());
    }

    // 우선순위 정렬 후 상위 3개만
    return hints
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }

  /**
   * 혈당 데이터 기반 힌트
   */
  private getGlucoseBasedHints(
    glucoseSummary: NonNullable<AiInsightInput['glucoseSummary']>
  ): ProductHint[] {
    const hints: ProductHint[] = [];

    // 변동성이 높으면 모니터링 제품
    if (glucoseSummary.variability !== undefined) {
      const level = getVariabilityLevel(glucoseSummary.variability);
      if (level === 'high') {
        hints.push({
          productType: '혈당 모니터링 기기',
          relevanceReason: '혈당 변동 확인에 활용될 수 있는 제품군입니다.',
          priority: 90,
          isRecommendation: false,
        });
      }
    }

    // TIR이 낮으면 관리 보조 제품
    if (glucoseSummary.timeInRange !== undefined && glucoseSummary.timeInRange < 60) {
      hints.push({
        productType: '혈당 관리 보조 식품',
        relevanceReason: '혈당 관리에 관심이 있는 분들이 찾는 제품군입니다.',
        priority: 80,
        isRecommendation: false,
      });
    }

    // 데이터 소스가 manual이면 측정기 제품
    if (glucoseSummary.dataSource === 'manual') {
      hints.push({
        productType: '자가 혈당 측정기',
        relevanceReason: '정기적인 혈당 측정에 사용되는 제품군입니다.',
        priority: 70,
        isRecommendation: false,
      });
    }

    return hints;
  }

  /**
   * 구매 이력 기반 힌트
   */
  private getPurchaseBasedHints(
    purchaseHistory: NonNullable<AiInsightInput['purchaseHistory']>
  ): ProductHint[] {
    const hints: ProductHint[] = [];

    // 측정기 구매 이력이 있으면 소모품
    if (purchaseHistory.productCategories?.some(
      (c) => c.includes('측정기') || c.includes('monitor')
    )) {
      hints.push({
        productType: '혈당 측정 소모품',
        relevanceReason: '측정기 관련 소모품입니다.',
        priority: 85,
        isRecommendation: false,
      });
    }

    // 건강식품 구매 이력이 있으면 관련 제품
    if (purchaseHistory.productCategories?.some(
      (c) => c.includes('건강') || c.includes('supplement')
    )) {
      hints.push({
        productType: '건강 보조 식품',
        relevanceReason: '건강 관리에 관심이 있는 분들이 찾는 제품군입니다.',
        priority: 60,
        isRecommendation: false,
      });
    }

    return hints;
  }

  /**
   * 계절 기반 힌트
   */
  private getSeasonalHints(season: string): ProductHint[] {
    const hints: ProductHint[] = [];

    if (season === 'summer') {
      hints.push({
        productType: '여름철 건강 관리 용품',
        relevanceReason: '계절에 맞는 건강 관리 제품군입니다.',
        priority: 40,
        isRecommendation: false,
      });
    } else if (season === 'winter') {
      hints.push({
        productType: '겨울철 건강 관리 용품',
        relevanceReason: '계절에 맞는 건강 관리 제품군입니다.',
        priority: 40,
        isRecommendation: false,
      });
    }

    return hints;
  }

  /**
   * 기본 힌트
   */
  private getDefaultHints(): ProductHint[] {
    return [
      {
        productType: '당뇨 관리 종합 용품',
        relevanceReason: '당뇨 관리에 필요한 기본 제품군입니다.',
        priority: 50,
        isRecommendation: false,
      },
      {
        productType: '건강 모니터링 기기',
        relevanceReason: '건강 상태 확인에 활용될 수 있는 제품군입니다.',
        priority: 40,
        isRecommendation: false,
      },
    ];
  }
}

export default ProductHintService;
