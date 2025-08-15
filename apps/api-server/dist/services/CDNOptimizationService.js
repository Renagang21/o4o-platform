"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdnOptimizationService = exports.CDNOptimizationService = void 0;
const perf_hooks_1 = require("perf_hooks");
const ioredis_1 = __importDefault(require("ioredis"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
const AnalyticsService_1 = require("./AnalyticsService");
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
class CDNOptimizationService {
    constructor() {
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        });
        this.analyticsService = new AnalyticsService_1.AnalyticsService();
        this.staticAssetsPath = path_1.default.join(process.cwd(), 'public');
        this.optimizedAssetsPath = path_1.default.join(process.cwd(), 'public', 'optimized');
        this.initializeCDNConfig();
        this.initializeCompressionSettings();
        this.startOptimizationTasks();
    }
    /**
     * CDN 설정 초기화
     */
    initializeCDNConfig() {
        this.cdnConfig = {
            enabled: process.env.CDN_ENABLED === 'true',
            baseUrl: process.env.CDN_BASE_URL || 'https://cdn.neture.co.kr',
            regions: [
                { name: 'asia-northeast-1', url: 'https://cdn-ap1.neture.co.kr' },
                { name: 'us-east-1', url: 'https://cdn-us1.neture.co.kr' },
                { name: 'eu-west-1', url: 'https://cdn-eu1.neture.co.kr' }
            ],
            assetTypes: {
                images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
                videos: ['mp4', 'webm', 'ogg'],
                documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
                fonts: ['woff', 'woff2', 'ttf', 'otf'],
                scripts: ['js', 'css'],
                others: ['json', 'xml', 'txt']
            },
            cacheSettings: {
                images: { maxAge: 86400 * 30, sMaxAge: 86400 * 365 }, // 30일/1년
                videos: { maxAge: 86400 * 7, sMaxAge: 86400 * 180 }, // 7일/6개월
                documents: { maxAge: 86400 * 1, sMaxAge: 86400 * 30 }, // 1일/30일
                fonts: { maxAge: 86400 * 365, sMaxAge: 86400 * 365 }, // 1년/1년
                scripts: { maxAge: 86400 * 7, sMaxAge: 86400 * 30 }, // 7일/30일
                others: { maxAge: 86400 * 1, sMaxAge: 86400 * 7 } // 1일/7일
            }
        };
    }
    /**
     * 압축 설정 초기화
     */
    initializeCompressionSettings() {
        this.compressionSettings = {
            images: {
                jpeg: { quality: 80, progressive: true, mozjpeg: true },
                png: { compressionLevel: 9, progressive: true },
                webp: { quality: 85, effort: 6 },
                avif: { quality: 80, effort: 6 }
            },
            videos: {
                mp4: { crf: 23, preset: 'medium' },
                webm: { crf: 30, preset: 'medium' }
            },
            scripts: {
                js: { minify: true, compress: true },
                css: { minify: true, compress: true }
            }
        };
    }
    /**
     * 최적화 작업 시작
     */
    startOptimizationTasks() {
        // 주기적 자산 최적화
        setInterval(() => {
            this.optimizeAssets();
        }, 3600000); // 1시간마다
        // CDN 캐시 상태 모니터링
        setInterval(() => {
            this.monitorCDNCache();
        }, 300000); // 5분마다
        // 자산 사용량 분석
        setInterval(() => {
            this.analyzeAssetUsage();
        }, 1800000); // 30분마다
    }
    /**
     * 자산 최적화 실행
     */
    async optimizeAssets() {
        try {
            // console.log('🔄 Starting asset optimization...');
            // 최적화 대상 자산 스캔
            const assetsToOptimize = await this.scanAssetsForOptimization();
            // 자산 타입별 최적화
            const optimizationTasks = assetsToOptimize.map(async (asset) => {
                try {
                    return await this.optimizeAsset(asset);
                }
                catch (error) {
                    console.error(`Failed to optimize asset ${asset.path}:`, error);
                    return null;
                }
            });
            const results = await Promise.allSettled(optimizationTasks);
            const successful = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected').length;
            // console.log(`✅ Asset optimization completed: ${successful} successful, ${failed} failed`);
            // 최적화 결과 저장
            await this.saveOptimizationResults(results);
        }
        catch (error) {
            console.error('❌ Asset optimization failed:', error);
        }
    }
    /**
     * 최적화 대상 자산 스캔
     */
    async scanAssetsForOptimization() {
        const assets = [];
        try {
            await this.scanDirectory(this.staticAssetsPath, assets);
            // 최적화 필요한 자산 필터링
            const assetsToOptimize = assets.filter((asset) => {
                return this.needsOptimization(asset);
            });
            return assetsToOptimize;
        }
        catch (error) {
            console.error('Failed to scan assets:', error);
            return [];
        }
    }
    /**
     * 디렉토리 재귀 스캔
     */
    async scanDirectory(dirPath, assets) {
        try {
            const entries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath, assets);
                }
                else if (entry.isFile()) {
                    const stat = await fs_1.promises.stat(fullPath);
                    const ext = path_1.default.extname(entry.name).toLowerCase().slice(1);
                    assets.push({
                        path: fullPath,
                        relativePath: path_1.default.relative(this.staticAssetsPath, fullPath),
                        name: entry.name,
                        extension: ext,
                        size: stat.size,
                        mtime: stat.mtime,
                        type: this.getAssetType(ext),
                        hash: await this.calculateFileHash(fullPath)
                    });
                }
            }
        }
        catch (error) {
            console.warn(`Failed to scan directory ${dirPath}:`, error);
        }
    }
    /**
     * 자산 타입 결정
     */
    getAssetType(extension) {
        for (const [type, extensions] of Object.entries(this.cdnConfig.assetTypes)) {
            if (extensions.includes(extension)) {
                return type;
            }
        }
        return 'others';
    }
    /**
     * 파일 해시 계산
     */
    async calculateFileHash(filePath) {
        try {
            const content = await fs_1.promises.readFile(filePath);
            return crypto_1.default.createHash('md5').update(content).digest('hex');
        }
        catch (error) {
            console.warn(`Failed to calculate hash for ${filePath}:`, error);
            return '';
        }
    }
    /**
     * 최적화 필요성 판단
     */
    needsOptimization(asset) {
        // 이미 최적화된 자산인지 확인
        if (asset.relativePath.startsWith('optimized/')) {
            return false;
        }
        // 최적화 대상 타입인지 확인
        const optimizableTypes = ['images', 'videos', 'scripts'];
        if (!optimizableTypes.includes(asset.type)) {
            return false;
        }
        // 최소 크기 제한 (1KB 이상)
        if (asset.size < 1024) {
            return false;
        }
        return true;
    }
    /**
     * 개별 자산 최적화
     */
    async optimizeAsset(asset) {
        const startTime = perf_hooks_1.performance.now();
        try {
            let result;
            switch (asset.type) {
                case 'images':
                    result = await this.optimizeImage(asset);
                    break;
                case 'videos':
                    result = await this.optimizeVideo(asset);
                    break;
                case 'scripts':
                    result = await this.optimizeScript(asset);
                    break;
                default:
                    result = {
                        original: asset,
                        optimized: null,
                        success: false,
                        error: 'Unsupported asset type'
                    };
            }
            result.processingTime = perf_hooks_1.performance.now() - startTime;
            return result;
        }
        catch (error) {
            return {
                original: asset,
                optimized: null,
                success: false,
                error: error.message,
                processingTime: perf_hooks_1.performance.now() - startTime
            };
        }
    }
    /**
     * 이미지 최적화
     */
    async optimizeImage(asset) {
        const formats = ['webp', 'avif']; // 현대적 형식으로 변환
        const optimizedVersions = [];
        try {
            // 원본 이미지 정보 가져오기
            const image = (0, sharp_1.default)(asset.path);
            const metadata = await image.metadata();
            // 다양한 형식으로 최적화
            for (const format of formats) {
                const outputPath = path_1.default.join(this.optimizedAssetsPath, path_1.default.dirname(asset.relativePath), `${path_1.default.parse(asset.name).name}.${format}`);
                // 출력 디렉토리 생성
                await fs_1.promises.mkdir(path_1.default.dirname(outputPath), { recursive: true });
                // 형식별 최적화 설정 적용
                let processor = image.clone();
                if (format === 'webp') {
                    processor = processor.webp(this.compressionSettings.images.webp);
                }
                else if (format === 'avif') {
                    processor = processor.avif(this.compressionSettings.images.avif);
                }
                // 반응형 이미지 생성 (다양한 크기)
                const sizes = [
                    { width: metadata.width, suffix: '' },
                    { width: Math.floor(metadata.width * 0.75), suffix: '@0.75x' },
                    { width: Math.floor(metadata.width * 0.5), suffix: '@0.5x' },
                    { width: Math.floor(metadata.width * 0.25), suffix: '@0.25x' }
                ];
                for (const size of sizes) {
                    if (size.width < 100)
                        continue; // 너무 작은 이미지는 제외
                    const sizedPath = outputPath.replace(`.${format}`, `${size.suffix}.${format}`);
                    await processor
                        .resize(size.width)
                        .toFile(sizedPath);
                    const stat = await fs_1.promises.stat(sizedPath);
                    optimizedVersions.push({
                        path: sizedPath,
                        relativePath: path_1.default.relative(this.staticAssetsPath, sizedPath),
                        format,
                        size: stat.size,
                        width: size.width,
                        compressionRatio: asset.size / stat.size
                    });
                }
            }
            // 원본 형식 최적화 (호환성 유지)
            const originalFormat = asset.extension;
            if (originalFormat in this.compressionSettings.images) {
                const outputPath = path_1.default.join(this.optimizedAssetsPath, asset.relativePath);
                await fs_1.promises.mkdir(path_1.default.dirname(outputPath), { recursive: true });
                if (originalFormat === 'jpeg') {
                    await image.jpeg(this.compressionSettings.images.jpeg).toFile(outputPath);
                }
                else if (originalFormat === 'png') {
                    await image.png(this.compressionSettings.images.png).toFile(outputPath);
                }
                const stat = await fs_1.promises.stat(outputPath);
                optimizedVersions.push({
                    path: outputPath,
                    relativePath: path_1.default.relative(this.staticAssetsPath, outputPath),
                    format: originalFormat,
                    size: stat.size,
                    width: metadata.width,
                    compressionRatio: asset.size / stat.size
                });
            }
            return {
                original: asset,
                optimized: optimizedVersions,
                success: true,
                metadata: {
                    originalWidth: metadata.width,
                    originalHeight: metadata.height,
                    originalFormat: metadata.format,
                    totalSavings: asset.size - optimizedVersions.reduce((sum, v) => sum + v.size, 0)
                }
            };
        }
        catch (error) {
            return {
                original: asset,
                optimized: null,
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 비디오 최적화
     */
    async optimizeVideo(asset) {
        // 실제로는 FFmpeg 사용
        // 여기서는 간단한 시뮬레이션
        try {
            const optimizedPath = path_1.default.join(this.optimizedAssetsPath, asset.relativePath);
            await fs_1.promises.mkdir(path_1.default.dirname(optimizedPath), { recursive: true });
            // 원본 파일 복사 (실제로는 FFmpeg로 최적화)
            await fs_1.promises.copyFile(asset.path, optimizedPath);
            const stat = await fs_1.promises.stat(optimizedPath);
            const optimizedAsset = {
                path: optimizedPath,
                relativePath: path_1.default.relative(this.staticAssetsPath, optimizedPath),
                format: asset.extension,
                size: stat.size,
                compressionRatio: asset.size / stat.size
            };
            return {
                original: asset,
                optimized: [optimizedAsset],
                success: true,
                metadata: {
                    compressionRatio: asset.size / stat.size
                }
            };
        }
        catch (error) {
            return {
                original: asset,
                optimized: null,
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 스크립트 최적화
     */
    async optimizeScript(asset) {
        try {
            const content = await fs_1.promises.readFile(asset.path, 'utf8');
            let optimizedContent = content;
            // 기본 최적화 (실제로는 Terser, UglifyJS 등 사용)
            if (asset.extension === 'js') {
                optimizedContent = this.minifyJS(content);
            }
            else if (asset.extension === 'css') {
                optimizedContent = this.minifyCSS(content);
            }
            const optimizedPath = path_1.default.join(this.optimizedAssetsPath, asset.relativePath);
            await fs_1.promises.mkdir(path_1.default.dirname(optimizedPath), { recursive: true });
            await fs_1.promises.writeFile(optimizedPath, optimizedContent, 'utf8');
            const stat = await fs_1.promises.stat(optimizedPath);
            const optimizedAsset = {
                path: optimizedPath,
                relativePath: path_1.default.relative(this.staticAssetsPath, optimizedPath),
                format: asset.extension,
                size: stat.size,
                compressionRatio: asset.size / stat.size
            };
            return {
                original: asset,
                optimized: [optimizedAsset],
                success: true,
                metadata: {
                    originalSize: asset.size,
                    optimizedSize: stat.size,
                    compressionRatio: asset.size / stat.size
                }
            };
        }
        catch (error) {
            return {
                original: asset,
                optimized: null,
                success: false,
                error: error.message
            };
        }
    }
    /**
     * JavaScript 최소화
     */
    minifyJS(content) {
        // 기본적인 최소화 (실제로는 Terser 사용)
        return content
            .replace(/\/\*[\s\S]*?\*\//g, '') // 블록 주석 제거
            .replace(/\/\/.*$/gm, '') // 라인 주석 제거
            .replace(/\s+/g, ' ') // 공백 최소화
            .replace(/;\s*}/g, '}') // 세미콜론 최적화
            .trim();
    }
    /**
     * CSS 최소화
     */
    minifyCSS(content) {
        // 기본적인 최소화 (실제로는 CleanCSS 사용)
        return content
            .replace(/\/\*[\s\S]*?\*\//g, '') // 주석 제거
            .replace(/\s+/g, ' ') // 공백 최소화
            .replace(/;\s*}/g, '}') // 세미콜론 최적화
            .replace(/\s*{\s*/g, '{') // 브레이스 최적화
            .replace(/;\s*/g, ';') // 세미콜론 최적화
            .trim();
    }
    /**
     * 최적화 결과 저장
     */
    async saveOptimizationResults(results) {
        const summary = {
            timestamp: new Date().toISOString(),
            totalAssets: results.length,
            successful: 0,
            failed: 0,
            totalOriginalSize: 0,
            totalOptimizedSize: 0,
            totalSavings: 0
        };
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const optimization = result.value;
                summary.successful++;
                summary.totalOriginalSize += optimization.original.size;
                if (optimization.optimized) {
                    const optimizedSize = Array.isArray(optimization.optimized)
                        ? optimization.optimized.reduce((sum, asset) => sum + asset.size, 0)
                        : optimization.optimized.size;
                    summary.totalOptimizedSize += optimizedSize;
                }
            }
            else {
                summary.failed++;
            }
        }
        summary.totalSavings = summary.totalOriginalSize - summary.totalOptimizedSize;
        // 결과 저장
        await this.redis.lpush('optimization_history', JSON.stringify(summary));
        await this.redis.ltrim('optimization_history', 0, 99);
        // 현재 상태 업데이트
        await this.redis.hset('optimization_status', 'latest', JSON.stringify(summary));
        // console.log('📊 Optimization summary:', summary);
    }
    /**
     * CDN 캐시 모니터링
     */
    async monitorCDNCache() {
        if (!this.cdnConfig.enabled)
            return;
        try {
            const cacheStats = await this.getCDNCacheStats();
            // 캐시 히트율 계산
            const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100;
            // 캐시 통계 저장
            await this.redis.hset('cdn_cache_stats', 'current', JSON.stringify({
                ...cacheStats,
                hitRate,
                timestamp: new Date().toISOString()
            }));
            // 히트율이 낮으면 알림
            if (hitRate < 80) {
                await this.createCDNAlert('low_cache_hit_rate', { hitRate });
            }
        }
        catch (error) {
            console.error('Failed to monitor CDN cache:', error);
        }
    }
    /**
     * CDN 캐시 통계 조회
     */
    async getCDNCacheStats() {
        // 실제로는 CDN 제공업체의 API 호출
        // 여기서는 시뮬레이션
        return {
            hits: Math.floor(Math.random() * 10000),
            misses: Math.floor(Math.random() * 1000),
            bandwidth: Math.floor(Math.random() * 1000000000), // bytes
            requests: Math.floor(Math.random() * 10000),
            regions: this.cdnConfig.regions.map((region) => ({
                name: region.name,
                hits: Math.floor(Math.random() * 1000),
                misses: Math.floor(Math.random() * 100),
                bandwidth: Math.floor(Math.random() * 100000000)
            }))
        };
    }
    /**
     * 자산 사용량 분석
     */
    async analyzeAssetUsage() {
        try {
            const usage = await this.getAssetUsageStats();
            // 사용량 기반 캐시 우선순위 결정
            const priorityAssets = usage.filter((asset) => asset.requests > 100);
            // 우선순위 높은 자산 CDN 배포
            for (const asset of priorityAssets) {
                await this.deployAssetToCDN(asset);
            }
            // 사용량 통계 저장
            await this.redis.hset('asset_usage_stats', 'current', JSON.stringify({
                totalAssets: usage.length,
                priorityAssets: priorityAssets.length,
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            console.error('Failed to analyze asset usage:', error);
        }
    }
    /**
     * 자산 사용량 통계 조회
     */
    async getAssetUsageStats() {
        // 실제로는 웹 서버 로그 분석 또는 분석 도구 사용
        // 여기서는 시뮬레이션
        const mockStats = [];
        for (let i = 0; i < 100; i++) {
            mockStats.push({
                path: `/assets/image${i}.jpg`,
                requests: Math.floor(Math.random() * 1000),
                bandwidth: Math.floor(Math.random() * 10000000),
                lastAccessed: new Date(Date.now() - Math.random() * 86400000).toISOString()
            });
        }
        return mockStats;
    }
    /**
     * 자산 CDN 배포
     */
    async deployAssetToCDN(asset) {
        if (!this.cdnConfig.enabled)
            return;
        try {
            // 실제로는 CDN 제공업체의 API 사용
            // console.log(`📡 Deploying asset to CDN: ${asset.path}`);
            // 배포 상태 저장
            await this.redis.hset('cdn_deployed_assets', asset.path, JSON.stringify({
                deployedAt: new Date().toISOString(),
                usage: asset
            }));
        }
        catch (error) {
            console.error(`Failed to deploy asset to CDN: ${asset.path}`, error);
        }
    }
    /**
     * CDN 알림 생성
     */
    async createCDNAlert(type, data) {
        const alert = {
            type,
            severity: 'warning',
            message: `CDN issue detected: ${type}`,
            data,
            timestamp: new Date().toISOString(),
            source: 'CDNOptimizationService'
        };
        await this.redis.lpush('cdn_alerts', JSON.stringify(alert));
        await this.redis.ltrim('cdn_alerts', 0, 99);
        // 분석 서비스로 알림 전송 (알림 기록)
        // await this.analyticsService.recordAlert(alert);
    }
    /**
     * 자산 URL 최적화
     */
    getOptimizedAssetUrl(originalPath, options = {}) {
        if (!this.cdnConfig.enabled) {
            return originalPath;
        }
        const { format = 'auto', quality = 'auto', width, height, region = 'auto' } = options;
        // 기본 CDN URL
        let cdnUrl = this.cdnConfig.baseUrl;
        // 지역별 CDN 선택
        if (region !== 'auto') {
            const regionConfig = this.cdnConfig.regions.find((r) => r.name === region);
            if (regionConfig) {
                cdnUrl = regionConfig.url;
            }
        }
        // 최적화 매개변수 구성
        const params = [];
        if (format !== 'auto') {
            params.push(`format=${format}`);
        }
        if (quality !== 'auto') {
            params.push(`quality=${quality}`);
        }
        if (width) {
            params.push(`width=${width}`);
        }
        if (height) {
            params.push(`height=${height}`);
        }
        // 파라미터가 있으면 추가
        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        return `${cdnUrl}${originalPath}${queryString}`;
    }
    /**
     * 반응형 이미지 소스셋 생성
     */
    generateResponsiveImageSrcset(originalPath, options = {}) {
        const { sizes = [320, 640, 1024, 1920], format = 'webp', quality = 80 } = options;
        const srcsetEntries = sizes.map((size) => {
            const url = this.getOptimizedAssetUrl(originalPath, {
                format,
                quality,
                width: size
            });
            return `${url} ${size}w`;
        });
        return srcsetEntries.join(', ');
    }
    /**
     * 캐시 무효화
     */
    async invalidateCache(paths) {
        if (!this.cdnConfig.enabled)
            return;
        try {
            // 실제로는 CDN 제공업체의 캐시 무효화 API 호출
            // console.log('🗑️ Invalidating CDN cache for paths:', paths);
            const invalidationResult = {
                paths,
                invalidatedAt: new Date().toISOString(),
                status: 'success'
            };
            await this.redis.lpush('cdn_invalidations', JSON.stringify(invalidationResult));
            await this.redis.ltrim('cdn_invalidations', 0, 99);
        }
        catch (error) {
            console.error('Failed to invalidate CDN cache:', error);
        }
    }
    /**
     * CDN 성능 리포트 생성
     */
    async generateCDNReport() {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        const report = {
            generatedAt: endTime.toISOString(),
            period: {
                start: startTime.toISOString(),
                end: endTime.toISOString()
            },
            cacheStats: await this.getCDNCacheStats(),
            optimizationStats: await this.getOptimizationStats(),
            assetUsage: await this.getAssetUsageStats(),
            recommendations: await this.generateCDNRecommendations()
        };
        return report;
    }
    /**
     * 최적화 통계 조회
     */
    async getOptimizationStats() {
        try {
            const latest = await this.redis.hget('optimization_status', 'latest');
            if (latest) {
                return JSON.parse(latest);
            }
            // Return default OptimizationStats with all required properties
            return {
                successful: 0,
                failed: 0,
                totalOriginalSize: 0,
                totalOptimizedSize: 0,
                totalSavings: 0
            };
        }
        catch (error) {
            console.warn('Failed to get optimization stats:', error);
            return {
                successful: 0,
                failed: 0,
                totalOriginalSize: 0,
                totalOptimizedSize: 0,
                totalSavings: 0
            };
        }
    }
    /**
     * CDN 권장사항 생성
     */
    async generateCDNRecommendations() {
        const recommendations = [];
        // 캐시 히트율 확인
        const cacheStats = await this.getCDNCacheStats();
        const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100;
        if (hitRate < 80) {
            recommendations.push('Consider optimizing cache headers for better hit rates');
        }
        // 최적화 통계 확인
        const optimizationStats = await this.getOptimizationStats();
        if (optimizationStats.totalSavings > 0) {
            recommendations.push(`Asset optimization saved ${Math.round(optimizationStats.totalSavings / 1024 / 1024)}MB`);
        }
        return recommendations;
    }
    /**
     * 서비스 종료
     */
    async shutdown() {
        try {
            await this.redis.disconnect();
            // console.log('✅ CDN optimization service shutdown completed');
        }
        catch (error) {
            console.error('❌ CDN optimization service shutdown failed:', error);
        }
    }
}
exports.CDNOptimizationService = CDNOptimizationService;
// 싱글톤 인스턴스
exports.cdnOptimizationService = new CDNOptimizationService();
//# sourceMappingURL=CDNOptimizationService.js.map