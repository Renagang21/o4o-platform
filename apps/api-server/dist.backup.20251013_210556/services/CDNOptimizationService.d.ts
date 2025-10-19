interface OptimizationStats {
    successful: number;
    failed: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    totalSavings: number;
}
/**
 * CDN 최적화 서비스
 *
 * 핵심 기능:
 * - 정적 자산 최적화
 * - 이미지 압축 및 변환
 * - 캐시 전략 관리
 * - 지역별 CDN 배포
 * - 자산 버전 관리
 */
export declare class CDNOptimizationService {
    private redis;
    private analyticsService;
    private staticAssetsPath;
    private optimizedAssetsPath;
    private cdnConfig;
    private compressionSettings;
    constructor();
    /**
     * CDN 설정 초기화
     */
    private initializeCDNConfig;
    /**
     * 압축 설정 초기화
     */
    private initializeCompressionSettings;
    /**
     * 최적화 작업 시작
     */
    private startOptimizationTasks;
    /**
     * 자산 최적화 실행
     */
    optimizeAssets(): Promise<void>;
    /**
     * 최적화 대상 자산 스캔
     */
    private scanAssetsForOptimization;
    /**
     * 디렉토리 재귀 스캔
     */
    private scanDirectory;
    /**
     * 자산 타입 결정
     */
    private getAssetType;
    /**
     * 파일 해시 계산
     */
    private calculateFileHash;
    /**
     * 최적화 필요성 판단
     */
    private needsOptimization;
    /**
     * 개별 자산 최적화
     */
    private optimizeAsset;
    /**
     * 이미지 최적화
     */
    private optimizeImage;
    /**
     * 비디오 최적화
     */
    private optimizeVideo;
    /**
     * 스크립트 최적화
     */
    private optimizeScript;
    /**
     * JavaScript 최소화
     */
    private minifyJS;
    /**
     * CSS 최소화
     */
    private minifyCSS;
    /**
     * 최적화 결과 저장
     */
    private saveOptimizationResults;
    /**
     * CDN 캐시 모니터링
     */
    private monitorCDNCache;
    /**
     * CDN 캐시 통계 조회
     */
    private getCDNCacheStats;
    /**
     * 자산 사용량 분석
     */
    private analyzeAssetUsage;
    /**
     * 자산 사용량 통계 조회
     */
    private getAssetUsageStats;
    /**
     * 자산 CDN 배포
     */
    private deployAssetToCDN;
    /**
     * CDN 알림 생성
     */
    private createCDNAlert;
    /**
     * 자산 URL 최적화
     */
    getOptimizedAssetUrl(originalPath: string, options?: AssetUrlOptions): string;
    /**
     * 반응형 이미지 소스셋 생성
     */
    generateResponsiveImageSrcset(originalPath: string, options?: ResponsiveImageOptions): string;
    /**
     * 캐시 무효화
     */
    invalidateCache(paths: string[]): Promise<void>;
    /**
     * CDN 성능 리포트 생성
     */
    generateCDNReport(): Promise<CDNReport>;
    /**
     * 최적화 통계 조회
     */
    private getOptimizationStats;
    /**
     * CDN 권장사항 생성
     */
    private generateCDNRecommendations;
    /**
     * 서비스 종료
     */
    shutdown(): Promise<void>;
}
interface CDNCacheStats {
    hits: number;
    misses: number;
    bandwidth: number;
    requests: number;
    regions: {
        name: string;
        hits: number;
        misses: number;
        bandwidth: number;
    }[];
}
interface AssetUsageStats {
    path: string;
    requests: number;
    bandwidth: number;
    lastAccessed: string;
}
interface AssetUrlOptions {
    format?: string;
    quality?: string | number;
    width?: number;
    height?: number;
    region?: string;
}
interface ResponsiveImageOptions {
    sizes?: number[];
    format?: string;
    quality?: number;
}
interface CDNReport {
    generatedAt: string;
    period: {
        start: string;
        end: string;
    };
    cacheStats: CDNCacheStats;
    optimizationStats: OptimizationStats;
    assetUsage: AssetUsageStats[];
    recommendations: string[];
}
export declare const cdnOptimizationService: CDNOptimizationService;
export {};
//# sourceMappingURL=CDNOptimizationService.d.ts.map