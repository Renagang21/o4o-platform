/**
 * NotFoundPage — Pharmacy-Hub 404 안내
 *
 * WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1
 *   catch-all 이 `<Navigate to="/" replace />` 였다. redirect 가 아니라 이 화면을 그 자리에서
 *   render 한다. 주소창의 요청 URL 은 그대로 유지된다.
 *
 * WO-O4O-WEB-COMMON-UX-COMPONENT-PROMOTION-BATCH-V1:
 *   복제 마크업을 공통 @o4o/ui NotFound 로 교체.
 *
 * 이 화면은 API 를 호출하지 않는다.
 * layout(StoreOwnerShell 등) 밖에 두어 인증·역할 컨텍스트가 없는 경로에서도 렌더된다.
 */

import { NotFound } from '@o4o/ui';

export default function NotFoundPage() {
  return <NotFound />;
}
