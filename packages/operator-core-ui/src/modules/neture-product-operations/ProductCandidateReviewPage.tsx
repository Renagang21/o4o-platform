import {useNetureProductOperations} from './runtime';
/**
 * ProductCandidateReviewPage — Operator 상품 후보 검토 (Phase 5)
 *
 * WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1
 *
 * Phase 3 product_candidates 큐 + Phase 4 mobile draft → candidate 흐름을 운영자가 검토.
 * 기존 /api/v1/operator/product-candidates API 사용 — backend 변경 없음.
 *
 * 액션: 재매칭 / 수동매칭(기존 Master 연결) / 반려 / 보관.
 * 금지: 신규 ProductMaster 생성 UI, 자동 승인 UI.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ActionBar } from '@o4o/ui';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { GuideBlock } from '@o4o/shared-space-ui';
import type {
  ProductCandidate,
  ProductCandidateStatus,
  ProductCandidateSourceType,
  CandidateQueue, CandidateWorkflowAction, CandidateWorkflowPreview, CandidateWorkflowSummary, ProductCandidateListFilter,
} from './operatorProductCandidates';

// ─── Constants ───

const STATUS_TABS: { key: 'all' | 'active' | ProductCandidateStatus; label: string }[] = [
  { key: 'active', label: '등록 전' },
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'reviewing', label: '검토중' },
  { key: 'matched', label: '매칭됨' },
  { key: 'linked', label: '활용연결' },
  { key: 'rejected', label: '반려' },
  { key: 'archived', label: '보관' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: '대기', cls: 'bg-amber-50 text-amber-700' },
  reviewing: { label: '검토중', cls: 'bg-blue-50 text-blue-700' },
  matched: { label: '매칭됨', cls: 'bg-green-50 text-green-700' },
  linked: { label: '활용연결', cls: 'bg-emerald-50 text-emerald-700' },
  approved_new_master: { label: '신규승격', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: '반려', cls: 'bg-red-50 text-red-700' },
  merged: { label: '병합', cls: 'bg-slate-100 text-slate-600' },
  archived: { label: '보관', cls: 'bg-slate-100 text-slate-500' },
};

// WO-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1
const PRODUCT_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  non_drug: { label: '비의약품', cls: 'bg-slate-100 text-slate-600' },
  otc_drug: { label: '비처방의약품', cls: 'bg-amber-50 text-amber-700' },
  rx_drug: { label: '처방의약품', cls: 'bg-red-50 text-red-700' },
  quasi_drug: { label: '의약외품', cls: 'bg-teal-50 text-teal-700' },
  health_functional: { label: '건강기능식품', cls: 'bg-indigo-50 text-indigo-700' },
  drug_unspecified: { label: '의약품 미분류', cls: 'bg-orange-50 text-orange-700' },
  unknown: { label: '미상', cls: 'bg-slate-100 text-slate-400' },
};


const SOURCE_LABEL: Record<ProductCandidateSourceType, string> = {
  supplier_web: '공급자',
  pharmacy_web: '약국',
  store_web: '매장',
  mobile_draft: '모바일',
  csv_import: 'CSV',
  xlsx_import: 'XLSX',
  operator_import: '운영자',
  external_api: '외부API',
  unknown: '미상',
};

function sourceDisplayName(value?:string|null) {
  if(value==='MFDS_MEDICAL_DEVICE_STANDARD_CODE') return '식약처 의료기기 표준코드';
  if(value?.toLowerCase().startsWith('mfds-drug-master-standard-code')) return '식약처 의약품 표준코드';
  return value || '';
}
function Badge({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string }) {
  const b = map[value] || { label: value, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${b.cls}`}>{b.label}</span>;
}

// ─── WO-O4O-NETURE-SUPPLIER-BULK-OPERATOR-REVIEW-V4 ───
// 공급자 대량 등록(BULK-UPLOAD-SAVE-V3)으로 저장된 후보 식별/요약. rawPayload null 안전.

/** bulk rawPayload 의 productType(프론트 key) → 한글 라벨 */
const BULK_PRODUCT_TYPE_LABEL: Record<string, string> = {
  non_drug: '비의약품',
  quasi_drug: '의약외품',
  otc_drug: '비처방 의약품',
  rx_drug: '처방의약품',
  unclassified: '미분류 / 운영자 검토',
};

interface BulkInfo {
  isBulk: boolean;
  productType?: string;
  productTypeLabel?: string;
  regulatoryType?: string | null;
  drugCategory?: string | null;
  rowNumber?: number;
  supplierId?: string;
  duplicateInBatch?: boolean;
  fields?: Record<string, string>;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/** 후보가 공급자 대량 등록 출처인지 + 요약 정보 추출 (rawPayload null/누락 안전) */
function getBulkInfo(c: ProductCandidate): BulkInfo {
  const p = c.rawPayload ?? {};
  const isBulk = p['source'] === 'supplier_bulk_upload' || (c.sourceLabel ?? '').includes('대량 등록');
  if (!isBulk) return { isBulk: false };
  const productType = str(p['productType']) ?? str(p['product_type']);
  const rowNumberRaw = p['rowNumber'];
  return {
    isBulk: true,
    productType,
    productTypeLabel: productType ? BULK_PRODUCT_TYPE_LABEL[productType] ?? productType : undefined,
    regulatoryType: str(p['regulatoryType']) ?? null,
    drugCategory: str(p['drugCategory']) ?? str(p['drug_category']) ?? null,
    rowNumber: typeof rowNumberRaw === 'number' ? rowNumberRaw : undefined,
    supplierId: str(p['supplierId']),
    duplicateInBatch: p['duplicateInBatch'] === true,
    fields: (p['fields'] && typeof p['fields'] === 'object') ? (p['fields'] as Record<string, string>) : undefined,
  };
}

// ─── Component ───

export default function ProductCandidateReviewPage() {
 const {api:{operatorProductCandidateApi}, user, renderCandidateRegistrationReview} = useNetureProductOperations();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sequence = useRef(0);
  const mounted = useRef(false);
  const batchLock = useRef(false);
  const [allMatching,setAllMatching]=useState(false);
  const [summary,setSummary]=useState<CandidateWorkflowSummary|null>(null);
  const [queue,setQueue]=useState<CandidateQueue>((searchParams.get('queue') as CandidateQueue) || 'all');
  const [reason,setReason]=useState('');
  const [reasonCaption,setReasonCaption]=useState('');
  const [sourceLabel,setSourceLabel]=useState('');
  const [notice,setNotice]=useState('');
  const [dialog,setDialog]=useState<{action:CandidateWorkflowAction;note:string;preview:CandidateWorkflowPreview|null;error:string}|null>(null);
  const [registration,setRegistration]=useState<string|null>(null);
  const [items, setItems] = useState<ProductCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | ProductCandidateStatus>(STATUS_TABS.some(tab => tab.key === initialStatus) ? initialStatus as 'active' | ProductCandidateStatus : 'active');
  const [bulkOnly, setBulkOnly] = useState(false); // WO-..-BULK-OPERATOR-REVIEW-V4: 공급자 대량 등록만
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const next = STATUS_TABS.find(tab => tab.key === initialStatus)?.key ?? 'active';
    setStatusFilter(next); setPage(1); setSelected(new Set());
    setQueue(['review','intake'].includes(searchParams.get('queue') ?? '') ? searchParams.get('queue') as CandidateQueue : 'all');
  }, [initialStatus, searchParams]);

  const [detail, setDetail] = useState<ProductCandidate | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 활용 상품 연결 (link-to-listing)
  const [linkOrgId, setLinkOrgId] = useState('');
  const [linkServiceKey, setLinkServiceKey] = useState('');
  const [linkDisplayName, setLinkDisplayName] = useState('');
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  // 의약품 분류 refine (F4)
  const [refineCategory, setRefineCategory] = useState('');
  const [refineNote, setRefineNote] = useState('');
  const [refineMessage, setRefineMessage] = useState<string | null>(null);

  const filter = useMemo<ProductCandidateListFilter>(()=>({
    status:statusFilter==='all'||statusFilter==='active'?undefined:statusFilter,groupedStatus:statusFilter==='active'?'before_registration':undefined,search:searchTerm.trim()||undefined,
    queue,reason:reason||undefined,sourceLabel:sourceLabel||undefined,bulkOnly,
  }),[statusFilter,searchTerm,queue,reason,sourceLabel,bulkOnly]);
  const reasonLabel = reason==='registration_path_unavailable'?'공공 수집 자료 등록 경로 미지원':reason==='identifier_missing'?'식별자 미등록':summary?.reasons.find(item=>item.code===reason)?.label || (reason ? reasonCaption || '선택한 검증 사유' : '전체 사유');
  const scopeKey = `${user?.id ?? ''}:${(user?.roles ?? []).join('|')}`;
  const activeScope=useRef(scopeKey);activeScope.current=scopeKey;
  useEffect(()=>{setSelected(new Set());setAllMatching(false);setDialog(null);setNotice('');},[filter,scopeKey]);

  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    setSelected(new Set());
    try {
      const [res,stats] = await Promise.all([
        operatorProductCandidateApi.list({...filter,page,limit:50}),
        operatorProductCandidateApi.workflowSummary(filter),
      ]);
      if (seq !== sequence.current || activeScope.current!==scopeKey) return;
      const lastPage = Math.max(1, Math.ceil(res.total / 50));
      if (page > lastPage) { setPage(lastPage); return; }
      setItems(res.items); setTotal(res.total); setSummary(stats); setError('');
    } catch {
      if (seq === sequence.current) { setItems([]); setSummary(null); setError('상품 후보를 조회하지 못했습니다. 다시 조회해 주세요.'); }
    } finally { if (seq === sequence.current) setLoading(false); }
  }, [filter, page, operatorProductCandidateApi, scopeKey]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; sequence.current++; };
  }, [load]);

  const filtered = items;
  const effectiveSelected = allMatching ? new Set(items.map(item=>item.id)) : selected;
  const selectedCount = allMatching ? total : selected.size;
  const clearSelection = () => {if(!batchLock.current){setSelected(new Set());setAllMatching(false);setDialog(null);}};

  const refreshAfterMutation = async () => {setAllMatching(false);setSelected(new Set());setDialog(null);await load();};
  // ─── Actions ───

  const refreshDetail = async (id: string) => {
    const fresh = await operatorProductCandidateApi.get(id);
    setDetail(fresh);
  };

  const handleReject = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await operatorProductCandidateApi.reject(detail.id, rejectReason || undefined);
      setRejectReason('');
      setDetail(null);
      await refreshAfterMutation();
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await operatorProductCandidateApi.archive(detail.id);
      setDetail(null);
      await refreshAfterMutation();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!detail || !detail.matchedProductMasterId) return;
    setActionLoading(true);
    setRefineMessage(null);
    try {
      const payload = { drugCategory: (refineCategory || null) as 'otc' | 'rx' | 'quasi_drug' | 'drug_unspecified' | null, note: refineNote.trim() || undefined };
      const result = await operatorProductCandidateApi.refineDrugCategory(detail.id, payload);
      if (result) {
        setRefineMessage('분류가 저장되었습니다.');
        await refreshDetail(detail.id);
        await refreshAfterMutation();
      } else {
        setRefineMessage('분류 저장에 실패했습니다.');
      }
    } catch (e: any) {
      const code = e?.response?.data?.error;
      setRefineMessage(
        code === 'DRUG_CATEGORY_REGULATORY_CONFLICT'
          ? '규제 유형과 충돌합니다 (의약품만 OTC/Rx 지정 가능).'
          : '분류 저장 중 오류가 발생했습니다.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLink = async () => {
    if (!detail || !detail.matchedProductMasterId) return;
    if (!linkOrgId.trim() || !linkServiceKey.trim()) {
      setLinkMessage('조직 ID와 서비스 키가 필요합니다.');
      return;
    }
    setActionLoading(true);
    setLinkMessage(null);
    try {
      const result = await operatorProductCandidateApi.linkToListing(detail.id, {
        organizationId: linkOrgId.trim(),
        serviceKey: linkServiceKey.trim(),
        displayName: linkDisplayName.trim() || undefined,
      });
      if (result) {
        setLinkMessage(result.alreadyExisted ? '이미 추가된 활용 상품입니다.' : '활용 상품으로 추가되었습니다.');
        await refreshDetail(detail.id);
        await refreshAfterMutation();
      } else {
        setLinkMessage('연결에 실패했습니다.');
      }
    } catch (e: any) {
      // WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1: Rx 차단 안내
      const code = e?.response?.data?.error;
      setLinkMessage(
        typeof code === 'string' && code.includes('RX_LISTING_BLOCKED')
          ? '처방의약품은 매장 활용 상품으로 연결할 수 없습니다.'
          : '연결 중 오류가 발생했습니다.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openCandidate = (row: ProductCandidate) => {
    if(actionLoading) return;
    setDetail(row);setRejectReason('');setLinkOrgId(row.organizationId||'');setLinkServiceKey(row.serviceKey||'');
    setLinkDisplayName('');setLinkMessage(null);setRefineCategory(row.classification?.drugCategory||'');setRefineNote('');setRefineMessage(null);
  };
  const workflowLabels: Record<CandidateWorkflowAction,string> = {review:'검토 시작',hold:'보완 사항 기록',archive:'보관(삭제)',reject:'반려'};
  const prepareWorkflow = async () => {
    if(!dialog || batchLock.current || loading || error) return;
    batchLock.current=true;setActionLoading(true);
    const seq=sequence.current;
    try {
      const preview=await operatorProductCandidateApi.workflowPreview({filter,action:dialog.action,ids:allMatching?undefined:[...selected],note:dialog.note});
      if(mounted.current && sequence.current===seq) setDialog(previous=>previous?{...previous,preview,error:''}:null);
    } catch {if(mounted.current && sequence.current===seq) setDialog(previous=>previous?{...previous,preview:null,error:'대상 건수를 확인하지 못했습니다. 다시 확인해 주세요.'}:null);}
    finally {batchLock.current=false;if(mounted.current)setActionLoading(false);}
  };
  const executeWorkflow = async () => {
    if(!dialog?.preview || !dialog.preview.count || batchLock.current || loading || error) return;
    batchLock.current=true;setActionLoading(true);
    const seq=sequence.current;
    try {
      const result=await operatorProductCandidateApi.workflowExecute({filter,action:dialog.action,ids:allMatching?undefined:[...selected],note:dialog.note,cutoff:dialog.preview.cutoff,fingerprint:dialog.preview.fingerprint,expectedCount:dialog.preview.count});
      if(mounted.current && sequence.current===seq){
        setDialog(null);setAllMatching(false);setSelected(new Set());
        setNotice(`${result.updated.toLocaleString()}건 ${workflowLabels[dialog.action]} 처리 완료. 정식 상품은 자동 생성·삭제하지 않았습니다.`);
        await load();
      }
    } catch (failure: any) {if(mounted.current && sequence.current===seq) setDialog(previous=>previous?{...previous,preview:null,error:failure?.response?.status===409?'후보가 변경됐거나 확인 시간이 지났습니다. 대상 건수를 다시 확인해 주세요.':'처리 결과를 확인하지 못했습니다. 목록과 대상 건수를 다시 확인해 주세요.'}:null);}
    finally {batchLock.current=false;if(mounted.current)setActionLoading(false);}
  };

  // ─── Columns ───

  const columns: ListColumnDef<ProductCandidate>[] = [
    {key:'_select',header:'',system:true,width:'44px',render:(_,row)=><input type="checkbox" aria-label={`${row.candidateName||'이름 없는 후보'} 선택`} checked={effectiveSelected.has(row.id)} disabled={loading||actionLoading} onClick={event=>event.stopPropagation()} onChange={event=>{if(batchLock.current)return;const next=new Set(effectiveSelected);if(event.target.checked)next.add(row.id);else next.delete(row.id);setAllMatching(false);setSelected(next);setDialog(null);}}/>},

    {
      key: 'candidateName',
      header: '후보명',
      sortable: true,
      render: (_v, row) => {
        const bulk = getBulkInfo(row);
        return (
          <div>
            <p className="font-medium text-slate-800">{row.candidateName || '(이름 없음)'}</p>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {bulk.isBulk && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700">공급자 대량 등록</span>
              )}
              {bulk.isBulk && bulk.rowNumber != null && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">CSV row {bulk.rowNumber}</span>
              )}
              {bulk.duplicateInBatch && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700">중복 가능</span>
              )}
              <span className="text-xs text-slate-400">{row.id.slice(0, 8)}...</span>
            </div>
          </div>
        );
      },
    },
    {key:'_reviewReason',header:'대기 사유 · 다음 작업',minWidth:220,render:(_,row)=><div className="whitespace-normal text-xs"><span className="font-medium">{row.triage?.queue==='intake'?'수집 자료 등록 준비':'운영 검토'}</span><p className="mt-1 text-amber-800">{row.triage?.reasons.join(' · ') || '후보 정보 확인 필요'}</p><p className="mt-1 text-slate-500">{row.triage?.nextStep}</p></div>},
    {
      key: 'identifierValue',
      header: '식별자',
      render: (_v, row) =>
        row.identifierValue ? (
          <span className="text-xs text-slate-600">
            {row.identifierType ? `${row.identifierType}: ` : ''}{row.identifierValue}
          </span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        ),
    },
    {
      key: 'sourceType',
      header: '출처',
      align: 'center',
      width: '110px',
      render: (v, row) => (
        <span className="text-xs text-slate-600">
          {sourceDisplayName(row.sourceLabel) || SOURCE_LABEL[v as ProductCandidateSourceType] || v}
        </span>
      ),
    },
    {
      key: '_productType',
      header: '분류',
      align: 'center',
      width: '110px',
      render: (_v, row) => {
        if(row.triage?.medicalDevice) return <span className="text-xs text-teal-700">의료기기</span>;
        const cls = row.classification?.productTypeClass ?? 'unknown';
        return <Badge map={PRODUCT_TYPE_BADGE} value={cls} />;
      },
    },
    {
      key: 'serviceKey',
      header: '서비스',
      align: 'center',
      width: '90px',
      render: (v) => <span className="text-xs text-slate-500">{v || '-'}</span>,
    },
    {
      key: 'candidateStatus',
      header: '상태',
      align: 'center',
      width: '90px',
      sortable: true,
      render: (v) => <Badge map={STATUS_BADGE} value={v} />,
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (v) => <span className="text-xs text-slate-500">{new Date(v).toLocaleDateString('ko-KR')}</span>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">상품 후보 검토</h1>
        <p className="text-sm text-slate-500 mt-1">
          출처와 대기 사유를 확인하고, 검토·보완·등록 준비를 진행합니다. 검색 결과 전체를 선택해 한 번에 처리할 수 있습니다.
        </p>
      </div>

      <GuideBlock
        variant="info"
        title="상품 후보 검토 절차를 안내합니다."
        description="후보는 정식 상품 등록 전의 수집 자료입니다. 출처·식별자·허가 정보를 확인하고 유형에 맞는 등록 경로를 검토합니다. 같은 상품이 있는지는 등록 과정에서 확인합니다."
        steps={[
          '출처와 사유로 대상을 좁힌 뒤 페이지 또는 검색 결과 전체를 선택합니다',
          '대량 작업은 대상 건수를 먼저 확인하며, 등록은 허용된 유형과 전체 관리자 권한으로 검토합니다',
          '수집 자료의 검증·보완 사유를 기록하고 해당 제품군 등록 경로를 확인합니다',
        ]}
        compact
      />

      <section aria-label="후보 업무 구분" className="my-4 grid gap-3 sm:grid-cols-3">
        {([['all','조회 조건 전체',summary?.total],['review','운영 검토',summary?.review],['intake','수집 자료 등록 준비',summary?.intake]] as const).map(([key,label,count])=><button key={key} type="button" disabled={actionLoading} aria-pressed={queue===key} className={`rounded-lg border p-4 text-left ${queue===key?'border-blue-600 bg-blue-50':'bg-white'}`} onClick={()=>{setQueue(key);setPage(1);}}><span className="text-sm">{label}</span><strong className="mt-1 block text-2xl">{error||count==null?'—':count.toLocaleString()}</strong></button>)}
      </section>
      <p className="mb-4 text-sm text-slate-600">수집 자료는 미등록 원천 데이터입니다. 운영자가 모두 승인해야 한다는 뜻이 아닙니다. 아래 사유와 등록 경로를 먼저 확인하세요. 사유별 건수는 중복될 수 있습니다.</p>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              disabled={actionLoading} onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="min-w-0 max-w-full text-sm">출처 <select aria-label="후보 출처" disabled={actionLoading} value={sourceLabel} onChange={e=>{setSourceLabel(e.target.value);setPage(1);}} className="block max-w-full rounded border p-2"><option value="">전체 출처</option>{sourceLabel&&!summary?.sources.some(source=>source.sourceLabel===sourceLabel)&&<option value={sourceLabel}>{sourceDisplayName(sourceLabel)} (0건)</option>}{summary?.sources.filter(source=>source.sourceLabel).map(source=><option key={source.sourceLabel!} value={source.sourceLabel!}>{sourceDisplayName(source.sourceLabel)} ({source.count.toLocaleString()})</option>)}</select></label>
        <label className="min-w-0 max-w-full text-sm">대기 사유 <select aria-label="후보 대기 사유" disabled={actionLoading} value={reason} onChange={e=>{setReasonCaption(summary?.reasons.find(item=>item.code===e.target.value)?.label||'');setReason(e.target.value);setPage(1);}} className="block max-w-full rounded border p-2"><option value="">전체 사유</option>{reason&&!summary?.reasons.some(item=>item.code===reason)&&<option value={reason}>{reasonLabel} (0건)</option>}{summary?.reasons.map(item=><option key={item.code} value={item.code}>{item.label} ({item.count.toLocaleString()})</option>)}</select></label>
        {/* WO-..-BULK-OPERATOR-REVIEW-V4: 공급자 대량 등록만 */}
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={bulkOnly}
            disabled={actionLoading} onChange={(e) => { setBulkOnly(e.target.checked); setSelected(new Set()); }}
            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          공급자 대량 등록만
        </label>
        <input
          type="text"
          aria-label="전체 후보 검색" placeholder="전체 후보명, 제조사, 식별자 검색..."
          value={searchTerm}
          disabled={actionLoading} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="flex-1 max-w-xs px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p role="alert" className="mb-3 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <p className="mb-3 text-sm text-slate-500">전체 {error ? '—' : total.toLocaleString()}건 · {page}페이지 · 검색·출처·사유·대량 등록 필터는 전체 후보에 적용됩니다.</p>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded border bg-white p-3 text-sm">
        <span>{allMatching?`검색 결과 전체 ${total.toLocaleString()}건 선택 중`:'표의 체크박스는 현재 페이지를 선택합니다.'}</span>
        <button type="button" className="rounded border px-3 py-2 text-blue-800" disabled={loading||actionLoading||!!error||!total} onClick={()=>{setAllMatching(true);setSelected(new Set());setDialog(null);}}>검색 결과 전체 {total.toLocaleString()}건 선택</button>
        {allMatching&&<button type="button" disabled={actionLoading} onClick={clearSelection}>전체 선택 해제</button>}
      </div>
      {notice&&<p role="status" className="mb-3 rounded bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
      <div className="[&>div>div]:flex-wrap"><ActionBar selectedCount={selectedCount} onClearSelection={clearSelection} actions={[
        {key:'detail',label:'선택 후보 확인',disabled:loading||actionLoading||selectedCount!==1,onClick:()=>{const row=items.find(item=>effectiveSelected.has(item.id));if(row)openCandidate(row);}},
        ...(['review','hold','archive','reject'] as const).map(action=>({key:action,label:action==='archive'?'선택 보관(삭제)':`선택 ${workflowLabels[action]}`,disabled:loading||actionLoading||!!error,onClick:()=>setDialog({action,note:'',preview:null,error:''})})),
      ]} /></div>
      {dialog&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-label="선택 후보 일괄 처리 확인" className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-xl bg-white p-5">
        <h2 className="text-lg font-semibold">{workflowLabels[dialog.action]} 대상 확인</h2><p className="text-sm">{allMatching?'검색 결과 전체':'체크한 현재 페이지'} {selectedCount.toLocaleString()}건 중 실행 가능한 후보를 서버에서 확인합니다. 검토 시작은 대기 후보만, 나머지는 대기·검토중 후보만 처리합니다.</p>
        <p className="break-words rounded bg-slate-50 p-3 text-sm">범위: {queue==='intake'?'수집 자료':queue==='review'?'운영 검토':'전체 후보'} / {STATUS_TABS.find(tab=>tab.key===statusFilter)?.label} / {sourceDisplayName(sourceLabel)||'전체 출처'} / {reasonLabel}{searchTerm&&` / 검색: ${searchTerm}`}</p>
        <label className="block text-sm">검토 기록 {(dialog.action==='hold'||dialog.action==='reject')?'(필수)':'(선택)'}<textarea aria-label="일괄 처리 검토 기록" className="mt-1 w-full rounded border p-2" value={dialog.note} maxLength={2000} disabled={actionLoading} onChange={e=>setDialog({...dialog,note:e.target.value,preview:null})}/></label>
        {dialog.error&&<p role="alert" className="text-sm text-red-700">{dialog.error}</p>}
        {dialog.preview&&<p role="status" className="rounded bg-blue-50 p-3 text-sm">실행 대상 {dialog.preview.count.toLocaleString()}건. 새 후보는 확인 범위에 포함하지 않으며, 확인 후 대상이 바뀌면 실행을 중단하고 다시 확인합니다. 정식 상품 등록·삭제·알림 발송은 실행하지 않습니다.</p>}
        <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={actionLoading} onClick={()=>setDialog(null)} className="rounded border px-3 py-2">취소</button><button type="button" disabled={actionLoading||((dialog.action==='hold'||dialog.action==='reject')&&!dialog.note.trim())} className="rounded border px-3 py-2" onClick={()=>void prepareWorkflow()}>대상 건수 확인</button>{dialog.preview&&<button type="button" disabled={actionLoading||!dialog.preview.count} className="rounded bg-blue-700 px-3 py-2 text-white" onClick={()=>void executeWorkflow()}>확인한 {dialog.preview.count.toLocaleString()}건 실행</button>}</div>
      </section></div>}
      {/* DataTable */}
      <DataTable<ProductCandidate>
        selectable
        selectedKeys={effectiveSelected}
        onSelectionChange={keys => { if (!batchLock.current) {setAllMatching(false);setSelected(new Set([...keys].filter(id => filtered.some(item => item.id === id))));setDialog(null);} }}
        columns={columns}
        data={filtered}
        rowKey="id"
        loading={loading}
        emptyMessage={error ? '상품 후보를 다시 조회해 주세요.' : items.length === 0 ? '검토할 상품 후보가 없습니다' : '검색 결과가 없습니다'}
        onRowClick={openCandidate}
        tableId="neture-product-candidates"
      />

      <nav aria-label="상품 후보 페이지" className="my-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="rounded border px-3 py-2 text-sm" disabled={loading || actionLoading || page <= 1} onClick={() => { setPage(value => value - 1); }}>이전 페이지</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" disabled={loading || actionLoading} onClick={() => { clearSelection();void load(); }}>목록 새로고침</button>
        <button type="button" className="rounded border px-3 py-2 text-sm" disabled={loading || actionLoading || page * 50 >= total} onClick={() => { setPage(value => value + 1); }}>다음 페이지</button>
      </nav>
      {registration&&user?.roles?.includes('platform:super_admin')&&renderCandidateRegistrationReview?.({candidateId:registration,onClose:()=>setRegistration(null),onProcessed:()=>{setRegistration(null);void refreshAfterMutation();}})}
      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detail.candidateName || '(이름 없음)'}</h3>
                <p className="text-xs text-slate-400 mt-1">{detail.id}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Badge map={STATUS_BADGE} value={detail.candidateStatus} />
                <Badge map={PRODUCT_TYPE_BADGE} value={detail.classification?.productTypeClass ?? 'unknown'} />
              </div>
            </div>

            <div className="p-5 space-y-4">
              <section aria-label="후보 대기 사유" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm"><h4 className="font-semibold">{detail.triage?.queue==='intake'?'수집 자료 등록 준비':'운영 검토'}</h4><p className="mt-1">{detail.triage?.reasons.join(' · ')||'원천 정보 확인 필요'}</p><p className="mt-1">{detail.triage?.nextStep}</p>{(detail.triage?.registration==='drug'||detail.triage?.registration==='supplier')&&renderCandidateRegistrationReview&&user?.roles?.includes('platform:super_admin')&&<button type="button" className="mt-3 rounded bg-blue-700 px-3 py-2 text-white" onClick={()=>{setRegistration(detail.id);setDetail(null);}}>기본상품 등록 검토</button>}{detail.triage?.registration==='unsupported'&&<p className="mt-2">이 자료는 현재 일반 등록 경로에서 처리할 수 없습니다. 원천 식별자·허가·필수 정보를 검증하고 보완 사항을 기록하세요.</p>}</section>
              {/* F3: 상품 분류 + 기본 노출/판매 정책 (표시용 — 권한 변경 아님) */}
              {detail.classification && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-slate-600">상품 분류</span>
                    <Badge map={PRODUCT_TYPE_BADGE} value={detail.classification.productTypeClass} />
                    {detail.classification.drugCategory && (
                      <span className="text-slate-400">drug_category: {detail.classification.drugCategory}</span>
                    )}
                    <span className="text-slate-300">
                      ({detail.classification.basis === 'matched_master' ? '매칭 상품 기준' : '후보 추론'})
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.classification.displayPolicy.pharmacyOnly && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">약국 전용</span>
                    )}
                    {!detail.classification.displayPolicy.customerDisplayAllowed && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">고객 노출 제한</span>
                    )}
                    {!detail.classification.displayPolicy.onlineSaleAllowed && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">온라인 판매 차단</span>
                    )}
                    {detail.classification.displayPolicy.advertisingReviewStatus === 'needs_review' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">광고 검토 필요</span>
                    )}
                    {detail.classification.displayPolicy.advertisingReviewStatus === 'blocked' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">광고 차단</span>
                    )}
                    {detail.classification.isRxClass && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 font-medium">처방의약품 — 온라인 판매/노출 불가</span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">분류·정책은 안내용입니다. 등록/판매/노출 권한을 자동으로 변경하지 않습니다.</p>
                  {detail.classification.drugExtension?.hasDrugExtension && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2 text-xs">
                      <span className="font-medium text-slate-600">의약품 상세</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">검증: {detail.classification.drugExtension.verificationStatus}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">광고: {detail.classification.drugExtension.advertisingReviewStatus}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">공개: {detail.classification.drugExtension.publicDisplayPolicy}</span>
                      <span className="text-slate-300">상세 검토는 후속 화면에서 관리</span>
                    </div>
                  )}
                </div>
              )}

              {/* WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1: 의약품 공급 gate 안내 */}
              <SupplyGateNotice candidate={detail} />

              {/* WO-..-BULK-OPERATOR-REVIEW-V4: 공급자 대량 등록 정보 + CSV row 요약 */}
              <BulkDetailSection candidate={detail} />

              {/* F4: 의약품 분류 refine (matched master 한정) */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">의약품 분류 수정 (검토)</label>
                {!detail.matchedProductMasterId ? (
                  <p className="text-xs text-slate-400">기존 상품에 먼저 매칭해야 분류를 수정할 수 있습니다.</p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <select
                        value={refineCategory}
                        onChange={(e) => setRefineCategory(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">미지정</option>
                        <option value="drug_unspecified">의약품 미분류</option>
                        <option value="otc">비처방의약품</option>
                        <option value="rx">처방의약품</option>
                        <option value="quasi_drug">의약외품</option>
                      </select>
                      <input
                        type="text"
                        value={refineNote}
                        onChange={(e) => setRefineNote(e.target.value)}
                        placeholder="메모 (선택)"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleRefine}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                      >
                        분류 저장
                      </button>
                    </div>
                    {refineCategory === 'rx' && (
                      <div className="mt-2 rounded-lg bg-red-50 border border-red-100 p-2 text-xs text-red-700">
                        처방의약품으로 분류하면 고객 공개 노출·온라인 판매·광고 노출은 기본 차단 상태로 유지됩니다.
                        이번 변경은 분류 표시와 검토 정책에만 반영됩니다.
                      </div>
                    )}
                    {refineMessage && <p className="mt-1 text-xs text-slate-500">{refineMessage}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">이 분류 변경은 노출·판매 권한을 열지 않습니다. 온라인 판매/고객 노출은 별도 검토 정책이 필요합니다.</p>
                  </>
                )}
              </div>
              {/* Info grid */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Field label="식별자 유형" value={detail.identifierType} />
                <Field label="식별자 값" value={detail.identifierValue} />
                <Field label="정규화 값" value={detail.normalizedIdentifierValue} />
                <Field label="출처" value={SOURCE_LABEL[detail.sourceType] || detail.sourceType} />
                <Field label="서비스" value={detail.serviceKey} />
                <Field label="조직" value={detail.organizationId} />
                <Field label="브랜드" value={detail.candidateBrand} />
                <Field label="제조사" value={detail.candidateManufacturer} />
                <Field label="카테고리" value={detail.candidateCategory} />
                <Field label="규격/단위" value={[detail.candidateSpec, detail.candidateUnit].filter(Boolean).join(' / ')} />
                <Field label="가격" value={detail.candidatePrice} />
                <Field label="등록된 O4O 상품(Master) ID" value={detail.matchedProductMasterId} />
                <Field label="생성일" value={new Date(detail.createdAt).toLocaleString('ko-KR')} />
                <Field label="검토 메모" value={detail.reviewNote} />
              </dl>

              {detail.candidateImageUrl && (
                <img src={detail.candidateImageUrl} alt="후보 이미지" className="max-h-40 rounded-lg border border-slate-100" />
              )}

              {/* 활용 상품으로 추가 (link-to-listing) */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">활용 상품으로 추가 (내 약국/내 매장)</label>
                {!detail.matchedProductMasterId ? (
                  <p className="text-xs text-slate-400">매칭된 상품(ProductMaster)이 있어야 활용 상품으로 추가할 수 있습니다. 먼저 재매칭/수동매칭하세요.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={linkOrgId}
                        onChange={(e) => setLinkOrgId(e.target.value)}
                        placeholder="조직 ID (organizationId)"
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={linkServiceKey}
                        onChange={(e) => setLinkServiceKey(e.target.value)}
                        placeholder="서비스 키 (예: kpa)"
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={linkDisplayName}
                      onChange={(e) => setLinkDisplayName(e.target.value)}
                      placeholder="매장 표시명 (선택, 미입력 시 후보명/상품명)"
                      className="w-full mt-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleLink}
                        disabled={actionLoading || !linkOrgId.trim() || !linkServiceKey.trim()}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                      >
                        활용 상품으로 추가
                      </button>
                      {linkMessage && <span className="text-xs text-slate-500">{linkMessage}</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">기존 상품(Master)을 매장 활용 상품(StoreProductProfile + Listing)으로 추가합니다. 신규 상품 생성 아님.</p>
                  </>
                )}
              </div>

              {/* 반려 */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">반려 사유 (선택)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 입력하세요"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setDetail(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                닫기
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleArchive}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 disabled:opacity-50"
                >
                  보관
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  반려
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-700 break-all">{value || <span className="text-slate-300">-</span>}</dd>
    </div>
  );
}

// ─── WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 ───
// 의약품 후보(OTC/Rx/미분류) 공급 gate 안내. classification.productTypeClass 기준. 비의약품은 미렌더.
function SupplyGateNotice({ candidate }: { candidate: ProductCandidate }) {
  const cls = candidate.classification?.productTypeClass;
  if (cls === 'otc_drug') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <strong>비처방 의약품(OTC) 후보입니다.</strong> 일반 매장 공급·이벤트 오퍼·유통참여형 펀딩으로 자동 연결하지 마세요.
        <strong> 약국 매장 유형 대상 공급 후보로만</strong> 검토하세요. 고객 노출·온라인 판매는 별도 검토 정책이 필요합니다.
      </div>
    );
  }
  if (cls === 'rx_drug') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        <strong>처방의약품(Rx) 후보입니다.</strong> O4O에서는 제품/유통 정보 단위로만 관리하며, 일반 판매·고객 노출·이벤트 오퍼·유통참여형 펀딩으로 연결하지 않습니다.
        활용 상품(매장 listing) 연결도 차단됩니다.
      </div>
    );
  }
  if (cls === 'drug_unspecified') {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
        <strong>의약품 분류가 필요합니다.</strong> 비처방/처방 여부가 확정되기 전까지 후속 공급 활동을 진행하지 마세요. 아래 "의약품 분류 수정"으로 분류를 확정하세요.
      </div>
    );
  }
  return null;
}

// ─── WO-O4O-NETURE-SUPPLIER-BULK-OPERATOR-REVIEW-V4 ───
// 공급자 대량 등록 후보 요약(제품유형/분류/CSV row/공급자/주요 fields) + rawPayload 원문 접기.
// bulk 가 아니어도 rawPayload 가 있으면 원문만 접기로 제공. rawPayload null 안전.

const BULK_FIELD_ORDER = [
  '제품명', '제조사', '브랜드', '공급자상품코드', '의약품표준코드', '바코드또는표준코드', '바코드',
  '보험코드', '포장단위', '성분명', '함량', '제형', '규격', '단위', '기본공급가', '제품설명', '공급메모', '비고',
];

function BulkDetailSection({ candidate }: { candidate: ProductCandidate }) {
  const bulk = getBulkInfo(candidate);
  const raw = candidate.rawPayload;
  const hasRaw = raw && typeof raw === 'object' && Object.keys(raw).length > 0;
  if (!bulk.isBulk && !hasRaw) return null;

  const fields = bulk.fields ?? {};
  const fieldKeys = BULK_FIELD_ORDER.filter((k) => (fields[k] ?? '').trim());

  return (
    <div className="border-t border-slate-100 pt-4">
      {bulk.isBulk && (
        <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800">공급자 대량 등록</span>
            {bulk.productTypeLabel && (
              <span className="px-2 py-0.5 rounded text-xs bg-white border border-violet-200 text-violet-700">{bulk.productTypeLabel}</span>
            )}
            {bulk.rowNumber != null && (
              <span className="px-2 py-0.5 rounded text-xs bg-white border border-slate-200 text-slate-500">CSV row {bulk.rowNumber}</span>
            )}
            {bulk.duplicateInBatch && (
              <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">중복 가능 — 검토 필요</span>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Field label="제품 유형" value={bulk.productTypeLabel} />
            <Field label="규제 유형(regulatoryType)" value={bulk.regulatoryType} />
            <Field label="의약품 분류(drugCategory)" value={bulk.drugCategory} />
            <Field label="공급자 ID" value={bulk.supplierId} />
          </dl>

          {fieldKeys.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 mb-1">CSV 행 요약</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {fieldKeys.map((k) => <Field key={k} label={k} value={fields[k]} />)}
              </dl>
            </div>
          )}
        </div>
      )}

      {hasRaw && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">원본 rawPayload 보기</summary>
          <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-900 text-slate-100 text-[11px] p-3 whitespace-pre-wrap break-all">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
