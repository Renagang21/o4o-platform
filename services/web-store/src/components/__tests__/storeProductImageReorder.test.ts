/**
 * @o4o/store-products-ui planStoreImageReorder — 공용 · 본인 이미지 혼합 목록 정렬 저장 (Codex P2, PR #1060)
 *
 * 서버는 본인 이미지(editable)의 sort_order 만 바꾸고, 목록은 `sort_order ASC, created_at ASC` 로 돌려준다.
 * 저장 후 다시 불러온 순서가 화면 순서와 같아야 한다.
 */
import { describe, expect, it } from 'vitest';
import { planStoreImageReorder, type ProductImageItem } from '@o4o/store-products-ui';

function img(id: string, sortOrder: number, editable: boolean, createdAt: string): ProductImageItem {
  return { id, imageUrl: `https://img/${id}`, gcsPath: id, type: 'detail', isPrimary: false, sortOrder, createdAt, editable };
}

/** 서버 저장(본인 이미지만 갱신) → GET 정렬을 흉내 낸다. */
function saveAndRefetch(server: ProductImageItem[], items: { id: string; sortOrder: number }[]): string[] {
  const updates = new Map(items.map((i) => [i.id, i.sortOrder]));
  return server
    .map((i) => (i.editable && updates.has(i.id) ? { ...i, sortOrder: updates.get(i.id)! } : i))
    .sort((a, b) => a.sortOrder - b.sortOrder || Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((i) => i.id);
}

const byId = (list: ProductImageItem[], ...ids: string[]) => ids.map((id) => list.find((i) => i.id === id)!);

describe('planStoreImageReorder', () => {
  it('[A(own,0), shared(1), B(own,2)] 에서 B 를 A 앞으로 끌면 공용 자리는 그대로, 저장 후 순서가 화면과 같다', () => {
    const server = [
      img('A', 0, true, '2026-01-01T00:00:00Z'),
      img('S', 1, false, '2026-01-02T00:00:00Z'),
      img('B', 2, true, '2026-01-03T00:00:00Z'),
    ];
    const dragged = byId(server, 'B', 'A', 'S');

    const { ordered, items } = planStoreImageReorder(server, dragged);

    expect(ordered.map((i) => i.id)).toEqual(['B', 'S', 'A']);
    expect(items.map((i) => i.id).sort()).toEqual(['A', 'B']);
    expect(items.find((i) => i.id === 'S')).toBeUndefined();
    expect(saveAndRefetch(server, items)).toEqual(ordered.map((i) => i.id));
  });

  it('기존 sort_order 가 겹친 데이터(삭제 후 업로드)에서도 저장 후 순서가 화면과 같다', () => {
    const server = [
      img('S1', 0, false, '2026-01-01T00:00:00Z'),
      img('A', 1, true, '2026-01-02T00:00:00Z'),
      img('B', 1, true, '2026-01-03T00:00:00Z'),
      img('S2', 5, false, '2026-01-04T00:00:00Z'),
    ];
    const dragged = byId(server, 'S1', 'B', 'A', 'S2');

    const { ordered, items } = planStoreImageReorder(server, dragged);

    expect(ordered.map((i) => i.id)).toEqual(['S1', 'B', 'A', 'S2']);
    expect(saveAndRefetch(server, items)).toEqual(ordered.map((i) => i.id));
  });

  it('본인 이미지만 있으면 끈 순서 그대로 저장된다', () => {
    const server = [
      img('A', 0, true, '2026-01-01T00:00:00Z'),
      img('B', 1, true, '2026-01-02T00:00:00Z'),
      img('C', 2, true, '2026-01-03T00:00:00Z'),
    ];
    const dragged = byId(server, 'C', 'A', 'B');

    const { ordered, items } = planStoreImageReorder(server, dragged);

    expect(ordered.map((i) => i.id)).toEqual(['C', 'A', 'B']);
    expect(saveAndRefetch(server, items)).toEqual(['C', 'A', 'B']);
  });

  it('공용 이미지만 있으면 저장할 항목이 없다', () => {
    const server = [img('S1', 0, false, '2026-01-01T00:00:00Z'), img('S2', 1, false, '2026-01-02T00:00:00Z')];
    const { ordered, items } = planStoreImageReorder(server, byId(server, 'S2', 'S1'));
    expect(ordered.map((i) => i.id)).toEqual(['S1', 'S2']);
    expect(items).toEqual([]);
  });
});
