/**
 * SupplierSemiFranchiseRecruitmentsPage — 세미프랜차이즈 모집 (/supplier/semi-franchise-recruitments)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-6
 *   등록 승인된 내 제품으로 세미프랜차이즈 취급매장 모집을 만든다(세미프랜차이즈별 제품당 1건).
 *   모집 조건은 담당 운영자가 승인한다. 약국 참여 신청의 승인 · 반려는 기존 판매자 모집 상세
 *   화면(/supplier/recruitments/:id)에서 한다 — 승인된 약국은 모집 공급가로 바로 주문할 수 있다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  neturePharmacySupplierApi as api,
  formatDateTime,
  formatWon,
  type SemiFranchiseRecruitment,
} from '../../lib/api/neturePharmacy';
import { EmptyRow, INPUT, Message, PageHeader, StatusBadge, TD, TH } from '../../components/neture-pharmacy/PharmacyCommerceUi';
import { productLabel, useSupplierPharmacyOptions } from '../../components/neture-pharmacy/useSupplierPharmacyOptions';

type Msg = { type: 'success' | 'error'; text: string } | null;
const EMPTY = { masterId: '', semiFranchiseKey: '', supplyUnitPrice: '', consumerPrice: '' };
const digits = (v: string) => v.replace(/[^0-9]/g, '');

export default function SupplierSemiFranchiseRecruitmentsPage() {
  const options = useSupplierPharmacyOptions();
  const [rows, setRows] = useState<SemiFranchiseRecruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await api.listRecruitments()) ?? []);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const supplyUnitPrice = Number(form.supplyUnitPrice);
    if (!form.masterId || !form.semiFranchiseKey || !(supplyUnitPrice > 0)) {
      setMessage({ type: 'error', text: '제품 · 세미프랜차이즈 · 모집 공급가를 입력하세요.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.createRecruitment({
        masterId: form.masterId,
        semiFranchiseKey: form.semiFranchiseKey,
        supplyUnitPrice,
        consumerPrice: form.consumerPrice ? Number(form.consumerPrice) : undefined,
      });
      setMessage({ type: 'success', text: '모집을 만들었습니다. 담당 운영자의 조건 승인 후 약국에 노출됩니다.' });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="세미프랜차이즈 모집"
        description="세미프랜차이즈 약국을 대상으로 취급매장을 모집합니다. 참여 승인된 약국은 모집 공급가로 바로 주문합니다."
      />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-gray-900">새 모집</h2>
        <p className="mb-3 text-xs text-gray-500">같은 제품은 세미프랜차이즈마다 모집 1건만 만들 수 있습니다.</p>
        {options.error && <div className="mb-3 text-sm text-red-600">{options.error}</div>}
        <div className="grid gap-3 md:grid-cols-2">
          <select className={INPUT} value={form.masterId} onChange={(e) => setForm({ ...form, masterId: e.target.value })}>
            <option value="">{options.loading ? '제품 불러오는 중...' : '제품 선택 (등록 승인된 제품)'}</option>
            {options.products
              .filter((p) => p.masterId)
              .map((p) => (
                <option key={p.id} value={p.masterId}>
                  {productLabel(p)}
                </option>
              ))}
          </select>
          <select className={INPUT} value={form.semiFranchiseKey} onChange={(e) => setForm({ ...form, semiFranchiseKey: e.target.value })}>
            <option value="">세미프랜차이즈 선택</option>
            {options.semiFranchises.map((sf) => (
              <option key={sf.key} value={sf.key}>
                {sf.name}
              </option>
            ))}
          </select>
          <input
            className={INPUT}
            inputMode="numeric"
            placeholder="모집 공급가 (원)"
            value={form.supplyUnitPrice}
            onChange={(e) => setForm({ ...form, supplyUnitPrice: digits(e.target.value) })}
          />
          <input
            className={INPUT}
            inputMode="numeric"
            placeholder="소비자가 (선택)"
            value={form.consumerPrice}
            onChange={(e) => setForm({ ...form, consumerPrice: digits(e.target.value) })}
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            모집 만들기
          </button>
        </div>
      </section>

      <Message message={message} />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={TH}>제품</th>
              <th className={TH}>세미프랜차이즈</th>
              <th className={TH}>모집 공급가</th>
              <th className={TH}>모집 상태</th>
              <th className={TH}>조건 승인</th>
              <th className={TH}>생성일</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <EmptyRow colSpan={7} text="불러오는 중..." />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7} text="만든 모집이 없습니다." />
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className={TD}>
                    <div className="font-medium text-gray-900">{r.productName}</div>
                    {r.consumerPrice ? <div className="text-xs text-gray-500">소비자가 {formatWon(r.consumerPrice)}</div> : null}
                  </td>
                  <td className={TD}>{r.semiFranchiseName}</td>
                  <td className={TD}>{formatWon(r.supplyUnitPrice)}</td>
                  <td className={TD}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className={TD}>
                    <StatusBadge status={r.exposureStatus} />
                    {r.exposureReviewNote && <div className="mt-1 text-xs text-gray-500">{r.exposureReviewNote}</div>}
                  </td>
                  <td className={TD}>{formatDateTime(r.createdAt)}</td>
                  <td className={TD}>
                    <Link to={`/supplier/recruitments/${r.id}`} className="text-xs font-medium text-primary-600 hover:underline">
                      참여 신청 관리
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
