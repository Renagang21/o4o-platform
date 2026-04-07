/**
 * GroupbuyCampaignService
 *
 * 캠페인 관리 서비스
 * - 캠페인 생성 (지부/분회만 허용)
 * - 상태 전이 (draft → active → closed)
 * - 캠페인 종료 처리
 */

import type { EntityManager, Repository } from 'typeorm';
import {
  GroupbuyCampaign,
  normalizeApprovalState,
  type CampaignStatus,
} from '../entities/GroupbuyCampaign.js';
import { CampaignProduct } from '../entities/CampaignProduct.js';
import { GroupbuyOrder } from '../entities/GroupbuyOrder.js';

export interface CreateCampaignDto {
  organizationId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface UpdateCampaignDto {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export interface CampaignCloseResult {
  campaign: GroupbuyCampaign;
  thresholdMetProducts: string[];
  failedProducts: string[];
  cancelledOrderCount: number;
}

export class GroupbuyCampaignService {
  private campaignRepository: Repository<GroupbuyCampaign>;
  private productRepository: Repository<CampaignProduct>;
  private orderRepository: Repository<GroupbuyOrder>;
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
    this.campaignRepository = entityManager.getRepository(GroupbuyCampaign);
    this.productRepository = entityManager.getRepository(CampaignProduct);
    this.orderRepository = entityManager.getRepository(GroupbuyOrder);
  }

  /**
   * 캠페인 생성
   * - 지부/분회 조직에서만 생성 가능
   */
  async createCampaign(dto: CreateCampaignDto): Promise<GroupbuyCampaign> {
    // 날짜 유효성 검증
    if (dto.startDate >= dto.endDate) {
      throw new Error('종료일은 시작일보다 이후여야 합니다');
    }

    const campaign = this.campaignRepository.create({
      ...dto,
      status: 'draft',
      totalOrderedQuantity: 0,
      totalConfirmedQuantity: 0,
      participantCount: 0,
    });

    return this.campaignRepository.save(campaign);
  }

  /**
   * 캠페인 조회
   */
  async getCampaignById(id: string): Promise<GroupbuyCampaign | null> {
    return this.campaignRepository.findOne({
      where: { id },
      relations: ['products'],
    });
  }

  /**
   * 조직별 캠페인 목록 조회
   */
  async getCampaignsByOrganization(
    organizationId: string,
    options?: {
      status?: CampaignStatus;
      includeProducts?: boolean;
    }
  ): Promise<GroupbuyCampaign[]> {
    const query = this.campaignRepository
      .createQueryBuilder('campaign')
      .where('campaign.organizationId = :organizationId', { organizationId });

    if (options?.status) {
      query.andWhere('campaign.status = :status', { status: options.status });
    }

    if (options?.includeProducts) {
      query.leftJoinAndSelect('campaign.products', 'products');
    }

    query.orderBy('campaign.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * 캠페인(이벤트) 정보 수정
   * - draft 상태에서만 수정 가능
   * - 승인 후 불변 (event_offer 정책)
   */
  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto
  ): Promise<GroupbuyCampaign> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다');
    }

    if (normalizeApprovalState(campaign.status) !== 'draft') {
      throw new Error('승인 절차에 들어간 이벤트는 수정할 수 없습니다 (event_offer 불변 정책)');
    }

    if (dto.startDate && dto.endDate && dto.startDate >= dto.endDate) {
      throw new Error('종료일은 시작일보다 이후여야 합니다');
    }

    Object.assign(campaign, dto);
    return this.campaignRepository.save(campaign);
  }

  /**
   * [event_offer] 이벤트 제출
   * - draft → submitted
   * - 운영자 승인 대기 상태로 전환
   * - 최소 1개 이상의 상품이 등록되어야 함
   */
  async submitCampaign(id: string): Promise<GroupbuyCampaign> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다');
    }

    if (normalizeApprovalState(campaign.status) !== 'draft') {
      throw new Error('초안 상태의 이벤트만 제출할 수 있습니다');
    }

    if (!campaign.products || campaign.products.length === 0) {
      throw new Error('최소 1개 이상의 상품을 등록해야 제출할 수 있습니다');
    }

    campaign.status = 'submitted';
    return this.campaignRepository.save(campaign);
  }

  /**
   * [event_offer] 이벤트 승인
   * - submitted → approved
   * - 승인 후 본체/상품/가격/기간 모두 변경 불가
   * - 시간 기반 운영(upcoming/active/ended)이 자동 적용됨
   */
  async approveCampaign(id: string): Promise<GroupbuyCampaign> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다');
    }

    if (normalizeApprovalState(campaign.status) !== 'submitted') {
      throw new Error('제출된 이벤트만 승인할 수 있습니다');
    }

    campaign.status = 'approved';
    return this.campaignRepository.save(campaign);
  }

  /**
   * [event_offer] 이벤트 반려
   * - submitted → rejected
   * - 반려된 이벤트는 외부 노출되지 않음
   */
  async rejectCampaign(id: string, _reason?: string): Promise<GroupbuyCampaign> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다');
    }

    if (normalizeApprovalState(campaign.status) !== 'submitted') {
      throw new Error('제출된 이벤트만 반려할 수 있습니다');
    }

    campaign.status = 'rejected';
    return this.campaignRepository.save(campaign);
  }

  /**
   * @deprecated event_offer 정책에서 수동 활성화 개념 제거.
   * 호환을 위해 submit + approve를 한 번에 수행.
   */
  async activateCampaign(id: string): Promise<GroupbuyCampaign> {
    await this.submitCampaign(id);
    return this.approveCampaign(id);
  }

  /**
   * 캠페인 마감
   * - active → closed
   * - 각 상품별 threshold 달성 여부 확인
   * - 미달성 상품의 주문은 취소 처리
   */
  async closeCampaign(id: string): Promise<CampaignCloseResult> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다');
    }

    if (normalizeApprovalState(campaign.status) !== 'approved') {
      throw new Error('승인된 이벤트만 마감할 수 있습니다');
    }

    return this.entityManager.transaction(async (txManager) => {
      const txCampaignRepo = txManager.getRepository(GroupbuyCampaign);
      const txProductRepo = txManager.getRepository(CampaignProduct);
      const txOrderRepo = txManager.getRepository(GroupbuyOrder);

      // 캠페인의 모든 상품 조회
      const products = await txProductRepo.find({
        where: { campaignId: id },
      });

      const thresholdMetProducts: string[] = [];
      const failedProducts: string[] = [];
      let cancelledOrderCount = 0;

      for (const product of products) {
        // threshold 달성 여부 판단: confirmedQuantity 기준
        const isThresholdMet = product.confirmedQuantity >= product.minTotalQuantity;

        if (isThresholdMet) {
          // 달성 상품: closed로 변경 (성공적 마감)
          product.status = 'closed';
          thresholdMetProducts.push(product.id);
        } else {
          // 미달성 상품: closed로 변경 + 관련 주문 취소
          product.status = 'closed';
          failedProducts.push(product.id);

          // 해당 상품의 pending 주문 모두 취소
          const pendingOrders = await txOrderRepo.find({
            where: {
              campaignProductId: product.id,
              orderStatus: 'pending',
            },
          });

          for (const order of pendingOrders) {
            order.orderStatus = 'cancelled';
            await txOrderRepo.save(order);
            cancelledOrderCount++;
          }
        }

        await txProductRepo.save(product);
      }

      // 캠페인 상태 변경 (event_offer: ended)
      campaign.status = 'ended';
      await txCampaignRepo.save(campaign);

      return {
        campaign,
        thresholdMetProducts,
        failedProducts,
        cancelledOrderCount,
      };
    });
  }

  /**
   * @deprecated event_offer 정책에서는 closeCampaign이 곧 종료(ended).
   * 호환을 위해 no-op 반환.
   */
  async completeCampaign(id: string): Promise<GroupbuyCampaign> {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다');
    }
    return campaign;
  }

  // ============================================
  // [REMOVED] cancelCampaign
  //
  // event_offer 정책: 승인 후 중단 불가.
  // 사람이 이벤트를 멈추는 개념을 코어에서 제거했다.
  // 호출 측은 closeCampaign(시간 마감) 또는 rejectCampaign(미승인 반려)을 사용해야 한다.
  // ============================================

  /**
   * 캠페인 수량 집계 업데이트
   * - 내부 사용: 주문 생성/취소 시 호출
   */
  async updateQuantityStats(
    id: string,
    delta: {
      orderedQuantity?: number;
      confirmedQuantity?: number;
      participantDelta?: number;
    }
  ): Promise<void> {
    // Phase 4: 음수 방지 guardrail 추가
    if (delta.orderedQuantity) {
      const expr = delta.orderedQuantity >= 0
        ? `"totalOrderedQuantity" + ${delta.orderedQuantity}`
        : `GREATEST(0, "totalOrderedQuantity" + ${delta.orderedQuantity})`;

      await this.campaignRepository
        .createQueryBuilder()
        .update()
        .set({
          totalOrderedQuantity: () => expr,
        })
        .where('id = :id', { id })
        .execute();
    }

    if (delta.confirmedQuantity) {
      const expr = delta.confirmedQuantity >= 0
        ? `"totalConfirmedQuantity" + ${delta.confirmedQuantity}`
        : `GREATEST(0, "totalConfirmedQuantity" + ${delta.confirmedQuantity})`;

      await this.campaignRepository
        .createQueryBuilder()
        .update()
        .set({
          totalConfirmedQuantity: () => expr,
        })
        .where('id = :id', { id })
        .execute();
    }

    if (delta.participantDelta) {
      const expr = delta.participantDelta >= 0
        ? `"participantCount" + ${delta.participantDelta}`
        : `GREATEST(0, "participantCount" + ${delta.participantDelta})`;

      await this.campaignRepository
        .createQueryBuilder()
        .update()
        .set({
          participantCount: () => expr,
        })
        .where('id = :id', { id })
        .execute();
    }
  }
}
