/**
 * Listings Controller
 *
 * API: /api/v1/dropshipping/core/listings
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ListingService } from '../services/ListingService.js';
import { SellerListing, ListingStatus, ListingChannel } from '../entities/SellerListing.entity.js';

@Controller('api/v1/dropshipping/core/listings')
export class ListingsController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  async findAll(
    @Query('status') status?: ListingStatus,
    @Query('channel') channel?: ListingChannel,
    @Query('sellerId') sellerId?: string
  ): Promise<SellerListing[]> {
    return await this.listingService.findAll({ status, channel, sellerId });
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
