/**
 * NotFoundPage — GlycoPharm 의 존재하지 않는 경로 안내 화면
 *
 * WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1: canonical 404 형태로 정렬(404 코드 · 표준 문구 ·
 *   요청 경로 표시 · [홈으로 이동] + [이전 화면으로 돌아가기]).
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   5개 서비스에 복제된 404 마크업을 공통 @o4o/ui NotFound 로 교체.
 *   서비스 고유 보조 링크(커뮤니티 · 문의하기)는 children 으로 유지한다.
 *
 * 선행: WO-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1 (404 = minimal nav, footer 제외 의도)
 */

import { NavLink } from 'react-router-dom';
import { NotFound } from '@o4o/ui';

export default function NotFoundPage() {
  return (
    <NotFound>
      <NavLink to="/forum" className="text-slate-500 underline-offset-4 hover:underline">
        커뮤니티
      </NavLink>
      <NavLink to="/contact" className="text-slate-500 underline-offset-4 hover:underline">
        문의하기
      </NavLink>
    </NotFound>
  );
}
