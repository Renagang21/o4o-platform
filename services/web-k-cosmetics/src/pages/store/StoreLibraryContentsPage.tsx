/**
 * StoreLibraryContentsPage — K-Cosmetics 내 자료함 / 콘텐츠
 *
 * WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 기본 진입 구조
 * WO-O4O-STORE-LIBRARY-CONTENT-TO-EXECUTION-PHASE2-E-V1: POP/QR 제작 시작 액션
 * WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1: 공통 StartProductionModal
 * WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1: 서비스 template registry
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreLibraryContentsView 로 이관.
 *   이 파일은 API adapter · 제작 대상 config · 문구만 담는 thin adapter 다.
 *
 * API: assetSnapshotApi.list({ type: 'content' }) → /cosmetics/assets?type=content (변경 없음)
 */

import { useCallback } from 'react';
import { Megaphone, QrCode } from 'lucide-react';
import {
  StoreLibraryContentsView,
  type StartProductionTargetConfig,
  type StoreLibraryLabels,
} from '@o4o/store-ui-core';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { getTemplatesForTarget } from '../../config/productionTemplates';

const COSMETICS_PRODUCTION_TARGETS: StartProductionTargetConfig[] = [
  {
    key: 'pop',
    label: 'POP',
    Icon: Megaphone,
    iconColor: '#f59e0b',
    route: '/store/marketing/pop',
    supportsTemplates: true,
    defaultTemplateId: 'kcos-pop-beauty-expert',
  },
  {
    key: 'qr',
    label: 'QR 코드',
    Icon: QrCode,
    iconColor: '#0ea5e9',
    route: '/store/marketing/qr',
    supportsTemplates: true,
    defaultTemplateId: 'kcos-qr-usage-guide',
  },
];

const LABELS: StoreLibraryLabels = {
  breadcrumbRoot: '내 자료함',
  pageTitle: '콘텐츠',
  subtitle: 'HUB에서 가져온 콘텐츠를 보관합니다. 항목을 선택해 POP·QR 제작에 활용할 수 있습니다.',
  emptyTitle: '보관된 콘텐츠가 없습니다.',
  emptyHint: 'HUB에서 콘텐츠를 가져오면 여기에 표시됩니다.',
};

export default function StoreLibraryContentsPage() {
  const fetchContents = useCallback(async () => {
    const res = await assetSnapshotApi.list({ type: 'content', limit: 100 });
    return res.data?.items ?? [];
  }, []);

  return (
    <StoreLibraryContentsView
      fetchContents={fetchContents}
      labels={LABELS}
      productionTargets={COSMETICS_PRODUCTION_TARGETS}
      getTemplates={getTemplatesForTarget}
    />
  );
}
