/**
 * AiInsightService
 *
 * AI 요약 및 해석 생성 서비스 (최소 계약 기반)
 *
 * 원칙:
 * - 확정 결론 ❌
 * - 행동 지시 ❌
 * - 설명 보조 ⭕
 *
 * @package @o4o/pharmacy-ai-insight
 */

import type {
  AiInsightInput,
  AiInsightOutput,
  InsightCard,
  PatternObservation,
  CtaSuggestion,
} from '../dto/index.js';
import { AI_DISCLAIMER, SAFE_EXPRESSIONS } from '../dto/index.js';
import { ProductHintService } from './ProductHintService.js';
import {
  calculateCV,
  calculateTIR,
  getVariabilityLevel,
  getVariabilityDescription,
  generateGlucoseSummary,
  getPatternDescription,
  calculateConfidence,
} from '../utils/glucoseUtils.js';

export class AiInsightService {
  private productHintService: ProductHintService;

  constructor() {
    this.productHintService = new ProductHintService();
  }

  /**
   * AI 인사이트 생성 (최소 계약)
   */
  async generateInsight(input: AiInsightInput): Promise<AiInsightOutput> {
    const now = new Date().toISOString();
    const pharmacyId = input.context.pharmacyId;

    // 1. 요약 카드 생성 (3~5개)
    const summaryCards = await this.generateSummaryCards(input);

    // 2. 패턴 관찰 결과 생성
    const patterns = this.generatePatternObservations(input);

    // 3. 제품 힌트 생성
    const productHints = await this.productHintService.generateHints(input);

    // 4. CTA 제안 생성
    const ctaSuggestions = this.generateCtaSuggestions(input);

    return {
      pharmacyId,
      summaryCards,
      patterns: patterns.length > 0 ? patterns : undefined,
      productHints: productHints.length > 0 ? productHints : undefined,
      ctaSuggestions: ctaSuggestions.length > 0 ? ctaSuggestions : undefined,
      generatedAt: now,
      disclaimer: AI_DISCLAIMER,
    };
  }

  /**
   * 요약 카드 생성 (3~5개)
   */
  private async generateSummaryCards(input: AiInsightInput): Promise<InsightCard[]> {
    const cards: InsightCard[] = [];
    const idPrefix = `card-${Date.now()}`;

    // 1. 혈당 요약 카드 (있으면)
    if (input.glucoseSummary) {
      const glucoseCard = this.createGlucoseSummaryCard(input.glucoseSummary, `${idPrefix}-glucose`);
      if (glucoseCard) cards.push(glucoseCard);
    }

    // 2. 변동성 카드 (있으면)
    if (input.glucoseSummary?.variability !== undefined) {
      const variabilityCard = this.createVariabilityCard(
        input.glucoseSummary.variability,
        `${idPrefix}-variability`
      );
      if (variabilityCard) cards.push(variabilityCard);
    }

    // 3. 시간대 패턴 카드 (있으면)
    if (input.glucoseSummary?.timePatterns && input.glucoseSummary.timePatterns.length > 0) {
      const timeCard = this.createTimePatternCard(
        input.glucoseSummary.timePatterns,
        `${idPrefix}-time`
      );
      if (timeCard) cards.push(timeCard);
    }

    // 4. 제품 이력 기반 카드 (있으면)
    if (input.purchaseHistory) {
      const purchaseCard = this.createPurchaseInsightCard(
        input.purchaseHistory,
        `${idPrefix}-purchase`
      );
      if (purchaseCard) cards.push(purchaseCard);
    }

    // 5. 일반 안내 카드 (항상 포함)
    cards.push({
      id: `${idPrefix}-general`,
      category: 'general',
      title: '안내',
      content: '이 정보는 참고용입니다. 구체적인 건강 관리는 전문가와 상담하시기 바랍니다.',
      tone: 'neutral',
      confidence: 'high',
    });

    // 최소 3개, 최대 5개 보장
    return cards.slice(0, 5);
  }

  /**
   * 혈당 요약 카드 생성
   */
  private createGlucoseSummaryCard(
    glucoseSummary: NonNullable<AiInsightInput['glucoseSummary']>,
    id: string
  ): InsightCard | null {
    const summary = generateGlucoseSummary({
      avgGlucose: glucoseSummary.avgGlucose,
      timeInRange: glucoseSummary.timeInRange,
      variability: glucoseSummary.variability,
    });

    // 데이터가 없으면 null
    if (summary.includes('충분하지 않습니다')) return null;

    // 신뢰도 판단
    let confidence: 'low' | 'medium' | 'high' = 'medium';
    if (glucoseSummary.periodDays && glucoseSummary.periodDays >= 7) {
      confidence = 'high';
    } else if (glucoseSummary.periodDays && glucoseSummary.periodDays < 3) {
      confidence = 'low';
    }

    // 톤 판단
    let tone: 'neutral' | 'positive' | 'cautious' = 'neutral';
    if (glucoseSummary.timeInRange !== undefined) {
      if (glucoseSummary.timeInRange >= 70) tone = 'positive';
      else if (glucoseSummary.timeInRange < 50) tone = 'cautious';
    }

    return {
      id,
      category: 'glucose',
      title: '혈당 요약',
      content: summary,
      tone,
      confidence,
    };
  }

  /**
   * 변동성 카드 생성
   */
  private createVariabilityCard(variability: number, id: string): InsightCard {
    const level = getVariabilityLevel(variability);
    const description = getVariabilityDescription(variability);

    return {
      id,
      category: 'pattern',
      title: '혈당 변동성',
      content: `${description} (CV: ${variability.toFixed(1)}%)`,
      tone: level === 'low' ? 'positive' : level === 'moderate' ? 'neutral' : 'cautious',
      confidence: 'medium',
    };
  }

  /**
   * 시간대 패턴 카드 생성
   */
  private createTimePatternCard(
    timePatterns: NonNullable<AiInsightInput['glucoseSummary']>['timePatterns'],
    id: string
  ): InsightCard | null {
    if (!timePatterns || timePatterns.length === 0) return null;

    const variableSlots = timePatterns.filter((p) => p.trend === 'variable' || p.trend === 'rising');

    if (variableSlots.length === 0) {
      return {
        id,
        category: 'pattern',
        title: '시간대별 패턴',
        content: '전반적으로 시간대별 혈당이 안정적인 편으로 보입니다.',
        tone: 'positive',
        confidence: 'medium',
      };
    }

    const slotLabels = {
      morning: '아침',
      afternoon: '오후',
      evening: '저녁',
      night: '야간',
    };

    const slotNames = variableSlots.map((s) => slotLabels[s.timeSlot] || s.timeSlot).join(', ');

    return {
      id,
      category: 'pattern',
      title: '시간대별 패턴',
      content: `${slotNames} 시간대에 혈당 변화가 관찰됩니다.`,
      tone: 'neutral',
      confidence: 'medium',
    };
  }

  /**
   * 구매 이력 기반 카드 생성
   */
  private createPurchaseInsightCard(
    purchaseHistory: NonNullable<AiInsightInput['purchaseHistory']>,
    id: string
  ): InsightCard | null {
    if (!purchaseHistory.recentProducts || purchaseHistory.recentProducts.length === 0) {
      return null;
    }

    const categories = purchaseHistory.productCategories || [];
    if (categories.length === 0) {
      return {
        id,
        category: 'product',
        title: '구매 참고',
        content: '최근 구매 이력을 바탕으로 관련 제품 정보를 제공할 수 있습니다.',
        tone: 'neutral',
        confidence: 'low',
      };
    }

    return {
      id,
      category: 'product',
      title: '구매 참고',
      content: `최근 ${categories.slice(0, 2).join(', ')} 카테고리 제품을 확인하셨습니다.`,
      tone: 'neutral',
      confidence: 'medium',
    };
  }

  /**
   * 패턴 관찰 결과 생성
   */
  private generatePatternObservations(input: AiInsightInput): PatternObservation[] {
    const patterns: PatternObservation[] = [];

    if (!input.glucoseSummary) return patterns;

    // 변동성 패턴
    if (input.glucoseSummary.variability !== undefined) {
      const level = getVariabilityLevel(input.glucoseSummary.variability);
      if (level === 'high') {
        patterns.push({
          patternType: '높은 변동성',
          description: getPatternDescription('high_variability'),
          frequency: 'frequent',
          possibleFactors: ['식사 패턴', '활동량', '수면'],
          isConclusion: false,
        });
      }
    }

    // TIR 기반 패턴
    if (input.glucoseSummary.timeInRange !== undefined) {
      if (input.glucoseSummary.timeInRange < 50) {
        patterns.push({
          patternType: '목표 범위 벗어남',
          description: '목표 혈당 범위를 벗어나는 시간이 많은 편으로 관찰됩니다.',
          frequency: 'frequent',
          possibleFactors: ['식사', '활동', '약물'],
          isConclusion: false,
        });
      }
    }

    // 시간대 패턴
    if (input.glucoseSummary.timePatterns) {
      const risingSlots = input.glucoseSummary.timePatterns.filter((p) => p.trend === 'rising');
      for (const slot of risingSlots.slice(0, 2)) {
        const slotLabels: Record<string, string> = {
          morning: '아침',
          afternoon: '오후',
          evening: '저녁',
          night: '야간',
        };
        patterns.push({
          patternType: `${slotLabels[slot.timeSlot] || slot.timeSlot} 상승 경향`,
          description: `${slotLabels[slot.timeSlot] || slot.timeSlot} 시간대에 혈당이 상승하는 경향이 관찰됩니다.`,
          frequency: 'occasional',
          possibleFactors: ['해당 시간대 활동', '식사'],
          isConclusion: false,
        });
      }
    }

    return patterns;
  }

  /**
   * CTA 제안 생성 (선택형 문구만)
   */
  private generateCtaSuggestions(input: AiInsightInput): CtaSuggestion[] {
    return [
      {
        id: 'cta-info',
        label: '관련 제품 정보 보기',
        type: 'info',
        action: 'view-products',
      },
      {
        id: 'cta-reference',
        label: '참고 자료 확인',
        type: 'reference',
        action: 'view-reference',
      },
      {
        id: 'cta-consult',
        label: '전문가 상담 안내',
        type: 'consult',
        action: 'view-consult-info',
      },
    ];
  }
}

export default AiInsightService;
