/**
 * ForcedContentPage — 운영자 사이니지 강제 콘텐츠 (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui/modules/signage-hq 로 수렴. endpoint · payload · 권한 불변.
 *   태블릿 대기화면 노출 대상 필드는 KPA 전용 확장이므로 미노출
 *   (config.enableTabletSurface=false — payload 도 생기지 않는다).
 */

import { useNavigate } from 'react-router-dom';
import { ForcedContentPage as CommonForcedContentPage } from '@o4o/operator-core-ui/modules/signage-hq';
import { glycopharmSignageApiFetch, glycopharmSignageHqConfig } from './signageHqConfig';

export default function ForcedContentPage() {
  const navigate = useNavigate();
  return (
    <CommonForcedContentPage
      apiFetch={glycopharmSignageApiFetch}
      config={glycopharmSignageHqConfig}
      navigate={navigate}
    />
  );
}
