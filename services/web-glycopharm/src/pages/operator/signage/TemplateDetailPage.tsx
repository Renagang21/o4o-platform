/**
 * TemplateDetailPage — 운영자 사이니지 템플릿 상세 (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui/modules/signage-hq 로 수렴. endpoint · payload · 권한 불변.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { SignageTemplateDetailPage as CommonSignageTemplateDetailPage } from '@o4o/operator-core-ui/modules/signage-hq';
import { glycopharmSignageApiFetch, glycopharmSignageHqConfig } from './signageHqConfig';

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  return (
    <CommonSignageTemplateDetailPage
      id={templateId}
      apiFetch={glycopharmSignageApiFetch}
      config={glycopharmSignageHqConfig}
      navigate={navigate}
    />
  );
}
