import type { DataSource, Repository } from 'typeorm';

/**
 * PharmacyInfoService
 *
 * 약국 정보 서비스 (본인 수정만 허용)
 *
 * Policy (Phase 0에서 고정):
 * - 본인만 조회/수정 가능
 * - 관리자도 수정 불가
 * - 수정 시 "본인 책임" 안내 필수
 *
 * @see manifest.ts - Policy Fixation #2
 */

export interface PharmacyInfoData {
  pharmacyName: string | null;
  pharmacyAddress: string | null;
  workplaceName: string | null;
  workplaceAddress: string | null;
  workplaceType: string | null;
}

export interface PharmacyUpdateRequest {
  pharmacyName?: string;
  pharmacyAddress?: string;
  workplaceName?: string;
  workplaceAddress?: string;
  workplaceType?: string;
}

export interface PharmacyUpdateResponse {
  success: boolean;
  data: PharmacyInfoData;
  warning: string;
  updatedFields: string[];
  timestamp: string;
}

/**
 * 감사 로그 타입
 */
interface PharmacyAuditLog {
  userId: string;
  memberId: string;
  action: 'pharmacy_info_updated';
  previousValues: Partial<PharmacyInfoData>;
  newValues: Partial<PharmacyInfoData>;
  timestamp: Date;
  ipAddress?: string;
}

export class PharmacyInfoService {
  private memberRepository: Repository<any>;
  private auditLogs: PharmacyAuditLog[] = []; // In-memory for Phase 1, will be DB in Phase 2

  constructor(dataSource: DataSource) {
    // Use membership-yaksa's yaksa_members table
    this.memberRepository = dataSource.getRepository('yaksa_members');
  }

  /**
   * 본인 약국 정보 조회
   *
   * @param userId - 요청한 사용자 ID (본인 확인용)
   * @returns 약국 정보
   * @throws Error if not found
   */
  async getMyPharmacyInfo(userId: string): Promise<{
    data: PharmacyInfoData;
    canEdit: boolean;
    editWarning: string;
  }> {
    const member = await this.memberRepository.findOne({
      where: { userId },
      select: [
        'id',
        'userId',
        'pharmacyName',
        'pharmacyAddress',
        'workplaceName',
        'workplaceAddress',
        'workplaceType',
      ],
    });

    if (!member) {
      throw new Error('회원 정보를 찾을 수 없습니다.');
    }

    return {
      data: {
        pharmacyName: member.pharmacyName || null,
        pharmacyAddress: member.pharmacyAddress || null,
        workplaceName: member.workplaceName || null,
        workplaceAddress: member.workplaceAddress || null,
        workplaceType: member.workplaceType || null,
      },
      canEdit: true, // 본인만 수정 가능
      editWarning: '약국 정보 수정은 본인의 책임입니다. 정확한 정보를 입력해 주세요.',
    };
  }

  /**
   * 본인 약국 정보 수정
   *
   * @param userId - 요청한 사용자 ID (본인 확인용)
   * @param updateData - 수정할 데이터
   * @param ipAddress - 요청 IP (감사 로그용)
   * @returns 수정 결과 및 책임 안내
   * @throws Error if not found or unauthorized
   */
  async updateMyPharmacyInfo(
    userId: string,
    updateData: PharmacyUpdateRequest,
    ipAddress?: string
  ): Promise<PharmacyUpdateResponse> {
    // 1. 본인 회원 정보 조회
    const member = await this.memberRepository.findOne({
      where: { userId },
    });

    if (!member) {
      throw new Error('회원 정보를 찾을 수 없습니다.');
    }

    // 2. 변경 전 값 저장 (감사 로그용)
    const previousValues: Partial<PharmacyInfoData> = {
      pharmacyName: member.pharmacyName,
      pharmacyAddress: member.pharmacyAddress,
      workplaceName: member.workplaceName,
      workplaceAddress: member.workplaceAddress,
      workplaceType: member.workplaceType,
    };

    // 3. 허용된 필드만 업데이트
    const allowedFields = [
      'pharmacyName',
      'pharmacyAddress',
      'workplaceName',
      'workplaceAddress',
      'workplaceType',
    ];

    const updatedFields: string[] = [];
    const newValues: Partial<PharmacyInfoData> = {};

    for (const field of allowedFields) {
      if (field in updateData && updateData[field as keyof PharmacyUpdateRequest] !== undefined) {
        const newValue = updateData[field as keyof PharmacyUpdateRequest];
        if (member[field] !== newValue) {
          member[field] = newValue;
          updatedFields.push(field);
          newValues[field as keyof PharmacyInfoData] = newValue || null;
        }
      }
    }

    // 4. 변경 사항이 있을 때만 저장
    if (updatedFields.length > 0) {
      await this.memberRepository.save(member);

      // 5. 감사 로그 기록
      this.auditLogs.push({
        userId,
        memberId: member.id,
        action: 'pharmacy_info_updated',
        previousValues,
        newValues,
        timestamp: new Date(),
        ipAddress,
      });
    }

    // 6. 결과 반환 (책임 안내 포함)
    return {
      success: true,
      data: {
        pharmacyName: member.pharmacyName || null,
        pharmacyAddress: member.pharmacyAddress || null,
        workplaceName: member.workplaceName || null,
        workplaceAddress: member.workplaceAddress || null,
        workplaceType: member.workplaceType || null,
      },
      warning: '⚠️ 입력하신 정보의 정확성은 본인의 책임입니다. 잘못된 정보로 인한 불이익은 회원 본인에게 있습니다.',
      updatedFields,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 약국 정보 변경 이력 조회 (본인만)
   *
   * @param userId - 요청한 사용자 ID
   * @returns 변경 이력 목록
   */
  async getMyPharmacyUpdateHistory(userId: string): Promise<PharmacyAuditLog[]> {
    return this.auditLogs.filter((log) => log.userId === userId);
  }

  // ⚠️ 관리자 수정 메서드 의도적으로 제공하지 않음
  // updatePharmacyInfoByAdmin() - 존재하지 않음
  // adminOverride() - 존재하지 않음
}
