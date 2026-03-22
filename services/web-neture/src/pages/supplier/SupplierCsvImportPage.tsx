/**
 * SupplierCsvImportPage — CSV 상품 일괄 등록
 *
 * 4 Sections:
 *  1. Template Download — CSV 양식 다운로드
 *  2. Upload — 파일 선택 + 업로드 (자동 검증)
 *  3. Batch List — 기존 배치 목록
 *  4. Batch Detail Modal — 행 상세 + Apply
 *
 * WO-NETURE-CSV-IMPORT-UI-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { csvImportApi, type CsvBatch, type CsvBatchDetail } from '../../lib/api/csvImport';

// ─── XLSX Template Download ──────────────────────────────────────────────────
function downloadTemplate() {
  csvImportApi.downloadTemplate().catch((err) => {
    console.error('[Template] Download failed:', err);
  });
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    VALID: 'bg-green-100 text-green-800',
    VALIDATED: 'bg-green-100 text-green-800',
    APPLIED: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-red-100 text-red-800',
    PENDING: 'bg-gray-100 text-gray-600',
    LINK_EXISTING: 'bg-indigo-100 text-indigo-800',
    CREATE_MASTER: 'bg-emerald-100 text-emerald-800',
    REJECT: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function SupplierCsvImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [batches, setBatches] = useState<CsvBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const [selectedBatch, setSelectedBatch] = useState<CsvBatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // ─── Load batches ─────────────────────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    const data = await csvImportApi.getBatches();
    setBatches(data);
    setBatchesLoading(false);
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // ─── Upload handler ───────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await csvImportApi.uploadCsv(file);
      if (!result.success) {
        setUploadError(result.error || 'Upload failed');
        return;
      }
      setFile(null);
      // Reset file input
      const input = document.getElementById('csv-file-input') as HTMLInputElement;
      if (input) input.value = '';
      await loadBatches();
      // Auto-open the new batch detail
      if (result.data) {
        handleOpenDetail(result.data.id);
      }
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Batch detail ─────────────────────────────────────────────────────────
  const handleOpenDetail = async (batchId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const result = await csvImportApi.getBatchDetail(batchId);
      if (!result.success) {
        setDetailError(result.error || 'Failed to load batch');
        return;
      }
      setSelectedBatch(result.data ?? null);
    } catch (err) {
      setDetailError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedBatch(null);
    setDetailError(null);
    setApplyError(null);
    setApplySuccess(null);
  };

  // ─── Apply handler ────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (!selectedBatch) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const result = await csvImportApi.applyBatch(selectedBatch.id);
      if (!result.success) {
        setApplyError(result.error || 'Apply failed');
        return;
      }
      const d = result.data;
      setApplySuccess(
        `적용 완료: Offer ${d?.appliedOffers ?? 0}건, Master 생성 ${d?.createdMasters ?? 0}건, 기존 연결 ${d?.linkedExisting ?? 0}건`,
      );
      await loadBatches();
      // Refresh detail
      await handleOpenDetail(selectedBatch.id);
    } catch (err) {
      setApplyError((err as Error).message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">CSV 상품 일괄 등록</h1>

      {/* ═══ Section 1: Template Download ═══ */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">템플릿 다운로드</h2>
        <p className="text-sm text-gray-500 mb-3">
          아래 XLSX 양식을 다운로드하여 상품 정보를 입력한 후, CSV로 저장하여 업로드하세요.
        </p>
        <div className="mb-3 text-xs text-gray-400 space-y-1">
          <p><strong>필수 컬럼:</strong> barcode, marketing_name, supply_price</p>
          <p><strong>선택 컬럼:</strong> distribution_type, msrp, stock_qty, brand, manufacturer_name, image_url, consumer_short_description</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900"
        >
          XLSX 템플릿 다운로드
        </button>
      </section>

      {/* ═══ Section 2: Upload ═══ */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">파일 업로드</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="csv-file-input" className="block text-sm font-medium text-gray-700 mb-1">
              CSV 파일 선택
            </label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 whitespace-nowrap"
          >
            {uploading ? '업로드 중...' : '업로드 및 검증'}
          </button>
        </div>
        {uploadError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {uploadError}
          </div>
        )}
      </section>

      {/* ═══ Section 3: Batch List ═══ */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">업로드 이력</h2>
          <button
            onClick={loadBatches}
            disabled={batchesLoading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            새로고침
          </button>
        </div>

        {batchesLoading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-gray-400">업로드된 배치가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">파일명</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2 pr-4">전체</th>
                  <th className="pb-2 pr-4">유효</th>
                  <th className="pb-2 pr-4">거부</th>
                  <th className="pb-2 pr-4">적용</th>
                  <th className="pb-2">생성일</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => handleOpenDetail(b.id)}
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {b.fileName || '(unnamed)'}
                    </td>
                    <td className="py-2 pr-4"><StatusBadge status={b.status} /></td>
                    <td className="py-2 pr-4">{b.totalRows}</td>
                    <td className="py-2 pr-4 text-green-600">{b.validRows}</td>
                    <td className="py-2 pr-4 text-red-600">{b.rejectedRows}</td>
                    <td className="py-2 pr-4 text-blue-600">{b.appliedRows}</td>
                    <td className="py-2 text-gray-400 text-xs">
                      {new Date(b.createdAt).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══ Section 4: Batch Detail Modal ═══ */}
      {(selectedBatch || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                배치 상세 {selectedBatch?.fileName ? `— ${selectedBatch.fileName}` : ''}
              </h3>
              <button
                onClick={handleCloseDetail}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading && !selectedBatch ? (
                <p className="text-sm text-gray-400">불러오는 중...</p>
              ) : detailError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {detailError}
                </div>
              ) : selectedBatch ? (
                <>
                  {/* Summary */}
                  <div className="flex gap-4 mb-4 text-sm">
                    <span>상태: <StatusBadge status={selectedBatch.status} /></span>
                    <span className="text-gray-500">전체: {selectedBatch.totalRows}</span>
                    <span className="text-green-600">유효: {selectedBatch.validRows}</span>
                    <span className="text-red-600">거부: {selectedBatch.rejectedRows}</span>
                    <span className="text-blue-600">적용: {selectedBatch.appliedRows}</span>
                  </div>

                  {/* Row table */}
                  {selectedBatch.rows && selectedBatch.rows.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-2 pr-3">#</th>
                            <th className="pb-2 pr-3">바코드</th>
                            <th className="pb-2 pr-3">공급가</th>
                            <th className="pb-2 pr-3">유통</th>
                            <th className="pb-2 pr-3">상태</th>
                            <th className="pb-2 pr-3">액션</th>
                            <th className="pb-2">오류</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBatch.rows.map((row) => (
                            <tr key={row.id} className="border-b border-gray-100">
                              <td className="py-2 pr-3 text-gray-400">{row.rowNumber}</td>
                              <td className="py-2 pr-3 font-mono text-xs">{row.parsedBarcode || '-'}</td>
                              <td className="py-2 pr-3">
                                {row.parsedSupplyPrice != null ? row.parsedSupplyPrice.toLocaleString() : '-'}
                              </td>
                              <td className="py-2 pr-3 text-xs">{row.parsedDistributionType || '-'}</td>
                              <td className="py-2 pr-3"><StatusBadge status={row.validationStatus} /></td>
                              <td className="py-2 pr-3 text-xs text-gray-500">
                                {row.actionType ? <StatusBadge status={row.actionType} /> : '-'}
                              </td>
                              <td className="py-2 text-xs text-red-500">{row.validationError || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Apply / Error / Success */}
                  {applyError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {applyError}
                    </div>
                  )}
                  {applySuccess && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      {applySuccess}
                    </div>
                  )}

                  {selectedBatch.status === 'VALIDATED' && selectedBatch.validRows > 0 && (
                    <button
                      onClick={handleApply}
                      disabled={applying}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700"
                    >
                      {applying ? '적용 중...' : `카탈로그에 적용 (${selectedBatch.validRows}건)`}
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
