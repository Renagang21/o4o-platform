/**
 * SupplierOpsService
 *
 * 공급자 조회 및 승인 요청 관리
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Supplier,
  SupplierProductOffer,
  SupplierStatus,
  OfferStatus,
  ProductType,
} from '@o4o/dropshipping-core';

/**
 * SellerOps에서 차단해야 하는 productType 목록
 * PHARMACEUTICAL 등 일반 판매 불가 상품 제외
 */
const BLOCKED_PRODUCT_TYPES: ProductType[] = [
  ProductType.PHARMACEUTICAL,
];
import type { SupplierListItemDto, SupplierApprovalRequestDto } from '../dto/index.js';

@Injectable()
export class SupplierOpsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(SupplierProductOffer)
    private readonly offerRepository: Repository<SupplierProductOffer>
  ) {}

  /**
   * 전체 공급자 목록 조회 (판매자 관점)
   */
  async getSupplierList(sellerId: string): Promise<SupplierListItemDto[]> {
    const suppliers = await this.supplierRepository.find({
      where: { status: SupplierStatus.ACTIVE },
    });

    const result: SupplierListItemDto[] = [];

    for (const supplier of suppliers) {
      // 해당 공급자의 상품 수 조회
      const productCount = await this.offerRepository.count({
        where: { supplierId: supplier.id, status: OfferStatus.ACTIVE },
      });

      // 승인 상태 조회 (SellerOps 전용 테이블에서)
      const approvalResult = await this.dataSource.query(`
        SELECT status FROM sellerops_supplier_approvals
        WHERE seller_id = $1 AND supplier_id = $2
        LIMIT 1
      `, [sellerId, supplier.id]).catch(() => []);

      const approvalStatus = approvalResult[0]?.status || 'none';

      // SupplierStatus enum을 DTO의 문자열 타입으로 변환
      const statusMap: Record<string, 'pending' | 'active' | 'suspended'> = {
        [SupplierStatus.PENDING]: 'pending',
        [SupplierStatus.ACTIVE]: 'active',
        [SupplierStatus.SUSPENDED]: 'suspended',
        [SupplierStatus.INACTIVE]: 'suspended', // INACTIVE를 suspended로 매핑
      };

      result.push({
        id: supplier.id,
        name: supplier.name,
        contactEmail: supplier.contactEmail || '',
        status: statusMap[supplier.status] || 'pending',
        approvalStatus,
        productCount,
      });
    }

    return result;
  }

  /**
   * 공급자 상세 조회
   */
  async getSupplierDetail(supplierId: string): Promise<Supplier | null> {
    return await this.supplierRepository.findOne({
      where: { id: supplierId },
    });
  }

  /**
   * 공급자 승인 요청
   */
  async requestApproval(
    sellerId: string,
    dto: SupplierApprovalRequestDto
  ): Promise<{ success: boolean; message: string }> {
    // 승인 요청 테이블이 없으면 생성
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS sellerops_supplier_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL,
        supplier_id UUID NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(seller_id, supplier_id)
      )
    `);

    // 기존 요청 확인
    const existing = await this.dataSource.query(`
      SELECT id, status FROM sellerops_supplier_approvals
      WHERE seller_id = $1 AND supplier_id = $2
    `, [sellerId, dto.supplierId]);

    if (existing.length > 0) {
      if (existing[0].status === 'approved') {
        return { success: false, message: '이미 승인된 공급자입니다.' };
      }
      if (existing[0].status === 'pending') {
        return { success: false, message: '이미 승인 요청이 진행 중입니다.' };
      }
    }

    // 새 승인 요청 생성
    await this.dataSource.query(`
      INSERT INTO sellerops_supplier_approvals (seller_id, supplier_id, status, message)
      VALUES ($1, $2, 'pending', $3)
      ON CONFLICT (seller_id, supplier_id)
      DO UPDATE SET status = 'pending', message = $3, updated_at = CURRENT_TIMESTAMP
    `, [sellerId, dto.supplierId, dto.message || '']);

    return { success: true, message: '승인 요청이 전송되었습니다.' };
  }

  /**
   * 공급자별 Offer 목록 조회
   *
   * PHARMACEUTICAL 등 차단된 productType은 자동 제외됩니다.
   */
  async getSupplierOffers(
    supplierId: string,
    sellerId: string
  ): Promise<SupplierProductOffer[]> {
    // 승인된 공급자인지 확인
    const approval = await this.dataSource.query(`
      SELECT status FROM sellerops_supplier_approvals
      WHERE seller_id = $1 AND supplier_id = $2
    `, [sellerId, supplierId]);

    if (!approval.length || approval[0].status !== 'approved') {
      return []; // 승인되지 않은 공급자의 Offer는 조회 불가
    }

    // Offer 조회 (productType 필터링 적용)
    const offers = await this.offerRepository.find({
      where: { supplierId, status: OfferStatus.ACTIVE },
      relations: ['productMaster'],
    });

    // PHARMACEUTICAL 등 차단된 productType 제외
    return offers.filter(offer => {
      const productType = offer.productMaster?.productType as ProductType;
      return !productType || !BLOCKED_PRODUCT_TYPES.includes(productType);
    });
  }

  /**
   * 특정 productType으로 필터링된 Offer 조회
   */
  async getSupplierOffersByProductType(
    supplierId: string,
    sellerId: string,
    productType?: ProductType
  ): Promise<SupplierProductOffer[]> {
    const offers = await this.getSupplierOffers(supplierId, sellerId);

    if (!productType) {
      return offers;
    }

    return offers.filter(offer =>
      offer.productMaster?.productType === productType
    );
  }
}
