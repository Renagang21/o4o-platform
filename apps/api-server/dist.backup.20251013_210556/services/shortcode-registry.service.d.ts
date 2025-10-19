/**
 * Shortcode Registry Service
 * AI 페이지 생성을 위한 shortcode 관리 시스템
 */
import { ShortcodeInfo, ShortcodeRegistryResponse } from '../types/shortcode.types';
declare class ShortcodeRegistryService {
    private static instance;
    private shortcodes;
    private categories;
    private lastUpdated;
    private schemaVersion;
    private constructor();
    static getInstance(): ShortcodeRegistryService;
    /**
     * 기본 카테고리 초기화
     */
    private initializeDefaultCategories;
    /**
     * 내장 shortcode 등록
     */
    private registerBuiltinShortcodes;
    /**
     * shortcode 등록
     */
    register(name: string, info: ShortcodeInfo): void;
    /**
     * shortcode 제거
     */
    unregister(name: string): boolean;
    /**
     * 모든 shortcode 조회
     */
    getAll(): ShortcodeInfo[];
    /**
     * 카테고리별 shortcode 조회
     */
    getByCategory(categoryName: string): ShortcodeInfo[];
    /**
     * 단일 shortcode 조회
     */
    get(name: string): ShortcodeInfo | undefined;
    /**
     * AI를 위한 포맷된 참조 데이터 생성
     */
    getAIReference(): ShortcodeRegistryResponse;
    /**
     * AI용 파라미터 포맷팅
     */
    private formatParametersForAI;
    /**
     * 검색
     */
    search(query: string): ShortcodeInfo[];
    /**
     * 통계 정보
     */
    getStats(): {
        total: number;
        categories: number;
        categoryStats: {
            category: string;
            count: number;
        }[];
        lastUpdated: string;
    };
}
export declare const shortcodeRegistry: ShortcodeRegistryService;
export {};
//# sourceMappingURL=shortcode-registry.service.d.ts.map