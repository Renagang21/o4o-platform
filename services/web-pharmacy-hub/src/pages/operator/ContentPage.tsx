/**
 * ContentPage — PharmacyHub 공지/뉴스 관리 (운영자)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4
 *
 * KPA / GlycoPharm / K-Cosmetics 가 이미 소비 중인 **공통 모듈**
 * `@o4o/operator-core-ui/modules/cms-content` 를 그대로 채택한다 (PH 전용 사본 0).
 *
 * API (공통 news controller · serviceKey='pharmacy-hub' · 원장 cms_contents):
 *   GET    /api/v1/pharmacy-hub/news/admin/list
 *   POST   /api/v1/pharmacy-hub/news
 *   PUT    /api/v1/pharmacy-hub/news/:id
 *   DELETE /api/v1/pharmacy-hub/news/:id
 *
 * assetCopy(매장 복사)는 PH 에 대응 화면이 없어 비활성 — 데드 CTA 를 만들지 않는다.
 */

import { CmsContentManager } from '@o4o/operator-core-ui';
import { getAccessToken } from '@o4o/auth-client';
import { RichTextEditor } from '@o4o/content-editor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function ContentPage() {
  return (
    <CmsContentManager
      apiBase={`${API_BASE_URL}/api/v1/pharmacy-hub`}
      serviceKey="pharmacy-hub"
      getToken={getAccessToken}
      RichTextEditor={RichTextEditor}
    />
  );
}
