/**
 * Profile Controller
 *
 * API: /api/v1/sellerops/profile
 */

import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller, SellerStatus } from '@o4o/dropshipping-core';
import type { SellerProfileDto, UpdateProfileDto } from '../dto/index.js';

@Controller('api/v1/sellerops/profile')
export class ProfileController {
  constructor(
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>
  ) {}

  @Get()
  async getProfile(@Req() req: any): Promise<SellerProfileDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const seller = await this.sellerRepository.findOne({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    return this.toSellerProfileDto(seller);
  }

  @Put()
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto
  ): Promise<SellerProfileDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const seller = await this.sellerRepository.findOne({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    if (dto.name) seller.name = dto.name;
    if (dto.contactEmail) seller.contactEmail = dto.contactEmail;
    if (dto.contactPhone) seller.contactPhone = dto.contactPhone;
    if (dto.channelConfigs) seller.channelConfigs = dto.channelConfigs;

    await this.sellerRepository.save(seller);

    return this.toSellerProfileDto(seller);
  }

  private toSellerProfileDto(seller: Seller): SellerProfileDto {
    // SellerStatus enum을 DTO의 문자열 타입으로 변환
    const statusMap: Record<string, 'pending' | 'active' | 'suspended' | 'banned'> = {
      [SellerStatus.PENDING]: 'pending',
      [SellerStatus.ACTIVE]: 'active',
      [SellerStatus.SUSPENDED]: 'suspended',
      [SellerStatus.INACTIVE]: 'banned', // INACTIVE를 banned로 매핑
    };

    return {
      id: seller.id,
      name: seller.name,
      contactEmail: seller.contactEmail || '',
      contactPhone: seller.contactPhone,
      status: statusMap[seller.status] || 'pending',
      channelConfigs: seller.channelConfigs || {},
      organizationId: seller.organizationId,
      createdAt: seller.createdAt,
      updatedAt: seller.updatedAt,
    };
  }
}
