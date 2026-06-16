/**
 * SupplierRecruitmentsPage — 공급자 판매자 모집 현황
 *
 * WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1
 *
 * 공급자가 생성한 판매자 모집 목록 + 상태 + 신청 카운트(전체/대기/승인/반려) + 대상 서비스/연결 제품을 본다.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { supplierRecruitmentApi, type SupplierRecruitment } from '../../lib/api/supplier';

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
  neture: 'Neture',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  recruiting: { label: '모집중', cls: 'bg-emerald-100 text-emerald-700' },
  closed: { label: '마감', cls: 'bg-slate-100 text-slate-500' },
};

export default function SupplierRecruitmentsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SupplierRecruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setRows(await supplierRecruitmentApi.listMine());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1
  const handleClose = async (id: string) => {
    if (!window.confirm('이 모집을 마감하면 신규 신청을 받을 수 없습니다.\n기존 신청 및 승인된 판매자의 주문 가능 상태는 유지됩니다.\n마감하시겠습니까?')) return;
    setClosingId(id);
    await supplierRecruitmentApi.close(id);
    setClosingId(null);
    await load();
  };

  // WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1
  const handleReopen = async (id: string) => {
    if (!window.confirm('이 모집을 다시 재개하면 신규 신청을 받을 수 있습니다.\n재개하시겠습니까?')) return;
    setClosingId(id);
    await supplierRecruitmentApi.reopen(id);
    setClosingId(null);
    await load();
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Megaphone className="w-6 h-6 text-blue-600" />
          판매자 모집 현황
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          생성한 판매자 모집과 신청 현황을 확인합니다. 모집은 제품 목록에서 PRIVATE 제품의 <strong>판매자 모집 연결</strong>로 생성할 수 있습니다.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-500">생성한 판매자 모집이 없습니다.</p>
          <button
            type="button"
            onClick={() => navigate('/supplier/products')}
            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            제품 목록으로 이동
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">제품</th>
                <th className="px-4 py-3">대상 서비스</th>
                <th className="px-4 py-3">수수료율</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3 text-center">신청</th>
                <th className="px-4 py-3 text-center">대기</th>
                <th className="px-4 py-3 text-center">승인</th>
                <th className="px-4 py-3">생성일</th>
                <th className="px-4 py-3 text-center">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const badge = STATUS_BADGE[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.productName}</td>
                    <td className="px-4 py-3 text-slate-600">{SERVICE_LABELS[r.serviceId] || r.serviceId || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.commissionRate ? `${r.commissionRate}%` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{r.applications.total}</td>
                    <td className="px-4 py-3 text-center">
                      {r.applications.pending > 0
                        ? <span className="text-amber-700 font-medium">{r.applications.pending}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.applications.approved > 0
                        ? <span className="text-emerald-700 font-medium">{r.applications.approved}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap space-x-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/supplier/recruitments/${r.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        신청자 보기
                      </button>
                      {r.status === 'recruiting' ? (
                        <button
                          type="button"
                          disabled={closingId === r.id}
                          onClick={() => handleClose(r.id)}
                          className="text-slate-500 hover:text-red-600 text-sm font-medium disabled:opacity-50"
                        >
                          마감
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={closingId === r.id}
                          onClick={() => handleReopen(r.id)}
                          className="text-slate-500 hover:text-emerald-600 text-sm font-medium disabled:opacity-50"
                        >
                          재개
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
