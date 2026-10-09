/**
 * 공급 상품 — DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §4 · §6
 *
 * 매장 HUB 단계(취급 신청 → 승인 → 주문 가능) 없이 내 매장에서 바로 주문한다.
 *   GET  /api/v1/neture/pharmacy/store/supply-options?source=all|default|proposal|event|recruitment|sf:<key>&q=&page=
 *   POST /api/v1/neture/pharmacy/cart/items {kind, id, quantity}
 * 목록은 서버가 이 약국이 지금 이용 · 주문할 수 있는 공급 옵션만 돌려준다(미가입 세미프랜차이즈 항목 0).
 * 같은 제품의 여러 공급 경로를 그대로 나열한다 — 가격 비교 · 최저가 강조 · 자동 선택을 하지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  neturePharmacyApi,
  pharmacyErrorMessage,
  type SemiFranchiseRow,
  type SupplyOption,
} from '../../api/neturePharmacy';
import { BusinessTabs } from '../../components/BusinessTabs';
import { Notice, PharmacyPage, SUPPLY_KIND_LABEL, btn, formatDate, formatWon, pharmacyStorePath } from './shared';

const TABS: ReadonlyArray<{ source: string; label: string }> = [
  { source: 'all', label: '전체' },
  { source: 'default', label: 'pharmacy 기본 공급' },
  { source: 'proposal', label: '공급 제안' },
  { source: 'event', label: '이벤트' },
  { source: 'recruitment', label: '모집 참여' },
];

const PAGE_SIZE = 50;

function Conditions({ o }: { o: SupplyOption }) {
  const parts: string[] = [];
  if (o.startAt || o.endAt) parts.push(`기간 ${formatDate(o.startAt)} ~ ${formatDate(o.endAt)}`);
  if (o.totalQuantity != null) parts.push(`총 수량 ${o.totalQuantity}`);
  if (o.perStoreLimit != null) parts.push(`매장당 ${o.perStoreLimit}개`);
  if (o.perOrderLimit != null) parts.push(`1회 ${o.perOrderLimit}개`);
  if (o.targetOrganizationId) parts.push('내 약국 대상 제안');
  return (
    <div className="text-xs text-gray-600">
      {o.note && <p className="whitespace-pre-line">{o.note}</p>}
      {parts.length > 0 && <p className="text-gray-500">{parts.join(' · ')}</p>}
      {!o.note && parts.length === 0 && <span className="text-gray-400">-</span>}
    </div>
  );
}

export default function SupplyOptionsPage() {
  const [params, setParams] = useSearchParams();
  const source = params.get('source') || 'all';
  const setSource = (value: string) => { setParams(prev => { const p = new URLSearchParams(prev); p.set('source', value); return p; }); };
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SupplyOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [franchises, setFranchises] = useState<SemiFranchiseRow[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [addingKey, setAddingKey] = useState<string | null>(null);

  useEffect(() => {
    neturePharmacyApi.listSemiFranchises()
      .then((rows) => setFranchises(rows.filter((r) => r.membershipStatus === 'active')))
      .catch(() => setFranchises([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await neturePharmacyApi.listSupplyOptions({ source, q: query || undefined, page, limit: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(pharmacyErrorMessage(e, '공급 상품을 불러오지 못했습니다.'));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [source, query, page]);

  useEffect(() => { void load(); }, [load]);

  const choose = (next: string) => { setSource(next); setPage(1); };
  const rowKey = (o: SupplyOption) => `${o.kind}:${o.optionId}`;

  const add = async (o: SupplyOption) => {
    const key = rowKey(o);
    const n = Number(qty[key] ?? '1');
    if (!Number.isInteger(n) || n < 1) {
      setError('수량을 1 이상의 정수로 입력해 주세요.');
      return;
    }
    setAddingKey(key);
    setError(null);
    setMessage(null);
    try {
      await neturePharmacyApi.addCartItem(o.kind, o.optionId, n);
      setMessage(`${o.productName} ${n}개를 장바구니에 담았습니다.`);
    } catch (e) {
      setError(pharmacyErrorMessage(e, '장바구니에 담지 못했습니다.'));
    } finally {
      setAddingKey(null);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PharmacyPage
      title="공급 상품"
      description="가입한 세미프랜차이즈에서 지금 주문할 수 있는 공급 상품입니다. 같은 제품도 공급 경로마다 조건과 단가가 다를 수 있으니 확인 후 선택하세요."
      actions={<Link className={btn.secondary} to={pharmacyStorePath('cart')}>장바구니 보기</Link>}
    >
      <BusinessTabs businesses={franchises} value={source.startsWith('sf:') ? source.slice(3) : ''} onChange={key => { setSource(key ? `sf:${key}` : 'all'); setPage(1); }} />
      <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="공급 경로">
        {TABS.map((t) => (
          <button
            key={t.source}
            type="button"
            role="tab"
            aria-selected={source === t.source}
            onClick={() => choose(t.source)}
            className={`rounded-full border px-3 py-1 text-sm ${source === t.source ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}

      </div>

      <form className="mb-4 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제품명, 공급자 검색"
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm"
          />
        </div>
        <button type="submit" className={btn.secondary}>검색</button>
      </form>

      {message && <Notice>{message} <Link className="underline" to={pharmacyStorePath('cart')}>장바구니로 이동</Link></Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <p className="py-12 text-center text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <p>지금 주문할 수 있는 공급 상품이 없습니다.</p>
          <p className="mt-1">세미프랜차이즈 가입이 승인되면 그 세미프랜차이즈의 공급 상품이 여기에 나타납니다.{' '}
            <Link className="underline" to={pharmacyStorePath('semiFranchises')}>세미프랜차이즈 보기</Link>
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
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
                          <button className={btn.primary} disabled={addingKey === key} onClick={() => add(o)}>
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
              <button className={btn.secondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</button>
              <span>{page} / {lastPage}</span>
              <button className={btn.secondary} disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>다음</button>
            </div>
          )}
        </>
      )}
    </PharmacyPage>
  );
}
