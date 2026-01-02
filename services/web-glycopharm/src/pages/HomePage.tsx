import { NavLink } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Building2,
  Truck,
  Handshake,
  Users,
  ShieldCheck,
  TrendingUp,
  Package,
  BookOpen,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// Mock data for partners
const partners = [
  { id: 1, name: 'Abbott', logo: '/partners/abbott.png' },
  { id: 2, name: 'Dexcom', logo: '/partners/dexcom.png' },
  { id: 3, name: 'Medtronic', logo: '/partners/medtronic.png' },
  { id: 4, name: 'Roche', logo: '/partners/roche.png' },
  { id: 5, name: 'Bayer', logo: '/partners/bayer.png' },
  { id: 6, name: 'LifeScan', logo: '/partners/lifescan.png' },
];

// Mock stats
const stats = [
  { label: '가입 약국', value: '2,500+', icon: Building2 },
  { label: '등록 상품', value: '15,000+', icon: Package },
  { label: '월간 거래액', value: '50억+', icon: TrendingUp },
  { label: '만족도', value: '98%', icon: Users },
];

const features = [
  {
    icon: Building2,
    title: '약국 전용 플랫폼',
    description: '약사를 위한 맞춤형 B2B 플랫폼으로 효율적인 상품 관리와 판매가 가능합니다.',
    color: 'primary',
  },
  {
    icon: Truck,
    title: '신뢰할 수 있는 공급망',
    description: '검증된 공급업체로부터 정품 혈당관리 제품을 안정적으로 공급받으세요.',
    color: 'blue',
  },
  {
    icon: ShieldCheck,
    title: '안전한 거래',
    description: '모든 거래는 안전하게 보호되며, 투명한 가격 정책을 운영합니다.',
    color: 'green',
  },
  {
    icon: Handshake,
    title: '파트너 생태계',
    description: '디바이스 제조사, 컨텐츠 제공자와 함께 성장하는 파트너십을 제공합니다.',
    color: 'purple',
  },
];

const categories = [
  { name: '연속혈당측정기', count: 45, image: '/categories/cgm.jpg' },
  { name: '혈당측정기', count: 120, image: '/categories/meter.jpg' },
  { name: '란셋/채혈침', count: 85, image: '/categories/lancet.jpg' },
  { name: '검사지', count: 200, image: '/categories/strip.jpg' },
  { name: '건강기능식품', count: 350, image: '/categories/supplement.jpg' },
  { name: '당뇨식품', count: 280, image: '/categories/food.jpg' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 py-20 md:py-28">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                약사를 위한 혈당관리 전문 플랫폼
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                혈당관리의 새로운
                <br />
                <span className="text-primary-200">기준을 만듭니다</span>
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-xl">
                CGM, 혈당측정기, 건강기능식품까지.
                약국에서 필요한 모든 혈당관리 제품을 한 곳에서 만나보세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <NavLink
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-xl shadow-black/20"
                >
                  무료로 시작하기
                  <ArrowRight className="w-5 h-5" />
                </NavLink>
                <NavLink
                  to="/forum"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                >
                  둘러보기
                </NavLink>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="hidden lg:block relative">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className={`bg-white rounded-2xl p-5 shadow-xl ${
                          index === 0 ? 'col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              왜 GlycoPharm인가요?
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              약사 전용 플랫폼으로서 혈당관리 제품의 유통과 판매를 혁신합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group p-6 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 hover-lift"
                >
                  <div className={`w-14 h-14 rounded-xl bg-${feature.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">상품 카테고리</h2>
              <p className="text-slate-500">다양한 혈당관리 제품을 만나보세요</p>
            </div>
            <NavLink
              to="/forum"
              className="hidden md:flex items-center gap-1 text-primary-600 font-medium hover:text-primary-700"
            >
              전체보기
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <div
                key={category.name}
                className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer hover-lift"
              >
                <div className="aspect-square bg-slate-100 rounded-xl mb-3 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                    <Activity className="w-10 h-10 text-primary-400" />
                  </div>
                </div>
                <h3 className="font-medium text-slate-800 text-sm mb-1">{category.name}</h3>
                <p className="text-xs text-slate-400">{category.count}개 상품</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - For Different Roles */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              함께 성장하세요
            </h2>
            <p className="text-slate-500">각 역할에 맞는 맞춤형 서비스를 제공합니다</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Pharmacy */}
            <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 p-8 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
              <Building2 className="w-12 h-12 mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">약국</h3>
              <p className="text-white/80 text-sm mb-6">
                혈당관리 전문 약국으로 성장하세요. 다양한 제품과 고객 관리 도구를 제공합니다.
              </p>
              <NavLink
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-medium rounded-xl hover:bg-primary-50 transition-colors"
              >
                입점 신청
                <ArrowRight className="w-4 h-4" />
              </NavLink>
            </div>

            {/* Supplier */}
            <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 p-8 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
              <Truck className="w-12 h-12 mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">공급자</h3>
              <p className="text-white/80 text-sm mb-6">
                전국 2,500개 이상의 약국에 제품을 공급하세요. 효율적인 주문 관리 시스템을 제공합니다.
              </p>
              <NavLink
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-medium rounded-xl hover:bg-blue-50 transition-colors"
              >
                공급자 등록
                <ArrowRight className="w-4 h-4" />
              </NavLink>
            </div>

            {/* Partner */}
            <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-purple-700 p-8 text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
              <Handshake className="w-12 h-12 mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">파트너</h3>
              <p className="text-white/80 text-sm mb-6">
                디바이스, 컨텐츠, 마케팅 파트너로 함께 하세요. 새로운 비즈니스 기회를 발견하세요.
              </p>
              <NavLink
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 font-medium rounded-xl hover:bg-purple-50 transition-colors"
              >
                파트너 신청
                <ArrowRight className="w-4 h-4" />
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Forum */}
            <NavLink
              to="/forum"
              className="group flex gap-6 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all hover-lift"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-accent-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">포럼</h3>
                <p className="text-slate-500 text-sm mb-3">
                  약사들의 노하우와 경험을 공유하세요. 혈당관리에 대한 다양한 정보를 나눌 수 있습니다.
                </p>
                <span className="text-primary-600 font-medium text-sm flex items-center gap-1">
                  포럼 바로가기
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </NavLink>

            {/* Education */}
            <NavLink
              to="/education"
              className="group flex gap-6 p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all hover-lift"
            >
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">교육/자료</h3>
                <p className="text-slate-500 text-sm mb-3">
                  혈당관리 최신 트렌드와 제품 교육 자료를 확인하세요. 전문성을 높이는 데 도움이 됩니다.
                </p>
                <span className="text-primary-600 font-medium text-sm flex items-center gap-1">
                  교육자료 바로가기
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </NavLink>
          </div>
        </div>
      </section>

      {/* Partners Marquee */}
      <section className="py-16 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm text-slate-400 mb-8">
            신뢰할 수 있는 파트너사와 함께합니다
          </p>

          {/* 마퀴 컨테이너 - max-w 내에서만 동작 */}
          <div className="relative overflow-hidden">
            {/* 좌우 페이드 그라데이션 */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            {/* 마퀴 애니메이션 */}
            <div className="flex animate-marquee">
              {/* 첫 번째 세트 */}
              <div className="flex shrink-0">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="shrink-0 w-36 h-20 mx-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-colors"
                  >
                    <span className="text-slate-500 font-medium text-sm">{partner.name}</span>
                  </div>
                ))}
              </div>
              {/* 두 번째 세트 (무한 루프용) */}
              <div className="flex shrink-0">
                {partners.map((partner) => (
                  <div
                    key={`dup-${partner.id}`}
                    className="shrink-0 w-36 h-20 mx-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-colors"
                  >
                    <span className="text-slate-500 font-medium text-sm">{partner.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
            GlycoPharm과 함께 혈당관리 전문 약국으로 성장하세요.
            무료 가입으로 모든 기능을 체험해보실 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <NavLink
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/30"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </NavLink>
            <NavLink
              to="/forum"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
            >
              더 알아보기
            </NavLink>
          </div>
        </div>
      </section>
    </div>
  );
}
