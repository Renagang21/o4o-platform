/**
 * ExternalSalesPanel — 외부 판매 채널 연동 · 판매 조건 입력
 *
 * WO-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1 §4
 *
 * `온라인 판매 > 판매 설정` 안에 붙는 패널. 신규 메뉴·신규 라우트를 만들지 않는다.
 *
 * 이 화면이 채우는 것은 **O4O 에 원천이 없는 판매 조건**이다 (네이버 카테고리·재고·배송비·
 * 반품비·주소록·A/S·상품정보제공고시). 상품명·가격·이미지·상세는 O4O 원장에서 오므로
 * 여기서 입력받지 않는다.
 *
 * 자격정보(NAVER_COMMERCE_*)가 서버에 없으면 실제 전송은 불가능하다. 그 상태를 숨기지 않고
 * 배너로 그대로 보여준다 — 입력은 미리 해둘 수 있고, 전송만 막힌다.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  fetchExternalChannels,
  fetchExternalSalesLinks,
  fetchExternalSalesCandidates,
  createExternalSalesLink,
  saveExternalSalesInput,
  deleteExternalSalesLink,
  type ExternalChannelCode,
  type ExternalChannelInput,
  type ExternalChannelSummary,
  type ExternalSalesCandidate,
  type ExternalSalesLink,
} from '../../../api/externalSales';

const CHANNEL_LABEL: Record<ExternalChannelCode, string> = {
  NAVER: '네이버 스마트스토어',
  COUPANG: '쿠팡',
};

const SYNC_LABEL: Record<string, { label: string; cls: string }> = {
  NOT_LINKED: { label: '미전송', cls: 'bg-slate-100 text-slate-600' },
  PENDING: { label: '전송 중', cls: 'bg-amber-50 text-amber-700' },
  LINKED: { label: '등록됨', cls: 'bg-green-50 text-green-700' },
  FAILED: { label: '실패', cls: 'bg-red-50 text-red-700' },
  UNLINKED: { label: '해제됨', cls: 'bg-slate-100 text-slate-500' },
};

const EMPTY_INPUT: ExternalChannelInput = {
  leafCategoryId: null,
  stockQuantity: null,
  deliveryFeeType: null,
  baseDeliveryFee: null,
  returnDeliveryFee: null,
  exchangeDeliveryFee: null,
  releaseAddressId: null,
  refundAddressId: null,
  afterServiceTelephoneNumber: null,
  afterServiceGuideContent: null,
  productInfoProvidedNotice: null,
};

/** 판매 조건 입력 폼 필드 정의 — 순서가 곧 화면 순서 */
const INPUT_FIELDS: Array<{
  key: keyof ExternalChannelInput;
  label: string;
  type: 'text' | 'number';
  hint?: string;
}> = [
  { key: 'leafCategoryId', label: '네이버 리프 카테고리 ID', type: 'text', hint: 'O4O 카테고리와 체계가 다릅니다' },
  { key: 'stockQuantity', label: '재고 수량', type: 'number' },
  { key: 'deliveryFeeType', label: '배송비 유형', type: 'text', hint: 'FREE / PAID / CONDITIONAL_FREE' },
  { key: 'baseDeliveryFee', label: '기본 배송비', type: 'number', hint: '유료 배송일 때' },
  { key: 'returnDeliveryFee', label: '반품 배송비', type: 'number' },
  { key: 'exchangeDeliveryFee', label: '교환 배송비', type: 'number' },
  { key: 'releaseAddressId', label: '출고지 주소록 ID', type: 'number', hint: '스마트스토어센터 사전 등록' },
  { key: 'refundAddressId', label: '반품지 주소록 ID', type: 'number', hint: '스마트스토어센터 사전 등록' },
  { key: 'afterServiceTelephoneNumber', label: 'A/S 전화번호', type: 'text', hint: '법정 필수' },
  { key: 'afterServiceGuideContent', label: 'A/S 안내', type: 'text', hint: '법정 필수' },
];

export function ExternalSalesPanel({
  showToast,
}: {
  showToast: (type: 'success' | 'error', message: string) => void;
}) {
  const [channels, setChannels] = useState<ExternalChannelSummary[]>([]);
  const [activeChannel, setActiveChannel] = useState<ExternalChannelCode>('NAVER');
  const [links, setLinks] = useState<ExternalSalesLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExternalChannelInput>(EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [candidates, setCandidates] = useState<ExternalSalesCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const summary = channels.find((c) => c.channelCode === activeChannel);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ch, ls] = await Promise.all([
        fetchExternalChannels(),
        fetchExternalSalesLinks(activeChannel),
      ]);
      setChannels(ch);
      setLinks(ls);
    } catch {
      showToast('error', '외부 판매 채널 정보를 불러오지 못했습니다.');
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [activeChannel, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = async () => {
    setShowAdd(true);
    setCandidatesLoading(true);
    try {
      setCandidates(await fetchExternalSalesCandidates(activeChannel));
    } catch {
      showToast('error', '연동 가능한 상품을 불러오지 못했습니다.');
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleAdd = async (c: ExternalSalesCandidate) => {
    try {
      await createExternalSalesLink(activeChannel, c.masterId, c.listingId);
      showToast('success', `${c.name} 을(를) 연동 목록에 추가했습니다.`);
      setCandidates((prev) => prev.filter((x) => x.masterId !== c.masterId));
      await load();
    } catch (err: any) {
      showToast('error', err?.message ?? '연동 추가에 실패했습니다.');
    }
  };

  const openEditor = (link: ExternalSalesLink) => {
    if (expandedId === link.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(link.id);
    setDraft({ ...EMPTY_INPUT, ...(link.channelInput ?? {}) } as ExternalChannelInput);
  };

  const handleSave = async (link: ExternalSalesLink) => {
    setSaving(true);
    try {
      const result = await saveExternalSalesInput(activeChannel, link.id, draft);
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id
            ? {
                ...l,
                channelInput: result.channelInput,
                missingRequired: result.missingRequired,
                readyToSend: result.readyToSend,
              }
            : l,
        ),
      );
      showToast(
        'success',
        result.readyToSend
          ? '판매 조건을 저장했습니다. 필수 항목이 모두 채워졌습니다.'
          : `판매 조건을 저장했습니다. 미입력 ${result.missingRequired.length}건이 남아 있습니다.`,
      );
    } catch (err: any) {
      showToast('error', err?.message ?? '판매 조건 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (link: ExternalSalesLink) => {
    try {
      await deleteExternalSalesLink(activeChannel, link.id);
      showToast('success', '연동을 해제했습니다.');
      setExpandedId(null);
      await load();
    } catch (err: any) {
      showToast('error', err?.message ?? '연동 해제에 실패했습니다.');
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">외부 판매 채널</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            자체 스토어 대신 네이버·쿠팡에서 판매합니다. 상품 정보는 O4O 것을 그대로 사용하고,
            여기서는 채널별 판매 조건만 입력합니다.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </button>
      </div>

      {/* 채널 탭 */}
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {channels.map((c) => (
          <button
            key={c.channelCode}
            onClick={() => setActiveChannel(c.channelCode)}
            disabled={!c.implemented}
            title={c.implemented ? undefined : '연동 준비 중입니다'}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeChannel === c.channelCode
                ? 'border-blue-600 text-blue-600'
                : c.implemented
                  ? 'border-transparent text-slate-500 hover:text-slate-700'
                  : 'border-transparent text-slate-300 cursor-not-allowed'
            }`}
          >
            {CHANNEL_LABEL[c.channelCode]}
            {c.total > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                {c.linked}/{c.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 자격정보 미설정 배너 — 상태를 숨기지 않는다 */}
      {summary && !summary.credentialConfigured && (
        <div className="flex items-start gap-3 p-4 mb-4 rounded-lg border border-amber-200 bg-amber-50">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {CHANNEL_LABEL[activeChannel]} 판매자 연결이 아직 완료되지 않았습니다
            </p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              판매 조건은 지금 미리 입력해 둘 수 있습니다. 실제 상품 전송은 판매자 계정 연결이
              끝난 뒤에 가능합니다.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 bg-white rounded-lg border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> 불러오는 중...
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-medium text-slate-600">
              연동 상품 {links.length}건
            </span>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" /> 상품 추가
            </button>
          </div>

          {links.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ExternalLink className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">아직 이 채널에 연동한 상품이 없습니다.</p>
              <p className="text-xs mt-1">"상품 추가"로 매장 진열 상품을 선택하세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {links.map((link) => {
                const st = SYNC_LABEL[link.syncStatus] ?? SYNC_LABEL.NOT_LINKED;
                const expanded = expandedId === link.id;
                return (
                  <li key={link.id}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => openEditor(link)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="font-medium text-sm text-slate-900 truncate">
                          {link.productName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${st.cls}`}>
                            {st.label}
                          </span>
                          {link.readyToSend ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-green-700">
                              <CheckCircle2 className="w-3 h-3" /> 판매 조건 완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                              <AlertCircle className="w-3 h-3" /> 미입력 {link.missingRequired.length}건
                            </span>
                          )}
                          {link.externalChannelProductId && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              #{link.externalChannelProductId}
                            </span>
                          )}
                        </div>
                        {link.lastError && (
                          <div className="text-[11px] text-red-600 mt-1 truncate">
                            {link.lastError}
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(link)}
                        title="연동 해제"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="px-4 pb-4 bg-slate-50/60 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          {INPUT_FIELDS.map((f) => (
                            <label key={String(f.key)} className="block">
                              <span className="text-xs font-medium text-slate-600">
                                {f.label}
                              </span>
                              <input
                                type={f.type}
                                value={(draft[f.key] as string | number | null) ?? ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setDraft((prev) => ({
                                    ...prev,
                                    [f.key]:
                                      raw === ''
                                        ? null
                                        : f.type === 'number'
                                          ? Number(raw)
                                          : raw,
                                  }));
                                }}
                                className="mt-1 w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {f.hint && (
                                <span className="text-[11px] text-slate-400">{f.hint}</span>
                              )}
                            </label>
                          ))}
                        </div>

                        {link.missingRequired.length > 0 && (
                          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-[11px] font-semibold text-amber-800 mb-1">
                              아직 필요한 항목
                            </p>
                            <p className="text-[11px] text-amber-700">
                              {link.missingRequired.map((m) => m.label).join(' · ')}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={() => setExpandedId(null)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                          >
                            닫기
                          </button>
                          <button
                            onClick={() => handleSave(link)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            판매 조건 저장
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* 상품 추가 모달 */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[1000]" onClick={() => setShowAdd(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[1001] w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {CHANNEL_LABEL[activeChannel]} 연동 상품 추가
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {candidatesLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-600">추가할 수 있는 상품이 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    매장에 진열 중인 상품만 연동할 수 있습니다.<br />
                    의약품은 외부 판매 채널에 등록할 수 없습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.map((c) => (
                    <div
                      key={c.masterId}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {c.price != null ? `${c.price.toLocaleString('ko-KR')}원` : '가격 미설정'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdd(c)}
                        className="ml-3 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        추가
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
