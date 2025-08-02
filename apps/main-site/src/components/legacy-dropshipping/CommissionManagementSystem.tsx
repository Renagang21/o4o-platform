import { useState, useEffect, FC } from 'react';

interface CommissionRequest {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerType: 'bronze' | 'silver' | 'gold' | 'platinum';
  productCategory: string;
  requestedRate: number;
  currentRate: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'review_required';
  submittedDate: string;
  reviewedDate?: string;
  reviewerComment?: string;
  legalCompliance: {
    withinLimit: boolean;
    singleTier: boolean;
    transparent: boolean;
    documented: boolean;
  };
}

interface MarketAnalysis {
  categoryAverage: number;
  competitorRates: number[];
  recommendedRate: number;
  marketPosition: 'below' | 'average' | 'above';
}

interface CommissionManagementSystemProps {
  userRole: 'supplier' | 'admin';
  onApprove?: (requestId: string, rate: number, conditions?: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

const CommissionManagementSystem: FC<CommissionManagementSystemProps> = ({
  userRole,
  onApprove,
  onReject
}) => {
  const [requests, setRequests] = useState<CommissionRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CommissionRequest | null>(null);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [adjustedRate, setAdjustedRate] = useState<number>(0);

  // 샘플 데이터 (실제로는 API에서 가져올 것)
  useEffect(() => {
    const sampleRequests: CommissionRequest[] = [
      {
        id: '1',
        partnerId: 'partner_001',
        partnerName: '이크라우드',
        partnerType: 'gold',
        productCategory: '건강기능식품',
        requestedRate: 25,
        currentRate: 18,
        reason: '독점 마케팅 콘텐츠 제작 및 전문가 네트워크 활용',
        status: 'pending',
        submittedDate: '2024-06-10',
        legalCompliance: {
          withinLimit: true,
          singleTier: true,
          transparent: true,
          documented: true
        }
      },
      {
        id: '2',
        partnerId: 'partner_002',
        partnerName: '박인플루',
        partnerType: 'silver',
        productCategory: '화장품',
        requestedRate: 30,
        currentRate: 15,
        reason: '인스타그램 팔로워 15만명, 뷰티 전문 인플루언서',
        status: 'review_required',
        submittedDate: '2024-06-08',
        legalCompliance: {
          withinLimit: true,
          singleTier: true,
          transparent: true,
          documented: false
        }
      },
      {
        id: '3',
        partnerId: 'partner_003',
        partnerName: '김마케팅',
        partnerType: 'platinum',
        productCategory: '의료기기',
        requestedRate: 35,
        currentRate: 25,
        reason: '의료진 네트워크 보유, B2B 전문 마케팅',
        status: 'pending',
        submittedDate: '2024-06-12',
        legalCompliance: {
          withinLimit: false, // 35%는 한계점
          singleTier: true,
          transparent: true,
          documented: true
        }
      }
    ];
    setRequests(sampleRequests);

    // 시장 분석 샘플 데이터
    setMarketAnalysis({
      categoryAverage: 22,
      competitorRates: [18, 20, 25, 28, 32],
      recommendedRate: 24,
      marketPosition: 'average'
    });
  }, []);

  const filteredRequests = requests.filter(request => {
    if (activeFilter === 'all') return true;
    return request.status === activeFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-trust-pending bg-opacity-10 text-trust-pending';
      case 'approved':
        return 'bg-trust-verified bg-opacity-10 text-trust-verified';
      case 'rejected':
        return 'bg-trust-warning bg-opacity-10 text-trust-warning';
      case 'review_required':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '검토 중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거절됨';
      case 'review_required':
        return '법적 검토 필요';
      default:
        return status;
    }
  };

  const getPartnerTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'text-orange-600 bg-orange-100';
      case 'silver':
        return 'text-gray-600 bg-gray-100';
      case 'gold':
        return 'text-yellow-600 bg-yellow-100';
      case 'platinum':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleRequestReview = (request: CommissionRequest) => {
    setSelectedRequest(request);
    setAdjustedRate(request.requestedRate);
    setReviewModal(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedRequest || !reviewDecision) return;

    if (reviewDecision === 'approve') {
      onApprove?.(selectedRequest.id, adjustedRate, reviewComment);
    } else {
      onReject?.(selectedRequest.id, reviewComment);
    }

    // 요청 목록 업데이트
    setRequests(prev => prev.map(req => 
      req.id === selectedRequest.id 
        ? { 
            ...req, 
            status: reviewDecision === 'approve' ? 'approved' : 'rejected',
            reviewedDate: new Date().toISOString().split('T')[0],
            reviewerComment: reviewComment,
            currentRate: reviewDecision === 'approve' ? adjustedRate : req.currentRate
          }
        : req
    ));

    // 모달 닫기
    setReviewModal(false);
    setSelectedRequest(null);
    setReviewDecision(null);
    setReviewComment('');
  };

  const renderLegalComplianceCheck = (compliance: CommissionRequest['legalCompliance']) => (
    <div className="space-y-2">
      <h5 className="font-medium text-gray-900">⚖️ 법적 준수 체크</h5>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span>최대 한도 (35% 미만):</span>
          <span className={compliance.withinLimit ? 'text-trust-verified' : 'text-trust-warning'}>
            {compliance.withinLimit ? '✅' : '❌'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>단일 계층:</span>
          <span className={compliance.singleTier ? 'text-trust-verified' : 'text-trust-warning'}>
            {compliance.singleTier ? '✅' : '❌'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>투명성:</span>
          <span className={compliance.transparent ? 'text-trust-verified' : 'text-trust-warning'}>
            {compliance.transparent ? '✅' : '❌'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>문서화:</span>
          <span className={compliance.documented ? 'text-trust-verified' : 'text-trust-warning'}>
            {compliance.documented ? '✅' : '❌'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderMarketAnalysis = () => {
    if (!marketAnalysis) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 시장 분석 및 권장 수수료</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-600">카테고리 평균</h4>
            <p className="text-2xl font-bold text-gray-900">{marketAnalysis.categoryAverage}%</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-600">권장 수수료</h4>
            <p className="text-2xl font-bold text-blue-900">{marketAnalysis.recommendedRate}%</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-600">시장 포지션</h4>
            <p className="text-lg font-bold text-green-900">
              {marketAnalysis.marketPosition === 'above' ? '상위' : 
               marketAnalysis.marketPosition === 'average' ? '평균' : '하위'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">경쟁사 수수료율 분포</h5>
          <div className="flex items-end space-x-2">
            {marketAnalysis.competitorRates.map((rate, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="w-8 bg-blue-200 rounded-t"
                  style={{ height: `${(rate / 40) * 100}px` }}
                />
                <span className="text-xs text-gray-600 mt-1">{rate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">수수료율 관리 시스템</h2>
        <p className="text-gray-600 mt-1">파트너 수수료 요청을 검토하고 승인/거절을 관리합니다</p>
      </div>

      {/* 시장 분석 */}
      {renderMarketAnalysis()}

      {/* 필터 및 상태 현황 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">📋 요청 현황</h3>
          <div className="flex items-center space-x-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-o4o-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? '전체' : 
                 filter === 'pending' ? '대기 중' :
                 filter === 'approved' ? '승인됨' : '거절됨'}
                <span className="ml-1 text-xs">
                  ({requests.filter(r => filter === 'all' || r.status === filter).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 요청 목록 */}
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{request.partnerName}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPartnerTierColor(request.partnerType)}`}>
                      {request.partnerType.toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div>
                      <span className="text-sm text-gray-600">카테고리:</span>
                      <p className="font-medium">{request.productCategory}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">현재 수수료:</span>
                      <p className="font-medium">{request.currentRate}%</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">요청 수수료:</span>
                      <p className={`font-medium ${request.requestedRate > 35 ? 'text-trust-warning' : 'text-trust-verified'}`}>
                        {request.requestedRate}%
                        {request.requestedRate > 35 && <span className="text-xs ml-1">(한도 초과)</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">신청일:</span>
                      <p className="font-medium">{request.submittedDate}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-sm text-gray-600">요청 사유:</span>
                    <p className="text-sm text-gray-800 mt-1">{request.reason}</p>
                  </div>

                  {/* 법적 준수 체크 */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    {renderLegalComplianceCheck(request.legalCompliance)}
                  </div>
                </div>

                {/* 액션 버튼 */}
                {request.status === 'pending' && userRole === 'supplier' && (
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleRequestReview(request)}
                      className="px-4 py-2 bg-o4o-primary-500 text-white text-sm rounded-md hover:bg-o4o-primary-600"
                    >
                      검토하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 검토 모달 */}
      {reviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              수수료 요청 검토: {selectedRequest.partnerName}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">현재 수수료</label>
                  <p className="text-lg font-bold text-gray-900">{selectedRequest.currentRate}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">요청 수수료</label>
                  <p className="text-lg font-bold text-o4o-primary-600">{selectedRequest.requestedRate}%</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">조정된 수수료율</label>
                <input
                  type="number"
                  min="0"
                  max="35"
                  value={adjustedRate}
                  onChange={(e) => setAdjustedRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
                />
                {adjustedRate > 35 && (
                  <p className="text-sm text-trust-warning mt-1">⚠️ 법적 한도(35%)를 초과했습니다</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">검토 의견</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
                  placeholder="승인/거절 사유를 입력하세요"
                />
              </div>

              {/* 법적 준수 확인 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                {renderLegalComplianceCheck(selectedRequest.legalCompliance)}
                {!selectedRequest.legalCompliance.withinLimit && (
                  <p className="text-sm text-yellow-800 mt-2">
                    ⚠️ 법적 한도를 초과하는 요청입니다. 조정이 필요합니다.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="decision"
                    value="approve"
                    checked={reviewDecision === 'approve'}
                    onChange={(e) => setReviewDecision(e.target.value as 'approve')}
                    className="text-trust-verified"
                  />
                  <span className="ml-2 text-sm text-trust-verified">승인</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="decision"
                    value="reject"
                    checked={reviewDecision === 'reject'}
                    onChange={(e) => setReviewDecision(e.target.value as 'reject')}
                    className="text-trust-warning"
                  />
                  <span className="ml-2 text-sm text-trust-warning">거절</span>
                </label>
              </div>

              <div className="space-x-3">
                <button
                  onClick={() => setReviewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={!reviewDecision || !reviewComment || (adjustedRate > 35)}
                  className="px-4 py-2 text-sm font-medium text-white bg-o4o-primary-500 rounded-md hover:bg-o4o-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  검토 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionManagementSystem;