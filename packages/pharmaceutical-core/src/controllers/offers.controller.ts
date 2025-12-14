/**
 * Pharma Offers Controller
 *
 * API: /api/v1/pharma/offers
 *
 * PharmaOffer CRUD operations
 * 의약품 Offer 관리 - 도매상/제조사만 Offer 생성 가능
 *
 * @package @o4o/pharmaceutical-core
 */

import { Controller, Get, Post, Put, Req, Body, Param, Query } from '@nestjs/common';
import {
  PharmaOfferService,
  type CreatePharmaOfferDto,
  type UpdatePharmaOfferDto,
  type PharmaOfferFilter,
} from '../services/PharmaOfferService.js';
import { PharmaOfferStatus, PharmaSupplierType } from '../entities/PharmaOffer.entity.js';

@Controller('api/v1/pharma/offers')
export class OffersController {
  constructor(private readonly offerService: PharmaOfferService) {}

  /**
   * Offer 목록 조회
   */
  @Get()
  async getOffers(
    @Req() req: any,
    @Query('status') status?: PharmaOfferStatus,
    @Query('supplierType') supplierType?: PharmaSupplierType,
    @Query('inStock') inStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const supplierId = req.user?.supplierId || req.query.supplierId;

    const filter: PharmaOfferFilter = {
      supplierId,
      status,
      supplierType,
      inStock: inStock !== undefined ? inStock === 'true' : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return await this.offerService.findAll(filter);
  }

  /**
   * Offer 상세 조회
   */
  @Get(':id')
  async getOffer(@Param('id') id: string) {
    const offer = await this.offerService.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  /**
   * 공급자별 Offer 목록 조회
   */
  @Get('supplier/:supplierId')
  async getOffersBySupplier(
    @Param('supplierId') supplierId: string,
    @Query('status') status?: PharmaOfferStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.offerService.findBySupplierId(supplierId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 상품별 Offer 목록 조회
   */
  @Get('product/:productId')
  async getOffersByProduct(
    @Param('productId') productId: string,
    @Query('status') status?: PharmaOfferStatus
  ) {
    return await this.offerService.findByProductId(productId, {
      status,
      inStock: true,
    });
  }

  /**
   * 상품 최저가 Offer 조회
   */
  @Get('product/:productId/lowest')
  async getLowestPriceOffer(@Param('productId') productId: string) {
    const offer = await this.offerService.findLowestPriceOffer(productId);
    if (!offer) {
      throw new Error('No offer found for this product');
    }
    return offer;
  }

  /**
   * Offer 생성
   * 도매상(WHOLESALER) 또는 제조사(MANUFACTURER)만 가능
   */
  @Post()
  async createOffer(
    @Req() req: any,
    @Body() dto: CreatePharmaOfferDto
  ) {
    const supplierId = req.user?.supplierId || dto.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    // supplierType 검증 (서비스 레벨에서도 검증됨)
    if (dto.supplierType && dto.supplierType !== 'wholesaler' && dto.supplierType !== 'manufacturer') {
      throw new Error('Only wholesaler or manufacturer can create pharmaceutical offers');
    }

    return await this.offerService.create({
      ...dto,
      supplierId,
    });
  }

  /**
   * Offer 수정
   */
  @Put(':id')
  async updateOffer(
    @Param('id') id: string,
    @Body() dto: UpdatePharmaOfferDto
  ) {
    const offer = await this.offerService.update(id, dto);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  /**
   * Offer 상태 변경
   */
  @Put(':id/status')
  async updateOfferStatus(
    @Param('id') id: string,
    @Body('status') status: PharmaOfferStatus
  ) {
    const offer = await this.offerService.updateStatus(id, status);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  /**
   * Offer 활성화
   */
  @Put(':id/activate')
  async activateOffer(@Param('id') id: string) {
    const offer = await this.offerService.updateStatus(id, PharmaOfferStatus.ACTIVE);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  /**
   * Offer 비활성화
   */
  @Put(':id/deactivate')
  async deactivateOffer(@Param('id') id: string) {
    const offer = await this.offerService.updateStatus(id, PharmaOfferStatus.INACTIVE);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  /**
   * 재고 수량 업데이트
   */
  @Put(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number
  ) {
    const offer = await this.offerService.updateStock(id, quantity);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  /**
   * 재고 차감
   */
  @Put(':id/decrease-stock')
  async decreaseStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number
  ) {
    const offer = await this.offerService.decreaseStock(id, quantity);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }
}
