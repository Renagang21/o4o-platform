import { performance } from 'perf_hooks';
import Redis from 'ioredis';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { AnalyticsService } from './AnalyticsService';

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
export class CDNOptimizationService {
  private redis: Redis;
  private analyticsService: AnalyticsService;
  private staticAssetsPath: string;
  private optimizedAssetsPath: string;
  private cdnConfig!: CDNConfiguration;
  private compressionSettings!: CompressionSettings;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });

    this.analyticsService = new AnalyticsService();
    this.staticAssetsPath = path.join(process.cwd(), 'public');
    this.optimizedAssetsPath = path.join(process.cwd(), 'public', 'optimized');
    
    this.initializeCDNConfig();
    this.initializeCompressionSettings();
    this.startOptimizationTasks();
  }

  /**
   * CDN 설정 초기화
   */
  private initializeCDNConfig(): void {
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
  private initializeCompressionSettings(): void {
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
  private startOptimizationTasks(): void {
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
  async optimizeAssets(): Promise<void> {
    try {
      
      // 최적화 대상 자산 스캔
      const assetsToOptimize = await this.scanAssetsForOptimization();
      
      // 자산 타입별 최적화
      const optimizationTasks = assetsToOptimize.map(async (asset) => {
        try {
          return await this.optimizeAsset(asset);
        } catch (error) {
          console.error(`Failed to optimize asset ${asset.path}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(optimizationTasks);
      const successful = results.filter((r: any) => r.status === 'fulfilled').length;
      const failed = results.filter((r: any) => r.status === 'rejected').length;


      // 최적화 결과 저장
      await this.saveOptimizationResults(results);

    } catch (error) {
      console.error('❌ Asset optimization failed:', error);
    }
  }

  /**
   * 최적화 대상 자산 스캔
   */
  private async scanAssetsForOptimization(): Promise<AssetInfo[]> {
    const assets: AssetInfo[] = [];
    
    try {
      await this.scanDirectory(this.staticAssetsPath, assets);
      
      // 최적화 필요한 자산 필터링
      const assetsToOptimize = assets.filter((asset: any) => {
        return this.needsOptimization(asset);
      });

      return assetsToOptimize;
    } catch (error) {
      console.error('Failed to scan assets:', error);
      return [];
    }
  }

  /**
   * 디렉토리 재귀 스캔
   */
  private async scanDirectory(dirPath: string, assets: AssetInfo[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, assets);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase().slice(1);
          
          assets.push({
            path: fullPath,
            relativePath: path.relative(this.staticAssetsPath, fullPath),
            name: entry.name,
            extension: ext,
            size: stat.size,
            mtime: stat.mtime,
            type: this.getAssetType(ext),
            hash: await this.calculateFileHash(fullPath)
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  /**
   * 자산 타입 결정
   */
  private getAssetType(extension: string): AssetType {
    for (const [type, extensions] of Object.entries(this.cdnConfig.assetTypes)) {
      if (extensions.includes(extension)) {
        return type as AssetType;
      }
    }
    return 'others';
  }

  /**
   * 파일 해시 계산
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      console.warn(`Failed to calculate hash for ${filePath}:`, error);
      return '';
    }
  }

  /**
   * 최적화 필요성 판단
   */
  private needsOptimization(asset: AssetInfo): boolean {
    // 이미 최적화된 자산인지 확인
    if (asset.relativePath.startsWith('optimized/')) {
      return false;
    }

    // 최적화 대상 타입인지 확인
    const optimizableTypes: AssetType[] = ['images', 'videos', 'scripts'];
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
  private async optimizeAsset(asset: AssetInfo): Promise<OptimizationResult> {
    const startTime = performance.now();
    
    try {
      let result: OptimizationResult;

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

      result.processingTime = performance.now() - startTime;
      return result;

    } catch (error) {
      return {
        original: asset,
        optimized: null,
        success: false,
        error: (error as Error).message,
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * 이미지 최적화
   */
  private async optimizeImage(asset: AssetInfo): Promise<OptimizationResult> {
    const formats = ['webp', 'avif']; // 현대적 형식으로 변환
    const optimizedVersions: OptimizedAsset[] = [];

    try {
      // 원본 이미지 정보 가져오기
      const image = sharp(asset.path);
      const metadata = await image.metadata();

      // 다양한 형식으로 최적화
      for (const format of formats) {
        const outputPath = path.join(
          this.optimizedAssetsPath,
          path.dirname(asset.relativePath),
          `${path.parse(asset.name).name}.${format}`
        );

        // 출력 디렉토리 생성
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // 형식별 최적화 설정 적용
        let processor = image.clone();
        
        if (format === 'webp') {
          processor = processor.webp(this.compressionSettings.images.webp);
        } else if (format === 'avif') {
          processor = processor.avif(this.compressionSettings.images.avif);
        }

        // 반응형 이미지 생성 (다양한 크기)
        const sizes = [
          { width: metadata.width, suffix: '' },
          { width: Math.floor(metadata.width! * 0.75), suffix: '@0.75x' },
          { width: Math.floor(metadata.width! * 0.5), suffix: '@0.5x' },
          { width: Math.floor(metadata.width! * 0.25), suffix: '@0.25x' }
        ];

        for (const size of sizes) {
          if (size.width < 100) continue; // 너무 작은 이미지는 제외

          const sizedPath = outputPath.replace(
            `.${format}`,
            `${size.suffix}.${format}`
          );

          await processor
            .resize(size.width)
            .toFile(sizedPath);

          const stat = await fs.stat(sizedPath);
          optimizedVersions.push({
            path: sizedPath,
            relativePath: path.relative(this.staticAssetsPath, sizedPath),
            format,
            size: stat.size,
            width: size.width,
            compressionRatio: asset.size / stat.size
          });
        }
      }

      // 원본 형식 최적화 (호환성 유지)
      const originalFormat = asset.extension as keyof typeof this.compressionSettings.images;
      if (originalFormat in this.compressionSettings.images) {
        const outputPath = path.join(
          this.optimizedAssetsPath,
          asset.relativePath
        );

        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        if (originalFormat === 'jpeg') {
          await image.jpeg(this.compressionSettings.images.jpeg).toFile(outputPath);
        } else if (originalFormat === 'png') {
          await image.png(this.compressionSettings.images.png).toFile(outputPath);
        }

        const stat = await fs.stat(outputPath);
        optimizedVersions.push({
          path: outputPath,
          relativePath: path.relative(this.staticAssetsPath, outputPath),
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

    } catch (error) {
      return {
        original: asset,
        optimized: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * 비디오 최적화
   */
  private async optimizeVideo(asset: AssetInfo): Promise<OptimizationResult> {
    // 실제로는 FFmpeg 사용
    // 여기서는 간단한 시뮬레이션
    try {
      const optimizedPath = path.join(
        this.optimizedAssetsPath,
        asset.relativePath
      );

      await fs.mkdir(path.dirname(optimizedPath), { recursive: true });

      // 원본 파일 복사 (실제로는 FFmpeg로 최적화)
      await fs.copyFile(asset.path, optimizedPath);

      const stat = await fs.stat(optimizedPath);
      const optimizedAsset: OptimizedAsset = {
        path: optimizedPath,
        relativePath: path.relative(this.staticAssetsPath, optimizedPath),
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

    } catch (error) {
      return {
        original: asset,
        optimized: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * 스크립트 최적화
   */
  private async optimizeScript(asset: AssetInfo): Promise<OptimizationResult> {
    try {
      const content = await fs.readFile(asset.path, 'utf8');
      let optimizedContent = content;

      // 기본 최적화 (실제로는 Terser, UglifyJS 등 사용)
      if (asset.extension === 'js') {
        optimizedContent = this.minifyJS(content);
      } else if (asset.extension === 'css') {
        optimizedContent = this.minifyCSS(content);
      }

      const optimizedPath = path.join(
        this.optimizedAssetsPath,
        asset.relativePath
      );

      await fs.mkdir(path.dirname(optimizedPath), { recursive: true });
      await fs.writeFile(optimizedPath, optimizedContent, 'utf8');

      const stat = await fs.stat(optimizedPath);
      const optimizedAsset: OptimizedAsset = {
        path: optimizedPath,
        relativePath: path.relative(this.staticAssetsPath, optimizedPath),
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

    } catch (error) {
      return {
        original: asset,
        optimized: null,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * JavaScript 최소화
   */
  private minifyJS(content: string): string {
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
  private minifyCSS(content: string): string {
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
  private async saveOptimizationResults(results: PromiseSettledResult<OptimizationResult | null>[]): Promise<void> {
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
            : (optimization.optimized as OptimizedAsset).size;
          summary.totalOptimizedSize += optimizedSize;
        }
      } else {
        summary.failed++;
      }
    }

    summary.totalSavings = summary.totalOriginalSize - summary.totalOptimizedSize;

    // 결과 저장
    await this.redis.lpush('optimization_history', JSON.stringify(summary));
    await this.redis.ltrim('optimization_history', 0, 99);

    // 현재 상태 업데이트
    await this.redis.hset('optimization_status', 'latest', JSON.stringify(summary));

  }

  /**
   * CDN 캐시 모니터링
   */
  private async monitorCDNCache(): Promise<void> {
    if (!this.cdnConfig.enabled) return;

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

    } catch (error) {
      console.error('Failed to monitor CDN cache:', error);
    }
  }

  /**
   * CDN 캐시 통계 조회
   */
  private async getCDNCacheStats(): Promise<CDNCacheStats> {
    // 실제로는 CDN 제공업체의 API 호출
    // 여기서는 시뮬레이션
    return {
      hits: Math.floor(Math.random() * 10000),
      misses: Math.floor(Math.random() * 1000),
      bandwidth: Math.floor(Math.random() * 1000000000), // bytes
      requests: Math.floor(Math.random() * 10000),
      regions: this.cdnConfig.regions.map((region: any) => ({
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
  private async analyzeAssetUsage(): Promise<void> {
    try {
      const usage = await this.getAssetUsageStats();
      
      // 사용량 기반 캐시 우선순위 결정
      const priorityAssets = usage.filter((asset: any) => asset.requests > 100);
      
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

    } catch (error) {
      console.error('Failed to analyze asset usage:', error);
    }
  }

  /**
   * 자산 사용량 통계 조회
   */
  private async getAssetUsageStats(): Promise<AssetUsageStats[]> {
    // 실제로는 웹 서버 로그 분석 또는 분석 도구 사용
    // 여기서는 시뮬레이션
    const mockStats: AssetUsageStats[] = [];
    
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
  private async deployAssetToCDN(asset: AssetUsageStats): Promise<void> {
    if (!this.cdnConfig.enabled) return;

    try {
      // 실제로는 CDN 제공업체의 API 사용
      
      // 배포 상태 저장
      await this.redis.hset('cdn_deployed_assets', asset.path, JSON.stringify({
        deployedAt: new Date().toISOString(),
        usage: asset
      }));

    } catch (error) {
      console.error(`Failed to deploy asset to CDN: ${asset.path}`, error);
    }
  }

  /**
   * CDN 알림 생성
   */
  private async createCDNAlert(type: string, data: Record<string, unknown>): Promise<void> {
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
  getOptimizedAssetUrl(originalPath: string, options: AssetUrlOptions = {}): string {
    if (!this.cdnConfig.enabled) {
      return originalPath;
    }

    const {
      format = 'auto',
      quality = 'auto',
      width,
      height,
      region = 'auto'
    } = options;

    // 기본 CDN URL
    let cdnUrl = this.cdnConfig.baseUrl;

    // 지역별 CDN 선택
    if (region !== 'auto') {
      const regionConfig = this.cdnConfig.regions.find((r: any) => r.name === region);
      if (regionConfig) {
        cdnUrl = regionConfig.url;
      }
    }

    // 최적화 매개변수 구성
    const params: string[] = [];
    
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
  generateResponsiveImageSrcset(originalPath: string, options: ResponsiveImageOptions = {}): string {
    const {
      sizes = [320, 640, 1024, 1920],
      format = 'webp',
      quality = 80
    } = options;

    const srcsetEntries = sizes.map((size: any) => {
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
  async invalidateCache(paths: string[]): Promise<void> {
    if (!this.cdnConfig.enabled) return;

    try {
      // 실제로는 CDN 제공업체의 캐시 무효화 API 호출
      
      const invalidationResult = {
        paths,
        invalidatedAt: new Date().toISOString(),
        status: 'success'
      };

      await this.redis.lpush('cdn_invalidations', JSON.stringify(invalidationResult));
      await this.redis.ltrim('cdn_invalidations', 0, 99);

    } catch (error) {
      console.error('Failed to invalidate CDN cache:', error);
    }
  }

  /**
   * CDN 성능 리포트 생성
   */
  async generateCDNReport(): Promise<CDNReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const report: CDNReport = {
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
  private async getOptimizationStats(): Promise<OptimizationStats> {
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
    } catch (error) {
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
  private async generateCDNRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

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
  async shutdown(): Promise<void> {
    try {
      await this.redis.disconnect();
    } catch (error) {
      console.error('❌ CDN optimization service shutdown failed:', error);
    }
  }
}

// 타입 정의
interface CDNConfiguration {
  enabled: boolean;
  baseUrl: string;
  regions: {
    name: string;
    url: string;
  }[];
  assetTypes: {
    images: string[];
    videos: string[];
    documents: string[];
    fonts: string[];
    scripts: string[];
    others: string[];
  };
  cacheSettings: {
    [key: string]: {
      maxAge: number;
      sMaxAge: number;
    };
  };
}

interface CompressionSettings {
  images: {
    jpeg: { quality: number; progressive: boolean; mozjpeg: boolean };
    png: { compressionLevel: number; progressive: boolean };
    webp: { quality: number; effort: number };
    avif: { quality: number; effort: number };
  };
  videos: {
    mp4: { crf: number; preset: string };
    webm: { crf: number; preset: string };
  };
  scripts: {
    js: { minify: boolean; compress: boolean };
    css: { minify: boolean; compress: boolean };
  };
}

type AssetType = 'images' | 'videos' | 'documents' | 'fonts' | 'scripts' | 'others';

interface AssetInfo {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  mtime: Date;
  type: AssetType;
  hash: string;
}

interface OptimizedAsset {
  path: string;
  relativePath: string;
  format: string;
  size: number;
  width?: number;
  height?: number;
  compressionRatio: number;
}

interface OptimizationResult {
  original: AssetInfo;
  optimized: OptimizedAsset[] | null;
  success: boolean;
  error?: string;
  processingTime?: number;
  metadata?: Record<string, unknown>;
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

// 싱글톤 인스턴스
export const cdnOptimizationService = new CDNOptimizationService();