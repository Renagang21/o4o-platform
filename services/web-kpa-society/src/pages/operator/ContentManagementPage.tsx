/**
 * ContentManagementPage - KPA-a 콘텐츠 CMS (공지/뉴스)
 * WO-KPA-A-CONTENT-CMS-PHASE1-V1
 * WO-KPA-A-HUB-TO-STORE-CLONE-FLOW-V2: 매장 복사 후 자동 이동
 * WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1: 공통 모듈로 추출
 *
 * 공통 모듈: @o4o/operator-core-ui/modules/cms-content
 */

import { CmsContentManager } from '@o4o/operator-core-ui';
import { getAccessToken } from '../../contexts/AuthContext';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { RichTextEditor } from '@o4o/content-editor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function kpaAssetCopyFn(sourceService: string, assetId: string): Promise<void> {
  await assetSnapshotApi.copy({
    sourceService,
    sourceAssetId: assetId,
    assetType: 'cms',
  });
}

export default function ContentManagementPage() {
  return (
    <CmsContentManager
      apiBase={`${API_BASE_URL}/api/v1/kpa`}
      serviceKey="kpa-society"
      getToken={getAccessToken}
      RichTextEditor={RichTextEditor}
      assetCopyEnabled
      storeContentPath="/store/content?tab=cms"
      assetCopyFn={kpaAssetCopyFn}
    />
  );
}
