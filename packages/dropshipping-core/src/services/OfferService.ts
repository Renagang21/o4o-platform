/**
 * OfferService
 *
 * 공급자 오퍼 생성 및 갱신
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SupplierProductOffer,
  OfferStatus,
} from '../entities/SupplierProductOffer.entity.js';
import { Supplier, SupplierStatus } from '../entities/Supplier.entity.js';

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(SupplierProductOffer)
    private readonly offerRepository: Repository<SupplierProductOffer>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  /**
   * Offer 생성
   */
  async createOffer(
    data: Partial<SupplierProductOffer>
  ): Promise<SupplierProductOffer> {
    // Supplier ACTIVE guard
    if (data.supplierId) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: data.supplierId },
      });
      if (!supplier || supplier.status !== SupplierStatus.ACTIVE) {
        throw new Error('SUPPLIER_NOT_ACTIVE');
      }
    }

    const offer = this.offerRepository.create({
      ...data,
      status: data.status || OfferStatus.ACTIVE,
    });
    return await this.offerRepository.save(offer);
  }

  /**
   * Offer 조회
   */
  async findById(id: string): Promise<SupplierProductOffer | null> {
    return await this.offerRepository.findOne({
      where: { id },
      relations: ['supplier', 'productMaster', 'listings'],
    });
  }

  /**
   * 공급자별 Offer 목록
   */
  async findBySupplier(supplierId: string): Promise<SupplierProductOffer[]> {
    return await this.offerRepository.find({
      where: { supplierId },
      relations: ['productMaster'],
    });
  }

  /**
   * 상품별 Offer 목록
   */
  async findByProduct(productMasterId: string): Promise<SupplierProductOffer[]> {
    return await this.offerRepository.find({
      where: { productMasterId },
      relations: ['supplier'],
    });
  }

  /**
   * Offer 목록 조회
   */
  async findAll(filters?: {
    status?: OfferStatus;
    supplierId?: string;
    productMasterId?: string;
  }): Promise<SupplierProductOffer[]> {
    const query = this.offerRepository.createQueryBuilder('offer');

    if (filters?.status) {
      query.andWhere('offer.status = :status', { status: filters.status });
    }

    if (filters?.supplierId) {
      query.andWhere('offer.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }

    if (filters?.productMasterId) {
      query.andWhere('offer.productMasterId = :productMasterId', {
        productMasterId: filters.productMasterId,
      });
    }

    return await query
      .leftJoinAndSelect('offer.supplier', 'supplier')
      .leftJoinAndSelect('offer.productMaster', 'productMaster')
      .getMany();
  }

  /**
   * Offer 가격 업데이트
   */
  async updatePrice(
    id: string,
    supplierPrice: number,
    suggestedRetailPrice?: number
  ): Promise<SupplierProductOffer> {
    const offer = await this.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }

    offer.supplierPrice = supplierPrice;
    if (suggestedRetailPrice !== undefined) {
      offer.suggestedRetailPrice = suggestedRetailPrice;
    }
    return await this.offerRepository.save(offer);
  }

  /**
   * Offer 재고 업데이트
   */
  async updateStock(id: string, stockQuantity: number): Promise<SupplierProductOffer> {
    const offer = await this.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }

    offer.stockQuantity = stockQuantity;
    if (stockQuantity === 0) {
      offer.status = OfferStatus.OUT_OF_STOCK;
    } else if (offer.status === OfferStatus.OUT_OF_STOCK) {
      offer.status = OfferStatus.ACTIVE;
    }
    return await this.offerRepository.save(offer);
  }

  /**
   * Offer 업데이트
   */
  async updateOffer(
    id: string,
    data: Partial<SupplierProductOffer>
  ): Promise<SupplierProductOffer> {
    const offer = await this.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }

    Object.assign(offer, data);
    return await this.offerRepository.save(offer);
  }

  /**
   * Offer 삭제
   */
  async deleteOffer(id: string): Promise<void> {
    await this.offerRepository.delete(id);
  }
}
