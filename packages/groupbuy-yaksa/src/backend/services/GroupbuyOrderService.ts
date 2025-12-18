/**
 * GroupbuyOrderService
 *
 * 공동구매 주문 관리 서비스
 * - 공동구매 상품 주문 기록 생성
 * - dropshipping 주문 ID 연결
 * - 주문 상태 변경 반영
 *
 * Phase 5.1: Operational Safety Patch
 * - Race Condition 방지 (SELECT FOR UPDATE)
 * - 조직 스코프 이중 검증
 * - 취소 후 상태 재계산 (Zombie Status 제거)
 * - 상태 불가 작업 차단
 */

import type { EntityManager, Repository } from 'typeorm';
import {
  GroupbuyOrder,
  type GroupbuyOrderStatus,
} from '../entities/GroupbuyOrder.js';
import { CampaignProduct } from '../entities/CampaignProduct.js';
import { GroupbuyCampaign } from '../entities/GroupbuyCampaign.js';

// =====================================================
// Error Codes (Phase 5.1)
// =====================================================

export const GroupbuyOrderError = {
  // 기존 에러 코드
  PRODUCT_NOT_FOUND: 'GB-E001',
  CAMPAIGN_NOT_FOUND: 'GB-E002',
  CAMPAIGN_NOT_ACTIVE: 'GB-E003',
  PRODUCT_CLOSED: 'GB-E004',
  ORDER_NOT_STARTED: 'GB-E005',
  ORDER_PERIOD_ENDED: 'GB-E006',
  MAX_QUANTITY_EXCEEDED: 'GB-E007',
  INVALID_QUANTITY: 'GB-E008',
  // Phase 5.1 추가
  ORDER_NOT_FOUND: 'GB-E009',
  INVALID_ORDER_STATUS: 'GB-E010',
  DUPLICATE_ORDER: 'GB-E011',
  CAMPAIGN_CLOSED: 'GB-E012',
  CAMPAIGN_COMPLETED: 'GB-E013',
  CAMPAIGN_CANCELLED: 'GB-E014',
  // 권한 관련
  ORG_ACCESS_DENIED: 'GB-AUTH-003',
  PHARMACY_MISMATCH: 'GB-AUTH-004',
} as const;

export interface CreateGroupbuyOrderDto {
  campaignId: string;
  campaignProductId: string;
  pharmacyId: string;
  quantity: number;
  orderedBy?: string;
  metadata?: Record<string, any>;
  // Phase 5.1: 조직 검증용
  userOrganizationId?: string;
}

export interface OrderQuantitySummary {
  totalQuantity: number;
  bySupplier: Array<{
    supplierId: string;
    quantity: number;
  }>;
  byProduct: Array<{
    productId: string;
    supplierId: string;
    quantity: number;
  }>;
}

export class GroupbuyOrderService {
  private orderRepository: Repository<GroupbuyOrder>;
  private productRepository: Repository<CampaignProduct>;
  private campaignRepository: Repository<GroupbuyCampaign>;
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
    this.orderRepository = entityManager.getRepository(GroupbuyOrder);
    this.productRepository = entityManager.getRepository(CampaignProduct);
    this.campaignRepository = entityManager.getRepository(GroupbuyCampaign);
  }

  /**
   * 공동구매 주문 생성
   *
   * Phase 5.1 Safety Patches:
   * - SELECT FOR UPDATE로 Race Condition 방지
   * - 조직 스코프 이중 검증
   * - 상태 기반 작업 차단
   * - 중복 주문 방지
   */
  async createOrder(dto: CreateGroupbuyOrderDto): Promise<GroupbuyOrder> {
    // 수량 검증 (최우선)
    if (!dto.quantity || dto.quantity < 1) {
      const error = new Error(`주문 수량은 1 이상이어야 합니다`);
      (error as any).code = GroupbuyOrderError.INVALID_QUANTITY;
      throw error;
    }

    // 트랜잭션으로 모든 검증과 생성을 원자적으로 처리
    return this.entityManager.transaction(async (txManager) => {
      const txOrderRepo = txManager.getRepository(GroupbuyOrder);
      const txProductRepo = txManager.getRepository(CampaignProduct);
      const txCampaignRepo = txManager.getRepository(GroupbuyCampaign);

      // Phase 5.1: SELECT FOR UPDATE로 상품 Row Lock 획득
      const product = await txProductRepo
        .createQueryBuilder('product')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('product.campaign', 'campaign')
        .where('product.id = :id', { id: dto.campaignProductId })
        .getOne();

      if (!product) {
        const error = new Error(`공동구매 상품을 찾을 수 없습니다 (productId: ${dto.campaignProductId})`);
        (error as any).code = GroupbuyOrderError.PRODUCT_NOT_FOUND;
        throw error;
      }

      // 캠페인 확인
      const campaign = product.campaign;
      if (!campaign) {
        const error = new Error(`캠페인 정보가 없습니다 (productId: ${dto.campaignProductId})`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_NOT_FOUND;
        throw error;
      }

      // Phase 5.1: 캠페인 상태 기반 작업 차단
      if (campaign.status === 'closed') {
        const error = new Error(`마감된 캠페인에는 주문할 수 없습니다`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_CLOSED;
        throw error;
      }
      if (campaign.status === 'completed') {
        const error = new Error(`완료된 캠페인에는 주문할 수 없습니다`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_COMPLETED;
        throw error;
      }
      if (campaign.status === 'cancelled') {
        const error = new Error(`취소된 캠페인에는 주문할 수 없습니다`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_CANCELLED;
        throw error;
      }
      if (campaign.status !== 'active') {
        const error = new Error(`진행 중인 캠페인만 주문 가능합니다 (현재 상태: ${campaign.status})`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_NOT_ACTIVE;
        throw error;
      }

      // Phase 5.1: 조직 스코프 이중 검증 (Service 레벨)
      // pharmacyId가 campaign.organizationId와 일치해야 함 (같은 조직 내 약국)
      // Note: 약사회 서비스에서 pharmacyId는 조직 ID와 같은 개념
      if (dto.userOrganizationId && dto.userOrganizationId !== campaign.organizationId) {
        const error = new Error(`타 조직의 캠페인에는 참여할 수 없습니다`);
        (error as any).code = GroupbuyOrderError.ORG_ACCESS_DENIED;
        throw error;
      }

      // 상품 상태 확인
      if (product.status === 'closed') {
        const error = new Error(`마감된 상품은 주문할 수 없습니다 (productId: ${dto.campaignProductId})`);
        (error as any).code = GroupbuyOrderError.PRODUCT_CLOSED;
        throw error;
      }

      // 기간 확인 (서버 시간 기준)
      const now = new Date();
      if (now < product.startDate) {
        const error = new Error(`주문 시작 전입니다 (시작일: ${product.startDate.toISOString()})`);
        (error as any).code = GroupbuyOrderError.ORDER_NOT_STARTED;
        throw error;
      }
      if (now > product.endDate) {
        const error = new Error(`주문 기간이 종료되었습니다 (종료일: ${product.endDate.toISOString()})`);
        (error as any).code = GroupbuyOrderError.ORDER_PERIOD_ENDED;
        throw error;
      }

      // Phase 5.1: 중복 주문 확인 (활성 주문만)
      const existingActiveOrder = await txOrderRepo.findOne({
        where: {
          campaignProductId: dto.campaignProductId,
          pharmacyId: dto.pharmacyId,
          orderStatus: 'pending',
        },
      });

      let order: GroupbuyOrder;
      let isNewParticipant = false;
      let quantityDelta = dto.quantity;

      if (existingActiveOrder) {
        // 기존 주문이 있으면 수량 업데이트
        const oldQuantity = existingActiveOrder.quantity;
        quantityDelta = dto.quantity - oldQuantity;

        // Phase 5.1: 최대 수량 체크 (Atomic)
        if (
          product.maxTotalQuantity &&
          product.orderedQuantity + quantityDelta > product.maxTotalQuantity
        ) {
          const remaining = product.maxTotalQuantity - product.orderedQuantity;
          const error = new Error(`최대 주문 수량 초과 (현재 추가 가능: ${remaining + oldQuantity}개, 요청: ${dto.quantity}개)`);
          (error as any).code = GroupbuyOrderError.MAX_QUANTITY_EXCEEDED;
          throw error;
        }

        existingActiveOrder.quantity = dto.quantity;
        order = await txOrderRepo.save(existingActiveOrder);
      } else {
        // Phase 5.1: 최대 수량 체크 (Atomic)
        if (
          product.maxTotalQuantity &&
          product.orderedQuantity + dto.quantity > product.maxTotalQuantity
        ) {
          const remaining = product.maxTotalQuantity - product.orderedQuantity;
          const error = new Error(`최대 주문 수량 초과 (현재 가능: ${remaining}개, 요청: ${dto.quantity}개)`);
          (error as any).code = GroupbuyOrderError.MAX_QUANTITY_EXCEEDED;
          throw error;
        }

        // 신규 주문 생성
        order = txOrderRepo.create({
          campaignId: dto.campaignId,
          campaignProductId: dto.campaignProductId,
          pharmacyId: dto.pharmacyId,
          supplierId: product.supplierId,
          quantity: dto.quantity,
          orderStatus: 'pending',
          orderedBy: dto.orderedBy,
          metadata: dto.metadata,
        });
        order = await txOrderRepo.save(order);

        // 새로운 참여자인지 확인
        const existingParticipation = await txOrderRepo.findOne({
          where: {
            campaignId: dto.campaignId,
            pharmacyId: dto.pharmacyId,
          },
        });
        isNewParticipant = !existingParticipation || existingParticipation.id === order.id;
      }

      // Phase 5.1: Atomic Update로 수량 업데이트 (조건부)
      // 상품 수량 업데이트
      const productUpdateResult = await txProductRepo
        .createQueryBuilder()
        .update()
        .set({
          orderedQuantity: () => `"orderedQuantity" + ${quantityDelta}`,
        })
        .where('id = :id', { id: dto.campaignProductId })
        // maxTotalQuantity 제약 조건 재확인 (동시성 보호)
        .andWhere(
          product.maxTotalQuantity
            ? `"orderedQuantity" + ${quantityDelta} <= ${product.maxTotalQuantity}`
            : '1=1'
        )
        .execute();

      // Phase 5.1: 업데이트 실패 시 롤백 (Race Condition 감지)
      if (productUpdateResult.affected === 0 && product.maxTotalQuantity) {
        const error = new Error(`동시 주문으로 인해 최대 수량을 초과했습니다. 다시 시도해주세요.`);
        (error as any).code = GroupbuyOrderError.MAX_QUANTITY_EXCEEDED;
        throw error;
      }

      // 캠페인 수량 업데이트
      await txCampaignRepo
        .createQueryBuilder()
        .update()
        .set({
          totalOrderedQuantity: () => `"totalOrderedQuantity" + ${quantityDelta}`,
          ...(isNewParticipant && {
            participantCount: () => `"participantCount" + 1`,
          }),
        })
        .where('id = :id', { id: dto.campaignId })
        .execute();

      return order;
    });
  }

  /**
   * 주문 조회
   */
  async getOrderById(id: string): Promise<GroupbuyOrder | null> {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['campaign', 'campaignProduct'],
    });
  }

  /**
   * 약국별 주문 목록 조회
   */
  async getOrdersByPharmacy(
    pharmacyId: string,
    options?: {
      campaignId?: string;
      status?: GroupbuyOrderStatus;
    }
  ): Promise<GroupbuyOrder[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.campaign', 'campaign')
      .leftJoinAndSelect('order.campaignProduct', 'product')
      .where('order.pharmacyId = :pharmacyId', { pharmacyId });

    if (options?.campaignId) {
      query.andWhere('order.campaignId = :campaignId', {
        campaignId: options.campaignId,
      });
    }

    if (options?.status) {
      query.andWhere('order.orderStatus = :status', { status: options.status });
    }

    return query.orderBy('order.createdAt', 'DESC').getMany();
  }

  /**
   * 캠페인별 주문 목록 조회
   */
  async getOrdersByCampaign(
    campaignId: string,
    options?: {
      status?: GroupbuyOrderStatus;
      supplierId?: string;
    }
  ): Promise<GroupbuyOrder[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.campaignProduct', 'product')
      .where('order.campaignId = :campaignId', { campaignId });

    if (options?.status) {
      query.andWhere('order.orderStatus = :status', { status: options.status });
    }

    if (options?.supplierId) {
      query.andWhere('order.supplierId = :supplierId', {
        supplierId: options.supplierId,
      });
    }

    return query.getMany();
  }

  /**
   * 주문 취소 (pending 상태)
   *
   * Phase 5.1 Safety Patches:
   * - 상태 불가 작업 차단
   * - Row Lock으로 동시성 보호
   * - 조직 검증
   */
  async cancelOrder(id: string, userOrganizationId?: string): Promise<GroupbuyOrder> {
    return this.entityManager.transaction(async (txManager) => {
      const txOrderRepo = txManager.getRepository(GroupbuyOrder);
      const txProductRepo = txManager.getRepository(CampaignProduct);
      const txCampaignRepo = txManager.getRepository(GroupbuyCampaign);

      // Phase 5.1: SELECT FOR UPDATE로 주문 Row Lock
      const order = await txOrderRepo
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('order.campaign', 'campaign')
        .leftJoinAndSelect('order.campaignProduct', 'product')
        .where('order.id = :id', { id })
        .getOne();

      if (!order) {
        const error = new Error(`주문을 찾을 수 없습니다`);
        (error as any).code = GroupbuyOrderError.ORDER_NOT_FOUND;
        throw error;
      }

      // Phase 5.1: 조직 스코프 이중 검증
      if (userOrganizationId && order.campaign) {
        if (userOrganizationId !== order.campaign.organizationId) {
          const error = new Error(`타 조직의 주문을 취소할 수 없습니다`);
          (error as any).code = GroupbuyOrderError.ORG_ACCESS_DENIED;
          throw error;
        }
      }

      // Phase 5.1: 상태 기반 작업 차단
      if (order.orderStatus === 'cancelled') {
        const error = new Error(`이미 취소된 주문입니다`);
        (error as any).code = GroupbuyOrderError.INVALID_ORDER_STATUS;
        throw error;
      }
      if (order.orderStatus === 'confirmed') {
        const error = new Error(`확정된 주문은 cancelOrder로 취소할 수 없습니다. cancelConfirmedOrder를 사용하세요.`);
        (error as any).code = GroupbuyOrderError.INVALID_ORDER_STATUS;
        throw error;
      }
      if (order.orderStatus !== 'pending') {
        const error = new Error(`대기 중인 주문만 취소할 수 있습니다 (현재 상태: ${order.orderStatus})`);
        (error as any).code = GroupbuyOrderError.INVALID_ORDER_STATUS;
        throw error;
      }

      // Phase 5.1: 캠페인 상태 확인 (closed/completed에서 취소 불가)
      if (order.campaign?.status === 'closed') {
        const error = new Error(`마감된 캠페인의 주문은 취소할 수 없습니다`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_CLOSED;
        throw error;
      }
      if (order.campaign?.status === 'completed') {
        const error = new Error(`완료된 캠페인의 주문은 취소할 수 없습니다`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_COMPLETED;
        throw error;
      }

      // 주문 상태 변경
      order.orderStatus = 'cancelled';
      await txOrderRepo.save(order);

      // 상품 수량 감소 (음수 방지)
      await txProductRepo
        .createQueryBuilder()
        .update()
        .set({
          orderedQuantity: () => `GREATEST(0, "orderedQuantity" - ${order.quantity})`,
        })
        .where('id = :id', { id: order.campaignProductId })
        .execute();

      // 캠페인 수량 감소 (음수 방지)
      await txCampaignRepo
        .createQueryBuilder()
        .update()
        .set({
          totalOrderedQuantity: () => `GREATEST(0, "totalOrderedQuantity" - ${order.quantity})`,
        })
        .where('id = :id', { id: order.campaignId })
        .execute();

      return order;
    });
  }

  /**
   * 주문 확정
   * - dropshipping 주문 생성 후 호출
   * - Phase 2: confirmedQuantity 기준 threshold_met 상태 업데이트
   *
   * Phase 5.1 Safety Patches:
   * - Row Lock으로 동시성 보호
   * - 조직 검증
   */
  async confirmOrder(
    id: string,
    dropshippingOrderId: string,
    userOrganizationId?: string
  ): Promise<GroupbuyOrder> {
    return this.entityManager.transaction(async (txManager) => {
      const txOrderRepo = txManager.getRepository(GroupbuyOrder);
      const txProductRepo = txManager.getRepository(CampaignProduct);
      const txCampaignRepo = txManager.getRepository(GroupbuyCampaign);

      // Phase 5.1: SELECT FOR UPDATE로 주문 Row Lock
      const order = await txOrderRepo
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('order.campaign', 'campaign')
        .leftJoinAndSelect('order.campaignProduct', 'product')
        .where('order.id = :id', { id })
        .getOne();

      if (!order) {
        const error = new Error(`주문을 찾을 수 없습니다`);
        (error as any).code = GroupbuyOrderError.ORDER_NOT_FOUND;
        throw error;
      }

      // Phase 5.1: 조직 스코프 이중 검증
      if (userOrganizationId && order.campaign) {
        if (userOrganizationId !== order.campaign.organizationId) {
          const error = new Error(`타 조직의 주문을 확정할 수 없습니다`);
          (error as any).code = GroupbuyOrderError.ORG_ACCESS_DENIED;
          throw error;
        }
      }

      if (order.orderStatus !== 'pending') {
        const error = new Error(`대기 중인 주문만 확정할 수 있습니다 (현재 상태: ${order.orderStatus})`);
        (error as any).code = GroupbuyOrderError.INVALID_ORDER_STATUS;
        throw error;
      }

      // 주문 확정
      order.orderStatus = 'confirmed';
      order.dropshippingOrderId = dropshippingOrderId;
      await txOrderRepo.save(order);

      // Phase 5.1: SELECT FOR UPDATE로 상품 Row Lock
      const product = await txProductRepo
        .createQueryBuilder('product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: order.campaignProductId })
        .getOne();

      if (!product) {
        const error = new Error(`상품을 찾을 수 없습니다`);
        (error as any).code = GroupbuyOrderError.PRODUCT_NOT_FOUND;
        throw error;
      }

      // 상품 확정 수량 업데이트
      await txProductRepo
        .createQueryBuilder()
        .update()
        .set({
          confirmedQuantity: () => `"confirmedQuantity" + ${order.quantity}`,
        })
        .where('id = :id', { id: order.campaignProductId })
        .execute();

      // 캠페인 확정 수량 업데이트
      await txCampaignRepo
        .createQueryBuilder()
        .update()
        .set({
          totalConfirmedQuantity: () =>
            `"totalConfirmedQuantity" + ${order.quantity}`,
        })
        .where('id = :id', { id: order.campaignId })
        .execute();

      // Phase 5.1: threshold_met 상태 체크 (Row Lock 상태에서 계산)
      const newConfirmedQuantity = product.confirmedQuantity + order.quantity;
      if (
        product.status === 'active' &&
        newConfirmedQuantity >= product.minTotalQuantity
      ) {
        await txProductRepo.update(order.campaignProductId, {
          status: 'threshold_met',
        });
      }

      return order;
    });
  }

  /**
   * Phase 2: 확정된 주문 취소
   * - dropshipping 주문 취소 시 호출
   * - confirmedQuantity 롤백
   * - threshold 상태 재계산
   *
   * Phase 5.1 Safety Patches:
   * - Row Lock으로 동시성 보호
   * - Zombie Status 제거 (완전한 상태 재계산)
   */
  async cancelConfirmedOrder(id: string): Promise<GroupbuyOrder> {
    return this.entityManager.transaction(async (txManager) => {
      const txOrderRepo = txManager.getRepository(GroupbuyOrder);
      const txProductRepo = txManager.getRepository(CampaignProduct);
      const txCampaignRepo = txManager.getRepository(GroupbuyCampaign);

      // Phase 5.1: SELECT FOR UPDATE로 주문 Row Lock
      const order = await txOrderRepo
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('order.campaign', 'campaign')
        .leftJoinAndSelect('order.campaignProduct', 'product')
        .where('order.id = :id', { id })
        .getOne();

      if (!order) {
        const error = new Error(`주문을 찾을 수 없습니다`);
        (error as any).code = GroupbuyOrderError.ORDER_NOT_FOUND;
        throw error;
      }

      if (order.orderStatus !== 'confirmed') {
        const error = new Error(`확정된 주문만 취소할 수 있습니다 (현재 상태: ${order.orderStatus})`);
        (error as any).code = GroupbuyOrderError.INVALID_ORDER_STATUS;
        throw error;
      }

      // Phase 5.1: completed 상태에서 취소 차단
      if (order.campaign?.status === 'completed') {
        const error = new Error(`완료된 캠페인의 확정 주문은 취소할 수 없습니다`);
        (error as any).code = GroupbuyOrderError.CAMPAIGN_COMPLETED;
        throw error;
      }

      // 주문 상태 변경
      order.orderStatus = 'cancelled';
      await txOrderRepo.save(order);

      // Phase 5.1: SELECT FOR UPDATE로 상품 Row Lock
      const product = await txProductRepo
        .createQueryBuilder('product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: order.campaignProductId })
        .getOne();

      if (!product) {
        const error = new Error(`상품을 찾을 수 없습니다`);
        (error as any).code = GroupbuyOrderError.PRODUCT_NOT_FOUND;
        throw error;
      }

      // 상품 확정 수량 감소 (음수 방지)
      const newConfirmedQuantity = Math.max(0, product.confirmedQuantity - order.quantity);
      await txProductRepo
        .createQueryBuilder()
        .update()
        .set({
          confirmedQuantity: () => `GREATEST(0, "confirmedQuantity" - ${order.quantity})`,
        })
        .where('id = :id', { id: order.campaignProductId })
        .execute();

      // 캠페인 확정 수량 감소 (음수 방지)
      await txCampaignRepo
        .createQueryBuilder()
        .update()
        .set({
          totalConfirmedQuantity: () =>
            `GREATEST(0, "totalConfirmedQuantity" - ${order.quantity})`,
        })
        .where('id = :id', { id: order.campaignId })
        .execute();

      // Phase 5.1: Zombie Status 제거 - 완전한 상태 재계산
      // threshold_met에서 취소로 인해 미달이 된 경우
      if (
        product.status === 'threshold_met' &&
        newConfirmedQuantity < product.minTotalQuantity
      ) {
        // closed가 아니면 active로 복귀
        if (order.campaign?.status !== 'closed') {
          await txProductRepo.update(order.campaignProductId, {
            status: 'active',
          });
        }
      }

      // Phase 5.1: 캠페인 상태도 재계산 필요 여부 체크
      // (모든 상품이 threshold 미달이 되면 캠페인 상태도 조정 가능)
      // Note: 현재는 상품 레벨만 재계산, 캠페인 레벨은 closeCampaign에서 처리

      return order;
    });
  }

  /**
   * 캠페인별 수량 집계 조회
   */
  async getQuantitySummary(campaignId: string): Promise<OrderQuantitySummary> {
    // 전체 수량
    const totalResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.quantity)', 'total')
      .where('order.campaignId = :campaignId', { campaignId })
      .andWhere('order.orderStatus != :cancelled', { cancelled: 'cancelled' })
      .getRawOne();

    // 공급자별 수량
    const bySupplierResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.supplierId', 'supplierId')
      .addSelect('SUM(order.quantity)', 'quantity')
      .where('order.campaignId = :campaignId', { campaignId })
      .andWhere('order.orderStatus != :cancelled', { cancelled: 'cancelled' })
      .groupBy('order.supplierId')
      .getRawMany();

    // 상품별 수량
    const byProductResult = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.campaignProduct', 'product')
      .select('product.productId', 'productId')
      .addSelect('order.supplierId', 'supplierId')
      .addSelect('SUM(order.quantity)', 'quantity')
      .where('order.campaignId = :campaignId', { campaignId })
      .andWhere('order.orderStatus != :cancelled', { cancelled: 'cancelled' })
      .groupBy('product.productId')
      .addGroupBy('order.supplierId')
      .getRawMany();

    return {
      totalQuantity: parseInt(totalResult?.total || '0', 10),
      bySupplier: bySupplierResult.map((r) => ({
        supplierId: r.supplierId,
        quantity: parseInt(r.quantity, 10),
      })),
      byProduct: byProductResult.map((r) => ({
        productId: r.productId,
        supplierId: r.supplierId,
        quantity: parseInt(r.quantity, 10),
      })),
    };
  }

  /**
   * 약국별 수량 집계 조회
   */
  async getQuantityByPharmacy(
    campaignId: string
  ): Promise<Array<{ pharmacyId: string; quantity: number }>> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.pharmacyId', 'pharmacyId')
      .addSelect('SUM(order.quantity)', 'quantity')
      .where('order.campaignId = :campaignId', { campaignId })
      .andWhere('order.orderStatus != :cancelled', { cancelled: 'cancelled' })
      .groupBy('order.pharmacyId')
      .getRawMany();

    return result.map((r) => ({
      pharmacyId: r.pharmacyId,
      quantity: parseInt(r.quantity, 10),
    }));
  }
}
