/**
 * SupplierBulkRegisterPage — 대량 등록 (제품 유형별 분기 landing)
 *
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1
 *
 * 대량 등록은 한 파일에 여러 유형을 섞지 않는다 — 유형별로 분리한다.
 * 1차 범위: 유형별 진입 + 템플릿 안내 + 혼합 금지 안내 + 업로더 연결.
 * (유형별 전용 파서/저장은 후속: WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1)
 */
import { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  SUPPLIER_PRODUCT_TYPES,
  getBulkTemplateColumns,
  buildBulkTemplateCsv,
  type SupplierProductTypeDef,
} from '../../lib/supplierProductTypes';
import { validateBulkCsv, type BulkValidationResult, type BulkRowStatus } from '../../lib/bulkUploadValidation';
import { submitBulkCandidates, type BulkCandidateSubmitResult } from '../../lib/api/supplier';

/** 유형별 CSV 템플릿(헤더만) 다운로드 — 백엔드 없이 클라이언트 생성 */
function downloadTemplate(t: SupplierProductTypeDef) {
  const csv = buildBulkTemplateCsv(t.key);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulk-template_${t.key}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2: 행 상태 배지 */
const ROW_STATUS_META: Record<BulkRowStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: '정상', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
  warning: { label: '경고', cls: 'text-amber-700 bg-amber-50 border-amber-200', Icon: AlertCircle },
  error: { label: '오류', cls: 'text-red-700 bg-red-50 border-red-200', Icon: XCircle },
};

export default function SupplierBulkRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialKey = searchParams.get('productType');
  const [selected, setSelected] = useState<SupplierProductTypeDef | null>(
    SUPPLIER_PRODUCT_TYPES.find((t) => t.key === initialKey) ?? null,
  );

  // WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2: 업로드/검증/미리보기 (저장 없음)
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkValidationResult | null>(null);

  // WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3: 저장(후보 제출) 상태
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<BulkCandidateSubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetUpload = useCallback(() => {
    setFileName(null);
    setParseError(null);
    setResult(null);
    setConfirmOpen(false);
    setSubmitResult(null);
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selected || !result || result.hasError) return;
    const rows = result.rows
      .filter((r) => r.status !== 'error')
      .map((r) => ({ rowNumber: r.rowNumber, fields: r.fields, raw: r.raw }));
    if (rows.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitBulkCandidates(selected.key, rows);
      setSubmitResult(res);
      setConfirmOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setSubmitError(e.response?.data?.message || e.response?.data?.error || e.message || '제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [selected, result]);

  const handleSelectType = (t: SupplierProductTypeDef) => {
    setSelected(t);
    resetUpload(); // 유형 변경 시 이전 검증 결과 초기화 (유형별 기준이 다름)
  };

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = ''; // 같은 파일 재선택 허용
      if (!f || !selected) return;
      setParseError(null);
      setResult(null);
      setFileName(f.name);
      const MAX = 10 * 1024 * 1024;
      if (f.size > MAX) {
        setParseError(`파일이 너무 큽니다 (${(f.size / 1024 / 1024).toFixed(1)}MB). 최대 10MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          setResult(validateBulkCsv(selected.key, String(reader.result ?? '')));
        } catch (err) {
          setParseError((err as Error).message || '파일을 분석하지 못했습니다.');
        }
      };
      reader.onerror = () => setParseError('파일을 읽지 못했습니다.');
      reader.readAsText(f, 'utf-8');
    },
    [selected],
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">대량 등록</h1>
        <p className="text-sm text-slate-500 mt-1">
          제품 유형을 선택해 유형별 템플릿으로 대량 등록합니다.
        </p>
      </div>

      {/* 혼합 금지 안내 */}
      <div className="mb-5 flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          한 파일에 <strong>여러 제품 유형을 섞지 마세요.</strong> 유형마다 필요한 항목과 검증 기준이 다릅니다.
          비의약품·의약외품·비처방 의약품·처방의약품·미분류를 <strong>각각 별도 파일</strong>로 등록하세요.
        </div>
      </div>

      {/* 유형 선택 */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {SUPPLIER_PRODUCT_TYPES.map((t) => {
          const active = selected?.key === t.key;
          return (
            <button
              key={t.key}
              onClick={() => handleSelectType(t)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{t.label} 대량 등록</span>
                {t.pharmacyTarget && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">약국 대상</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 선택 후 안내 */}
      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800 mb-2">{selected.label} — 대량 등록</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 mb-4 list-disc pl-5">
            <li>아래 <strong>{selected.label} 전용 템플릿</strong>을 받아 작성한 뒤 업로드하세요.</li>
            <li>업로드 파일에는 <strong>{selected.label}만</strong> 포함하세요 (다른 유형 혼합 금지).</li>
            {selected.pharmacyTarget && <li>약국 대상 의약품류는 업로드 후 <strong>운영자 검토</strong>를 거쳐 공개됩니다.</li>}
            {selected.rx && (
              <li>
                처방의약품은 <strong>유통 정보화 범위(제품/유통 단위)</strong>로만 등록됩니다 —
                유효기간·일련번호(lot/serial)·재고 이력 컬럼은 템플릿에 없으며 입력받지 않습니다.
                일반 공급오퍼/이벤트/펀딩에 자동 연결되지 않습니다.
              </li>
            )}
          </ul>

          {/* 유형별 템플릿 컬럼 + 다운로드 */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-600">{selected.label} 템플릿 컬럼</span>
              <button
                onClick={() => downloadTemplate(selected)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
              >
                <Download className="w-3.5 h-3.5" /> CSV 템플릿 다운로드
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {getBulkTemplateColumns(selected.key).map((col) => (
                <span key={col} className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">{col}</span>
              ))}
            </div>
          </div>

          {/* WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2: 업로드 + 저장 전 검증/미리보기 */}
          <div className="rounded-md border border-slate-200 bg-white p-3 mb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-600">작성한 {selected.label} 파일 검증</span>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> CSV 파일 선택
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              이 파일에는 <strong>선택한 유형({selected.label})의 제품만</strong> 포함해야 합니다. 유형이 다르면 각 템플릿으로 따로 업로드하세요.
              업로드 시 형식·오류를 <strong>저장 전에</strong> 확인합니다(저장은 아직 실행되지 않습니다).
            </p>
            {fileName && <p className="mt-2 text-xs text-slate-600">선택한 파일: <span className="font-medium">{fileName}</span></p>}
            {parseError && <p className="mt-2 text-xs text-red-600">{parseError}</p>}
          </div>

          {result && (
            <BulkPreview
              result={result}
              onRequestSave={() => { setSubmitError(null); setConfirmOpen(true); }}
            />
          )}

          {/* 보조 진입 */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              to="/supplier/products/import-assistant"
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              <FileSpreadsheet className="w-4 h-4" /> 등록 도우미
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            제출된 제품은 즉시 확정 등록되지 않고 <strong>운영자 검토용 후보</strong>로 저장됩니다. 운영자 검토 또는 기존 제품 매칭 과정을 거칩니다(BULK-UPLOAD-SAVE-V3).
          </p>
        </div>
      )}

      {/* 저장 전 확인 모달 — WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3 */}
      {confirmOpen && selected && result && (
        <ConfirmDialog
          typeLabel={selected.label}
          isRx={!!selected.rx}
          isDrug={selected.regulatoryType === 'DRUG'}
          total={result.totalRows}
          ok={result.okCount}
          warning={result.warningCount}
          error={result.errorCount}
          submitting={submitting}
          submitError={submitError}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleSubmit}
        />
      )}

      {/* 저장 결과 모달 */}
      {submitResult && (
        <ResultDialog
          result={submitResult}
          onClose={() => setSubmitResult(null)}
          onGoList={() => navigate('/supplier/products')}
          onContinue={resetUpload}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  저장 전 확인 / 결과 모달                                              */
/* ------------------------------------------------------------------ */

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">{children}</div>
    </div>
  );
}

function ConfirmDialog(props: {
  typeLabel: string; isRx: boolean; isDrug: boolean;
  total: number; ok: number; warning: number; error: number;
  submitting: boolean; submitError: string | null;
  onCancel: () => void; onConfirm: () => void;
}) {
  const saveable = props.ok + props.warning;
  return (
    <ModalShell>
      <h3 className="text-base font-semibold text-slate-900 mb-2">제품 후보 제출 확인</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">
        대량 등록은 제품을 즉시 확정 등록하지 않습니다. 검증된 제품 후보를 제출하고, <strong>운영자 검토 또는 기존 제품 매칭</strong> 과정을 거칩니다.
      </p>
      <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 space-y-1 mb-3">
        <div>제품 유형: <strong>{props.typeLabel}</strong></div>
        <div>제출 대상: <strong>{saveable}건</strong> (정상 {props.ok} · 경고 {props.warning})</div>
        {props.error > 0 && <div className="text-red-600">오류 {props.error}건은 제출에서 제외됩니다.</div>}
      </div>
      {props.isDrug && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
          {props.isRx
            ? '처방의약품은 운영자 검토 대상으로 저장되며, 일반 판매·고객 노출·이벤트·펀딩에 자동 연결되지 않습니다. 유효기간·일련번호·lot·재고 정보는 수집하지 않습니다.'
            : '의약품은 운영자 검토 대상으로 저장되며, 일반 공급/이벤트/펀딩에 자동 연결되지 않습니다.'}
        </p>
      )}
      {props.submitError && <p className="text-xs text-red-600 mb-2">{props.submitError}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={props.onCancel} disabled={props.submitting}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          취소
        </button>
        <button onClick={props.onConfirm} disabled={props.submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {props.submitting ? '제출 중…' : `${saveable}건 제출`}
        </button>
      </div>
    </ModalShell>
  );
}

function ResultDialog(props: {
  result: BulkCandidateSubmitResult;
  onClose: () => void; onGoList: () => void; onContinue: () => void;
}) {
  const { result } = props;
  return (
    <ModalShell>
      <h3 className="text-base font-semibold text-slate-900 mb-3">제출 결과</h3>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="rounded-md bg-slate-50 border border-slate-200 p-2">전체 <strong>{result.total}</strong></div>
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2 text-emerald-700">생성 <strong>{result.created}</strong></div>
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-amber-700">중복 가능 <strong>{result.duplicate}</strong></div>
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-red-700">실패 <strong>{result.failed}</strong></div>
      </div>
      {result.results.some((r) => r.status !== 'created') && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 mb-3">
          <table className="w-full text-xs">
            <tbody>
              {result.results.filter((r) => r.status !== 'created').map((r) => (
                <tr key={r.rowNumber} className="border-b border-slate-100">
                  <td className="py-1.5 px-2 text-slate-400">#{r.rowNumber}</td>
                  <td className="py-1.5 px-2 text-slate-700">{r.status}</td>
                  <td className="py-1.5 px-2 text-slate-500">{r.message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500 mb-3">
        제출된 후보는 운영자 검토 또는 기존 제품 매칭을 거쳐 활용됩니다.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={props.onContinue}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
          대량 등록 계속하기
        </button>
        <button onClick={props.onGoList}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
          제품 목록으로 이동
        </button>
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  미리보기 — WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2                */
/* ------------------------------------------------------------------ */

function BulkPreview({ result, onRequestSave }: { result: BulkValidationResult; onRequestSave: () => void }) {
  const saveableCount = result.okCount + result.warningCount;
  const canSave = !result.hasError && saveableCount > 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 mb-3">
      {/* 요약 */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-sm font-semibold text-slate-800">검증 결과</span>
        <span className="text-xs text-slate-500">전체 {result.totalRows}행</span>
        <span className="text-xs text-emerald-700">정상 {result.okCount}</span>
        <span className="text-xs text-amber-700">경고 {result.warningCount}</span>
        <span className="text-xs text-red-700">오류 {result.errorCount}</span>
      </div>

      {/* header 오류/경고 */}
      {result.headerErrors.length > 0 && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 mb-1">
            <XCircle className="w-3.5 h-3.5" /> 헤더 오류 — 이 파일로는 저장할 수 없습니다
          </div>
          <ul className="list-disc pl-5 text-xs text-red-700 space-y-0.5">
            {result.headerErrors.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      {result.headerWarnings.length > 0 && (
        <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1">
            <AlertCircle className="w-3.5 h-3.5" /> 헤더 경고
          </div>
          <ul className="list-disc pl-5 text-xs text-amber-700 space-y-0.5">
            {result.headerWarnings.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {/* 미리보기 테이블 */}
      {result.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">제품명</th>
                <th className="py-2 pr-3 font-medium">제조사/브랜드</th>
                <th className="py-2 pr-3 font-medium">SKU</th>
                <th className="py-2 pr-3 font-medium">코드/바코드</th>
                <th className="py-2 pr-3 font-medium">기본공급가</th>
                <th className="py-2 pr-3 font-medium">상태</th>
                <th className="py-2 pr-3 font-medium">메시지</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => {
                const meta = ROW_STATUS_META[row.status];
                const Icon = meta.Icon;
                return (
                  <tr key={row.rowNumber} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 text-slate-400">{row.rowNumber}</td>
                    <td className="py-2 pr-3 text-slate-800">{row.productName || <span className="text-red-400">(없음)</span>}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.makerOrBrand || '-'}</td>
                    <td className="py-2 pr-3 text-slate-600 font-mono">{row.sku || '-'}</td>
                    <td className="py-2 pr-3 text-slate-600 font-mono">{row.code || '-'}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.price || '-'}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] ${meta.cls}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-500">
                      {row.messages.length > 0 ? row.messages.join(' · ') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 저장(후보 제출) — WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3 */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={!canSave}
          onClick={onRequestSave}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            canSave ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          제품 후보 제출 ({saveableCount}건)
        </button>
        {result.hasError ? (
          <span className="text-xs text-red-600">오류가 있어 제출할 수 없습니다. 오류를 수정한 뒤 다시 업로드하세요.</span>
        ) : (
          <span className="text-xs text-slate-500">제출하면 제품을 즉시 확정 등록하지 않고, 운영자 검토용 후보로 저장합니다.</span>
        )}
      </div>
    </div>
  );
}
