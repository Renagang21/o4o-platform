/**
 * MyPageLayout — KPA-Society /mypage 공통 외곽 wrapper
 *
 * WO-O4O-KPA-MYPAGE-LAYOUT-FOUNDATION-V1
 * 근거: docs/investigations/IR-O4O-KPA-MYPAGE-UI-CONSISTENCY-AUDIT-V1.md
 *
 * 책임:
 * - container 폭/패딩 표준화 (width: form 600px / list 800px / wide 1000px)
 * - PageHeader 렌더링 (title/description/breadcrumb)
 * - MyPageNavigation 렌더링 (KPA_MYPAGE_NAV_ITEMS 고정)
 * - children 에 페이지 고유 콘텐츠 위임
 *
 * Phase 1 (본 WO): 컴포넌트 신설만. 기존 /mypage 페이지에는 적용하지 않는다.
 * Phase 2 이후 별도 WO 에서 페이지별 마이그레이션 진행.
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

const WIDTH_MAP: Record<MyPageWidth, string> = {
  form: '600px',
  list: '800px',
  wide: '1000px',
};

export function MyPageLayout({
  title,
  description,
  breadcrumb,
  width = 'wide',
  children,
}: MyPageLayoutProps) {
  return (
    <div
      style={{
        maxWidth: WIDTH_MAP[width],
        margin: '0 auto',
        padding: '0 20px 40px',
      }}
    >
      <PageHeader title={title} description={description} breadcrumb={breadcrumb} />
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />
      {children}
    </div>
  );
}
