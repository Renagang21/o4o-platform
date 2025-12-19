/**
 * EducationSummarySection
 *
 * Phase 3: [3] 교육(LMS) 필수 현황
 *
 * 표시:
 * - 필수 교육 수
 * - 이수 완료 수
 * - 미이수/과락 경고
 *
 * 이동:
 * - 클릭 시 LMS 페이지
 */

import { Link } from 'react-router-dom';
import { GraduationCap, AlertTriangle, AlertCircle, ChevronRight, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@o4o/ui';
import type { EducationSummary } from '@/lib/api/member';

interface EducationSummarySectionProps {
  data: EducationSummary | null;
  isLoading?: boolean;
}

export function EducationSummarySection({ data, isLoading }: EducationSummarySectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            필수 교육
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error/disabled state
  if (data === null) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-400">
            <GraduationCap className="h-5 w-5" />
            필수 교육
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            교육 정보를 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = data.requiredCourseCount > 0
    ? Math.round((data.completedCourseCount / data.requiredCourseCount) * 100)
    : 100;

  // Normal state
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          필수 교육
        </CardTitle>
        <Link to="/lms">
          <Button variant="ghost" size="sm" className="text-xs">
            전체보기 <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Overdue Warning */}
        {data.hasOverdue && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg mb-4">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">
              미이수 교육 {data.overdueCount}개 (기한 초과)
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">이수 현황</span>
            <span className="font-medium">
              {data.completedCourseCount} / {data.requiredCourseCount}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                completionRate === 100 ? 'bg-green-500' : 'bg-purple-500'
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">완료 {data.completedCourseCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-600">진행 중 {data.inProgressCourseCount}</span>
            </div>
          </div>

          {/* Credits */}
          <div className="pt-3 border-t mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">올해 취득 학점</span>
              <span className="font-medium text-purple-600">
                {data.currentYearCredits}점
              </span>
            </div>
            {data.remainingCredits > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                추가 {data.remainingCredits}점 필요
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
