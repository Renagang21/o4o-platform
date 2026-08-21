/**
 * HqMediaDetailPage — 운영자 사이니지 HQ 미디어 상세 (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui/modules/signage-hq 로 수렴. endpoint · payload · 권한 불변.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { HqMediaDetailPage as CommonHqMediaDetailPage } from '@o4o/operator-core-ui/modules/signage-hq';
import { glycopharmSignageApiFetch, glycopharmSignageHqConfig } from './signageHqConfig';

export default function HqMediaDetailPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  return (
    <CommonHqMediaDetailPage
      id={mediaId}
      apiFetch={glycopharmSignageApiFetch}
      config={glycopharmSignageHqConfig}
      navigate={navigate}
    />
  );
}
