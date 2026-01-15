/**
 * Partner Application Service
 * 파트너 신청 처리 (v1 - 접수만)
 *
 * WO-PARTNER-APPLICATION-V1
 *
 * Hard Rules:
 * - 신청 접수만 수행
 * - 승인/반려 로직 없음
 * - partner role 생성 없음
 */

import { AppDataSource } from '../../../database/connection.js';
import { PartnerApplication, ServiceInterest } from '../entities/PartnerApplication.js';

export interface CreateApplicationDto {
  companyName: string;
  businessNumber: string;
  contactName: string;
  email: string;
  phone?: string;
  serviceInterest?: ServiceInterest[];
  message?: string;
}

export class PartnerApplicationService {
  private static getRepository() {
    return AppDataSource.getRepository(PartnerApplication);
  }

  /**
   * 파트너 신청 접수
   * - 중복 제출 허용 (운영 정책 영역)
   * - status 반환 없음 (v1)
   */
  static async submitApplication(dto: CreateApplicationDto): Promise<{ status: 'submitted' }> {
    const repository = this.getRepository();

    const application = repository.create({
      companyName: dto.companyName,
      businessNumber: dto.businessNumber,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone,
      serviceInterest: dto.serviceInterest,
      message: dto.message,
    });

    await repository.save(application);

    // ❌ ID 노출 금지
    // ❌ 상세 정보 반환 금지
    return { status: 'submitted' };
  }
}
