/**
 * contentStoreImport — 커뮤니티 콘텐츠 → 내 자료함 가져가기 (공용 최소 단위)
 *
 * WO-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1
 *
 * 배경:
 *   가져가기 로직이 ContentListPage 안에 인라인으로만 존재해 콘텐츠 상세(/content/:id)에서는
 *   같은 동작을 쓸 수 없었다(IR-...-USABILITY-AND-FLOW-AUDIT-V1 C4).
 *   상세에 로직을 복사하지 않도록 호출 1개 + 판정 1개 + 라벨만 최소로 공통화한다.
 *
 * 정책(기존 유지 — 본 WO에서 변경 없음):
 *   - 가져가기 = 독립 사본 생성(o4o_asset_snapshots). 원본과 단절, 재복사 허용.
 *   - reusable_policy='restricted' 는 차단. UI 는 defense-in-depth 이고
 *     서버(KpaAssetResolver.resolveContent)가 authoritative 하게 재검증한다.
 *   - 권한은 백엔드 `/assets/copy` 가드(인증 + kpa:admin/operator/pharmacist/store_owner)를 따른다.
 */

import { assetSnapshotApi } from './assetSnapshot';

export const CONTENT_IMPORT_LABEL = '내 자료함 가져가기';
export const CONTENT_IMPORT_RESTRICTED_LABEL = '내 자료함 가져가기 (불가)';

/** 작성자가 매장 가져가기를 차단한 콘텐츠인지 */
export function isContentImportRestricted(
  item: { reusable_policy?: 'platform' | 'restricted' } | null | undefined,
): boolean {
  return item?.reusable_policy === 'restricted';
}

/** 커뮤니티 콘텐츠(kpa_contents) 1건을 내 자료함으로 복사 */
export function importContentToStore(contentId: string) {
  return assetSnapshotApi.copy({
    sourceService: 'kpa',
    sourceAssetId: contentId,
    assetType: 'content',
  });
}
