/**
 * Partner Mini Storefront Service
 *
 * Phase 6-F: Influencer Tools Expansion
 * - /p/{partnerSlug} 미니 스토어 페이지 생성
 * - 파트너별 맞춤 상점 구성
 * - 테마 및 레이아웃 커스터마이징
 */

import { Repository, DataSource } from 'typeorm';
import { PartnerProfile } from '../entities/partner-profile.entity';
import { PartnerLink } from '../entities/partner-link.entity';
import { PartnerRoutine } from '../entities/partner-routine.entity';

// Types for Storefront
export interface StorefrontConfig {
  theme: 'light' | 'dark' | 'pink' | 'minimal';
  layout: 'grid' | 'list' | 'featured';
  accentColor?: string;
  showRoutines?: boolean;
  showLinks?: boolean;
  showBio?: boolean;
  showSocialLinks?: boolean;
  customCss?: string;
  headerImage?: string;
  featuredProducts?: string[];
}

export interface StorefrontSection {
  id: string;
  type: 'hero' | 'products' | 'routines' | 'about' | 'social' | 'cta';
  title?: string;
  visible: boolean;
  order: number;
  config?: Record<string, unknown>;
}

export interface StorefrontData {
  partner: {
    id: string;
    name: string;
    displayName: string;
    slug: string;
    bio?: string;
    profileImage?: string;
    socialLinks?: Record<string, string>;
    verified: boolean;
    totalFollowers?: number;
  };
  config: StorefrontConfig;
  sections: StorefrontSection[];
  links: Array<{
    id: string;
    title: string;
    slug: string;
    productId?: string;
    productImage?: string;
    description?: string;
    clickCount: number;
  }>;
  routines: Array<{
    id: string;
    title: string;
    description?: string;
    skinTypes: string[];
    concerns: string[];
    steps: unknown[];
    viewCount: number;
    likeCount: number;
  }>;
  meta: {
    title: string;
    description: string;
    ogImage?: string;
    keywords: string[];
  };
}

export interface CreateStorefrontDto {
  partnerId: string;
  config?: Partial<StorefrontConfig>;
}

export interface UpdateStorefrontDto {
  config?: Partial<StorefrontConfig>;
  sections?: StorefrontSection[];
}

// Default storefront configuration
const DEFAULT_CONFIG: StorefrontConfig = {
  theme: 'pink',
  layout: 'grid',
  accentColor: '#EC4899',
  showRoutines: true,
  showLinks: true,
  showBio: true,
  showSocialLinks: true,
};

// Default sections
const DEFAULT_SECTIONS: StorefrontSection[] = [
  { id: 'hero', type: 'hero', title: '프로필', visible: true, order: 1 },
  { id: 'about', type: 'about', title: '소개', visible: true, order: 2 },
  { id: 'products', type: 'products', title: '추천 제품', visible: true, order: 3 },
  { id: 'routines', type: 'routines', title: '스킨케어 루틴', visible: true, order: 4 },
  { id: 'social', type: 'social', title: 'SNS', visible: true, order: 5 },
  { id: 'cta', type: 'cta', title: '팔로우하기', visible: true, order: 6 },
];

// Theme configurations
const THEME_CONFIGS: Record<string, { primary: string; secondary: string; background: string }> = {
  light: { primary: '#1F2937', secondary: '#6B7280', background: '#FFFFFF' },
  dark: { primary: '#F9FAFB', secondary: '#9CA3AF', background: '#111827' },
  pink: { primary: '#EC4899', secondary: '#F472B6', background: '#FDF2F8' },
  minimal: { primary: '#000000', secondary: '#71717A', background: '#FAFAFA' },
};

export class PartnerStorefrontService {
  constructor(private dataSource: DataSource) {}

  /**
   * Get storefront data by partner slug
   */
  async getStorefrontBySlug(slug: string): Promise<StorefrontData | null> {
    const profileRepo = this.dataSource.getRepository(PartnerProfile);
    const linkRepo = this.dataSource.getRepository(PartnerLink);
    const routineRepo = this.dataSource.getRepository(PartnerRoutine);

    // Find partner profile
    const profile = await profileRepo.findOne({
      where: { referralCode: slug },
    });

    if (!profile) {
      return null;
    }

    // Get partner links
    const links = await linkRepo.find({
      where: { partnerId: profile.id },
      order: { clickCount: 'DESC' },
      take: 20,
    });

    // Get partner routines (published only)
    const routines = await routineRepo.find({
      where: { partnerId: profile.id, isPublished: true },
      order: { viewCount: 'DESC' },
      take: 10,
    });

    // Build storefront data
    const config = this.getStorefrontConfig(profile);
    const sections = this.getStorefrontSections(profile);

    return {
      partner: {
        id: profile.id,
        name: profile.userId,
        displayName: profile.userId,
        slug: profile.referralCode,
        bio: profile.bio || undefined,
        profileImage: undefined, // TODO: Add profile image support
        socialLinks: this.parseSocialLinks(profile),
        verified: profile.status === 'active',
        totalFollowers: undefined, // TODO: Add follower count
      },
      config,
      sections,
      links: links.map((link) => ({
        id: link.id,
        title: link.title || 'Untitled Link',
        slug: link.slug,
        productId: link.productId || undefined,
        productImage: undefined, // TODO: Add product image
        description: link.description || undefined,
        clickCount: link.clickCount,
      })),
      routines: routines.map((routine) => ({
        id: routine.id,
        title: routine.title,
        description: routine.description || undefined,
        skinTypes: routine.skinTypes || [],
        concerns: routine.concerns,
        steps: routine.steps,
        viewCount: routine.viewCount,
        likeCount: routine.likeCount,
      })),
      meta: this.generateMeta(profile, links.length, routines.length),
    };
  }

  /**
   * Get storefront config from profile metadata
   */
  private getStorefrontConfig(profile: PartnerProfile): StorefrontConfig {
    // Try to get saved config from profile metadata
    const savedConfig = profile.metadata?.storefrontConfig as Partial<StorefrontConfig> | undefined;

    return {
      ...DEFAULT_CONFIG,
      ...savedConfig,
    };
  }

  /**
   * Get storefront sections from profile metadata
   */
  private getStorefrontSections(profile: PartnerProfile): StorefrontSection[] {
    const savedSections = profile.metadata?.storefrontSections as StorefrontSection[] | undefined;

    if (savedSections && savedSections.length > 0) {
      return savedSections;
    }

    return DEFAULT_SECTIONS;
  }

  /**
   * Parse social links from profile
   */
  private parseSocialLinks(profile: PartnerProfile): Record<string, string> {
    const socialLinks: Record<string, string> = {};

    if (profile.instagramHandle) {
      socialLinks.instagram = `https://instagram.com/${profile.instagramHandle}`;
    }
    if (profile.youtubeChannel) {
      socialLinks.youtube = profile.youtubeChannel;
    }

    // Additional social links from metadata
    const metaSocialLinks = profile.metadata?.socialLinks as Record<string, string> | undefined;
    if (metaSocialLinks) {
      Object.assign(socialLinks, metaSocialLinks);
    }

    return socialLinks;
  }

  /**
   * Generate meta tags for storefront
   */
  private generateMeta(
    profile: PartnerProfile,
    linkCount: number,
    routineCount: number
  ): StorefrontData['meta'] {
    const displayName = profile.userId;

    return {
      title: `${displayName}의 뷰티 스토어 | Cosmetics Partner`,
      description: profile.bio
        ? `${profile.bio.substring(0, 150)}...`
        : `${displayName}의 추천 화장품과 스킨케어 루틴을 만나보세요. ${linkCount}개의 추천 제품, ${routineCount}개의 루틴`,
      ogImage: undefined, // TODO: Generate OG image
      keywords: ['화장품', '스킨케어', '뷰티', '추천', displayName],
    };
  }

  /**
   * Update storefront configuration
   */
  async updateStorefrontConfig(
    partnerId: string,
    dto: UpdateStorefrontDto
  ): Promise<StorefrontConfig> {
    const profileRepo = this.dataSource.getRepository(PartnerProfile);

    const profile = await profileRepo.findOne({
      where: { id: partnerId },
    });

    if (!profile) {
      throw new Error('Partner not found');
    }

    const currentMetadata = profile.metadata || {};
    const currentConfig = (currentMetadata.storefrontConfig as Partial<StorefrontConfig>) || {};

    const newConfig: StorefrontConfig = {
      ...DEFAULT_CONFIG,
      ...currentConfig,
      ...dto.config,
    };

    const newMetadata = {
      ...currentMetadata,
      storefrontConfig: newConfig,
    };

    if (dto.sections) {
      (newMetadata as any).storefrontSections = dto.sections;
    }

    await profileRepo.update(partnerId, {
      metadata: newMetadata,
    });

    return newConfig;
  }

  /**
   * Get theme configurations
   */
  async getThemes(): Promise<Array<{ id: string; name: string; colors: typeof THEME_CONFIGS['light'] }>> {
    return [
      { id: 'light', name: '라이트', colors: THEME_CONFIGS.light },
      { id: 'dark', name: '다크', colors: THEME_CONFIGS.dark },
      { id: 'pink', name: '핑크', colors: THEME_CONFIGS.pink },
      { id: 'minimal', name: '미니멀', colors: THEME_CONFIGS.minimal },
    ];
  }

  /**
   * Get layout options
   */
  async getLayouts(): Promise<Array<{ id: string; name: string; description: string }>> {
    return [
      { id: 'grid', name: '그리드', description: '카드 형태의 그리드 레이아웃' },
      { id: 'list', name: '리스트', description: '세로 목록 형태의 레이아웃' },
      { id: 'featured', name: '피처드', description: '대표 상품 강조 레이아웃' },
    ];
  }

  /**
   * Generate storefront preview
   */
  async generatePreview(partnerId: string): Promise<string> {
    const profileRepo = this.dataSource.getRepository(PartnerProfile);

    const profile = await profileRepo.findOne({
      where: { id: partnerId },
    });

    if (!profile) {
      throw new Error('Partner not found');
    }

    const config = this.getStorefrontConfig(profile);
    const theme = THEME_CONFIGS[config.theme] || THEME_CONFIGS.pink;

    // Generate HTML preview
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.userId}의 스토어 미리보기</title>
  <style>
    body {
      font-family: 'Pretendard', -apple-system, sans-serif;
      background-color: ${theme.background};
      color: ${theme.primary};
      margin: 0;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 40px 20px;
    }
    .profile-name {
      font-size: 24px;
      font-weight: bold;
      color: ${config.accentColor || theme.primary};
    }
    .bio {
      color: ${theme.secondary};
      margin-top: 10px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 30px 0 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${config.accentColor || theme.primary};
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 15px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="profile-name">${profile.userId}</div>
    ${profile.bio ? `<div class="bio">${profile.bio}</div>` : ''}
  </div>
  <div class="section-title">추천 제품</div>
  <div class="grid">
    <div class="card">제품 1</div>
    <div class="card">제품 2</div>
    <div class="card">제품 3</div>
  </div>
  <div class="section-title">스킨케어 루틴</div>
  <div class="grid">
    <div class="card">루틴 1</div>
    <div class="card">루틴 2</div>
  </div>
</body>
</html>
    `.trim();
  }
}
