/**
 * Store Local Products Management Page (K-Cosmetics)
 *
 * WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V2:
 *   공통 StoreLocalProductsManager(@o4o/store-ui-core) 위임. service api client + 문맥 라벨만 주입.
 *   (Local Products 는 Commerce Object 가 아님 — Checkout/Order/Cart 연결 금지.)
 */

import { StoreLocalProductsManager } from '@o4o/store-ui-core';
import {
  fetchLocalProducts,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
} from '@/services/localProductApi';

export default function StoreLocalProductsPage() {
  return (
    <StoreLocalProductsManager
      api={{ fetchLocalProducts, createLocalProduct, updateLocalProduct, deleteLocalProduct }}
      labels={{ categoryPlaceholder: '예: 스킨케어, 메이크업' }}
    />
  );
}
