/**
 * CommunityManagementPage (KPA) — Operator Home 편집 (광고/스폰서/하단 링크 관리)
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1:
 *   기존 KPA 구현(629L)을 @o4o/operator-core-ui/modules/community-home 의
 *   CommunityHomeConsole 로 승격하고, 본 파일은 wrapper 로만 남긴다.
 *   - 주입: communityManageApi(client) · accent · quickLinks 탭 · MediaPicker slot
 *   - API/CRUD/정렬/활성 상태/탭 구성 계약은 불변.
 *
 * 이전 이력:
 *   WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 *   WO-KPA-A-HOME-EXPOSURE-MENU-RELOCATION-AND-MEDIA-PICKER-V1
 *   WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1
 *   WO-O4O-KPA-OPERATOR-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1
 */

import { useState } from 'react';
import { CommunityHomeConsole, ImageFieldShell } from '@o4o/operator-core-ui/modules/community-home';
import type { CommunityHomeClient, CommunityHomeImageFieldProps } from '@o4o/operator-core-ui/modules/community-home';
import { communityManageApi } from '../../api/community';
import MediaPickerModal from '../../components/common/MediaPickerModal';

const PICKER_CONFIG: Record<CommunityHomeImageFieldProps['purpose'], { folder: string; title: string }> = {
  banner: { folder: 'banner', title: '광고 이미지 선택' },
  brand: { folder: 'brand', title: '스폰서 로고 선택' },
  icon: { folder: 'icon', title: '링크 아이콘 선택' },
};

/** KPA 전용 slot — 공통 ImageFieldShell + KPA 미디어 라이브러리 picker */
function KpaMediaImageField(props: CommunityHomeImageFieldProps) {
  const [open, setOpen] = useState(false);
  const config = PICKER_CONFIG[props.purpose];

  return (
    <>
      <ImageFieldShell
        label={props.label}
        value={props.value}
        onChange={props.onChange}
        onPickerOpen={() => setOpen(true)}
      />
      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(asset) => { props.onChange(asset.url); setOpen(false); }}
        title={config.title}
        defaultFolder={config.folder}
      />
    </>
  );
}

const client: CommunityHomeClient = communityManageApi;

export default function CommunityManagementPage() {
  return (
    <CommunityHomeConsole
      client={client}
      tableIdPrefix="kpa-community"
      title="Home 편집"
      subtitle="Home 화면의 Hero 배너, 광고, 스폰서, 하단 링크를 관리합니다"
      accent="blue"
      enableQuickLinks
      renderImageField={(props) => <KpaMediaImageField key={props.purpose} {...props} />}
    />
  );
}
