/**
 * EventPromotionService
 *
 * WO-O4O-REQUEST-EVENT-CONNECTION-PHASE2A
 *
 * 이벤트 기록 + Request 승격 판단 서비스
 *
 * 핵심 규칙:
 * - Event는 전부 기록
 * - Request는 "사람 판단이 꼭 필요한 경우만" 생성
 * - 어떤 Event도 단독으로 Request를 생성하지 않는다 (조건 통과 필수)
 *
 * 승격 조건 (모두 충족):
 * 1. sourceType ∈ { qr, tablet }
 * 2. purpose ∈ { consultation, sample, order }
 * 3. eventType ∈ { qr_scan, click } (impression 단독 불가)
 * 4. 쿨타임 내 동일 Request 없음
 *
 * 승격 금지:
 * - impression 단독
 * - purpose = info | survey
 * - sourceType = web | signage | print
 * - 쿨타임 내 반복
 */

import { DataSource, type Repository } from 'typeorm';
import {
  GlycopharmEvent,
  type GlycopharmEventType,
  type GlycopharmEventSourceType,
  type GlycopharmEventPurpose,
} from '../entities/glycopharm-event.entity.js';
import {
  GlycopharmCustomerRequest,
  type CustomerRequestPurpose,
  type CustomerRequestSourceType,
} from '../entities/customer-request.entity.js';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';

/** 쿨타임 (분) */
const COOLDOWN_MINUTES = 10;

/** 승격 가능 sourceType */
const PROMOTABLE_SOURCE_TYPES: GlycopharmEventSourceType[] = ['qr', 'tablet'];

/** 승격 가능 purpose */
const PROMOTABLE_PURPOSES: GlycopharmEventPurpose[] = ['consultation', 'sample', 'order'];

/** 승격 가능 eventType */
const PROMOTABLE_EVENT_TYPES: GlycopharmEventType[] = ['qr_scan', 'click'];

export interface RecordEventDto {
  pharmacyId: string;
  eventType: GlycopharmEventType;
  sourceType: GlycopharmEventSourceType;
  sourceId?: string;
  purpose?: GlycopharmEventPurpose;
  metadata?: Record<string, any>;
}

export interface PromotionResult {
  promoted: boolean;
  requestId?: string;
  reason?: string;
}

export class EventPromotionService {
  private eventRepo: Repository<GlycopharmEvent>;
  private requestRepo: Repository<GlycopharmCustomerRequest>;
  private pharmacyRepo: Repository<OrganizationStore>;

  constructor(private dataSource: DataSource) {
    this.eventRepo = dataSource.getRepository(GlycopharmEvent);
    this.requestRepo = dataSource.getRepository(GlycopharmCustomerRequest);
    this.pharmacyRepo = dataSource.getRepository(OrganizationStore);
  }

  /**
   * 이벤트 기록 (항상 실행)
   */
  async recordEvent(dto: RecordEventDto): Promise<GlycopharmEvent> {
    const event = this.eventRepo.create({
      pharmacyId: dto.pharmacyId,
      eventType: dto.eventType,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      purpose: dto.purpose,
      metadata: dto.metadata || {},
    });

    return await this.eventRepo.save(event);
  }

  /**
   * 승격 판단 + Request 생성 (조건 충족 시만)
   *
   * 반환: promoted 여부 + requestId (생성된 경우)
   */
  async evaluateAndPromote(event: GlycopharmEvent): Promise<PromotionResult> {
    // 규칙 1: eventType 체크 (impression 단독 불가)
    if (!PROMOTABLE_EVENT_TYPES.includes(event.eventType)) {
      return { promoted: false, reason: 'event_type_not_promotable' };
    }

    // 규칙 2: sourceType 체크 (qr, tablet만)
    if (!PROMOTABLE_SOURCE_TYPES.includes(event.sourceType)) {
      return { promoted: false, reason: 'source_type_not_promotable' };
    }

    // 규칙 3: purpose 체크 (consultation, sample, order만)
    if (!event.purpose || !PROMOTABLE_PURPOSES.includes(event.purpose)) {
      return { promoted: false, reason: 'purpose_not_promotable' };
    }

    // 규칙 4: 약국 존재 확인
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: event.pharmacyId },
    });
    if (!pharmacy) {
      return { promoted: false, reason: 'pharmacy_not_found' };
    }

    // 규칙 5: 쿨타임 체크
    const withinCooldown = await this.isWithinCooldown(
      event.pharmacyId,
      event.sourceType,
      event.sourceId,
      event.purpose,
    );
    if (withinCooldown) {
      return { promoted: false, reason: 'within_cooldown' };
    }

    // 모든 조건 통과 → Request 생성
    const request = this.requestRepo.create({
      pharmacyId: event.pharmacyId,
      purpose: event.purpose as CustomerRequestPurpose,
      sourceType: event.sourceType as CustomerRequestSourceType,
      sourceId: event.sourceId,
      status: 'pending',
      requestedAt: new Date(),
      metadata: {
        sourceEventId: event.id,
        promotedFrom: 'event',
      },
    });

    const savedRequest = await this.requestRepo.save(request);

    // 이벤트에 승격 정보 기록
    event.promotedToRequestId = savedRequest.id;
    await this.eventRepo.save(event);

    return { promoted: true, requestId: savedRequest.id };
  }

  /**
   * 쿨타임 체크
   *
   * 동일 (pharmacyId + sourceType + purpose) 기준
   * sourceId가 있으면 추가 필터
   * 최근 COOLDOWN_MINUTES 이내 Request가 있으면 true
   */
  private async isWithinCooldown(
    pharmacyId: string,
    sourceType: string,
    sourceId: string | undefined,
    purpose: string,
  ): Promise<boolean> {
    const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);

    const qb = this.requestRepo
      .createQueryBuilder('r')
      .where('r.pharmacy_id = :pharmacyId', { pharmacyId })
      .andWhere('r.source_type = :sourceType', { sourceType })
      .andWhere('r.purpose = :purpose', { purpose })
      .andWhere('r.requested_at > :cutoff', { cutoff });

    if (sourceId) {
      qb.andWhere('r.source_id = :sourceId', { sourceId });
    }

    const recentRequest = await qb.getOne();
    return !!recentRequest;
  }
}
