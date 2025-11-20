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

      return this.fetchLocalFallback();
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
  private fetchLocalFallback(): string {
    return generateCompleteReference();
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
   */
  async fetchDesignTokensJSON(): Promise<any> {
    // Phase 1-B: 기본 Design Tokens 반환
    // appearance-system은 아직 완전히 구축되지 않았으므로 기본값 사용
    return {
      colors: {
        primary: '#007bff',
        primaryHover: '#0056b3',
        primaryActive: '#004085',
        buttonBg: '#007bff',
        buttonText: '#ffffff',
        buttonBorder: '#007bff',
        breadcrumbText: '#6c757d',
        breadcrumbLink: '#007bff',
        breadcrumbSeparator: '#6c757d',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        'section-sm': '2rem',
        'section-md': '4rem',
        'section-lg': '6rem',
      },
      radius: {
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
        full: '9999px',
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          md: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
          '2xl': '2rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeight: {
          tight: '1.25',
          normal: '1.5',
          relaxed: '1.75',
        },
      },
    };
  }
}

export const referenceFetcher = ReferenceFetcherService.getInstance();
