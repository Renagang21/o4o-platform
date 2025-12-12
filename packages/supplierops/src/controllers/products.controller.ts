/**
 * Products Controller
 *
 * API: /api/v1/supplierops/products
 *
 * Phase 9-B: Core 정렬 업데이트
 * - productType 필터링 지원
 * - ProductStatus enum 정렬
 * - PHARMACEUTICAL 제한 적용
 */

import { Controller, Get, Post, Put, Delete, Req, Body, Param, Query } from '@nestjs/common';
import { ProductMasterService, ProductFilterOptions } from '../services/ProductMasterService.js';
import { ProductStatus } from '@o4o/dropshipping-core';
import type { CreateProductDto, ProductMasterDto, ProductFilterDto, ProductType } from '../dto/index.js';

@Controller('api/v1/supplierops/products')
export class ProductsController {
  constructor(private readonly productService: ProductMasterService) {}

  @Get()
  async getProducts(
    @Req() req: any,
    @Query('productType') productType?: ProductType,
    @Query('status') status?: ProductStatus,
    @Query('category') category?: string
  ): Promise<ProductMasterDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const filterOptions: ProductFilterOptions = {
      productType,
      status,
      category,
    };

    const products = await this.productService.getProducts(supplierId, filterOptions);
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      description: p.description || '',
      basePrice: 0, // Demo - should be from attributes
      category: p.category || '',
      brand: p.brand,
      productType: p.productType,
      attributes: p.attributes || {},
      status: p.status as string,
      isActive: p.status === ProductStatus.ACTIVE,
    }));
  }

  @Get('by-product-type/:productType')
  async getProductsByProductType(
    @Req() req: any,
    @Param('productType') productType: ProductType
  ): Promise<ProductMasterDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const products = await this.productService.getProducts(supplierId, { productType });
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      description: p.description || '',
      basePrice: 0,
      category: p.category || '',
      brand: p.brand,
      productType: p.productType,
      attributes: p.attributes || {},
      status: p.status as string,
      isActive: p.status === ProductStatus.ACTIVE,
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

    // Service에서 PHARMACEUTICAL 제한 검증
    const product = await this.productService.createProduct(supplierId, {
      name: dto.name,
      sku: dto.sku,
      description: dto.description,
      brand: dto.brand,
      category: dto.category,
      productType: dto.productType,
      attributes: dto.attributes,
    });

    return {
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      basePrice: dto.basePrice,
      category: product.category || '',
      brand: product.brand,
      productType: product.productType,
      attributes: product.attributes || {},
      status: product.status as string,
      isActive: product.status === ProductStatus.ACTIVE,
    };
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>
  ): Promise<ProductMasterDto> {
    const product = await this.productService.updateProduct(id, {
      name: dto.name,
      sku: dto.sku,
      description: dto.description,
      brand: dto.brand,
      category: dto.category,
      productType: dto.productType,
      attributes: dto.attributes,
    });

    return {
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      basePrice: dto.basePrice || 0,
      category: product.category || '',
      brand: product.brand,
      productType: product.productType,
      attributes: product.attributes || {},
      status: product.status as string,
      isActive: product.status === ProductStatus.ACTIVE,
    };
  }

  @Post('validate')
  async validateProduct(
    @Body() dto: CreateProductDto
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.productService.validateProductCreate(dto);
  }
}
