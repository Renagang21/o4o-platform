/**
 * PharmacyProductController
 *
 * 약국용 의약품 조회 API
 *
 * @package @o4o/pharmacyops
 */

import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { PharmacyProductService } from '../services/PharmacyProductService.js';

@Controller('pharmacyops/products')
export class PharmacyProductController {
  constructor(private readonly productService: PharmacyProductService) {}

  /**
   * GET /api/v1/pharmacyops/products
   * 의약품 목록 조회
   */
  @Get()
  async list(
    @Query('query') query?: string,
    @Query('category') category?: 'otc' | 'etc' | 'quasi_drug',
    @Query('therapeuticCategory') therapeuticCategory?: string,
    @Query('manufacturer') manufacturer?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.productService.list({
      query,
      category,
      therapeuticCategory,
      manufacturer,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /**
   * GET /api/v1/pharmacyops/products/:id
   * 의약품 상세 조회
   */
  @Get(':id')
  async detail(@Param('id') id: string) {
    const product = await this.productService.detail(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  /**
   * GET /api/v1/pharmacyops/products/search/drug-code/:code
   * 의약품 코드로 조회
   */
  @Get('search/drug-code/:code')
  async findByDrugCode(@Param('code') code: string) {
    const product = await this.productService.findByDrugCode(code);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  /**
   * GET /api/v1/pharmacyops/products/search/permit/:number
   * 품목허가번호로 조회
   */
  @Get('search/permit/:number')
  async findByPermitNumber(@Param('number') number: string) {
    const product = await this.productService.findByPermitNumber(number);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  /**
   * GET /api/v1/pharmacyops/products/search/ingredient
   * 성분명으로 검색
   */
  @Get('search/ingredient')
  async searchByIngredient(
    @Query('name') ingredientName: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.searchByIngredient(ingredientName, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * GET /api/v1/pharmacyops/products/category/:category
   * 치료 카테고리별 조회
   */
  @Get('category/:category')
  async listByCategory(
    @Param('category') category: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.listByTherapeuticCategory(category, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
