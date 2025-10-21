/**
 * Reference Fetcher Service
 * 서버 우선 전략으로 블록/숏코드 참조 데이터를 가져옵니다
 * Phase 2: Server-First with Local Fallback
 */

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
  private readonly API_BASE: string;

  // 경고 플래그
  private hasWarnedFallback = false;

  private constructor() {
    // Vite 환경변수 또는 기본값 사용
    this.API_BASE = this.getApiBaseUrl();
  }

  /**
   * API Base URL 가져오기 (환경변수 또는 기본값)
   */
  private getApiBaseUrl(): string {
    // Vite 환경변수 확인
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
      return import.meta.env.VITE_API_URL as string;
    }
    // 프로덕션 환경에서는 현재 호스트의 API 엔드포인트 사용
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'admin.neture.co.kr') {
        return 'https://api.neture.co.kr';
      }
    }
    // 개발 환경 기본값
    return 'http://localhost:3002';
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
        this.fetchFromServer('/api/ai/blocks/reference', 'blocks'),
        this.fetchFromServer('/api/ai/shortcodes/reference', 'shortcodes'),
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
      const url = `${this.API_BASE}/cpt/types?active=true`;
      const token = this.getAuthToken();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`CPT 데이터 로드 실패: ${response.status}`);
      }

      const result = await response.json();

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
   * 인증 토큰 가져오기
   */
  private getAuthToken(): string | null {
    // Cookie에서 accessToken 가져오기 (우선순위)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') {
        return value;
      }
    }

    // localStorage에서 가져오기 (폴백)
    return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
  }

  /**
   * 서버에서 데이터 가져오기 (ETag 캐싱 + 인증 지원)
   */
  private async fetchFromServer(endpoint: string, cacheKey: string): Promise<ServerResponse> {
    const url = `${this.API_BASE}${endpoint}`;
    const cached = this.cache.get(cacheKey);

    // 캐시가 유효한 경우 캐시 사용
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return JSON.parse(cached.data);
    }

    // 인증 토큰 가져오기
    const token = this.getAuthToken();

    // ETag 및 인증 헤더 추가
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    // 401/403 인증 오류 처리
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED: 로그인이 필요합니다');
    }

    if (response.status === 403) {
      throw new Error('FORBIDDEN: 접근 권한이 없습니다');
    }

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
    }

    // 304 Not Modified - 캐시 재사용
    if (response.status === 304 && cached) {
      cached.timestamp = Date.now(); // 타임스탬프 갱신
      return JSON.parse(cached.data);
    }

    const data = await response.json();

    // 새 데이터 캐싱
    const etag = response.headers.get('ETag');
    if (etag) {
      this.cache.set(cacheKey, {
        data: JSON.stringify(data),
        etag,
        timestamp: Date.now()
      });
    }

    return data;
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

      reference += '숏코드는 core/shortcode 블록으로 삽입:\n';
      reference += '{"type": "core/shortcode", "content": {"shortcode": "[product id=\\"123\\"]"}}\n';
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
- API 서버 연결을 확인하세요: ${this.API_BASE}
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
}

export const referenceFetcher = ReferenceFetcherService.getInstance();
