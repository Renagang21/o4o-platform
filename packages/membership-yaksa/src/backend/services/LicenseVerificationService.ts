import { DataSource, Repository } from 'typeorm';
import {
  LicenseVerificationRequest,
  LicenseVerificationStatus,
  LicenseVerificationProvider,
} from '../entities/LicenseVerificationRequest.js';
import { Member } from '../entities/Member.js';

/**
 * VerificationResult
 * 면허 검증 결과 인터페이스
 */
export interface VerificationResult {
  isValid: boolean;
  licenseType?: string;
  issueDate?: string;
  expiryDate?: string;
  remarks?: string;
  rawResponse?: any;
}

/**
 * LicenseVerificationProvider Interface
 *
 * 외부 면허 검증 API 제공자 인터페이스
 * Phase 3에서 실제 구현체 연동 예정
 */
export interface ILicenseVerificationProvider {
  /**
   * 제공자 ID
   */
  providerId: LicenseVerificationProvider;

  /**
   * 제공자 이름
   */
  providerName: string;

  /**
   * 면허 검증 수행
   */
  verify(
    licenseNumber: string,
    name: string,
    birthdate?: string
  ): Promise<VerificationResult>;

  /**
   * 제공자 상태 확인
   */
  healthCheck(): Promise<boolean>;
}

/**
 * CreateVerificationRequestDto
 */
export interface CreateVerificationRequestDto {
  memberId: string;
  licenseNumber: string;
  name: string;
  birthdate?: string;
  provider?: LicenseVerificationProvider;
  requestedBy?: string;
  metadata?: Record<string, any>;
}

/**
 * ManualVerificationDto
 */
export interface ManualVerificationDto {
  requestId: string;
  isValid: boolean;
  licenseType?: string;
  issueDate?: string;
  expiryDate?: string;
  remarks?: string;
  verifiedBy: string;
}

/**
 * LicenseVerificationService
 *
 * Phase 2: 면허 진위 확인 시스템 준비
 *
 * 면허 검증 요청을 관리하고 결과를 저장합니다.
 * Phase 3에서 외부 API 연동이 추가될 예정입니다.
 */
export class LicenseVerificationService {
  private verificationRepo: Repository<LicenseVerificationRequest>;
  private memberRepo: Repository<Member>;
  private providers: Map<LicenseVerificationProvider, ILicenseVerificationProvider> = new Map();

  constructor(private dataSource: DataSource) {
    this.verificationRepo = dataSource.getRepository(LicenseVerificationRequest);
    this.memberRepo = dataSource.getRepository(Member);
  }

  /**
   * 검증 제공자 등록
   *
   * Phase 3에서 외부 API 제공자를 등록하여 사용
   */
  registerProvider(provider: ILicenseVerificationProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  /**
   * 등록된 제공자 목록 조회
   */
  getRegisteredProviders(): LicenseVerificationProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 검증 요청 생성
   */
  async createRequest(dto: CreateVerificationRequestDto): Promise<LicenseVerificationRequest> {
    // 회원 존재 확인
    const member = await this.memberRepo.findOne({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new Error(`Member "${dto.memberId}" not found`);
    }

    const request = this.verificationRepo.create({
      ...dto,
      provider: dto.provider || 'manual',
      status: 'pending',
    });

    return await this.verificationRepo.save(request);
  }

  /**
   * 검증 요청 조회 (ID)
   */
  async findById(id: string): Promise<LicenseVerificationRequest | null> {
    return await this.verificationRepo.findOne({
      where: { id },
    });
  }

  /**
   * 회원별 검증 요청 목록 조회
   */
  async findByMember(memberId: string): Promise<LicenseVerificationRequest[]> {
    return await this.verificationRepo.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 회원의 최신 검증 결과 조회
   */
  async getLatestVerification(memberId: string): Promise<LicenseVerificationRequest | null> {
    return await this.verificationRepo.findOne({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 대기 중인 검증 요청 목록 조회
   */
  async getPendingRequests(
    options?: { page?: number; limit?: number }
  ): Promise<{ data: LicenseVerificationRequest[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.verificationRepo.findAndCount({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * 검증 수행 (외부 API 사용)
   *
   * Phase 3에서 실제 외부 API 연동 구현 예정
   * 현재는 수동 검증 상태로 전환만 지원
   */
  async performVerification(
    requestId: string,
    providerOverride?: LicenseVerificationProvider
  ): Promise<LicenseVerificationRequest> {
    const request = await this.findById(requestId);
    if (!request) {
      throw new Error(`Verification request "${requestId}" not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is not in pending status: ${request.status}`);
    }

    const provider = providerOverride || request.provider;

    // 등록된 제공자가 있으면 사용
    const providerImpl = this.providers.get(provider);

    if (providerImpl) {
      // 외부 API 검증 수행
      request.status = 'processing';
      await this.verificationRepo.save(request);

      try {
        const result = await providerImpl.verify(
          request.licenseNumber,
          request.name,
          request.birthdate
        );

        request.verificationResult = result;
        request.status = result.isValid ? 'verified' : 'invalid';
        request.verifiedAt = new Date();

        // 검증 성공 시 회원의 isVerified 업데이트
        if (result.isValid) {
          await this.memberRepo.update(request.memberId, { isVerified: true });
        }
      } catch (error: any) {
        request.status = 'error';
        request.failureReason = error.message;
      }

      return await this.verificationRepo.save(request);
    }

    // 제공자가 없으면 수동 검증 대기 상태 유지
    return request;
  }

  /**
   * 수동 검증 처리
   *
   * 관리자가 직접 면허를 확인하고 결과를 입력
   */
  async processManualVerification(dto: ManualVerificationDto): Promise<LicenseVerificationRequest> {
    const request = await this.findById(dto.requestId);
    if (!request) {
      throw new Error(`Verification request "${dto.requestId}" not found`);
    }

    // 검증 결과 설정
    request.verificationResult = {
      isValid: dto.isValid,
      licenseType: dto.licenseType,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      remarks: dto.remarks,
    };

    request.status = dto.isValid ? 'verified' : 'invalid';
    request.verifiedBy = dto.verifiedBy;
    request.verifiedAt = new Date();
    request.provider = 'manual';

    const savedRequest = await this.verificationRepo.save(request);

    // 검증 성공 시 회원의 isVerified 업데이트
    if (dto.isValid) {
      await this.memberRepo.update(request.memberId, {
        isVerified: true,
        licenseIssuedAt: dto.issueDate,
        licenseRenewalAt: dto.expiryDate,
      });
    }

    return savedRequest;
  }

  /**
   * 검증 실패 처리
   */
  async markAsFailed(
    requestId: string,
    reason: string,
    verifiedBy?: string
  ): Promise<LicenseVerificationRequest> {
    const request = await this.findById(requestId);
    if (!request) {
      throw new Error(`Verification request "${requestId}" not found`);
    }

    request.status = 'failed';
    request.failureReason = reason;
    request.verifiedBy = verifiedBy;
    request.verifiedAt = new Date();

    return await this.verificationRepo.save(request);
  }

  /**
   * 회원의 면허 검증 상태 확인
   */
  async getMemberVerificationStatus(memberId: string): Promise<{
    hasVerification: boolean;
    latestStatus?: LicenseVerificationStatus;
    isValid: boolean;
    lastVerifiedAt?: Date;
  }> {
    const latest = await this.getLatestVerification(memberId);

    if (!latest) {
      return {
        hasVerification: false,
        isValid: false,
      };
    }

    return {
      hasVerification: true,
      latestStatus: latest.status,
      isValid: latest.status === 'verified',
      lastVerifiedAt: latest.verifiedAt,
    };
  }

  /**
   * 검증 통계 조회
   */
  async getVerificationStats(organizationId?: string): Promise<{
    total: number;
    pending: number;
    verified: number;
    invalid: number;
    failed: number;
    verificationRate: number;
  }> {
    const baseQuery = this.verificationRepo
      .createQueryBuilder('req')
      .leftJoin('req.member', 'member');

    if (organizationId) {
      baseQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const total = await baseQuery.clone().getCount();
    const pending = await baseQuery.clone().andWhere('req.status = :status', { status: 'pending' }).getCount();
    const verified = await baseQuery.clone().andWhere('req.status = :status', { status: 'verified' }).getCount();
    const invalid = await baseQuery.clone().andWhere('req.status = :status', { status: 'invalid' }).getCount();
    const failed = await baseQuery.clone().andWhere('req.status = :status', { status: 'failed' }).getCount();

    const verificationRate = total > 0 ? (verified / total) * 100 : 0;

    return {
      total,
      pending,
      verified,
      invalid,
      failed,
      verificationRate: Math.round(verificationRate * 100) / 100,
    };
  }

  /**
   * 일괄 검증 요청 생성
   */
  async createBulkRequests(
    memberIds: string[],
    requestedBy?: string
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const memberId of memberIds) {
      try {
        const member = await this.memberRepo.findOne({
          where: { id: memberId },
        });

        if (!member) {
          failed++;
          errors.push(`Member ${memberId}: not found`);
          continue;
        }

        // 이미 검증된 회원은 건너뛰기
        if (member.isVerified) {
          continue;
        }

        await this.createRequest({
          memberId,
          licenseNumber: member.licenseNumber,
          name: member.name,
          birthdate: member.birthdate,
          provider: 'manual',
          requestedBy,
        });

        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Member ${memberId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }
}

/**
 * MockLicenseVerificationProvider
 *
 * 테스트/개발용 목 제공자
 * Phase 3에서 실제 제공자로 교체 예정
 */
export class MockLicenseVerificationProvider implements ILicenseVerificationProvider {
  providerId: LicenseVerificationProvider = 'manual';
  providerName = 'Mock Provider (Development)';

  async verify(
    licenseNumber: string,
    name: string,
    birthdate?: string
  ): Promise<VerificationResult> {
    // 테스트용: 면허번호가 '9999'로 시작하면 무효
    if (licenseNumber.startsWith('9999')) {
      return {
        isValid: false,
        remarks: '테스트: 무효 면허번호',
      };
    }

    // 그 외에는 유효로 처리
    return {
      isValid: true,
      licenseType: '약사',
      issueDate: '2010-01-01',
      remarks: '테스트: 유효한 면허',
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
