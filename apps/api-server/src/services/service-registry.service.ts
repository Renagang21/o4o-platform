/**
 * Service Registry Service
 *
 * WO-O4O-SERVICE-REGISTRY-REFORM-V1
 *
 * DB 기반 platform_services 조회 서비스.
 * PlatformService entity를 통해 서비스 카탈로그 접근.
 */

import type { DataSource, Repository } from 'typeorm';
import { PlatformService } from '../entities/PlatformService.js';

export class ServiceRegistryService {
  private repo: Repository<PlatformService>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(PlatformService);
  }

  /**
   * 서비스 코드로 조회
   */
  async getService(code: string): Promise<PlatformService | null> {
    return this.repo.findOne({ where: { code } });
  }

  /**
   * 활성 서비스 목록 조회
   */
  async listActiveServices(): Promise<PlatformService[]> {
    return this.repo.find({
      where: { status: 'active' as const },
      order: { featuredOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * 서비스 활성 여부 확인
   */
  async isActive(code: string): Promise<boolean> {
    const count = await this.repo.count({ where: { code, status: 'active' as const } });
    return count > 0;
  }

  /**
   * 서비스 타입별 조회
   */
  async getServicesByType(serviceType: string): Promise<PlatformService[]> {
    return this.repo.find({
      where: { serviceType: serviceType as any, status: 'active' as const },
      order: { featuredOrder: 'ASC' },
    });
  }

  /**
   * Featured 서비스 목록
   */
  async getFeaturedServices(): Promise<PlatformService[]> {
    return this.repo.find({
      where: { isFeatured: true, status: 'active' as const },
      order: { featuredOrder: 'ASC' },
    });
  }
}

/**
 * Singleton factory
 */
let _instance: ServiceRegistryService | null = null;

export function createServiceRegistry(dataSource: DataSource): ServiceRegistryService {
  if (!_instance) {
    _instance = new ServiceRegistryService(dataSource);
  }
  return _instance;
}
