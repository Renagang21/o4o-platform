/**
 * Store POP API — 매장 POP(홍보물) 생성
 *
 * @deprecated WO-O4O-STORE-CONTENTS-SELECTOR-INLINE-POP-TO-V2-MIGRATION-V1:
 *   StoreContentsSelector 의 "POP 만들기" 가 POP V2 handoff(/store/marketing/pop-v2) 로 이관되어
 *   import 소비처 0. legacy 즉시 PDF 축(POST /pharmacy/pop/generate) 과 함께 다음 회차(④ retirement)에서 제거한다.
 *   이번 회차는 consumer migration 이므로 파일은 KEEP_TEMPORARY.
 *
 * WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1
 *
 * 콘텐츠 목록에서 선택한 콘텐츠로 POP PDF 를 생성하고 매장 제작 자료(store_execution_assets,
 * assetType='file' / usageType='pop' / sourceType='generated')에 저장한다.
 * 기존 /store/marketing/pop 의 `POST /pharmacy/pop/generate` 계약을 재사용한다(신규 API 없음).
 *
 * origin → 백엔드 source 필드 매핑:
 *   - direct(kpa_store_contents)              → directContentItemIds
 *   - execution-asset(store_execution_assets) → libraryItemIds
 *   - snapshot(o4o_asset_snapshots)           → snapshotItemIds
 */
import { apiClient } from './client';

export interface GenerateStorePopResult {
  assetId: string;
  fileUrl: string;
  title: string;
}

export interface GenerateStorePopBody {
  libraryItemIds?: string[];
  directContentItemIds?: string[];
  snapshotItemIds?: string[];
  layout?: 'A4' | 'A5';
  title?: string;
  /** opt-in 저장 — true 시 store_execution_assets(file/pop)에 보관 + fileUrl 반환 */
  save?: boolean;
}

export async function generateStorePop(
  body: GenerateStorePopBody,
): Promise<{ success: boolean; data: GenerateStorePopResult }> {
  return apiClient.post('/pharmacy/pop/generate', body);
}
