/**
 * StartProductionModal — KPA wrapper
 *
 * WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1
 *
 * 공통 컴포넌트(@o4o/store-ui-core)를 KPA 설정으로 감싼 thin wrapper.
 *
 * KPA 설정:
 *   - targets: PRODUCTION_TARGET_CATALOG (4개 제작 대상)
 *   - getTemplates: getTemplatesForTarget (KPA template registry)
 *
 * 기존 사용처(StoreProductionMaterialsPage, StoreLibraryContentsPage)는
 * import 경로와 props(open, source, onClose, onAiAction) 변경 없이 동작한다.
 */

import {
  StartProductionModal as SharedStartProductionModal,
  type StartProductionModalProps,
} from '@o4o/store-ui-core';
import {
  PRODUCTION_TARGET_CATALOG,
  type ProductionTarget,
  type ProductionSource,
  type ProductionSourceItem,
} from './productionTargets';
import { getTemplatesForTarget } from './productionTemplates';

// 기존 사용처 호환을 위한 re-export
export type { ProductionTarget, ProductionSource, ProductionSourceItem };

// KPA는 targets/getTemplates를 내부에서 고정 — 기존 call site에서 이 두 prop을 전달할 필요 없음
type KpaStartProductionModalProps = Omit<StartProductionModalProps, 'targets' | 'getTemplates'>;

export function StartProductionModal(props: KpaStartProductionModalProps) {
  return (
    <SharedStartProductionModal
      {...props}
      targets={PRODUCTION_TARGET_CATALOG}
      getTemplates={getTemplatesForTarget}
    />
  );
}
