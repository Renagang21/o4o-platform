/**
 * EducationOverviewPage
 *
 * Phase 1: 교육 이수 현황 조회 페이지 (READ ONLY)
 *
 * 기능:
 * - 소속 회원 교육 이수 현황 통계 조회
 * - LMS 상세 페이지로 이동 링크
 *
 * 제한:
 * - 교육 등록/수정 ❌
 * - 점수 조정 ❌
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  RefreshCw,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import {
  getEducationStats,
  type EducationStats,
} from '@/lib/api/yaksaAdmin';

export function EducationOverviewPage() {
  const [stats, setStats] = useState<EducationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 임시: 로그인한 관리자의 조직 ID (실제로는 auth context에서 가져와야 함)
  const organizationId = 'org-sample-id';

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getEducationStats(organizationId);
      setStats(response.data);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.');
      console.error('Failed to load education stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          관리자 센터로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">교육 이수 현황</h1>
            <p className="text-gray-500 mt-1">
              소속 회원의 교육 이수 현황을 조회합니다.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
              READ ONLY
            </span>
            <button
              onClick={loadStats}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>조회 전용:</strong> 이 페이지에서는 교육 현황만 확인할 수 있습니다.
          교육 등록이나 점수 조정이 필요하시면 LMS 관리 메뉴를 이용해 주세요.
        </p>
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
      ) : !stats ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">교육 현황 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Members */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">총 프로필</span>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.members.totalProfiles.toLocaleString()}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">이수 완료</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.assignments.completedAssignments.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                이수율 {(stats.assignments.completionRate * 100).toFixed(1)}%
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">수강 중</span>
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.assignments.activeAssignments.toLocaleString()}
              </div>
            </div>

            {/* Overdue */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">기한 초과</span>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats.assignments.overdueAssignments.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Member Credits */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">학점 현황</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">총 취득 학점</span>
                  <span className="font-semibold text-gray-900">
                    {stats.members.totalCreditsEarned.toLocaleString()} 학점
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">회원당 평균 학점</span>
                  <span className="font-semibold text-gray-900">
                    {stats.members.averageCreditsPerMember.toFixed(1)} 학점
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">갱신 필요 회원</span>
                  <span className="font-semibold text-orange-600">
                    {stats.members.profilesRequiringRenewal.toLocaleString()} 명
                  </span>
                </div>
              </div>
            </div>

            {/* Policy Stats */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">정책 현황</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">활성 정책 수</span>
                  <span className="font-semibold text-gray-900">
                    {stats.policies.activeCount} 개
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">전체 과제 수</span>
                  <span className="font-semibold text-gray-900">
                    {stats.assignments.totalAssignments.toLocaleString()} 개
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">수강 대상 회원</span>
                  <span className="font-semibold text-gray-900">
                    {stats.assignments.memberCount.toLocaleString()} 명
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Link to LMS */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">LMS 상세 관리</p>
              <p className="text-sm text-gray-500">교육 과정 및 학점 상세 관리는 LMS에서 진행합니다.</p>
            </div>
            <Link
              to="/admin/lms"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              LMS 관리 바로가기
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default EducationOverviewPage;
