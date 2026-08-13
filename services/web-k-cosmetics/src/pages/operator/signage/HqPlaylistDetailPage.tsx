/**
 * HqPlaylistDetailPage — 운영자 사이니지 HQ (K-Cosmetics)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA/K-Cosmetics 중복이던 화면 본체를 @o4o/operator-core-ui/modules/signage-hq 로 수렴.
 *   서비스는 apiFetch + config(serviceKey · accent · 어휘)만 주입한다.
 *   endpoint(/api/signage/:serviceKey/...) · payload · 권한은 불변.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { HqPlaylistDetailPage as CommonHqPlaylistDetailPage } from '@o4o/operator-core-ui/modules/signage-hq';
import { kcosSignageApiFetch, kcosSignageHqConfig } from './signageHqConfig';

export default function HqPlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  return (
    <CommonHqPlaylistDetailPage
      id={playlistId}
      apiFetch={kcosSignageApiFetch}
      config={kcosSignageHqConfig}
      navigate={navigate}
    />
  );
}
