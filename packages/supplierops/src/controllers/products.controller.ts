/**
 * Products Controller
 *
 * API: /api/v1/supplierops/products
 *
 * Phase 2 업데이트:
 * - productType 필드 추가
 */

import { Controller, Get, Post, Put, Delete, Req, Body, Param } from '@nestjs/common';
import { ProductMasterService } from '../services/ProductMasterService.js';
import type { CreateProductDto, ProductMasterDto, ProductType } from '../dto/index.js';

@Controller('api/v1/supplierops/products')
export class ProductsController {
  constructor(private readonly productService: ProductMasterService) {}

  @Get()
  async getProducts(@Req() req: any): Promise<ProductMasterDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    const products = await this.productService.getProducts(supplierId);
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      basePrice: p.basePrice,
      category: p.category,
      productType: p.productType as ProductType,
      attributes: p.attributes,
      isActive: p.isActive,
    }));
  }

  @Post()
  async createProduct(
    @Req() req: any,
    @Body() dto: CreateProductDto
  ): Promise<ProductMasterDto> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    const product = await this.productService.createProduct(supplierId, dto);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      basePrice: product.basePrice,
      category: product.category,
      productType: product.productType as ProductType,
      attributes: product.attributes,
      isActive: product.isActive,
    };
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>
  ): Promise<ProductMasterDto> {
    const product = await this.productService.updateProduct(id, dto);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      basePrice: product.basePrice,
      category: product.category,
      productType: product.productType as ProductType,
      attributes: product.attributes,
      isActive: product.isActive,
    };
  }
}
