/**
 * Sellers Controller
 *
 * API: /api/v1/dropshipping/core/seller
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SellerService } from '../services/SellerService.js';
import { Seller, SellerStatus } from '../entities/Seller.entity.js';

@Controller('api/v1/dropshipping/core/seller')
export class SellersController {
  constructor(private readonly sellerService: SellerService) {}

  @Get()
  async findAll(
    @Query('status') status?: SellerStatus,
    @Query('search') search?: string
  ): Promise<Seller[]> {
    return await this.sellerService.findAll({ status, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Seller> {
    const seller = await this.sellerService.findById(id);
    if (!seller) {
      throw new Error('Seller not found');
    }
    return seller;
  }

  @Post()
  async create(@Body() data: Partial<Seller>): Promise<Seller> {
    return await this.sellerService.createSeller(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<Seller>
  ): Promise<Seller> {
    return await this.sellerService.updateSeller(id, data);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string): Promise<Seller> {
    return await this.sellerService.approveSeller(id);
  }

  @Put(':id/channels')
  async updateChannels(
    @Param('id') id: string,
    @Body() channelConfigs: Record<string, any>
  ): Promise<Seller> {
    return await this.sellerService.updateChannelConfigs(id, channelConfigs);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.sellerService.deleteSeller(id);
  }
}
