/**
 * Suppliers Controller
 *
 * API: /api/v1/sellerops/suppliers
 */

import { Controller, Get, Post, Param, Body, Req, Query } from '@nestjs/common';
import { ProductType } from '@o4o/dropshipping-core';
import { SupplierOpsService } from '../services/SupplierOpsService.js';
import type { SupplierListItemDto, SupplierApprovalRequestDto } from '../dto/index.js';

@Controller('api/v1/sellerops/suppliers')
export class SuppliersController {
  constructor(private readonly supplierOpsService: SupplierOpsService) {}

  @Get()
  async getSuppliers(@Req() req: any): Promise<SupplierListItemDto[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.supplierOpsService.getSupplierList(sellerId);
  }

  @Get(':id')
  async getSupplier(@Param('id') id: string): Promise<any> {
    const supplier = await this.supplierOpsService.getSupplierDetail(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  }

  @Post(':id/request-approval')
  async requestApproval(
    @Param('id') supplierId: string,
    @Req() req: any,
    @Body() body: { message?: string }
  ): Promise<{ success: boolean; message: string }> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const dto: SupplierApprovalRequestDto = {
      supplierId,
      message: body.message,
    };

    return await this.supplierOpsService.requestApproval(sellerId, dto);
  }

  @Get(':id/offers')
  async getSupplierOffers(
    @Param('id') supplierId: string,
    @Req() req: any,
    @Query('productType') productType?: ProductType
  ): Promise<any[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.supplierOpsService.getSupplierOffersByProductType(
      supplierId,
      sellerId,
      productType
    );
  }
}
