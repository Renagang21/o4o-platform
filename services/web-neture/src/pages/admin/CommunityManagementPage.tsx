/**
 * CommunityManagementPage (Neture) — 커뮤니티 광고/스폰서 관리
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1:
 *   기존 Neture 자체 구현(454L, VIEW_DUPLICATED)을 폐기하고
 *   @o4o/operator-core-ui/modules/community-home 의 CommunityHomeConsole 을 소비한다.
 *   서비스 차이는 client(communityAdmin) 주입만으로 흡수한다.
 *
 * 이전 이력: WO-O4O-NETURE-COMMUNITY-OPERATOR-MANAGEMENT-V1
 */

import { CommunityHomeConsole } from '@o4o/operator-core-ui/modules/community-home';
import type { CommunityHomeClient } from '@o4o/operator-core-ui/modules/community-home';
import { communityManageApi } from '../../lib/api/communityAdmin';

const client: CommunityHomeClient = communityManageApi;

export default function CommunityManagementPage() {
  return (
    <CommunityHomeConsole
      client={client}
      tableIdPrefix="neture-community"
      title="커뮤니티 관리"
      subtitle="Community Hub 광고 및 스폰서 관리"
      accent="blue"
    />
  );
}
