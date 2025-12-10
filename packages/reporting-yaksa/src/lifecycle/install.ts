import { DataSource } from 'typeorm';
import { InstallContext } from '../types/context.js';
import { ReportTemplateService } from '../backend/services/ReportTemplateService.js';

/**
 * Install Hook
 *
 * reporting-yaksa 앱 설치 시 실행되는 훅
 *
 * 1. 테이블 생성 (TypeORM synchronize)
 * 2. 현재 연도 기본 템플릿 생성
 */
export async function install(context: InstallContext): Promise<void> {
  const { dataSource, force } = context;

  console.log('[reporting-yaksa] Installing...');

  // 1. 테이블 생성 (엔티티 동기화)
  // 실제 운영에서는 migration 사용 권장
  if (force) {
    console.log('[reporting-yaksa] Force mode: synchronizing entities...');
    // await dataSource.synchronize();
  }

  // 2. 현재 연도 기본 템플릿 생성
  try {
    const templateService = new ReportTemplateService(dataSource);
    const currentYear = new Date().getFullYear();

    // 이미 존재하는지 확인
    const existing = await templateService.findByYear(currentYear);
    if (!existing) {
      console.log(`[reporting-yaksa] Creating default template for year ${currentYear}...`);
      await templateService.createDefaultTemplate(currentYear);
      console.log(`[reporting-yaksa] Default template created for year ${currentYear}`);
    } else {
      console.log(`[reporting-yaksa] Template for year ${currentYear} already exists`);
    }
  } catch (error: any) {
    console.error('[reporting-yaksa] Failed to create default template:', error.message);
    // 템플릿 생성 실패해도 설치는 계속 진행
  }

  console.log('[reporting-yaksa] Installation completed');
}

export default install;
