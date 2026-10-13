import { useState, useEffect } from 'react';
import { supplierApi, type SupplierProduct } from '../../../lib/api';
import { toast } from '@o4o/error-handling';

export const SERVICE_PRICE_LABELS: Record<string, string> = {
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
};

export function useSupplierServicePrices(
  product: SupplierProduct | null,
  open: boolean,
  onSaved?: () => void,
) {
  const [svcPrices, setSvcPrices] = useState<{
    priceGeneral: number;
    prices: Array<{ serviceKey: string; unitPrice: number }>;
  } | null>(null);
  const [svcPriceOpen, setSvcPriceOpen] = useState(false);
  const [svcPriceSaving, setSvcPriceSaving] = useState(false);
  const [svcPriceForm, setSvcPriceForm] = useState<Record<string, string>>({});

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: 서비스별 공급가 로드
  useEffect(() => {
    if (!product?.id || !open) {
      setSvcPrices(null);
      return;
    }
    let cancelled = false;
    supplierApi
      .getServicePrices(product.id)
      .then((r) => {
        if (!cancelled && r.success && r.data) setSvcPrices(r.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product?.id, open]);

  const supplyKeys = (product?.serviceKeys || []).filter((k) => k !== 'neture');
  const saveServicePrices = async () => {
    if (!product) return;
    setSvcPriceSaving(true);
    try {
      const prices: Array<{ serviceKey: string; unitPrice: number }> = [];
      for (const sk of supplyKeys) {
        const raw = (svcPriceForm[sk] ?? '').trim();
        if (!raw) continue; // 빈 값 = 기본가 적용(서비스가 미설정)
        const n = Number(raw);
        if (!Number.isInteger(n) || n <= 0) {
          toast.error(`${SERVICE_PRICE_LABELS[sk] || sk}: 0보다 큰 정수를 입력하세요`);
          setSvcPriceSaving(false);
          return;
        }
        prices.push({ serviceKey: sk, unitPrice: n });
      }
      const r = await supplierApi.setServicePrices(product.id, prices);
      if (!r.success) {
        toast.error(`서비스별 공급가 저장 실패: ${r.error || '오류'}`);
        setSvcPriceSaving(false);
        return;
      }
      const g = await supplierApi.getServicePrices(product.id);
      if (g.success && g.data) setSvcPrices(g.data);
      toast.success('서비스별 공급가가 저장되었습니다');
      setSvcPriceOpen(false);
      onSaved?.();
    } catch {
      toast.error('서비스별 공급가 저장 중 오류가 발생했습니다');
    } finally {
      setSvcPriceSaving(false);
    }
  };

  return {
    svcPrices,
    svcPriceOpen,
    setSvcPriceOpen,
    svcPriceSaving,
    svcPriceForm,
    setSvcPriceForm,
    saveServicePrices,
  };
}
