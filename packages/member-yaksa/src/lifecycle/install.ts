/**
 * member-yaksa Install Lifecycle
 *
 * Phase 1: MemberProfile 엔티티 설치
 * - DB 테이블 생성 (마이그레이션)
 * - 권한 등록
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
  tables?: string[];
  permissions?: string[];
}

/**
 * Install handler
 *
 * Phase 1: MemberProfile 테이블 생성
 */
export async function install(context: InstallContext): Promise<InstallResult> {
  console.log('[member-yaksa] Install started');
  console.log(`[member-yaksa] App ID: ${context.appId}`);
  console.log(`[member-yaksa] Version: ${context.version}`);

  // Phase 1: 테이블 생성
  const tables = ['member_profiles'];
  console.log('[member-yaksa] Tables to create:', tables);

  // 권한 등록
  const permissions = [
    'member.profile.read',
    'member.profile.update',
    'member.profile.admin',
  ];
  console.log('[member-yaksa] Permissions to register:', permissions);

  // Note: 실제 마이그레이션은 TypeORM synchronize 또는 별도 마이그레이션 스크립트로 실행
  // 이 lifecycle은 앱 설치 시 필요한 설정만 수행

  console.log('[member-yaksa] Install completed (Phase 1 - MemberProfile)');

  return {
    success: true,
    message: 'member-yaksa installed successfully (Phase 1)',
    tables,
    permissions,
  };
}

export default install;
