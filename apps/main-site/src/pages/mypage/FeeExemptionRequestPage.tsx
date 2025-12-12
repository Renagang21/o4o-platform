import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface ExemptionRequest {
  id: string;
  year: number;
  category: string;
  exemptionType: string;
  exemptionRate?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

/**
 * FeeExemptionRequestPage
 *
 * 회비 감면 신청 페이지
 */
export default function FeeExemptionRequestPage() {
  const [requests, setRequests] = useState<ExemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    category: '',
    reason: '',
    attachments: [] as File[],
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/api/annualfee/members/me/exemption-requests');
      if (response.data?.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.reason) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authClient.api.post('/api/annualfee/exemptions/request', {
        year: formData.year,
        category: formData.category,
        reason: formData.reason,
      });

      if (response.data?.success) {
        alert('감면 신청이 접수되었습니다.');
        setShowForm(false);
        setFormData({
          year: new Date().getFullYear(),
          category: '',
          reason: '',
          attachments: [],
        });
        loadRequests();
      }
    } catch (error) {
      console.error('Failed to submit:', error);
      alert('감면 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      senior: '경로 우대 (만 70세 이상)',
      honorary: '명예회원',
      inactive: '휴직 (육아휴직, 질병 등)',
      hardship: '경제적 어려움',
      new_member: '신규 가입 (입회 1년 미만)',
      official: '임원 감면',
      other: '기타',
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: '심사중',
      approved: '승인',
      rejected: '거부',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">회비 감면 신청</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            감면 신청하기
          </button>
        )}
      </div>

      {/* 신청 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">감면 신청서 작성</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  적용 연도 *
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                >
                  {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  감면 사유 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">선택해주세요</option>
                  <option value="senior">경로 우대 (만 70세 이상)</option>
                  <option value="honorary">명예회원</option>
                  <option value="inactive">휴직 (육아휴직, 질병 등)</option>
                  <option value="hardship">경제적 어려움</option>
                  <option value="new_member">신규 가입 (입회 1년 미만)</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상세 사유 *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  placeholder="감면 신청 사유를 상세히 기재해주세요"
                  required
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">안내사항</h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>감면 신청은 소속 지부/분회의 심사 후 승인됩니다.</li>
                  <li>경로 우대는 생년월일 기준 만 70세 이상인 경우 자동 적용됩니다.</li>
                  <li>휴직 감면은 관련 증빙서류 제출이 필요할 수 있습니다.</li>
                  <li>심사 결과는 등록된 연락처로 안내드립니다.</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border rounded py-2 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white rounded py-2 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '신청 중...' : '신청하기'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 신청 내역 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">신청 내역</h2>

        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-medium">{request.year}년 회비 감면</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {getCategoryLabel(request.category)}
                    </span>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  <p className="mb-1">
                    <span className="font-medium">신청일:</span> {formatDate(request.requestedAt)}
                  </p>
                  <p>
                    <span className="font-medium">사유:</span> {request.reason}
                  </p>
                </div>

                {request.status === 'approved' && (
                  <div className="mt-3 p-3 bg-green-50 rounded text-sm text-green-800">
                    <p className="font-medium">승인됨</p>
                    <p>
                      감면율:{' '}
                      {request.exemptionType === 'full'
                        ? '전액 면제'
                        : `${request.exemptionRate}% 감면`}
                    </p>
                  </div>
                )}

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-800">
                    <p className="font-medium">거부 사유</p>
                    <p>{request.rejectionReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">감면 신청 내역이 없습니다.</div>
        )}
      </div>

      {/* 감면 기준 안내 */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">감면 기준 안내</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-medium text-gray-700">감면 유형</th>
              <th className="py-2 text-left font-medium text-gray-700">대상</th>
              <th className="py-2 text-right font-medium text-gray-700">감면율</th>
            </tr>
          </thead>
          <tbody className="text-gray-600">
            <tr className="border-b">
              <td className="py-2">경로 우대</td>
              <td className="py-2">만 70세 이상</td>
              <td className="py-2 text-right">전액 면제</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">명예회원</td>
              <td className="py-2">명예회원 자격 보유자</td>
              <td className="py-2 text-right">전액 면제</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">휴직</td>
              <td className="py-2">육아휴직, 질병 등</td>
              <td className="py-2 text-right">50% 감면</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">신규 가입</td>
              <td className="py-2">입회 1년 미만</td>
              <td className="py-2 text-right">50% 감면</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">경제적 어려움</td>
              <td className="py-2">심사 후 결정</td>
              <td className="py-2 text-right">심사 후 결정</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 text-xs text-gray-500">
          * 감면 기준은 연도별 정책에 따라 변경될 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export { FeeExemptionRequestPage };
