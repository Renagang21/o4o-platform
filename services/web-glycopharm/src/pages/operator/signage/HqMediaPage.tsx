/**
 * HqMediaPage — 운영자 사이니지 HQ (GlycoPharm)
 *
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   KPA-Society / K-Cosmetics 가 이미 쓰던 @o4o/operator-core-ui/modules/signage-hq 로 수렴.
 *   서비스는 apiFetch + config(serviceKey · accent · 어휘)만 주입한다.
 *   endpoint(/api/signage/glycopharm/...) · payload · 권한은 불변.
 */

import { useNavigate } from 'react-router-dom';
import { HqMediaPage as CommonHqMediaPage } from '@o4o/operator-core-ui/modules/signage-hq';
import { glycopharmSignageApiFetch, glycopharmSignageHqConfig } from './signageHqConfig';

export default function HqMediaPage() {
  const navigate = useNavigate();
  return (
    <CommonHqMediaPage
      apiFetch={glycopharmSignageApiFetch}
      config={glycopharmSignageHqConfig}
      navigate={navigate}
    />
  );
}
