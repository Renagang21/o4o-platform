import type { DataSource } from 'typeorm';

/**
 * Member-Yaksa Activate Hook
 *
 * 앱 활성화 시 실행
 *
 * Phase 0:
 * - AppRegistry 등록
 * - 기본 라우트 활성화
 * - 권한 스코프 선언 (member 전용)
 */
export async function activate(dataSource: DataSource): Promise<void> {
  console.log('[Member-Yaksa] Activating...');

  // Phase 0: 활성화 로그
  console.log('[Member-Yaksa] Target users: pharmacist, pharmacy_member');
  console.log('[Member-Yaksa] Permission scope: self (본인 데이터만)');

  // Phase 0: 라우트 스켈레톤 활성화
  console.log('[Member-Yaksa] Routes activated:');
  console.log('  - /member/home');
  console.log('  - /member/profile');
  console.log('  - /member/pharmacy');

  // Phase 0: 홈 UX 우선순위 확인
  console.log('[Member-Yaksa] Home UX Priority:');
  console.log('  1) Organization Notice');
  console.log('  2) Groupbuy');
  console.log('  3) LMS');
  console.log('  4) Forum');
  console.log('  5) Banner');

  console.log('[Member-Yaksa] Activated');
}
