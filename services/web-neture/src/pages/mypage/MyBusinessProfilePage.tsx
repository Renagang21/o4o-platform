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

export default function MyBusinessProfilePage() {
  return (
    <MyPageLayout
      title="사업자 정보"
      subtitle="사업자 기본정보, 담당자 정보, 공개 연락처를 관리합니다"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: '/mypage' },
        { label: '사업자 정보' },
      ]}
    >
      <SupplierProfilePage />
    </MyPageLayout>
  );
}
