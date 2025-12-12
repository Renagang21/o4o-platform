/**
 * AI Product Description Generator Service
 *
 * Phase 6-F: Influencer Tools Expansion
 * - SNS/블로그 스타일 제품 설명 자동 생성
 * - tone 선택: casual, professional, friendly, trendy
 * - 플랫폼별 최적화: instagram, blog, youtube, twitter
 */

import { DataSource } from 'typeorm';

// Types for AI Description Generation
export interface GenerateDescriptionDto {
  productName: string;
  productCategory?: string;
  keyIngredients?: string[];
  benefits?: string[];
  skinTypes?: string[];
  tone: 'casual' | 'professional' | 'friendly' | 'trendy';
  platform: 'instagram' | 'blog' | 'youtube' | 'twitter' | 'general';
  includeEmoji?: boolean;
  includeHashtags?: boolean;
  maxLength?: number;
}

export interface GeneratedDescription {
  title: string;
  mainDescription: string;
  shortDescription: string;
  callToAction: string;
  hashtags: string[];
  platform: string;
  tone: string;
  characterCount: number;
}

// Platform-specific configurations
const PLATFORM_CONFIG: Record<
  string,
  { maxLength: number; hashtagCount: number; style: string }
> = {
  instagram: {
    maxLength: 2200,
    hashtagCount: 15,
    style: '시각적이고 감성적인 문구, 줄바꿈과 이모지 활용',
  },
  blog: {
    maxLength: 5000,
    hashtagCount: 10,
    style: '상세하고 정보성 있는 리뷰 스타일, 문단 구분',
  },
  youtube: {
    maxLength: 5000,
    hashtagCount: 8,
    style: '영상 설명용, 타임스탬프 형식, 구독/좋아요 유도',
  },
  twitter: {
    maxLength: 280,
    hashtagCount: 3,
    style: '짧고 임팩트 있는 문구, 핵심만 전달',
  },
  general: {
    maxLength: 1000,
    hashtagCount: 5,
    style: '범용적인 제품 설명',
  },
};

// Tone-specific templates
const TONE_TEMPLATES: Record<string, { opener: string[]; closer: string[]; style: string }> = {
  casual: {
    opener: [
      '요즘 빠져있는',
      '드디어 찾았다!',
      '이거 진짜 대박인데',
      '솔직히 이건 사야 함',
    ],
    closer: [
      '진짜 강추!',
      '안 쓰면 손해',
      '써보면 알게 될 거예요',
      '두 번 사게 될 듯',
    ],
    style: '친근하고 일상적인 말투',
  },
  professional: {
    opener: [
      '피부과학 기반으로 개발된',
      '임상 테스트를 통해 검증된',
      '전문가들이 추천하는',
      '피부 전문의와 함께 만든',
    ],
    closer: [
      '전문적인 스킨케어를 경험해보세요.',
      '과학적 케어의 차이를 느껴보세요.',
      '피부 건강의 새로운 기준을 제시합니다.',
      '전문가가 인정한 효과를 확인하세요.',
    ],
    style: '전문적이고 신뢰감 있는 말투',
  },
  friendly: {
    opener: [
      '피부 고민 있으신 분들 주목!',
      '여러분께 소개해드리고 싶은',
      '제가 정말 좋아하는',
      '같이 써보면 좋을 것 같은',
    ],
    closer: [
      '함께 예뻐져요!',
      '피부 고민 이제 안녕~',
      '여러분도 꼭 써보세요!',
      '같이 좋은 피부 만들어가요!',
    ],
    style: '따뜻하고 공감하는 말투',
  },
  trendy: {
    opener: [
      '요즘 핫한',
      '인플루언서들 사이에서 난리난',
      'MZ세대 필수템',
      '트렌드 세터들의 선택',
    ],
    closer: [
      '이 트렌드 놓치지 마세요!',
      '지금 바로 GET하세요!',
      '힙한 스킨케어의 정석!',
      '트렌드는 내가 만든다!',
    ],
    style: '신선하고 트렌디한 말투',
  },
};

// Ingredient benefit descriptions
const INGREDIENT_BENEFITS: Record<string, string> = {
  히알루론산: '깊은 수분 공급으로 촉촉한 피부',
  레티놀: '주름 개선과 피부 탄력 강화',
  비타민C: '맑고 투명한 피부톤 케어',
  나이아신아마이드: '모공 케어와 피부결 정돈',
  세라마이드: '피부 장벽 강화와 보습',
  펩타이드: '탄력 있고 건강한 피부',
  살리실산: '모공 속 노폐물 제거',
  센텔라: '진정과 피부 회복',
  티트리: '트러블 케어와 진정',
  알로에: '수분 공급과 피부 진정',
  콜라겐: '탱탱한 피부 탄력',
  아데노신: '주름 개선',
  알부틴: '기미 잡티 케어',
  프로폴리스: '영양 공급과 피부 보호',
  스쿠알란: '유수분 밸런스 케어',
};

// Category descriptions
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  클렌저: '피부 첫 단계, 깨끗한 세안',
  토너: 'pH 밸런스와 수분 준비',
  에센스: '영양과 수분의 시작',
  세럼: '집중 케어의 핵심',
  크림: '마무리 보습과 장벽 케어',
  선크림: '자외선으로부터 피부 보호',
  마스크팩: '스페셜 집중 케어',
  아이크림: '민감한 눈가 전문 케어',
  앰플: '고농축 영양 부스터',
};

// Hashtag templates by category
const HASHTAG_TEMPLATES: Record<string, string[]> = {
  스킨케어: ['스킨케어', '피부관리', '데일리스킨케어', '스킨케어루틴'],
  보습: ['수분크림', '보습케어', '촉촉피부', '건조피부'],
  안티에이징: ['안티에이징', '주름케어', '탄력케어', '동안피부'],
  트러블: ['트러블케어', '여드름케어', '피부진정', '민감피부'],
  미백: ['미백케어', '톤업', '화이트닝', '맑은피부'],
  모공: ['모공케어', '피지관리', '블랙헤드', '깨끗한모공'],
};

export class AIDescriptionService {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate AI-powered product description
   */
  async generateDescription(dto: GenerateDescriptionDto): Promise<GeneratedDescription> {
    const {
      productName,
      productCategory = '스킨케어',
      keyIngredients = [],
      benefits = [],
      skinTypes = [],
      tone,
      platform,
      includeEmoji = platform === 'instagram' || platform === 'twitter',
      includeHashtags = true,
      maxLength,
    } = dto;

    const platformConfig = PLATFORM_CONFIG[platform];
    const toneTemplate = TONE_TEMPLATES[tone];
    const effectiveMaxLength = maxLength || platformConfig.maxLength;

    // Generate title
    const title = this.generateTitle(productName, tone, includeEmoji);

    // Generate main description
    const mainDescription = this.generateMainDescription(
      productName,
      productCategory,
      keyIngredients,
      benefits,
      skinTypes,
      tone,
      platform,
      includeEmoji
    );

    // Generate short description
    const shortDescription = this.generateShortDescription(
      productName,
      benefits,
      tone,
      includeEmoji
    );

    // Generate call to action
    const callToAction = this.generateCallToAction(tone, platform, includeEmoji);

    // Generate hashtags
    const hashtags = includeHashtags
      ? this.generateHashtags(productCategory, keyIngredients, skinTypes, platformConfig.hashtagCount)
      : [];

    return {
      title,
      mainDescription,
      shortDescription,
      callToAction,
      hashtags,
      platform,
      tone,
      characterCount: mainDescription.length,
    };
  }

  /**
   * Generate product title
   */
  private generateTitle(productName: string, tone: string, includeEmoji: boolean): string {
    const toneTemplate = TONE_TEMPLATES[tone];
    const opener = toneTemplate.opener[Math.floor(Math.random() * toneTemplate.opener.length)];

    let title = `${opener} ${productName}`;

    if (includeEmoji) {
      const emojis = ['✨', '💫', '🌟', '💖', '🧴', '💧'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      title = `${emoji} ${title}`;
    }

    return title;
  }

  /**
   * Generate main product description
   */
  private generateMainDescription(
    productName: string,
    productCategory: string,
    keyIngredients: string[],
    benefits: string[],
    skinTypes: string[],
    tone: string,
    platform: string,
    includeEmoji: boolean
  ): string {
    const parts: string[] = [];
    const toneTemplate = TONE_TEMPLATES[tone];
    const lineBreak = platform === 'instagram' ? '\n\n' : '\n';

    // Opening
    const opener = toneTemplate.opener[Math.floor(Math.random() * toneTemplate.opener.length)];
    parts.push(`${opener} ${productName}${includeEmoji ? ' ✨' : ''}`);

    // Category info
    if (productCategory && CATEGORY_DESCRIPTIONS[productCategory]) {
      parts.push(`${includeEmoji ? '📌 ' : ''}${CATEGORY_DESCRIPTIONS[productCategory]}`);
    }

    // Key ingredients section
    if (keyIngredients.length > 0) {
      const ingredientParts: string[] = [];
      keyIngredients.forEach((ingredient) => {
        const benefit = INGREDIENT_BENEFITS[ingredient] || `${ingredient} 성분 함유`;
        ingredientParts.push(`• ${ingredient}: ${benefit}`);
      });

      parts.push(
        `${includeEmoji ? '🔬 ' : ''}주요 성분${lineBreak}${ingredientParts.join(lineBreak)}`
      );
    }

    // Benefits section
    if (benefits.length > 0) {
      const benefitList = benefits.map((b) => `${includeEmoji ? '✓ ' : '• '}${b}`).join(lineBreak);
      parts.push(`${includeEmoji ? '💎 ' : ''}이런 분께 추천${lineBreak}${benefitList}`);
    }

    // Skin type recommendation
    if (skinTypes.length > 0) {
      parts.push(
        `${includeEmoji ? '👤 ' : ''}추천 피부 타입: ${skinTypes.join(', ')}`
      );
    }

    // Closing
    const closer = toneTemplate.closer[Math.floor(Math.random() * toneTemplate.closer.length)];
    parts.push(closer);

    return parts.join(lineBreak + lineBreak);
  }

  /**
   * Generate short description
   */
  private generateShortDescription(
    productName: string,
    benefits: string[],
    tone: string,
    includeEmoji: boolean
  ): string {
    const mainBenefit = benefits[0] || '스킨케어 필수템';
    const toneTemplate = TONE_TEMPLATES[tone];
    const opener = toneTemplate.opener[Math.floor(Math.random() * toneTemplate.opener.length)];

    if (includeEmoji) {
      return `✨ ${opener} ${productName} - ${mainBenefit} 💫`;
    }
    return `${opener} ${productName} - ${mainBenefit}`;
  }

  /**
   * Generate call to action
   */
  private generateCallToAction(tone: string, platform: string, includeEmoji: boolean): string {
    const ctaTemplates: Record<string, string[]> = {
      instagram: [
        '프로필 링크에서 만나보세요!',
        '스토리 하이라이트에서 자세히 확인!',
        'DM으로 문의 주세요!',
        '링크 타고 구경 오세요!',
      ],
      blog: [
        '아래 링크에서 자세한 정보를 확인하세요.',
        '궁금한 점은 댓글로 남겨주세요.',
        '더 많은 리뷰가 궁금하시면 구독해주세요.',
      ],
      youtube: [
        '구독과 좋아요 부탁드려요!',
        '더 많은 리뷰는 채널에서 확인!',
        '댓글로 궁금한 점 남겨주세요!',
      ],
      twitter: [
        '자세한 건 프로필 링크!',
        'RT하면 행운이?',
        '리플로 의견 남겨줘!',
      ],
      general: [
        '지금 바로 만나보세요!',
        '더 자세한 정보는 문의해주세요.',
        '특별한 혜택과 함께 만나보세요.',
      ],
    };

    const templates = ctaTemplates[platform] || ctaTemplates.general;
    const cta = templates[Math.floor(Math.random() * templates.length)];

    if (includeEmoji) {
      const ctaEmojis = ['👉', '🔗', '💬', '📱', '🛒'];
      const emoji = ctaEmojis[Math.floor(Math.random() * ctaEmojis.length)];
      return `${emoji} ${cta}`;
    }
    return cta;
  }

  /**
   * Generate relevant hashtags
   */
  private generateHashtags(
    category: string,
    ingredients: string[],
    skinTypes: string[],
    count: number
  ): string[] {
    const hashtags = new Set<string>();

    // Base hashtags
    hashtags.add('스킨케어');
    hashtags.add('피부관리');
    hashtags.add('뷰티');

    // Category-based hashtags
    Object.entries(HASHTAG_TEMPLATES).forEach(([key, tags]) => {
      if (category.includes(key) || key === '스킨케어') {
        tags.forEach((tag) => hashtags.add(tag));
      }
    });

    // Ingredient-based hashtags
    ingredients.forEach((ing) => {
      hashtags.add(ing.replace(/\s+/g, ''));
      if (ing === '히알루론산') {
        hashtags.add('수분케어');
        hashtags.add('하이드레이션');
      } else if (ing === '레티놀') {
        hashtags.add('레티놀추천');
        hashtags.add('안티에이징');
      } else if (ing === '비타민C') {
        hashtags.add('비타민씨세럼');
        hashtags.add('브라이트닝');
      }
    });

    // Skin type hashtags
    skinTypes.forEach((type) => {
      hashtags.add(`${type}피부`);
    });

    // Add trending tags
    hashtags.add('오늘의추천');
    hashtags.add('데일리뷰티');
    hashtags.add('스킨케어추천');

    // Convert to array and limit
    return Array.from(hashtags).slice(0, count);
  }

  /**
   * Get available tones
   */
  async getTones(): Promise<Array<{ id: string; name: string; description: string }>> {
    return [
      { id: 'casual', name: '캐주얼', description: '친근하고 일상적인 말투' },
      { id: 'professional', name: '프로페셔널', description: '전문적이고 신뢰감 있는 말투' },
      { id: 'friendly', name: '프렌들리', description: '따뜻하고 공감하는 말투' },
      { id: 'trendy', name: '트렌디', description: '신선하고 트렌디한 말투' },
    ];
  }

  /**
   * Get available platforms
   */
  async getPlatforms(): Promise<
    Array<{ id: string; name: string; description: string; maxLength: number }>
  > {
    return Object.entries(PLATFORM_CONFIG).map(([id, config]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      description: config.style,
      maxLength: config.maxLength,
    }));
  }
}
