/**
 * SupplierSupplyProposalsPage — 공급 제안 (/supplier/supply-proposals)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-4
 *   등록 승인된 내 제품을 세미프랜차이즈(또는 그 안의 특정 약국)에 공급 가격으로 제안한다.
 *   같은 제품 · 같은 세미프랜차이즈에 여러 제안을 낼 수 있다. 제안 가격은 수정할 수 없다 —
 *   가격을 바꾸려면 기존 제안을 종료하고 새 제안을 낸다. 승인은 담당 운영자가 한다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  neturePharmacySupplierApi as api,
  formatDateTime,
  formatWon,
  type SupplyProposal,
} from '../../lib/api/neturePharmacy';
import { EmptyRow, INPUT, Message, PageHeader, StatusBadge, TD, TH } from '../../components/neture-pharmacy/PharmacyCommerceUi';
import { productLabel, useSupplierPharmacyOptions } from '../../components/neture-pharmacy/useSupplierPharmacyOptions';

type Msg = { type: 'success' | 'error'; text: string } | null;
const EMPTY = { offerId: '', semiFranchiseKey: '', targetOrganizationId: '', unitPrice: '', note: '' };

export default function SupplierSupplyProposalsPage() {
  const options = useSupplierPharmacyOptions();
  const [rows, setRows] = useState<SupplyProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await api.listProposals()) ?? []);
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
    const unitPrice = Number(form.unitPrice);
    if (!form.offerId || !form.semiFranchiseKey || !Number.isInteger(unitPrice) || unitPrice <= 0) {
      setMessage({ type: 'error', text: '제품 · 세미프랜차이즈 · 공급 가격(원, 정수)을 입력하세요.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.createProposal({
        offerId: form.offerId,
        semiFranchiseKey: form.semiFranchiseKey,
        targetOrganizationId: form.targetOrganizationId.trim() || undefined,
        unitPrice,
        note: form.note.trim() || undefined,
      });
      setMessage({ type: 'success', text: '공급 제안을 냈습니다. 담당 운영자 승인 후 약국에 노출됩니다.' });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const end = async (p: SupplyProposal) => {
    if (!window.confirm(`${p.productName} 제안(${formatWon(p.unitPrice)})을 종료할까요? 종료한 제안은 되살릴 수 없습니다.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.endProposal(p.id);
      setMessage({ type: 'success', text: '제안을 종료했습니다.' });
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
        title="공급 제안"
        description="등록 승인된 제품을 세미프랜차이즈 약국에 공급 가격으로 제안합니다. 같은 제품에 여러 제안을 낼 수 있습니다."
      />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-gray-900">새 공급 제안</h2>
        <p className="mb-3 text-xs text-gray-500">
          제안 가격은 수정할 수 없습니다. 가격을 바꾸려면 기존 제안을 종료하고 새 제안을 내세요.
        </p>
        {options.error && <div className="mb-3 text-sm text-red-600">{options.error}</div>}
        <div className="grid gap-3 md:grid-cols-2">
          <select className={INPUT} value={form.offerId} onChange={(e) => setForm({ ...form, offerId: e.target.value })}>
            <option value="">{options.loading ? '제품 불러오는 중...' : '제품 선택 (등록 승인된 제품)'}</option>
            {options.products.map((p) => (
              <option key={p.id} value={p.id}>
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
            placeholder="공급 가격 (원)"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value.replace(/[^0-9]/g, '') })}
          />
          <input
            className={INPUT}
            placeholder="대상 약국 조직 ID (선택 — 비우면 세미프랜차이즈 전체)"
            value={form.targetOrganizationId}
            onChange={(e) => setForm({ ...form, targetOrganizationId: e.target.value })}
          />
          <input
            className={`${INPUT} md:col-span-2`}
            placeholder="메모 (선택)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            제안하기
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
              <th className={TH}>대상</th>
              <th className={TH}>제안 가격</th>
              <th className={TH}>상태</th>
              <th className={TH}>제안일</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <EmptyRow colSpan={7} text="불러오는 중..." />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7} text="낸 공급 제안이 없습니다." />
            ) : (
              rows.map((p) => (
                <tr key={p.id}>
                  <td className={TD}>
                    <div className="font-medium text-gray-900">{p.productName}</div>
                    {p.note && <div className="text-xs text-gray-500">{p.note}</div>}
                  </td>
                  <td className={TD}>{p.semiFranchiseName}</td>
                  <td className={TD}>{p.targetOrganizationName || '세미프랜차이즈 전체'}</td>
                  <td className={TD}>{formatWon(p.unitPrice)}</td>
                  <td className={TD}>
                    <StatusBadge status={p.status} />
                    {p.reason && <div className="mt-1 text-xs text-gray-500">{p.reason}</div>}
                  </td>
                  <td className={TD}>{formatDateTime(p.createdAt)}</td>
                  <td className={TD}>
                    {(p.status === 'pending' || p.status === 'approved') && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => end(p)}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        종료
                      </button>
                    )}
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
