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
    <MyPageLayout width="form">
      <SupplierProfilePage />
    </MyPageLayout>
  );
}
