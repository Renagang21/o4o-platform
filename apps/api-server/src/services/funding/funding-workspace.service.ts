import type { DataSource, EntityManager } from 'typeorm';
import { MarketTrial, MarketTrialParticipant, TrialStatus } from '@o4o/market-trial';
import { fundingForumCode, fundingForumSlug, fundingHistory, fundingReview, fundingWasApproved, FUNDING_PROGRESS_TRANSITIONS, type FundingEvent } from './funding-review.js';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { isFundingCreator } from './funding-access.js';

export class FundingError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export class FundingWorkspaceService {
  constructor(private ds: DataSource) {}
  private async locked(m: EntityManager, id: string) {
    const trial = await m.getRepository(MarketTrial).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!trial) throw new FundingError(404, 'FUNDING_NOT_FOUND', '펀딩을 찾을 수 없습니다.');
    return trial;
  }
  private event(trial: MarketTrial, reason: string, actor: string, next: TrialStatus = trial.status): FundingEvent {
    return { from: trial.status, to: next, at: new Date().toISOString(), reason, auto: false, actorUserId: actor };
  }
  async review(id: string, actor: string, approve: boolean, reason?: string) {
    if (!approve && (!reason?.trim() || reason.trim().length > 1000)) throw new FundingError(400, 'REVIEW_REASON_REQUIRED', '반려 사유를 1~1,000자로 입력해 주세요.');
    return this.ds.transaction(async m => {
      const trial = await this.locked(m, id);
      if (trial.status !== TrialStatus.SUBMITTED || fundingReview(trial).forumPending) throw new FundingError(409, 'REVIEW_CONFLICT', '이미 처리됐거나 심사 대기 상태가 아닙니다.');
      if (approve && !await isFundingCreator(this.ds, trial, trial.supplierId)) throw new FundingError(409, 'CREATOR_NOT_ACTIVE', '개설자의 공급자 자격을 먼저 확인해 주세요.');
      trial.statusHistory = [...fundingHistory(trial), this.event(trial, approve ? 'funding_approved' : `funding_rejected:${reason!.trim()}`, actor, approve ? trial.status : TrialStatus.DRAFT)];
      if (!approve) trial.status = TrialStatus.DRAFT;
      return m.getRepository(MarketTrial).save(trial);
    });
  }
  /** Stable unique slug + trial row lock protect concurrent retries without new schema. */
  async ensureForum(id: string, actor: string) {
    return this.ds.transaction(async m => {
      const trial = await this.locked(m, id);
      if (!fundingWasApproved(trial) || trial.status === TrialStatus.CLOSED) throw new FundingError(409, 'FUNDING_NOT_APPROVED', '승인된 진행 중 펀딩만 포럼을 개설할 수 있습니다.');
      if (!await isFundingCreator(this.ds, trial, trial.supplierId)) throw new FundingError(409, 'CREATOR_NOT_ACTIVE', '개설자의 공급자 자격을 먼저 확인해 주세요.');
      const code = fundingForumCode(id), slug = fundingForumSlug(id);
      let [forum] = await m.query(`SELECT id, slug FROM forum_category_requests WHERE slug = $1 AND service_code = $2 AND status = 'completed' LIMIT 1`, [slug, code]);
      const existed = !!forum;
      if (!forum) {
        [forum] = await m.query(`INSERT INTO forum_category_requests
          (name, description, service_code, requester_id, requester_name, reviewer_id, reviewed_at, forum_type, status, slug, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'closed', 'completed', $7, $8::jsonb) RETURNING id, slug`,
          [trial.title.slice(0, 100), '해당 펀딩의 참여자를 위한 공지·토론 공간', code, trial.supplierId, (trial.supplierName || '').slice(0, 100), actor, slug, JSON.stringify({ fundingTrialId: id })]);
        if (!forum) throw new Error('Forum creation returned no row');
      }
      await m.query(`INSERT INTO forum_category_members (forum_category_id, user_id, role, joined_at, created_at, updated_at)
        VALUES ($1, $2, 'owner', NOW(), NOW(), NOW()) ON CONFLICT (forum_category_id, user_id) DO UPDATE SET role = 'owner', updated_at = NOW()`, [forum.id, trial.supplierId]);
      if (trial.status === TrialStatus.SUBMITTED) {
        trial.statusHistory = [...fundingHistory(trial), this.event(trial, 'funding_forum_ready', actor, TrialStatus.RECRUITING)];
        trial.status = TrialStatus.RECRUITING;
        await m.getRepository(MarketTrial).save(trial);
      }
      return { trial, forum, created: !existed };
    });
  }
  async changeStatus(id: string, actor: string, next: TrialStatus, creator = false) {
    return this.ds.transaction(async m => {
      const trial = await this.locked(m, id);
      if (creator && trial.supplierId !== actor) throw new FundingError(403, 'FUNDING_NOT_OWNER', '자기 펀딩만 관리할 수 있습니다.');
      if (!FUNDING_PROGRESS_TRANSITIONS[trial.status]?.includes(next)) throw new FundingError(409, 'FUNDING_STATUS_CONFLICT', '허용되지 않는 상태 변경입니다.');
      trial.statusHistory = [...fundingHistory(trial), this.event(trial, creator ? 'creator_progress' : 'operator_progress', actor, next)];
      trial.status = next;
      await m.getRepository(MarketTrial).save(trial);
      if (next === TrialStatus.OUTCOME_CONFIRMING) await m.query(`UPDATE market_trial_participants SET "settlementStatus" = 'choice_pending' WHERE "marketTrialId" = $1 AND COALESCE("settlementStatus", 'pending') = 'pending'`, [id]);
      return trial;
    });
  }

  /** Participation records interest; it does not confirm payment or forum membership. */
  async join(id: string, actor: string, rewardType: string) {
    return this.ds.transaction(async m => {
      if (await getNetureMainMembershipStatus(m, actor) !== 'active') throw new FundingError(403, 'MAIN_MEMBERSHIP_REQUIRED', '정상 계정과 이메일 확인이 필요합니다.');
      const trial = await this.locked(m, id);
      const now = Date.now();
      if (trial.status !== TrialStatus.RECRUITING || now < new Date(trial.fundingStartAt).getTime() || now >= new Date(trial.fundingEndAt).getTime()) throw new FundingError(409, 'FUNDING_NOT_RECRUITING', '모집 기간 중인 펀딩만 참여할 수 있습니다.');
      if (trial.maxParticipants && trial.currentParticipants >= trial.maxParticipants) throw new FundingError(409, 'FUNDING_FULL', '모집 인원이 마감되었습니다.');
      if (!['cash', 'product'].includes(rewardType) || !trial.rewardOptions.includes(rewardType)) throw new FundingError(400, 'INVALID_REWARD', '허용된 참여 조건을 선택해 주세요.');
      const participants = m.getRepository(MarketTrialParticipant);
      if (await participants.findOne({ where: { marketTrialId: id, participantId: actor } })) throw new FundingError(409, 'ALREADY_PARTICIPANT', '이미 참여한 펀딩입니다.');
      const participant = await participants.save(participants.create({ marketTrialId: id, participantId: actor, participantType: 'store_owner', contributionAmount: 0, rewardType, rewardStatus: 'pending' }));
      trial.currentParticipants += 1;
      await m.getRepository(MarketTrial).save(trial);
      return { participant, trial };
    });
  }
}
