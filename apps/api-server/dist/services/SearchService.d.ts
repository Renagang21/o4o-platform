/**
 * 고급 검색 및 필터링 서비스
 * Elasticsearch 연동, 자동완성, 오타 교정
 */
import { Product } from '../entities/Product';
interface SearchQuery {
    query: string;
    filters?: {
        categories?: string[];
        brands?: string[];
        priceMin?: number;
        priceMax?: number;
        rating?: number;
        inStock?: boolean;
        attributes?: Record<string, string[]>;
        tags?: string[];
    };
    sort?: {
        field: 'relevance' | 'price' | 'rating' | 'popularity' | 'newest';
        order: 'asc' | 'desc';
    };
    page?: number;
    limit?: number;
    includeAggregations?: boolean;
}
interface SearchResult {
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
    aggregations?: {
        categories: AggregationBucket[];
        brands: AggregationBucket[];
        priceRanges: AggregationBucket[];
        ratings: AggregationBucket[];
        attributes: Record<string, AggregationBucket[]>;
    };
    suggestions?: string[];
    correctedQuery?: string;
    searchTime: number;
}
interface AggregationBucket {
    key: string;
    count: number;
    label?: string;
}
interface AutocompleteResult {
    suggestions: string[];
    products: Product[];
    categories: string[];
    brands: string[];
}
export declare class SearchService {
    private redis;
    private productRepository;
    private searchIndex;
    private synonyms;
    constructor();
    /**
     * 상품 검색
     */
    searchProducts(searchQuery: SearchQuery): Promise<SearchResult>;
    /**
     * 자동완성
     */
    autocomplete(query: string): Promise<AutocompleteResult>;
    /**
     * 인기 검색어
     */
    getTrendingSearches(limit?: number): Promise<string[]>;
    /**
     * 연관 검색어
     */
    getRelatedSearches(query: string): Promise<string[]>;
    /**
     * 필터 옵션 조회
     */
    getFilterOptions(category?: string): Promise<any>;
    /**
     * 검색어 전처리
     */
    private preprocessQuery;
    /**
     * 오타 교정
     */
    private correctSpelling;
    /**
     * 레벤슈타인 거리 계산
     */
    private levenshteinDistance;
    /**
     * 쿼리 확장 (동의어)
     */
    private expandQuery;
    /**
     * 필터 적용
     */
    private applyFilters;
    /**
     * 정렬 적용
     */
    private applySorting;
    /**
     * 집계 데이터 조회
     */
    private getAggregations;
    /**
     * 검색 제안 조회
     */
    private getSearchSuggestions;
    /**
     * 제안어 조회
     */
    private getSuggestions;
    /**
     * 검색 기록 저장
     */
    private saveSearchHistory;
    /**
     * 검색 인덱스 구축
     */
    private buildSearchIndex;
    /**
     * 토큰화
     */
    private tokenize;
    /**
     * 검색 통계
     */
    getSearchAnalytics(): Promise<any>;
}
export declare const searchService: SearchService;
export {};
//# sourceMappingURL=SearchService.d.ts.map