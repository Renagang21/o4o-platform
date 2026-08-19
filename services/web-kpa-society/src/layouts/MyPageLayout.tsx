/**
 * MyPageLayout — KPA-Society /mypage 외곽 wrapper
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 * (선행: WO-O4O-KPA-MYPAGE-RESPONSIVE-LAYOUT-CANONICALIZATION-V1)
 *
 * 변경: 골격(container 폭 · header · navigation)을 자체 구현하지 않고 공통
 *       `MyPageShell` 에 위임한다. KPA 가 갖고 있던 canonical 폭 기준
 *       (outer 1120px / form inner 860px)이 그대로 Shell 의 기준이 되었으므로
 *       화면 결과는 동일하다.
 *
 * 이 파일은 **KPA 호출부 호환 어댑터**로만 남는다:
 *   - prop 이름 `description` (Shell 은 `subtitle`)
 *   - KPA_MYPAGE_NAV_ITEMS 주입
 *   - width 기본값 'wide'
 * 페이지들은 수정 없이 그대로 동작한다.
 */

import type { ReactNode } from 'react';
import { MyPageShell } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from '../pages/mypage/navItems';

export type MyPageWidth = 'form' | 'list' | 'wide';

export interface MyPageLayoutProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  width?: MyPageWidth;
  /** 제목 우측 액션 슬롯 (알림 벨 등). */
  headerActions?: ReactNode;
  /** 상태/공지 배너 슬롯 — navigation 바로 아래. */
  statusNotice?: ReactNode;
  /** 사용자 요약 카드 슬롯. */
  userSummary?: ReactNode;
  children: ReactNode;
}

export function MyPageLayout({
  title,
  description,
  breadcrumb,
  width = 'wide',
  headerActions,
  statusNotice,
  userSummary,
  children,
}: MyPageLayoutProps) {
  return (
    <MyPageShell
      title={title}
      subtitle={description}
      breadcrumb={breadcrumb}
      width={width}
      basePath="/mypage"
      navItems={KPA_MYPAGE_NAV_ITEMS}
      headerActions={headerActions}
      statusNotice={statusNotice}
      userSummary={userSummary}
    >
      {children}
    </MyPageShell>
  );
}
