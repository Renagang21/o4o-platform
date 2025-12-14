/**
 * Pharma Products Controller
 *
 * API: /api/v1/pharma/products
 *
 * PharmaProductMaster CRUD operations
 * 의약품 원본 정보 관리 (식약처 허가정보 포함)
 *
 * @package @o4o/pharmaceutical-core
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import {
  PharmaProductService,
  type CreatePharmaProductDto,
  type UpdatePharmaProductDto,
  type PharmaProductFilter,
} from '../services/PharmaProductService.js';
import type { PharmaProductCategory, PharmaProductStatus } from '../entities/PharmaProductMaster.entity.js';

@Controller('api/v1/pharma/products')
export class ProductsController {
  constructor(private readonly productService: PharmaProductService) {}

  /**
   * 의약품 목록 조회
   */
  @Get()
  async getProducts(
    @Query('category') category?: PharmaProductCategory,
    @Query('status') status?: PharmaProductStatus,
    @Query('manufacturer') manufacturer?: string,
    @Query('therapeuticCategory') therapeuticCategory?: string,
    @Query('searchTerm') searchTerm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filter: PharmaProductFilter = {
      category,
      status,
      manufacturer,
      therapeuticCategory,
      searchTerm,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return await this.productService.findAll(filter);
  }

  /**
   * 의약품 상세 조회
   */
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const product = await this.productService.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  /**
   * 의약품 표준코드로 조회
   */
  @Get('by-drug-code/:drugCode')
  async getProductByDrugCode(@Param('drugCode') drugCode: string) {
    const product = await this.productService.findByDrugCode(drugCode);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  /**
   * 의약품 등록
   */
  @Post()
  async createProduct(@Body() dto: CreatePharmaProductDto) {
    return await this.productService.create(dto);
  }

  /**
   * 의약품 정보 수정
   */
  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdatePharmaProductDto
  ) {
    const product = await this.productService.update(id, dto);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  /**
   * 의약품 상태 변경
   */
  @Put(':id/status')
  async updateProductStatus(
    @Param('id') id: string,
    @Body('status') status: PharmaProductStatus
  ) {
    const product = await this.productService.updateStatus(id, status);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  /**
   * 의약품 삭제 (soft delete)
   */
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    const success = await this.productService.delete(id);
    return { success };
  }

  /**
   * 카테고리별 의약품 목록
   */
  @Get('category/:category')
  async getProductsByCategory(
    @Param('category') category: PharmaProductCategory,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.productService.findAll({
      category,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 카테고리별 통계
   */
  @Get('stats/by-category')
  async getStatsByCategory() {
    return await this.productService.getStatsByCategory();
  }
}
