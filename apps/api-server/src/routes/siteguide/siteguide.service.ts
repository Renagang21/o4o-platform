/**
 * SiteGuide Service
 *
 * WO-SITEGUIDE-CORE-EXECUTION-V1
 * 사업자 단위 실행 컨텍스트 및 검증
 *
 * 책임:
 * - API Key 검증 및 Business 매칭
 * - 도메인 검증
 * - 사용량 추적 및 제한
 * - 실행 로그 기록
 * - Kill Switch 관리
 */

import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  SiteGuideBusiness,
  SiteGuideBusinessStatus,
  SiteGuideApiKey,
  SiteGuideApiKeyStatus,
  SiteGuideUsageSummary,
  SiteGuideExecutionLog,
  SiteGuideExecutionType,
  SiteGuideExecutionResult,
} from './entities/index.js';
import logger from '../../utils/logger.js';

/**
 * 전역 Kill Switch 상태
 * 서버 재시작 시 초기화됨 (영속화 필요시 DB로 이동)
 */
let GLOBAL_KILL_SWITCH = false;

export interface ValidatedContext {
  businessId: string;
  businessName: string;
  apiKeyId: string;
  dailyLimit: number;
  currentUsage: number;
  remaining: number;
}

export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  context?: ValidatedContext;
  error?: ValidationError;
}

export class SiteGuideService {
  private businessRepo: Repository<SiteGuideBusiness>;
  private apiKeyRepo: Repository<SiteGuideApiKey>;
  private usageSummaryRepo: Repository<SiteGuideUsageSummary>;
  private executionLogRepo: Repository<SiteGuideExecutionLog>;

  constructor(private dataSource: DataSource) {
    this.businessRepo = dataSource.getRepository(SiteGuideBusiness);
    this.apiKeyRepo = dataSource.getRepository(SiteGuideApiKey);
    this.usageSummaryRepo = dataSource.getRepository(SiteGuideUsageSummary);
    this.executionLogRepo = dataSource.getRepository(SiteGuideExecutionLog);
  }

  // ============================================================================
  // Kill Switch Management
  // ============================================================================

  /**
   * 전역 Kill Switch 상태 확인
   */
  isGloballyDisabled(): boolean {
    return GLOBAL_KILL_SWITCH;
  }

  /**
   * 전역 Kill Switch 활성화
   */
  enableGlobalKillSwitch(): void {
    GLOBAL_KILL_SWITCH = true;
    logger.warn('[SiteGuide] Global kill switch ENABLED - all requests will be blocked');
  }

  /**
   * 전역 Kill Switch 비활성화
   */
  disableGlobalKillSwitch(): void {
    GLOBAL_KILL_SWITCH = false;
    logger.info('[SiteGuide] Global kill switch DISABLED - service resumed');
  }

  // ============================================================================
  // API Key Validation
  // ============================================================================

  /**
   * API Key 해시 생성
   */
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * 새 API Key 생성
   * 반환값: 실제 API Key (1회만 반환, 저장 시 해시만 저장)
   */
  async createApiKey(businessId: string, label?: string): Promise<{ key: string; id: string }> {
    // Business 존재 확인
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) {
      throw new Error('Business not found');
    }

    // 새 API Key 생성 (sg_ prefix + 32자 랜덤)
    const rawKey = `sg_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = this.hashApiKey(rawKey);

    const apiKey = this.apiKeyRepo.create({
      businessId,
      keyHash,
      label,
      status: SiteGuideApiKeyStatus.ACTIVE,
    });

    await this.apiKeyRepo.save(apiKey);

    return { key: rawKey, id: apiKey.id };
  }

  /**
   * API Key 및 Business 컨텍스트 검증
   */
  async validateApiKey(
    rawApiKey: string | undefined,
    requestDomain: string | undefined
  ): Promise<ValidationResult> {
    // 1. Kill Switch 확인
    if (GLOBAL_KILL_SWITCH) {
      return {
        success: false,
        error: { code: 'SERVICE_DISABLED', message: 'Service is temporarily disabled' },
      };
    }

    // 2. API Key 존재 확인
    if (!rawApiKey) {
      return {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'API key is required' },
      };
    }

    // 3. API Key 형식 검증
    if (!rawApiKey.startsWith('sg_') || rawApiKey.length < 40) {
      return {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key format' },
      };
    }

    // 4. DB에서 API Key 조회
    const keyHash = this.hashApiKey(rawApiKey);
    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash },
      relations: ['business'],
    });

    if (!apiKey) {
      return {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'API key not found' },
      };
    }

    // 5. API Key 상태 확인
    if (apiKey.status !== SiteGuideApiKeyStatus.ACTIVE) {
      return {
        success: false,
        error: { code: 'API_KEY_INACTIVE', message: `API key is ${apiKey.status}` },
      };
    }

    // 6. Business 존재 및 상태 확인
    const business = apiKey.business;
    if (!business) {
      return {
        success: false,
        error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found' },
      };
    }

    if (business.status !== SiteGuideBusinessStatus.ACTIVE) {
      return {
        success: false,
        error: { code: 'BUSINESS_INACTIVE', message: `Business is ${business.status}` },
      };
    }

    // 7. 도메인 검증 (allowedDomains가 비어있으면 모든 도메인 허용)
    if (business.allowedDomains.length > 0 && requestDomain) {
      const normalizedDomain = this.normalizeDomain(requestDomain);
      const isAllowed = business.allowedDomains.some(
        (d) => this.normalizeDomain(d) === normalizedDomain
      );

      if (!isAllowed) {
        return {
          success: false,
          error: { code: 'DOMAIN_NOT_ALLOWED', message: 'Request domain not allowed' },
        };
      }
    }

    // 8. 사용량 확인
    const today = new Date().toISOString().split('T')[0];
    let usageSummary = await this.usageSummaryRepo.findOne({
      where: { businessId: business.id, date: today },
    });

    const currentUsage = usageSummary?.requestCount || 0;
    const remaining = business.dailyLimit - currentUsage;

    if (remaining <= 0) {
      return {
        success: false,
        error: { code: 'LIMIT_EXCEEDED', message: 'Daily usage limit exceeded' },
      };
    }

    // 9. 마지막 사용 시간 업데이트
    await this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() });

    return {
      success: true,
      context: {
        businessId: business.id,
        businessName: business.name,
        apiKeyId: apiKey.id,
        dailyLimit: business.dailyLimit,
        currentUsage,
        remaining,
      },
    };
  }

  /**
   * 도메인 정규화 (www 제거, 소문자 변환)
   */
  private normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '');
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  /**
   * 사용량 증가 및 기록
   */
  async recordUsage(
    businessId: string,
    apiKeyId: string | undefined,
    result: SiteGuideExecutionResult,
    executionType: SiteGuideExecutionType = SiteGuideExecutionType.QUERY,
    requestDomain?: string,
    responseTimeMs?: number,
    errorCode?: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // 1. UsageSummary 업데이트 (upsert)
    let summary = await this.usageSummaryRepo.findOne({
      where: { businessId, date: today },
    });

    if (!summary) {
      summary = this.usageSummaryRepo.create({
        businessId,
        date: today,
        requestCount: 0,
        successCount: 0,
        blockedCount: 0,
        errorCount: 0,
      });
    }

    summary.requestCount++;
    if (result === SiteGuideExecutionResult.SUCCESS) {
      summary.successCount++;
    } else if (result === SiteGuideExecutionResult.BLOCKED) {
      summary.blockedCount++;
    } else if (result === SiteGuideExecutionResult.ERROR) {
      summary.errorCount++;
    }

    await this.usageSummaryRepo.save(summary);

    // 2. ExecutionLog 기록
    const log = this.executionLogRepo.create({
      businessId,
      apiKeyId,
      executionType,
      result,
      errorCode,
      requestDomain,
      responseTimeMs,
    });

    await this.executionLogRepo.save(log);
  }

  /**
   * 남은 사용량 조회
   */
  async getRemainingUsage(businessId: string): Promise<number> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) return 0;

    const today = new Date().toISOString().split('T')[0];
    const summary = await this.usageSummaryRepo.findOne({
      where: { businessId, date: today },
    });

    return business.dailyLimit - (summary?.requestCount || 0);
  }

  // ============================================================================
  // Business Management
  // ============================================================================

  /**
   * Business 생성
   */
  async createBusiness(data: {
    name: string;
    allowedDomains?: string[];
    dailyLimit?: number;
    email?: string;
    notes?: string;
  }): Promise<SiteGuideBusiness> {
    const business = this.businessRepo.create({
      name: data.name,
      allowedDomains: data.allowedDomains || [],
      dailyLimit: data.dailyLimit || 100,
      email: data.email,
      notes: data.notes,
      status: SiteGuideBusinessStatus.ACTIVE,
    });

    return this.businessRepo.save(business);
  }

  /**
   * Business 상태 변경 (차단/복구)
   */
  async updateBusinessStatus(
    businessId: string,
    status: SiteGuideBusinessStatus
  ): Promise<void> {
    await this.businessRepo.update(businessId, { status });
    logger.info(`[SiteGuide] Business ${businessId} status changed to ${status}`);
  }

  /**
   * API Key 상태 변경 (차단/복구)
   */
  async updateApiKeyStatus(
    apiKeyId: string,
    status: SiteGuideApiKeyStatus
  ): Promise<void> {
    const updateData: Partial<SiteGuideApiKey> = { status };
    if (status === SiteGuideApiKeyStatus.REVOKED) {
      updateData.revokedAt = new Date();
    }
    await this.apiKeyRepo.update(apiKeyId, updateData);
    logger.info(`[SiteGuide] API Key ${apiKeyId} status changed to ${status}`);
  }

  /**
   * Business ID로 조회
   */
  async getBusinessById(businessId: string): Promise<SiteGuideBusiness | null> {
    return this.businessRepo.findOne({ where: { id: businessId } });
  }

  /**
   * 모든 Business 조회
   */
  async listBusinesses(): Promise<SiteGuideBusiness[]> {
    return this.businessRepo.find({ order: { createdAt: 'DESC' } });
  }
}
