/**
 * ExportPage
 *
 * 집계 / 내보내기 화면
 *
 * === 목적 ===
 * - 총회 보고
 * - 감사 제출
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  getAnnualSummary,
  getExportData,
  type AnnualSummary,
  type ExportData,
  CATEGORY_LABELS,
} from '@/lib/api/yaksaAccounting';

export function ExportPage() {
  const [summary, setSummary] = useState<AnnualSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAnnualSummary(selectedYear);
      setSummary(data);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다.');
      console.error('Failed to load summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const data = await getExportData(selectedYear);
      downloadAsExcel(data);
    } catch (err) {
      console.error('Export failed:', err);
      alert('내보내기 실패');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const data = await getExportData(selectedYear);
      downloadAsPDF(data);
    } catch (err) {
      console.error('Export failed:', err);
      alert('내보내기 실패');
    } finally {
      setIsExporting(false);
    }
  };

  // 엑셀 다운로드 (CSV 형식)
  const downloadAsExcel = (data: ExportData) => {
    const BOM = '\uFEFF';
    let csv = BOM;

    // 헤더
    csv += `${data.organizationName} ${data.period} 지출 내역\n`;
    csv += `생성일: ${new Date(data.generatedAt).toLocaleDateString('ko-KR')}\n\n`;

    // 요약
    csv += `총 지출,₩${data.summary.totalAmount.toLocaleString()}\n`;
    csv += `총 건수,${data.summary.totalCount}건\n\n`;

    // 카테고리별
    csv += `카테고리,금액,건수\n`;
    data.summary.byCategory.forEach((cat) => {
      csv += `${cat.categoryLabel},₩${cat.totalAmount.toLocaleString()},${cat.count}건\n`;
    });
    csv += '\n';

    // 상세 내역
    csv += `번호,날짜,카테고리,내용,결제방법,금액,관련인\n`;
    data.records.forEach((rec) => {
      csv += `${rec.no},${rec.date},${rec.category},"${rec.description}",${rec.paymentMethod},₩${rec.amount.toLocaleString()},${rec.relatedPerson || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.organizationName}_${data.period}_지출내역.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF 다운로드 (HTML 기반 인쇄)
  const downloadAsPDF = (data: ExportData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해 주세요.');
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.organizationName} ${data.period} 지출 내역</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
    h1 { text-align: center; margin-bottom: 10px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
    .summary { margin-bottom: 30px; padding: 20px; background: #f5f5f5; }
    .summary h2 { margin: 0 0 15px 0; font-size: 16px; }
    .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .category-table { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
    .category-table th, .category-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .category-table th { background: #f0f0f0; }
    .detail-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .detail-table th, .detail-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    .detail-table th { background: #f0f0f0; }
    .text-right { text-align: right; }
    .total { font-weight: bold; font-size: 18px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${data.organizationName}</h1>
  <p class="subtitle">${data.period} 지출 내역서</p>

  <div class="summary">
    <h2>총괄</h2>
    <div class="summary-row">
      <span>총 지출</span>
      <span class="total">₩${data.summary.totalAmount.toLocaleString()}</span>
    </div>
    <div class="summary-row">
      <span>총 건수</span>
      <span>${data.summary.totalCount}건</span>
    </div>
  </div>

  <h2 style="font-size: 14px; margin-bottom: 10px;">카테고리별 집계</h2>
  <table class="category-table">
    <thead>
      <tr>
        <th>카테고리</th>
        <th class="text-right">금액</th>
        <th class="text-right">건수</th>
      </tr>
    </thead>
    <tbody>
      ${data.summary.byCategory.map(cat => `
        <tr>
          <td>${cat.categoryLabel}</td>
          <td class="text-right">₩${cat.totalAmount.toLocaleString()}</td>
          <td class="text-right">${cat.count}건</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2 style="font-size: 14px; margin-bottom: 10px;">상세 내역</h2>
  <table class="detail-table">
    <thead>
      <tr>
        <th>No</th>
        <th>날짜</th>
        <th>카테고리</th>
        <th>내용</th>
        <th>결제</th>
        <th class="text-right">금액</th>
      </tr>
    </thead>
    <tbody>
      ${data.records.map(rec => `
        <tr>
          <td>${rec.no}</td>
          <td>${rec.date}</td>
          <td>${rec.category}</td>
          <td>${rec.description}${rec.relatedPerson ? ` (${rec.relatedPerson})` : ''}</td>
          <td>${rec.paymentMethod}</td>
          <td class="text-right">₩${rec.amount.toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <p style="margin-top: 30px; text-align: center; color: #999; font-size: 11px;">
    생성일: ${new Date(data.generatedAt).toLocaleString('ko-KR')}
  </p>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa/accounting"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          회계 홈으로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">집계 / 내보내기</h1>
            <p className="text-gray-500 mt-1">
              연간 집계를 확인하고 총회 보고용 자료를 출력합니다.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Year Select */}
      <div className="mb-6">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">연간 총괄</h2>
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                ₩{summary.totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                {summary.totalCount}건
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">내보내기</h2>
                <Download className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                  엑셀 다운로드
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  PDF 출력
                </button>
              </div>
            </div>
          </div>

          {/* Category Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">카테고리별 집계</h2>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            {summary.byCategory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {selectedYear}년 지출 데이터가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.byCategory.map((cat) => {
                  const percentage = summary.totalAmount > 0
                    ? (cat.totalAmount / summary.totalAmount * 100)
                    : 0;

                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat.categoryLabel}</span>
                        <span className="text-gray-900 font-medium">
                          ₩{cat.totalAmount.toLocaleString()} ({cat.count}건)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">월별 현황</h2>
            {summary.byMonth.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {selectedYear}년 지출 데이터가 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-sm font-medium text-gray-500">월</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">금액</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">건수</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-500">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byMonth.map((month) => (
                      <tr key={month.yearMonth} className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-900">
                          {month.yearMonth}
                        </td>
                        <td className="py-3 text-sm text-gray-900 text-right">
                          ₩{month.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 text-sm text-gray-500 text-right">
                          {month.count}건
                        </td>
                        <td className="py-3 text-right">
                          <span className={`
                            inline-flex px-2 py-0.5 text-xs font-medium rounded
                            ${month.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}
                          `}>
                            {month.isClosed ? '마감' : '미마감'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default ExportPage;
