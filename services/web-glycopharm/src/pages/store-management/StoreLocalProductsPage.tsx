/**
 * Store Local Products Management Page (GlycoPharm)
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
} from '@/api/localProducts';

export default function StoreLocalProductsPage() {
  return (
    <StoreLocalProductsManager
      api={{ fetchLocalProducts, createLocalProduct, updateLocalProduct, deleteLocalProduct }}
      labels={{ categoryPlaceholder: '예: 건강기능식품, 의약품' }}
    />
  );
}
