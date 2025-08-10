/**
 * 고급 검색 및 필터링 서비스
 * Elasticsearch 연동, 자동완성, 오타 교정
 */

import { AppDataSource } from '../database/connection';
import { Product } from '../entities/Product';
import logger from '../utils/simpleLogger';
import { Redis } from 'ioredis';

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

export class SearchService {
  private redis: Redis;
  private productRepository = AppDataSource.getRepository(Product);
  
  // 검색 인덱스 (실제로는 Elasticsearch)
  private searchIndex: Map<string, Set<string>> = new Map();
  private synonyms: Map<string, string[]> = new Map([
    ['phone', ['smartphone', 'mobile', 'cellphone', '휴대폰', '스마트폰']],
    ['laptop', ['notebook', 'computer', '노트북', '컴퓨터']],
    ['tv', ['television', 'monitor', '티비', '텔레비전']],
    ['earphone', ['headphone', 'earbuds', '이어폰', '헤드폰']]
  ]);

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    
    this.buildSearchIndex();
  }

  /**
   * 상품 검색
   */
  async searchProducts(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    // 검색어 처리
    const processedQuery = this.preprocessQuery(searchQuery.query);
    const correctedQuery = this.correctSpelling(processedQuery);
    
    // 검색 쿼리 확장 (동의어)
    const expandedQuery = this.expandQuery(correctedQuery);
    
    // 기본 쿼리 빌더
    let query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.status = :status', { status: 'active' });

    // 텍스트 검색
    if (expandedQuery.length > 0) {
      const searchConditions = expandedQuery.map(term => 
        `(product.name LIKE :term OR product.description LIKE :term OR product.tags LIKE :term)`
      ).join(' OR ');
      
      expandedQuery.forEach(term => {
        query.setParameter('term', `%${term}%`);
      });
      
      query.andWhere(`(${searchConditions})`);
    }

    // 필터 적용
    query = this.applyFilters(query, searchQuery.filters);

    // 정렬 적용
    query = this.applySorting(query, searchQuery.sort);

    // 페이징
    const page = searchQuery.page || 1;
    const limit = searchQuery.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    // 실행
    const [products, total] = await query.getManyAndCount();

    // 집계 데이터
    let aggregations;
    if (searchQuery.includeAggregations) {
      aggregations = await this.getAggregations(searchQuery);
    }

    // 검색 제안
    const suggestions = await this.getSearchSuggestions(searchQuery.query);

    // 검색 기록 저장
    await this.saveSearchHistory(searchQuery.query, total);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      aggregations,
      suggestions,
      correctedQuery: correctedQuery !== processedQuery ? correctedQuery : undefined,
      searchTime: Date.now() - startTime
    };
  }

  /**
   * 자동완성
   */
  async autocomplete(query: string): Promise<AutocompleteResult> {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (normalizedQuery.length < 2) {
      return {
        suggestions: [],
        products: [],
        categories: [],
        brands: []
      };
    }

    // Redis에서 캐시된 결과 조회
    const cacheKey = `autocomplete:${normalizedQuery}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // 검색어 제안
    const suggestions = await this.getSuggestions(normalizedQuery);
    
    // 인기 상품
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('LOWER(product.name) LIKE :query', { query: `${normalizedQuery}%` })
      .andWhere('product.status = :status', { status: 'active' })
      .orderBy('product.salesCount', 'DESC')
      .limit(5)
      .getMany();

    // 카테고리 제안
    const categories = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT category.name', 'name')
      .innerJoin('product.category', 'category')
      .where('LOWER(category.name) LIKE :query', { query: `%${normalizedQuery}%` })
      .limit(5)
      .getRawMany();

    // 브랜드 제안
    const brands = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.brand', 'brand')
      .where('LOWER(product.brand) LIKE :query', { query: `%${normalizedQuery}%` })
      .andWhere('product.brand IS NOT NULL')
      .limit(5)
      .getRawMany();

    const result = {
      suggestions: suggestions.slice(0, 10),
      products,
      categories: categories.map(c => c.name),
      brands: brands.map(b => b.brand)
    };

    // 캐시 저장 (5분)
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  /**
   * 인기 검색어
   */
  async getTrendingSearches(limit: number = 10): Promise<string[]> {
    const searches = await this.redis.zrevrange('trending_searches', 0, limit - 1);
    return searches;
  }

  /**
   * 연관 검색어
   */
  async getRelatedSearches(query: string): Promise<string[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // 같은 세션에서 검색된 다른 검색어들
    const relatedKey = `related:${normalizedQuery}`;
    const related = await this.redis.smembers(relatedKey);
    
    if (related.length === 0) {
      // 유사한 상품명 기반 제안
      const products = await this.productRepository
        .createQueryBuilder('product')
        .select('product.name')
        .where('LOWER(product.name) LIKE :query', { query: `%${normalizedQuery}%` })
        .limit(20)
        .getMany();

      // 상품명에서 키워드 추출
      const keywords = new Set<string>();
      products.forEach(p => {
        const words = p.name.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 2 && word !== normalizedQuery) {
            keywords.add(word);
          }
        });
      });

      return Array.from(keywords).slice(0, 8);
    }

    return related.slice(0, 8);
  }

  /**
   * 필터 옵션 조회
   */
  async getFilterOptions(category?: string): Promise<any> {
    const baseQuery = this.productRepository
      .createQueryBuilder('product')
      .where('product.status = :status', { status: 'active' });

    if (category) {
      baseQuery.andWhere('product.categoryId = :category', { category });
    }

    // 브랜드 목록
    const brands = await baseQuery
      .clone()
      .select('DISTINCT product.brand', 'brand')
      .addSelect('COUNT(*)', 'count')
      .groupBy('product.brand')
      .orderBy('count', 'DESC')
      .getRawMany();

    // 가격 범위
    const priceRange = await baseQuery
      .clone()
      .select('MIN(product.price)', 'min')
      .addSelect('MAX(product.price)', 'max')
      .getRawOne();

    // 속성 목록 (색상, 사이즈 등)
    // 실제로는 ProductAttribute 테이블에서 조회
    const attributes = {
      colors: ['Black', 'White', 'Blue', 'Red', 'Gray'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      materials: ['Cotton', 'Polyester', 'Leather', 'Wool']
    };

    return {
      brands: brands.filter(b => b.brand),
      priceRange: {
        min: priceRange?.min || 0,
        max: priceRange?.max || 1000000
      },
      attributes
    };
  }

  /**
   * 검색어 전처리
   */
  private preprocessQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s가-힣]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' '); // 연속 공백 제거
  }

  /**
   * 오타 교정
   */
  private correctSpelling(query: string): string {
    // 간단한 레벤슈타인 거리 기반 교정
    const commonWords = [
      'iphone', 'samsung', 'galaxy', 'macbook', 'airpods',
      'playstation', 'nintendo', 'xbox', 'television'
    ];

    const words = query.split(' ');
    const corrected = words.map(word => {
      for (const correct of commonWords) {
        if (this.levenshteinDistance(word, correct) <= 2) {
          return correct;
        }
      }
      return word;
    });

    return corrected.join(' ');
  }

  /**
   * 레벤슈타인 거리 계산
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * 쿼리 확장 (동의어)
   */
  private expandQuery(query: string): string[] {
    const words = query.split(' ');
    const expanded = new Set(words);

    words.forEach(word => {
      const synonymList = this.synonyms.get(word);
      if (synonymList) {
        synonymList.forEach(synonym => expanded.add(synonym));
      }
    });

    return Array.from(expanded);
  }

  /**
   * 필터 적용
   */
  private applyFilters(query: any, filters?: SearchQuery['filters']): any {
    if (!filters) return query;

    // 카테고리 필터
    if (filters.categories && filters.categories.length > 0) {
      query.andWhere('product.categoryId IN (:...categories)', {
        categories: filters.categories
      });
    }

    // 브랜드 필터
    if (filters.brands && filters.brands.length > 0) {
      query.andWhere('product.brand IN (:...brands)', {
        brands: filters.brands
      });
    }

    // 가격 필터
    if (filters.priceMin !== undefined) {
      query.andWhere('product.price >= :priceMin', {
        priceMin: filters.priceMin
      });
    }
    if (filters.priceMax !== undefined) {
      query.andWhere('product.price <= :priceMax', {
        priceMax: filters.priceMax
      });
    }

    // 평점 필터
    if (filters.rating !== undefined) {
      query.andWhere('product.rating >= :rating', {
        rating: filters.rating
      });
    }

    // 재고 필터
    if (filters.inStock) {
      query.andWhere('product.stock > 0');
    }

    // 태그 필터
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(tag => 
        `product.tags LIKE :tag${filters.tags.indexOf(tag)}`
      ).join(' OR ');
      
      filters.tags.forEach((tag, index) => {
        query.setParameter(`tag${index}`, `%${tag}%`);
      });
      
      query.andWhere(`(${tagConditions})`);
    }

    return query;
  }

  /**
   * 정렬 적용
   */
  private applySorting(query: any, sort?: SearchQuery['sort']): any {
    if (!sort) {
      // 기본 정렬: 관련도
      return query.orderBy('product.salesCount', 'DESC');
    }

    switch (sort.field) {
      case 'price':
        query.orderBy('product.price', sort.order.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'rating':
        query.orderBy('product.rating', sort.order.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'popularity':
        query.orderBy('product.salesCount', sort.order.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'newest':
        query.orderBy('product.createdAt', 'DESC');
        break;
      case 'relevance':
      default:
        // 관련도 정렬 (검색어 매칭 수 등)
        query.orderBy('product.salesCount', 'DESC');
    }

    return query;
  }

  /**
   * 집계 데이터 조회
   */
  private async getAggregations(searchQuery: SearchQuery): Promise<any> {
    // 카테고리별 개수
    const categories = await this.productRepository
      .createQueryBuilder('product')
      .select('category.id', 'key')
      .addSelect('category.name', 'label')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('product.category', 'category')
      .where('product.status = :status', { status: 'active' })
      .groupBy('category.id')
      .orderBy('count', 'DESC')
      .getRawMany();

    // 브랜드별 개수
    const brands = await this.productRepository
      .createQueryBuilder('product')
      .select('product.brand', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.brand IS NOT NULL')
      .groupBy('product.brand')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    // 가격대별 개수
    const priceRanges = [
      { key: '0-10000', label: '1만원 이하', min: 0, max: 10000 },
      { key: '10000-50000', label: '1-5만원', min: 10000, max: 50000 },
      { key: '50000-100000', label: '5-10만원', min: 50000, max: 100000 },
      { key: '100000-500000', label: '10-50만원', min: 100000, max: 500000 },
      { key: '500000+', label: '50만원 이상', min: 500000, max: 999999999 }
    ];

    const priceAggs = await Promise.all(
      priceRanges.map(async range => {
        const count = await this.productRepository
          .createQueryBuilder('product')
          .where('product.status = :status', { status: 'active' })
          .andWhere('product.price BETWEEN :min AND :max', {
            min: range.min,
            max: range.max
          })
          .getCount();

        return {
          key: range.key,
          label: range.label,
          count
        };
      })
    );

    // 평점별 개수
    const ratings = await Promise.all(
      [4, 3, 2, 1].map(async rating => {
        const count = await this.productRepository
          .createQueryBuilder('product')
          .where('product.status = :status', { status: 'active' })
          .andWhere('product.rating >= :rating', { rating })
          .andWhere('product.rating < :nextRating', { nextRating: rating + 1 })
          .getCount();

        return {
          key: `${rating}`,
          label: `${rating}점 이상`,
          count
        };
      })
    );

    return {
      categories,
      brands,
      priceRanges: priceAggs,
      ratings,
      attributes: {} // 실제로는 속성별 집계
    };
  }

  /**
   * 검색 제안 조회
   */
  private async getSearchSuggestions(query: string): Promise<string[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // 최근 인기 검색어에서 유사한 것 찾기
    const trending = await this.redis.zrevrange('trending_searches', 0, 100);
    
    return trending
      .filter(search => search.includes(normalizedQuery))
      .slice(0, 5);
  }

  /**
   * 제안어 조회
   */
  private async getSuggestions(query: string): Promise<string[]> {
    // 검색 기록에서 조회
    const history = await this.redis.zrevrange(`search_history:${query}*`, 0, 10);
    
    // 상품명에서 조회
    const products = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.name')
      .where('LOWER(product.name) LIKE :query', { query: `%${query}%` })
      .limit(10)
      .getRawMany();

    const suggestions = new Set<string>([
      ...history,
      ...products.map(p => p.name.toLowerCase())
    ]);

    return Array.from(suggestions).slice(0, 10);
  }

  /**
   * 검색 기록 저장
   */
  private async saveSearchHistory(query: string, resultCount: number): Promise<void> {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (normalizedQuery.length < 2) return;

    // 검색 횟수 증가
    await this.redis.zincrby('trending_searches', 1, normalizedQuery);
    
    // 검색 기록 저장
    await this.redis.zadd(
      `search_history:${normalizedQuery}`,
      Date.now(),
      normalizedQuery
    );
    
    // 검색 통계
    await this.redis.hincrby('search_stats', normalizedQuery, 1);
    
    // 검색 결과 없는 쿼리 추적
    if (resultCount === 0) {
      await this.redis.sadd('no_result_queries', normalizedQuery);
    }
  }

  /**
   * 검색 인덱스 구축
   */
  private async buildSearchIndex(): Promise<void> {
    // 실제로는 Elasticsearch 인덱싱
    const products = await this.productRepository.find();
    
    products.forEach(product => {
      const tokens = this.tokenize(product.name + ' ' + product.description);
      tokens.forEach(token => {
        if (!this.searchIndex.has(token)) {
          this.searchIndex.set(token, new Set());
        }
        this.searchIndex.get(token)?.add(product.id);
      });
    });
    
    logger.info(`Search index built with ${this.searchIndex.size} tokens`);
  }

  /**
   * 토큰화
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  /**
   * 검색 통계
   */
  async getSearchAnalytics(): Promise<any> {
    const topSearches = await this.redis.zrevrange('trending_searches', 0, 20, 'WITHSCORES');
    const noResultQueries = await this.redis.smembers('no_result_queries');
    
    // 배열을 객체로 변환
    const searchCounts: Record<string, number> = {};
    for (let i = 0; i < topSearches.length; i += 2) {
      searchCounts[topSearches[i]] = parseInt(topSearches[i + 1]);
    }

    return {
      topSearches: searchCounts,
      noResultQueries,
      totalSearches: Object.values(searchCounts).reduce((a, b) => a + b, 0)
    };
  }
}

// 싱글톤 인스턴스
export const searchService = new SearchService();