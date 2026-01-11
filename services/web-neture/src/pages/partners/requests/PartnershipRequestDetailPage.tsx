import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MessageCircle, ExternalLink } from 'lucide-react';
import { netureApi, type PartnershipRequestDetail } from '../../../lib/api';

export default function PartnershipRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<PartnershipRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) {
        setError('Request ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await netureApi.getPartnershipRequestById(id);
        setRequest(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading partnership request...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error ? `Error: ${error}` : '제휴 요청을 찾을 수 없습니다'}
        </h1>
        <Link to="/partners/requests" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link to="/partners/requests" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        제휴 요청 목록으로
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{request.seller.name}</h1>
            <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full">
              {request.seller.serviceType}
            </span>
          </div>
          <span className={`px-4 py-2 text-sm font-medium rounded-full ${
            request.status === 'OPEN'
              ? 'bg-green-100 text-green-700'
              : request.status === 'MATCHED'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {request.status === 'OPEN' ? '모집 중' : request.status === 'MATCHED' ? '매칭 완료' : '종료'}
          </span>
        </div>

        {/* Store Link */}
        <a
          href={request.seller.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm"
        >
          판매자 상점 보기
          <ExternalLink className="ml-1 w-4 h-4" />
        </a>
      </div>

      {/* Period */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">제휴 기간</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">시작일</p>
            <p className="text-lg font-semibold text-gray-900">{request.period.start}</p>
          </div>
          <div className="text-gray-400">~</div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">종료일</p>
            <p className="text-lg font-semibold text-gray-900">{request.period.end}</p>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">제휴 대상 제품 ({request.productCount}개)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {request.products.map((product) => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                {product.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Structure */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">제휴 기준 수익 구조</h2>
        <p className="text-lg text-gray-700 mb-6">{request.revenueStructure}</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            본 조건은 참고용이며 실제 정산은 외부 협의로 진행됩니다
          </p>
        </div>
      </div>

      {/* Promotion Scope */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">홍보 범위</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className={`p-4 border rounded-lg text-center ${request.promotionScope.sns ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}>
            <p className="font-medium text-gray-900">SNS</p>
            <p className="text-sm text-gray-600 mt-1">{request.promotionScope.sns ? '포함' : '제외'}</p>
          </div>
          <div className={`p-4 border rounded-lg text-center ${request.promotionScope.content ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}>
            <p className="font-medium text-gray-900">콘텐츠</p>
            <p className="text-sm text-gray-600 mt-1">{request.promotionScope.content ? '포함' : '제외'}</p>
          </div>
          <div className={`p-4 border rounded-lg text-center ${request.promotionScope.banner ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}>
            <p className="font-medium text-gray-900">배너</p>
            <p className="text-sm text-gray-600 mt-1">{request.promotionScope.banner ? '포함' : '제외'}</p>
          </div>
          <div className={`p-4 border rounded-lg text-center ${request.promotionScope.other ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}>
            <p className="font-medium text-gray-900">기타</p>
            <p className="text-sm text-gray-600 mt-1">{request.promotionScope.other || '없음'}</p>
          </div>
        </div>
        {request.promotionScope.other && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{request.promotionScope.other}</p>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">연락처</h2>
        <div className="flex flex-wrap gap-3">
          <a href={`mailto:${request.contact.email}`} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
            <Mail className="w-4 h-4 mr-2" />
            이메일
          </a>
          <a href={`tel:${request.contact.phone}`} className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            <Phone className="w-4 h-4 mr-2" />
            전화
          </a>
          <a href={request.contact.kakao} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            <MessageCircle className="w-4 h-4 mr-2" />
            카카오톡
          </a>
        </div>
      </div>

      {/* Match Status Info */}
      {request.status === 'MATCHED' && request.matchedAt && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">매칭 완료</h3>
          <p className="text-sm text-blue-800">
            매칭 일자: {new Date(request.matchedAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
      )}

      {/* Bottom Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-900 font-medium">
          제휴를 원하시면 위 연락처로 직접 문의하세요
        </p>
      </div>
    </div>
  );
}
