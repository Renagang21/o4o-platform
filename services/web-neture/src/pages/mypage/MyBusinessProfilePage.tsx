/**
 * MyBusinessProfilePage - 공급자 사업자 정보 (마이페이지 표준 구조)
 *
 * WO-O4O-SUPPLIER-MYPAGE-CANONICAL-PROFILE-ALIGNMENT-V1
 *
 * /mypage/business-profile
 * - MyPageLayout 표준 적용으로 /mypage/* 구조 안에 사업자 정보 진입점 마련
 * - 기존 /supplier/profile(SupplierProfilePage) 콘텐츠를 그대로 재사용
 * - 개인 프로필(/mypage/profile, 이름·이메일·역할)과 사업자 정보 분리
 */

import { User } from 'lucide-react';
import { MyPageLayout, MyPageAuthRequired, MyPageLoadingState } from '@o4o/account-ui';
import SupplierProfilePage from '../supplier/SupplierProfilePage';
import { useAuth } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { getNetureMyPageNavItems } from './navItems';

export default function MyBusinessProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openLoginModal } = useLoginModal();

  /**
   * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1:
   *   /mypage/* 에는 route guard 가 없어 auth bootstrap 중에도 미인증 분기가 먼저 렌더됐다.
   *   그 결과 로그인한 사용자에게 "로그인이 필요합니다" 가 수 초간 노출됐다.
   *   로딩은 미인증 분기보다 먼저, Shell 안에서 렌더한다.
   */
  if (isLoading) {
    return (
      <MyPageLayout title="사업자 정보" width="form" navItems={getNetureMyPageNavItems([])}>
        <MyPageLoadingState message="사업자 정보를 불러오는 중..." />
      </MyPageLayout>
    );
  }

  /**
   * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1:
   *   /mypage/* 에는 route guard 가 없고 이 화면만 미인증 분기가 없어서,
   *   로그아웃 상태로 직접 접근하면 supplier API 401 이 그대로 드러나
   *   "공급자 프로필을 불러오지 못했습니다" 오류 화면이 떴다.
   *   같은 축의 /mypage · /mypage/profile · /mypage/settings 와 동일하게
   *   Shell 안에서 로그인 안내를 렌더한다.
   */
  if (!isAuthenticated || !user) {
    return (
      <MyPageLayout
        title="사업자 정보"
        width="form"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: '/mypage' },
          { label: '사업자 정보' },
        ]}
        navItems={getNetureMyPageNavItems([])}
      >
        <MyPageAuthRequired
          icon={<User className="w-8 h-8 text-gray-400" />}
          description="마이페이지를 이용하려면 로그인해주세요."
          onAction={() => openLoginModal('/mypage/business-profile')}
        />
      </MyPageLayout>
    );
  }

  return (
    // WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
    //   제목·breadcrumb·navItems 가 모두 없어 이 화면만 My Page 골격 밖처럼 보였다.
    //   (탭에 활성 항목이 없고, 옆 기능으로 돌아갈 수단도 없었다.)
    <MyPageLayout
      title="사업자 정보"
      subtitle="공급자 사업자 정보를 확인하고 수정할 수 있습니다"
      width="form"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: '/mypage' },
        { label: '사업자 정보' },
      ]}
      navItems={getNetureMyPageNavItems(user?.roles)}
    >
      <SupplierProfilePage />
    </MyPageLayout>
  );
}
