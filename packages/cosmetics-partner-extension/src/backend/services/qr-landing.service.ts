/**
 * QR/Slug Landing Page Generator Service
 *
 * Phase 6-F: Influencer Tools Expansion
 * - QR 코드 생성
 * - Short URL/Slug 기반 랜딩 페이지
 * - UTM 파라미터 지원
 * - 클릭 트래킹
 */

import { Repository, DataSource } from 'typeorm';
import { PartnerLink } from '../entities/partner-link.entity.js';
import { PartnerProfile } from '../entities/partner-profile.entity.js';

// Types for QR/Landing
export interface GenerateQRDto {
  partnerId: string;
  linkId?: string;
  targetUrl?: string;
  customSlug?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  size?: 'small' | 'medium' | 'large';
  format?: 'svg' | 'png';
  style?: 'default' | 'rounded' | 'dots';
  color?: string;
  backgroundColor?: string;
  logoUrl?: string;
}

export interface QRCodeResult {
  qrCode: string; // Base64 or SVG string
  shortUrl: string;
  slug: string;
  fullUrl: string;
  format: string;
  size: number;
}

export interface LandingPageData {
  partner: {
    id: string;
    name: string;
    profileImage?: string;
    verified: boolean;
  };
  link?: {
    id: string;
    title: string;
    description?: string;
    productId?: string;
    targetUrl?: string;
  };
  meta: {
    title: string;
    description: string;
    ogImage?: string;
  };
  redirectUrl?: string;
  trackingId: string;
}

export interface CreateShortLinkDto {
  partnerId: string;
  targetUrl: string;
  customSlug?: string;
  title?: string;
  description?: string;
  expiresAt?: Date;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface ShortLinkResult {
  id: string;
  slug: string;
  shortUrl: string;
  targetUrl: string;
  qrCode?: string;
  createdAt: Date;
}

// QR size configurations
const QR_SIZES: Record<string, number> = {
  small: 128,
  medium: 256,
  large: 512,
};

// Base URL for short links (configurable)
const SHORT_URL_BASE = process.env.SHORT_URL_BASE || 'https://neture.co.kr/p';

export class QRLandingService {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate QR code for partner link
   */
  async generateQRCode(dto: GenerateQRDto): Promise<QRCodeResult> {
    const {
      partnerId,
      linkId,
      targetUrl,
      customSlug,
      utmSource,
      utmMedium,
      utmCampaign,
      size = 'medium',
      format = 'svg',
      style = 'default',
      color = '#000000',
      backgroundColor = '#FFFFFF',
    } = dto;

    // Determine the slug
    let slug: string;
    let fullUrl: string;

    if (linkId) {
      // Use existing link's slug
      const linkRepo = this.dataSource.getRepository(PartnerLink);
      const link = await linkRepo.findOne({ where: { id: linkId } });
      if (!link) {
        throw new Error('Link not found');
      }
      slug = link.slug;
      fullUrl = this.buildFullUrl(slug, { utmSource, utmMedium, utmCampaign });
    } else if (customSlug) {
      slug = customSlug;
      fullUrl = this.buildFullUrl(slug, { utmSource, utmMedium, utmCampaign });
    } else {
      // Generate new slug
      slug = this.generateSlug();
      fullUrl = this.buildFullUrl(slug, { utmSource, utmMedium, utmCampaign });
    }

    const shortUrl = `${SHORT_URL_BASE}/${slug}`;
    const qrSize = QR_SIZES[size] || QR_SIZES.medium;

    // Generate QR code SVG
    const qrCode = this.generateQRCodeSVG(fullUrl, qrSize, color, backgroundColor, style);

    return {
      qrCode,
      shortUrl,
      slug,
      fullUrl,
      format,
      size: qrSize,
    };
  }

  /**
   * Build full URL with UTM parameters
   */
  private buildFullUrl(
    slug: string,
    utm: { utmSource?: string; utmMedium?: string; utmCampaign?: string }
  ): string {
    const baseUrl = `${SHORT_URL_BASE}/${slug}`;
    const params = new URLSearchParams();

    if (utm.utmSource) params.set('utm_source', utm.utmSource);
    if (utm.utmMedium) params.set('utm_medium', utm.utmMedium);
    if (utm.utmCampaign) params.set('utm_campaign', utm.utmCampaign);

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Generate random slug
   */
  private generateSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  }

  /**
   * Generate QR code as SVG
   * Note: This is a simplified implementation. In production, use a library like qrcode
   */
  private generateQRCodeSVG(
    data: string,
    size: number,
    color: string,
    bgColor: string,
    style: string
  ): string {
    // This is a placeholder SVG. In production, use a proper QR code library
    const moduleSize = size / 25;
    const modules = this.encodeToModules(data);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="${bgColor}"/>`;

    // Generate modules
    modules.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const px = x * moduleSize;
          const py = y * moduleSize;
          if (style === 'rounded') {
            svg += `<rect x="${px}" y="${py}" width="${moduleSize}" height="${moduleSize}" rx="${moduleSize / 4}" fill="${color}"/>`;
          } else if (style === 'dots') {
            const cx = px + moduleSize / 2;
            const cy = py + moduleSize / 2;
            svg += `<circle cx="${cx}" cy="${cy}" r="${moduleSize / 2.5}" fill="${color}"/>`;
          } else {
            svg += `<rect x="${px}" y="${py}" width="${moduleSize}" height="${moduleSize}" fill="${color}"/>`;
          }
        }
      });
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * Simple QR module encoding (placeholder - use proper library in production)
   */
  private encodeToModules(data: string): boolean[][] {
    // This is a simplified 25x25 grid representation
    // In production, use a proper QR encoding library
    const size = 25;
    const modules: boolean[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(false));

    // Add finder patterns (corners)
    this.addFinderPattern(modules, 0, 0);
    this.addFinderPattern(modules, size - 7, 0);
    this.addFinderPattern(modules, 0, size - 7);

    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
      modules[6][i] = i % 2 === 0;
      modules[i][6] = i % 2 === 0;
    }

    // Fill data area with pseudo-random pattern based on input
    const hash = this.simpleHash(data);
    for (let y = 8; y < size - 8; y++) {
      for (let x = 8; x < size - 8; x++) {
        if (x !== 6 && y !== 6) {
          modules[y][x] = ((hash + x * y) % 2) === 0;
        }
      }
    }

    return modules;
  }

  /**
   * Add finder pattern at position
   */
  private addFinderPattern(modules: boolean[][], x: number, y: number): void {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const isEdge = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const isCenter = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        modules[y + dy][x + dx] = isEdge || isCenter;
      }
    }
  }

  /**
   * Simple hash function for demo purposes
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get landing page data by slug
   */
  async getLandingPageData(slug: string): Promise<LandingPageData | null> {
    const linkRepo = this.dataSource.getRepository(PartnerLink);
    const profileRepo = this.dataSource.getRepository(PartnerProfile);

    // Try to find link by slug
    const link = await linkRepo.findOne({ where: { slug } });

    if (link) {
      const profile = await profileRepo.findOne({ where: { id: link.partnerId } });

      // Increment click count
      await linkRepo.update(link.id, {
        clickCount: () => 'click_count + 1',
      });

      return {
        partner: {
          id: profile?.id || link.partnerId,
          name: profile?.userId || 'Partner',
          profileImage: undefined,
          verified: profile?.status === 'active',
        },
        link: {
          id: link.id,
          title: link.title || 'Link',
          description: link.description || undefined,
          productId: link.productId || undefined,
          targetUrl: link.targetUrl || undefined,
        },
        meta: {
          title: `${link.title} - Cosmetics Partner`,
          description: link.description || '추천 화장품을 확인해보세요',
          ogImage: undefined,
        },
        redirectUrl: link.targetUrl || undefined,
        trackingId: `${link.id}-${Date.now()}`,
      };
    }

    // Try to find by partner referral code
    const profile = await profileRepo.findOne({ where: { referralCode: slug } });

    if (profile) {
      return {
        partner: {
          id: profile.id,
          name: profile.userId,
          profileImage: undefined,
          verified: profile.status === 'active',
        },
        meta: {
          title: `${profile.userId}의 뷰티 스토어`,
          description: profile.bio || '추천 화장품과 스킨케어 루틴을 만나보세요',
          ogImage: undefined,
        },
        trackingId: `profile-${profile.id}-${Date.now()}`,
      };
    }

    return null;
  }

  /**
   * Create short link
   */
  async createShortLink(dto: CreateShortLinkDto): Promise<ShortLinkResult> {
    const linkRepo = this.dataSource.getRepository(PartnerLink);

    // Check if custom slug is available
    if (dto.customSlug) {
      const existing = await linkRepo.findOne({ where: { slug: dto.customSlug } });
      if (existing) {
        throw new Error('Slug already in use');
      }
    }

    const slug = dto.customSlug || this.generateSlug();

    // Build target URL with UTM params
    let targetUrl = dto.targetUrl;
    if (dto.utmParams) {
      const url = new URL(targetUrl);
      if (dto.utmParams.source) url.searchParams.set('utm_source', dto.utmParams.source);
      if (dto.utmParams.medium) url.searchParams.set('utm_medium', dto.utmParams.medium);
      if (dto.utmParams.campaign) url.searchParams.set('utm_campaign', dto.utmParams.campaign);
      if (dto.utmParams.term) url.searchParams.set('utm_term', dto.utmParams.term);
      if (dto.utmParams.content) url.searchParams.set('utm_content', dto.utmParams.content);
      targetUrl = url.toString();
    }

    // Create link record
    const link = linkRepo.create({
      partnerId: dto.partnerId,
      slug,
      title: dto.title || 'Short Link',
      description: dto.description,
      targetUrl,
      clickCount: 0,
      conversionCount: 0,
    });

    const saved = await linkRepo.save(link);

    // Generate QR code for the link
    const qrResult = await this.generateQRCode({
      partnerId: dto.partnerId,
      linkId: saved.id,
    });

    return {
      id: saved.id,
      slug: saved.slug,
      shortUrl: `${SHORT_URL_BASE}/${saved.slug}`,
      targetUrl: saved.targetUrl || dto.targetUrl,
      qrCode: qrResult.qrCode,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Track click on short link
   */
  async trackClick(slug: string, metadata?: Record<string, unknown>): Promise<void> {
    const linkRepo = this.dataSource.getRepository(PartnerLink);

    const link = await linkRepo.findOne({ where: { slug } });
    if (link) {
      await linkRepo.update(link.id, {
        clickCount: () => 'click_count + 1',
      });
    }
  }

  /**
   * Get QR style options
   */
  async getQRStyles(): Promise<Array<{ id: string; name: string; description: string }>> {
    return [
      { id: 'default', name: '기본', description: '정사각형 모듈의 기본 QR' },
      { id: 'rounded', name: '라운드', description: '모서리가 둥근 모듈' },
      { id: 'dots', name: '도트', description: '원형 도트 스타일' },
    ];
  }

  /**
   * Get QR size options
   */
  async getQRSizes(): Promise<Array<{ id: string; name: string; pixels: number }>> {
    return [
      { id: 'small', name: '소형', pixels: 128 },
      { id: 'medium', name: '중형', pixels: 256 },
      { id: 'large', name: '대형', pixels: 512 },
    ];
  }
}
