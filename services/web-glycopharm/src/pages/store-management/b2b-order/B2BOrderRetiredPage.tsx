/**
 * B2BOrderRetiredPage — 레거시 "B2B 주문"(/store/b2b-order) 은퇴 안내
 *
 * WO-O4O-GLYCOPHARM-LEGACY-B2B-ORDER-PAGE-RETIREMENT-V1
 *
 *   구 `B2BOrderPage` 는 레거시 약국 자체 상품 테이블(`glycopharm_products`)을 보여주는
 *   화면이었다. 이 테이블에는 공급자 organization · supplier offer · canonical 공급가가
 *   없고(`supplierName` 은 `manufacturer` 자유 텍스트), 화면의 "주문하기" 는 처음부터
 *   `toast('준비 중')` stub 이라 주문을 만든 적이 없다.
 *   → 조사 근거: `docs/checks/WO-O4O-GLYCOPHARM-B2B-ORDER-TO-CANONICAL-CART-ADOPTION-V1-CHECK.md`
 *
 *   같은 목적(공급자 상품 확인 · 거래 신청)의 canonical 화면이
 *   `/store/commerce/products`(PharmacyB2BProducts → 공통 SupplyCatalogHub)에 이미 있고,
 *   그쪽은 `supplier_product_offers` 기반이라 공급자·공급가가 식별된다.
 *   같은 기능을 두 화면으로 유지하지 않는다.
 *
 *   라우트는 남긴다 — 북마크·가이드 문구·외부 링크가 404 로 떨어지지 않도록
 *   은퇴 사실과 canonical 대안을 안내한다 (KPA `OnlineSalesOrdersRetiredPage` 선례 동형).
 */

import { Link } from 'react-router-dom';
import { PackageX } from 'lucide-react';

export function B2BOrderRetiredPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <PackageX size={40} className="mx-auto text-slate-400" />
      <h1 className="mt-4 text-lg font-semibold text-slate-800">
        이 화면은 <strong>상품 관리</strong>로 통합되었습니다
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        공급자 상품을 확인하고 거래를 신청하는 기능은
        <br />
        <strong>약국 상품·거래 &gt; 상품</strong> 화면에서 그대로 이용할 수 있습니다.
      </p>
      <div className="mt-8 flex flex-col items-center gap-2 text-sm">
        <Link to="/store/commerce/products" className="font-medium text-blue-600">
          공급자 상품 확인 · 거래 신청하기 →
        </Link>
        <Link to="/store/commerce/orders" className="font-medium text-blue-600">
          공급자에게 발주한 내역 보기 →
        </Link>
      </div>
    </div>
  );
}

export default B2BOrderRetiredPage;
