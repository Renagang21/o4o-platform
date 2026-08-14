/**
 * OperatorQrListPage — 운영자 매장 HUB QR 템플릿 목록 (KPA)
 *
 * WO-O4O-KPA-OPERATOR-QR-WRITE-PAGE-V1 (초기 카드형)
 * WO-O4O-KPA-OPERATOR-PUBLISHING-PAGES-STANDARD-TABLE-V1 (2026-05-24): O4O 표준 테이블 전환
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics 중복을 @o4o/operator-core-ui 의 OperatorHubContentListPage 로 수렴.
 *   QR 신원 컬럼은 공통 buildQrLeadColumns() 를 사용한다.
 *
 * QR 도메인 차이 (Blog/POP 와):
 *   - slug 컬럼 부재 (운영자 단계 미발급 — 매장 가져가기 시 store_qr_codes 가 발급)
 *   - target_type ('url' | 'content') + target 요약 컬럼 추가
 *   - 실제 QR 발급은 Phase 3-B 매장 사본 변환 시점에서만 일어남
 *
 * Backend: WO-O4O-KPA-OPERATOR-QR-PUBLISHING-PHASE2-BACKEND-V1 (변경 없음)
 *   GET /api/v1/kpa/operator/qr/templates
 *   PATCH /...:id/publish · /...:id/archive · DELETE /...:id
 *
 * 권한 검증은 backend + RoleGuard 가 처리.
 */

import { useNavigate } from 'react-router-dom';
import {
  OperatorHubContentListPage,
  buildQrLeadColumns,
} from '@o4o/operator-core-ui/modules/hub-content-list';
import type { HubContentListClient } from '@o4o/operator-core-ui/modules/hub-content-list';
import {
  listOperatorQrTemplates,
  publishOperatorQrTemplate,
  archiveOperatorQrTemplate,
  deleteOperatorQrTemplate,
  type OperatorQrTemplate,
} from '../../../api/operatorQr';

const client: HubContentListClient<OperatorQrTemplate> = {
  list: listOperatorQrTemplates,
  publish: publishOperatorQrTemplate,
  archive: archiveOperatorQrTemplate,
  remove: deleteOperatorQrTemplate,
};

const leadColumns = buildQrLeadColumns<OperatorQrTemplate>();

export default function OperatorQrListPage() {
  const navigate = useNavigate();
  return (
    <OperatorHubContentListPage<OperatorQrTemplate>
      client={client}
      leadColumns={leadColumns}
      actionPolicyKey="kpa:operator-qr"
      tableId="operator-qr-list"
      onCreate={() => navigate('/operator/qr/new')}
      onEdit={(id) => navigate(`/operator/qr/${id}/edit`)}
      copy={{
        kindLabel: 'QR 템플릿',
        pageTitle: '매장 HUB QR-code',
        pageDescription:
          '운영자가 KPA 매장 HUB 에 게시할 QR "템플릿" 을 작성·관리합니다. 실제 QR-code 는 매장 경영자가 가져갈 때 매장별로 발급됩니다. 본 화면에서는 슬러그·통계가 없으며, 발행 후 매장 HUB 에 노출되어 매장이 자기 매장으로 가져갈 수 있습니다.',
        createButtonLabel: 'QR 템플릿 만들기',
        emptyMessage: '아직 작성한 QR 템플릿이 없습니다',
        emptyFilteredMessage: '해당 상태의 QR 템플릿이 없습니다',
      }}
      accent={{
        createButton: 'bg-blue-600 hover:bg-blue-700',
        activePill: 'bg-blue-600 text-white',
        retryButton: 'text-blue-600 border-blue-400 hover:bg-blue-50',
        publishedBadge: 'bg-emerald-50 text-emerald-700',
      }}
    />
  );
}
