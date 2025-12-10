/**
 * ListingOpsService
 *
 * 리스팅 등록/관리 서비스
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SellerListing,
  SupplierProductOffer,
  ListingService,
  ListingStatus,
  ListingChannel,
} from '@o4o/dropshipping-core';
import type {
  CreateListingDto,
  UpdateListingDto,
  ListingDetailDto,
} from '../dto/index.js';

@Injectable()
export class ListingOpsService {
  constructor(
    @InjectRepository(SellerListing)
    private readonly listingRepository: Repository<SellerListing>,
    @InjectRepository(SupplierProductOffer)
    private readonly offerRepository: Repository<SupplierProductOffer>,
    private readonly listingService: ListingService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 판매자의 리스팅 목록 조회
   */
  async getListings(
    sellerId: string,
    filters?: { status?: ListingStatus; channel?: string }
  ): Promise<ListingDetailDto[]> {
    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.offer', 'offer')
      .leftJoinAndSelect('offer.productMaster', 'product')
      .where('listing.sellerId = :sellerId', { sellerId });

    if (filters?.status !== undefined) {
      query.andWhere('listing.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.channel) {
      query.andWhere('listing.channel = :channel', { channel: filters.channel });
    }

    const listings = await query.getMany();

    return listings.map((listing) => this.toListingDetailDto(listing));
  }

  /**
   * 리스팅 상세 조회
   */
  async getListingById(
    listingId: string,
    sellerId: string
  ): Promise<ListingDetailDto | null> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, sellerId },
      relations: ['offer', 'offer.productMaster'],
    });

    if (!listing) return null;

    return this.toListingDetailDto(listing);
  }

  /**
   * 새 리스팅 생성
   */
  async createListing(
    sellerId: string,
    dto: CreateListingDto
  ): Promise<ListingDetailDto> {
    // Offer 확인
    const offer = await this.offerRepository.findOne({
      where: { id: dto.offerId },
      relations: ['productMaster'],
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    // channel 문자열을 ListingChannel enum으로 변환
    const channelMap: Record<string, ListingChannel> = {
      smartstore: ListingChannel.SMARTSTORE,
      coupang: ListingChannel.COUPANG,
      custom: ListingChannel.CUSTOM,
    };
    const channel = channelMap[dto.channel] || ListingChannel.CUSTOM;

    // Core의 ListingService를 통해 생성
    const listing = await this.listingService.createListing({
      sellerId,
      offerId: dto.offerId,
      sellingPrice: dto.sellingPrice,
      channel,
      title: offer.productMaster?.name || 'Untitled',
      status: dto.status ?? ListingStatus.DRAFT,
    });

    // SellerOps 이벤트 발행
    this.eventEmitter.emit('sellerops.listing.created', {
      listingId: listing.id,
      sellerId,
      offerId: dto.offerId,
    });

    const fullListing = await this.listingRepository.findOne({
      where: { id: listing.id },
      relations: ['offer', 'offer.productMaster'],
    });

    return this.toListingDetailDto(fullListing!);
  }

  /**
   * 리스팅 업데이트
   */
  async updateListing(
    listingId: string,
    sellerId: string,
    dto: UpdateListingDto
  ): Promise<ListingDetailDto> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, sellerId },
      relations: ['offer', 'offer.productMaster'],
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (dto.sellingPrice !== undefined) {
      listing.sellingPrice = dto.sellingPrice;
    }

    if (dto.status !== undefined) {
      listing.status = dto.status;

      if (dto.status === ListingStatus.ACTIVE) {
        this.eventEmitter.emit('sellerops.listing.activated', {
          listingId: listing.id,
          sellerId,
        });
      }
    }

    await this.listingRepository.save(listing);

    return this.toListingDetailDto(listing);
  }

  /**
   * 리스팅 삭제
   */
  async deleteListing(listingId: string, sellerId: string): Promise<void> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, sellerId },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    await this.listingRepository.remove(listing);
  }

  /**
   * ListingDetailDto로 변환
   */
  private toListingDetailDto(listing: SellerListing): ListingDetailDto {
    const offer = listing.offer;
    const supplierPrice = offer?.supplierPrice || 0;
    const sellingPrice = listing.sellingPrice;
    const margin = sellingPrice - supplierPrice;
    const marginRate = supplierPrice > 0 ? (margin / supplierPrice) * 100 : 0;

    return {
      id: listing.id,
      offer: {
        id: offer?.id || '',
        productMaster: {
          id: offer?.productMaster?.id || '',
          name: offer?.productMaster?.name || '',
          sku: offer?.productMaster?.sku || '',
        },
        supplierPrice,
        stockQuantity: offer?.stockQuantity || 0,
      },
      sellingPrice,
      margin,
      marginRate: Math.round(marginRate * 100) / 100,
      channel: listing.channel,
      status: listing.status,
      createdAt: listing.createdAt,
    };
  }
}
