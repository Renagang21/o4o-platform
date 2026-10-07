/**
 * 공급자 약국 commerce 입력 선택지 — 등록 승인(APPROVED)된 내 제품 · 운영 중 세미프랜차이즈
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 *
 * 제품 목록은 공급자 상품 목록 API(GET /neture/supplier/products) 를 그대로 쓴다.
 */
import { useEffect, useState } from 'react';
import { supplierApi, type SupplierProduct } from '../../lib/api/supplier';
import { neturePharmacySupplierApi } from '../../lib/api/neturePharmacy';

export interface SupplierPharmacyOptions {
  products: SupplierProduct[];
  semiFranchises: Array<{ key: string; name: string }>;
  loading: boolean;
  error: string | null;
}

export function useSupplierPharmacyOptions(): SupplierPharmacyOptions {
  const [state, setState] = useState<SupplierPharmacyOptions>({ products: [], semiFranchises: [], loading: true, error: null });

  useEffect(() => {
    let alive = true;
    Promise.all([supplierApi.getProducts(), neturePharmacySupplierApi.listSemiFranchises()])
      .then(([products, semiFranchises]) => {
        if (!alive) return;
        setState({
          products: products.filter((p) => p.approvalStatus === 'APPROVED'),
          semiFranchises: semiFranchises ?? [],
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (alive) setState({ products: [], semiFranchises: [], loading: false, error: '제품 · 세미프랜차이즈 목록을 불러오지 못했습니다.' });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function productLabel(p: SupplierProduct): string {
  const name = p.name || p.masterName || p.barcode || p.id;
  return p.priceGeneral ? `${name} (공급가 ${Number(p.priceGeneral).toLocaleString('ko-KR')}원)` : name;
}
