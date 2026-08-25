/**
 * OnlineSalesOrdersRetiredPage — 온라인 판매 "주문 관리"(seller) 은퇴 안내
 *
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
 *
 *   `OnlineSalesOrdersPage` / `OnlineSalesOrderDetailPage` 는
 *   `checkout_orders` 를 **sellerOrganizationId 기준**으로 조회하던 화면이었다.
 *   즉 "매장이 소비자에게 판매한 주문" 축으로,
 *   `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §2-2 · §3 이 금지하는 영역이다.
 *
 *   백엔드 `GET|PATCH /kpa/checkout/store-orders*` 는 본 WO 에서 제거되었다.
 *   메뉴 SSOT(`packages/store-ui-core/src/config/storeMenuConfig.ts`)의 '주문 관리' 행 제거는
 *   해당 파일이 **다른 세션의 WIP** 이라 이번 작업에서 건드리지 않았다(→ CHECK 의 DEFERRED 항목).
 *   따라서 메뉴가 404 로 떨어지지 않도록 라우트는 남기고 은퇴 사실을 안내한다.
 *
 *   구매(발주) 내역은 `/store/commerce/orders` (buyerId 축) 에서 계속 확인한다.
 */

import { Link } from 'react-router-dom';
import { PackageX } from 'lucide-react';

export function OnlineSalesOrdersRetiredPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <PackageX size={40} className="mx-auto text-slate-400" />
      <h1 className="mt-4 text-lg font-semibold text-slate-800">
        온라인 판매 주문 관리는 제공하지 않습니다
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        O4O는 매장 경영자를 위한 소비자 전자상거래를 제공하지 않습니다.
        <br />
        현장 판매·결제는 매장의 <strong>POS</strong>에서,
        온라인 판매는 <strong>네이버 스마트스토어·쿠팡 등 외부 판매채널</strong>에서 이루어집니다.
      </p>
      <div className="mt-8 flex flex-col items-center gap-2 text-sm">
        <Link to="/store/commerce/orders" className="font-medium text-blue-600">
          공급자에게 발주한 내역 보기 →
        </Link>
        <Link to="/store/sales-channels" className="font-medium text-blue-600">
          외부 판매채널 연동 관리 →
        </Link>
      </div>
    </div>
  );
}

export default OnlineSalesOrdersRetiredPage;
