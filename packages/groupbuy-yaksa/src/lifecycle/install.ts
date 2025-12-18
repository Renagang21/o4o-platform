/**
 * Groupbuy-Yaksa Install Hook
 *
 * 앱 설치 시 실행
 * - 테이블 생성 (TypeORM synchronize 사용)
 */

import type { DataSource } from 'typeorm';
import { GroupbuyEntities } from '../backend/entities/index.js';

export async function install(dataSource: DataSource): Promise<void> {
  console.log('[groupbuy-yaksa] Installing...');

  // 엔티티 등록 확인
  const entityMetadatas = dataSource.entityMetadatas;
  const registeredEntities = GroupbuyEntities.map((e) => e.name);

  console.log(`[groupbuy-yaksa] Entities to register: ${registeredEntities.join(', ')}`);

  // 테이블 존재 여부 확인
  const queryRunner = dataSource.createQueryRunner();
  try {
    const tables = await queryRunner.getTables([
      'groupbuy_campaigns',
      'campaign_products',
      'groupbuy_orders',
      'groupbuy_supplier_profiles',
    ]);

    if (tables.length === 4) {
      console.log('[groupbuy-yaksa] All tables already exist');
    } else {
      console.log(`[groupbuy-yaksa] Found ${tables.length}/4 tables`);
      // TypeORM synchronize가 테이블 생성 처리
    }
  } finally {
    await queryRunner.release();
  }

  console.log('[groupbuy-yaksa] Installation complete');
}
