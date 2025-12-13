/**
 * PharmacyOfferController
 *
 * 약국용 도매 Offer 조회 API
 *
 * @package @o4o/pharmacyops
 */

import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { PharmacyOfferService } from '../services/PharmacyOfferService.js';

@Controller('pharmacyops/offers')
export class PharmacyOfferController {
  constructor(private readonly offerService: PharmacyOfferService) {}

  /**
   * GET /api/v1/pharmacyops/offers
   * Offer 목록 조회
   */
  @Get()
  async list(
    @Query('productId') productId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('supplierType') supplierType?: 'wholesaler' | 'manufacturer',
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStockOnly') inStockOnly?: string,
    @Query('hasColdChain') hasColdChain?: string,
    @Query('maxLeadTime') maxLeadTime?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'price' | 'leadTime' | 'stockQuantity' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.offerService.list({
      productId,
      supplierId,
      supplierType,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStockOnly: inStockOnly === 'true',
      hasColdChain: hasColdChain === 'true' ? true : hasColdChain === 'false' ? false : undefined,
      maxLeadTime: maxLeadTime ? parseInt(maxLeadTime) : undefined,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /**
   * GET /api/v1/pharmacyops/offers/:id
   * Offer 상세 조회
   */
  @Get(':id')
  async detail(@Param('id') id: string) {
    const offer = await this.offerService.detail(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  /**
   * GET /api/v1/pharmacyops/offers/product/:productId
   * 상품별 Offer 목록 조회
   */
  @Get('product/:productId')
  async listByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'price' | 'leadTime' | 'stockQuantity' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.offerService.listByProduct(productId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /**
   * GET /api/v1/pharmacyops/offers/product/:productId/lowest
   * 최저가 Offer 조회
   */
  @Get('product/:productId/lowest')
  async findLowestPrice(@Param('productId') productId: string) {
    const offer = await this.offerService.findLowestPriceOffer(productId);
    if (!offer) {
      throw new Error('No offer found');
    }
    return offer;
  }

  /**
   * GET /api/v1/pharmacyops/offers/product/:productId/fast-delivery
   * 당일/익일 배송 가능 Offer 조회
   */
  @Get('product/:productId/fast-delivery')
  async listFastDelivery(
    @Param('productId') productId: string,
    @Query('type') deliveryType: 'sameDay' | 'nextDay' = 'nextDay',
  ) {
    return this.offerService.listFastDeliveryOffers(productId, deliveryType);
  }

  /**
   * GET /api/v1/pharmacyops/offers/product/:productId/cold-chain
   * 콜드체인 가능 Offer 조회
   */
  @Get('product/:productId/cold-chain')
  async listColdChain(@Param('productId') productId: string) {
    return this.offerService.listColdChainOffers(productId);
  }

  /**
   * GET /api/v1/pharmacyops/offers/product/:productId/compare
   * 가격 비교
   */
  @Get('product/:productId/compare')
  async comparePrices(
    @Param('productId') productId: string,
    @Query('quantity') quantity: string,
  ) {
    return this.offerService.comparePrices(productId, parseInt(quantity) || 1);
  }
}
