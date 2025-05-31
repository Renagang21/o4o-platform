import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShoppingBag, 
  Coins, 
  MessageSquare, 
  Monitor, 
  BarChart3, 
  Users, 
  Settings, 
  Sparkles 
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const HeroSection = () => {
  useEffect(() => {
    // Add particle effect here if needed
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div 
          className="grid md:grid-cols-2 gap-12 items-center"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <div className="text-white">
            <motion.h1 
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight"
              variants={fadeInUp}
            >
              매장 경쟁력의<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                새로운 기준
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl sm:text-2xl mb-8 text-white/80 leading-relaxed"
              variants={fadeInUp}
            >
              neture.co.kr과 함께<br className="hidden md:inline" />
              스마트한 매장 운영의 미래를 경험하세요.
            </motion.p>
            <motion.div 
              className="flex flex-wrap gap-4"
              variants={fadeInUp}
            >
              <Link
                to="/register"
                className="group inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-300 hover:scale-105"
              >
                서비스 시작하기
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/about"
                className="group inline-flex items-center bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 hover:scale-105"
              >
                더 알아보기
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
          <motion.div 
            className="hidden md:block"
            variants={fadeInUp}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Users, label: '활성 사용자', value: '10,000+' },
                    { icon: ShoppingBag, label: '거래량', value: '1M+' },
                    { icon: MessageSquare, label: '월간 상담', value: '5,000+' },
                    { icon: Sparkles, label: '만족도', value: '4.9/5.0' },
                  ].map((stat, index) => (
                    <motion.div 
                      key={index} 
                      className="p-4 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.05 }}
                    >
                      <stat.icon className="w-8 h-8 text-emerald-400 mb-2" />
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-white/60 text-sm">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const ServiceCard = ({ icon: Icon, title, description, status }: {
  icon: React.ElementType;
  title: string;
  description: string;
  status: string;
}) => (
  <motion.div 
    className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
    whileHover={{ y: -5 }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className="relative">
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-6">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed">{description}</p>
      <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-sm font-medium">
        {status}
      </div>
    </div>
  </motion.div>
);

const ServiceSection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
    <div className="max-w-7xl mx-auto">
      <motion.div 
        className="text-center mb-16"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          새로운 서비스, 새로운 경험
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          neture.co.kr이 준비한 혁신적인 서비스들을 만나보세요
        </p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <ServiceCard
          icon={ShoppingBag}
          title="E-commerce"
          description="온라인 쇼핑몰 구축 및 운영"
          status="Coming Soon"
        />
        <ServiceCard
          icon={Coins}
          title="Crowdfunding"
          description="프로젝트 펀딩 및 투자 플랫폼"
          status="Coming Soon"
        />
        <ServiceCard
          icon={MessageSquare}
          title="Forum"
          description="전문가 네트워크 및 토론 공간"
          status="Coming Soon"
        />
        <ServiceCard
          icon={Monitor}
          title="Signage"
          description="스마트 디지털 광고 및 안내 시스템"
          status="Coming Soon"
        />
      </div>
    </div>
  </section>
);

const FeatureSection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto">
      <motion.div 
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        {[
          {
            icon: BarChart3,
            title: '매장 운영 최적화',
            description: '데이터 기반의 스마트한 운영으로 매장 효율성을 극대화합니다.'
          },
          {
            icon: Users,
            title: '데이터 기반 의사결정',
            description: '실시간 분석과 인사이트로 더 나은 비즈니스 결정을 내립니다.'
          },
          {
            icon: Settings,
            title: '통합 관리 시스템',
            description: '모든 운영 프로세스를 한 곳에서 효율적으로 관리합니다.'
          },
          {
            icon: Sparkles,
            title: '고객 경험 향상',
            description: '최적화된 서비스로 고객 만족도를 높입니다.'
          }
        ].map((feature, index) => (
          <motion.div 
            key={index} 
            className="group flex gap-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ y: -5 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

const CTASection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
    <div className="max-w-7xl mx-auto text-center">
      <motion.div
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          지금 바로 시작하세요
        </h2>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          neture.co.kr과 함께 스마트한 매장 운영의 미래를 경험하세요
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className="group inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold hover:bg-indigo-50 transition-all duration-300 hover:scale-105"
          >
            무료로 시작하기
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/contact"
            className="group inline-flex items-center bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20 hover:scale-105"
          >
            문의하기
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>
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