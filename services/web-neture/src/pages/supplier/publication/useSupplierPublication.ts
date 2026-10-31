import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supplierApi, type SupplierProduct } from '../../../lib/api';

const EMPTY = { defaultSupplyEnabled: false, isPublic: false, serviceKeys: [] as string[], priceGeneral: '', prices: {} as Record<string, string> };
const ERRORS: Record<string, string> = {
  PRODUCT_NOT_APPROVED: '제품 등록 승인 후 게시할 수 있습니다.',
  PRODUCT_INACTIVE: '현재 이용 중지된 제품입니다. 운영자에게 확인해 주세요.',
  PRICE_REQUIRED: '게시할 제품의 일반 공급가를 0보다 큰 정수로 입력해 주세요.',
  INVALID_PRICE: '가격은 원 단위 정수로 입력해 주세요.',
  INVALID_PRICES: '서비스별 가격은 0보다 큰 정수로 입력해 주세요.',
  DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN: '의약품은 전체 공개할 수 없습니다. 약국 대상 서비스만 선택해 주세요.',
  DRUG_NON_PHARMACY_SERVICE: '선택한 대상은 의약품을 제공할 수 있는 약국 대상 서비스가 아닙니다.',
  DRUG_POLICY_UNAVAILABLE: '대상 서비스의 약국 정책을 확인할 수 없습니다. 운영자에게 문의해 주세요.',
};

export function useSupplierPublication() {
  const [params, setParams] = useSearchParams();
  const offerId = params.get('offer') ?? '';
  const currentId = useRef(offerId);
  currentId.current = offerId;
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [pricesReady, setPricesReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const product = products.find(p => p.id === offerId) ?? null;

  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError('');
    supplierApi.getProducts().then(rows => { if (live) setProducts(rows); })
      .catch(() => { if (live) setLoadError('제품 목록을 불러오지 못했습니다. 다시 시도해 주세요.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);

  useEffect(() => {
    let live = true;
    setPricesReady(false);
    setForm(product ? { ...EMPTY, defaultSupplyEnabled: !!product.defaultSupplyEnabled, isPublic: !!product.isPublic, serviceKeys: product.serviceKeys ?? [], priceGeneral: product.priceGeneral > 0 ? String(product.priceGeneral) : '' } : EMPTY);
    if (!product) return;
    supplierApi.getServicePrices(product.id).then(r => {
      if (!live) return;
      if (!r.success || !r.data) { setMessage({ error: true, text: '서비스 가격을 불러오지 못했습니다. 다시 시도해 주세요.' }); return; }
      setForm(f => ({ ...f, prices: Object.fromEntries(r.data!.prices.map(p => [p.serviceKey, String(p.unitPrice)])) }));
      setPricesReady(true);
    }).catch(() => { if (live) setMessage({ error: true, text: '서비스 가격을 불러오지 못했습니다.' }); });
    return () => { live = false; };
  }, [product, reload]);

  useEffect(() => { setMessage(null); }, [offerId]);

  const select = (id: string) => { const next = new URLSearchParams(params); next.set('offer', id); setParams(next); };
  const save = async () => {
    if (!product || saving || !pricesReady) return;
    const id = product.id;
    const priceGeneral = Number(form.priceGeneral);
    const publishing = form.defaultSupplyEnabled || form.isPublic || form.serviceKeys.length > 0;
    if (publishing && (!Number.isInteger(priceGeneral) || priceGeneral <= 0)) { setMessage({ error: true, text: ERRORS.PRICE_REQUIRED }); return; }
    const servicePrices = Object.entries(form.prices).filter(([, value]) => value !== '').map(([serviceKey, value]) => ({ serviceKey, unitPrice: Number(value) }));
    if (servicePrices.some(p => !Number.isInteger(p.unitPrice) || p.unitPrice <= 0)) { setMessage({ error: true, text: ERRORS.INVALID_PRICES }); return; }
    setSaving(true);
    setMessage(null);
    try {
      const result = await supplierApi.updateDistribution(id, { defaultSupplyEnabled: form.defaultSupplyEnabled, isPublic: form.isPublic, serviceKeys: form.serviceKeys, priceGeneral, servicePrices });
      if (currentId.current !== id) return;
      if (!result.success || !result.data) { setMessage({ error: true, text: ERRORS[result.error ?? ''] ?? '게시 설정을 저장하지 못했습니다. 입력을 확인하고 다시 시도해 주세요.' }); return; }
      // 화면의 입력과 결과 메시지를 유지하고 저장된 대상 요약만 갱신한다.
      const data = result.data;
      const savedState = {
        isPublic: data.isPublic,
        serviceKeys: data.serviceKeys,
        defaultSupplyEnabled: data.defaultSupplyEnabled,
        priceGeneral: data.priceGeneral,
        distributionType: data.distributionType,
        serviceApprovals: data.serviceApprovals.map(a => ({
          serviceKey: a.serviceKey, status: a.status, reason: a.reason,
        })),
      };
      setProducts(rows => rows.map(p => p.id === id ? { ...p, ...savedState } : p));
      setMessage({ error: false, text: '게시 설정을 저장했습니다. 서비스 승인이 필요한 대상은 승인 후 노출됩니다. 제품 승인과 이벤트는 변경하지 않았습니다.' });
    } catch {
      if (currentId.current === id) setMessage({ error: true, text: '저장하지 못했습니다. 입력을 유지했습니다. 다시 시도해 주세요.' });
    } finally { setSaving(false); }
  };
  return { params, offerId, products, product, loading, loadError, form, setForm, saving, pricesReady, message, select, save, retry: () => setReload(n => n + 1) };
}
