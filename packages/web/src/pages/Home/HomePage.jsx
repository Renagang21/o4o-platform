import React from 'react';
import './HomePage.css';

// 컴포넌트 import
import Header from '../../components/layout/Header/Header';
import HeroSection from '../../components/home/HeroSection/HeroSection';
import FeatureCards from '../../components/home/FeatureCards/FeatureCards';
import Footer from '../../components/layout/Footer/Footer'; // Footer import 추가

const HomePage = () => {
  return (
    <div className="home-page">
      <Header />
      
      <main>
        <HeroSection 
          title="디지털 약국 경영의 새로운 시작"
          subtitle="약국 자동화부터 온라인 판매까지, 한 플랫폼에서 모두 해결하세요"
          ctaText="시작하기"
          ctaLink="/register"
        />
        
        <FeatureCards />
        
        {/* 추가 섹션은 나중에 구현 */}
      </main>
      
      <Footer /> {/* Footer 컴포넌트 추가 */}
    </div>
  );
};

export default HomePage;