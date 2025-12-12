/**
 * Offers Controller
 *
 * API: /api/v1/supplierops/offers
 *
 * Phase 2 업데이트:
 * - supplierPrice 통일 (price → supplierPrice)
 * - stockQuantity 통일 (stock → stockQuantity)
 * - productType 지원
 */

import { Controller, Get, Post, Put, Req, Body, Param } from '@nestjs/common';
import { OfferOpsService } from '../services/OfferOpsService.js';
import type { CreateOfferDto, OfferDto } from '../dto/index.js';

@Controller('api/v1/supplierops/offers')
export class OffersController {
  constructor(private readonly offerService: OfferOpsService) {}

  @Get()
  async getOffers(@Req() req: any): Promise<OfferDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    const offers = await this.offerService.getOffers(supplierId);
    return offers.map((o) => ({
      id: o.id,
      productId: o.productId,
      productName: o.productName,
      productType: o.productType,
      supplierPrice: o.supplierPrice,
      stockQuantity: o.stockQuantity,
      minOrderQuantity: o.minOrderQuantity,
      isActive: o.isActive,
      activeSellers: o.activeSellers,
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
    const offer = await this.offerService.createOffer(supplierId, dto);
    return {
      id: offer.id,
      productId: offer.productId,
      productName: offer.productName,
      productType: offer.productType,
      supplierPrice: offer.supplierPrice,
      stockQuantity: offer.stockQuantity,
      minOrderQuantity: offer.minOrderQuantity,
      isActive: offer.isActive,
      activeSellers: offer.activeSellers,
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
      productName: offer.productName,
      productType: offer.productType,
      supplierPrice: offer.supplierPrice,
      stockQuantity: offer.stockQuantity,
      minOrderQuantity: offer.minOrderQuantity,
      isActive: offer.isActive,
      activeSellers: offer.activeSellers,
    };
  }
}
