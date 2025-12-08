import { DataSource } from 'typeorm';
import { MemberCategory } from '../backend/entities/MemberCategory.js';
import * as Entities from '../backend/entities/index.js';

/**
 * Membership-Yaksa Install Hook
 *
 * 앱 설치 시 실행되는 초기화 작업
 * - 테이블 생성 (synchronize)
 * - 기본 회원 분류 생성
 */
export async function install(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Installing...');

  // Step 1: Create tables using synchronize
  // Note: This is a temporary solution. Proper migrations should be created.
  // See: docs/reference/guidelines/SCHEMA_DRIFT_PREVENTION_GUIDE.md
  console.log('[Membership-Yaksa] Creating tables...');

  const entities = Object.values(Entities);
  await dataSource.synchronize(false); // false = don't drop existing tables

  console.log('[Membership-Yaksa] Tables created successfully');

  // Step 2: Create default categories
  const categoryRepo = dataSource.getRepository(MemberCategory);

  // 기본 회원 분류 생성
  const defaultCategories = [
    {
      name: '정회원',
      description: '정규 면허 소지 및 활동 중인 약사',
      requiresAnnualFee: true,
      annualFeeAmount: 50000,
      sortOrder: 1,
    },
    {
      name: '준회원',
      description: '면허 소지 약사 (비활동)',
      requiresAnnualFee: true,
      annualFeeAmount: 30000,
      sortOrder: 2,
    },
    {
      name: '휴업약사',
      description: '휴업 중인 약사',
      requiresAnnualFee: false,
      sortOrder: 3,
    },
    {
      name: '명예회원',
      description: '명예 회원',
      requiresAnnualFee: false,
      sortOrder: 4,
    },
  ];

  for (const categoryData of defaultCategories) {
    const existing = await categoryRepo.findOne({
      where: { name: categoryData.name },
    });

    if (!existing) {
      const category = categoryRepo.create(categoryData);
      await categoryRepo.save(category);
      console.log(`[Membership-Yaksa] Created category: ${categoryData.name}`);
    }
  }

  console.log('[Membership-Yaksa] Installation completed');
}
