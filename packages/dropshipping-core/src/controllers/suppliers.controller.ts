/**
 * Suppliers Controller
 *
 * API: /api/v1/dropshipping/core/supplier
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SupplierService } from '../services/SupplierService.js';
import { Supplier, SupplierStatus } from '../entities/Supplier.entity.js';

@Controller('api/v1/dropshipping/core/supplier')
export class SuppliersController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  async findAll(
    @Query('status') status?: SupplierStatus,
    @Query('search') search?: string
  ): Promise<Supplier[]> {
    return await this.supplierService.findAll({ status, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Supplier> {
    const supplier = await this.supplierService.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    return supplier;
  }

  @Post()
  async create(@Body() data: Partial<Supplier>): Promise<Supplier> {
    return await this.supplierService.createSupplier(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<Supplier>
  ): Promise<Supplier> {
    return await this.supplierService.updateSupplier(id, data);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string): Promise<Supplier> {
    return await this.supplierService.approveSupplier(id);
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string): Promise<Supplier> {
    return await this.supplierService.suspendSupplier(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.supplierService.deleteSupplier(id);
  }
}
