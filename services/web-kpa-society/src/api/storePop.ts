/**
 * Store POP API — 매장 POP(홍보물) 생성
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
