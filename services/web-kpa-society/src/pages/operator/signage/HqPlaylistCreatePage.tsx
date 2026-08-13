/**
 * HqPlaylistCreatePage — 운영자 사이니지 HQ 플레이리스트 등록 (KPA)
 *
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1: 공통 SignagePlaylistCreateShell 채택.
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   Shell 위의 다단계 저장 오케스트레이션까지 @o4o/operator-core-ui/modules/signage-hq 로 수렴.
 */

import { useNavigate } from 'react-router-dom';
import { HqPlaylistCreatePage as CommonHqPlaylistCreatePage } from '@o4o/operator-core-ui/modules/signage-hq';
import { kpaSignageApiFetch, kpaSignageHqConfig } from './signageHqConfig';

export default function HqPlaylistCreatePage() {
  const navigate = useNavigate();
  return (
    <CommonHqPlaylistCreatePage
      apiFetch={kpaSignageApiFetch}
      config={kpaSignageHqConfig}
      navigate={navigate}
    />
  );
}
