import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cookieAuthClient, Enrollment } from '@o4o/auth-client';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';

type RoleName = 'supplier' | 'seller' | 'partner';

const roleLabels: Record<RoleName, string> = {
  supplier: '공급자',
  seller: '판매자',
  partner: '파트너',
};

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '심사 중', color: 'bg-yellow-100 text-yellow-800' },
  approved: { text: '승인 완료', color: 'bg-green-100 text-green-800' },
  rejected: { text: '승인 거부', color: 'bg-red-100 text-red-800' },
  on_hold: { text: '보완 요청', color: 'bg-orange-100 text-orange-800' },
};

/**
 * P0 RBAC + P1 Phase B-4: Application Status Page
 * - Shows user's enrollment status for specific role
 * - Displays latest enrollment for the role
 * - P1 B-4: Cooldown countdown, detailed reasons, CTA buttons
 */
const ApplyStatus: FC = () => {
  const { role } = useParams<{ role: RoleName }>();
  const { user, checkAuthStatus } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const enrollments = await cookieAuthClient.getMyEnrollments();

        // Find latest enrollment for this role
        const roleEnrollments = enrollments.filter((e: Enrollment) => e.role === role);
        if (roleEnrollments.length > 0) {
          // Sort by submittedAt descending
          roleEnrollments.sort((a: Enrollment, b: Enrollment) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          setEnrollment(roleEnrollments[0]);
        }
      } catch (error) {
        toast.error('신청 내역을 가져올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchEnrollments();
    }
  }, [user, role]);

  // P1 B-4: Countdown timer for rejected enrollments
  useEffect(() => {
    if (enrollment?.status === 'rejected' && enrollment.reapplyAfterAt) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const reapplyTime = new Date(enrollment.reapplyAfterAt!).getTime();
        const diff = reapplyTime - now;

        if (diff <= 0) {
          setTimeLeft(null);
        } else {
          setTimeLeft(diff);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [enrollment]);

  // Refresh user data if approved
  useEffect(() => {
    if (enrollment?.status === 'approved') {
      checkAuthStatus();
    }
  }, [enrollment, checkAuthStatus]);

  // Format countdown time
  const formatTimeLeft = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    } else {
      return `${seconds}초`;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const roleLabel = role ? roleLabels[role] || role : '알 수 없음';
  const canReapply = enrollment?.canReapply !== false && timeLeft === null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {roleLabel} 신청 현황
            </h1>

            {!enrollment ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-6">
                  아직 {roleLabel} 신청을 하지 않으셨습니다.
                </p>
                <Link
                  to={`/apply/${role}`}
                  className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {roleLabel} 신청하기
                </Link>
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">신청 상태</span>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusLabels[enrollment.status].color}`}>
                    {statusLabels[enrollment.status].text}
                  </span>
                </div>

                <div className="border-t pt-6">
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-gray-600">신청일</dt>
                      <dd className="text-gray-900 font-medium">
                        {new Date(enrollment.submittedAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </dd>
                    </div>

                    {enrollment.reviewedAt && (
                      <div>
                        <dt className="text-sm text-gray-600">검토일</dt>
                        <dd className="text-gray-900 font-medium">
                          {new Date(enrollment.reviewedAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="border-t pt-6">
                  {enrollment.status === 'pending' && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-blue-800">
                            신청서를 검토 중입니다. 영업일 기준 2-3일 내에 결과를 안내드립니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* P1 B-4: Enhanced ON_HOLD with reason */}
                  {enrollment.status === 'on_hold' && (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-yellow-800">추가 정보가 필요합니다</h3>
                            {enrollment.reason && (
                              <div className="mt-2 text-sm text-yellow-700">
                                <p className="font-medium">보류 사유:</p>
                                <p className="mt-1 whitespace-pre-wrap">{enrollment.reason}</p>
                              </div>
                            )}
                            <p className="mt-2 text-sm text-yellow-700">
                              아래 버튼을 클릭하여 추가 정보를 제공해주세요.
                            </p>
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/apply/${role}`}
                        className="inline-block bg-yellow-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                      >
                        추가 정보 제공하기
                      </Link>
                    </div>
                  )}

                  {/* P1 B-4: Enhanced REJECTED with cooldown timer */}
                  {enrollment.status === 'rejected' && (
                    <div className="space-y-4">
                      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-red-800">신청이 거부되었습니다</h3>
                            {enrollment.reason && (
                              <div className="mt-2 text-sm text-red-700">
                                <p className="font-medium">거부 사유:</p>
                                <p className="mt-1 whitespace-pre-wrap">{enrollment.reason}</p>
                              </div>
                            )}
                            {enrollment.reapplyAfterAt && timeLeft !== null && (
                              <div className="mt-3 p-3 bg-red-100 rounded">
                                <p className="text-sm font-medium text-red-800">
                                  ⏰ 재신청 가능 시각
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                  {new Date(enrollment.reapplyAfterAt).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <p className="text-lg font-bold text-red-900 mt-2">
                                  남은 시간: {formatTimeLeft(timeLeft)}
                                </p>
                              </div>
                            )}
                            {!enrollment.reapplyAfterAt || timeLeft === null ? (
                              <p className="mt-2 text-sm text-red-700">
                                자세한 내용은 고객센터로 문의해주세요.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Reapply button with cooldown logic */}
                      <div>
                        <Link
                          to={canReapply ? `/apply/${role}` : '#'}
                          className={`inline-block py-2 px-6 rounded-lg font-medium transition-colors ${
                            canReapply
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          onClick={(e) => {
                            if (!canReapply) {
                              e.preventDefault();
                              toast.error('아직 재신청 가능 시간이 되지 않았습니다.');
                            }
                          }}
                        >
                          {canReapply ? '다시 신청하기' : '재신청 대기 중'}
                        </Link>
                        {!canReapply && timeLeft !== null && (
                          <p className="mt-2 text-sm text-gray-600">
                            {formatTimeLeft(timeLeft)} 후 재신청할 수 있습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* P1 B-4: Enhanced APPROVED with dashboard CTA */}
                  {enrollment.status === 'approved' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-green-800">
                              축하합니다! 🎉
                            </h3>
                            <p className="mt-2 text-sm text-green-700">
                              {roleLabel} 계정이 승인되었습니다. 이제 모든 기능을 사용하실 수 있습니다.
                            </p>
                            {enrollment.reason && (
                              <div className="mt-2 text-sm text-green-700">
                                <p className="font-medium">관리자 메시지:</p>
                                <p className="mt-1 italic">{enrollment.reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/dashboard/${role}`}
                        className="inline-block bg-green-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md"
                      >
                        대시보드로 이동 →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ApplyStatus;
