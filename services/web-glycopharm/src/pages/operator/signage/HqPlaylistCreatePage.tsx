/**
 * HqPlaylistCreatePage — 운영자 사이니지 HQ 플레이리스트 등록 (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui/modules/signage-hq 로 수렴.
 *   다단계(URL별 HQ media → 플레이리스트 → 항목 일괄) 흐름은 공통 콘솔이 동일하게 수행한다.
 *   endpoint · payload · 권한 불변.
 */

import { useNavigate } from 'react-router-dom';
import { HqPlaylistCreatePage as CommonHqPlaylistCreatePage } from '@o4o/operator-core-ui/modules/signage-hq';
import { glycopharmSignageApiFetch, glycopharmSignageHqConfig } from './signageHqConfig';

export default function HqPlaylistCreatePage() {
  const navigate = useNavigate();
  return (
    <CommonHqPlaylistCreatePage
      apiFetch={glycopharmSignageApiFetch}
      config={glycopharmSignageHqConfig}
      navigate={navigate}
    />
  );
}
