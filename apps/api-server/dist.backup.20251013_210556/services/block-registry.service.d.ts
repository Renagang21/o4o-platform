/**
 * Block Registry Service
 * AI 페이지 생성을 위한 블록 관리 시스템 (SSOT)
 */
import { BlockInfo, BlockRegistryResponse } from '../types/block.types';
declare class BlockRegistryService {
    private static instance;
    private blocks;
    private categories;
    private lastUpdated;
    private schemaVersion;
    private constructor();
    static getInstance(): BlockRegistryService;
    /**
     * 기본 카테고리 초기화
     */
    private initializeDefaultCategories;
    /**
     * 내장 블록 등록
     */
    private registerBuiltinBlocks;
    /**
     * 블록 등록
     */
    register(name: string, info: BlockInfo): void;
    /**
     * 블록 제거
     */
    unregister(name: string): boolean;
    /**
     * 모든 블록 조회
     */
    getAll(): BlockInfo[];
    /**
     * 카테고리별 블록 조회
     */
    getByCategory(categoryName: string): BlockInfo[];
    /**
     * 단일 블록 조회
     */
    get(name: string): BlockInfo | undefined;
    /**
     * AI를 위한 포맷된 참조 데이터 생성
     */
    getAIReference(): BlockRegistryResponse;
    /**
     * 검색
     */
    search(query: string): BlockInfo[];
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
        schemaVersion: string;
        lastUpdated: string;
    };
}
export declare const blockRegistry: BlockRegistryService;
export {};
//# sourceMappingURL=block-registry.service.d.ts.map