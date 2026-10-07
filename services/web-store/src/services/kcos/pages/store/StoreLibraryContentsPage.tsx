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
 * WO-O4O-KCOS-LIBRARY-CONTENT-BD-CANONICAL-REALIGNMENT-V1: source 를 B+D 원장으로 재정렬.
 *   이전: assetSnapshotApi.list({ type: 'content' }) → /cosmetics/assets?type=content
 *         = o4o_asset_snapshots (KPA 확장 계층 어휘). KCos 는 type=content snapshot 을 만드는
 *         흐름이 없어 항상 빈 목록이었고, POP V2 handoff 도 origin='snapshot' 으로 나가 resolver 404 였다.
 *   현재: KCos 매장 원장 두 축만 읽는다 — POP V2 `listStoreContentSources` 와 같은 source 어휘.
 *     B  GET /cosmetics/store-contents  (kpa_store_contents · Store Production Material · KCos org)
 *        → origin 'direct'   (V2 resolver: KpaStoreContent by (id, organizationId))
 *     D  GET /cosmetics/store/assets    (store_execution_assets · isActive · KCos org)
 *        → origin 'library'  (V2 resolver: StoreExecutionAsset by (id, organizationId))
 *   snapshot(`/cosmetics/assets`) · kpa_contents · KPA control 계층은 이 화면에서 읽지 않는다.
 *   `/store-assets`(채널 통제) · `/store/channels` 축은 손대지 않는다.
 */

import { useCallback } from 'react';
import { Megaphone, QrCode } from 'lucide-react';
import {
  StoreLibraryContentsView,
  type StartProductionTargetConfig,
  type StoreLibraryContentItem,
  type StoreLibraryLabels,
} from '@o4o/store-ui-core';
import { getStoreContents } from '../../api/storeProductionSources';
import { getStoreExecutionAssets } from '../../api/storeExecutionAssets';
import { getTemplatesForTarget } from '../../config/productionTemplates';

const COSMETICS_PRODUCTION_TARGETS: StartProductionTargetConfig[] = [
  {
    key: 'pop',
    label: 'POP',
    Icon: Megaphone,
    iconColor: '#f59e0b',
    // WO-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1: 자료함 → POP 제작은 V2 canonical 로 간다.
    route: '/store/marketing/pop-v2',
    handoffToPopV2: true,
    supportsTemplates: false,
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
  subtitle: '내 매장이 보유한 콘텐츠와 제작 자료입니다. 항목을 선택해 POP·QR 제작에 활용할 수 있습니다.',
  emptyTitle: '보관된 콘텐츠가 없습니다.',
  emptyHint: '매장 콘텐츠를 작성하거나 제작 자료를 만들면 여기에 표시됩니다.',
};

const LIST_LIMIT = 100;

/** 출처 배지 — 원장 어휘를 사용자 문구로 */
const ORIGIN_BADGE = {
  direct: '매장 콘텐츠',
  library: '제작 자료',
} as const;

/** B — 매장 소유 콘텐츠(kpa_store_contents) → origin 'direct' */
async function fetchStoreOwnedContents(): Promise<StoreLibraryContentItem[]> {
  const list = await getStoreContents();
  return list.map((c) => ({
    id: c.id,
    title: c.title,
    sourceService: ORIGIN_BADGE.direct,
    description: null,
    updatedAt: c.updatedAt ?? null,
    origin: 'direct' as const,
  }));
}

/** D — 매장 실행 자산(store_execution_assets · isActive) → origin 'library' */
async function fetchExecutionAssets(): Promise<StoreLibraryContentItem[]> {
  const res = await getStoreExecutionAssets({ limit: LIST_LIMIT });
  const items = res.data?.items ?? [];
  return items
    .filter((a) => a.isActive !== false)
    .map((a) => ({
      id: a.id,
      title: a.title,
      sourceService: ORIGIN_BADGE.library,
      description: a.description ?? null,
      createdAt: a.createdAt ?? null,
      updatedAt: a.updatedAt ?? null,
      origin: 'library' as const,
    }));
}

function sortByUpdatedDesc(items: StoreLibraryContentItem[]): StoreLibraryContentItem[] {
  const ts = (it: StoreLibraryContentItem) => Date.parse(it.updatedAt ?? it.createdAt ?? '') || 0;
  return [...items].sort((a, b) => ts(b) - ts(a));
}

export default function StoreLibraryContentsPage() {
  const fetchContents = useCallback(async () => {
    // 한 축이 실패하면 전체 오류로 올린다 — 일부만 조용히 빠진 목록보다 안전하다.
    const [owned, assets] = await Promise.all([fetchStoreOwnedContents(), fetchExecutionAssets()]);
    return sortByUpdatedDesc([...owned, ...assets]);
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
