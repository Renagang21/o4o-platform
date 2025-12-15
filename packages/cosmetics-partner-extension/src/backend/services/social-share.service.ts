/**
 * Social Share Automation Service
 *
 * Phase 6-F: Influencer Tools Expansion
 * - Instagram/Facebook/Twitter/KakaoTalk 공유 템플릿 생성
 * - 카피라이트 + 이미지 + 링크 자동 조합
 * - 플랫폼별 최적 포맷 적용
 */

import { DataSource } from 'typeorm';
import { PartnerLink } from '../entities/partner-link.entity';
import { PartnerRoutine } from '../entities/partner-routine.entity';

// Types for Social Share
export interface GenerateShareContentDto {
  partnerId: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'kakao' | 'blog';
  contentType: 'product' | 'routine' | 'storefront' | 'custom';
  contentId?: string; // linkId or routineId
  customTitle?: string;
  customDescription?: string;
  includePrice?: boolean;
  includeHashtags?: boolean;
  hashtagCount?: number;
  tone?: 'casual' | 'professional' | 'friendly' | 'trendy';
  language?: 'ko' | 'en';
}

export interface ShareContent {
  platform: string;
  title: string;
  description: string;
  hashtags: string[];
  shareUrl: string;
  imageUrl?: string;
  characterCount: number;
  platformLink: string; // Direct share link
  copyText: string; // Full text for copy-paste
}

export interface ShareAnalytics {
  linkId: string;
  platform: string;
  shares: number;
  clicks: number;
  conversions: number;
  lastSharedAt?: Date;
}

// Platform configurations
const PLATFORM_CONFIG: Record<string, {
  maxLength: number;
  hashtagLimit: number;
  supportsImages: boolean;
  shareUrlTemplate: string;
  features: string[];
}> = {
  instagram: {
    maxLength: 2200,
    hashtagLimit: 30,
    supportsImages: true,
    shareUrlTemplate: 'https://www.instagram.com/',
    features: ['이미지 중심', '스토리/피드', '해시태그 중요'],
  },
  facebook: {
    maxLength: 63206,
    hashtagLimit: 10,
    supportsImages: true,
    shareUrlTemplate: 'https://www.facebook.com/sharer/sharer.php?u={url}',
    features: ['링크 미리보기', '긴 텍스트 가능', '공유하기 버튼'],
  },
  twitter: {
    maxLength: 280,
    hashtagLimit: 5,
    supportsImages: true,
    shareUrlTemplate: 'https://twitter.com/intent/tweet?text={text}&url={url}',
    features: ['짧은 텍스트', '리트윗', '해시태그'],
  },
  kakao: {
    maxLength: 200,
    hashtagLimit: 0,
    supportsImages: true,
    shareUrlTemplate: 'https://sharer.kakao.com/talk/friends/picker/link',
    features: ['카카오톡 공유', '썸네일 이미지', '버튼 링크'],
  },
  blog: {
    maxLength: 10000,
    hashtagLimit: 20,
    supportsImages: true,
    shareUrlTemplate: '',
    features: ['긴 콘텐츠', 'SEO 최적화', '이미지 갤러리'],
  },
};

// Tone-specific templates
const TONE_TEMPLATES: Record<string, {
  productOpeners: string[];
  routineOpeners: string[];
  closers: string[];
}> = {
  casual: {
    productOpeners: ['이거 진짜 좋아요!', '요즘 빠져있는 제품', '드디어 찾은 인생템'],
    routineOpeners: ['내 피부 루틴 공개!', '매일 하는 스킨케어', '이렇게 관리해요'],
    closers: ['강추!', '써보세요!', '후회 없을 거예요'],
  },
  professional: {
    productOpeners: ['전문가 추천 제품', '피부과학 기반', '임상 테스트 완료'],
    routineOpeners: ['전문 스킨케어 루틴', '과학적 접근법', '피부 전문가의 조언'],
    closers: ['확인해보세요.', '경험해보세요.', '추천드립니다.'],
  },
  friendly: {
    productOpeners: ['같이 써봐요!', '추천하고 싶은', '여러분께 소개해요'],
    routineOpeners: ['같이 예뻐져요!', '피부 관리 함께해요', '루틴 공유해요'],
    closers: ['같이 예뻐져요!', '화이팅!', '응원해요!'],
  },
  trendy: {
    productOpeners: ['요즘 핫한', 'MZ 필수템', '트렌드 세터의 선택'],
    routineOpeners: ['요즘 대세 루틴', '힙한 스킨케어', '트렌디한 관리법'],
    closers: ['이게 바로 트렌드!', '놓치지 마세요!', 'GET하세요!'],
  },
};

// Hashtag templates by category
const HASHTAG_CATEGORIES: Record<string, string[]> = {
  스킨케어: ['스킨케어', '피부관리', '스킨케어루틴', '데일리스킨케어'],
  화장품: ['화장품추천', '코스메틱', '뷰티템', '화장품리뷰'],
  보습: ['수분케어', '보습크림', '촉촉피부', '하이드레이션'],
  안티에이징: ['안티에이징', '주름케어', '탄력케어', '동안피부'],
  트러블: ['트러블케어', '여드름케어', '피부진정', '민감피부'],
  일반: ['뷰티', '셀프케어', '피부미인', '오늘의추천'],
};

export class SocialShareService {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate share content for a platform
   */
  async generateShareContent(dto: GenerateShareContentDto): Promise<ShareContent> {
    const {
      partnerId,
      platform,
      contentType,
      contentId,
      customTitle,
      customDescription,
      includeHashtags = true,
      hashtagCount = 10,
      tone = 'casual',
      language = 'ko',
    } = dto;

    const platformConfig = PLATFORM_CONFIG[platform];
    const toneTemplate = TONE_TEMPLATES[tone];

    let title = customTitle || '';
    let description = customDescription || '';
    let shareUrl = '';
    let imageUrl: string | undefined;
    let category = '스킨케어';

    // Get content based on type
    if (contentType === 'product' && contentId) {
      const linkData = await this.getProductLinkData(contentId);
      if (linkData) {
        title = title || linkData.title;
        description = description || linkData.description || '';
        shareUrl = linkData.shareUrl;
        category = linkData.category || '화장품';
      }
    } else if (contentType === 'routine' && contentId) {
      const routineData = await this.getRoutineData(contentId);
      if (routineData) {
        title = title || routineData.title;
        description = description || routineData.description || '';
        shareUrl = routineData.shareUrl;
        category = '스킨케어';
      }
    } else if (contentType === 'storefront') {
      shareUrl = `https://neture.co.kr/p/${partnerId}`;
      title = title || '내 뷰티 스토어';
      description = description || '추천 화장품과 스킨케어 루틴을 만나보세요';
    }

    // Generate content
    const opener =
      contentType === 'routine'
        ? toneTemplate.routineOpeners[Math.floor(Math.random() * toneTemplate.routineOpeners.length)]
        : toneTemplate.productOpeners[Math.floor(Math.random() * toneTemplate.productOpeners.length)];

    const closer = toneTemplate.closers[Math.floor(Math.random() * toneTemplate.closers.length)];

    // Build description based on platform
    let fullDescription = this.buildPlatformDescription(
      platform,
      opener,
      title,
      description,
      closer,
      platformConfig.maxLength
    );

    // Generate hashtags
    const hashtags = includeHashtags
      ? this.generateHashtags(category, Math.min(hashtagCount, platformConfig.hashtagLimit))
      : [];

    // Calculate character count
    const hashtagText = hashtags.map((h) => `#${h}`).join(' ');
    const fullText = `${fullDescription}\n\n${hashtagText}\n\n${shareUrl}`;
    const characterCount = fullText.length;

    // Generate platform share link
    const platformLink = this.generatePlatformLink(platform, fullDescription, shareUrl, hashtags);

    // Generate copy text
    const copyText = this.generateCopyText(platform, fullDescription, hashtags, shareUrl);

    return {
      platform,
      title,
      description: fullDescription,
      hashtags,
      shareUrl,
      imageUrl,
      characterCount,
      platformLink,
      copyText,
    };
  }

  /**
   * Get product link data
   */
  private async getProductLinkData(linkId: string): Promise<{
    title: string;
    description?: string;
    shareUrl: string;
    category?: string;
  } | null> {
    const linkRepo = this.dataSource.getRepository(PartnerLink);
    const link = await linkRepo.findOne({ where: { id: linkId } });

    if (!link) return null;

    return {
      title: link.title || 'Product Link',
      description: link.description || undefined,
      shareUrl: `https://neture.co.kr/p/${link.slug}`,
      category: link.metadata?.category as string | undefined,
    };
  }

  /**
   * Get routine data
   */
  private async getRoutineData(routineId: string): Promise<{
    title: string;
    description?: string;
    shareUrl: string;
  } | null> {
    const routineRepo = this.dataSource.getRepository(PartnerRoutine);
    const routine = await routineRepo.findOne({ where: { id: routineId } });

    if (!routine) return null;

    return {
      title: routine.title,
      description: routine.description || undefined,
      shareUrl: `https://neture.co.kr/routine/${routine.id}`,
    };
  }

  /**
   * Build platform-specific description
   */
  private buildPlatformDescription(
    platform: string,
    opener: string,
    title: string,
    description: string,
    closer: string,
    maxLength: number
  ): string {
    let result = '';

    switch (platform) {
      case 'instagram':
        result = `${opener}\n\n✨ ${title}\n\n${description}\n\n${closer}`;
        break;
      case 'twitter':
        result = `${opener} ${title} ${closer}`;
        break;
      case 'facebook':
        result = `${opener}\n\n${title}\n\n${description}\n\n${closer}`;
        break;
      case 'kakao':
        result = `${opener} ${title}`;
        break;
      case 'blog':
        result = `# ${title}\n\n${opener}\n\n${description}\n\n${closer}`;
        break;
      default:
        result = `${opener} ${title} ${description} ${closer}`;
    }

    // Truncate if exceeds max length
    if (result.length > maxLength) {
      result = result.substring(0, maxLength - 3) + '...';
    }

    return result;
  }

  /**
   * Generate hashtags based on category
   */
  private generateHashtags(category: string, count: number): string[] {
    const hashtags = new Set<string>();

    // Add category-specific hashtags
    const categoryTags = HASHTAG_CATEGORIES[category] || HASHTAG_CATEGORIES['일반'];
    categoryTags.forEach((tag) => hashtags.add(tag));

    // Add general hashtags
    HASHTAG_CATEGORIES['일반'].forEach((tag) => hashtags.add(tag));

    // Convert to array and limit
    return Array.from(hashtags).slice(0, count);
  }

  /**
   * Generate platform-specific share link
   */
  private generatePlatformLink(
    platform: string,
    text: string,
    url: string,
    hashtags: string[]
  ): string {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);

    switch (platform) {
      case 'twitter':
        const hashtagStr = hashtags.slice(0, 3).join(',');
        return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=${hashtagStr}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
      case 'kakao':
        return 'kakaolink://'; // Requires Kakao SDK
      default:
        return url;
    }
  }

  /**
   * Generate full copy text for clipboard
   */
  private generateCopyText(
    platform: string,
    description: string,
    hashtags: string[],
    url: string
  ): string {
    const hashtagText = hashtags.map((h) => `#${h}`).join(' ');

    switch (platform) {
      case 'instagram':
        return `${description}\n\n${hashtagText}\n\n🔗 프로필 링크에서 확인하세요!`;
      case 'twitter':
        return `${description} ${hashtagText} ${url}`;
      case 'facebook':
        return `${description}\n\n${url}`;
      case 'kakao':
        return `${description}\n\n${url}`;
      case 'blog':
        return `${description}\n\n${hashtagText}\n\n링크: ${url}`;
      default:
        return `${description}\n\n${hashtagText}\n\n${url}`;
    }
  }

  /**
   * Get available platforms
   */
  async getPlatforms(): Promise<
    Array<{ id: string; name: string; maxLength: number; features: string[] }>
  > {
    return Object.entries(PLATFORM_CONFIG).map(([id, config]) => ({
      id,
      name: this.getPlatformName(id),
      maxLength: config.maxLength,
      features: config.features,
    }));
  }

  /**
   * Get platform display name
   */
  private getPlatformName(id: string): string {
    const names: Record<string, string> = {
      instagram: '인스타그램',
      facebook: '페이스북',
      twitter: '트위터(X)',
      kakao: '카카오톡',
      blog: '블로그',
    };
    return names[id] || id;
  }

  /**
   * Get share analytics for a partner
   */
  async getShareAnalytics(partnerId: string): Promise<ShareAnalytics[]> {
    const linkRepo = this.dataSource.getRepository(PartnerLink);

    const links = await linkRepo.find({
      where: { partnerId },
      order: { clickCount: 'DESC' },
      take: 20,
    });

    return links.map((link) => ({
      linkId: link.id,
      platform: 'all',
      shares: 0, // TODO: Track shares
      clicks: link.clickCount,
      conversions: link.conversionCount,
      lastSharedAt: link.updatedAt,
    }));
  }
}
