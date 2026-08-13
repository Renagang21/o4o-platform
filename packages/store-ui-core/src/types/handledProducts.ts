/**
 * Cross-service contract for store handled products.
 *
 * A handled product is a product selected by a store for management/use.
 * It is not the supplier offer/cart/order object itself.
 */
export type HandledProductSource = 'listing' | 'local';

export interface HandledProductListItem {
  sourceType: HandledProductSource;
  sourceId: string;
  name: string;
  imageUrl: string | null;
  originLabel: string;
  ownerLabel: string;
  price: number | null;
  isActive: boolean;
  classificationCode: string;
  classificationLabel: string;
  updatedAt: string;
  managePath: string;
}

export interface HandledProductsPagination {
  page: number;
  limit: number;
  total: number;
}

export interface HandledProductRef {
  sourceType: HandledProductSource;
  sourceId: string;
}

export function handledProductKey(item: HandledProductRef): string {
  return `${item.sourceType}:${item.sourceId}`;
}
