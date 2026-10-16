import { useNavigate } from 'react-router-dom';
import type { SupplierProduct } from '../../../lib/api';
import { getAllowedOfferActions } from '../../../lib/supplierProductTypes';
import { supplierEditLink } from '../../../lib/supplierNavigation';

export default function SupplierProductTaskLinks({ product, returnTo }: Readonly<{
  product: SupplierProduct;
  returnTo: string;
}>) {
  const navigate = useNavigate();
  return (
    <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-slate-50 p-3 text-sm">
      <button type="button" onClick={() => navigate(supplierEditLink('/supplier/store-descriptions', { masterId: product.masterId, language: 'ko' }, returnTo))} className="rounded border bg-white px-3 py-2 text-blue-700">이 상품 설명서 만들기</button>
      <button type="button" onClick={() => navigate(supplierEditLink('/supplier/signage', { product: product.id }, returnTo))} className="rounded border bg-white px-3 py-2 text-blue-700">이 상품 사이니지 만들기</button>
      {product.approvalStatus === 'APPROVED' && <button type="button" onClick={() => navigate(supplierEditLink('/supplier/products/publication', { offer: product.id }, returnTo))} className="rounded border bg-white px-3 py-2 text-blue-700">서비스 게시</button>}
      {product.approvalStatus === 'APPROVED' && !getAllowedOfferActions(product).restricted && (
        <>
          <button type="button" onClick={() => navigate(supplierEditLink('/supplier/supply-proposals', { offer: product.id }, returnTo))} className="rounded border bg-white px-3 py-2 text-blue-700">공급 제안 만들기</button>
          <button type="button" onClick={() => navigate(supplierEditLink('/supplier/semi-franchise-events', { offer: product.id }, returnTo))} className="rounded border bg-white px-3 py-2 text-blue-700">세미프랜차이즈 이벤트 만들기</button>
          <button type="button" onClick={() => navigate(supplierEditLink('/supplier/semi-franchise-recruitments', { masterId: product.masterId }, returnTo))} className="rounded border bg-white px-3 py-2 text-blue-700">세미프랜차이즈 모집 만들기</button>
        </>
      )}
    </div>
  );
}
