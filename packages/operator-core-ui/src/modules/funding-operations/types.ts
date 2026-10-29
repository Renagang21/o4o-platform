export type TrialStatus =
  | 'draft' | 'submitted' | 'recruiting'
  | 'development' | 'outcome_confirming' | 'fulfilled' | 'closed';

export interface TrialProductRef {
  id: string;
  name: string;
  regulatoryType: string | null;
  drugCategory: string | null;
  manufacturerName: string | null;
}

export interface Trial {
  id: string;
  title: string;
  // WO-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1 / DISPLAY-V2:
  // 참고한 등록 제품의 optional legacy reference. 주문·가격·개설 조건이 아니다.
  productId?: string | null;
  product?: TrialProductRef | null;
  // WO-MARKET-TRIAL-PROPOSAL-STRUCTURE-V1
  oneLiner?: string | null;
  // WO-MARKET-TRIAL-VIDEO-FIELD-V1
  videoUrl?: string | null;
  description?: string;
  // WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1
  salesScenarioContent?: string | null;
  supplierId: string;
  supplierName?: string;
  status: TrialStatus;
  reviewStatus?: string;
  reviewReason?: string | null;
  forumPending?: boolean;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  eligibleRoles?: string[];
  rewardOptions?: string[];
  maxParticipants?: number;
  currentParticipants: number;
  startDate?: string;
  endDate?: string;
  trialPeriodDays?: number;
  // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
  targetAmount?: number | null;
  currentAmount?: number;
  trialUnitPrice?: number | null;
  rewardRate?: number;
  amountRate?: number | null;
  recruitRate?: number | null;
  // WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1
  forumPostId?: string;
  settlementPreview?: {
    totalAmount: number;
    productQty: number;
    remainder: number;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OperatorTrial extends Trial {
  forumReady?: boolean;
  forumLink?: {
    forumPostId?: string;
    forumId?: string;
    slug: string | null;
    url: string;
  } | null;
}

export type SettlementStatus =
  | 'pending' | 'choice_pending' | 'choice_completed' | 'offline_review' | 'offline_settled';

export type PaymentStatus =
  | 'unpaid' | 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded';

export interface TrialParticipant {
  id: string;
  withdrawn?: boolean;
  name: string;
  type: string;
  rewardType: string | null;
  rewardStatus: string;
  organizationId: string | null;
  joinedAt: string;
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  contributionAmount: number;
  rewardRate: number;
  totalSettlementAmount: number;
  trialUnitPrice: number | null;
  estimatedProductQty: number | null;
  estimatedRemainder: number | null;
  settlementStatus: SettlementStatus;
  settlementChoice: 'product' | 'cash' | null;
  settlementAmount: number | null;
  settlementProductQty: number | null;
  settlementRemainder: number | null;
  settlementNote: string | null;
  // WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
  paymentVersion: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReference: string | null;
  paidAmount: number | null;
  paidAt: string | null;
  confirmedAt: string | null;
  paymentNote: string | null;
  updatedAt: string;
}

export interface ParticipantSummary {
  recordCount?: number;
  withdrawnCount?: number;
  totalCount: number;
  productCount: number;
  cashCount: number;
  fulfilledCount: number;
  pendingCount: number;
  fulfillmentRate: number;
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  settlementPendingCount: number;
  choicePendingCount: number;
  choiceCompletedCount: number;
  offlineReviewCount: number;
  offlineSettledCount: number;
}

export interface ParticipantListResponse {
  summary: ParticipantSummary;
  participants: TrialParticipant[];
}

export interface CreateTrialPayload {
  title: string;
  // WO-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1: 선택 공급자 상품(ProductMaster id) soft 참조
  productId?: string | null;
  // WO-MARKET-TRIAL-PROPOSAL-STRUCTURE-V1
  oneLiner?: string;
  // WO-MARKET-TRIAL-VIDEO-FIELD-V1
  videoUrl?: string;
  description?: string;
  // WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1
  salesScenarioContent?: string;
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };
  maxParticipants?: number;
  fundingStartAt: string;
  fundingEndAt: string;
  trialPeriodDays: number;
  // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
  targetAmount?: number;
  trialUnitPrice?: number;
  rewardRate?: number;
}

export type UpdateTrialPayload = Partial<CreateTrialPayload>;

export interface TrialResultsSummary {
  totalCount: number;
  productCount: number;
  cashCount: number;
  fulfilledCount: number;
  pendingCount: number;
  fulfillmentRate: number;
  recruitRate: number | null;
}

export interface TrialResults {
  forum?: { id: string; slug: string } | null;
  trial: Trial;
  summary: TrialResultsSummary;
  forumPostId: string | null;
}

export interface Participation {
  id: string;
  trialId: string;
  userId: string;
  rewardType: 'cash' | 'product';
  rewardStatus: 'pending' | 'fulfilled';
  createdAt: string;
}

export type CreditProcessStatus = 'not_applicable' | 'pending' | 'planned' | 'completed';

export interface ParticipationInfo {
  paymentStatus?: PaymentStatus;
  paidAmount?: number | null;
  paidAt?: string | null;
  confirmedAt?: string | null;
  withdrawn?:boolean; refundedAmount?:number;refundedAt?:string|null;
  id: string;
  trialId: string;
  participantId: string;
  role: string;
  rewardType: 'cash' | 'product';
  rewardStatus: 'pending' | 'fulfilled';
  joinedAt: string;
}

export interface ParticipationInfoDetail extends ParticipationInfo {
  settlementChoice: 'product' | 'cash' | null;
  settlementStatus: SettlementStatus;
  settlementAmount: number | null;
  settlementProductQty: number | null;
  settlementRemainder: number | null;
  creditProcessStatus: CreditProcessStatus;
  settlementNote: string | null;
  contributionAmount?: number;
  rewardRate?: number;
  totalSettlementAmount?: number;
  trialUnitPrice?: number | null;
  estimatedProductQty?: number | null;
  estimatedRemainder?: number | null;
}

export interface MyParticipationSummary extends ParticipationInfoDetail {
  trial?: {
    id: string;
    title: string;
    status: TrialStatus;
    supplierName?: string;
  };
}

export interface ConvertTrialPayload {
  /** Link to existing ProductMaster (A안) */
  productId?: string;
  /** Create new ProductMaster (B안) */
  productName?: string;
}

export interface TrialConversionResult {
  trial: OperatorTrial;
  conversionResult: {
    productId: string;
    productName: string;
    productRewardCount: number;
    note: string | null;
  };
}

export interface ProductSearchItem {
  id: string;
  name: string;
  supplierName: string;
  categoryName: string;
  regulatoryType: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductSearchResponse {
  data: ProductSearchItem[];
  meta: { total: number; page: number; limit: number };
}

export interface ParticipantFilters {
  rewardType?: 'product' | 'cash';
  rewardStatus?: 'pending' | 'fulfilled';
  paymentStatus?: PaymentStatus;
}

export interface UpdateParticipantPaymentInput {
  version: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string | null;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  paidAmount?: number | null;
  paidAt?: string | null;       // ISO datetime
  confirmedAt?: string | null;  // ISO datetime
  paymentNote?: string | null;
}

export interface UpdateParticipantPaymentResult {
  paymentVersion: number;
  id: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReference: string | null;
  paidAmount: number | null;
  paidAt: string | null;
  confirmedAt: string | null;
  paymentNote: string | null;
  updatedAt: string | null;
}

export type ForumSyncStage = 'category_check' | 'forum_post_create' | 'forum_mapping_save';

export type ForumSyncSeverity = 'critical' | 'warning';

export interface ForumSyncFailure {
  id: string;
  trialId: string;
  trialTitle: string;
  stage: ForumSyncStage;
  severity: ForumSyncSeverity;
  errorMessage: string;
  occurredAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface ForumSyncFailureListResponse {
  data: ForumSyncFailure[];
  meta: { total: number; page: number; limit: number };
}

export interface MarketTrialKpiSnapshot {
  totalTrials: number;
  recruitingTrials: number;
  developmentTrials: number;
  outcomeConfirmingTrials: number;
  fulfilledTrials: number;
  closedTrials: number;
  successfulTrials: number;
  failedTrials: number;
  successRate: number | null;
  totalParticipants: number;
  totalRecruitingAmount: number;
  totalPaidAmount: number;
  paidParticipantCount: number;
  refundCount: number;
  paymentCompletionRate: number | null;
  averageAchievementRate: number | null;
}

export interface MarketTrialDetailKpi {
  trialId: string;
  status: string;
  achievementRate: number | null;
  participationRate: number | null;
  participantCount: number;
  paidParticipantCount: number;
  unpaidParticipantCount: number;
  failedPaymentCount: number;
  refundCount: number;
  paymentCompletionRate: number | null;
  totalPaidAmount: number;
  recruitingRemainingDays: number | null;
  recruitingProgressPercent: number | null;
  closeReason: string | null;
}

export interface FundingForumAccess { forum: { id: string; slug: string } | null; canRead: boolean; canWrite: boolean; canManage: boolean; canModerate: boolean; member: boolean; participant: boolean; }
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: '입금 전',
  pending: '입금 확인 대기',
  paid: '입금 확인 완료',
  failed: '입금 확인 실패',
  canceled: '참여 취소',
  refunded: '환불 처리됨',
};
