/**
 * Offers Controller
 *
 * API: /api/v1/dropshipping/core/offers
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { OfferService } from '../services/OfferService.js';
import { SupplierProductOffer, OfferStatus } from '../entities/SupplierProductOffer.entity.js';

@Controller('api/v1/dropshipping/core/offers')
export class OffersController {
  constructor(private readonly offerService: OfferService) {}

  @Get()
  async findAll(
    @Query('status') status?: OfferStatus,
    @Query('supplierId') supplierId?: string,
    @Query('productMasterId') productMasterId?: string
  ): Promise<SupplierProductOffer[]> {
    return await this.offerService.findAll({ status, supplierId, productMasterId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SupplierProductOffer> {
    const offer = await this.offerService.findById(id);
    if (!offer) {
      throw new Error('Offer not found');
    }
    return offer;
  }

  @Post()
  async create(@Body() data: Partial<SupplierProductOffer>): Promise<SupplierProductOffer> {
    return await this.offerService.createOffer(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<SupplierProductOffer>
  ): Promise<SupplierProductOffer> {
    return await this.offerService.updateOffer(id, data);
  }

  @Put(':id/price')
  async updatePrice(
    @Param('id') id: string,
    @Body('supplierPrice') supplierPrice: number,
    @Body('suggestedRetailPrice') suggestedRetailPrice?: number
  ): Promise<SupplierProductOffer> {
    return await this.offerService.updatePrice(id, supplierPrice, suggestedRetailPrice);
  }

  @Put(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body('stockQuantity') stockQuantity: number
  ): Promise<SupplierProductOffer> {
    return await this.offerService.updateStock(id, stockQuantity);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.offerService.deleteOffer(id);
  }
}
