/**
 * CampaignProductService
 *
 * 공동구매 상품 관리 서비스
 * - 공동구매 상품 등록
 * - 기간/최소수량 유효성 검증
 * - 수량 집계 업데이트
 */

import type { EntityManager, Repository } from 'typeorm';
import {
  CampaignProduct,
  type CampaignProductStatus,
} from '../entities/CampaignProduct.js';
import { GroupbuyCampaign } from '../entities/GroupbuyCampaign.js';

export interface CreateCampaignProductDto {
  campaignId: string;
  productId: string;
  supplierId: string;
  groupPrice: number;
  minTotalQuantity: number;
  maxTotalQuantity?: number;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
}

export interface UpdateCampaignProductDto {
  groupPrice?: number;
  minTotalQuantity?: number;
  maxTotalQuantity?: number;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export class CampaignProductService {
  private productRepository: Repository<CampaignProduct>;
  private campaignRepository: Repository<GroupbuyCampaign>;

  constructor(entityManager: EntityManager) {
    this.productRepository = entityManager.getRepository(CampaignProduct);
    this.campaignRepository = entityManager.getRepository(GroupbuyCampaign);
  }

  /**
   * 공동구매 상품 등록
   */
  async createProduct(dto: CreateCampaignProductDto): Promise<CampaignProduct> {
    // 캠페인 확인
    const campaign = await this.campaignRepository.findOne({
      where: { id: dto.campaignId },
    });
    if (!campaign) {
      throw new Error('캠페인을 찾을 수 없습니다');
    }

    // draft 상태에서만 상품 추가 가능
    if (campaign.status !== 'draft') {
      throw new Error('진행 중인 캠페인에는 상품을 추가할 수 없습니다');
    }

    // 기간 유효성 검증
    if (dto.startDate >= dto.endDate) {
      throw new Error('종료일은 시작일보다 이후여야 합니다');
    }

    // 캠페인 기간 내에 있는지 검증
    if (dto.startDate < campaign.startDate || dto.endDate > campaign.endDate) {
      throw new Error('상품 기간은 캠페인 기간 내에 있어야 합니다');
    }

    // 최소 수량 검증
    if (dto.minTotalQuantity < 1) {
      throw new Error('최소 수량은 1 이상이어야 합니다');
    }

    // 최대 수량 검증 (설정된 경우)
    if (dto.maxTotalQuantity && dto.maxTotalQuantity < dto.minTotalQuantity) {
      throw new Error('최대 수량은 최소 수량보다 커야 합니다');
    }

    // 동일 상품 중복 등록 확인
    const existingProduct = await this.productRepository.findOne({
      where: {
        campaignId: dto.campaignId,
        productId: dto.productId,
        supplierId: dto.supplierId,
      },
    });
    if (existingProduct) {
      throw new Error('이미 등록된 상품입니다');
    }

    const product = this.productRepository.create({
      ...dto,
      status: 'active',
      orderedQuantity: 0,
      confirmedQuantity: 0,
    });

    return this.productRepository.save(product);
  }

  /**
   * 상품 조회
   */
  async getProductById(id: string): Promise<CampaignProduct | null> {
    return this.productRepository.findOne({
      where: { id },
      relations: ['campaign'],
    });
  }

  /**
   * 캠페인별 상품 목록 조회
   */
  async getProductsByCampaign(
    campaignId: string,
    options?: {
      status?: CampaignProductStatus;
      supplierId?: string;
    }
  ): Promise<CampaignProduct[]> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .where('product.campaignId = :campaignId', { campaignId });

    if (options?.status) {
      query.andWhere('product.status = :status', { status: options.status });
    }

    if (options?.supplierId) {
      query.andWhere('product.supplierId = :supplierId', {
        supplierId: options.supplierId,
      });
    }

    return query.getMany();
  }

  /**
   * 공급자별 상품 목록 조회
   */
  async getProductsBySupplier(
    supplierId: string,
    options?: {
      activeOnly?: boolean;
    }
  ): Promise<CampaignProduct[]> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.campaign', 'campaign')
      .where('product.supplierId = :supplierId', { supplierId });

    if (options?.activeOnly) {
      query
        .andWhere('product.status = :status', { status: 'active' })
        .andWhere('campaign.status = :campaignStatus', {
          campaignStatus: 'active',
        });
    }

    return query.getMany();
  }

  /**
   * 상품 정보 수정
   * - 캠페인이 draft 상태일 때만 수정 가능
   */
  async updateProduct(
    id: string,
    dto: UpdateCampaignProductDto
  ): Promise<CampaignProduct> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다');
    }

    if (product.campaign?.status !== 'draft') {
      throw new Error('진행 중인 캠페인의 상품은 수정할 수 없습니다');
    }

    // 기간 검증
    const startDate = dto.startDate ?? product.startDate;
    const endDate = dto.endDate ?? product.endDate;
    if (startDate >= endDate) {
      throw new Error('종료일은 시작일보다 이후여야 합니다');
    }

    // 수량 검증
    const minQty = dto.minTotalQuantity ?? product.minTotalQuantity;
    const maxQty = dto.maxTotalQuantity ?? product.maxTotalQuantity;
    if (maxQty && maxQty < minQty) {
      throw new Error('최대 수량은 최소 수량보다 커야 합니다');
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  /**
   * 상품 삭제
   * - 캠페인이 draft 상태이고 주문이 없을 때만 삭제 가능
   */
  async deleteProduct(id: string): Promise<void> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다');
    }

    if (product.campaign?.status !== 'draft') {
      throw new Error('진행 중인 캠페인의 상품은 삭제할 수 없습니다');
    }

    if (product.orderedQuantity > 0) {
      throw new Error('주문이 있는 상품은 삭제할 수 없습니다');
    }

    await this.productRepository.remove(product);
  }

  /**
   * 상품 마감
   * - active → closed
   */
  async closeProduct(id: string): Promise<CampaignProduct> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다');
    }

    if (product.status !== 'active') {
      throw new Error('진행 중인 상품만 마감할 수 있습니다');
    }

    product.status = 'closed';
    return this.productRepository.save(product);
  }

  /**
   * 수량 집계 업데이트
   * - 내부 사용: 주문 생성/취소 시 호출
   */
  async updateQuantityStats(
    id: string,
    delta: {
      orderedQuantity?: number;
      confirmedQuantity?: number;
    }
  ): Promise<CampaignProduct> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다');
    }

    if (delta.orderedQuantity) {
      product.orderedQuantity = Math.max(0, product.orderedQuantity + delta.orderedQuantity);
    }

    if (delta.confirmedQuantity) {
      product.confirmedQuantity = Math.max(0, product.confirmedQuantity + delta.confirmedQuantity);
    }

    // Phase 2: 최소 수량 달성 시 상태 업데이트
    // confirmedQuantity 기준으로 threshold 달성 여부 판단
    if (
      product.status === 'active' &&
      product.confirmedQuantity >= product.minTotalQuantity
    ) {
      product.status = 'threshold_met';
    }

    return this.productRepository.save(product);
  }

  /**
   * Phase 2: threshold 달성 여부 재계산
   * - 확정 수량 기준으로 상태 업데이트
   */
  async recheckThreshold(id: string): Promise<CampaignProduct> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다');
    }

    if (product.status === 'closed') {
      throw new Error('마감된 상품은 상태를 변경할 수 없습니다');
    }

    const isThresholdMet = product.confirmedQuantity >= product.minTotalQuantity;

    if (isThresholdMet && product.status === 'active') {
      product.status = 'threshold_met';
    } else if (!isThresholdMet && product.status === 'threshold_met') {
      // 취소로 인해 threshold 미달이 된 경우 active로 복귀
      product.status = 'active';
    }

    return this.productRepository.save(product);
  }

  /**
   * 주문 가능한 상품 목록 조회
   */
  async getAvailableProducts(
    campaignId: string
  ): Promise<CampaignProduct[]> {
    const now = new Date();

    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.campaign', 'campaign')
      .where('product.campaignId = :campaignId', { campaignId })
      .andWhere('product.status IN (:...statuses)', {
        statuses: ['active', 'threshold_met'],
      })
      .andWhere('product.startDate <= :now', { now })
      .andWhere('product.endDate >= :now', { now })
      .andWhere('campaign.status = :campaignStatus', { campaignStatus: 'active' })
      .getMany();
  }
}
