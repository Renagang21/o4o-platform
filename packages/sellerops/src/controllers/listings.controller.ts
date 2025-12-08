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
    @Query('isActive') isActive?: string,
    @Query('channel') channel?: string
  ): Promise<ListingDetailDto[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const filters: any = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    if (channel) {
      filters.channel = channel;
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
      isActive: true,
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
      isActive: false,
    });
  }
}
