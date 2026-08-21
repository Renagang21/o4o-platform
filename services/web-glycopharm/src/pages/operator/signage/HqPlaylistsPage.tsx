/**
 * HqPlaylistsPage — 운영자 사이니지 HQ 플레이리스트 (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui/modules/signage-hq 로 수렴. endpoint · payload · 권한 불변.
 */

import { useNavigate } from 'react-router-dom';
import { HqPlaylistsPage as CommonHqPlaylistsPage } from '@o4o/operator-core-ui/modules/signage-hq';
import { glycopharmSignageApiFetch, glycopharmSignageHqConfig } from './signageHqConfig';

export default function HqPlaylistsPage() {
  const navigate = useNavigate();
  return (
    <CommonHqPlaylistsPage
      apiFetch={glycopharmSignageApiFetch}
      config={glycopharmSignageHqConfig}
      navigate={navigate}
    />
  );
}
