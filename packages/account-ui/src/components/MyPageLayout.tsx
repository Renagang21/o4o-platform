/**
 * MyPageLayout — 호환 재노출 (canonical 구현은 MyPageShell).
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 *
 * My Page 골격 구현은 `MyPageShell.tsx` 하나로 합쳤다. 기존 호출부가 쓰던
 * `MyPageLayout` 이름과 타입 경로를 깨지 않기 위해 이 파일만 남긴다.
 * 새 코드는 `MyPageShell` 을 직접 쓴다.
 */

export { MyPageShell, MyPageLayout } from './MyPageShell.js';
export type {
  MyPageShellProps,
  MyPageBreadcrumbItem,
  MyPageLayoutWidth,
} from './MyPageShell.js';
