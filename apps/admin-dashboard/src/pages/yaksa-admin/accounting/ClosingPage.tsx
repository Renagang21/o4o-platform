/**
 * ClosingPage
 *
 * 월 마감 화면
 *
 * === 규칙 ===
 * - 마감 후 지출 수정/삭제 ❌
 * - 재오픈 기능 ❌
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import {
  getCloseStatuses,
  getMonthlySummary,
  closeMonth,
  type MonthlySummary,
} from '@/lib/api/yaksaAccounting';

interface MonthStatus {
  yearMonth: string;
  isClosed: boolean;
  closedAt?: string;
}

export function ClosingPage() {
  const [monthStatuses, setMonthStatuses] = useState<MonthStatus[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const loadStatuses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statuses = await getCloseStatuses(selectedYear);

      // 12개월 모두 표시
      const allMonths: MonthStatus[] = [];
      for (let m = 1; m <= 12; m++) {
        const ym = `${selectedYear}-${String(m).padStart(2, '0')}`;
        const existing = statuses.find((s) => s.yearMonth === ym);
        allMonths.push({
          yearMonth: ym,
          isClosed: existing?.isClosed ?? false,
          closedAt: existing?.closedAt,
        });
      }

      setMonthStatuses(allMonths);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다.');
      console.error('Failed to load close statuses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async (yearMonth: string) => {
    setSelectedMonth(yearMonth);
    setIsLoadingSummary(true);
    try {
      const summary = await getMonthlySummary(yearMonth);
      setSelectedSummary(summary);
    } catch (err) {
      console.error('Failed to load summary:', err);
      setSelectedSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, [selectedYear]);

  const handleCloseMonth = async () => {
    if (!selectedMonth || !selectedSummary) return;

    if (selectedSummary.isClosed) {
      alert('이미 마감된 월입니다.');
      return;
    }

    const confirmMsg = `${selectedMonth} 월을 마감하시겠습니까?\n\n마감 후에는 해당 월의 지출을 수정하거나 삭제할 수 없습니다.\n이 작업은 되돌릴 수 없습니다.`;
    if (!confirm(confirmMsg)) return;

    setIsClosing(true);
    try {
      await closeMonth(selectedMonth);
      await loadStatuses();
      await loadSummary(selectedMonth);
      alert(`${selectedMonth} 월이 마감되었습니다.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '마감 처리 실패';
      alert(message);
    } finally {
      setIsClosing(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const currentYearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

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
            <h1 className="text-2xl font-bold text-gray-900">월 마감</h1>
            <p className="text-gray-500 mt-1">
              월별 지출을 마감하고 수정을 잠급니다.
            </p>
          </div>
          <button
            onClick={loadStatuses}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-700 font-medium">마감 안내</p>
            <p className="text-sm text-yellow-600 mt-1">
              월 마감 후에는 해당 월의 지출을 수정하거나 삭제할 수 없습니다.
              마감은 되돌릴 수 없으니 신중하게 진행해 주세요.
            </p>
          </div>
        </div>
      </div>

      {/* Year Select */}
      <div className="mb-6">
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(Number(e.target.value));
            setSelectedMonth(null);
            setSelectedSummary(null);
          }}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Month List */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedYear}년 마감 현황
          </h2>

          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {monthStatuses.map((status) => {
                const isFuture = status.yearMonth > currentYearMonth;
                const isSelected = selectedMonth === status.yearMonth;

                return (
                  <button
                    key={status.yearMonth}
                    onClick={() => !isFuture && loadSummary(status.yearMonth)}
                    disabled={isFuture}
                    className={`
                      p-3 rounded-lg border-2 text-center transition-all
                      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      ${isFuture ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300 cursor-pointer'}
                    `}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {status.yearMonth.split('-')[1]}월
                    </div>
                    <div className="mt-1">
                      {status.isClosed ? (
                        <Lock className="h-4 w-4 text-gray-400 mx-auto" />
                      ) : isFuture ? (
                        <Calendar className="h-4 w-4 text-gray-300 mx-auto" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-500 mx-auto" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {status.isClosed ? '마감' : isFuture ? '미래' : '미마감'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Month Detail */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            상세 정보
          </h2>

          {!selectedMonth ? (
            <div className="text-center py-8 text-gray-500">
              왼쪽에서 월을 선택해 주세요.
            </div>
          ) : isLoadingSummary ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : selectedSummary ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">상태</span>
                <span className={`
                  inline-flex items-center px-3 py-1 rounded text-sm font-medium
                  ${selectedSummary.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}
                `}>
                  {selectedSummary.isClosed ? (
                    <>
                      <Lock className="h-4 w-4 mr-1" />
                      마감됨
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-1" />
                      미마감
                    </>
                  )}
                </span>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">총 지출</span>
                  <span className="text-xl font-bold text-gray-900">
                    ₩{selectedSummary.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {selectedSummary.totalCount}건
                </div>
              </div>

              {/* Category Breakdown */}
              {selectedSummary.byCategory.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">카테고리별</h3>
                  <div className="space-y-2">
                    {selectedSummary.byCategory.map((cat) => (
                      <div key={cat.category} className="flex justify-between text-sm">
                        <span className="text-gray-600">{cat.categoryLabel}</span>
                        <span className="text-gray-900">
                          ₩{cat.totalAmount.toLocaleString()} ({cat.count}건)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              {!selectedSummary.isClosed && (
                <button
                  onClick={handleCloseMonth}
                  disabled={isClosing}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50"
                >
                  {isClosing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      마감 처리 중...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {selectedMonth} 마감하기
                    </>
                  )}
                </button>
              )}

              {/* Closed Info */}
              {selectedSummary.isClosed && selectedSummary.closedAt && (
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {new Date(selectedSummary.closedAt).toLocaleDateString('ko-KR')}에 마감됨
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              데이터를 불러올 수 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClosingPage;
