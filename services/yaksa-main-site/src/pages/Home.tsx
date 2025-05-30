import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Package, MessageSquare, Shield, Star, CheckCircle, TrendingUp } from 'lucide-react';

const HeroSection = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zM22.343 0L13.857 8.485 15.272 9.9l9.9-9.9h-2.83zM32 0l-3.486 3.485 1.415 1.415L34.828.828 32 0zm-6.485 0L16.828 8.687l1.414 1.414 8.485-8.485L25.515 0zm12.97 0l8.686 8.686-1.415 1.415L34.828 0h3.657zM20 0L0 20h2.828L20 2.828 37.17 20H40L20 0zm-5.657 0L0 14.343V17.17L14.343 2.828 5.858 0H2.828zM0 8.686V11.514L11.514 0H8.686L0 8.686zM0 2.828L2.828 0H0v2.828zM60 17.17V14.343L45.657 0H48.686L60 11.314V8.486L51.314 0H54.142L60 5.858V2.83L57.17 0H60v17.17zm-14.343 0L60 2.828V0H45.657v2.828L57.17 14.343 45.657 2.828V5.656L54.142 14.14 45.657 5.657v2.83L51.314 14.14 45.657 8.485v2.83l3.485 3.485-3.485-3.485v2.828L60 17.17zm-5.657 0L60 8.485V5.657L37.17 17.17h2.83zm-5.657 0L60 14.142v-2.83L42.828 17.17h2.83zM60 20L40 0h-2.828L60 17.17V20z\' fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")', backgroundSize: '30px 30px' }}></div>
    </div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            약사 커뮤니티의<br />새로운 기준
          </h1>
          <p className="text-xl sm:text-2xl mb-8 text-blue-100 leading-relaxed">
            전문성과 신뢰를 바탕으로 약사들의 지식을 공유하고,<br className="hidden md:inline" />
            더 나은 의약품 정보를 제공합니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/register"
              className="inline-flex items-center bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              약사 회원가입
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors border border-white/20"
            >
              제품 둘러보기
            </Link>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full filter blur-3xl opacity-20"></div>
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-8 backdrop-blur-sm border border-white/10">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, label: '활성 약사', value: '1,000+' },
                  { icon: Package, label: '등록된 제품', value: '5,000+' },
                  { icon: MessageSquare, label: '월간 상담', value: '3,000+' },
                  { icon: Star, label: '평균 평점', value: '4.8/5.0' },
                ].map((stat, index) => (
                  <div key={index} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm">
                    <stat.icon className="w-8 h-8 text-blue-300 mb-2" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-blue-200 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ServiceCard = ({ icon: Icon, title, description, link }: {
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-6">
      <Icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
    </div>
    <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed">{description}</p>
    <Link
      to={link}
      className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
    >
      자세히 보기
      <ArrowRight className="w-5 h-5 ml-2" />
    </Link>
  </div>
);

const ServiceSection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">주요 서비스</h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          약사님들의 전문성을 높이고 효율적인 업무를 지원하는 다양한 서비스를 제공합니다
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ServiceCard
          icon={Users}
          title="약사 등록"
          description="철저한 자격 검증을 통해 전문가 네트워크에 참여하고, 다양한 혜택을 누리세요."
          link="/register"
        />
        <ServiceCard
          icon={Package}
          title="제품 등록"
          description="약사 전용 제품을 등록하고 관리하며, 전문적인 제품 정보를 공유하세요."
          link="/products/new"
        />
        <ServiceCard
          icon={MessageSquare}
          title="커뮤니티"
          description="전문가들과 실시간으로 소통하며 최신 의약품 정보와 노하우를 교류하세요."
          link="/community"
        />
      </div>
    </div>
  </section>
);

const FeatureSection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto">
      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            icon: Shield,
            title: '신뢰할 수 있는 플랫폼',
            description: '철저한 자격 검증과 보안 시스템으로 안전한 서비스를 제공합니다.'
          },
          {
            icon: CheckCircle,
            title: '전문성 강화',
            description: '최신 의약품 정보와 전문가 네트워크로 약사님의 전문성을 높입니다.'
          },
          {
            icon: TrendingUp,
            title: '효율적인 업무',
            description: '스마트한 관리 도구로 업무 효율을 극대화할 수 있습니다.'
          }
        ].map((feature, index) => (
          <div key={index} className="flex gap-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <feature.icon className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
    <div className="max-w-7xl mx-auto text-center">
      <h2 className="text-3xl sm:text-4xl font-bold mb-6">약사님의 전문성을 높여줄 플랫폼</h2>
      <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
        지금 바로 가입하고 전문가 네트워크의 일원이 되어보세요
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/register"
          className="inline-flex items-center bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          약사 회원가입
          <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors border border-white/20"
        >
          로그인하기
        </Link>
      </div>
    </div>
  </section>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ServiceSection />
      <FeatureSection />
      <CTASection />
    </div>
  );
};

export default Home; 