import type { DataSource, EntityManager } from 'typeorm';
import { MarketTrial, TrialStatus } from '@o4o/market-trial';
import { isFundingCreator } from './funding-access.js';
import { fundingForumCode, fundingForumSlug, fundingWasApproved } from './funding-review.js';
import { FundingError } from './funding-workspace.service.js';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';

/** Funding membership writes share the project lock with review/progress/retries. */
export class FundingForumMembershipService {
  constructor(private readonly ds: DataSource) {}

  private async scope(m: EntityManager, trialId: string, forumId: string, actor: string, owner: boolean) {
    const trial = await m.getRepository(MarketTrial).findOne({ where: { id: trialId }, lock: { mode: 'pessimistic_write' } });
    if (!trial || !fundingWasApproved(trial) || [TrialStatus.DRAFT, TrialStatus.SUBMITTED, TrialStatus.CLOSED].includes(trial.status)) {
      throw new FundingError(409, 'FORUM_READ_ONLY', '진행 중 펀딩만 포럼 회원을 변경할 수 있습니다.');
    }
    if (await getNetureMainMembershipStatus(m, actor) !== 'active') throw new FundingError(403, 'MAIN_MEMBERSHIP_REQUIRED', '정상 계정과 이메일 확인이 필요합니다.');
    const [forum] = await m.query(`SELECT id FROM forum_category_requests WHERE id = $1 AND slug = $2 AND service_code = $3 AND status = 'completed'`, [forumId, fundingForumSlug(trialId), fundingForumCode(trialId)]);
    if (!forum) throw new FundingError(404, 'FORUM_NOT_FOUND', '이 펀딩의 포럼이 아닙니다.');
    if (owner && !await isFundingCreator(this.ds, trial, actor)) throw new FundingError(403, 'FORUM_NOT_OWNER', '개설자만 포럼 회원을 관리할 수 있습니다.');
    return trial;
  }

  request(trialId: string, forumId: string, actor: string) {
    return this.ds.transaction(async m => {
      await this.scope(m, trialId, forumId, actor, false);
      const [participant] = await m.query(`SELECT id FROM market_trial_participants WHERE "marketTrialId" = $1 AND "participantId" = $2`, [trialId, actor]);
      if (!participant) throw new FundingError(403, 'NOT_PARTICIPANT', '참여 신청 후 포럼 이용을 신청해 주세요.');
      const [member] = await m.query(`SELECT id FROM forum_category_members WHERE forum_category_id = $1 AND user_id = $2`, [forumId, actor]);
      if (member) throw new FundingError(409, 'ALREADY_MEMBER', '이미 포럼 회원입니다.');
      const [pending] = await m.query(`SELECT id FROM forum_join_requests WHERE forum_category_id = $1 AND user_id = $2 AND status = 'pending'`, [forumId, actor]);
      if (pending) throw new FundingError(409, 'PENDING_REQUEST', '승인 대기 중입니다.');
      const [request] = await m.query(`INSERT INTO forum_join_requests (id, forum_category_id, user_id, status, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, 'pending', NOW(), NOW()) RETURNING *`, [forumId, actor]);
      return request;
    });
  }

  async review(trialId: string, forumId: string, requestId: string, actor: string, approve: boolean, comment?: string) {
    if (comment !== undefined && (typeof comment !== 'string' || comment.length > 1000)) throw new FundingError(400, 'INVALID_COMMENT', '검토 메모는 1,000자 이내로 입력해 주세요.');
    return await this.ds.transaction(async m => {
      await this.scope(m, trialId, forumId, actor, true);
      const [request] = await m.query(`SELECT id, user_id FROM forum_join_requests WHERE id = $1 AND forum_category_id = $2 AND status = 'pending' FOR UPDATE`, [requestId, forumId]);
      if (!request) throw new FundingError(409, 'REQUEST_CONFLICT', '이미 처리됐거나 해당 포럼의 신청이 아닙니다.');
      if (approve) {
        const [participant] = await m.query(`SELECT id FROM market_trial_participants WHERE "marketTrialId" = $1 AND "participantId" = $2`, [trialId, request.user_id]);
        if (!participant) throw new FundingError(409, 'NOT_PARTICIPANT', '해당 펀딩 참여자만 승인할 수 있습니다.');
      }
      const status = approve ? 'approved' : 'rejected';
      await m.query(`UPDATE forum_join_requests SET status = $1, reviewer_id = $2, review_comment = $3, reviewed_at = NOW(), updated_at = NOW() WHERE id = $4 AND forum_category_id = $5 AND status = 'pending'`, [status, actor, comment?.trim() || null, requestId, forumId]);
      if (approve) await m.query(`INSERT INTO forum_category_members (forum_category_id, user_id, role, joined_at, created_at, updated_at) VALUES ($1, $2, 'member', NOW(), NOW(), NOW()) ON CONFLICT (forum_category_id, user_id) DO NOTHING`, [forumId, request.user_id]);
      return { requestId, status, userId: request.user_id };
    });
  }

  remove(trialId: string, forumId: string, target: string, actor: string) {
    return this.ds.transaction(async m => {
      const trial = await this.scope(m, trialId, forumId, actor, true);
      if (target === trial.supplierId) throw new FundingError(409, 'MEMBER_NOT_REMOVABLE', '개설자는 포럼에서 제거할 수 없습니다.');
      const [member] = await m.query(`DELETE FROM forum_category_members WHERE forum_category_id = $1 AND user_id = $2 AND role <> 'owner' RETURNING id`, [forumId, target]);
      if (!member) throw new FundingError(409, 'MEMBER_NOT_REMOVABLE', '개설자는 제거할 수 없으며, 이미 제거된 회원일 수 있습니다.');
      return { removed: true, userId: target };
    });
  }
}
