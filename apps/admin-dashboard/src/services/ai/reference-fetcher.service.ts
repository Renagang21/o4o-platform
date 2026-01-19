/**
 * Reference Fetcher Service
 * 서버 우선 전략으로 블록/숏코드 참조 데이터를 가져옵니다
 * Phase 2: Server-First with Local Fallback
 */

import { authClient } from '@o4o/auth-client';
import { generateCompleteReference } from './block-registry-extractor';

interface ServerResponse {
  success: boolean;
  data: {
    schemaVersion: string;
    lastUpdated: string;
    total: number;
    categories: any[];
    blocks?: any[];
    shortcodes?: any[];
  };
}

interface CacheEntry {
  data: string;
  etag: string;
  timestamp: number;
}

class ReferenceFetcherService {
  private static instance: ReferenceFetcherService;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  // 경고 플래그
  private hasWarnedFallback = false;

  private constructor() {
  }

  static getInstance(): ReferenceFetcherService {
    if (!ReferenceFetcherService.instance) {
      ReferenceFetcherService.instance = new ReferenceFetcherService();
    }
    return ReferenceFetcherService.instance;
  }

  /**
   * 서버 우선 전략으로 전체 참조 데이터 가져오기
   */
  async fetchCompleteReference(): Promise<string> {
    try {
      // 1단계: 서버에서 데이터 가져오기 시도 (CPT 포함)
      const [blocksRef, shortcodesRef, cptRef] = await Promise.all([
        this.fetchFromServer('/ai/blocks/reference', 'blocks'),
        this.fetchFromServer('/ai/shortcodes/reference', 'shortcodes'),
        this.fetchCptReference().catch(() => null) // CPT 실패해도 계속 진행
      ]);

      const reference = this.formatServerReference(blocksRef, shortcodesRef, cptRef);

      // 서버 참조 데이터 로드 성공
      this.hasWarnedFallback = false;

      return reference;

    } catch (error) {
      // 2단계: 서버 실패 시 로컬 폴백
      const err = error as Error;
      console.warn('⚠️ 서버 참조 데이터 로드 실패, 로컬 폴백 사용:', err.message);

      // 관리자에게 경고 표시 (한 번만)
      if (!this.hasWarnedFallback) {
        this.showFallbackWarning(err);
        this.hasWarnedFallback = true;
      }

      return await this.fetchLocalFallback();
    }
  }

  /**
   * CPT 참조 데이터 가져오기
   */
  private async fetchCptReference(): Promise<any> {
    try {
      const response = await authClient.api.get('/cpt/types?active=true');
      const result = response.data;

      if (result.success && result.data) {
        return {
          success: true,
          cptTypes: result.data
        };
      }

      return null;
    } catch (error) {
      console.warn('CPT 참조 데이터 로드 실패:', error);
      return null;
    }
  }

  /**
   * 서버에서 데이터 가져오기 (ETag 캐싱 + 인증 지원)
   */
  private async fetchFromServer(endpoint: string, cacheKey: string): Promise<ServerResponse> {
    const cached = this.cache.get(cacheKey);

    // 캐시가 유효한 경우 캐시 사용
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return JSON.parse(cached.data);
    }

    try {
      const response = await authClient.api.get(endpoint);
      const data = response.data;

      // 새 데이터 캐싱
      this.cache.set(cacheKey, {
        data: JSON.stringify(data),
        etag: '', // authClient doesn't expose ETag easily, but we still cache
        timestamp: Date.now()
      });

      return data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;

        if (status === 401) {
          throw new Error('UNAUTHORIZED: 로그인이 필요합니다');
        }

        if (status === 403) {
          throw new Error('FORBIDDEN: 접근 권한이 없습니다');
        }

        throw new Error(`서버 응답 오류: ${status} ${error.response.statusText}`);
      }

      throw error;
    }
  }

  /**
   * 서버 응답을 AI 프롬프트 형식으로 포맷
   */
  private formatServerReference(blocksData: ServerResponse, shortcodesData: ServerResponse, cptData: any): string {
    let reference = '';

    // 블록 레퍼런스
    if (blocksData.success && blocksData.data.blocks) {
      reference += '=== 사용 가능한 블록 (Gutenberg Blocks) ===\n\n';

      const blocksByCategory = this.groupByCategory(
        blocksData.data.blocks,
        blocksData.data.categories
      );

      Object.entries(blocksByCategory).forEach(([categoryName, blocks]) => {
        reference += `${categoryName}:\n`;
        (blocks as any[]).forEach(block => {
          reference += `- ${block.name}: ${block.description}\n`;
          if (block.example?.text) {
            reference += `  예제: ${block.example.text}\n`;
          }
        });
        reference += '\n';
      });
    }

    // 숏코드 레퍼런스
    if (shortcodesData.success && shortcodesData.data.shortcodes) {
      reference += '\n=== 사용 가능한 숏코드 (Shortcodes) ===\n\n';

      const shortcodesByCategory = this.groupByCategory(
        shortcodesData.data.shortcodes,
        shortcodesData.data.categories
      );

      Object.entries(shortcodesByCategory).forEach(([categoryName, shortcodes]) => {
        reference += `${categoryName}:\n`;
        (shortcodes as any[]).forEach(sc => {
          reference += `- ${sc.usage}: ${sc.description}\n`;
          if (sc.parameters) {
            reference += `  파라미터: ${sc.parameters}\n`;
          }
          if (sc.examples?.[0]) {
            reference += `  예제: ${sc.examples[0]}\n`;
          }
        });
        reference += '\n';
      });

      reference += '숏코드는 o4o/shortcode 블록으로 삽입:\n';
      reference += '{"type": "o4o/shortcode", "content": {"shortcode": "[product id=\\"123\\"]"}}\n';
    }

    // ⭐ CPT 참조 데이터 추가
    if (cptData?.success && cptData.cptTypes?.length > 0) {
      reference += '\n=== 사용 가능한 Custom Post Types ===\n\n';
      reference += '다음 CPT들을 Universal Form으로 생성/편집 가능:\n\n';

      cptData.cptTypes.forEach((cpt: any) => {
        reference += `${cpt.slug} (${cpt.label || cpt.name}):\n`;
        reference += `- 설명: ${cpt.description || 'Custom Post Type'}\n`;

        // Form 블록 사용 예시
        reference += `- Form 블록 사용:\n`;
        reference += `  {"type": "o4o/universal-form", "attributes": {"postType": "${cpt.slug}"}, "innerBlocks": [...]}\n`;

        // ACF 필드가 있다면 표시
        if (cpt.fields && cpt.fields.length > 0) {
          reference += `- 사용 가능한 필드:\n`;
          cpt.fields.slice(0, 5).forEach((field: any) => {
            reference += `  * ${field.name} (${field.type})\n`;
          });
          if (cpt.fields.length > 5) {
            reference += `  ... 외 ${cpt.fields.length - 5}개\n`;
          }
        }

        reference += '\n';
      });

      reference += '중요: Universal Form Block을 사용하면 Post와 모든 CPT를 단일 블록으로 처리 가능!\n';
    }

    return reference;
  }

  /**
   * 카테고리별로 그룹핑
   */
  private groupByCategory(items: any[], categories: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    // 카테고리 맵 생성
    const categoryMap = new Map(
      categories.map(cat => [cat.name, cat.title || cat.description])
    );

    items.forEach(item => {
      const categoryName = categoryMap.get(item.category) || item.category;
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(item);
    });

    return grouped;
  }

  /**
   * 로컬 폴백 (기존 block-registry-extractor 사용)
   */
  private async fetchLocalFallback(): Promise<string> {
    return await generateCompleteReference();
  }

  /**
   * 관리자에게 폴백 경고 표시
   */
  private showFallbackWarning(error?: Error): void {
    const isAuthError = error?.message.includes('UNAUTHORIZED') || error?.message.includes('FORBIDDEN');

    if (isAuthError) {
      console.error(`
🔒 인증 오류: AI 참조 데이터 접근 권한이 없습니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${error?.message}
- 로그인 상태를 확인하세요
- 로컬 폴백 모드로 동작합니다 (구버전 데이터)
- 관리자 권한이 필요할 수 있습니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    } else {
      console.warn(`
⚠️ 경고: 서버 참조 데이터를 사용할 수 없습니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
로컬 폴백 모드로 동작 중입니다.
- 최신 블록/숏코드 정보가 반영되지 않을 수 있습니다
- API 서버 연결을 확인하세요
- 오류: ${error?.message || '알 수 없음'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    }

    // TODO: React toast 시스템과 통합
    // if (isAuthError) {
    //   toast.error('인증 오류 - 로그인이 필요합니다');
    // } else {
    //   toast.warn('서버 연결 실패 - 로컬 데이터 사용 중');
    // }
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 캐시 상태 확인
   */
  getCacheStatus(): { key: string; age: number; etag: string }[] {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.floor((now - entry.timestamp) / 1000), // 초 단위
      etag: entry.etag
    }));
  }

  /**
   * Phase 1-B: Block Registry를 JSON 형식으로 반환
   */
  async fetchBlockRegistryJSON(): Promise<any> {
    try {
      // 서버에서 블록 참조 데이터 가져오기
      const blocksData = await this.fetchFromServer('/ai/blocks/reference', 'blocks');

      if (blocksData.success && blocksData.data.blocks) {
        // 블록을 카테고리별로 그룹화
        const blocksByCategory = this.groupByCategory(
          blocksData.data.blocks,
          blocksData.data.categories
        );

        return {
          total: blocksData.data.total,
          categories: blocksByCategory,
          blocks: blocksData.data.blocks,
        };
      }

      // 서버 실패 시 로컬 폴백
      return this.fetchLocalBlockRegistryJSON();
    } catch (error) {
      console.warn('⚠️ 서버 블록 레지스트리 로드 실패, 로컬 사용:', error);
      return this.fetchLocalBlockRegistryJSON();
    }
  }

  /**
   * Phase 1-B: 로컬 Block Registry를 JSON으로 반환
   */
  private fetchLocalBlockRegistryJSON(): any {
    const { extractBlocksMetadata } = require('./block-registry-extractor');
    const blocks = extractBlocksMetadata();

    // 카테고리별로 그룹화
    const grouped = blocks.reduce((acc: any, block: any) => {
      const category = block.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(block);
      return acc;
    }, {});

    return {
      total: blocks.length,
      categories: grouped,
      blocks: blocks,
    };
  }

  /**
   * Phase 1-B: Design Tokens를 JSON 형식으로 반환
   * Phase 2-C: Theme Settings 연동 - 사이트 색상/폰트/레이아웃을 AI 생성기에 반영
   */
  async fetchDesignTokensJSON(): Promise<any> {
    // 기본값 정의 (폴백용) - @o4o/appearance-system의 defaultTokens와 동기화
    const defaults = {
      colors: {
        primary: '#2563EB',
        primaryHover: '#1D4ED8',
        primaryActive: '#1E3A8A',
        primarySoft: '#EFF6FF',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        surfaceMuted: '#F3F4F6',
        borderSubtle: '#E5E7EB',
        textPrimary: '#111827',
        textMuted: '#6B7280',
        buttonBg: '#2563EB',
        buttonText: '#ffffff',
        buttonBorder: '#2563EB',
        breadcrumbText: '#6c757d',
        breadcrumbLink: '#2563EB',
        breadcrumbSeparator: '#6c757d',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        sectionY: 80,
        blockGap: 24,
        gridGap: 24,
      },
      radius: {
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
      },
      typography: {
        fontFamilyHeading: 'Inter, Pretendard, sans-serif',
        fontFamilyBody: 'Inter, Pretendard, sans-serif',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSizeBase: '16px',
        lineHeightBase: 1.6,
        fontSize: {
          sm: '0.875rem',
          md: '1rem',
          lg: '1.25rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          bold: 700,
        },
        lineHeight: {
          tight: '1.25',
          normal: '1.5',
          relaxed: '1.75',
        },
      },
    };

    try {
      // Theme Settings에서 DesignTokens 가져오기
      const response = await authClient.api.get('/settings/theme');
      const settings = response.data?.data;

      // designTokens가 있으면 사용, 없으면 기본값
      if (settings?.designTokens) {
        return {
          ...defaults,
          ...settings.designTokens,
          // Deep merge for nested objects
          colors: { ...defaults.colors, ...settings.designTokens.colors },
          spacing: { ...defaults.spacing, ...settings.designTokens.spacing },
          radius: { ...defaults.radius, ...settings.designTokens.radius },
          typography: { ...defaults.typography, ...settings.designTokens.typography },
        };
      }

      // 기본값 사용
      console.warn('⚠️ 테마 설정에 designTokens가 없습니다. 기본값을 사용합니다.');
      return defaults;

    } catch (error) {
      console.warn('⚠️ 테마 설정 로드 실패, 기본 디자인 토큰을 사용합니다:', error);
      return defaults;
    }
  }

  /**
   * 색상을 어둡게 만드는 유틸리티 함수
   * @param hex - 16진수 색상 코드 (예: "#007bff")
   * @param percent - 어두워질 비율 (0-100)
   */
  private darkenColor(hex: string, percent: number): string {
    // #을 제거하고 RGB 추출
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round((num >> 16) * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(((num >> 8) & 0x00FF) * percent / 100));
    const b = Math.max(0, (num & 0x0000FF) - Math.round((num & 0x0000FF) * percent / 100));

    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }
}

export const referenceFetcher = ReferenceFetcherService.getInstance();
