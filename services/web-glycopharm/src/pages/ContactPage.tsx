import { Mail, Phone, MapPin, Clock, Building2, FileText } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section - 단정하게 */}
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">문의하기</h1>
          <p className="text-slate-500">
            GlycoPharm 서비스 및 제휴에 관한 문의를 받고 있습니다
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* 일반 문의 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">일반 문의</h3>
              <p className="text-sm text-slate-500 mb-4">
                서비스 이용, 계정, 기술 지원 관련
              </p>
              <a
                href="mailto:support@glycopharm.co.kr"
                className="text-sm text-primary-600 font-medium hover:text-primary-700"
              >
                support@glycopharm.co.kr
              </a>
            </div>

            {/* 제휴 문의 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5 text-accent-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">제휴 문의</h3>
              <p className="text-sm text-slate-500 mb-4">
                공급사, 파트너십, 사업 제안
              </p>
              <a
                href="mailto:partner@glycopharm.co.kr"
                className="text-sm text-accent-600 font-medium hover:text-accent-700"
              >
                partner@glycopharm.co.kr
              </a>
            </div>

            {/* 입점 문의 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">약국 입점</h3>
              <p className="text-sm text-slate-500 mb-4">
                플랫폼 가입 및 입점 절차 안내
              </p>
              <a
                href="mailto:pharmacy@glycopharm.co.kr"
                className="text-sm text-slate-700 font-medium hover:text-slate-900"
              >
                pharmacy@glycopharm.co.kr
              </a>
            </div>
          </div>

          {/* 운영 정보 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">운영 정보</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">대표전화</p>
                  <p className="text-sm text-slate-500">02-0000-0000</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">운영시간</p>
                  <p className="text-sm text-slate-500">평일 09:00 - 18:00 (주말/공휴일 휴무)</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">주소</p>
                  <p className="text-sm text-slate-500">서울특별시 서초구 강남대로 000, 0층</p>
                </div>
              </div>
            </div>
          </div>

          {/* 사업자 정보 */}
          <div className="mt-8 bg-slate-100 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">사업자 정보</h3>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600">
              <p><span className="text-slate-500">상호:</span> (주)글라이코팜</p>
              <p><span className="text-slate-500">대표:</span> 홍길동</p>
              <p><span className="text-slate-500">사업자등록번호:</span> 000-00-00000</p>
              <p><span className="text-slate-500">통신판매업:</span> 2025-서울서초-0000</p>
            </div>
          </div>

          {/* 안내 문구 */}
          <p className="mt-8 text-center text-xs text-slate-400">
            이메일 문의는 영업일 기준 1-2일 내에 답변 드립니다
          </p>
        </div>
      </section>
    </div>
  );
}
