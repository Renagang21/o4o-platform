/**
 * Listings Controller
 *
 * API: /api/v1/sellerops/listings
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ListingStatus, ProductType } from '@o4o/dropshipping-core';
import { ListingOpsService } from '../services/ListingOpsService.js';
import type {
  CreateListingDto,
  UpdateListingDto,
  ListingDetailDto,
} from '../dto/index.js';

@Controller('api/v1/sellerops/listings')
export class ListingsController {
  constructor(private readonly listingOpsService: ListingOpsService) {}

  @Get()
  async getListings(
    @Req() req: any,
    @Query('status') status?: ListingStatus,
    @Query('channel') channel?: string,
    @Query('productType') productType?: ProductType
  ): Promise<ListingDetailDto[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const filters: { status?: ListingStatus; channel?: string; productType?: ProductType } = {};
    if (status !== undefined) {
      filters.status = status;
    }
    if (channel) {
      filters.channel = channel;
    }
    if (productType) {
      filters.productType = productType;
    }

    return await this.listingOpsService.getListings(sellerId, filters);
  }

  @Get(':id')
  async getListing(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<ListingDetailDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const listing = await this.listingOpsService.getListingById(id, sellerId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    return listing;
  }

  @Post()
  async createListing(
    @Req() req: any,
    @Body() dto: CreateListingDto
  ): Promise<ListingDetailDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.listingOpsService.createListing(sellerId, dto);
  }

  @Put(':id')
  async updateListing(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateListingDto
  ): Promise<ListingDetailDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.listingOpsService.updateListing(id, sellerId, dto);
  }

  @Delete(':id')
  async deleteListing(@Param('id') id: string, @Req() req: any): Promise<void> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    await this.listingOpsService.deleteListing(id, sellerId);
  }

  @Post(':id/activate')
  async activateListing(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<ListingDetailDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.listingOpsService.updateListing(id, sellerId, {
      status: ListingStatus.ACTIVE,
    });
  }

  @Post(':id/deactivate')
  async deactivateListing(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<ListingDetailDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.listingOpsService.updateListing(id, sellerId, {
      status: ListingStatus.PAUSED,
    });
  }
}
