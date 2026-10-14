import { TrialStatus, type MarketTrial } from '@o4o/market-trial';

export type FundingEvent = MarketTrial['statusHistory'][number] & {
  actorUserId?: string;
  supplierAccountId?: string;
  supplierOrganizationId?: string | null;
};
export const FUNDING_ACTIVE_STATUSES = [TrialStatus.RECRUITING, TrialStatus.DEVELOPMENT, TrialStatus.OUTCOME_CONFIRMING, TrialStatus.FULFILLED];
export const FUNDING_PUBLIC_STATUSES = [...FUNDING_ACTIVE_STATUSES, TrialStatus.CLOSED];
export const fundingForumCode = (id: string) => `funding:${id}`;
export const fundingForumSlug = (id: string) => `funding-${id}`;
export const fundingHistory = (trial: Pick<MarketTrial, 'statusHistory'>): FundingEvent[] => trial.statusHistory ?? [];

export function fundingReview(trial: Pick<MarketTrial, 'statusHistory' | 'status'>) {
  const last = [...fundingHistory(trial)].reverse().find(e => ['funding_approved', 'funding_submitted', 'funding_rejected'].includes(e.reason) || e.reason.startsWith('funding_rejected:'));
  const rejected = last?.reason.startsWith('funding_rejected') ?? false;
  return {
    reviewStatus: rejected ? 'rejected' : last?.reason === 'funding_approved' ? 'approved' : trial.status === TrialStatus.SUBMITTED ? 'pending' : FUNDING_ACTIVE_STATUSES.includes(trial.status) ? 'approved' : 'draft',
    reviewReason: rejected ? last!.reason.slice('funding_rejected:'.length) : null,
    reviewedAt: last && (rejected || last.reason === 'funding_approved') ? last.at : null,
    forumPending: trial.status === TrialStatus.SUBMITTED && last?.reason === 'funding_approved',
  };
}
export function fundingWasApproved(trial: Pick<MarketTrial, 'statusHistory' | 'status'> & Partial<Pick<MarketTrial, 'closeReason'>>): boolean {
  return fundingReview(trial).reviewStatus === 'approved' || isFundingPublic(trial);
}
export function fundingOwnerContext(trial: Pick<MarketTrial, 'statusHistory'>) {
  return fundingHistory(trial).find(e => e.reason === 'funding_created');
}

export function isFundingPublic(trial: Pick<MarketTrial, 'status' | 'statusHistory'> & Partial<Pick<MarketTrial, 'closeReason'>>): boolean {
  if (FUNDING_ACTIVE_STATUSES.includes(trial.status)) return true;
  return trial.status === TrialStatus.CLOSED && (trial.closeReason?.startsWith('auto_') === true || fundingHistory(trial).some(e => e.reason === 'funding_approved' || FUNDING_ACTIVE_STATUSES.includes(e.from as TrialStatus)));
}

export const FUNDING_PROGRESS_TRANSITIONS: Partial<Record<TrialStatus, TrialStatus[]>> = {
  [TrialStatus.RECRUITING]: [TrialStatus.DEVELOPMENT], [TrialStatus.DEVELOPMENT]: [TrialStatus.OUTCOME_CONFIRMING],
  [TrialStatus.OUTCOME_CONFIRMING]: [TrialStatus.FULFILLED], [TrialStatus.FULFILLED]: [TrialStatus.CLOSED],
};
