/**
 * KPA Operator Service
 *
 * WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1
 * KpaMember 기반 운영자 판별 (User.roles 사용 금지)
 */

import AppDataSource from '../../../database/data-source.js';
import { KpaMember, KpaMemberRole } from '../entities/kpa-member.entity.js';
import { In } from 'typeorm';

/**
 * KPA 운영자 여부 확인 (KpaMember 기반)
 *
 * @param userId - auth-core User.id
 * @returns true if user is KPA operator (admin/operator), false otherwise
 *
 * ⚠️ 중요: User.roles는 절대 사용하지 않음
 * ⚠️ KPA 전용: 다른 서비스 운영자는 무조건 false
 */
export async function isKpaOperator(userId: string): Promise<boolean> {
  const kpaMemberRepo = AppDataSource.getRepository(KpaMember);

  const operatorRoles: KpaMemberRole[] = ['admin', 'operator'];

  const member = await kpaMemberRepo.findOne({
    where: {
      user_id: userId,
      role: In(operatorRoles),
      status: 'active',
    },
  });

  return !!member;
}

/**
 * 사용자의 KPA 조직 내 역할 조회
 *
 * @param userId - auth-core User.id
 * @param organizationId - KPA Organization ID (optional)
 * @returns KpaMember or null
 */
export async function getKpaMemberRole(
  userId: string,
  organizationId?: string
): Promise<KpaMember | null> {
  const kpaMemberRepo = AppDataSource.getRepository(KpaMember);

  const where: any = {
    user_id: userId,
    status: 'active',
  };

  if (organizationId) {
    where.organization_id = organizationId;
  }

  return await kpaMemberRepo.findOne({ where });
}

/**
 * 사용자가 특정 조직의 관리자인지 확인
 *
 * @param userId - auth-core User.id
 * @param organizationId - KPA Organization ID
 * @returns true if user is admin of the organization
 */
export async function isOrganizationAdmin(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const member = await getKpaMemberRole(userId, organizationId);
  return member?.role === 'admin';
}
