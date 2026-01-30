/**
 * Featured Products Service
 *
 * WO-FEATURED-CURATION-API-V1:
 * 운영자 Featured 상품 큐레이션 관리 서비스
 *
 * 핵심 원칙:
 * - Featured는 상품 속성이 아니라 별도 큐레이션 엔티티
 * - 상품 데이터는 읽기 전용으로 참조만 함
 * - 노출 여부/순서는 이 서비스가 소유
 */

import { DataSource } from 'typeorm';
import { GlycopharmFeaturedProduct } from '../entities/glycopharm-featured-product.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';

export interface FeaturedProductWithDetails extends GlycopharmFeaturedProduct {
  product?: GlycopharmProduct;
}

export interface AddFeaturedProductDto {
  service: string;
  context: string;
  productId: string;
  userId?: string;
  userName?: string;
}

export interface UpdateFeaturedActiveDto {
  isActive: boolean;
}

export class FeaturedProductsService {
  constructor(private dataSource: DataSource) {}

  /**
   * 1. Featured 상품 목록 조회 (상품 정보 포함)
   */
  async listFeaturedProducts(
    service: string,
    context: string
  ): Promise<FeaturedProductWithDetails[]> {
    const repository = this.dataSource.getRepository(GlycopharmFeaturedProduct);

    const featuredProducts = await repository.find({
      where: { service, context },
      relations: ['product'],
      order: { position: 'ASC' },
    });

    return featuredProducts;
  }

  /**
   * 2. Featured 상품 추가
   */
  async addFeaturedProduct(dto: AddFeaturedProductDto): Promise<GlycopharmFeaturedProduct> {
    const repository = this.dataSource.getRepository(GlycopharmFeaturedProduct);

    // 중복 확인
    const existing = await repository.findOne({
      where: {
        service: dto.service,
        context: dto.context,
        product_id: dto.productId,
      },
    });

    if (existing) {
      throw new Error('이미 Featured로 등록된 상품입니다');
    }

    // 상품 존재 여부 확인
    const productRepo = this.dataSource.getRepository(GlycopharmProduct);
    const product = await productRepo.findOne({ where: { id: dto.productId } });

    if (!product) {
      throw new Error('상품을 찾을 수 없습니다');
    }

    // 마지막 position 계산
    const lastItem = await repository.findOne({
      where: { service: dto.service, context: dto.context },
      order: { position: 'DESC' },
    });

    const newPosition = lastItem ? lastItem.position + 1 : 0;

    // Featured 상품 생성
    const featuredProduct = repository.create({
      service: dto.service,
      context: dto.context,
      product_id: dto.productId,
      position: newPosition,
      is_active: true,
      created_by_user_id: dto.userId,
      created_by_user_name: dto.userName,
    });

    return await repository.save(featuredProduct);
  }

  /**
   * 3. Featured 상품 순서 변경
   */
  async reorderFeaturedProducts(ids: string[]): Promise<void> {
    const repository = this.dataSource.getRepository(GlycopharmFeaturedProduct);

    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < ids.length; i++) {
        await manager.update(GlycopharmFeaturedProduct, ids[i], { position: i });
      }
    });
  }

  /**
   * 4. Featured 상품 활성/비활성
   */
  async updateFeaturedActive(
    id: string,
    dto: UpdateFeaturedActiveDto
  ): Promise<GlycopharmFeaturedProduct | null> {
    const repository = this.dataSource.getRepository(GlycopharmFeaturedProduct);

    const featuredProduct = await repository.findOne({ where: { id } });

    if (!featuredProduct) {
      return null;
    }

    featuredProduct.is_active = dto.isActive;
    return await repository.save(featuredProduct);
  }

  /**
   * 5. Featured 상품 제거
   */
  async removeFeaturedProduct(id: string): Promise<boolean> {
    const repository = this.dataSource.getRepository(GlycopharmFeaturedProduct);

    const featuredProduct = await repository.findOne({ where: { id } });

    if (!featuredProduct) {
      return false;
    }

    // 삭제
    await repository.remove(featuredProduct);

    // 나머지 항목들의 position 재정렬
    const remainingItems = await repository.find({
      where: {
        service: featuredProduct.service,
        context: featuredProduct.context,
      },
      order: { position: 'ASC' },
    });

    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < remainingItems.length; i++) {
        await manager.update(GlycopharmFeaturedProduct, remainingItems[i].id, {
          position: i,
        });
      }
    });

    return true;
  }
}
