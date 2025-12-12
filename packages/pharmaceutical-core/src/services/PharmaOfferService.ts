/**
 * PharmaOfferService
 *
 * 의약품 Offer (공급 조건) 관리 서비스
 *
 * @package @o4o/pharmaceutical-core
 */

import { Repository } from 'typeorm';
import {
  PharmaOffer,
  PharmaOfferStatus,
  PharmaSupplierType,
} from '../entities/PharmaOffer.entity.js';

export interface CreatePharmaOfferDto {
  productId: string;
  supplierId: string;
  supplierType?: PharmaSupplierType;
  supplierPrice: number;
  insurancePrice?: number;
  stockQuantity: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  bulkDiscountRate?: number;
  bulkDiscountThreshold?: number;
  leadTimeDays?: number;
  shippingOptions?: {
    sameDay?: boolean;
    nextDay?: boolean;
    coldChain?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface UpdatePharmaOfferDto extends Partial<CreatePharmaOfferDto> {
  status?: PharmaOfferStatus;
}

export interface PharmaOfferFilter {
  productId?: string;
  supplierId?: string;
  supplierType?: PharmaSupplierType;
  status?: PharmaOfferStatus;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
}

export class PharmaOfferService {
  constructor(private offerRepository: Repository<PharmaOffer>) {}

  /**
   * Offer 생성
   */
  async create(data: CreatePharmaOfferDto): Promise<PharmaOffer> {
    const offer = this.offerRepository.create({
      ...data,
      supplierType: data.supplierType || PharmaSupplierType.WHOLESALER,
      minOrderQuantity: data.minOrderQuantity || 1,
      leadTimeDays: data.leadTimeDays || 1,
      status: PharmaOfferStatus.ACTIVE,
    });
    return this.offerRepository.save(offer);
  }

  /**
   * Offer 조회 (ID)
   */
  async findById(id: string): Promise<PharmaOffer | null> {
    return this.offerRepository.findOne({
      where: { id },
      relations: ['product'],
    });
  }

  /**
   * 공급자별 Offer 목록
   */
  async findBySupplierId(
    supplierId: string,
    filter: Omit<PharmaOfferFilter, 'supplierId'> = {}
  ): Promise<{
    items: PharmaOffer[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.findAll({ ...filter, supplierId });
  }

  /**
   * 상품별 Offer 목록
   */
  async findByProductId(
    productId: string,
    filter: Omit<PharmaOfferFilter, 'productId'> = {}
  ): Promise<{
    items: PharmaOffer[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.findAll({ ...filter, productId });
  }

  /**
   * Offer 목록 조회
   */
  async findAll(filter: PharmaOfferFilter = {}): Promise<{
    items: PharmaOffer[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, ...where } = filter;

    const qb = this.offerRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.product', 'product');

    if (where.productId) {
      qb.andWhere('offer.productId = :productId', {
        productId: where.productId,
      });
    }

    if (where.supplierId) {
      qb.andWhere('offer.supplierId = :supplierId', {
        supplierId: where.supplierId,
      });
    }

    if (where.supplierType) {
      qb.andWhere('offer.supplierType = :supplierType', {
        supplierType: where.supplierType,
      });
    }

    if (where.status) {
      qb.andWhere('offer.status = :status', { status: where.status });
    }

    if (where.minPrice !== undefined) {
      qb.andWhere('offer.supplierPrice >= :minPrice', {
        minPrice: where.minPrice,
      });
    }

    if (where.maxPrice !== undefined) {
      qb.andWhere('offer.supplierPrice <= :maxPrice', {
        maxPrice: where.maxPrice,
      });
    }

    if (where.inStock === true) {
      qb.andWhere('offer.stockQuantity > 0');
    }

    qb.orderBy('offer.supplierPrice', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * Offer 수정
   */
  async update(
    id: string,
    data: UpdatePharmaOfferDto
  ): Promise<PharmaOffer | null> {
    const offer = await this.findById(id);
    if (!offer) return null;

    Object.assign(offer, data);
    return this.offerRepository.save(offer);
  }

  /**
   * 재고 수량 업데이트
   */
  async updateStock(id: string, quantity: number): Promise<PharmaOffer | null> {
    const offer = await this.findById(id);
    if (!offer) return null;

    offer.stockQuantity = quantity;
    if (quantity <= 0) {
      offer.status = PharmaOfferStatus.OUT_OF_STOCK;
    } else if (offer.status === PharmaOfferStatus.OUT_OF_STOCK) {
      offer.status = PharmaOfferStatus.ACTIVE;
    }

    return this.offerRepository.save(offer);
  }

  /**
   * 재고 차감
   */
  async decreaseStock(
    id: string,
    quantity: number
  ): Promise<PharmaOffer | null> {
    const offer = await this.findById(id);
    if (!offer) return null;

    const newQuantity = Math.max(0, offer.stockQuantity - quantity);
    return this.updateStock(id, newQuantity);
  }

  /**
   * 상태 변경
   */
  async updateStatus(
    id: string,
    status: PharmaOfferStatus
  ): Promise<PharmaOffer | null> {
    return this.update(id, { status });
  }

  /**
   * 최저가 Offer 조회
   */
  async findLowestPriceOffer(productId: string): Promise<PharmaOffer | null> {
    return this.offerRepository.findOne({
      where: {
        productId,
        status: PharmaOfferStatus.ACTIVE,
      },
      order: { supplierPrice: 'ASC' },
      relations: ['product'],
    });
  }
}
