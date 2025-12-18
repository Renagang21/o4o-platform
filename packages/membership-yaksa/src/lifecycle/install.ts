import { DataSource } from 'typeorm';
import { MemberCategory } from '../backend/entities/MemberCategory.js';

/**
 * Membership-Yaksa Install Hook
 *
 * Phase R1 변경:
 * - synchronize() 호출 제거 (위험 작업)
 * - install()은 "앱이 존재할 수 있는 상태"만 보장
 * - DB 스키마 변경은 migration을 통해서만 수행
 *
 * 설치 시 수행:
 * - 기본 회원 분류 생성 (데이터 seed)
 */
export async function install(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Installing...');

  // Phase R1: synchronize 제거
  // DB 스키마는 migration을 통해 관리됨
  // install()은 앱이 작동하기 위한 기본 데이터만 생성
  console.log('[Membership-Yaksa] Phase R1: synchronize removed, using migrations for schema');

  try {
    // 기본 회원 분류 생성 (데이터 seed)
    await seedDefaultCategories(dataSource);
    console.log('[Membership-Yaksa] Installation completed');
  } catch (error) {
    // 테이블이 없으면 migration이 먼저 실행되어야 함
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.error('[Membership-Yaksa] Tables not found. Please run migrations first.');
      console.error('[Membership-Yaksa] Migration path: packages/membership-yaksa/src/migrations/');
      throw new Error('Membership-Yaksa requires migration before install');
    }
    throw error;
  }
}

/**
 * 기본 회원 분류 데이터 seed
 */
async function seedDefaultCategories(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Seeding default categories...');

  const categoryRepo = dataSource.getRepository(MemberCategory);

  // 기본 회원 분류 정의
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
}
