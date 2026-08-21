/**
 * OperatorQrListPage — 운영자 약국 HUB QR 템플릿 목록 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-QR-WRITE-FRONTEND-V1 (2026-05-27): KPA port (서비스 로컬 구현)
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui 의 OperatorHubContentListPage 로 수렴.
 *   QR 신원 컬럼은 공통 buildQrLeadColumns() 를 사용한다.
 *
 * QR 도메인 차이 (Blog/POP 와):
 *   - slug 컬럼 부재 (운영자 단계 미발급 — 약국 가져가기 시 store_qr_codes 가 발급)
 *   - target_type ('url' | 'content') + target 요약 컬럼 추가
 *
 * Backend 변경 없음:
 *   GET   /api/v1/glycopharm/operator/qr/templates
 *   PATCH /...:id/publish · /...:id/archive · DELETE /...:id
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
      actionPolicyKey="glycopharm:operator-qr"
      tableId="operator-qr-list"
      onCreate={() => navigate('/operator/qr/new')}
      onEdit={(id) => navigate(`/operator/qr/${id}/edit`)}
      copy={{
        kindLabel: 'QR 템플릿',
        pageTitle: '약국 HUB QR-code',
        pageDescription:
          '운영자가 GlycoPharm 약국 HUB 에 게시할 QR "템플릿" 을 작성·관리합니다. 실제 QR-code 는 약국 경영자가 가져갈 때 약국별로 발급됩니다.',
        createButtonLabel: '새 QR 템플릿',
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
