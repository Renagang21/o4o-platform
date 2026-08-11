/**
 * NotFoundPage — K-Cosmetics 의 존재하지 않는 경로 안내 화면
 *
 * WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1: canonical 404 형태로 정렬.
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   복제 마크업을 공통 @o4o/ui NotFound 로 교체. 보조 링크(커뮤니티 · 문의하기)는 children 유지.
 *
 * 선행: WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1 (404 = minimal nav)
 */

import { Link } from 'react-router-dom';
import { NotFound } from '@o4o/ui';

export function NotFoundPage() {
  return (
    <NotFound>
      <Link to="/forum" className="text-slate-500 no-underline hover:underline">
        커뮤니티
      </Link>
      <Link to="/contact" className="text-slate-500 no-underline hover:underline">
        문의하기
      </Link>
    </NotFound>
  );
}
