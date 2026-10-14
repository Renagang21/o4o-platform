/**
 * NotFoundPage — Neture web 의 존재하지 않는 경로 안내 화면
 *
 * WO-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1
 *
 * 왜 redirect 가 아니라 안내 화면인가
 *   홈으로 강제 이동시키면 주소가 왜 사라졌는지 알 수 없고, 오타·구 링크·삭제된 페이지가
 *   전부 같은 결과로 뭉개진다. 이동은 사용자가 선택한다.
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   복제 마크업을 공통 @o4o/ui NotFound 로 교체.
 *
 * 업무 접근 가드 없이 안내하며, 메인 복귀를 선택할 때만 현재 계정의 인증을 인계한다.
 */

import { NotFound } from '@o4o/ui';
import { O4OHomeButton } from '@o4o/auth-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';

export default function NotFoundPage() {
  const { isAuthenticated, isLoading } = useAuth();
  return <NotFound><O4OHomeButton api={api} isAuthenticated={isAuthenticated} authLoading={isLoading} className="o4o-home-link" /></NotFound>;
}
