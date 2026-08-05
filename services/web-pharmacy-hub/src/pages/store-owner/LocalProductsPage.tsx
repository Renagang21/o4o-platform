/**
 * LocalProductsPage (약국 경영자) — 매장 자체 상품
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
 *
 * O4O 와 무관하게 약국이 직접 등록·관리하는 상품이다.
 *   - 공급 상품(/store-owner/products, B2B 구매 대상) 과 다른 축
 *   - 매장 경영활용 제품(/store-owner/handled-products, O4O 제품 취급) 과도 다른 축
 *
 * 화면은 공통 `StoreLocalProductsManager`(@o4o/store-ui-core)를 그대로 쓴다 —
 * Pharmacy-Hub 는 API adapter 와 라벨·액션만 주입한다(UI 복제 0).
 * 삭제는 **비활성화(soft delete)** 다. 물리 삭제 경로는 만들지 않는다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreLocalProductsManager } from '@o4o/store-ui-core';
import type { StoreLocalProductsApi } from '@o4o/store-ui-core';
import {
  fetchLocalProducts,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
  type LocalProductsStoreConnection,
} from '../../lib/api/pharmacyHubLocalProducts';
import { StoreConnectionNotice } from '../../components/store-owner/StoreConnectionNotice';

const localProductsApi: StoreLocalProductsApi = {
  fetchLocalProducts: async (params) => {
    const page = await fetchLocalProducts(params);
    return { items: page.items, total: page.total };
  },
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
};

export default function StoreOwnerLocalProductsPage() {
  const [connection, setConnection] = useState<LocalProductsStoreConnection | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 매장 연결 상태를 먼저 확인한다. 미연결·다중 상태에서 등록·수정을 시도하면
  // 서버가 409 로 막으므로, 화면 단에서 안내만 하고 편집 UI 를 열지 않는다.
  useEffect(() => {
    let cancelled = false;
    fetchLocalProducts({ page: 1, limit: 1 })
      .then((page) => {
        if (!cancelled) setConnection(page.storeConnection);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '매장 정보를 확인하지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-gray-500">불러오는 중…</p>
      </div>
    );
  }

  if (connection.status !== 'connected') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-1 text-xl font-bold">매장 자체 상품</h1>
        <p className="mb-6 text-sm text-gray-500">
          O4O 주문과 무관하게 매장에서 직접 등록·진열하는 상품입니다.
        </p>
        <StoreConnectionNotice connection={connection} />
        <p className="mt-6 text-sm">
          <Link to="/store-owner" className="text-gray-500 underline">
            약국 경영자 홈
          </Link>
        </p>
      </div>
    );
  }

  return (
    <StoreLocalProductsManager
      api={localProductsApi}
      labels={{
        title: '매장 자체 상품',
        description:
          'O4O 주문과 무관하게 약국에서 직접 등록·진열하는 상품입니다. 주문·결제와 연결되지 않습니다.',
        categoryPlaceholder: '예: 건강기능식품, 의약외품',
      }}
      // Pharmacy-Hub 에는 `/store/*` 후속 화면이 없다 — dead link 대신 버튼을 숨긴다.
      actions={{ onTabletDisplays: null, onMarketingAssets: null, onCreatePop: null }}
    />
  );
}
