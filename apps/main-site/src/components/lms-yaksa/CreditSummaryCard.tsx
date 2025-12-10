/**
 * CreditSummaryCard Component
 *
 * Displays credit summary with year-by-year breakdown
 */

import type { CreditSummary } from '@/lib/api/lmsYaksaMember';

interface CreditSummaryCardProps {
  summary: CreditSummary;
  showChart?: boolean;
  className?: string;
}

export function CreditSummaryCard({
  summary,
  showChart = false,
  className = '',
}: CreditSummaryCardProps) {
  const currentYear = new Date().getFullYear();
  const years = Object.keys(summary.byYear)
    .map(Number)
    .sort((a, b) => b - a);

  // Find max credit for chart scaling
  const maxCredit = Math.max(...Object.values(summary.byYear), 1);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">평점 현황</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 mb-1">총 누적</p>
          <p className="text-xl font-bold text-green-700">{summary.totalCredits.toFixed(1)}</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">당해년도</p>
          <p className="text-xl font-bold text-blue-700">
            {summary.currentYearCredits.toFixed(1)}
          </p>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-600 mb-1">검증 대기</p>
          <p className="text-xl font-bold text-yellow-700">
            {summary.unverifiedCredits.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Year by Year Chart */}
      {showChart && years.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">연도별 평점</h4>
          <div className="space-y-2">
            {years.slice(0, 5).map((year) => {
              const credit = summary.byYear[year] || 0;
              const percentage = (credit / maxCredit) * 100;

              return (
                <div key={year} className="flex items-center gap-3">
                  <span
                    className={`text-sm w-12 ${
                      year === currentYear ? 'font-medium text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {year}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        year === currentYear ? 'bg-blue-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {credit.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Credit by Type */}
      {Object.keys(summary.byType).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">유형별 평점</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.byType).map(([type, amount]) => (
              <span
                key={type}
                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded"
              >
                {getCreditTypeLabel(type)}: {amount.toFixed(1)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get Korean labels for credit types
function getCreditTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    course_completion: '강좌 이수',
    attendance: '출석',
    external: '외부 교육',
    manual_adjustment: '수동 조정',
  };
  return labels[type] || type;
}

export default CreditSummaryCard;
