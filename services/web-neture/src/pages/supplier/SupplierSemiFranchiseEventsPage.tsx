/**
 * SupplierSemiFranchiseEventsPage — 세미프랜차이즈 이벤트 (/supplier/semi-franchise-events)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-5
 *   등록 승인된 내 제품으로 세미프랜차이즈 이벤트를 신청한다(이벤트 가격 ≤ 공급가, 기간 필수).
 *   이벤트 가격은 수정할 수 없다 — 취소 후 다시 신청한다. 승인은 담당 운영자가 한다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  neturePharmacySupplierApi as api,
  formatDateTime,
  formatWon,
  type SemiFranchiseEvent,
} from '../../lib/api/neturePharmacy';
import { EmptyRow, INPUT, Message, PageHeader, StatusBadge, TD, TH } from '../../components/neture-pharmacy/PharmacyCommerceUi';
import { productLabel, useSupplierPharmacyOptions } from '../../components/neture-pharmacy/useSupplierPharmacyOptions';

type Msg = { type: 'success' | 'error'; text: string } | null;
const EMPTY = {
  offerId: '',
  semiFranchiseKey: '',
  eventPrice: '',
  startAt: '',
  endAt: '',
  totalQuantity: '',
  perStoreLimit: '',
  perOrderLimit: '',
};

const digits = (v: string) => v.replace(/[^0-9]/g, '');
const optionalInt = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function SupplierSemiFranchiseEventsPage() {
  const options = useSupplierPharmacyOptions();
  const [rows, setRows] = useState<SemiFranchiseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await api.listEvents()) ?? []);
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
    const eventPrice = Number(form.eventPrice);
    if (!form.offerId || !form.semiFranchiseKey || !(eventPrice > 0) || !form.startAt || !form.endAt) {
      setMessage({ type: 'error', text: '제품 · 세미프랜차이즈 · 이벤트 가격 · 기간을 입력하세요.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.createEvent({
        offerId: form.offerId,
        semiFranchiseKey: form.semiFranchiseKey,
        eventPrice,
        // datetime-local(브라우저 현지 시각) → ISO
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        totalQuantity: optionalInt(form.totalQuantity),
        perStoreLimit: optionalInt(form.perStoreLimit),
        perOrderLimit: optionalInt(form.perOrderLimit),
      });
      setMessage({ type: 'success', text: '이벤트를 신청했습니다. 담당 운영자 승인 후 진행됩니다.' });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (ev: SemiFranchiseEvent) => {
    if (!window.confirm(`${ev.productName} 이벤트를 취소할까요? 취소한 이벤트는 되살릴 수 없습니다.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.cancelEvent(ev.id);
      setMessage({ type: 'success', text: '이벤트를 취소했습니다.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="세미프랜차이즈 이벤트" description="등록 승인된 제품으로 세미프랜차이즈 약국 대상 이벤트를 신청합니다." />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-gray-900">새 이벤트 신청</h2>
        <p className="mb-3 text-xs text-gray-500">
          이벤트 가격은 공급가 이하여야 하며, 신청 후 수정할 수 없습니다. 바꾸려면 취소하고 다시 신청하세요.
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
            placeholder="이벤트 가격 (원)"
            value={form.eventPrice}
            onChange={(e) => setForm({ ...form, eventPrice: digits(e.target.value) })}
          />
          <div />
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">시작</span>
            <input type="datetime-local" className={INPUT} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">종료</span>
            <input type="datetime-local" className={INPUT} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          </label>
          <input
            className={INPUT}
            inputMode="numeric"
            placeholder="총 수량 (선택)"
            value={form.totalQuantity}
            onChange={(e) => setForm({ ...form, totalQuantity: digits(e.target.value) })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className={INPUT}
              inputMode="numeric"
              placeholder="매장당 한도 (선택)"
              value={form.perStoreLimit}
              onChange={(e) => setForm({ ...form, perStoreLimit: digits(e.target.value) })}
            />
            <input
              className={INPUT}
              inputMode="numeric"
              placeholder="주문당 한도 (선택)"
              value={form.perOrderLimit}
              onChange={(e) => setForm({ ...form, perOrderLimit: digits(e.target.value) })}
            />
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            신청하기
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
              <th className={TH}>이벤트 가격</th>
              <th className={TH}>기간</th>
              <th className={TH}>수량 · 한도</th>
              <th className={TH}>상태</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <EmptyRow colSpan={7} text="불러오는 중..." />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7} text="신청한 이벤트가 없습니다." />
            ) : (
              rows.map((ev) => (
                <tr key={ev.id}>
                  <td className={TD}>
                    <div className="font-medium text-gray-900">{ev.productName}</div>
                    <div className="text-xs text-gray-500">{formatDateTime(ev.createdAt)}</div>
                  </td>
                  <td className={TD}>{ev.semiFranchiseName}</td>
                  <td className={TD}>
                    {formatWon(ev.eventPrice)}
                    {ev.priceGeneral !== null && <div className="text-xs text-gray-500">공급가 {formatWon(ev.priceGeneral)}</div>}
                  </td>
                  <td className={TD}>
                    {formatDateTime(ev.startAt)}
                    <div className="text-xs text-gray-500">~ {formatDateTime(ev.endAt)}</div>
                  </td>
                  <td className={TD}>
                    <div className="text-xs">총 {ev.totalQuantity ?? '제한 없음'}</div>
                    <div className="text-xs">매장당 {ev.perStoreLimit ?? '-'} · 주문당 {ev.perOrderLimit ?? '-'}</div>
                  </td>
                  <td className={TD}>
                    <StatusBadge status={ev.status} />
                    {ev.reason && <div className="mt-1 text-xs text-gray-500">{ev.reason}</div>}
                  </td>
                  <td className={TD}>
                    {(ev.status === 'pending' || ev.status === 'approved') && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => cancel(ev)}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        취소
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
