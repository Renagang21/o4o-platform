/**
 * StoreLibraryContentsView — 내 자료함 / 콘텐츠 (공통 화면 본체)
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * 이전 WO 계약 유지:
 *   WO-O4O-STORE-LIBRARY-CONTENT-TO-EXECUTION-PHASE2-E-V1 (제작 시작 액션)
 *   WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1 (공통 StartProductionModal)
 *   WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1 (서비스별 template registry)
 * 검색·필터·pagination 은 원본 화면에 없었고 이번에 추가하지 않는다(신규 기능 금지).
 */

import { BookOpen } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { StartProductionModal } from '../StartProductionModal';
import type {
  StartProductionTargetConfig,
  StartProductionTemplateItem,
} from '../StartProductionModal';
import type { ProductionSource, ProductionTarget } from '../../utils/productionUtils';
import { StoreLibraryContentRow } from './StoreLibraryContentRow';
import { StoreLibraryPageShell } from './StoreLibraryPageShell';
import { readContentDescription } from './libraryHelpers';
import { useStoreLibraryList } from './useStoreLibraryList';
import type { StoreLibraryContentItem, StoreLibraryLabels } from './types';

export interface StoreLibraryContentsViewProps {
  /** 서비스 API adapter — endpoint·request·response 는 서비스 소유 */
  fetchContents: () => Promise<StoreLibraryContentItem[]>;
  labels: StoreLibraryLabels;
  iconColor?: string;
  /** 제작 대상(POP/QR 등) — 서비스 config */
  productionTargets: StartProductionTargetConfig[];
  /** target 별 template registry — 서비스 config */
  getTemplates?: (target: ProductionTarget) => StartProductionTemplateItem[];
  headerActions?: ReactNode;
}

export function StoreLibraryContentsView({
  fetchContents,
  labels,
  iconColor,
  productionTargets,
  getTemplates,
  headerActions,
}: StoreLibraryContentsViewProps) {
  const { items, loading, loadError, reload } = useStoreLibraryList(fetchContents);
  const [productionSource, setProductionSource] = useState<ProductionSource | null>(null);

  const openProduction = (item: StoreLibraryContentItem) => {
    setProductionSource({
      fromLibrary: 'contents',
      items: [{
        id: item.id,
        title: item.title,
        description: readContentDescription(item),
        origin: 'snapshot',
      }],
    });
  };

  return (
    <StoreLibraryPageShell
      labels={labels}
      Icon={BookOpen}
      iconColor={iconColor}
      loading={loading}
      loadError={loadError}
      isEmpty={items.length === 0}
      onReload={reload}
      headerActions={headerActions}
      footer={
        <StartProductionModal
          open={!!productionSource}
          source={productionSource}
          targets={productionTargets}
          onClose={() => setProductionSource(null)}
          getTemplates={getTemplates}
        />
      }
    >
      {items.map((item) => (
        <StoreLibraryContentRow
          key={item.id}
          item={item}
          onStartProduction={() => openProduction(item)}
        />
      ))}
    </StoreLibraryPageShell>
  );
}
