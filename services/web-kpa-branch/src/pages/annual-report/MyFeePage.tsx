/**
 * MyFeePage — 회원 본인의 연회비 조회
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * 조회 전용이다. 회원이 자기 납부 상태를 바꾸는 경로는 없다 —
 * 납부는 운영자가 확인해 기록하는 사실이지 회원의 신고가 아니다.
 * 온라인 납부(PG) 버튼도 두지 않는다 (WO 원칙: 결제 기능 없음).
 */
import { useEffect, useState } from 'react';
import { listMyFees, feeCategoryLabel, FEE_STATUS_LABEL, type FeeLedgerItem, type FeeStatus } from '../../lib/api/branchFee';
import { describeApiError as describe } from '../../lib/errors';

const STATUS_CLASS: Record<FeeStatus, string> = {
  unpaid: 'bg-red-50 text-red-700',
  partial: 'bg-amber-50 text-amber-800',
  paid: 'bg-green-50 text-green-700',
  exempt: 'bg-gray-100 text-gray-600',
};

function won(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

export default function MyFeePage({ slug }: { slug: string }) {
  const [items, setItems] = useState<FeeLedgerItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    listMyFees(slug)
      .then((rows) => alive && setItems(rows))
      .catch((e) => {
        if (!alive) return;
        setItems(null);
        setError(describe(e));
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">내 회비</h1>
        <p className="mt-1 text-sm text-gray-500">
          분회가 기록한 연도별 회비 부과·납부 내역입니다. 문의는 분회 사무국으로 해주세요.
        </p>
      </header>

      {error && <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {items === null && !error ? (
        <p className="text-sm text-gray-500">불러오는 중입니다…</p>
      ) : items && items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          아직 부과된 회비가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">연도</th>
                <th className="py-2">회비구분</th>
                <th className="py-2 text-right">부과액</th>
                <th className="py-2 text-right">납부액</th>
                <th className="py-2 text-right">미납액</th>
                <th className="py-2">납부일</th>
                <th className="py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="py-2 font-medium text-gray-900">{row.year}년</td>
                  <td className="py-2 text-gray-600">{feeCategoryLabel(row.feeCategory)}</td>
                  <td className="py-2 text-right text-gray-800">{won(row.assessedAmount)}</td>
                  <td className="py-2 text-right text-gray-800">{won(row.paidAmount)}</td>
                  <td className="py-2 text-right text-gray-800">{won(row.outstanding)}</td>
                  <td className="py-2 text-gray-600">
                    {row.paidAt ? new Date(row.paidAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.status]}`}
                    >
                      {FEE_STATUS_LABEL[row.status]}
                    </span>
                    {row.memo && <div className="mt-1 text-xs text-gray-500">{row.memo}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
