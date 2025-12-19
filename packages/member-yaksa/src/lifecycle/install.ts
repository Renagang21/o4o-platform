import type { DataSource } from 'typeorm';

/**
 * Member-Yaksa Install Hook
 *
 * 앱 설치 시 실행
 *
 * Phase 0:
 * - DB 생성 없음 (membership-yaksa 데이터 활용)
 * - Seed 없음
 * - 로그만 출력
 */
export async function install(dataSource: DataSource): Promise<void> {
  console.log('[Member-Yaksa] Installing...');

  // Phase 0: 설치 로그만 출력
  // 실제 테이블 생성은 membership-yaksa가 담당
  // member-yaksa는 해당 데이터를 "읽기/수정(본인만)" 하는 역할

  console.log('[Member-Yaksa] No tables to create (uses membership-yaksa data)');
  console.log('[Member-Yaksa] Install completed');
}
