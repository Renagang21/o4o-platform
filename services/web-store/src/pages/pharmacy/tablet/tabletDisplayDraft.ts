import type {
  DisplayItem,
  ProductPool,
  saveTabletDisplays,
} from "../../../api/tabletDisplays";

/** Internal draft operations for StoreTabletDisplaysPage; not a shared display contract. */
export interface TabletDisplayEntry {
  productType: "supplier" | "local";
  productId: string;
  productName: string;
  sortOrder: number;
  isVisible: boolean;
  contentId: string | null;
}
export type TabletDisplayPayload = Parameters<typeof saveTabletDisplays>[1];

export function resolveTabletDisplayEntries(
  items: DisplayItem[],
  pool: ProductPool,
): TabletDisplayEntry[] {
  return items.map((item) => ({
    productType: item.product_type,
    productId: item.product_id,
    productName:
      item.product_type === "supplier"
        ? pool.supplierProducts.find(
            (product) => product.id === item.product_id,
          )?.product_name || "(삭제된 공급 상품)"
        : pool.localProducts.find((product) => product.id === item.product_id)
            ?.name || "(삭제된 자체 상품)",
    sortOrder: item.sort_order,
    isVisible: item.is_visible,
    contentId: item.contentId ?? null,
  }));
}

export function toTabletDisplayPayload(
  entries: TabletDisplayEntry[],
): TabletDisplayPayload {
  return entries.map((entry, index) => ({
    productType: entry.productType,
    productId: entry.productId,
    sortOrder: index,
    isVisible: entry.isVisible,
    contentId: entry.contentId,
  }));
}

export function tabletDisplayPayloadsEqual(
  current: TabletDisplayPayload,
  saved: TabletDisplayPayload,
): boolean {
  return JSON.stringify(current) === JSON.stringify(saved);
}

export function appendSelectedTabletProducts(
  entries: TabletDisplayEntry[],
  products: { id: string; name: string; type: "supplier" | "local" }[],
  selectedIds: ReadonlySet<string>,
): TabletDisplayEntry[] {
  const added = products
    .filter((product) => selectedIds.has(product.id))
    .map((product, index) => ({
      productType: product.type,
      productId: product.id,
      productName: product.name,
      sortOrder: entries.length + index,
      isVisible: true,
      contentId: null,
    }));
  return added.length ? [...entries, ...added] : entries;
}

export function moveTabletDisplayEntry(
  entries: TabletDisplayEntry[],
  index: number,
  offset: -1 | 1,
): TabletDisplayEntry[] {
  const target = index + offset;
  if (
    index < 0 ||
    index >= entries.length ||
    target < 0 ||
    target >= entries.length
  )
    return entries;
  const next = [...entries];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((entry, sortOrder) => ({ ...entry, sortOrder }));
}
