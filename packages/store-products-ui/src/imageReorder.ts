/**
 * 매장 상품 이미지 정렬 계획 — 공용 이미지 위치를 고정한 채 본인 이미지 순서만 저장한다.
 *
 * 서버(GET /master/:masterId/images)는 `sort_order ASC, created_at ASC` 로 정렬하고,
 * PATCH /images/reorder 는 본인이 매장에서 올린 이미지(editable)의 sort_order 만 바꾼다.
 * 공용 이미지의 sort_order 는 바꿀 수 없으므로, 화면 전체 index 를 sortOrder 로 쓰면
 * 공용 이미지와 값이 겹쳐 다시 불러온 순서가 화면과 달라진다(Codex P2).
 *
 * 그래서:
 *  1) 공용 이미지는 서버 순서의 원래 자리에 그대로 두고, 본인 이미지는 새 상대 순서대로
 *     본인 이미지가 있던 자리를 차례로 채운다(화면도 이 순서로 맞춘다).
 *  2) 본인 이미지의 sortOrder 는 그 자리의 기존 값을 기본으로 하되, 앞 항목보다 뒤에 정렬되도록
 *     (같은 값이면 created_at 이 더 늦을 때만 허용) 필요한 만큼 올린다.
 */
import type { ProductImageItem } from './types.js';

export interface StoreImageReorderPlan {
  /** 저장 후 다시 불러왔을 때 기대되는 화면 순서 */
  ordered: ProductImageItem[];
  /** 서버에 보낼 본인 이미지의 sortOrder */
  items: { id: string; sortOrder: number }[];
}

function createdAtMs(img: ProductImageItem): number {
  const t = Date.parse(img.createdAt);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * @param serverOrder 서버가 준 현재 순서(sort_order, created_at 정렬)
 * @param dragged     드래그 후 화면 순서(같은 이미지 집합)
 */
export function planStoreImageReorder(
  serverOrder: ProductImageItem[],
  dragged: ProductImageItem[],
): StoreImageReorderPlan {
  const serverIds = new Set(serverOrder.map((img) => img.id));
  const ownInNewOrder = dragged.filter((img) => img.editable === true && serverIds.has(img.id));

  let k = 0;
  const ordered = serverOrder.map((img) => (img.editable === true ? ownInNewOrder[k++] ?? img : img));

  const items: { id: string; sortOrder: number }[] = [];
  let prev: { value: number; createdAt: number } | null = null;
  ordered.forEach((img, idx) => {
    if (img.editable !== true) {
      prev = { value: img.sortOrder, createdAt: createdAtMs(img) };
      return;
    }
    const slotValue = serverOrder[idx].sortOrder;
    let value = slotValue;
    if (prev) {
      const p: { value: number; createdAt: number } = prev;
      // 같은 값이면 created_at 이 더 늦어야 뒤에 온다.
      const minValue = createdAtMs(img) > p.createdAt ? p.value : p.value + 1;
      value = Math.max(slotValue, minValue);
    }
    items.push({ id: img.id, sortOrder: value });
    prev = { value, createdAt: createdAtMs(img) };
  });

  return { ordered, items };
}
