/**
 * Conversion Service
 *
 * 파트너 전환(구매) 추적 서비스 (Partner-Core 기반)
 *
 * @package @o4o/partnerops
 */

import type { Repository } from 'typeorm';
import {
  Partner,
  PartnerClick,
  PartnerLink,
  PartnerConversion,
  PartnerConversionService,
  ConversionStatus,
  executeValidatePartnerVisibility,
} from '@o4o/partner-core';
import type { ConversionListItemDto, ConversionQueryDto } from '../dto/index.js';

export interface ConversionSummary {
  totalConversions: number;
  confirmedConversions: number;
  pendingConversions: number;
  cancelledConversions: number;
  totalAmount: number;
  totalCommission: number;
  conversionRate: number;
}

export interface ConversionFunnel {
  impressions: number;
  clicks: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
}

export class ConversionService {
  private partnerConversionService: PartnerConversionService;

  constructor(
    private readonly conversionRepository: Repository<PartnerConversion>,
    private readonly clickRepository: Repository<PartnerClick>,
    private readonly linkRepository: Repository<PartnerLink>,
    private readonly partnerRepository: Repository<Partner>
  ) {
    this.partnerConversionService = new PartnerConversionService(
      conversionRepository,
      clickRepository,
      linkRepository,
      partnerRepository
    );
  }

  /**
   * 전환 목록 조회 (Partner-Core 기반)
   */
  async list(
    partnerId: string,
    filters?: ConversionQueryDto
  ): Promise<ConversionListItemDto[]> {
    const result = await this.partnerConversionService.findAll({
      partnerId,
      status: filters?.status as ConversionStatus | undefined,
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      page: filters?.page,
      limit: filters?.limit,
    });

    // pharmaceutical 필터링 및 DTO 변환
    const filteredItems: ConversionListItemDto[] = [];
    for (const item of result.items) {
      const visibility = await executeValidatePartnerVisibility({
        partnerId,
        productType: item.productType,
      });

      if (visibility.visible) {
        filteredItems.push(this.toConversionDto(item));
      }
    }

    return filteredItems;
  }

  /**
   * 전환 요약 조회 (Partner-Core 기반)
   */
  async getSummary(partnerId: string): Promise<ConversionSummary> {
    const stats = await this.partnerConversionService.getStatsByPartnerId(partnerId);

    return {
      totalConversions: stats.totalConversions,
      confirmedConversions: stats.confirmedConversions,
      pendingConversions: stats.totalConversions - stats.confirmedConversions - stats.cancelledConversions,
      cancelledConversions: stats.cancelledConversions,
      totalAmount: stats.totalOrderAmount,
      totalCommission: stats.totalCommissionAmount,
      conversionRate:
        stats.totalConversions > 0
          ? (stats.confirmedConversions / stats.totalConversions) * 100
          : 0,
    };
  }

  /**
   * 퍼널 분석 조회 (간소화)
   */
  async getFunnel(partnerId: string, startDate?: Date, endDate?: Date): Promise<ConversionFunnel> {
    const stats = await this.partnerConversionService.getStatsByPartnerId(
      partnerId,
      startDate,
      endDate
    );

    return {
      impressions: 0, // 노출수는 별도 추적 필요
      clicks: 0, // ClickService에서 조회 필요
      addToCarts: 0,
      checkouts: 0,
      purchases: stats.confirmedConversions,
    };
  }

  /**
   * 전환 상세 조회
   */
  async getById(partnerId: string, id: string): Promise<ConversionListItemDto | null> {
    const conversion = await this.partnerConversionService.findById(id);
    if (!conversion || conversion.partnerId !== partnerId) return null;
    return this.toConversionDto(conversion);
  }

  /**
   * Conversion → DTO 변환
   */
  private toConversionDto(conversion: PartnerConversion): ConversionListItemDto {
    return {
      id: conversion.id,
      partnerId: conversion.partnerId,
      orderId: conversion.orderId,
      orderNumber: conversion.orderNumber,
      productType: conversion.productType,
      orderAmount: Number(conversion.orderAmount),
      commissionAmount: Number(conversion.commissionAmount),
      status: conversion.status,
      attributionDays: conversion.attributionDays,
      createdAt: conversion.createdAt,
      confirmedAt: conversion.confirmedAt,
    };
  }
}

// Factory function
export function createConversionService(
  conversionRepository: Repository<PartnerConversion>,
  clickRepository: Repository<PartnerClick>,
  linkRepository: Repository<PartnerLink>,
  partnerRepository: Repository<Partner>
): ConversionService {
  return new ConversionService(
    conversionRepository,
    clickRepository,
    linkRepository,
    partnerRepository
  );
}
