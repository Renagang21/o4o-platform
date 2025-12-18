/**
 * GroupbuyOrderService
 *
 * 공동구매 주문 관리 서비스
 * - 공동구매 상품 주문 기록 생성
 * - dropshipping 주문 ID 연결
 * - 주문 상태 변경 반영
 */

import type { EntityManager, Repository } from 'typeorm';
import {
  GroupbuyOrder,
  type GroupbuyOrderStatus,
} from '../entities/GroupbuyOrder.js';
import { CampaignProduct } from '../entities/CampaignProduct.js';
import { GroupbuyCampaign } from '../entities/GroupbuyCampaign.js';

export interface CreateGroupbuyOrderDto {
  campaignId: string;
  campaignProductId: string;
  pharmacyId: string;
  quantity: number;
  orderedBy?: string;
  metadata?: Record<string, any>;
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
   */
  async createOrder(dto: CreateGroupbuyOrderDto): Promise<GroupbuyOrder> {
    // 상품 확인
    const product = await this.productRepository.findOne({
      where: { id: dto.campaignProductId },
      relations: ['campaign'],
    });
    if (!product) {
      throw new Error(`[GB-E001] 공동구매 상품을 찾을 수 없습니다 (productId: ${dto.campaignProductId})`);
    }

    // 캠페인 확인
    if (!product.campaign) {
      throw new Error(`[GB-E002] 캠페인 정보가 없습니다 (productId: ${dto.campaignProductId})`);
    }
    if (product.campaign.status !== 'active') {
      throw new Error(`[GB-E003] 진행 중인 캠페인만 주문 가능합니다 (현재 상태: ${product.campaign.status})`);
    }

    // 상품 상태 확인
    if (product.status === 'closed') {
      throw new Error(`[GB-E004] 마감된 상품은 주문할 수 없습니다 (productId: ${dto.campaignProductId})`);
    }

    // 기간 확인
    const now = new Date();
    if (now < product.startDate) {
      throw new Error(`[GB-E005] 주문 시작 전입니다 (시작일: ${product.startDate.toISOString()})`);
    }
    if (now > product.endDate) {
      throw new Error(`[GB-E006] 주문 기간이 종료되었습니다 (종료일: ${product.endDate.toISOString()})`);
    }

    // 최대 수량 확인
    if (
      product.maxTotalQuantity &&
      product.orderedQuantity + dto.quantity > product.maxTotalQuantity
    ) {
      const remaining = product.maxTotalQuantity - product.orderedQuantity;
      throw new Error(`[GB-E007] 최대 주문 수량 초과 (잔여 가능: ${remaining}개, 요청: ${dto.quantity}개)`);
    }

    // 수량 검증
    if (dto.quantity < 1) {
      throw new Error('[GB-E008] 주문 수량은 1 이상이어야 합니다');
    }

    // 트랜잭션으로 주문 생성 및 수량 업데이트
    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const txOrderRepo = transactionalEntityManager.getRepository(GroupbuyOrder);
      const txProductRepo = transactionalEntityManager.getRepository(CampaignProduct);
      const txCampaignRepo = transactionalEntityManager.getRepository(GroupbuyCampaign);

      // 기존 주문 확인 (동일 약국의 중복 주문 방지)
      const existingOrder = await txOrderRepo.findOne({
        where: {
          campaignProductId: dto.campaignProductId,
          pharmacyId: dto.pharmacyId,
          orderStatus: 'pending',
        },
      });

      let order: GroupbuyOrder;
      let isNewParticipant = false;

      if (existingOrder) {
        // 기존 주문 수량 업데이트
        const oldQuantity = existingOrder.quantity;
        existingOrder.quantity = dto.quantity;
        order = await txOrderRepo.save(existingOrder);

        // 상품 수량 업데이트 (차이만큼)
        await txProductRepo
          .createQueryBuilder()
          .update()
          .set({
            orderedQuantity: () =>
              `"orderedQuantity" + ${dto.quantity - oldQuantity}`,
          })
          .where('id = :id', { id: dto.campaignProductId })
          .execute();

        // 캠페인 수량 업데이트
        await txCampaignRepo
          .createQueryBuilder()
          .update()
          .set({
            totalOrderedQuantity: () =>
              `"totalOrderedQuantity" + ${dto.quantity - oldQuantity}`,
          })
          .where('id = :id', { id: dto.campaignId })
          .execute();
      } else {
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

        // 상품 수량 업데이트
        await txProductRepo
          .createQueryBuilder()
          .update()
          .set({
            orderedQuantity: () => `"orderedQuantity" + ${dto.quantity}`,
          })
          .where('id = :id', { id: dto.campaignProductId })
          .execute();

        // 캠페인 수량 업데이트
        // 새로운 참여자인지 확인
        const existingParticipation = await txOrderRepo.findOne({
          where: {
            campaignId: dto.campaignId,
            pharmacyId: dto.pharmacyId,
          },
        });
        isNewParticipant = !existingParticipation || existingParticipation.id === order.id;

        await txCampaignRepo
          .createQueryBuilder()
          .update()
          .set({
            totalOrderedQuantity: () => `"totalOrderedQuantity" + ${dto.quantity}`,
            ...(isNewParticipant && {
              participantCount: () => `"participantCount" + 1`,
            }),
          })
          .where('id = :id', { id: dto.campaignId })
          .execute();
      }

      // Phase 2: threshold_met 상태는 confirmOrder에서 confirmedQuantity 기준으로 판단
      // createOrder에서는 orderedQuantity만 업데이트 (threshold 상태 변경 안함)

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
   * 주문 취소
   */
  async cancelOrder(id: string): Promise<GroupbuyOrder> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다');
    }

    if (order.orderStatus !== 'pending') {
      throw new Error('대기 중인 주문만 취소할 수 있습니다');
    }

    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const txOrderRepo = transactionalEntityManager.getRepository(GroupbuyOrder);
      const txProductRepo = transactionalEntityManager.getRepository(CampaignProduct);
      const txCampaignRepo = transactionalEntityManager.getRepository(GroupbuyCampaign);

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
   */
  async confirmOrder(
    id: string,
    dropshippingOrderId: string
  ): Promise<GroupbuyOrder> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다');
    }

    if (order.orderStatus !== 'pending') {
      throw new Error('대기 중인 주문만 확정할 수 있습니다');
    }

    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const txOrderRepo = transactionalEntityManager.getRepository(GroupbuyOrder);
      const txProductRepo = transactionalEntityManager.getRepository(CampaignProduct);
      const txCampaignRepo = transactionalEntityManager.getRepository(GroupbuyCampaign);

      // 주문 확정
      order.orderStatus = 'confirmed';
      order.dropshippingOrderId = dropshippingOrderId;
      await txOrderRepo.save(order);

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

      // Phase 2: threshold_met 상태 체크 (confirmedQuantity 기준)
      const updatedProduct = await txProductRepo.findOne({
        where: { id: order.campaignProductId },
      });
      if (
        updatedProduct &&
        updatedProduct.status === 'active' &&
        updatedProduct.confirmedQuantity >= updatedProduct.minTotalQuantity
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
   */
  async cancelConfirmedOrder(id: string): Promise<GroupbuyOrder> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('주문을 찾을 수 없습니다');
    }

    if (order.orderStatus !== 'confirmed') {
      throw new Error('확정된 주문만 취소할 수 있습니다');
    }

    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const txOrderRepo = transactionalEntityManager.getRepository(GroupbuyOrder);
      const txProductRepo = transactionalEntityManager.getRepository(CampaignProduct);
      const txCampaignRepo = transactionalEntityManager.getRepository(GroupbuyCampaign);

      // 주문 상태 변경
      order.orderStatus = 'cancelled';
      await txOrderRepo.save(order);

      // 상품 확정 수량 감소 (음수 방지)
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

      // threshold 상태 재계산 (confirmedQuantity 감소로 인해 미달이 될 수 있음)
      const updatedProduct = await txProductRepo.findOne({
        where: { id: order.campaignProductId },
      });
      if (
        updatedProduct &&
        updatedProduct.status === 'threshold_met' &&
        updatedProduct.confirmedQuantity < updatedProduct.minTotalQuantity
      ) {
        // threshold 미달로 다시 active 상태로 변경
        await txProductRepo.update(order.campaignProductId, {
          status: 'active',
        });
      }

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
