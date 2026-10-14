import type { DataSource } from 'typeorm';
import { hasCommunityServiceAdmin } from './community-service-operator-access.js';
import { CommunityMembershipMutationError, hasEligibleCommunityMembership, protectLastCommunityAdmin, recordCommunityMembershipChange } from './community-membership-mutations.js';
import { demoAccountService, DEMO_ACCOUNT_FORBIDDEN_CODE, DEMO_ACCOUNT_FORBIDDEN_MESSAGE } from '../auth/demo-account.service.js';

export type CommunityMemberAction = 'suspend' | 'restore' | 'withdraw';
const transitions: Record<CommunityMemberAction, { from: string[]; to: string }> = {
  suspend: { from: ['active'], to: 'suspended' },
  restore: { from: ['suspended'], to: 'active' },
  withdraw: { from: ['active', 'suspended'], to: 'withdrawn' },
};

export class CommunityMemberManagementService {
  constructor(private readonly db: Pick<DataSource, 'transaction'>) {}
  /** 본인 개별 가입만 종료한다. 관리자 제재 권한·대상 ID를 받지 않는다. */
  async withdrawSelf(input: { communityId: string; actorUserId: string }) {
    if (!input.actorUserId) throw new CommunityMembershipMutationError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
    return this.db.transaction(async m => {
      const communities = await m.query("SELECT id FROM communities WHERE id = $1 AND status = 'active' FOR UPDATE", [input.communityId]);
      if (!communities.length) throw new CommunityMembershipMutationError(404, 'COMMUNITY_NOT_FOUND', '커뮤니티를 찾을 수 없습니다.');
      const [target] = await m.query('SELECT id, user_id, role, status FROM community_memberships WHERE community_id = $1 AND user_id = $2 FOR UPDATE', [input.communityId, input.actorUserId]);
      if (!target) throw new CommunityMembershipMutationError(404, 'MEMBERSHIP_NOT_FOUND', '본인의 가입 행을 찾을 수 없습니다.');
      if (target.status === 'withdrawn') return { changed: false, status: 'withdrawn' };
      if (target.status !== 'active') throw new CommunityMembershipMutationError(409, 'INVALID_MEMBERSHIP_TRANSITION', '활성 가입만 직접 탈퇴할 수 있습니다. 정지·신청 상태는 운영자에게 문의하세요.');
      if (await demoAccountService.isDemoAccount(target.user_id, m)) throw new CommunityMembershipMutationError(403, DEMO_ACCOUNT_FORBIDDEN_CODE, DEMO_ACCOUNT_FORBIDDEN_MESSAGE);
      if (target.role === 'admin') await protectLastCommunityAdmin(m, input.communityId, target.id);
      await m.query('UPDATE community_memberships SET status = $1, role = $2, updated_at = NOW() WHERE id = $3 AND community_id = $4', ['withdrawn', 'member', target.id, input.communityId]);
      await recordCommunityMembershipChange(m, {
        ...input, membershipId: target.id, action: 'withdraw', reason: '본인 탈퇴',
        beforeRole: target.role, afterRole: 'member', beforeStatus: target.status, afterStatus: 'withdrawn',
      });
      return { changed: true, status: 'withdrawn' };
    });
  }
  async change(input: { communityId: string; membershipId: string; actorUserId: string; action: CommunityMemberAction; reason: string }) {
    const transition = transitions[input.action];
    if (!transition) throw new CommunityMembershipMutationError(400, 'INVALID_ACTION', '지원하지 않는 회원 처리입니다.');
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (!reason || reason.length > 1000) throw new CommunityMembershipMutationError(400, 'REASON_REQUIRED', '처리 사유를 1~1000자로 입력하세요.');
    return this.db.transaction(async m => {
      const communities = await m.query("SELECT id FROM communities WHERE id = $1 AND status = 'active' FOR UPDATE", [input.communityId]);
      if (!communities.length) throw new CommunityMembershipMutationError(404, 'COMMUNITY_NOT_FOUND', '커뮤니티를 찾을 수 없습니다.');
      // Recheck privileges after the parent lock; an old request must not outlive a demotion.
      const actors = await m.query('SELECT role, status FROM community_memberships WHERE community_id = $1 AND user_id = $2', [input.communityId, input.actorUserId]);
      const individualAdmin = actors[0]?.role === 'admin' && actors[0]?.status === 'active' && await hasEligibleCommunityMembership(m, input.actorUserId);
      if (!individualAdmin && !await hasCommunityServiceAdmin(m, input.actorUserId)) {
        throw new CommunityMembershipMutationError(403, 'COMMUNITY_ADMIN_REQUIRED', '이 커뮤니티의 admin만 회원을 제한할 수 있습니다.');
      }
      const [target] = await m.query('SELECT id, user_id, role, status FROM community_memberships WHERE id = $1 AND community_id = $2 FOR UPDATE', [input.membershipId, input.communityId]);
      if (!target) throw new CommunityMembershipMutationError(404, 'MEMBERSHIP_NOT_FOUND', '가입 행을 찾을 수 없습니다.');
      if (target.status === transition.to) return { changed: false, status: target.status };
      if (!transition.from.includes(target.status)) throw new CommunityMembershipMutationError(409, 'INVALID_MEMBERSHIP_TRANSITION', '현재 가입 상태에서는 처리할 수 없습니다.');
      if (await demoAccountService.isDemoAccount(target.user_id, m)) throw new CommunityMembershipMutationError(403, DEMO_ACCOUNT_FORBIDDEN_CODE, DEMO_ACCOUNT_FORBIDDEN_MESSAGE);
      if (target.role === 'admin' && target.status === 'active' && input.action !== 'restore') await protectLastCommunityAdmin(m, input.communityId, target.id);
      if (input.action === 'restore' && !await hasEligibleCommunityMembership(m, target.user_id)) throw new CommunityMembershipMutationError(409, 'SERVICE_MEMBERSHIP_NOT_ACTIVE', '메인 계정과 커뮤니티 서비스 가입을 먼저 활성화하세요.');
      const role = input.action === 'withdraw' ? 'member' : target.role;
      await m.query('UPDATE community_memberships SET status = $1, role = $2, updated_at = NOW() WHERE id = $3 AND community_id = $4', [transition.to, role, target.id, input.communityId]);
      await recordCommunityMembershipChange(m, { ...input, beforeRole: target.role, afterRole: role, beforeStatus: target.status, afterStatus: transition.to, membershipId: target.id, reason });
      return { changed: true, status: transition.to };
    });
  }
}
