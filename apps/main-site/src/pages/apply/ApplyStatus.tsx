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
 * P0 RBAC: Application Status Page
 * - Shows user's enrollment status for specific role
 * - Displays latest enrollment for the role
 */
const ApplyStatus: FC = () => {
  const { role } = useParams<{ role: RoleName }>();
  const { user, checkAuthStatus } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Refresh user data if approved
  useEffect(() => {
    if (enrollment?.status === 'approved') {
      checkAuthStatus();
    }
  }, [enrollment, checkAuthStatus]);

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
                        {new Date(enrollment.submittedAt).toLocaleDateString('ko-KR')}
                      </dd>
                    </div>

                    {enrollment.reviewedAt && (
                      <div>
                        <dt className="text-sm text-gray-600">검토일</dt>
                        <dd className="text-gray-900 font-medium">
                          {new Date(enrollment.reviewedAt).toLocaleDateString('ko-KR')}
                        </dd>
                      </div>
                    )}

                    {enrollment.reason && (
                      <div>
                        <dt className="text-sm text-gray-600">사유</dt>
                        <dd className="text-gray-900">{enrollment.reason}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="border-t pt-6">
                  {enrollment.status === 'pending' && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800">
                        신청서를 검토 중입니다. 영업일 기준 2-3일 내에 결과를 안내드립니다.
                      </p>
                    </div>
                  )}

                  {enrollment.status === 'on_hold' && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-orange-800 mb-2">
                        추가 정보가 필요합니다. 아래 사유를 확인하시고 다시 신청해주세요.
                      </p>
                      <Link
                        to={`/apply/${role}`}
                        className="inline-block mt-4 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
                      >
                        다시 신청하기
                      </Link>
                    </div>
                  )}

                  {enrollment.status === 'rejected' && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-800">
                        죄송합니다. 현재 승인이 어렵습니다. 자세한 내용은 고객센터로 문의해주세요.
                      </p>
                    </div>
                  )}

                  {enrollment.status === 'approved' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-800 mb-4">
                        축하합니다! {roleLabel} 계정이 승인되었습니다.
                      </p>
                      <Link
                        to={`/dashboard/${role}`}
                        className="inline-block bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700"
                      >
                        대시보드로 이동
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
