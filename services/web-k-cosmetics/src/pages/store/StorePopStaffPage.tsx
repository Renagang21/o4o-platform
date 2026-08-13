/**
 * StorePopStaffPage — 내 매장 POP 사본 관리 (K-Cosmetics)
 *
 * WO-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1
 *   KPA PharmacyPopPage parity — 운영자 HUB POP 에서 가져온 매장 사본(store_pops author_role='store')
 *   목록/수정/삭제. backend/DB/route 무변경(기존 마운트 /cosmetics/stores/:slug/pop/staff 재사용).
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1
 *   화면 본체를 @o4o/store-ui-core 의 StorePopStaffView 로 이관. 이 파일은 API adapter +
 *   RichTextEditor 주입만 담는 thin adapter 다.
 *
 * 범위 외: 매장 직접 POP 작성 / publish·archive / POP PDF 출력(StorePopPage 별도) / builder 연결.
 */

import { StorePopStaffView, type StorePopStaffApi } from '@o4o/store-ui-core';
import { RichTextEditor } from '@o4o/content-editor';
import {
  fetchStaffPopPosts,
  updateStaffPopPost,
  deleteStaffPopPost,
} from '@/api/popStaff';
import { getStoreSlug } from '@/api/storeHub';

const popStaffApi: StorePopStaffApi = {
  getStoreSlug,
  fetchStaffPopPosts,
  updateStaffPopPost,
  deleteStaffPopPost,
};

export default function StorePopStaffPage() {
  return (
    <StorePopStaffView
      api={popStaffApi}
      storeNoun="매장"
      renderEditor={({ value, onChange, disabled }) => (
        <RichTextEditor
          value={value}
          onChange={(c) => onChange(c.html)}
          placeholder="POP 본문을 작성하세요"
          minHeight="500px"
          editable={!disabled}
        />
      )}
    />
  );
}
