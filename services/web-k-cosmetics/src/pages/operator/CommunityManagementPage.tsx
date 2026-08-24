/**
 * CommunityManagementPage (K-Cosmetics) — Operator Home 편집
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
 *   backend(`/api/v1/cosmetics/community/manage/*`, cosmetics:operator) 와
 *   client(`communityManageApi`) 는 이미 존재하는데 **소비하는 화면이 없어**
 *   K-Cosmetics 만 Home 편집이 REQUIRED_BUT_MISSING 이었다.
 *   GlycoPharm / KPA / Neture 와 동일하게 공통
 *   @o4o/operator-core-ui/modules/community-home 의 CommunityHomeConsole 을 채택한다.
 *
 * 신규 backend API 0 / 신규 table 0 / 권한 모델 변경 0.
 */

import { CommunityHomeConsole } from '@o4o/operator-core-ui/modules/community-home';
import type { CommunityHomeClient } from '@o4o/operator-core-ui/modules/community-home';
import { communityManageApi } from '@/services/communityApi';

const client: CommunityHomeClient = communityManageApi;

export default function CommunityManagementPage() {
  return (
    <CommunityHomeConsole
      client={client}
      tableIdPrefix="k-cosmetics-community"
      title="Home 편집"
      subtitle="Home 화면의 Hero 배너, 광고, 스폰서를 관리합니다"
      accent="blue"
    />
  );
}
