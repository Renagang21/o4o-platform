/**
 * TemplatesPage — 운영자 사이니지 템플릿 (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui/modules/signage-hq 로 수렴. endpoint · payload · 권한 불변.
 */

import { useNavigate } from 'react-router-dom';
import { SignageTemplatesPage as CommonSignageTemplatesPage } from '@o4o/operator-core-ui/modules/signage-hq';
import { glycopharmSignageApiFetch, glycopharmSignageHqConfig } from './signageHqConfig';

export default function TemplatesPage() {
  const navigate = useNavigate();
  return (
    <CommonSignageTemplatesPage
      apiFetch={glycopharmSignageApiFetch}
      config={glycopharmSignageHqConfig}
      navigate={navigate}
    />
  );
}
