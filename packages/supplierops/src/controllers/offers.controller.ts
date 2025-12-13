/**
 * Offers Controller
 *
 * API: /api/v1/supplierops/offers
 *
 * Phase 9-B: Core 정렬 업데이트
 * - productType 필터링 지원
 * - OfferStatus enum 정렬
 * - PHARMACEUTICAL 제한 적용
 */

import { Controller, Get, Post, Put, Req, Body, Param, Query } from '@nestjs/common';
import { OfferOpsService, OfferFilterOptions } from '../services/OfferOpsService.js';
import type { CreateOfferDto, OfferDto, OfferFilterDto, ProductType, OfferStatus } from '../dto/index.js';

@Controller('api/v1/supplierops/offers')
export class OffersController {
  constructor(private readonly offerService: OfferOpsService) {}

  @Get()
  async getOffers(
    @Req() req: any,
    @Query('productType') productType?: ProductType,
    @Query('status') status?: OfferStatus,
    @Query('isActive') isActive?: string
  ): Promise<OfferDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const filterOptions: OfferFilterOptions = {
      productType,
      status,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };

    const offers = await this.offerService.getOffers(supplierId, filterOptions);
    return offers.map((o) => ({
      id: o.id,
      productId: o.productId,
      productMasterId: o.productMasterId,
      productName: o.productName,
      productType: o.productType,
      supplierPrice: o.supplierPrice,
      suggestedRetailPrice: o.suggestedRetailPrice,
      stockQuantity: o.stockQuantity,
      minOrderQuantity: o.minOrderQuantity,
      maxOrderQuantity: o.maxOrderQuantity,
      status: o.status,
      isActive: o.isActive,
      activeSellers: o.activeSellers,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  @Get('by-product-type/:productType')
  async getOffersByProductType(
    @Req() req: any,
    @Param('productType') productType: ProductType
  ): Promise<OfferDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const offers = await this.offerService.getOffersByProductType(supplierId, productType);
    return offers.map((o) => ({
      id: o.id,
      productId: o.productId,
      productMasterId: o.productMasterId,
      productName: o.productName,
      productType: o.productType,
      supplierPrice: o.supplierPrice,
      suggestedRetailPrice: o.suggestedRetailPrice,
      stockQuantity: o.stockQuantity,
      minOrderQuantity: o.minOrderQuantity,
      maxOrderQuantity: o.maxOrderQuantity,
      status: o.status,
      isActive: o.isActive,
      activeSellers: o.activeSellers,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  @Post()
  async createOffer(
    @Req() req: any,
    @Body() dto: CreateOfferDto
  ): Promise<OfferDto> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    // Service에서 PHARMACEUTICAL 제한 검증
    const offer = await this.offerService.createOffer(supplierId, {
      productId: dto.productId,
      productMasterId: dto.productMasterId,
      supplierPrice: dto.supplierPrice,
      suggestedRetailPrice: dto.suggestedRetailPrice,
      stockQuantity: dto.stockQuantity,
      minOrderQuantity: dto.minOrderQuantity,
      maxOrderQuantity: dto.maxOrderQuantity,
    });

    return {
      id: offer.id,
      productId: offer.productId,
      productMasterId: offer.productMasterId,
      productName: offer.productName,
      productType: offer.productType,
      supplierPrice: offer.supplierPrice,
      suggestedRetailPrice: offer.suggestedRetailPrice,
      stockQuantity: offer.stockQuantity,
      minOrderQuantity: offer.minOrderQuantity,
      maxOrderQuantity: offer.maxOrderQuantity,
      status: offer.status,
      isActive: offer.isActive,
      activeSellers: offer.activeSellers,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  }

  @Put(':id')
  async updateOffer(
    @Param('id') id: string,
    @Body() dto: Partial<CreateOfferDto>
  ): Promise<OfferDto> {
    const offer = await this.offerService.updateOffer(id, dto);
    return {
      id: offer.id,
      productId: offer.productId,
      productMasterId: offer.productMasterId,
      productName: offer.productName,
      productType: offer.productType,
      supplierPrice: offer.supplierPrice,
      suggestedRetailPrice: offer.suggestedRetailPrice,
      stockQuantity: offer.stockQuantity,
      minOrderQuantity: offer.minOrderQuantity,
      maxOrderQuantity: offer.maxOrderQuantity,
      status: offer.status,
      isActive: offer.isActive,
      activeSellers: offer.activeSellers,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  }

  @Put(':id/deactivate')
  async deactivateOffer(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.offerService.deactivateOffer(id);
    return { success: true };
  }
}
