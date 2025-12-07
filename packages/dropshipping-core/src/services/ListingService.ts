/**
 * ListingService
 *
 * 판매자 Listing 생성/관리
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SellerListing,
  ListingStatus,
  ListingChannel,
} from '../entities/SellerListing.entity.js';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(SellerListing)
    private readonly listingRepository: Repository<SellerListing>
  ) {}

  /**
   * Listing 생성
   */
  async createListing(data: Partial<SellerListing>): Promise<SellerListing> {
    const listing = this.listingRepository.create({
      ...data,
      status: data.status || ListingStatus.DRAFT,
    });
    return await this.listingRepository.save(listing);
  }

  /**
   * Listing 조회
   */
  async findById(id: string): Promise<SellerListing | null> {
    return await this.listingRepository.findOne({
      where: { id },
      relations: ['seller', 'offer', 'offer.productMaster', 'orders'],
    });
  }

  /**
   * 판매자별 Listing 목록
   */
  async findBySeller(sellerId: string): Promise<SellerListing[]> {
    return await this.listingRepository.find({
      where: { sellerId },
      relations: ['offer', 'offer.productMaster'],
    });
  }

  /**
   * 외부 Listing ID로 조회
   */
  async findByExternalListingId(
    externalListingId: string
  ): Promise<SellerListing | null> {
    return await this.listingRepository.findOne({
      where: { externalListingId },
      relations: ['seller', 'offer'],
    });
  }

  /**
   * Listing 목록 조회
   */
  async findAll(filters?: {
    status?: ListingStatus;
    channel?: ListingChannel;
    sellerId?: string;
  }): Promise<SellerListing[]> {
    const query = this.listingRepository.createQueryBuilder('listing');

    if (filters?.status) {
      query.andWhere('listing.status = :status', { status: filters.status });
    }

    if (filters?.channel) {
      query.andWhere('listing.channel = :channel', { channel: filters.channel });
    }

    if (filters?.sellerId) {
      query.andWhere('listing.sellerId = :sellerId', {
        sellerId: filters.sellerId,
      });
    }

    return await query
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.offer', 'offer')
      .leftJoinAndSelect('offer.productMaster', 'productMaster')
      .getMany();
  }

  /**
   * Listing 상태 변경
   */
  async updateStatus(id: string, status: ListingStatus): Promise<SellerListing> {
    const listing = await this.findById(id);
    if (!listing) {
      throw new Error('Listing not found');
    }

    listing.status = status;
    return await this.listingRepository.save(listing);
  }

  /**
   * Listing 가격 업데이트
   */
  async updatePrice(id: string, sellingPrice: number): Promise<SellerListing> {
    const listing = await this.findById(id);
    if (!listing) {
      throw new Error('Listing not found');
    }

    listing.sellingPrice = sellingPrice;
    return await this.listingRepository.save(listing);
  }

  /**
   * Listing 업데이트
   */
  async updateListing(
    id: string,
    data: Partial<SellerListing>
  ): Promise<SellerListing> {
    const listing = await this.findById(id);
    if (!listing) {
      throw new Error('Listing not found');
    }

    Object.assign(listing, data);
    return await this.listingRepository.save(listing);
  }

  /**
   * Listing 삭제
   */
  async deleteListing(id: string): Promise<void> {
    await this.listingRepository.delete(id);
  }
}
