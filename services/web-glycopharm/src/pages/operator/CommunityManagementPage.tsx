/**
 * CommunityManagementPage (GlycoPharm) — Operator Home 편집
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1:
 *   기존 GlycoPharm 자체 구현(489L, VIEW_DUPLICATED)을 폐기하고
 *   @o4o/operator-core-ui/modules/community-home 의 CommunityHomeConsole 을 소비한다.
 *   서비스 차이는 client(communityApi) · accent · notice slot 으로만 주입한다.
 *
 * 이전 이력:
 *   WO-GLYCOPHARM-COMMUNITY-HUB-IMPLEMENTATION-V1
 *   WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1 (제한적 제공 안내)
 */

import { AlertCircle } from 'lucide-react';
import { CommunityHomeConsole } from '@o4o/operator-core-ui/modules/community-home';
import type { CommunityHomeClient } from '@o4o/operator-core-ui/modules/community-home';
import { communityManageApi } from '../../services/communityApi';

const client: CommunityHomeClient = communityManageApi;

/** WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1: 제한적 제공 안내 (서비스 고유 slot) */
function LimitedAvailabilityNotice() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-800">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">Home 편집 일부 기능 준비 중</div>
        <div className="mt-1 text-amber-700">
          현재는 광고/스폰서 기본 등록만 가능하며, 추가 Home 편집 항목은 후속 단계에서 제공됩니다.
        </div>
      </div>
    </div>
  );
}

export default function CommunityManagementPage() {
  return (
    <CommunityHomeConsole
      client={client}
      tableIdPrefix="glycopharm-community"
      title="Home 편집"
      subtitle="Home 화면의 Hero 배너, 광고, 스폰서를 관리합니다"
      accent="emerald"
      notice={<LimitedAvailabilityNotice />}
    />
  );
}
