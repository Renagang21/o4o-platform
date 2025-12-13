/**
 * PartnerConversionService
 *
 * 전환 기록, 클릭→전환 매핑, 귀속 기간 계산
 *
 * @package @o4o/partner-core
 */

import { Repository, LessThan, MoreThan } from 'typeorm';
import {
  PartnerConversion,
  ConversionStatus,
  ConversionSource,
} from '../entities/PartnerConversion.entity.js';
import { PartnerClick } from '../entities/PartnerClick.entity.js';
import { PartnerLink } from '../entities/PartnerLink.entity.js';
import { Partner } from '../entities/Partner.entity.js';

export interface CreateConversionDto {
  partnerId: string;
  clickId?: string;
  orderId: string;
  orderNumber?: string;
  productType?: string;
  orderAmount: number;
  conversionSource?: ConversionSource;
  pharmacyId?: string;
  metadata?: Record<string, any>;
}

export interface ConversionFilter {
  partnerId?: string;
  clickId?: string;
  orderId?: string;
  productType?: string;
  status?: ConversionStatus;
  conversionSource?: ConversionSource;
  pharmacyId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// 기본 귀속 기간 (일)
const DEFAULT_ATTRIBUTION_DAYS = 30;

export class PartnerConversionService {
  constructor(
    private conversionRepository: Repository<PartnerConversion>,
    private clickRepository: Repository<PartnerClick>,
    private linkRepository: Repository<PartnerLink>,
    private partnerRepository: Repository<Partner>
  ) {}

  /**
   * 전환 기록 (order.created 이벤트 처리)
   */
  async createConversion(data: CreateConversionDto): Promise<PartnerConversion> {
    let click: PartnerClick | null = null;
    let attributionDays: number | undefined;

    // 클릭 ID가 있으면 클릭 조회
    if (data.clickId) {
      click = await this.clickRepository.findOne({
        where: { id: data.clickId },
      });

      if (click) {
        // 귀속 기간 계산
        const clickDate = new Date(click.createdAt);
        const now = new Date();
        attributionDays = Math.floor(
          (now.getTime() - clickDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    // 전환 생성
    const conversion = this.conversionRepository.create({
      partnerId: data.partnerId,
      clickId: data.clickId,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      productType: data.productType || click?.productType,
      orderAmount: data.orderAmount,
      commissionAmount: 0, // 커미션은 별도로 계산됨
      status: ConversionStatus.PENDING,
      conversionSource: data.conversionSource || ConversionSource.PARTNER,
      pharmacyId: data.pharmacyId,
      attributionDays,
      metadata: data.metadata,
    });

    const savedConversion = await this.conversionRepository.save(conversion);

    // 클릭을 전환됨으로 표시
    if (click) {
      click.converted = true;
      click.conversionId = savedConversion.id;
      await this.clickRepository.save(click);

      // 링크 전환 카운트 증가
      if (click.linkId) {
        await this.linkRepository.increment(
          { id: click.linkId },
          'conversionCount',
          1
        );
      }
    }

    // 파트너 전환 카운트 증가
    await this.partnerRepository.increment(
      { id: data.partnerId },
      'conversionCount',
      1
    );

    return savedConversion;
  }

  /**
   * 세션 기반 전환 찾기 및 생성
   * (order.created 이벤트에서 sessionId로 클릭 연결)
   */
  async createConversionBySession(
    sessionId: string,
    orderId: string,
    orderNumber: string,
    orderAmount: number,
    productType?: string,
    metadata?: Record<string, any>
  ): Promise<PartnerConversion | null> {
    // 세션에서 클릭 찾기 (귀속 기간 내)
    const attributionDate = new Date();
    attributionDate.setDate(attributionDate.getDate() - DEFAULT_ATTRIBUTION_DAYS);

    const click = await this.clickRepository.findOne({
      where: {
        sessionId,
        createdAt: MoreThan(attributionDate),
        converted: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!click) {
      return null;
    }

    return this.createConversion({
      partnerId: click.partnerId,
      clickId: click.id,
      orderId,
      orderNumber,
      productType: productType || click.productType,
      orderAmount,
      metadata,
    });
  }

  /**
   * 전환 조회 (ID)
   */
  async findById(id: string): Promise<PartnerConversion | null> {
    return this.conversionRepository.findOne({
      where: { id },
      relations: ['partner', 'click', 'commission'],
    });
  }

  /**
   * 주문 ID로 전환 조회
   */
  async findByOrderId(orderId: string): Promise<PartnerConversion | null> {
    return this.conversionRepository.findOne({
      where: { orderId },
      relations: ['partner', 'click', 'commission'],
    });
  }

  /**
   * 전환 목록 조회
   */
  async findAll(filter: ConversionFilter = {}): Promise<{
    items: PartnerConversion[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, startDate, endDate, ...where } = filter;

    const qb = this.conversionRepository.createQueryBuilder('conversion');

    if (where.partnerId) {
      qb.andWhere('conversion.partnerId = :partnerId', {
        partnerId: where.partnerId,
      });
    }

    if (where.clickId) {
      qb.andWhere('conversion.clickId = :clickId', { clickId: where.clickId });
    }

    if (where.orderId) {
      qb.andWhere('conversion.orderId = :orderId', { orderId: where.orderId });
    }

    if (where.productType) {
      qb.andWhere('conversion.productType = :productType', {
        productType: where.productType,
      });
    }

    if (where.status) {
      qb.andWhere('conversion.status = :status', { status: where.status });
    }

    if (where.conversionSource) {
      qb.andWhere('conversion.conversionSource = :conversionSource', {
        conversionSource: where.conversionSource,
      });
    }

    if (where.pharmacyId) {
      qb.andWhere('conversion.pharmacyId = :pharmacyId', {
        pharmacyId: where.pharmacyId,
      });
    }

    if (startDate) {
      qb.andWhere('conversion.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('conversion.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('conversion.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 전환 확정 (주문 완료 시)
   */
  async confirmConversion(id: string): Promise<PartnerConversion | null> {
    const conversion = await this.findById(id);
    if (!conversion) return null;

    if (conversion.status !== ConversionStatus.PENDING) {
      return conversion;
    }

    conversion.status = ConversionStatus.CONFIRMED;
    conversion.confirmedAt = new Date();

    return this.conversionRepository.save(conversion);
  }

  /**
   * 전환 취소
   */
  async cancelConversion(
    id: string,
    reason?: string
  ): Promise<PartnerConversion | null> {
    const conversion = await this.findById(id);
    if (!conversion) return null;

    conversion.status = ConversionStatus.CANCELLED;
    conversion.cancellationReason = reason;

    // 파트너 전환 카운트 감소
    await this.partnerRepository.decrement(
      { id: conversion.partnerId },
      'conversionCount',
      1
    );

    return this.conversionRepository.save(conversion);
  }

  /**
   * 전환 환불 처리
   */
  async refundConversion(
    id: string,
    reason?: string
  ): Promise<PartnerConversion | null> {
    const conversion = await this.findById(id);
    if (!conversion) return null;

    conversion.status = ConversionStatus.REFUNDED;
    conversion.cancellationReason = reason;

    // 파트너 전환 카운트 감소
    await this.partnerRepository.decrement(
      { id: conversion.partnerId },
      'conversionCount',
      1
    );

    return this.conversionRepository.save(conversion);
  }

  /**
   * 커미션 금액 업데이트
   */
  async updateCommissionAmount(
    id: string,
    commissionAmount: number
  ): Promise<PartnerConversion | null> {
    const conversion = await this.findById(id);
    if (!conversion) return null;

    conversion.commissionAmount = commissionAmount;
    return this.conversionRepository.save(conversion);
  }

  /**
   * 파트너별 전환 통계
   */
  async getStatsByPartnerId(
    partnerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalConversions: number;
    confirmedConversions: number;
    cancelledConversions: number;
    totalOrderAmount: number;
    totalCommissionAmount: number;
    averageOrderAmount: number;
    byProductType: Record<string, { count: number; amount: number }>;
  }> {
    const qb = this.conversionRepository.createQueryBuilder('conversion');
    qb.where('conversion.partnerId = :partnerId', { partnerId });

    if (startDate) {
      qb.andWhere('conversion.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('conversion.createdAt <= :endDate', { endDate });
    }

    const totalConversions = await qb.getCount();

    const confirmedConversions = await qb
      .clone()
      .andWhere('conversion.status = :status', {
        status: ConversionStatus.CONFIRMED,
      })
      .getCount();

    const cancelledConversions = await qb
      .clone()
      .andWhere('conversion.status IN (:...statuses)', {
        statuses: [ConversionStatus.CANCELLED, ConversionStatus.REFUNDED],
      })
      .getCount();

    // 금액 합계
    const sumResult = await qb
      .clone()
      .andWhere('conversion.status = :status', {
        status: ConversionStatus.CONFIRMED,
      })
      .select('SUM(conversion.orderAmount)', 'totalOrderAmount')
      .addSelect('SUM(conversion.commissionAmount)', 'totalCommissionAmount')
      .getRawOne();

    const totalOrderAmount = parseFloat(sumResult?.totalOrderAmount || '0');
    const totalCommissionAmount = parseFloat(
      sumResult?.totalCommissionAmount || '0'
    );
    const averageOrderAmount =
      confirmedConversions > 0 ? totalOrderAmount / confirmedConversions : 0;

    // 제품 타입별 통계
    const productTypeStats = await this.conversionRepository
      .createQueryBuilder('conversion')
      .select('conversion.productType', 'productType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(conversion.orderAmount)', 'amount')
      .where('conversion.partnerId = :partnerId', { partnerId })
      .andWhere('conversion.productType IS NOT NULL')
      .andWhere('conversion.status = :status', {
        status: ConversionStatus.CONFIRMED,
      })
      .groupBy('conversion.productType')
      .getRawMany();

    const byProductType: Record<string, { count: number; amount: number }> = {};
    productTypeStats.forEach((row) => {
      byProductType[row.productType] = {
        count: parseInt(row.count, 10),
        amount: parseFloat(row.amount),
      };
    });

    return {
      totalConversions,
      confirmedConversions,
      cancelledConversions,
      totalOrderAmount,
      totalCommissionAmount,
      averageOrderAmount: Math.round(averageOrderAmount),
      byProductType,
    };
  }

  /**
   * 귀속 기간 만료 전환 처리
   * (일정 기간 내 확정되지 않은 전환 자동 취소)
   */
  async expirePendingConversions(expirationDays: number = 60): Promise<number> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - expirationDays);

    const result = await this.conversionRepository
      .createQueryBuilder()
      .update(PartnerConversion)
      .set({
        status: ConversionStatus.CANCELLED,
        cancellationReason: 'Expired - not confirmed within attribution period',
      })
      .where('status = :status', { status: ConversionStatus.PENDING })
      .andWhere('createdAt < :expirationDate', { expirationDate })
      .execute();

    return result.affected || 0;
  }
}
