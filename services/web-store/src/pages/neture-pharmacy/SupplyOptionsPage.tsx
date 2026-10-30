/**
 * 공급 상품 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §4 · §6
 *
 * 매장 HUB 단계(취급 신청 → 승인 → 주문 가능) 없이 내 매장에서 바로 주문한다.
 *   GET  /api/v1/neture/pharmacy/store/supply-options?source=all|default|proposal|event|recruitment|sf:<key>&q=&page=
 *   POST /api/v1/neture/pharmacy/cart/items {kind, id, quantity}
 * 목록은 서버가 이 약국이 지금 이용 · 주문할 수 있는 공급 옵션만 돌려준다(미가입 협업체 항목 0).
 * 같은 제품의 여러 공급 경로를 그대로 나열한다 — 가격 비교 · 최저가 강조 · 자동 선택을 하지 않는다.
 */
import { useLatestList } from '../../hooks/useLatestList';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  neturePharmacyApi,
  pharmacyErrorMessage,
  type SupplyOption,
} from '../../api/neturePharmacy';
import { useStoreBusinesses } from './useStoreBusinesses';
import { StoreBusinessTabs, storeBusinessName } from './StoreBusinessTabs';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { StoreCommerceNavigation } from '../../components/store/StoreCommerceNavigation';
import { Notice, PharmacyPage, SUPPLY_KIND_LABEL, btn, formatDate, formatWon, pharmacyStorePath } from './shared';

const TABS: ReadonlyArray<{ source: string; label: string }> = [
  { source: 'all', label: '전체' },
  { source: 'default', label: '기본 공급' },
  { source: 'proposal', label: '공급 제안' },
  { source: 'event', label: '이벤트' },
  { source: 'recruitment', label: '모집 참여' },
];

const listErrorMessage = (error: unknown) => pharmacyErrorMessage(error, '공급 상품을 불러오지 못했습니다.');

const PAGE_SIZE = 50;

function Conditions({ o }: { o: SupplyOption }) {
  const parts: string[] = [];
  if (o.startAt || o.endAt) parts.push(`기간 ${formatDate(o.startAt)} ~ ${formatDate(o.endAt)}`);
  if (o.totalQuantity != null) parts.push(`총 수량 ${o.totalQuantity}`);
  if (o.perStoreLimit != null) parts.push(`매장당 ${o.perStoreLimit}개`);
  if (o.perOrderLimit != null) parts.push(`1회 ${o.perOrderLimit}개`);
  if (o.targetOrganizationId) parts.push('내 약국 대상 제안');
  if (o.termsSnapshot) {
    const t = o.termsSnapshot;
    parts.push(`배송비 ${formatWon(t.baseShippingFee)}`);
    parts.push(t.freeShippingThreshold === null ? '무료배송 기준 없음' : `${formatWon(t.freeShippingThreshold)} 이상 무료배송`);
    parts.push(`최소 주문 ${formatWon(t.minOrderAmount)} (동일 협업체·조건 합계)`);
  } else if (o.kind === 'proposal') parts.push('기존 제안 · 공급자 공통 배송정책 적용');
  return (
    <div className="text-xs text-gray-600">
      {o.note && <p className="whitespace-pre-line">{o.note}</p>}
      {parts.length > 0 && <p className="text-gray-500">{parts.join(' · ')}</p>}
      {!o.note && parts.length === 0 && <span className="text-gray-400">-</span>}
    </div>
  );
}

type SupplyPageProps = Readonly<{ navigation?: ReactNode }>;

function readSupplyQuery(params: URLSearchParams) {
  const source = params.get('source') || 'all';
  const explicitBusiness = params.get('business') || '';
  const business = explicitBusiness || (source.startsWith('sf:') ? source.slice(3) : '');
  const kind = source.startsWith('sf:') ? 'all' : source;
  const query = params.get('q')?.trim() || '';
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  return { source, explicitBusiness, business, kind, query, page, recruitment: params.get('recruitment') || '' };
}
function supplyEmptyText(query: string, business: string, name: string): string {
  if (query) return '검색 조건에 맞는 주문 상품이 없습니다.';
  if (business) return `${name}에서 지금 주문할 수 있는 상품이 없습니다.`;
  return '지금 주문할 수 있는 공급 상품이 없습니다.';
}

export default function SupplyOptionsPage(props: SupplyPageProps) {
  const { organizationId } = useUnifiedStore();
  const { user } = useAuth();
  return <SupplyOptionsSession key={`${user?.id}:${organizationId}`} {...props} />;
}
function SupplyOptionsSession({ navigation }: SupplyPageProps) {
  const [params, setParams] = useSearchParams();
  const { source, explicitBusiness, business, kind, query, page, recruitment } = readSupplyQuery(params);
  const proposal = params.get('proposal') || '';
  const [q, setQ] = useState(query);
  useEffect(() => { setQ(query); }, [query]);
  const businesses = useStoreBusinesses();
  const change = (values: Record<string, string>) => setParams(previous => {
    const next = new URLSearchParams(previous); next.delete('page'); next.delete('proposal');
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    return next;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const addBusy = useRef(false);

  const fetchList = useCallback(async () => {
    if (!proposal) return neturePharmacyApi.listSupplyOptions({ source, ...(explicitBusiness ? { business: explicitBusiness } : {}), ...(recruitment ? { recruitment } : {}), q: query || undefined, page, limit: PAGE_SIZE });
    if (!business || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(proposal)) throw new Error('연결된 공급 제안과 협업체를 확인해 주세요.');
    const option = await neturePharmacyApi.getSupplyOption('proposal', proposal);
    if (option.semiFranchiseKey !== business) throw new Error('이 협업체의 공급 제안이 아닙니다.');
    return { items: [option], total: 1 };
  }, [source, explicitBusiness, recruitment, query, page, proposal, business]);
  const { items, total, loading, error, load } = useLatestList<SupplyOption>(fetchList, listErrorMessage);


  const choose = (next: string) => change({ source: next, business, recruitment: '' });
  const rowKey = (o: SupplyOption) => `${o.kind}:${o.optionId}`;

  const add = async (o: SupplyOption) => {
    if (addBusy.current || !businesses.isCurrent()) return;
    const key = rowKey(o);
    const n = Number(qty[key] ?? '1');
    if (!Number.isInteger(n) || n < 1) {
      setActionError('수량을 1 이상의 정수로 입력해 주세요.');
      return;
    }
    addBusy.current = true; setAddingKey(key);
    setActionError(null);
    setMessage(null);
    try {
      await neturePharmacyApi.addCartItem(o.kind, o.optionId, n);
      if (businesses.isCurrent()) setMessage(`${o.productName} ${n}개를 장바구니에 담았습니다.`);
    } catch (e) {
      if (businesses.isCurrent()) setActionError(pharmacyErrorMessage(e, '장바구니에 담지 못했습니다.'));
    } finally {
      addBusy.current = false; setAddingKey(null);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PharmacyPage
      title="상품 주문"
      description="가입한 협업체와 참여 승인된 모집에서 주문할 상품을 찾습니다. 공급 경로별 조건과 단가를 확인해 선택하세요."
      actions={<Link className={btn.secondary} to={pharmacyStorePath('cart')}>장바구니 보기</Link>}
    >
      <StoreCommerceNavigation />
      {navigation}
      {proposal && <div className="mb-4 rounded border p-3"><p>협업체에서 선택한 제안을 현재 약국의 이용 자격으로 다시 확인합니다. 종료·정지되거나 대상 약국이 다르면 이용할 수 없습니다.</p><button type="button" className="min-h-11 text-blue-700" onClick={() => change({})}>이 협업체의 전체 공급 상품 보기</button></div>}
      <StoreBusinessTabs businesses={businesses} value={business} publicSource onChange={key => change({ business: key, source: kind, recruitment: '' })} />
      <details className="mb-4"><summary className="min-h-11 cursor-pointer content-center text-sm">공급 종류 선택</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2" role="tablist" aria-label="공급 경로">
        {TABS.map((t) => (
          <button
            key={t.source}
            type="button"
            role="tab"
            aria-selected={kind === t.source}
            onClick={() => choose(t.source)}
            className={`min-h-11 rounded-full border px-3 py-1 text-sm ${kind === t.source ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}

      </div></details>

      <form className="mb-4 flex max-w-md flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); change({ q: q.trim(), recruitment: '' }); }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            aria-label="주문 상품 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제품명, 공급자 검색"
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" className={btn.secondary}>검색</button>
        {(query || recruitment) && <button type="button" className={btn.secondary} onClick={() => change({ q: '', recruitment: '' })}>검색 초기화</button>}
      </form>

      {message && <Notice>{message} <Link className="underline" to={pharmacyStorePath('cart')}>장바구니로 이동</Link></Notice>}
      {actionError && <Notice tone="error">{actionError} 수량과 조건을 확인한 뒤 다시 담아 주세요.</Notice>}
      {recruitment && <p className="mb-3 text-sm text-slate-600">선택한 모집의 주문 가능 상품입니다. 검색 초기화로 다른 상품을 찾을 수 있습니다.</p>}
      {error && <Notice tone="error">{error} <button className={btn.secondary} onClick={load}>상품 다시 확인</button></Notice>}

      {loading && (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <p>{supplyEmptyText(query, business, storeBusinessName(businesses.rows, business))}</p>
          <p className="mt-1">등록·승인된 공급 조건의 상품을 이곳에서 주문합니다. 가입 상태는 이용 사업에서 확인할 수 있습니다.{' '}
            <Link className="underline" to={pharmacyStorePath('semiFranchises')}>협업체 보기</Link>
          </p>
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <p className="text-xs text-gray-500 md:hidden">표를 좌우로 밀어 공급조건과 담기 버튼을 확인하세요.</p>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-[800px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">제품</th>
                  <th className="px-4 py-3 font-medium">공급 경로</th>
                  <th className="px-4 py-3 font-medium">공급자</th>
                  <th className="px-4 py-3 font-medium">조건</th>
                  <th className="px-4 py-3 text-right font-medium">단가</th>
                  <th className="w-44 px-4 py-3 text-center font-medium">담기</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const key = rowKey(o);
                  return (
                    <tr key={key} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">{o.productName}</td>
                      <td className="px-4 py-3">
                        <div>{o.semiFranchiseName}</div>
                        <div className="text-xs text-gray-500">{SUPPLY_KIND_LABEL[o.kind] ?? o.kind}</div>
                      </td>
                      <td className="px-4 py-3">{o.supplierName}</td>
                      <td className="px-4 py-3"><Conditions o={o} /></td>
                      <td className="px-4 py-3 text-right">{formatWon(o.unitPrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={o.perOrderLimit ?? 1000}
                            aria-label={`${o.productName} 수량`}
                            value={qty[key] ?? '1'}
                            onChange={(e) => setQty((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-right"
                          />
                          <button className={btn.primary} disabled={addingKey !== null} onClick={() => add(o)}>
                            장바구니 담기
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button className={btn.secondary} disabled={page <= 1} onClick={() => change({ page: String(page - 1) })}>이전</button>
              <span>{page} / {lastPage}</span>
              <button className={btn.secondary} disabled={page >= lastPage} onClick={() => change({ page: String(page + 1) })}>다음</button>
            </div>
          )}
        </>
      )}
    </PharmacyPage>
  );
}
