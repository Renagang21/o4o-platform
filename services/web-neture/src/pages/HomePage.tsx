/**
 * HomePage - Neture 유통 정보 플랫폼
 *
 * Work Order: WO-NETURE-CORE-V1
 * Phase: P0 Prototype
 *
 * 화면 구조:
 * 1. Hero - 플랫폼 정체성
 * 2. 공급자 미리보기
 * 3. 제휴 요청 미리보기
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Handshake } from 'lucide-react';
import { mockSuppliers, mockPartnershipRequests } from '../data/mockData';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Suppliers Preview */}
      <SuppliersPreviewSection />

      {/* Partnership Requests Preview */}
      <PartnershipRequestsPreviewSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          공급자를 찾고, 제휴를 연결하는 유통 정보 플랫폼
        </h1>
        <p className="text-xl text-primary-100 mb-10">
          주문·결제 없이 조건과 기회를 투명하게 확인하세요
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/suppliers"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 transition-colors"
          >
            공급자 보기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link
            to="/partners/requests"
            className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-white hover:text-primary-600 transition-colors"
          >
            제휴 요청 보기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SuppliersPreviewSection() {
  const featuredSuppliers = mockSuppliers.slice(0, 4);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Building2 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">공급자 둘러보기</h2>
          <p className="text-lg text-gray-600">
            검증된 공급자의 정보를 확인하세요
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredSuppliers.map((supplier) => (
            <Link
              key={supplier.id}
              to={`/suppliers/${supplier.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <img
                  src={supplier.logo}
                  alt={supplier.name}
                  className="w-20 h-20 rounded-full mb-4"
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {supplier.name}
                </h3>
                <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full mb-3">
                  {supplier.category}
                </span>
                <p className="text-sm text-gray-600">
                  {supplier.shortDescription}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/suppliers"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
          >
            공급자 전체 보기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PartnershipRequestsPreviewSection() {
  const featuredRequests = mockPartnershipRequests.filter(req => req.status === 'OPEN').slice(0, 3);

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Handshake className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">제휴 파트너를 찾는 판매자</h2>
          <p className="text-lg text-gray-600">
            진행 중인 제휴 기회를 확인하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredRequests.map((request) => (
            <Link
              key={request.id}
              to={`/partners/requests/${request.id}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-primary-300 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {request.seller.name}
                </h3>
                <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  {request.status}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">서비스:</span> {request.seller.serviceType}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">제품 수:</span> {request.productCount}개
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">기간:</span> {request.period.start} ~ {request.period.end}
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700 font-medium mb-2">수익 구조</p>
                <p className="text-sm text-gray-600">{request.revenueStructure}</p>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium">
                  제휴 조건 보기
                  <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/partners/requests"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
          >
            제휴 요청 전체 보기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
