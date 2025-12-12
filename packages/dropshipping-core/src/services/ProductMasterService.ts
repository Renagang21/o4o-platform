/**
 * ProductMasterService
 *
 * 상품 생성, 업데이트, 메타데이터 확장
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductMaster, ProductStatus, ProductType } from '../entities/ProductMaster.entity.js';

@Injectable()
export class ProductMasterService {
  constructor(
    @InjectRepository(ProductMaster)
    private readonly productRepository: Repository<ProductMaster>
  ) {}

  /**
   * 상품 생성
   */
  async createProduct(data: Partial<ProductMaster>): Promise<ProductMaster> {
    const product = this.productRepository.create({
      ...data,
      status: data.status || ProductStatus.DRAFT,
    });
    return await this.productRepository.save(product);
  }

  /**
   * 상품 조회
   */
  async findById(id: string): Promise<ProductMaster | null> {
    return await this.productRepository.findOne({
      where: { id },
      relations: ['offers'],
    });
  }

  /**
   * SKU로 상품 조회
   */
  async findBySku(sku: string): Promise<ProductMaster | null> {
    return await this.productRepository.findOne({
      where: { sku },
    });
  }

  /**
   * 상품 목록 조회
   */
  async findAll(filters?: {
    status?: ProductStatus;
    productType?: ProductType;
    category?: string;
    brand?: string;
    search?: string;
  }): Promise<ProductMaster[]> {
    const query = this.productRepository.createQueryBuilder('product');

    if (filters?.status) {
      query.andWhere('product.status = :status', { status: filters.status });
    }

    if (filters?.productType) {
      query.andWhere('product.productType = :productType', {
        productType: filters.productType,
      });
    }

    if (filters?.category) {
      query.andWhere('product.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.brand) {
      query.andWhere('product.brand = :brand', { brand: filters.brand });
    }

    if (filters?.search) {
      query.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await query.getMany();
  }

  /**
   * productType으로 상품 조회 (Extension 앱 전용)
   */
  async findByProductType(productType: ProductType): Promise<ProductMaster[]> {
    return await this.productRepository.find({
      where: { productType },
    });
  }

  /**
   * 상품 업데이트
   */
  async updateProduct(
    id: string,
    data: Partial<ProductMaster>
  ): Promise<ProductMaster> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    Object.assign(product, data);
    return await this.productRepository.save(product);
  }

  /**
   * 상품 attributes 업데이트 (산업별 확장 속성)
   */
  async updateAttributes(
    id: string,
    attributes: Record<string, any>
  ): Promise<ProductMaster> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    product.attributes = {
      ...(product.attributes || {}),
      ...attributes,
    };
    return await this.productRepository.save(product);
  }

  /**
   * 상품 상태 변경
   */
  async updateStatus(id: string, status: ProductStatus): Promise<ProductMaster> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    product.status = status;
    return await this.productRepository.save(product);
  }

  /**
   * 상품 삭제
   */
  async deleteProduct(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }
}
