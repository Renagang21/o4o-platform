import { useParams, Link } from 'react-router-dom';
import { Mail, Phone, Globe, MessageCircle, ArrowLeft } from 'lucide-react';
import { mockSuppliers } from '../../data/mockData';

export default function SupplierDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const supplier = mockSuppliers.find(s => s.slug === slug);

  if (!supplier) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">공급자를 찾을 수 없습니다</h1>
        <Link to="/suppliers" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link to="/suppliers" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        공급자 목록으로
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <div className="flex items-start gap-6">
          <img src={supplier.logo} alt={supplier.name} className="w-32 h-32 rounded-full" />
          <div className="flex-1">
            <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full mb-2">
              {supplier.category}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{supplier.name}</h1>
            <p className="text-lg text-gray-600 mb-6">{supplier.shortDescription}</p>
            
            {/* Contact Buttons */}
            <div className="flex flex-wrap gap-3">
              <a href={`mailto:${supplier.contact.email}`} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                <Mail className="w-4 h-4 mr-2" />
                이메일
              </a>
              <a href={`tel:${supplier.contact.phone}`} className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <Phone className="w-4 h-4 mr-2" />
                전화
              </a>
              <a href={supplier.contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <Globe className="w-4 h-4 mr-2" />
                웹사이트
              </a>
              <a href={supplier.contact.kakao} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <MessageCircle className="w-4 h-4 mr-2" />
                카카오톡
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">소개</h2>
        <p className="text-gray-700 leading-relaxed">{supplier.description}</p>
      </div>

      {/* Products */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">취급 제품</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplier.products.map((product) => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mb-2">
                {product.category}
              </span>
              <p className="text-sm text-gray-600">{product.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Terms */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">유통 조건</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">가격 정책</h3>
            <p className="text-gray-700">{supplier.pricingPolicy}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">최소 주문 수량 (MOQ)</h3>
            <p className="text-gray-700">{supplier.moq}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">배송 정책</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="border border-gray-200 rounded p-3">
                <p className="font-medium text-gray-900 mb-1">일반 지역</p>
                <p className="text-sm text-gray-600">{supplier.shippingPolicy.standard}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="font-medium text-gray-900 mb-1">도서 지역</p>
                <p className="text-sm text-gray-600">{supplier.shippingPolicy.island}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="font-medium text-gray-900 mb-1">산간 지역</p>
                <p className="text-sm text-gray-600">{supplier.shippingPolicy.mountain}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-900 font-medium">
          거래를 원하시면 각 서비스의 판매자 대시보드에서 신청하세요
        </p>
      </div>
    </div>
  );
}
