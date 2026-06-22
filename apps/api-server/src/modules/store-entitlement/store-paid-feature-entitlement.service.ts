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

  /**
   * WO-O4O-STORE-ENTITLEMENTS-CHECK-ENDSAT-EXPOSURE-V1:
   * /me/check 응답용 — 활성 여부 + 만료일(endsAt)/상태 포함.
   *   active = status==='ACTIVE' && startsAt<=now && endsAt>now && endsAt!=null
   *           (endsAt null 은 V1 정책상 비활성으로 간주)
   *   비활성(행 없음 / 만료 / 미시작 / 취소 / endsAt null) → status/startsAt/endsAt = null.
   * 동일 플랜 다중 행 대비 endsAt DESC 우선(현재 UNIQUE(org,serviceKey,planCode) 로 단일 행).
   */
  async getEntitlementStatus(
    organizationId: string,
    serviceKey: string,
    planCode: StorePaidFeaturePlanCode,
    now: Date = new Date(),
  ): Promise<{ active: boolean; status: 'ACTIVE' | null; startsAt: Date | null; endsAt: Date | null }> {
    const row = await this.repo.findOne({
      where: { organizationId, serviceKey, planCode },
      order: { endsAt: 'DESC' },
    });
    const active =
      !!row && row.endsAt != null && StorePaidFeatureEntitlementService.isActive(row, now);
    if (!active || !row) {
      return { active: false, status: null, startsAt: null, endsAt: null };
    }
    return { active: true, status: 'ACTIVE', startsAt: row.startsAt ?? null, endsAt: row.endsAt ?? null };
  }

  /**
   * WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1:
   * 결제 성공 후처리 — 이용권 ACTIVE 생성/연장(1회 결제형 N일 이용권).
   *   - 현재 ACTIVE & endsAt > now: startsAt 유지, endsAt += durationDays (연장)
   *   - 없거나 만료/취소: startsAt=now, endsAt=now+durationDays, status='ACTIVE' (신규)
   *   - idempotency: 같은 paymentId 가 이미 반영됐으면 재연장하지 않음(applied=false)
   * UNIQUE(organizationId, serviceKey, planCode) — 플랜당 단일 행 upsert.
   */
  async activateOrExtend(params: {
    organizationId: string;
    serviceKey: string;
    planCode: StorePaidFeaturePlanCode;
    durationDays: number;
    paymentId: string;
    now?: Date;
  }): Promise<{ entitlement: StorePaidFeatureEntitlement; applied: boolean }> {
    const { organizationId, serviceKey, planCode, durationDays, paymentId } = params;
    const now = params.now ?? new Date();
    const durationMs = durationDays * 24 * 60 * 60 * 1000;

    const existing = await this.repo.findOne({ where: { organizationId, serviceKey, planCode } });
    const appliedIds: string[] = Array.isArray((existing?.metadata as Record<string, unknown> | undefined)?.appliedPaymentIds)
      ? ((existing!.metadata as Record<string, unknown>).appliedPaymentIds as string[])
      : [];

    // idempotency: 동일 paymentId 가 이미 반영됨 → 중복 연장 금지
    if (existing && appliedIds.includes(paymentId)) {
      return { entitlement: existing, applied: false };
    }

    let startsAt: Date;
    let endsAt: Date;
    if (existing && StorePaidFeatureEntitlementService.isActive(existing, now) && existing.endsAt) {
      startsAt = existing.startsAt ?? now;
      endsAt = new Date(existing.endsAt.getTime() + durationMs);
    } else {
      startsAt = now;
      endsAt = new Date(now.getTime() + durationMs);
    }

    const metadata: Record<string, unknown> = {
      ...((existing?.metadata as Record<string, unknown>) ?? {}),
      appliedPaymentIds: [...appliedIds, paymentId],
      lastPaymentId: paymentId,
    };
    const source = `toss-payment:${paymentId}`;

    if (existing) {
      existing.status = 'ACTIVE';
      existing.startsAt = startsAt;
      existing.endsAt = endsAt;
      existing.source = source;
      existing.metadata = metadata;
      const saved = await this.repo.save(existing);
      return { entitlement: saved, applied: true };
    }

    const created = this.repo.create({
      organizationId,
      serviceKey,
      planCode,
      status: 'ACTIVE',
      startsAt,
      endsAt,
      source,
      metadata,
    });
    const saved = await this.repo.save(created);
    return { entitlement: saved, applied: true };
  }
}
