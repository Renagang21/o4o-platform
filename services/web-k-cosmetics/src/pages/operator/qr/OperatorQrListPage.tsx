/**
 * OperatorQrListPage — 운영자 매장 HUB QR 템플릿 목록 (K-Cosmetics)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA 와 중복이던 화면 본체를 @o4o/operator-core-ui 의 OperatorHubContentListPage 로 수렴.
 *   QR 신원 컬럼은 공통 buildQrLeadColumns() 를 사용한다.
 *   수렴으로 획득: 행 발행 확인 게이트 · 일괄 작업 확인 대상 고정(RUNBULK 표준).
 *
 * Backend: GET /api/v1/cosmetics/operator/qr/templates
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
      actionPolicyKey="cosmetics:operator-qr"
      tableId="kcos-operator-qr-list"
      onCreate={() => navigate('/operator/qr/new')}
      onEdit={(id) => navigate(`/operator/qr/${id}/edit`)}
      copy={{
        kindLabel: 'QR 템플릿',
        pageTitle: '매장 HUB QR',
        pageDescription:
          '운영자가 K-Cosmetics 매장 HUB 에 게시할 QR 템플릿을 작성·관리합니다. 실제 QR-code 는 매장 경영자가 가져갈 때 매장별로 발급됩니다.',
        createButtonLabel: '새 QR 템플릿',
        emptyMessage: '아직 작성한 QR 템플릿이 없습니다',
        emptyFilteredMessage: '해당 상태의 QR 템플릿이 없습니다',
      }}
      accent={{
        createButton: 'bg-pink-600 hover:bg-pink-700',
        activePill: 'bg-pink-600 text-white',
        retryButton: 'text-pink-600 border-pink-400 hover:bg-pink-50',
        publishedBadge: 'bg-pink-50 text-pink-700',
      }}
    />
  );
}
