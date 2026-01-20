/**
 * HomePage - Neture 유통 정보 서비스
 *
 * Work Order: WO-NETURE-CORE-P1
 * Phase: P1 (Real API Integration)
 * WO-NETURE-HOME-HERO-AND-NAV-O4O-ALIGNMENT-V1: Hero 문안 정합성 조정
 *
 * 화면 구조:
 * 1. Hero - o4o 플랫폼 기반 서비스 정체성
 * 2. 공급자 미리보기 (Real API)
 * 3. 제휴 요청 미리보기 (Real API)
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Handshake, FlaskConical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { netureApi, type Supplier, type PartnershipRequest } from '../lib/api';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Suppliers Preview */}
      <SuppliersPreviewSection />

      {/* Partnership Requests Preview */}
      <PartnershipRequestsPreviewSection />

      {/* Test Center Link Banner (WO-TEST-CENTER-SEPARATION-V1) */}
      <TestCenterBanner />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* WO-GLOBAL-ALPHA-STATUS-HERO-V080: 운영형 알파 상태 표시 */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-primary-100 mb-4">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          <span>운영형 알파 · v0.8.0</span>
        </div>
        {/* WO-NETURE-HOME-HERO-AND-NAV-O4O-ALIGNMENT-V1: o4o ↔ Neture 관계 명확화 */}
        <p className="text-primary-200 text-sm mb-4">
          o4o 플랫폼 기반 서비스
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          유통 정보 서비스, Neture
        </h1>
        <p className="text-xl text-primary-100 mb-6">
          공급자를 찾고, 제휴를 연결합니다.
          <br />
          주문·결제 없이 조건과 기회를 투명하게 확인하세요.
        </p>
        {/* WO-GLOBAL-ALPHA-STATUS-HERO-V080: 알파 단계 안내 문구 */}
        <p className="text-sm text-primary-200/70 mb-8">
          현재 파트너 기반 운영 검증 단계입니다
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/suppliers"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-slate-500 bg-white hover:bg-primary-50 transition-colors"
          >
            공급자 보기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link
            to="/partners/requests"
            className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-white hover:text-slate-500 transition-colors"
          >
            제휴 요청 보기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
        {/* o4o 플랫폼 소개 링크 */}
        <div className="mt-6">
          <Link
            to="/o4o"
            className="text-primary-100 hover:text-white text-sm underline underline-offset-2 transition-colors"
          >
            o4o 플랫폼 소개 보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function SuppliersPreviewSection() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const data = await netureApi.getSuppliers();
        setSuppliers(data.slice(0, 4)); // Show first 4 for preview
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">Loading suppliers...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-red-600">Error loading suppliers: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">공급자 둘러보기</h2>
          <p className="text-lg text-gray-600">
            검증된 공급자의 정보를 확인하세요
          </p>
        </div>

        {suppliers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">등록된 공급자가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {suppliers.map((supplier) => (
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
                  <span className="inline-block px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-full mb-3">
                    {supplier.category}
                  </span>
                  <p className="text-sm text-gray-600">
                    {supplier.shortDescription}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/suppliers"
            className="inline-flex items-center text-slate-500 hover:text-primary-700 font-medium"
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
  const [requests, setRequests] = useState<PartnershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const data = await netureApi.getPartnershipRequests('OPEN');
        setRequests(data.slice(0, 3)); // Show first 3 for preview
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">Loading partnership requests...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-red-600">Error loading requests: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Handshake className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">제휴 파트너를 찾는 판매자</h2>
          <p className="text-lg text-gray-600">
            진행 중인 제휴 기회를 확인하세요
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">진행 중인 제휴 요청이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <Link
                key={request.id}
                to={`/partners/requests/${request.id}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-primary-300 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {request.seller.name}
                  </h3>
                  <span className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded-full">
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
                  <span className="inline-flex items-center text-slate-500 hover:text-primary-700 text-sm font-medium">
                    제휴 조건 보기
                    <ArrowRight className="ml-1 w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/partners/requests"
            className="inline-flex items-center text-slate-500 hover:text-primary-700 font-medium"
          >
            제휴 요청 전체 보기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// WO-TEST-CENTER-SEPARATION-V1: 테스트 센터 링크 배너
function TestCenterBanner() {
  return (
    <section className="py-12 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                서비스 테스트 & 개선 참여
              </h3>
              <p className="text-sm text-slate-500">
                테스트 의견, 서비스 업데이트 확인, 피드백 작성을 한곳에서
              </p>
            </div>
          </div>
          <Link
            to="/test-center"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            테스트 센터 바로가기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
