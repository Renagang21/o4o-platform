import type { DataSource } from 'typeorm';

/**
 * Member-Yaksa Uninstall Hook
 *
 * 앱 제거 시 실행
 *
 * Phase 0:
 * - DB 삭제 없음 (membership-yaksa 데이터 소유)
 * - 이 앱은 데이터를 소유하지 않으므로 삭제할 것이 없음
 * - 로그만 출력
 *
 * @param _dataSource TypeORM DataSource (미사용)
 */
export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[Member-Yaksa] Uninstalling...');

  // Phase 0: 삭제 로그만 출력
  // member-yaksa는 자체 테이블이 없음
  // membership-yaksa 데이터를 읽기/수정(본인만)하는 역할이므로
  // 데이터 삭제가 불필요

  console.log('[Member-Yaksa] No tables to drop (uses membership-yaksa data)');
  console.log('[Member-Yaksa] Uninstall completed');
}

export default uninstall;
