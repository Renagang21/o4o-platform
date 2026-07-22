/**
 * Screen Set 의약품 판별 가드 (공급자 HUB 게시·매장 가져오기 이중 가드)
 *
 * WO-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B
 *
 * 판별 축: `product_masters.regulatory_type = 'DRUG'`(전문 rx + 일반 otc) = 의약품.
 *   QUASI_DRUG(의약외품)·건강기능식품·MEDICAL_DEVICE·GENERAL/일반 = 의약품 아님.
 *   masterId 미존재 / regulatory_type NULL(미분류) = **보수적으로 의약품 취급**(약국 전용).
 *
 * 대상 참조: Screen Set 블록 중
 *   - content_list config.items[].sourceType='o4o_product_description' 의 masterId
 *   - product_content config.productRef 가 UUID 이면 masterId 후보
 * DB CHECK 에 넣지 않고(블록 조사 필요) **애플리케이션 이중 가드**로만 사용한다.
 */

import type { DataSource } from 'typeorm';

export interface ScreenSetMedicationInfo {
  /** 하나라도 regulatory_type='DRUG'. */
  hasDrug: boolean;
  /** masterId 참조가 있으나 미존재/regulatory_type NULL → 보수적 차단 대상. */
  unclassified: boolean;
  masterIds: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 블록(저장 config)에서 상품 master 참조를 수집. */
export function collectScreenSetMasterIds(blocks: Array<{ blockType?: string; config?: unknown }>): string[] {
  const ids = new Set<string>();
  for (const b of blocks ?? []) {
    const cfg = (b?.config && typeof b.config === 'object' && !Array.isArray(b.config)) ? (b.config as Record<string, unknown>) : {};
    if (b?.blockType === 'content_list') {
      const items = Array.isArray((cfg as any).items) ? (cfg as any).items : [];
      for (const it of items) {
        if (it && it.sourceType === 'o4o_product_description' && typeof it.masterId === 'string' && UUID_RE.test(it.masterId)) {
          ids.add(it.masterId);
        }
      }
    } else if (b?.blockType === 'product_content') {
      const ref = (cfg as any).productRef;
      if (typeof ref === 'string' && UUID_RE.test(ref)) ids.add(ref);
    }
  }
  return [...ids];
}

/** 블록의 상품 참조를 조회해 의약품 포함/미분류 여부를 판정. */
export async function analyzeScreenSetMedication(
  dataSource: DataSource,
  blocks: Array<{ blockType?: string; config?: unknown }>,
): Promise<ScreenSetMedicationInfo> {
  const masterIds = collectScreenSetMasterIds(blocks);
  if (masterIds.length === 0) return { hasDrug: false, unclassified: false, masterIds: [] };
  const rows: Array<{ id: string; regulatory_type: string | null }> = await dataSource.query(
    `SELECT id, regulatory_type FROM product_masters WHERE id = ANY($1::uuid[])`,
    [masterIds],
  );
  const byId = new Map(rows.map((r) => [r.id, r.regulatory_type]));
  let hasDrug = false;
  let unclassified = false;
  for (const id of masterIds) {
    if (!byId.has(id)) { unclassified = true; continue; } // 미존재 → 보수적
    const rt = byId.get(id);
    if (rt === 'DRUG') hasDrug = true;
    else if (rt == null) unclassified = true; // 분류 없음 → 보수적
  }
  return { hasDrug, unclassified, masterIds };
}

/** 게시(대상 설정) 가드: 의약품/미분류 포함 시 pharmacy 대상만 허용. */
export function medicationPublishTargetAllowed(
  info: ScreenSetMedicationInfo,
  hubTarget: string,
): { ok: boolean; reason?: string } {
  if (info.hasDrug || info.unclassified) {
    if (hubTarget !== 'pharmacy') {
      return {
        ok: false,
        reason: info.hasDrug
          ? '의약품이 포함되어 약국(pharmacy) 대상으로만 게시할 수 있습니다.'
          : '규제 분류를 확정할 수 없는 상품이 포함되어 약국(pharmacy) 대상으로만 게시할 수 있습니다.',
      };
    }
  }
  return { ok: true };
}

/** 매장 HUB 조회·가져오기 가드: 비약국(pharmacy 아님)은 의약품/미분류 세트 접근 불가. */
export function medicationStoreAccessAllowed(info: ScreenSetMedicationInfo, storeType: string): boolean {
  if ((info.hasDrug || info.unclassified) && storeType !== 'pharmacy') return false;
  return true;
}
