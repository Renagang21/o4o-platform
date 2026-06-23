/**
 * 외국인 관광객 유입 파트너 관리 — KPA-Society 매장 측
 * WO-O4O-FOREIGN-VISITOR-PARTNER-MANAGEMENT-UI-V1
 *
 * ForeignVisitorPartner backend(/api/v1/foreign-visitor/partners) 소비 — 등록/조회/수정/활성·비활성.
 * 조회는 자유, 쓰기는 FOREIGN_VISITOR_SALES_SUPPORT ACTIVE 이용권 필요(없으면 버튼 disabled + 안내, backend 403 처리).
 * QR/랜딩/스캔 이벤트는 후속 WO(이번 범위 아님).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Pencil, Lock, AlertCircle, Globe, Users, Search, QrCode } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { checkSubscription } from '../../api/storeServiceSubscription';
import {
  getForeignVisitorPartners,
  createForeignVisitorPartner,
  updateForeignVisitorPartner,
  updateForeignVisitorPartnerStatus,
  PARTNER_TYPE_LABELS,
  PARTNER_TYPE_OPTIONS,
  PARTNER_STATUS_LABELS,
  type ForeignVisitorPartner,
  type ForeignVisitorPartnerType,
  type ForeignVisitorPartnerStatus,
  type PartnerWritePayload,
} from '../../api/foreignVisitorPartners';

const PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT';
const ENTRY_PATH = '/store/sales-channels/foreign-visitor';

type StatusFilter = 'ALL' | ForeignVisitorPartnerStatus;
type TypeFilter = 'ALL' | ForeignVisitorPartnerType;

function fmtDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function ForeignVisitorPartnersPage() {
  const [entitled, setEntitled] = useState<boolean | null>(null); // null=loading
  const [partners, setPartners] = useState<ForeignVisitorPartner[]>([]);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<ForeignVisitorPartner | null>(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription({ serviceKey: 'kpa', planCode: PLAN_CODE })
      .then((r) => setEntitled(r.active))
      .catch(() => setEntitled(false));
  }, []);

  const loadPartners = useCallback(async () => {
    setListState('loading');
    try {
      const { items } = await getForeignVisitorPartners({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        partnerType: typeFilter === 'ALL' ? undefined : typeFilter,
        search: search.trim() || undefined,
        limit: 100,
      });
      setPartners(items);
      setListState('ready');
    } catch {
      setListState('error');
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const canWrite = entitled === true;

  const handleToggleStatus = async (p: ForeignVisitorPartner) => {
    const next: ForeignVisitorPartnerStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateForeignVisitorPartnerStatus(p.id, next);
      toast.success(next === 'ACTIVE' ? '활성화했습니다.' : '비활성화했습니다.');
      void loadPartners();
    } catch (e: any) {
      if (e?.code === 'ENTITLEMENT_REQUIRED') {
        toast.error('이 기능은 외국인 관광객 판매 지원 이용권이 필요합니다.');
        setEntitled(false);
      } else {
        toast.error(e?.message || '상태 변경에 실패했습니다.');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-teal-700" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">유입 파트너 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            여행사·가이드·호텔 등 외국인 관광객 유입 파트너를 등록하고 관리합니다. 파트너별 QR 발급은 다음 단계에서 제공됩니다.
          </p>
        </div>
        <Link to={ENTRY_PATH} className="text-xs text-slate-400 hover:text-slate-600 shrink-0 mt-1">
          ← 판매지원
        </Link>
      </div>

      {/* Entitlement 안내 (미보유) */}
      {entitled === false && (
        <div className="mt-4 mb-2 flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              외국인 관광객 판매 지원 이용권이 활성화되면 파트너를 등록하고 관리할 수 있습니다. (목록 조회는 가능합니다.)
            </p>
            <Link
              to={ENTRY_PATH}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-700"
            >
              <Globe className="w-3.5 h-3.5" /> 외국인 관광객 판매 지원 시작하기
            </Link>
          </div>
        </div>
      )}

      {/* Filters + 등록 */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="파트너명·담당자·연락처 검색"
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 w-56 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="py-1.5 px-2.5 text-sm rounded-lg border border-slate-200 text-slate-700"
        >
          <option value="ALL">상태 전체</option>
          <option value="ACTIVE">활성</option>
          <option value="INACTIVE">비활성</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="py-1.5 px-2.5 text-sm rounded-lg border border-slate-200 text-slate-700"
        >
          <option value="ALL">유형 전체</option>
          {PARTNER_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{PARTNER_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          disabled={!canWrite}
          onClick={() => setCreating(true)}
          title={canWrite ? '' : '외국인 관광객 판매 지원 이용권이 필요합니다.'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white ${
            canWrite ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" /> 파트너 등록
        </button>
      </div>

      {/* List */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {listState === 'loading' && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> 파트너 목록을 불러오는 중...
          </div>
        )}

        {listState === 'error' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <p className="text-sm text-slate-600">파트너 정보를 불러오지 못했습니다.</p>
            <button type="button" onClick={() => void loadPartners()} className="text-sm text-teal-700 hover:underline">
              다시 시도
            </button>
          </div>
        )}

        {listState === 'ready' && partners.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 px-6 text-center">
            <Users className="w-7 h-7 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">아직 등록된 파트너가 없습니다.</p>
            <p className="text-xs text-slate-400">여행사, 가이드, 호텔 등 관광객 유입 파트너를 등록해 보세요.</p>
          </div>
        )}

        {listState === 'ready' && partners.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 font-medium">파트너명</th>
                <th className="px-3 py-2.5 font-medium">유형</th>
                <th className="px-3 py-2.5 font-medium">담당자</th>
                <th className="px-3 py-2.5 font-medium">연락처</th>
                <th className="px-3 py-2.5 font-medium">상태</th>
                <th className="px-3 py-2.5 font-medium">등록일</th>
                <th className="px-3 py-2.5 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{p.partnerName}</div>
                    {p.contactEmail && <div className="text-xs text-slate-400">{p.contactEmail}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{PARTNER_TYPE_LABELS[p.partnerType]}</td>
                  <td className="px-3 py-2.5 text-slate-600">{p.contactName || '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{p.contactPhone || '-'}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {PARTNER_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{fmtDate(p.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/store/sales-channels/foreign-visitor/partners/${p.id}/qr-codes`)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-white"
                      >
                        <QrCode className="w-3 h-3" /> QR 관리
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => setEditing(p)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Pencil className="w-3 h-3" /> 수정
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => void handleToggleStatus(p)}
                        className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {p.status === 'ACTIVE' ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(creating || editing) && (
        <PartnerFormModal
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void loadPartners();
          }}
          onEntitlementDenied={() => setEntitled(false)}
        />
      )}
    </div>
  );
}

interface ModalProps {
  initial: ForeignVisitorPartner | null;
  onClose: () => void;
  onSaved: () => void;
  onEntitlementDenied: () => void;
}

function PartnerFormModal({ initial, onClose, onSaved, onEntitlementDenied }: ModalProps) {
  const isEdit = !!initial;
  const [partnerType, setPartnerType] = useState<ForeignVisitorPartnerType>(initial?.partnerType ?? 'TRAVEL_AGENCY');
  const [partnerName, setPartnerName] = useState(initial?.partnerName ?? '');
  const [contactName, setContactName] = useState(initial?.contactName ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!partnerName.trim()) {
      toast.error('파트너명을 입력해 주세요.');
      return;
    }
    setSaving(true);
    const payload: PartnerWritePayload = {
      partnerType,
      partnerName: partnerName.trim(),
      contactName: contactName.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim() || null,
      memo: memo.trim() || null,
    };
    try {
      if (isEdit && initial) {
        await updateForeignVisitorPartner(initial.id, payload);
        toast.success('파트너 정보를 수정했습니다.');
      } else {
        await createForeignVisitorPartner(payload);
        toast.success('파트너를 등록했습니다.');
      }
      onSaved();
    } catch (e: any) {
      if (e?.code === 'ENTITLEMENT_REQUIRED') {
        toast.error('이 기능은 외국인 관광객 판매 지원 이용권이 필요합니다.');
        onEntitlementDenied();
        onClose();
      } else {
        toast.error(e?.message || '저장에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{isEdit ? '파트너 수정' : '파트너 등록'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">파트너 유형 *</label>
            <select value={partnerType} onChange={(e) => setPartnerType(e.target.value as ForeignVisitorPartnerType)} className={field}>
              {PARTNER_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{PARTNER_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">파트너명 *</label>
            <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className={field} placeholder="예: A여행사 / 김가이드" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">담당자명</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">연락처</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={field} placeholder="010-0000-0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">이메일</label>
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={field} placeholder="name@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">메모</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className={field} placeholder="예: 중국 단체 관광객 담당" />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEdit ? '저장' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForeignVisitorPartnersPage;
