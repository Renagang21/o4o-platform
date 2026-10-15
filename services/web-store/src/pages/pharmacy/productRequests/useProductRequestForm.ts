import { useCallback, useRef, useState } from 'react';
import { toast } from '@o4o/error-handling';
import { searchO4oStandardProducts, registerStandardProductToStore, type O4oStandardProduct } from '../../../api/o4oStandardProducts';
import { submitProductRequest, resubmitProductRequest, type StoreProductRequest, type StoreProductRequestInput, type StoreRequestApiError } from '../../../api/storeProductRequests';
import { useLatestStoreRequest } from '../hooks/useLatestStoreRequest';
import { useRequestSession } from './requestSession';

interface FormState {
  productName: string; classification: string; barcode: string; noBarcode: boolean;
  manufacturer: string; spec: string; unit: string; imageUrl: string;
}
function initialForm(row?: StoreProductRequest | null): FormState {
  return { productName: row?.productName ?? '', classification: row?.classification?.code ?? '',
    barcode: row?.barcode ?? '', noBarcode: row?.noBarcode ?? false, manufacturer: row?.manufacturer ?? '',
    spec: row?.spec ?? '', unit: row?.unit ?? '', imageUrl: row?.imageUrl ?? '' };
}
export function useProductRequestForm({ organizationId, editRequest, onSubmitted, onClose }: {
  organizationId: string; editRequest?: StoreProductRequest | null; onSubmitted: () => void; onClose: () => void;
}) {
  const current = useRequestSession(organizationId);
  const latest = useLatestStoreRequest();
  const lock = useRef(false);
  const [step, setStep] = useState<'search' | 'form'>(editRequest ? 'form' : 'search');
  const [form, setForm] = useState(() => initialForm(editRequest));
  const [searchInput, setInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setResults] = useState<O4oStandardProduct[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [existingFound, setExistingFound] = useState(false);
  const patch = useCallback((change: Partial<FormState>) => {
    if (!lock.current) { setForm(value => ({ ...value, ...change })); setActionError(null); setExistingFound(false); }
  }, []);
  const setSearchInput = (value: string) => {
    if (lock.current) return;
    latest.cancel(); setActionError(null); setExistingFound(false); setInput(value); setResults([]); setSearched(false); setSearchError(null); setSearchLoading(false);
  };
  const runSearch = useCallback(async () => {
    if (lock.current || !current()) return;
    const q = searchInput.trim();
    if (!q) { toast.info('상품명 또는 바코드를 입력하세요.'); return; }
    const active = latest.begin();
    setSearchLoading(true); setSearched(true); setSearchError(null); setResults([]);
    try {
      const result = await searchO4oStandardProducts({ q, page: 1, limit: 20 });
      if (!Array.isArray(result?.items) || result.items.some(p => !p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' ||
        (p.manufacturerName != null && typeof p.manufacturerName !== 'string') ||
        (p.classification != null && typeof p.classification.label !== 'string'))) throw new Error('Invalid product search');
      if (active() && current()) setResults(result.items);
    } catch {
      if (active() && current()) setSearchError('검색에 실패했습니다. 다시 검색해 주세요.');
    } finally { if (active() && current()) setSearchLoading(false); }
  }, [current, latest, searchInput]);
  const goToForm = () => {
    if (lock.current) return;
    latest.cancel(); setSearchLoading(false);
    const q = searchInput.trim(); const barcode = /^\d{6,14}$/.test(q);
    setForm(value => ({ ...value, productName: barcode ? value.productName : value.productName || q,
      barcode: barcode ? q : value.barcode }));
    setActionError(null); setStep('form');
  };
  const handleRegisterExisting = async (product: O4oStandardProduct) => {
    if (lock.current || !current() || !searchResults.some(row => row.id === product.id)) return;
    lock.current = true; latest.cancel(); setSearchLoading(false); setRegisteringId(product.id); setActionError(null);
    try {
      const reply = await registerStandardProductToStore(product.id);
      if (reply?.success !== true) throw new Error('Unconfirmed listing');
      if (!current()) return;
      if (reply.message === 'ALREADY_LISTED') toast.info('이미 매장 경영활용 제품에 등록된 상품입니다.');
      else toast.success('매장 경영활용 제품으로 추가했습니다.');
      onSubmitted(); onClose();
    } catch (error) {
      if (current()) setActionError((error as StoreRequestApiError)?.code === 'NO_ACTIVE_MEMBERSHIP'
        ? '활성화된 매장 멤버십이 없어 추가할 수 없습니다.' : '추가 결과를 확인하지 못했습니다. 목록을 확인한 뒤 다시 시도해 주세요.');
    } finally { lock.current = false; if (current()) setRegisteringId(null); }
  };
  const handleSubmit = async () => {
    if (lock.current || !current()) return;
    if (editRequest && (!editRequest.editable || editRequest.displayStatus !== 'revision_requested')) { setActionError('보완 요청 상태에서만 다시 제출할 수 있습니다. 요청 현황을 확인해 주세요.'); return; }
    const productName = form.productName.trim();
    if (!productName) { setActionError('포장 표시 상품명을 입력하세요.'); return; }
    if (!form.classification) { setActionError('O4O 표준 분류를 선택하세요.'); return; }
    const barcode = form.barcode.trim();
    if (!barcode && !form.noBarcode) { setActionError('바코드를 입력하거나 ‘바코드 없음’을 선택하세요.'); return; }
    const input: StoreProductRequestInput = { productName, classification: form.classification,
      barcode: barcode || undefined, noBarcode: barcode ? false : form.noBarcode,
      manufacturer: form.manufacturer.trim() || undefined, spec: form.spec.trim() || undefined,
      unit: form.unit.trim() || undefined, imageUrl: form.imageUrl || undefined };
    lock.current = true; setSubmitting(true); setActionError(null); setExistingFound(false);
    try {
      const reply = editRequest ? await resubmitProductRequest(editRequest.id, input) : await submitProductRequest(input);
      if (typeof reply?.id !== 'string' || !reply.id || (editRequest && reply.id !== editRequest.id) || reply.displayStatus !== 'reviewing') throw new Error('Unconfirmed product request');
      if (!current()) return;
      toast.success(editRequest ? '보완 내용을 반영해 다시 제출했습니다.' : '신규 상품 등록 요청을 제출했습니다. 요청 현황에서 검토 결과를 확인할 수 있습니다.');
      onSubmitted(); onClose();
    } catch (error) {
      if (!current()) return;
      const code = (error as StoreRequestApiError)?.code;
      setExistingFound(code === 'EXISTING_PRODUCT_FOUND');
      setActionError(code === 'EXISTING_PRODUCT_FOUND' ? '이미 O4O 표준 상품에 등록된 바코드입니다. 기존 상품 추가에서 확인해 주세요.' :
        code === 'NOT_EDITABLE' ? '현재 보완 가능한 상태가 아닙니다. 요청 현황을 다시 확인해 주세요.' : '제출 결과를 확인하지 못했습니다. 요청 현황을 확인한 뒤 다시 시도해 주세요.');
    } finally { lock.current = false; if (current()) setSubmitting(false); }
  };
  return { step, setStep, form, patch, searchInput, setSearchInput, searched, searchLoading, searchError, searchResults,
    runSearch, goToForm, registeringId, handleRegisterExisting, submitting, handleSubmit, actionError, existingFound };
}
