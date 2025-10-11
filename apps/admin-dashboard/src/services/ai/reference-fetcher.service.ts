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
      // 1단계: 서버에서 데이터 가져오기 시도
      const [blocksRef, shortcodesRef] = await Promise.all([
        this.fetchFromServer('/api/ai/blocks/reference', 'blocks'),
        this.fetchFromServer('/api/ai/shortcodes/reference', 'shortcodes')
      ]);

      const reference = this.formatServerReference(blocksRef, shortcodesRef);

      console.log('✅ 서버로부터 최신 참조 데이터 로드 성공');
      this.hasWarnedFallback = false;

      return reference;

    } catch (error) {
      // 2단계: 서버 실패 시 로컬 폴백
      console.warn('⚠️ 서버 참조 데이터 로드 실패, 로컬 폴백 사용:', error);

      // 관리자에게 경고 표시 (한 번만)
      if (!this.hasWarnedFallback) {
        this.showFallbackWarning();
        this.hasWarnedFallback = true;
      }

      return this.fetchLocalFallback();
    }
  }

  /**
   * 서버에서 데이터 가져오기 (ETag 캐싱 지원)
   */
  private async fetchFromServer(endpoint: string, cacheKey: string): Promise<ServerResponse> {
    const url = `${this.API_BASE}${endpoint}`;
    const cached = this.cache.get(cacheKey);

    // 캐시가 유효한 경우 캐시 사용
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`📦 캐시된 ${cacheKey} 데이터 사용`);
      return JSON.parse(cached.data);
    }

    // ETag 헤더 추가
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
    }

    // 304 Not Modified - 캐시 재사용
    if (response.status === 304 && cached) {
      console.log(`✅ ${cacheKey} 데이터 변경 없음 (304)`);
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
  private formatServerReference(blocksData: ServerResponse, shortcodesData: ServerResponse): string {
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
    console.log('📂 로컬 레지스트리에서 참조 데이터 로드');
    return generateCompleteReference();
  }

  /**
   * 관리자에게 폴백 경고 표시
   */
  private showFallbackWarning(): void {
    // React toast/alert 시스템이 있다면 여기서 사용
    console.warn(`
⚠️ 경고: 서버 참조 데이터를 사용할 수 없습니다
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
로컬 폴백 모드로 동작 중입니다.
- 최신 블록/숏코드 정보가 반영되지 않을 수 있습니다
- API 서버 연결을 확인하세요: ${this.API_BASE}
- 네트워크 관리자에게 문의하세요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // TODO: React toast 시스템과 통합
    // toast.warn('서버 연결 실패 - 로컬 데이터 사용 중');
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ 참조 데이터 캐시 초기화됨');
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
