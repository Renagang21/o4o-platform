/**
 * OperatorContentPage — GlycoPharm 공지/뉴스 관리 (공통 모듈)
 *
 * WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1
 *
 * 공통 모듈: @o4o/operator-core-ui/modules/cms-content
 * API:
 *   GET    /api/v1/glycopharm/news/admin/list
 *   POST   /api/v1/glycopharm/news
 *   PUT    /api/v1/glycopharm/news/:id
 *   DELETE /api/v1/glycopharm/news/:id
 */

import { CmsContentManager } from '@o4o/operator-core-ui';
import { getAccessToken } from '@o4o/auth-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function OperatorContentPage() {
  return (
    <CmsContentManager
      apiBase={`${API_BASE_URL}/api/v1/glycopharm`}
      serviceKey="glycopharm"
      getToken={getAccessToken}
    />
  );
}
