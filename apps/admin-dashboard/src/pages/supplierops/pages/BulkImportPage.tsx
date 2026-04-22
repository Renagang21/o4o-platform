/**
 * SupplierOps — Bulk 상품 등록 페이지
 *
 * WO-O4O-BULK-MATCHING-NORMALIZATION-V1
 *
 * 흐름:
 *   1. XLSX 파일 업로드 → bulk-match API 호출 → 매칭 결과 표시
 *   2. 검토 테이블: EXACT_MATCH(자동) / SIMILAR_MATCH(검토 필요) / NOT_FOUND(신규)
 *   3. 확정 → 기존 CSV 업로드 엔드포인트에 동일 파일 업로드
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, HelpCircle, ArrowLeft, Download } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { bulkMatchProducts } from '../../../api/product-library.api';
import type { MatchResult, MasterCandidate, BulkMatchResponse } from '../../../api/product-library.api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'review' | 'applying' | 'done';

interface ReviewRow extends MatchResult {
  /** SIMILAR_MATCH에서 사용자가 선택한 후보 (없으면 첫 후보 사용) */
  selectedCandidate?: MasterCandidate;
}

// ─── Status 표시 ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: MatchResult['status'] }> = ({ status }) => {
  const map: Record<MatchResult['status'], { label: string; className: string; icon: React.ReactNode }> = {
    EXACT_MATCH: {
      label: '자동 연결',
      className: 'bg-green-100 text-green-800',
      icon: <CheckCircle2 size={12} className="mr-1" />,
    },
    SIMILAR_MATCH: {
      label: '검토 필요',
      className: 'bg-yellow-100 text-yellow-800',
      icon: <HelpCircle size={12} className="mr-1" />,
    },
    NOT_FOUND: {
      label: '신규 등록',
      className: 'bg-blue-100 text-blue-800',
      icon: <AlertCircle size={12} className="mr-1" />,
    },
  };
  const { label, className, icon } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {icon}{label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const BulkImportPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [matching, setMatching] = useState(false);
  const [summary, setSummary] = useState<BulkMatchResponse['summary'] | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [applyResult, setApplyResult] = useState<{ success: number; failed: number } | null>(null);

  // ─── File 처리 ───────────────────────────────────────────────────────────────

  const handleFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error('XLSX, XLS, CSV 파일만 업로드 가능합니다');
      return;
    }
    setFile(selectedFile);
    await runBulkMatch(selectedFile);
  };

  const runBulkMatch = async (f: File) => {
    setMatching(true);
    try {
      const result = await bulkMatchProducts(f);
      setSummary(result.summary);
      setRows(result.data.map((r) => ({
        ...r,
        selectedCandidate: r.candidates?.[0],
      })));
      setStep('review');
    } catch {
      toast.error('매칭 처리 중 오류가 발생했습니다');
    } finally {
      setMatching(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ─── Review 액션 ─────────────────────────────────────────────────────────────

  const handleSelectCandidate = (rowIndex: number, candidate: MasterCandidate) => {
    setRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, selectedCandidate: candidate } : r)),
    );
  };

  // ─── 확정 저장 ────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!file) return;
    setStep('applying');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authClient.api.post<{
        success: boolean;
        data?: { validRows: number; rejectedRows: number };
      }>('/neture/supplier/csv-import/upload', formData);

      if (res.data?.success) {
        const { validRows = 0, rejectedRows = 0 } = res.data.data ?? {};
        setApplyResult({ success: validRows, failed: rejectedRows });
        setStep('done');
        toast.success(`${validRows}건 등록 완료`);
      } else {
        toast.error('업로드에 실패했습니다');
        setStep('review');
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다');
      setStep('review');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="대량 상품 등록"
        subtitle="XLSX 파일로 상품을 한 번에 등록하세요"
        actions={[
          {
            id: 'back',
            label: '목록으로',
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => navigate('/supplierops/products'),
            variant: 'secondary' as const,
          },
        ]}
      />

      {/* 진행 표시 */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['upload', 'review', 'done'] as const).map((s, i) => {
          const labels = { upload: '1. 파일 업로드', review: '2. 매칭 검토', done: '3. 완료' };
          const active = s === step || (s === 'review' && step === 'applying');
          const displayStep = step === 'applying' ? 'review' : step;
          const done = (i < (['upload', 'review', 'done'] as const).indexOf(displayStep));
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className="flex-1 h-px bg-gray-200" />}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                done ? 'bg-green-100 text-green-700' :
                active ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {labels[s]}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* 템플릿 다운로드 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-blue-900">엑셀 템플릿 사용을 권장합니다</p>
              <p className="text-blue-700 mt-0.5">상품명은 제품 포장에 표시된 공식 명칭 기준으로 입력해 주세요 (예: 타이레놀정 500mg)</p>
            </div>
            <a
              href="/api/v1/neture/supplier/products/template"
              className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              <Download className="w-4 h-4" />
              템플릿 다운로드
            </a>
          </div>

          {/* 드래그 앤 드롭 영역 */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {matching ? (
              <div className="text-sm text-gray-500">매칭 분석 중...</div>
            ) : (
              <>
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700">XLSX, XLS, CSV 파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-gray-500 mt-1">최대 200행</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {(step === 'review' || step === 'applying') && summary && (
        <div className="space-y-4">
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '자동 연결', count: summary.exactMatch, color: 'green' },
              { label: '검토 필요', count: summary.similarMatch, color: 'yellow' },
              { label: '신규 등록', count: summary.notFound, color: 'blue' },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-white rounded-lg shadow p-4 text-center">
                <div className={`text-2xl font-bold text-${color}-600`}>{count}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* 검토 테이블 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
              매칭 결과 ({rows.length}건)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-6">#</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">입력 상품명</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">상태</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">매칭 결과</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={i} className={
                      row.status === 'EXACT_MATCH' ? 'bg-green-50/30' :
                      row.status === 'SIMILAR_MATCH' ? 'bg-yellow-50/30' : ''
                    }>
                      <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium text-gray-800">{row.rawName}</span>
                        {row.normalizedName !== row.rawName.toLowerCase() && (
                          <span className="ml-1 text-xs text-gray-400">({row.normalizedName})</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-2">
                        {row.status === 'EXACT_MATCH' && row.master && (
                          <span className="text-green-700 text-xs">
                            {row.master.name}
                            <span className="text-gray-400 ml-1">— {row.master.manufacturerName}</span>
                          </span>
                        )}
                        {row.status === 'SIMILAR_MATCH' && row.candidates && (
                          <select
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white max-w-xs"
                            value={row.selectedCandidate?.id ?? ''}
                            onChange={(e) => {
                              const c = row.candidates!.find((c) => c.id === e.target.value);
                              if (c) handleSelectCandidate(i, c);
                            }}
                          >
                            <option value="">선택 (기본: 첫 후보)</option>
                            {row.candidates.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} — {c.manufacturerName}</option>
                            ))}
                          </select>
                        )}
                        {row.status === 'NOT_FOUND' && (
                          <span className="text-blue-600 text-xs">신규 ProductMaster 생성 예정</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => { setStep('upload'); setRows([]); setSummary(null); setFile(null); }}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={step === 'applying'}
            >
              ← 파일 다시 선택
            </button>
            <button
              onClick={handleConfirm}
              disabled={step === 'applying'}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {step === 'applying' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  확정하여 등록 ({rows.length}건)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && applyResult && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">등록 완료</h2>
          <p className="text-sm text-gray-600">
            {applyResult.success}건 성공
            {applyResult.failed > 0 && ` / ${applyResult.failed}건 실패`}
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => navigate('/supplierops/products')}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              상품 목록으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;
