/**
 * MemberProfileService
 *
 * 약사회 회원 프로필 관리 서비스
 *
 * 🔒 정책 적용:
 * - pharmacistLicenseNumber: READ-ONLY
 * - occupationType: READ-ONLY
 * - pharmacyName/Address: 본인만 수정 가능
 *
 * @package @o4o-apps/member-yaksa
 * @phase 1
 */

import type { EntityManager, Repository } from 'typeorm';
import { MemberProfile, type OccupationType, type ProfileStatus } from '../entities/MemberProfile.js';

// =====================================================
// Error Codes
// =====================================================

export const MemberProfileError = {
  PROFILE_NOT_FOUND: 'MP-E001',
  PROFILE_ALREADY_EXISTS: 'MP-E002',
  UNAUTHORIZED_UPDATE: 'MP-E003',
  LICENSE_NUMBER_READONLY: 'MP-E004',
  OCCUPATION_TYPE_READONLY: 'MP-E005',
  INVALID_OCCUPATION_TYPE: 'MP-E006',
  USER_NOT_FOUND: 'MP-E007',
} as const;

// =====================================================
// DTOs
// =====================================================

/**
 * 프로필 생성 DTO
 */
export interface CreateMemberProfileDto {
  userId: string;
  pharmacistLicenseNumber: string;
  occupationType?: OccupationType;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  hospitalName?: string;
  agencyName?: string;
  companyName?: string;
  metadata?: Record<string, any>;
}

/**
 * 프로필 수정 DTO (본인만)
 *
 * 🔒 정책:
 * - pharmacistLicenseNumber 포함 불가
 * - occupationType 포함 불가
 */
export interface UpdateMemberProfileDto {
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  hospitalName?: string;
  agencyName?: string;
  companyName?: string;
  metadata?: Record<string, any>;
}

/**
 * reporting-yaksa 연동 DTO
 *
 * 시스템 자동 업데이트용 (관리자/시스템만)
 */
export interface SyncFromReportingDto {
  userId: string;
  pharmacistLicenseNumber?: string;
  occupationType?: OccupationType;
}

// =====================================================
// Service
// =====================================================

export class MemberProfileService {
  private profileRepository: Repository<MemberProfile>;
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
    this.profileRepository = entityManager.getRepository(MemberProfile);
  }

  // =====================================================
  // 조회
  // =====================================================

  /**
   * 사용자 ID로 프로필 조회
   */
  async getProfileByUserId(userId: string): Promise<MemberProfile | null> {
    return this.profileRepository.findOne({
      where: { userId },
    });
  }

  /**
   * 프로필 ID로 조회
   */
  async getProfileById(id: string): Promise<MemberProfile | null> {
    return this.profileRepository.findOne({
      where: { id },
    });
  }

  /**
   * 면허번호로 프로필 조회
   */
  async getProfileByLicenseNumber(licenseNumber: string): Promise<MemberProfile | null> {
    return this.profileRepository.findOne({
      where: { pharmacistLicenseNumber: licenseNumber },
    });
  }

  // =====================================================
  // 생성
  // =====================================================

  /**
   * 프로필 생성
   *
   * Note: 최초 생성 시에만 호출 (회원가입/관리자 등록)
   */
  async createProfile(dto: CreateMemberProfileDto): Promise<MemberProfile> {
    // 중복 확인
    const existing = await this.profileRepository.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      const error = new Error('이미 프로필이 존재합니다');
      (error as any).code = MemberProfileError.PROFILE_ALREADY_EXISTS;
      throw error;
    }

    // 프로필 생성
    const profile = this.profileRepository.create({
      userId: dto.userId,
      pharmacistLicenseNumber: dto.pharmacistLicenseNumber,
      occupationType: dto.occupationType || 'OWNER_PHARMACIST',
      pharmacyName: dto.pharmacyName,
      pharmacyAddress: dto.pharmacyAddress,
      pharmacyPhone: dto.pharmacyPhone,
      hospitalName: dto.hospitalName,
      agencyName: dto.agencyName,
      companyName: dto.companyName,
      profileStatus: 'active',
      completionRate: this.calculateCompletionRate(dto),
      metadata: dto.metadata || {},
    });

    return this.profileRepository.save(profile);
  }

  // =====================================================
  // 수정 (본인만)
  // =====================================================

  /**
   * 프로필 수정 (본인만)
   *
   * 🔒 정책:
   * - pharmacistLicenseNumber 수정 불가
   * - occupationType 수정 불가
   * - requestUserId === profile.userId 확인 필수
   *
   * @param userId - 프로필 소유자 ID
   * @param requestUserId - 요청자 ID (본인 확인용)
   * @param dto - 수정할 데이터
   */
  async updateProfile(
    userId: string,
    requestUserId: string,
    dto: UpdateMemberProfileDto
  ): Promise<MemberProfile> {
    // 프로필 조회
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      const error = new Error('프로필을 찾을 수 없습니다');
      (error as any).code = MemberProfileError.PROFILE_NOT_FOUND;
      throw error;
    }

    // 🔒 본인 확인
    if (profile.userId !== requestUserId) {
      const error = new Error('본인의 프로필만 수정할 수 있습니다');
      (error as any).code = MemberProfileError.UNAUTHORIZED_UPDATE;
      throw error;
    }

    // 허용된 필드만 업데이트
    if (dto.pharmacyName !== undefined) profile.pharmacyName = dto.pharmacyName;
    if (dto.pharmacyAddress !== undefined) profile.pharmacyAddress = dto.pharmacyAddress;
    if (dto.pharmacyPhone !== undefined) profile.pharmacyPhone = dto.pharmacyPhone;
    if (dto.hospitalName !== undefined) profile.hospitalName = dto.hospitalName;
    if (dto.agencyName !== undefined) profile.agencyName = dto.agencyName;
    if (dto.companyName !== undefined) profile.companyName = dto.companyName;
    if (dto.metadata !== undefined) {
      profile.metadata = { ...profile.metadata, ...dto.metadata };
    }

    // 완성도 재계산
    profile.completionRate = this.calculateCompletionRate(profile);

    // 마지막 수정일 업데이트
    profile.lastProfileUpdateAt = new Date();

    return this.profileRepository.save(profile);
  }

  // =====================================================
  // 시스템 연동 (reporting-yaksa Hook)
  // =====================================================

  /**
   * reporting-yaksa 연동 업데이트
   *
   * 🔒 정책:
   * - 시스템/관리자만 호출 가능
   * - 면허번호, 직역 변경 가능
   * - reporting-yaksa 승인 시 자동 호출
   */
  async syncFromReporting(dto: SyncFromReportingDto): Promise<MemberProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId: dto.userId },
    });

    if (!profile) {
      const error = new Error('프로필을 찾을 수 없습니다');
      (error as any).code = MemberProfileError.PROFILE_NOT_FOUND;
      throw error;
    }

    // 시스템 업데이트 (면허번호, 직역)
    if (dto.pharmacistLicenseNumber !== undefined) {
      profile.pharmacistLicenseNumber = dto.pharmacistLicenseNumber;
    }
    if (dto.occupationType !== undefined) {
      profile.occupationType = dto.occupationType;
    }

    // 메타데이터에 동기화 기록
    profile.metadata = {
      ...profile.metadata,
      lastSyncFromReporting: new Date().toISOString(),
    };

    return this.profileRepository.save(profile);
  }

  // =====================================================
  // 유틸리티
  // =====================================================

  /**
   * 프로필 완성도 계산
   */
  private calculateCompletionRate(
    data: Partial<CreateMemberProfileDto | MemberProfile>
  ): number {
    let score = 0;
    const maxScore = 100;

    // 필수 항목 (각 20점)
    if (data.pharmacistLicenseNumber) score += 20;
    if ((data as any).occupationType) score += 20;

    // 선택 항목 - 직역별 (각 20점)
    const occupationType = (data as any).occupationType || 'OWNER_PHARMACIST';

    if (occupationType === 'OWNER_PHARMACIST' || occupationType === 'STAFF_PHARMACIST') {
      if (data.pharmacyName) score += 20;
      if (data.pharmacyAddress) score += 20;
      if (data.pharmacyPhone) score += 20;
    } else if (occupationType === 'HOSPITAL_PHARMACIST') {
      if (data.hospitalName) score += 60;
    } else if (occupationType === 'PUBLIC_PHARMACIST') {
      if (data.agencyName) score += 60;
    } else if (occupationType === 'INDUSTRY_PHARMACIST') {
      if (data.companyName) score += 60;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 프로필 상태 변경 (관리자용)
   */
  async updateProfileStatus(
    userId: string,
    status: ProfileStatus
  ): Promise<MemberProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      const error = new Error('프로필을 찾을 수 없습니다');
      (error as any).code = MemberProfileError.PROFILE_NOT_FOUND;
      throw error;
    }

    profile.profileStatus = status;

    return this.profileRepository.save(profile);
  }
}

export default MemberProfileService;
