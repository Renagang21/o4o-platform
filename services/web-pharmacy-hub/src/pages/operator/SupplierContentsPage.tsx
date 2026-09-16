/**
 * SupplierContentsPage — Pharmacy-Hub 서비스 운영 › 제공받은 콘텐츠 (운영자)
 *
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1
 *
 * `Supplier → Service Operator` 제공 경로의 수신함. 공통 모듈
 * `@o4o/operator-core-ui` SupplierContentInbox 를 그대로 채택한다 (PH 전용 사본 0).
 * 공급자 → 약국 Store Hub 직접 경로(운영자 무개입)는 그대로다 — 이 화면은 서비스에 제공된 콘텐츠만 받는다.
 *
 * API (공통 CMS · serviceKey 경계):
 *   GET   /api/v1/cms/contents?serviceKey=pharmacy-hub&authorRole=supplier
 *   PATCH /api/v1/cms/contents/:id/status   (기존 전이 · pharmacy-hub:operator 권한은 서버 판정)
 */

import { SupplierContentInbox } from '@o4o/operator-core-ui';
import { getAccessToken } from '@o4o/auth-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function SupplierContentsPage() {
  return (
    <SupplierContentInbox
      apiBase={`${API_BASE_URL}/api/v1`}
      cmsServiceKey="pharmacy-hub"
      getToken={getAccessToken}
    />
  );
}
