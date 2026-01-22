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
import type { ListingVisibility, DeviceType } from '@o4o/types';

/**
 * Phase 1: 디스플레이 필터 옵션
 */
export interface ListingDisplayFilterOptions {
  deviceId?: string;
  corner?: string;
  visibility?: ListingVisibility;
  deviceType?: DeviceType;
}

/**
 * Listing 조회 필터 옵션
 */
export interface ListingFilterOptions {
  status?: ListingStatus;
  channel?: ListingChannel;
  sellerId?: string;
  display?: ListingDisplayFilterOptions;
  sortBy?: 'sortOrder' | 'createdAt' | 'updatedAt' | 'sellingPrice';
  sortDirection?: 'asc' | 'desc';
}

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
   *
   * Phase 1: display 필터 지원 추가
   * - deviceId, corner, visibility, deviceType으로 필터링
   * - sortOrder 기반 정렬 지원
   */
  async findAll(filters?: ListingFilterOptions): Promise<SellerListing[]> {
    const query = this.listingRepository.createQueryBuilder('listing');

    // 기존 필터 (하위 호환성 유지)
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

    // Phase 1: display 필터 (JSONB 필드)
    if (filters?.display) {
      const { deviceId, corner, visibility, deviceType } = filters.display;

      if (deviceId) {
        query.andWhere(
          "listing.channelSpecificData->'display'->>'deviceId' = :deviceId",
          { deviceId }
        );
      }

      if (corner) {
        query.andWhere(
          "listing.channelSpecificData->'display'->>'corner' = :corner",
          { corner }
        );
      }

      if (visibility) {
        query.andWhere(
          "listing.channelSpecificData->'display'->>'visibility' = :visibility",
          { visibility }
        );
      }

      if (deviceType) {
        query.andWhere(
          "listing.channelSpecificData->'display'->>'deviceType' = :deviceType",
          { deviceType }
        );
      }
    }

    // hidden 제외 (visibility가 명시적으로 지정되지 않은 경우)
    if (!filters?.display?.visibility) {
      query.andWhere(
        "(listing.channelSpecificData->'display'->>'visibility' IS NULL OR listing.channelSpecificData->'display'->>'visibility' != 'hidden')"
      );
    }

    // 정렬
    if (filters?.sortBy === 'sortOrder') {
      // JSONB 내부 sortOrder로 정렬
      query.orderBy(
        "COALESCE((listing.channelSpecificData->'display'->>'sortOrder')::int, 0)",
        filters.sortDirection === 'desc' ? 'DESC' : 'ASC'
      );
    } else if (filters?.sortBy) {
      query.orderBy(
        `listing.${filters.sortBy}`,
        filters.sortDirection === 'desc' ? 'DESC' : 'ASC'
      );
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
