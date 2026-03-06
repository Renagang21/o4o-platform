/**
 * FirstmallImportPage — Firstmall Excel Import 3-Step Wizard
 *
 * Upload → Validate → Apply
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { useState, useEffect } from 'react';
import { catalogImportApi, adminSupplierApi, type AdminSupplier } from '../../../lib/api';

interface ImportJob {
  id: string;
  status: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  rejectedRows: number;
  fileName: string | null;
  rows?: ImportRow[];
}

interface ImportRow {
  id: string;
  rowNumber: number;
  parsedBarcode: string | null;
  parsedProductName: string | null;
  parsedPrice: number | null;
  parsedDistributionType: string | null;
  parsedManufacturerName: string | null;
  parsedBrandName: string | null;
  parsedImageUrls: string[] | null;
  validationStatus: string;
  validationError: string | null;
  actionType: string | null;
  masterId: string | null;
}

type Step = 'upload' | 'validate' | 'apply' | 'done';

export default function FirstmallImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ appliedOffers: number; createdMasters: number } | null>(null);

  useEffect(() => {
    adminSupplierApi.getSuppliers('ACTIVE').then(setSuppliers);
  }, []);

  const handleUpload = async () => {
    if (!file || !selectedSupplier) return;
    setLoading(true);
    setError(null);
    try {
      const result = await catalogImportApi.uploadFile(file, 'firstmall', selectedSupplier);
      if (!result.success) {
        setError(result.error || 'Upload failed');
        return;
      }
      setJob(result.data);
      setStep('validate');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!job) return;
    setLoading(true);
    setError(null);
    try {
      const result = await catalogImportApi.validateJob(job.id);
      if (!result.success) {
        setError(result.error || 'Validation failed');
        return;
      }
      const jobDetail = await catalogImportApi.getJob(job.id);
      if (jobDetail.success) {
        setJob(jobDetail.data);
      }
      setStep('apply');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!job || !selectedSupplier) return;
    setLoading(true);
    setError(null);
    try {
      const result = await catalogImportApi.applyJob(job.id, selectedSupplier);
      if (!result.success) {
        setError(result.error || 'Apply failed');
        return;
      }
      setApplyResult(result.data);
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      VALID: 'bg-green-100 text-green-800',
      WARNING: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Firstmall Import</h1>
      <p className="text-sm text-gray-500 mb-6">
        Firstmall 관리자 페이지에서 Export한 Excel 파일을 Import합니다.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'validate', 'apply', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? 'bg-blue-600 text-white' :
              (['upload', 'validate', 'apply', 'done'].indexOf(step) > i) ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm ${step === s ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
              {s === 'upload' ? 'Upload' : s === 'validate' ? 'Validate' : s === 'apply' ? 'Apply' : 'Complete'}
            </span>
            {i < 3 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">1. Firstmall Excel 업로드</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공급자 선택</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- 공급자 선택 --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Excel 파일 (.xlsx, .xls)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                Firstmall 관리자 &gt; 상품관리 &gt; 상품목록 &gt; Excel 다운로드
              </p>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || !selectedSupplier || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              {loading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Validate */}
      {step === 'validate' && job && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">2. 검증</h2>
          <p className="text-sm text-gray-500 mb-4">
            파일: {job.fileName} | 총 {job.totalRows}행
          </p>
          <button
            onClick={handleValidate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {loading ? '검증 중...' : '검증 실행'}
          </button>
        </div>
      )}

      {/* Step: Apply */}
      {step === 'apply' && job && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">3. 적용</h2>
          <div className="flex gap-4 mb-4 text-sm">
            <span className="text-green-600">Valid: {job.validRows}</span>
            <span className="text-yellow-600">Warning: {job.warningRows}</span>
            <span className="text-red-600">Rejected: {job.rejectedRows}</span>
          </div>

          {job.rows && job.rows.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-3">#</th>
                    <th className="pb-2 pr-3">Barcode</th>
                    <th className="pb-2 pr-3">상품명</th>
                    <th className="pb-2 pr-3">제조사</th>
                    <th className="pb-2 pr-3">가격</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2 pr-3">Action</th>
                    <th className="pb-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {job.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-gray-400">{row.rowNumber}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.parsedBarcode || '-'}</td>
                      <td className="py-2 pr-3 max-w-[200px] truncate">{row.parsedProductName || '-'}</td>
                      <td className="py-2 pr-3 text-xs">{row.parsedManufacturerName || '-'}</td>
                      <td className="py-2 pr-3">{row.parsedPrice != null ? row.parsedPrice.toLocaleString() : '-'}</td>
                      <td className="py-2 pr-3">{statusBadge(row.validationStatus)}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{row.actionType || '-'}</td>
                      <td className="py-2 text-xs text-red-500">{row.validationError || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={loading || (job.validRows + job.warningRows) === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700"
          >
            {loading ? '적용 중...' : `카탈로그에 적용 (${job.validRows + job.warningRows}건)`}
          </button>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && applyResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-semibold mb-2">Firstmall Import 완료</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>생성된 Offer: {applyResult.appliedOffers}건</p>
            <p>생성된 Master: {applyResult.createdMasters}건</p>
          </div>
          <button
            onClick={() => { setStep('upload'); setJob(null); setFile(null); setApplyResult(null); setError(null); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            새 Import 시작
          </button>
        </div>
      )}
    </div>
  );
}
