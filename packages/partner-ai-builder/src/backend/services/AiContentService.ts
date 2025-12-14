/**
 * AI Content Service
 *
 * AI 기반 콘텐츠 생성 서비스 (제목, 설명, 태그 등)
 *
 * @package @o4o/partner-ai-builder
 */

import type { AllowedIndustry } from './AiRoutineBuilderService.js';

// ========================================
// Types
// ========================================

export interface ContentGenerationRequest {
  contentType: 'title' | 'description' | 'tags' | 'summary';
  industry: AllowedIndustry;
  context: {
    productNames?: string[];
    routineGoal?: string;
    targetAudience?: string;
    keywords?: string[];
  };
  maxLength?: number;
}

export interface ContentGenerationResult {
  success: boolean;
  content?: string | string[];
  error?: string;
}

// ========================================
// Service Class
// ========================================

export class AiContentService {
  private blockedIndustries: string[] = ['PHARMACEUTICAL'];

  /**
   * 산업군 검증
   */
  private validateIndustry(industry: string): boolean {
    return (
      !this.blockedIndustries.includes(industry) &&
      ['COSMETICS', 'HEALTH', 'GENERAL'].includes(industry)
    );
  }

  /**
   * 제목 생성
   */
  async generateTitle(
    industry: AllowedIndustry,
    routineGoal: string,
    keywords: string[] = []
  ): Promise<ContentGenerationResult> {
    if (!this.validateIndustry(industry)) {
      return { success: false, error: '차단된 산업군입니다.' };
    }

    // Mock implementation
    const templates: Record<AllowedIndustry, string[]> = {
      COSMETICS: [
        `${routineGoal}을 위한 스킨케어 루틴`,
        `빛나는 피부를 위한 ${routineGoal} 가이드`,
        `${routineGoal} 완벽 공략법`,
      ],
      HEALTH: [
        `${routineGoal}을 위한 건강 루틴`,
        `매일 실천하는 ${routineGoal} 가이드`,
        `${routineGoal} 웰니스 플랜`,
      ],
      GENERAL: [
        `${routineGoal} 루틴 가이드`,
        `효과적인 ${routineGoal} 방법`,
        `${routineGoal} 시작하기`,
      ],
    };

    const titles = templates[industry];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];

    return { success: true, content: randomTitle };
  }

  /**
   * 설명 생성
   */
  async generateDescription(
    industry: AllowedIndustry,
    routineGoal: string,
    productNames: string[] = []
  ): Promise<ContentGenerationResult> {
    if (!this.validateIndustry(industry)) {
      return { success: false, error: '차단된 산업군입니다.' };
    }

    const productMention =
      productNames.length > 0
        ? `${productNames.slice(0, 3).join(', ')} 등의 제품을 활용한 `
        : '';

    const descriptions: Record<AllowedIndustry, string> = {
      COSMETICS: `${productMention}${routineGoal}을 달성하기 위한 체계적인 스킨케어 루틴입니다. 꾸준한 실천으로 건강하고 빛나는 피부를 만들어보세요.`,
      HEALTH: `${productMention}${routineGoal}을 목표로 하는 건강 관리 루틴입니다. 일상에서 쉽게 실천할 수 있는 방법들을 소개합니다.`,
      GENERAL: `${productMention}${routineGoal}을 위한 실용적인 가이드입니다. 단계별로 따라하며 목표를 달성해보세요.`,
    };

    return { success: true, content: descriptions[industry] };
  }

  /**
   * 태그 생성
   */
  async generateTags(
    industry: AllowedIndustry,
    routineGoal: string,
    maxTags: number = 5
  ): Promise<ContentGenerationResult> {
    if (!this.validateIndustry(industry)) {
      return { success: false, error: '차단된 산업군입니다.' };
    }

    const baseTags: Record<AllowedIndustry, string[]> = {
      COSMETICS: ['스킨케어', '뷰티', '화장품'],
      HEALTH: ['건강', '웰니스', '영양'],
      GENERAL: ['라이프스타일', '일상', '루틴'],
    };

    // Goal에서 추가 태그 추출
    const goalTags = this.extractTagsFromGoal(routineGoal);
    const allTags = [...baseTags[industry], ...goalTags];

    return {
      success: true,
      content: [...new Set(allTags)].slice(0, maxTags),
    };
  }

  /**
   * 목표에서 태그 추출
   */
  private extractTagsFromGoal(goal: string): string[] {
    const tagMap: Record<string, string> = {
      보습: '보습',
      수분: '수분',
      미백: '미백',
      주름: '안티에이징',
      탄력: '탄력',
      진정: '진정',
      트러블: '트러블케어',
      클렌징: '클렌징',
      각질: '각질관리',
      건강: '건강관리',
      다이어트: '다이어트',
      면역: '면역력',
      수면: '수면',
      스트레스: '스트레스관리',
    };

    const tags: string[] = [];
    for (const [keyword, tag] of Object.entries(tagMap)) {
      if (goal.includes(keyword)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * 콘텐츠 요약 생성
   */
  async generateSummary(
    content: string,
    maxLength: number = 100
  ): Promise<ContentGenerationResult> {
    // Simple truncation with ellipsis
    if (content.length <= maxLength) {
      return { success: true, content };
    }

    const truncated = content.substring(0, maxLength - 3) + '...';
    return { success: true, content: truncated };
  }

  /**
   * 통합 콘텐츠 생성
   */
  async generate(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResult> {
    switch (request.contentType) {
      case 'title':
        return this.generateTitle(
          request.industry,
          request.context.routineGoal || '',
          request.context.keywords
        );
      case 'description':
        return this.generateDescription(
          request.industry,
          request.context.routineGoal || '',
          request.context.productNames
        );
      case 'tags':
        return this.generateTags(
          request.industry,
          request.context.routineGoal || ''
        );
      case 'summary':
        return this.generateSummary(
          request.context.routineGoal || '',
          request.maxLength
        );
      default:
        return { success: false, error: '지원되지 않는 콘텐츠 타입입니다.' };
    }
  }
}

export default AiContentService;
