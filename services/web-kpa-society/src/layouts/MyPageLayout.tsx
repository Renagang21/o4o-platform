/**
 * MyPageLayout — KPA-Society /mypage 공통 외곽 wrapper
 *
 * WO-O4O-KPA-MYPAGE-RESPONSIVE-LAYOUT-CANONICALIZATION-V1
 * 근거: docs/investigations/IR-O4O-KPA-MYPAGE-UI-CONSISTENCY-AUDIT-V1.md
 *
 * 책임:
 * - container 폭/패딩 canonical 기준 (outer: max-w-[1120px], form inner: max-w-[860px])
 * - PageHeader 렌더링 (title/description/breadcrumb)
 * - MyPageNavigation 렌더링 (KPA_MYPAGE_NAV_ITEMS 고정)
 * - children 에 페이지 고유 콘텐츠 위임
 *
 * width prop:
 *   - 'wide' (default) / 'list' — outer 1120px 그대로 사용
 *   - 'form'                    — children을 max-w-[860px] inner wrapper로 제한
 */

import type { ReactNode } from 'react';
import { PageHeader } from '../components/common';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from '../pages/mypage/navItems';

export type MyPageWidth = 'form' | 'list' | 'wide';

export interface MyPageLayoutProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  width?: MyPageWidth;
  children: ReactNode;
}

export function MyPageLayout({
  title,
  description,
  breadcrumb,
  width = 'wide',
  children,
}: MyPageLayoutProps) {
  return (
    <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-5 lg:px-6 pb-10">
      <PageHeader title={title} description={description} breadcrumb={breadcrumb} />
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />
      {width === 'form' ? (
        <div className="w-full max-w-[860px]">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
