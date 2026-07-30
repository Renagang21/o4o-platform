/**
 * ProductDetailPage (약국 경영자) — Pharmacy-Hub 제공 상품 상세
 *
 * WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §6-E
 *
 * 후속 WO(장바구니·주문)가 바로 연결할 수 있도록 offerId / masterId / supplierId /
 * 적용 단가를 화면에 노출한다. 담기·주문 버튼은 이번 WO 에서 만들지 않는다 (§9).
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { BRAND } from '../../config/service';

interface Identifier {
  type: string;
  value: string;
  isPrimary: boolean;
}

interface ProductDetail {
  offerId: string;
  masterId: string;
  name: string | null;
  barcode: string | null;
  brandName: string | null;
  manufacturerName: string | null;
  regulatoryType: string | null;
  regulatoryName: string | null;
  mfdsPermitNumber: string | null;
  specification: string | null;
  isRegulated: boolean;
  categoryName: string | null;
  supplierId: string;
  supplierName: string;
  priceGeneral: number;
  pharmacyHubUnitPrice: number | null;
  effectiveUnitPrice: number;
  imageUrl: string | null;
  businessShortDescription: string | null;
  businessDetailDescription: string | null;
  identifiers: Identifier[];
}

const won = (v: number | null | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString('ko-KR')}원` : '-';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-gray-100 px-3 py-2 text-sm">
      <span className="w-32 shrink-0 text-gray-500">{label}</span>
      <span className="break-all">{value ?? '-'}</span>
    </div>
  );
}

export default function StoreOwnerProductDetailPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/pharmacy-hub/store-owner/products/${offerId}`);
        if (alive) setData(res.data?.data ?? null);
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (alive) {
          setError(
            status === 404
              ? `${BRAND.name} 에 제공 중인 상품이 아닙니다.`
              : status === 403
                ? `${BRAND.name} 약국 경영자 승인이 완료된 계정만 조회할 수 있습니다.`
                : '상품을 불러오지 못했습니다.',
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [offerId]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-gray-500">불러오는 중…</div>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="mb-4 text-sm text-red-600">{error ?? '상품을 찾을 수 없습니다.'}</p>
        <Link to="/store-owner/products" className="text-sm text-gray-500 underline">
          상품 목록
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">{data.name ?? '-'}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {data.supplierName} 공급
        {data.isRegulated && (
          <span className="ml-2 rounded bg-amber-50 px-1 text-amber-700">규제 상품</span>
        )}
      </p>

      {data.imageUrl && (
        <img
          src={data.imageUrl}
          alt={data.name ?? ''}
          className="mb-6 max-h-72 rounded-lg border border-gray-200 object-contain"
        />
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <Row label="적용 공급가" value={<strong>{won(data.effectiveUnitPrice)}</strong>} />
        <Row
          label="기본 공급가"
          value={
            <>
              {won(data.priceGeneral)}
              {data.pharmacyHubUnitPrice != null && (
                <span className="ml-2 text-xs text-gray-400">
                  {BRAND.name} 공급가 {won(data.pharmacyHubUnitPrice)} 적용 중
                </span>
              )}
            </>
          }
        />
        <Row label="분류" value={data.categoryName ?? data.regulatoryType} />
        <Row label="제조사" value={data.manufacturerName} />
        <Row label="브랜드" value={data.brandName} />
        <Row label="규격" value={data.specification} />
        <Row label="바코드" value={data.barcode} />
        {data.isRegulated && <Row label="허가번호" value={data.mfdsPermitNumber} />}
        {data.regulatoryName && <Row label="허가 품목명" value={data.regulatoryName} />}
        <Row
          label="식별정보"
          value={
            data.identifiers.length === 0
              ? '-'
              : data.identifiers.map((i) => `${i.type}: ${i.value}`).join(' / ')
          }
        />
      </div>

      {(data.businessShortDescription || data.businessDetailDescription) && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">공급자 상품 설명</h2>
          {data.businessShortDescription && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: data.businessShortDescription }}
            />
          )}
          {data.businessDetailDescription && (
            <div
              className="prose prose-sm mt-3 max-w-none"
              dangerouslySetInnerHTML={{ __html: data.businessDetailDescription }}
            />
          )}
        </div>
      )}

      {/* 후속 WO 연결용 식별자 — 장바구니·주문은 이번 범위 밖 */}
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-500">
        <p>주문 · 장바구니는 후속 단계에서 연결됩니다.</p>
        <p className="mt-1 break-all">
          offerId {data.offerId} · masterId {data.masterId} · supplierId {data.supplierId}
        </p>
      </div>

      <p className="mt-6 text-sm">
        <Link to="/store-owner/products" className="text-gray-500 underline">
          상품 목록
        </Link>
      </p>
    </div>
  );
}
