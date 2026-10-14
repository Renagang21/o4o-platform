import {
  getCatalog,
  getOrderable,
  type CatalogProduct,
  type OrderableProduct,
} from "../../../api/pharmacyProducts";
import {
  buildOrderableIndex,
  resolveOrderability,
  type WorktableOrderability,
} from "../../../utils/worktableCart";

export interface WorktableProduct {
  id: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  category: string | null;
  basePrice: number | null;
  orderability: WorktableOrderability;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 200;
const INCOMPLETE = "전체 상품 목록을 확인하지 못했습니다. 다시 시도해 주세요.";

function integer(value: unknown, minimum: number): number {
  if (
    typeof value !== "number" &&
    !(typeof value === "string" && /^\d+$/.test(value))
  )
    throw new Error(INCOMPLETE);
  const result = Number(value);
  if (value == null || !Number.isSafeInteger(result) || result < minimum)
    throw new Error(INCOMPLETE);
  return result;
}
function requireCurrent(isCurrent: () => boolean) {
  if (!isCurrent()) throw new Error("작업대 조회 문맥이 변경되었습니다.");
}

async function fetchCatalog(
  isCurrent: () => boolean,
): Promise<CatalogProduct[]> {
  const rows: CatalogProduct[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    requireCurrent(isCurrent);
    const response = await getCatalog({ limit: PAGE_SIZE, offset });
    requireCurrent(isCurrent);
    if (
      response.success !== true ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new Error(INCOMPLETE);
    const total = integer(response.pagination.total, 0),
      limit = integer(response.pagination.limit, 1);
    if (
      limit > PAGE_SIZE ||
      integer(response.pagination.offset, 0) !== offset ||
      response.data.length > limit
    )
      throw new Error(INCOMPLETE);
    rows.push(...response.data);
    if (offset + response.data.length >= total) return rows;
    if (response.data.length < limit) throw new Error(INCOMPLETE);
    offset += limit;
  }
  throw new Error(INCOMPLETE);
}

async function fetchOrderable(
  isCurrent: () => boolean,
): Promise<OrderableProduct[]> {
  const rows: OrderableProduct[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    requireCurrent(isCurrent);
    const response = await getOrderable({
      source: "all",
      page,
      limit: PAGE_SIZE,
    });
    requireCurrent(isCurrent);
    if (
      response.success !== true ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new Error(INCOMPLETE);
    const { pagination } = response;
    const total = integer(pagination.total, 0),
      limit = integer(pagination.limit, 1),
      totalPages = integer(pagination.totalPages, 1);
    if (
      integer(pagination.page, 1) !== page ||
      limit > PAGE_SIZE ||
      totalPages !== Math.max(1, Math.ceil(total / limit)) ||
      response.data.length > limit
    )
      throw new Error(INCOMPLETE);
    rows.push(...response.data);
    if (page >= totalPages) {
      if (rows.length < total) throw new Error(INCOMPLETE);
      return rows;
    }
    if (response.data.length < limit) throw new Error(INCOMPLETE);
  }
  throw new Error(INCOMPLETE);
}

/** Never derive NOT_ORDERABLE from a partial or failed authority lookup. */
export async function loadWorktableProducts(
  isCurrent: () => boolean,
): Promise<WorktableProduct[]> {
  const [catalog, orderable] = await Promise.all([
    fetchCatalog(isCurrent),
    fetchOrderable(isCurrent),
  ]);
  requireCurrent(isCurrent);
  const authority = buildOrderableIndex(orderable);
  const interest = new Map(
    catalog.filter((row) => row.isAdded).map((row) => [row.id, row]),
  );
  return [...interest.values()].map((row) => ({
    id: row.id,
    productName: row.name,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    category: row.category,
    basePrice: row.priceGold ?? row.priceGeneral ?? null,
    orderability: resolveOrderability(row.id, authority),
  }));
}
