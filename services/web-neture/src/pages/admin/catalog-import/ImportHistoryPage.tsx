/**
 * ImportHistoryPage — Import 작업 이력 조회
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { catalogImportApi } from '../../../lib/api';

interface ImportJob {
  id: string;
  supplierId: string;
  fileName: string | null;
  extensionKey: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  rejectedRows: number;
  status: string;
  createdAt: string;
  validatedAt: string | null;
  appliedAt: string | null;
  rows?: ImportRow[];
}

interface ImportRow {
  id: string;
  rowNumber: number;
  parsedBarcode: string | null;
  parsedProductName: string | null;
  validationStatus: string;
  validationError: string | null;
  actionType: string | null;
}

export default function ImportHistoryPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [expandedJobData, setExpandedJobData] = useState<ImportJob | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await catalogImportApi.listJobs();
      setJobs(result.success ? result.data || [] : []);
    } catch {
      setJobs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleExpand = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      setExpandedJobData(null);
      return;
    }
    setExpandedJob(jobId);
    const result = await catalogImportApi.getJob(jobId);
    if (result.success) {
      setExpandedJobData(result.data);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      UPLOADED: 'bg-gray-100 text-gray-600',
      VALIDATING: 'bg-blue-100 text-blue-700',
      VALIDATED: 'bg-blue-100 text-blue-800',
      APPLYING: 'bg-yellow-100 text-yellow-700',
      APPLIED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Import History</h1>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import History</h1>
        <button
          onClick={loadJobs}
          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
        >
          새로고침
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Import 이력이 없습니다.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Extension</th>
                <th className="px-4 py-3">Rows</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <>
                  <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{job.fileName || '-'}</div>
                      <div className="text-xs text-gray-400 font-mono">{job.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        {job.extensionKey}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900">{job.totalRows}</span>
                      {job.status !== 'UPLOADED' && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({job.validRows}V / {job.warningRows}W / {job.rejectedRows}R)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(job.status)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleExpand(job.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {expandedJob === job.id ? '접기' : '상세'}
                      </button>
                    </td>
                  </tr>
                  {expandedJob === job.id && expandedJobData?.rows && (
                    <tr key={`${job.id}-detail`}>
                      <td colSpan={6} className="px-4 py-3 bg-gray-50">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="pb-1 pr-3">#</th>
                                <th className="pb-1 pr-3">Barcode</th>
                                <th className="pb-1 pr-3">Product</th>
                                <th className="pb-1 pr-3">Status</th>
                                <th className="pb-1 pr-3">Action</th>
                                <th className="pb-1">Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedJobData.rows.map((row) => (
                                <tr key={row.id} className="border-b border-gray-100">
                                  <td className="py-1 pr-3 text-gray-400">{row.rowNumber}</td>
                                  <td className="py-1 pr-3 font-mono">{row.parsedBarcode || '-'}</td>
                                  <td className="py-1 pr-3">{row.parsedProductName || '-'}</td>
                                  <td className="py-1 pr-3">{statusBadge(row.validationStatus)}</td>
                                  <td className="py-1 pr-3 text-gray-500">{row.actionType || '-'}</td>
                                  <td className="py-1 text-red-500">{row.validationError || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
