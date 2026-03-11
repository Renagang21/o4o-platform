/**
 * StoreCapabilityService
 * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
 *
 * 매장(Store) 단위 기능 활성화/비활성화 관리
 */

import type { DataSource, Repository } from 'typeorm';
import { StoreCapability } from '../entities/store-capability.entity.js';
import {
  DEFAULT_CAPABILITIES,
  StoreCapability as Cap,
  type StoreCapabilityKey,
  type CapabilitySource,
} from '../constants/store-capabilities.js';

export class StoreCapabilityService {
  private repo: Repository<StoreCapability>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(StoreCapability);
  }

  /**
   * 매장의 전체 Capability 목록 조회
   */
  async getCapabilities(organizationId: string): Promise<StoreCapability[]> {
    return this.repo.find({
      where: { organization_id: organizationId },
      order: { capability_key: 'ASC' },
    });
  }

  /**
   * 특정 Capability 활성 여부 확인
   * 레코드가 없으면 false 반환
   */
  async isEnabled(organizationId: string, capability: StoreCapabilityKey): Promise<boolean> {
    const row = await this.repo.findOne({
      where: { organization_id: organizationId, capability_key: capability },
    });
    return row?.enabled ?? false;
  }

  /**
   * 매장 생성 시 기본 Capability 초기화
   */
  async initDefaults(organizationId: string): Promise<StoreCapability[]> {
    const allKeys = Object.values(Cap);
    const entities = allKeys.map((key) => {
      return this.repo.create({
        organization_id: organizationId,
        capability_key: key,
        enabled: DEFAULT_CAPABILITIES.includes(key),
        source: 'system' as CapabilitySource,
      });
    });
    return this.repo.save(entities);
  }

  /**
   * Capability 활성/비활성 토글 (관리자)
   */
  async setCapability(
    organizationId: string,
    capabilityKey: StoreCapabilityKey,
    enabled: boolean,
    source: CapabilitySource = 'admin',
  ): Promise<StoreCapability> {
    let row = await this.repo.findOne({
      where: { organization_id: organizationId, capability_key: capabilityKey },
    });

    if (row) {
      row.enabled = enabled;
      row.source = source;
      return this.repo.save(row);
    }

    row = this.repo.create({
      organization_id: organizationId,
      capability_key: capabilityKey,
      enabled,
      source,
    });
    return this.repo.save(row);
  }

  /**
   * 여러 Capability를 한 번에 업데이트 (관리자 벌크 설정)
   */
  async bulkUpdate(
    organizationId: string,
    updates: { key: StoreCapabilityKey; enabled: boolean }[],
    source: CapabilitySource = 'admin',
  ): Promise<StoreCapability[]> {
    const results: StoreCapability[] = [];
    for (const u of updates) {
      const row = await this.setCapability(organizationId, u.key, u.enabled, source);
      results.push(row);
    }
    return results;
  }
}
