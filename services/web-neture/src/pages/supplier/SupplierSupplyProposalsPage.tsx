/**
 * SupplierSupplyProposalsPage — 공급 제안 (/supplier/supply-proposals)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-4
 *   등록 승인된 내 제품을 세미프랜차이즈(또는 그 안의 특정 약국)에 공급 가격으로 제안한다.
 *   같은 제품 · 같은 세미프랜차이즈에 여러 제안을 낼 수 있다. 제안 가격은 수정할 수 없다 —
 *   가격을 바꾸려면 기존 제안을 종료하고 새 제안을 낸다. 승인은 담당 운영자가 한다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  neturePharmacySupplierApi as api,
  formatDateTime,
  formatWon,
  type SupplyProposal,
} from '../../lib/api/neturePharmacy';
import { EmptyRow, Message, PageHeader, StatusBadge, TD, TH } from '../../components/neture-pharmacy/PharmacyCommerceUi';
import { supplierReturnPath } from '../../lib/supplierNavigation';
import { useSupplierPharmacyOptions } from '../../components/neture-pharmacy/useSupplierPharmacyOptions';

import SupplierProposalDrafts from './SupplierProposalDrafts';

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function SupplierSupplyProposalsPage() {
  const options = useSupplierPharmacyOptions();
  const [params] = useSearchParams();
  const requestedProduct = params.get('offer');
  const [rows, setRows] = useState<SupplyProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [selectionError, setSelectionError] = useState(false);
  useEffect(() => {
    if (!requestedProduct || options.loading || options.error) return;
    const target = options.products.find((p) => p.id === requestedProduct);
    setSelectionError(!target);
  }, [requestedProduct, options.products, options.loading, options.error]);

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
      {params.has('returnTo') && <Link to={supplierReturnPath(params.get('returnTo'), '/supplier/products')} className="inline-block text-sm text-blue-700 underline">상품 업무로 돌아가기</Link>}
      {selectionError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">요청한 상품은 공급 가능한 승인 상품 목록에 없습니다. 다른 상품을 선택해 주세요.</p>}
      <PageHeader
        title="공급 제안"
        description="등록 승인된 제품의 협업체별 공급가와 대상을 정하고 등재 승인을 요청합니다. 담당 운영자 승인 후 해당 사업 회원 약국에 노출됩니다."
      />

      <SupplierProposalDrafts options={options} requestedProduct={requestedProduct} proposals={rows} onSubmitted={load} />

      <Message message={message} />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={TH}>제품</th>
              <th className={TH}>협업체</th>
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
                  <td className={TD}>{p.targetOrganizationName || '해당 협업체 활성 회원 약국 전체'}</td>
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
