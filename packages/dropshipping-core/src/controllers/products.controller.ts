/**
 * Products Controller
 *
 * API: /api/v1/dropshipping/core/products
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProductMasterService } from '../services/ProductMasterService.js';
import { ProductMaster, ProductStatus, ProductType } from '../entities/ProductMaster.entity.js';

@Controller('api/v1/dropshipping/core/products')
export class ProductsController {
  constructor(private readonly productService: ProductMasterService) {}

  @Get()
  async findAll(
    @Query('status') status?: ProductStatus,
    @Query('productType') productType?: ProductType,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('search') search?: string
  ): Promise<ProductMaster[]> {
    return await this.productService.findAll({ status, productType, category, brand, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductMaster> {
    const product = await this.productService.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  @Post()
  async create(@Body() data: Partial<ProductMaster>): Promise<ProductMaster> {
    return await this.productService.createProduct(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<ProductMaster>
  ): Promise<ProductMaster> {
    return await this.productService.updateProduct(id, data);
  }

  @Put(':id/attributes')
  async updateAttributes(
    @Param('id') id: string,
    @Body() attributes: Record<string, any>
  ): Promise<ProductMaster> {
    return await this.productService.updateAttributes(id, attributes);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ProductStatus
  ): Promise<ProductMaster> {
    return await this.productService.updateStatus(id, status);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.productService.deleteProduct(id);
  }
}
