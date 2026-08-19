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

import { MyPageLayout } from '@o4o/account-ui';
import SupplierProfilePage from '../supplier/SupplierProfilePage';
import { useAuth } from '../../contexts';
import { getNetureMyPageNavItems } from './navItems';

export default function MyBusinessProfilePage() {
  const { user } = useAuth();

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
