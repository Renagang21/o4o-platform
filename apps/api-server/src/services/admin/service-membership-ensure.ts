/**
 * service_memberships ensure — 단일 정본
 * (WO-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1 계약을
 *  WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 에서 추출)
 *
 * **ensure membership existence ≠ approve / reactivate membership.**
 *   - membership 이 없으면 `status='active'` 로 생성한다.
 *   - 이미 있으면 **status·role 을 절대 바꾸지 않는다** (pending·suspended·rejected·withdrawn 유지).
 *     재활성화는 canonical 승인 경로(MembershipApprovalService)만 담당한다.
 *
 * 운영자 등록(`AdminUserController`) · 직접 지정 · 초대 수락이 모두 이 함수를 쓴다.
 * 같은 계약을 두 번 구현하면 한쪽만 고쳐져 권한이 조용히 복구되는 사고가 다시 난다.
 */
import type { EntityManager } from 'typeorm';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { AppDataSource } from '../../database/connection.js';
import type { ServiceMembership } from '../../modules/auth/entities/ServiceMembership.js';

export type MembershipPolicy = 'CREATED' | 'KEEP_EXISTING_STATUS' | 'MIXED' | 'NOT_APPLICABLE';

export interface MembershipEnsureResult {
  created: number;
  kept: number;
  policy: MembershipPolicy;
  /** 보존된 기존 membership 의 현재 상태(서비스별). 응답에서 숨기지 않기 위해 돌려준다. */
  existingStatuses: Record<string, string>;
}

export function resolveMembershipPolicy(created: number, kept: number): MembershipPolicy {
  if (created > 0 && kept > 0) return 'MIXED';
  if (created > 0) return 'CREATED';
  if (kept > 0) return 'KEEP_EXISTING_STATUS';
  return 'NOT_APPLICABLE';
}

export async function ensureServiceMembershipsForRoles(
  userId: string,
  roles: string[],
  manager?: EntityManager,
): Promise<MembershipEnsureResult> {
  const smRepo = (manager ?? AppDataSource).getRepository<ServiceMembership>('ServiceMembership');
  const processedServices = new Set<string>();
  const existingStatuses: Record<string, string> = {};
  let created = 0;
  let kept = 0;

  for (const r of roles) {
    const parts = r.split(':');
    if (parts.length !== 2) continue;
    const [rolePrefix, roleName] = parts;
    const serviceKey = resolveCanonicalServiceKey(rolePrefix);
    if (processedServices.has(serviceKey)) continue;
    processedServices.add(serviceKey);

    const existing = await smRepo.findOne({ where: { userId, serviceKey } as any });
    if (!existing) {
      const membership = smRepo.create({
        userId,
        serviceKey,
        status: 'active',
        role: roleName,
      } as any);
      await smRepo.save(membership);
      created += 1;
    } else {
      // 기존 membership 은 status·role 모두 건드리지 않는다.
      existingStatuses[serviceKey] = (existing as { status?: string }).status ?? 'unknown';
      kept += 1;
    }
  }

  return { created, kept, policy: resolveMembershipPolicy(created, kept), existingStatuses };
}
