/**
 * OperatorSupplierContentsPage — K-Cosmetics 서비스 운영 › 제공받은 콘텐츠
 *
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1
 *
 * `Supplier → Service Operator` 제공 경로의 수신함. 공통 모듈
 * `@o4o/operator-core-ui` SupplierContentInbox 를 그대로 채택한다 (서비스 사본 0).
 *
 * API (공통 CMS · serviceKey 경계):
 *   GET   /api/v1/cms/contents?serviceKey=k-cosmetics&authorRole=supplier
 *   PATCH /api/v1/cms/contents/:id/status   (기존 전이 · cosmetics:operator 권한은 서버 판정)
 */

import { SupplierContentInbox } from '@o4o/operator-core-ui';
import { getAccessToken } from '@o4o/auth-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function OperatorSupplierContentsPage() {
  return (
    <SupplierContentInbox
      apiBase={`${API_BASE_URL}/api/v1`}
      cmsServiceKey="k-cosmetics"
      getToken={getAccessToken}
    />
  );
}
