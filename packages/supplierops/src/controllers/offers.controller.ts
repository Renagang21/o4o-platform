/**
 * Offers Controller
 *
 * API: /api/v1/supplierops/offers
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
      price: o.price,
      stock: o.stock,
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
      price: offer.price,
      stock: offer.stock,
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
      price: offer.price,
      stock: offer.stock,
      minOrderQuantity: offer.minOrderQuantity,
      isActive: offer.isActive,
      activeSellers: offer.activeSellers,
    };
  }
}
