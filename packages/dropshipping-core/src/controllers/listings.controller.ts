/**
 * Listings Controller
 *
 * API: /api/v1/dropshipping/core/listings
 *
 * Phase 1: 디바이스/코너별 제품 조회 필터 지원
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ListingService } from '../services/ListingService.js';
import { SellerListing, ListingStatus, ListingChannel } from '../entities/SellerListing.entity.js';
import type { ListingVisibility, DeviceType } from '@o4o/types';

@Controller('api/v1/dropshipping/core/listings')
export class ListingsController {
  constructor(private readonly listingService: ListingService) {}

  /**
   * Listing 목록 조회
   *
   * Phase 1: 디스플레이 필터 파라미터 추가
   *
   * @example
   * GET /api/v1/dropshipping/core/listings?deviceId=kiosk_1&corner=premium_zone
   * GET /api/v1/dropshipping/core/listings?visibility=featured&sortBy=sortOrder
   */
  @Get()
  async findAll(
    // 기존 필터 (하위 호환성 유지)
    @Query('status') status?: ListingStatus,
    @Query('channel') channel?: ListingChannel,
    @Query('sellerId') sellerId?: string,
    // Phase 1: 디스플레이 필터
    @Query('deviceId') deviceId?: string,
    @Query('corner') corner?: string,
    @Query('visibility') visibility?: ListingVisibility,
    @Query('deviceType') deviceType?: DeviceType,
    // 정렬
    @Query('sortBy') sortBy?: 'sortOrder' | 'createdAt' | 'updatedAt' | 'sellingPrice',
    @Query('sortDirection') sortDirection?: 'asc' | 'desc'
  ): Promise<SellerListing[]> {
    return await this.listingService.findAll({
      status,
      channel,
      sellerId,
      display: (deviceId || corner || visibility || deviceType)
        ? { deviceId, corner, visibility, deviceType }
        : undefined,
      sortBy,
      sortDirection,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SellerListing> {
    const listing = await this.listingService.findById(id);
    if (!listing) {
      throw new Error('Listing not found');
    }
    return listing;
  }

  @Post()
  async create(@Body() data: Partial<SellerListing>): Promise<SellerListing> {
    return await this.listingService.createListing(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<SellerListing>
  ): Promise<SellerListing> {
    return await this.listingService.updateListing(id, data);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ListingStatus
  ): Promise<SellerListing> {
    return await this.listingService.updateStatus(id, status);
  }

  @Put(':id/price')
  async updatePrice(
    @Param('id') id: string,
    @Body('sellingPrice') sellingPrice: number
  ): Promise<SellerListing> {
    return await this.listingService.updatePrice(id, sellingPrice);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.listingService.deleteListing(id);
  }
}
