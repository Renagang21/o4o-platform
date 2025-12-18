/**
 * member-yaksa Install Lifecycle
 *
 * Phase 0: 구조 고정 단계
 * - DB 생성 없음
 * - Seed 없음
 * - 로그 출력만
 */

export interface InstallContext {
  appId: string;
  version: string;
  dataSource?: unknown;
}

export interface InstallResult {
  success: boolean;
  message: string;
  warnings?: string[];
}

/**
 * Install handler
 *
 * Phase 0에서는 실제 설치 작업 없음
 * Phase 1 이후 엔티티 마이그레이션 추가 예정
 */
export async function install(context: InstallContext): Promise<InstallResult> {
  console.log('[member-yaksa] Install started');
  console.log(`[member-yaksa] App ID: ${context.appId}`);
  console.log(`[member-yaksa] Version: ${context.version}`);

  // Phase 0: 구조 확인만
  // - DB 스키마 생성 없음
  // - Seed 데이터 없음

  console.log('[member-yaksa] Install completed (Phase 0 - No DB operations)');

  return {
    success: true,
    message: 'member-yaksa installed successfully (Phase 0)',
    warnings: [
      'Phase 0: No database operations performed',
      'Entity creation will be added in Phase 1',
    ],
  };
}

export default install;
