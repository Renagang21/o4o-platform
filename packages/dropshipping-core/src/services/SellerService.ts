/**
 * SellerService
 *
 * 판매자 등록/승인/연동 채널 관리
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller, SellerStatus } from '../entities/Seller.entity.js';

@Injectable()
export class SellerService {
  constructor(
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>
  ) {}

  /**
   * 판매자 등록
   */
  async createSeller(data: Partial<Seller>): Promise<Seller> {
    const seller = this.sellerRepository.create({
      ...data,
      status: SellerStatus.PENDING,
    });
    return await this.sellerRepository.save(seller);
  }

  /**
   * 판매자 조회
   */
  async findById(id: string): Promise<Seller | null> {
    return await this.sellerRepository.findOne({
      where: { id },
      relations: ['listings'],
    });
  }

  /**
   * 사용자 ID로 판매자 조회
   */
  async findByUserId(userId: string): Promise<Seller | null> {
    return await this.sellerRepository.findOne({
      where: { userId },
    });
  }

  /**
   * 조직 ID로 판매자 조회
   */
  async findByOrganizationId(organizationId: string): Promise<Seller | null> {
    return await this.sellerRepository.findOne({
      where: { organizationId },
    });
  }

  /**
   * 판매자 목록 조회
   */
  async findAll(filters?: {
    status?: SellerStatus;
    search?: string;
  }): Promise<Seller[]> {
    const query = this.sellerRepository.createQueryBuilder('seller');

    if (filters?.status) {
      query.andWhere('seller.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(seller.name ILIKE :search OR seller.contactEmail ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await query.getMany();
  }

  /**
   * 판매자 승인
   */
  async approveSeller(id: string): Promise<Seller> {
    const seller = await this.findById(id);
    if (!seller) {
      throw new Error('Seller not found');
    }

    seller.status = SellerStatus.ACTIVE;
    return await this.sellerRepository.save(seller);
  }

  /**
   * 판매자 채널 설정 업데이트
   */
  async updateChannelConfigs(
    id: string,
    channelConfigs: Record<string, any>
  ): Promise<Seller> {
    const seller = await this.findById(id);
    if (!seller) {
      throw new Error('Seller not found');
    }

    seller.channelConfigs = channelConfigs;
    return await this.sellerRepository.save(seller);
  }

  /**
   * 판매자 업데이트
   */
  async updateSeller(id: string, data: Partial<Seller>): Promise<Seller> {
    const seller = await this.findById(id);
    if (!seller) {
      throw new Error('Seller not found');
    }

    Object.assign(seller, data);
    return await this.sellerRepository.save(seller);
  }

  /**
   * 판매자 삭제
   */
  async deleteSeller(id: string): Promise<void> {
    await this.sellerRepository.delete(id);
  }
}
