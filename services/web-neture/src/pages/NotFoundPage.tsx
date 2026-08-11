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
 * 이 화면은 API 를 호출하지 않는다. 레이아웃(NetureLayout 등)에도 속하지 않는다 —
 * 레이아웃이 요구하는 컨텍스트(인증·역할)가 없는 경로에서도 항상 렌더돼야 하기 때문이다.
 */

import { NotFound } from '@o4o/ui';

export default function NotFoundPage() {
  return <NotFound />;
}
