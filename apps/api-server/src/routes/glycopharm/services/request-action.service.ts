/**
 * RequestActionService
 *
 * WO-O4O-REQUEST-POST-ACTION-PHASE2C
 *
 * 승인 후속 액션 자동 생성 서비스
 *
 * 핵심 규칙:
 * - 승인 시 purpose에 따라 action log 자동 생성
 * - 모든 결과물은 "초안(draft)" — 사람이 완료
 * - OrderType.GLYCOPHARM BLOCKED → order_draft는 메모 수준만
 * - survey_followup / info_followup → 즉시 completed (사실상 기록)
 */

import { DataSource, type Repository } from 'typeorm';
import {
  GlycopharmRequestActionLog,
  type RequestActionType,
  type RequestActionStatus,
} from '../entities/request-action-log.entity.js';
import {
  GlycopharmCustomerRequest,
  type CustomerRequestPurpose,
} from '../entities/customer-request.entity.js';

/** Purpose → ActionType 매핑 */
const PURPOSE_TO_ACTION: Record<CustomerRequestPurpose, RequestActionType> = {
  consultation: 'consultation_log',
  sample: 'sample_fulfillment',
  order: 'order_draft',
  survey_followup: 'followup_log',
  info_followup: 'followup_log',
};

/** Purpose → 초기 status 매핑 */
const PURPOSE_TO_STATUS: Record<CustomerRequestPurpose, RequestActionStatus> = {
  consultation: 'draft',
  sample: 'draft',
  order: 'draft',
  survey_followup: 'completed',
  info_followup: 'completed',
};

/** 거절 사유 enum */
export type RejectReason =
  | 'out_of_stock'
  | 'unavailable_time'
  | 'unmet_conditions'
  | 'duplicate'
  | 'other';

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  out_of_stock: '재고 없음',
  unavailable_time: '대응 불가 시간',
  unmet_conditions: '조건 미충족',
  duplicate: '중복 요청',
  other: '기타',
};

export const VALID_REJECT_REASONS: RejectReason[] = [
  'out_of_stock',
  'unavailable_time',
  'unmet_conditions',
  'duplicate',
  'other',
];

/** 액션 생성 결과 */
export interface ActionCreationResult {
  actionLogId: string;
  actionType: RequestActionType;
  status: RequestActionStatus;
}

export class RequestActionService {
  private actionRepo: Repository<GlycopharmRequestActionLog>;
  private requestRepo: Repository<GlycopharmCustomerRequest>;

  constructor(private dataSource: DataSource) {
    this.actionRepo = dataSource.getRepository(GlycopharmRequestActionLog);
    this.requestRepo = dataSource.getRepository(GlycopharmCustomerRequest);
  }

  /**
   * 승인 후속 액션 생성
   *
   * Request가 승인될 때 호출.
   * Purpose에 따라 적절한 action log를 생성하고
   * request.metadata에 actionLogId를 기록.
   */
  async createPostApprovalAction(
    request: GlycopharmCustomerRequest,
    performedBy: string,
    note?: string,
  ): Promise<ActionCreationResult> {
    const actionType = PURPOSE_TO_ACTION[request.purpose];
    const status = PURPOSE_TO_STATUS[request.purpose];

    const actionMetadata = this.buildInitialMetadata(request);

    const actionLog = this.actionRepo.create({
      requestId: request.id,
      actionType,
      status,
      performedBy,
      note: note || undefined,
      metadata: actionMetadata,
    });

    const saved = await this.actionRepo.save(actionLog);

    // request.metadata에 actionLogId 기록
    const updatedMetadata = {
      ...(request.metadata || {}),
      actionLogId: saved.id,
      actionType: saved.actionType,
      actionStatus: saved.status,
    };
    await this.requestRepo.update(request.id, { metadata: updatedMetadata } as any);

    return {
      actionLogId: saved.id,
      actionType: saved.actionType,
      status: saved.status,
    };
  }

  /**
   * 목적별 초기 metadata 구성
   */
  private buildInitialMetadata(
    request: GlycopharmCustomerRequest,
  ): Record<string, any> {
    const base = {
      requestPurpose: request.purpose,
      pharmacyId: request.pharmacyId,
      customerName: request.customerName || null,
      customerContact: request.customerContact || null,
    };

    switch (request.purpose) {
      case 'consultation':
        return {
          ...base,
          consultationType: request.metadata?.consultationType || 'general',
        };
      case 'sample':
        return {
          ...base,
          productId: request.metadata?.productId || null,
          productName: request.metadata?.productName || null,
        };
      case 'order':
        return {
          ...base,
          // NOTE: OrderType.GLYCOPHARM is BLOCKED (CLAUDE.md)
          // order_draft는 메모 수준 — E-commerce Core 주문 생성 불가
          orderNote: 'Draft - requires manual processing',
          productId: request.metadata?.productId || null,
        };
      case 'survey_followup':
      case 'info_followup':
        return {
          ...base,
          sourceEventId: request.metadata?.sourceEventId || null,
          autoCompleted: true,
        };
      default:
        return base;
    }
  }

  /**
   * 요청 ID로 액션 로그 조회
   */
  async getActionByRequestId(
    requestId: string,
  ): Promise<GlycopharmRequestActionLog | null> {
    return this.actionRepo.findOne({
      where: { requestId },
    });
  }
}
