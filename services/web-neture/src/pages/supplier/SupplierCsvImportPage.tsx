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
    PARTIAL: 'bg-yellow-100 text-yellow-800', // WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1
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

// WO-O4O-NETURE-CSV-XLSX-UPLOAD-NETWORK-ERROR-FIX-V1: 에러 메시지 한국어 매핑
function friendlyError(msg: string): string {
  if (!msg) return '업로드 실패';
  if (msg === 'NETWORK_ERROR') return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
  if (msg.includes('File too large') || msg.includes('FILE_TOO_LARGE')) return '파일 크기가 너무 큽니다. 최대 25MB까지 업로드 가능합니다.';
  if (msg.includes('LIMIT_FILE_SIZE')) return '파일 크기가 서버 제한을 초과했습니다.';
  if (msg.includes('PARSE_ERROR')) return `파일 파싱 실패: ${msg.replace('PARSE_ERROR: ', '')}`;
  if (msg.includes('CSV_EMPTY')) return '파일에 데이터가 없습니다. 헤더 행 아래에 데이터를 입력해주세요.';
  if (msg.includes('XLSX_NO_SHEET')) return 'XLSX 파일에서 시트를 찾을 수 없습니다.';
  if (msg.includes('Unexpected file type') || msg.includes('LIMIT_UNEXPECTED_FILE')) return '지원하지 않는 파일 형식입니다. CSV 또는 XLSX 파일만 업로드 가능합니다.';
  if (msg.includes('SUPPLIER_NOT_ACTIVE')) return '공급자 계정이 활성 상태가 아닙니다. 관리자에게 문의해주세요.';
  if (msg.includes('NO_SUPPLIER')) return '공급자 계정을 찾을 수 없습니다.';
  if (msg.includes('UNAUTHORIZED')) return '로그인이 필요합니다. 다시 로그인해주세요.';
  if (msg.includes('시간이 초과')) return msg; // 이미 한국어
  return msg;
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
  const [retrying, setRetrying] = useState(false); // WO-O4O-NETURE-IMPORT-RETRY-FAILED-V1
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [downloadedCsv, setDownloadedCsv] = useState(false); // WO-O4O-NETURE-IMPORT-FAILED-DOWNLOAD-UX-GUIDE-V1

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
  // WO-O4O-NETURE-CSV-XLSX-UPLOAD-NETWORK-ERROR-FIX-V1
  const handleUpload = async () => {
    if (!file) return;

    // 프론트 사전 검증: 25MB (document 타입 서버 제한과 동일)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`파일 크기가 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 최대 25MB까지 업로드 가능합니다.`);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const result = await csvImportApi.uploadCsv(file);
      if (!result.success) {
        setUploadError(friendlyError(result.error || 'Upload failed'));
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
    setDownloadedCsv(false);
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

  // ─── Apply handler (WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1) ────────────────
  const handleApply = async () => {
    if (!selectedBatch) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const result = await csvImportApi.applyBatch(selectedBatch.id);
      if (!result.success) {
        setApplyError(friendlyError(result.error || 'Apply failed'));
        return;
      }
      const d = result.data;
      const applied = d?.appliedOffers ?? 0;
      const failed = d?.failedRows ?? 0;
      if (failed === 0) {
        setApplySuccess(`적용 완료: 성공 ${applied}건, Master 생성 ${d?.createdMasters ?? 0}건`);
      } else if (applied === 0) {
        setApplyError(`적용 실패: 전체 ${failed}건 실패`);
      } else {
        setApplySuccess(`부분 적용: 성공 ${applied}건, 실패 ${failed}건, Master 생성 ${d?.createdMasters ?? 0}건`);
      }
      await loadBatches();
      await handleOpenDetail(selectedBatch.id);
    } catch (err) {
      setApplyError((err as Error).message);
    } finally {
      setApplying(false);
    }
  };

  // ─── 실패 재처리 (WO-O4O-NETURE-IMPORT-RETRY-FAILED-V1) ─────────────────
  const handleRetry = async () => {
    if (!selectedBatch) return;
    setRetrying(true);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const result = await csvImportApi.retryBatch(selectedBatch.id);
      if (!result.success) {
        setApplyError(friendlyError(result.error || 'Retry failed'));
        return;
      }
      const d = result.data;
      const applied = d?.appliedOffers ?? 0;
      const failed = d?.failedRows ?? 0;
      if (failed === 0) {
        setApplySuccess(`재처리 완료: ${d?.retriedRows ?? 0}건 중 ${applied}건 성공`);
      } else if (applied === 0) {
        setApplyError(`재처리 실패: ${d?.retriedRows ?? 0}건 모두 실패`);
      } else {
        setApplySuccess(`재처리 부분 성공: ${applied}건 성공, ${failed}건 여전히 실패`);
      }
      await loadBatches();
      await handleOpenDetail(selectedBatch.id);
    } catch (err) {
      setApplyError((err as Error).message);
    } finally {
      setRetrying(false);
    }
  };

  // ─── 이력 삭제 (WO-O4O-NETURE-IMPORT-HISTORY-DELETE-V1) ──────────────────
  const handleDeleteBatch = async (batch: CsvBatch, e: React.MouseEvent) => {
    e.stopPropagation(); // row 클릭 (상세 열기) 방지

    // 진행 중 상태 차단
    if (batch.status === 'VALIDATING') {
      alert('검증 진행 중인 배치는 삭제할 수 없습니다.');
      return;
    }

    // APPLIED/PARTIAL 경고
    const isApplied = batch.status === 'APPLIED' || batch.status === 'PARTIAL';
    const msg = isApplied
      ? '이 업로드로 생성된 상품은 삭제되지 않습니다.\n업로드 기록만 삭제됩니다.\n\n삭제하시겠습니까?'
      : '이 업로드 이력을 삭제하시겠습니까?';

    if (!confirm(msg)) return;

    const result = await csvImportApi.deleteBatch(batch.id);
    if (!result.success) {
      alert(friendlyError(result.error || '삭제 실패'));
      return;
    }

    // 모달이 열려 있으면 닫기
    if (selectedBatch?.id === batch.id) {
      handleCloseDetail();
    }
    await loadBatches();
  };

  // ─── 실패 데이터 다운로드 (client-side CSV) ────────────────────────────────
  // WO-O4O-NETURE-IMPORT-FAILED-DOWNLOAD-UX-GUIDE-V1: row_number 포함 + 다운로드 완료 상태
  const handleDownloadFailed = () => {
    if (!selectedBatch?.rows) return;
    const failedRows = selectedBatch.rows.filter((r) => r.applyStatus === 'failed');
    if (failedRows.length === 0) return;

    // CSV 헤더: row_number + rawJson 키 + apply_error
    const sampleKeys = Object.keys(failedRows[0].rawJson || {});
    const headers = ['row_number', ...sampleKeys, 'apply_error'];
    const csvLines = [headers.join(',')];

    for (const row of failedRows) {
      const raw = row.rawJson as Record<string, unknown>;
      const values: string[] = [`"${row.rowNumber}"`];
      for (const k of sampleKeys) {
        const v = String(raw[k] ?? '').replace(/"/g, '""');
        values.push(`"${v}"`);
      }
      values.push(`"${(row.applyError || '').replace(/"/g, '""')}"`);
      csvLines.push(values.join(','));
    }

    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_rows_${selectedBatch.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedCsv(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">상품 일괄 등록</h1>

      {/* ═══ Section 1: Template Download ═══ */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">템플릿 다운로드</h2>
        <p className="text-sm text-gray-500 mb-3">
          아래 XLSX 양식을 다운로드하여 상품 정보를 입력한 후 업로드하세요.
        </p>
        <div className="mb-3 text-xs text-gray-400 space-y-1">
          <p><strong>필수:</strong> supply_price</p>
          <p><strong>권장:</strong> packaging_name, marketing_name</p>
          <p><strong>선택:</strong> barcode, manufacturer_name, brand, origin_country, consumer_price, stock_qty, short_description, detail_description, image_url</p>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-2">파일 업로드</h2>
        <p className="text-sm text-gray-500 mb-4">
          XLSX 또는 CSV 파일을 업로드하세요. 실패 데이터 수정 후 재업로드 시에도 동일하게 사용합니다.
        </p>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="csv-file-input" className="block text-sm font-medium text-gray-700 mb-1">
              파일 선택 (XLSX / CSV)
            </label>
            <input
              id="csv-file-input"
              type="file"
              accept=".xlsx,.csv"
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
                  <th className="pb-2 pr-4">생성일</th>
                  <th className="pb-2"></th>
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
                    <td className="py-2 pr-4 text-gray-400 text-xs">
                      {new Date(b.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-2 text-right">
                      {b.status !== 'VALIDATING' && (
                        <button
                          onClick={(e) => handleDeleteBatch(b, e)}
                          className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          삭제
                        </button>
                      )}
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
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <span>상태: <StatusBadge status={selectedBatch.status} /></span>
                    <span className="text-gray-500">전체: {selectedBatch.totalRows}</span>
                    <span className="text-green-600">유효: {selectedBatch.validRows}</span>
                    <span className="text-red-600">거부: {selectedBatch.rejectedRows}</span>
                    <span className="text-blue-600">적용: {selectedBatch.appliedRows}</span>
                    {/* WO-O4O-NETURE-IMPORT-PRODUCT-TRACE-V1 */}
                    {selectedBatch.rows?.some((r) => r.offerId) && (
                      <span className="text-indigo-600">
                        생성 상품: {selectedBatch.rows.filter((r) => r.offerId).length}건
                      </span>
                    )}
                  </div>

                  {/* Row table — WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1: apply 상태 컬럼 추가 */}
                  {selectedBatch.rows && selectedBatch.rows.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-2 pr-3">#</th>
                            <th className="pb-2 pr-3">바코드</th>
                            <th className="pb-2 pr-3">공급가</th>
                            <th className="pb-2 pr-3">유통</th>
                            <th className="pb-2 pr-3">검증</th>
                            <th className="pb-2 pr-3">액션</th>
                            <th className="pb-2 pr-3">적용</th>
                            <th className="pb-2 pr-3">상품</th>
                            <th className="pb-2">오류</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBatch.rows.map((row) => (
                            <tr key={row.id} className={`border-b border-gray-100 ${row.applyStatus === 'failed' ? 'bg-red-50' : ''}`}>
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
                              <td className="py-2 pr-3 text-center">
                                {row.applyStatus === 'applied' ? (
                                  <span className="text-green-600 font-medium text-xs">OK</span>
                                ) : row.applyStatus === 'failed' ? (
                                  <span className="text-red-600 font-medium text-xs">FAIL</span>
                                ) : (
                                  <span className="text-gray-300 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-xs">
                                {row.offerId ? (
                                  <a
                                    href={`/supplier/products/${row.offerId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    보기
                                  </a>
                                ) : row.masterId && row.applyStatus === 'applied' ? (
                                  <span className="text-gray-400" title={`Master: ${row.masterId.slice(0, 8)}`}>연결됨</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="py-2 text-xs text-red-500">
                                {row.applyError || row.validationError || ''}
                              </td>
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

                  {/* Apply 버튼 */}
                  {(selectedBatch.status === 'VALIDATED' || selectedBatch.status === 'READY') && selectedBatch.validRows > 0 && (
                    <button
                      onClick={handleApply}
                      disabled={applying}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700"
                    >
                      {applying ? '적용 중...' : `카탈로그에 적용 (${selectedBatch.validRows}건)`}
                    </button>
                  )}

                  {/* 실패 재처리 버튼 — WO-O4O-NETURE-IMPORT-RETRY-FAILED-V1 */}
                  {(selectedBatch.status === 'PARTIAL' || selectedBatch.status === 'FAILED') &&
                    selectedBatch.rows?.some((r) => r.applyStatus === 'failed') && (
                    <button
                      onClick={handleRetry}
                      disabled={retrying}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-orange-700"
                    >
                      {retrying ? '재처리 중...' : `실패 재처리 (${selectedBatch.rows.filter((r) => r.applyStatus === 'failed').length}건)`}
                    </button>
                  )}

                  {/* 실패 데이터 다운로드 + 가이드 — WO-O4O-NETURE-IMPORT-FAILED-DOWNLOAD-UX-GUIDE-V1 */}
                  {selectedBatch.rows?.some((r) => r.applyStatus === 'failed') && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <button
                          onClick={handleDownloadFailed}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                        >
                          실패 데이터 다운로드 (CSV) — {selectedBatch.rows.filter((r) => r.applyStatus === 'failed').length}건
                        </button>
                      </div>

                      {/* 다운로드 완료 안내 */}
                      {downloadedCsv && (
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
                          CSV 파일이 다운로드되었습니다. 아래 안내에 따라 수정 후 재업로드하세요.
                        </div>
                      )}

                      {/* 가이드 텍스트 */}
                      <p className="text-sm text-amber-800 mb-2 font-medium">재업로드 안내</p>
                      <p className="text-xs text-amber-700 mb-2">
                        다운로드된 CSV 파일에는 실패한 행의 원본 데이터와 <code className="bg-amber-100 px-1 rounded">apply_error</code> 컬럼이 포함됩니다.
                      </p>
                      <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                        <li>다운로드된 CSV 파일을 엑셀(Excel)이나 Google Sheets에서 엽니다.</li>
                        <li><code className="bg-amber-100 px-1 rounded">row_number</code>와 <code className="bg-amber-100 px-1 rounded">apply_error</code> 컬럼을 참고하여 데이터를 수정합니다.</li>
                        <li>수정 후 <code className="bg-amber-100 px-1 rounded">row_number</code>와 <code className="bg-amber-100 px-1 rounded">apply_error</code> 컬럼을 삭제합니다.</li>
                        <li>XLSX 또는 CSV로 저장한 뒤 위의 &quot;파일 업로드&quot; 영역에서 다시 업로드하세요.</li>
                      </ol>
                    </div>
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
