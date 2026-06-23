/**
 * 외국인 관광객 유입 파트너 — 제휴마케팅 QR 관리 (KPA-Society 매장 측)
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1
 *
 * 파트너별 QR 발급/목록/보기/다운로드/수정/활성·비활성. backend /api/v1/foreign-visitor.
 * 쓰기는 FOREIGN_VISITOR_SALES_SUPPORT ACTIVE 필요(없으면 disabled + 안내, backend 403 처리).
 * landing 본 구현/scan event 는 후속 — QR URL 은 생성되나 랜딩은 다음 단계에서 연결.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, Plus, Pencil, QrCode, Download, Copy, Check, AlertCircle, Lock, Globe } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { checkSubscription } from '../../api/storeServiceSubscription';
import { getForeignVisitorPartner, type ForeignVisitorPartner } from '../../api/foreignVisitorPartners';
import {
  getPartnerQrCodes,
  createPartnerQrCode,
  updatePartnerQrCode,
  updatePartnerQrCodeStatus,
  getPartnerQrSvg,
  type ForeignVisitorPartnerQrCode,
  type QrWritePayload,
} from '../../api/foreignVisitorPartnerQrCodes';

const PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT';
const ENTRY_PATH = '/store/sales-channels/foreign-visitor';
const PARTNERS_PATH = '/store/sales-channels/foreign-visitor/partners';

function fmtDate(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function validityLabel(q: ForeignVisitorPartnerQrCode): string {
  if (!q.validFrom && !q.validTo) return '상시';
  return `${fmtDate(q.validFrom)} ~ ${fmtDate(q.validTo)}`;
}

export function ForeignVisitorPartnerQrCodesPage() {
  const { partnerId = '' } = useParams();
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [partner, setPartner] = useState<ForeignVisitorPartner | null>(null);
  const [qrCodes, setQrCodes] = useState<ForeignVisitorPartnerQrCode[]>([]);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ForeignVisitorPartnerQrCode | null>(null);
  const [viewing, setViewing] = useState<ForeignVisitorPartnerQrCode | null>(null);

  useEffect(() => {
    checkSubscription({ serviceKey: 'kpa', planCode: PLAN_CODE }).then((r) => setEntitled(r.active)).catch(() => setEntitled(false));
    getForeignVisitorPartner(partnerId).then(setPartner).catch(() => setPartner(null));
  }, [partnerId]);

  const load = useCallback(async () => {
    setListState('loading');
    try {
      setQrCodes(await getPartnerQrCodes(partnerId));
      setListState('ready');
    } catch {
      setListState('error');
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canWrite = entitled === true;

  const handleToggle = async (q: ForeignVisitorPartnerQrCode) => {
    const next = q.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updatePartnerQrCodeStatus(q.id, next);
      toast.success(next === 'ACTIVE' ? '활성화했습니다.' : '비활성화했습니다.');
      void load();
    } catch (e: any) {
      if (e?.code === 'ENTITLEMENT_REQUIRED') { toast.error('이 기능은 외국인 관광객 판매 지원 이용권이 필요합니다.'); setEntitled(false); }
      else toast.error(e?.message || '상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
          <QrCode className="w-6 h-6 text-teal-700" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">제휴마케팅 QR 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            {partner ? <span className="font-medium text-slate-700">{partner.partnerName}</span> : '파트너'} 의 유입 식별 QR을 발급하고 관리합니다.
            이 QR은 파트너 유입 식별용이며 결제 기능은 포함되지 않습니다.
          </p>
        </div>
        <Link to={PARTNERS_PATH} className="text-xs text-slate-400 hover:text-slate-600 shrink-0 mt-1">← 파트너 목록</Link>
      </div>

      {entitled === false && (
        <div className="mt-4 mb-2 flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">외국인 관광객 판매 지원 이용권이 활성화되면 QR을 발급·수정할 수 있습니다. (조회는 가능합니다.)</p>
            <Link to={ENTRY_PATH} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-700">
              <Globe className="w-3.5 h-3.5" /> 외국인 관광객 판매 지원 시작하기
            </Link>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end">
        <button
          type="button"
          disabled={!canWrite}
          onClick={() => setCreating(true)}
          title={canWrite ? '' : '외국인 관광객 판매 지원 이용권이 필요합니다.'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white ${
            canWrite ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" /> QR 발급
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {listState === 'loading' && (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> QR 목록을 불러오는 중...</div>
        )}
        {listState === 'error' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <p className="text-sm text-slate-600">QR 정보를 불러오지 못했습니다.</p>
            <button type="button" onClick={() => void load()} className="text-sm text-teal-700 hover:underline">다시 시도</button>
          </div>
        )}
        {listState === 'ready' && qrCodes.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 px-6 text-center">
            <QrCode className="w-7 h-7 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">아직 발급된 QR이 없습니다.</p>
            <p className="text-xs text-slate-400">이 파트너에게 연결할 제휴마케팅 QR을 발급해 보세요.</p>
          </div>
        )}
        {listState === 'ready' && qrCodes.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 font-medium">QR 이름</th>
                <th className="px-3 py-2.5 font-medium">캠페인</th>
                <th className="px-3 py-2.5 font-medium">언어</th>
                <th className="px-3 py-2.5 font-medium">상태</th>
                <th className="px-3 py-2.5 font-medium">스캔</th>
                <th className="px-3 py-2.5 font-medium">유효기간</th>
                <th className="px-3 py-2.5 font-medium">생성일</th>
                <th className="px-3 py-2.5 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {qrCodes.map((q) => (
                <tr key={q.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{q.qrCodeName}</div>
                    <div className="text-xs text-slate-400">{q.shortCode}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{q.campaignName || '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{q.language || '-'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${q.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                      {q.status === 'ACTIVE' ? '활성' : '비활성'}
                    </span>
                  </td>
                  {/* WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1: 유입 신호(스캔 수/최근 스캔) */}
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-700">{q.scanCount ?? 0}</div>
                    {q.lastScannedAt && <div className="text-xs text-slate-400">최근 {fmtDate(q.lastScannedAt)}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{validityLabel(q)}</td>
                  <td className="px-3 py-2.5 text-slate-500">{fmtDate(q.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" onClick={() => setViewing(q)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-white">
                        <QrCode className="w-3 h-3" /> 보기
                      </button>
                      <button type="button" disabled={!canWrite} onClick={() => setEditing(q)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                        <Pencil className="w-3 h-3" /> 수정
                      </button>
                      <button type="button" disabled={!canWrite} onClick={() => void handleToggle(q)} className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                        {q.status === 'ACTIVE' ? '비활성화' : '활성화'}
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
        <QrFormModal
          partnerId={partnerId}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); void load(); }}
          onEntitlementDenied={() => setEntitled(false)}
        />
      )}
      {viewing && <QrViewModal qr={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

interface FormProps {
  partnerId: string;
  initial: ForeignVisitorPartnerQrCode | null;
  onClose: () => void;
  onSaved: () => void;
  onEntitlementDenied: () => void;
}

function QrFormModal({ partnerId, initial, onClose, onSaved, onEntitlementDenied }: FormProps) {
  const isEdit = !!initial;
  const [qrCodeName, setQrCodeName] = useState(initial?.qrCodeName ?? '');
  const [campaignName, setCampaignName] = useState(initial?.campaignName ?? '');
  const [language, setLanguage] = useState(initial?.language ?? '');
  const [validFrom, setValidFrom] = useState(initial?.validFrom ? initial.validFrom.slice(0, 10) : '');
  const [validTo, setValidTo] = useState(initial?.validTo ? initial.validTo.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!qrCodeName.trim()) { toast.error('QR 이름을 입력해 주세요.'); return; }
    setSaving(true);
    const payload: QrWritePayload = {
      qrCodeName: qrCodeName.trim(),
      campaignName: campaignName.trim() || null,
      language: language.trim() || null,
      validFrom: validFrom || null,
      validTo: validTo || null,
    };
    try {
      if (isEdit && initial) { await updatePartnerQrCode(initial.id, payload); toast.success('QR을 수정했습니다.'); }
      else { await createPartnerQrCode(partnerId, payload); toast.success('QR을 발급했습니다.'); }
      onSaved();
    } catch (e: any) {
      if (e?.code === 'ENTITLEMENT_REQUIRED') { toast.error('이 기능은 외국인 관광객 판매 지원 이용권이 필요합니다.'); onEntitlementDenied(); onClose(); }
      else toast.error(e?.message || '저장에 실패했습니다.');
    } finally { setSaving(false); }
  };

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-400';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">{isEdit ? 'QR 수정' : 'QR 발급'}</h2>
        <p className="text-xs text-slate-400 mb-4">템플릿: 제휴마케팅(AFFILIATE_MARKETING) · 이 QR은 파트너 유입 식별용입니다.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">QR 이름 *</label>
            <input value={qrCodeName} onChange={(e) => setQrCodeName(e.target.value)} className={field} placeholder="예: A여행사 중국 단체 안내 QR" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">캠페인명</label>
            <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className={field} placeholder="예: 2026년 7월 중국 단체" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">기본 언어</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} className={field} placeholder="예: zh-CN / en / ja" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">유효 시작일</label>
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">유효 종료일</label>
              <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className={field} />
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">취소</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{isEdit ? '저장' : '발급'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QrViewModal({ qr, onClose }: { qr: ForeignVisitorPartnerQrCode; onClose: () => void }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPartnerQrSvg(qr.id, 512)
      .then((s) => { if (!cancelled) setSvg(s); })
      .catch((e) => { if (!cancelled) setErr(e?.message || 'QR 이미지를 불러오지 못했습니다.'); });
    return () => { cancelled = true; };
  }, [qr.id]);

  const download = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${qr.shortCode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(qr.landingUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('URL 복사에 실패했습니다.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">{qr.qrCodeName}</h2>
        <p className="text-xs text-slate-400 mb-4">{qr.shortCode}</p>
        <div className="flex flex-col items-center gap-3">
          <div className="w-52 h-52 bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
            {svg ? (
              <span dangerouslySetInnerHTML={{ __html: svg }} />
            ) : err ? (
              <span className="text-xs text-amber-600 text-center px-2">{err}</span>
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            )}
          </div>
          <p className="text-[11px] text-slate-400 break-all text-center max-w-[260px]">{qr.landingUrl}</p>
          <p className="text-[11px] text-slate-400 text-center">랜딩 화면은 다음 단계에서 연결됩니다.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}{copied ? '복사됨' : 'URL 복사'}
            </button>
            <button type="button" onClick={download} disabled={!svg} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> SVG 다운로드
            </button>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">닫기</button>
        </div>
      </div>
    </div>
  );
}

export default ForeignVisitorPartnerQrCodesPage;
