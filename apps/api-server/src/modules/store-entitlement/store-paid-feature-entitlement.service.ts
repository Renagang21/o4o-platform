/**
 * StorePaidFeatureEntitlementService
 * WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1
 *
 * 매장(조직)별 유료 기능 이용권 조회 + 활성 판정.
 * V1 은 read/판정 중심 — 발급/연장(write)은 후속 결제 WO 에서 추가.
 */
import type { DataSource, Repository } from 'typeorm';
import {
  StorePaidFeatureEntitlement,
  type StorePaidFeaturePlanCode,
} from './store-paid-feature-entitlement.entity.js';

export class StorePaidFeatureEntitlementService {
  private repo: Repository<StorePaidFeatureEntitlement>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(StorePaidFeatureEntitlement);
  }

  /**
   * 이용권 단건의 현재 활성 여부.
   * 활성 = status === 'ACTIVE' 이고, now 가 [startsAt, endsAt) 구간 안 (null 경계는 열린 것으로 간주).
   */
  static isActive(entitlement: StorePaidFeatureEntitlement, now: Date = new Date()): boolean {
    if (entitlement.status !== 'ACTIVE') return false;
    if (entitlement.startsAt && entitlement.startsAt.getTime() > now.getTime()) return false;
    if (entitlement.endsAt && entitlement.endsAt.getTime() <= now.getTime()) return false;
    return true;
  }

  /** 조직(+서비스)의 모든 이용권 행 조회. serviceKey 미지정 시 전체 서비스. */
  async listEntitlements(
    organizationId: string,
    serviceKey?: string,
  ): Promise<StorePaidFeatureEntitlement[]> {
    const where = serviceKey ? { organizationId, serviceKey } : { organizationId };
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  /** 조직(+서비스)의 현재 활성 이용권만 조회. */
  async getActiveEntitlements(
    organizationId: string,
    serviceKey: string,
    now: Date = new Date(),
  ): Promise<StorePaidFeatureEntitlement[]> {
    const rows = await this.repo.find({ where: { organizationId, serviceKey } });
    return rows.filter((row) => StorePaidFeatureEntitlementService.isActive(row, now));
  }

  /** 특정 플랜의 활성 이용권 보유 여부 (메뉴 게이트 판정용). */
  async hasActiveEntitlement(
    organizationId: string,
    serviceKey: string,
    planCode: StorePaidFeaturePlanCode,
    now: Date = new Date(),
  ): Promise<boolean> {
    const row = await this.repo.findOne({
      where: { organizationId, serviceKey, planCode },
    });
    return row ? StorePaidFeatureEntitlementService.isActive(row, now) : false;
  }
}
