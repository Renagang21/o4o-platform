
import React from 'react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

// 임시 이미지 (실제 프로젝트에서는 import 사용)
// import heroImage from '../../../assets/images/hero-image.svg';

const HeroSection = ({ title, subtitle, ctaText, ctaLink }) => {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <div className="hero-cta">
              <Link to={ctaLink} className="btn-primary">{ctaText}</Link>
              <Link to="/demo" className="btn-secondary">데모 보기</Link>
            </div>
            <div className="hero-badges">
              <div className="badge">
                <span className="badge-number">500+</span>
                <span className="badge-text">약국 가입</span>
              </div>
              <div className="badge">
                <span className="badge-number">5천만+</span>
                <span className="badge-text">월간 거래액</span>
              </div>
              <div className="badge">
                <span className="badge-number">24/7</span>
                <span className="badge-text">고객 지원</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            {/* 실제 이미지가 없는 경우 임시 div 사용 */}
            <div className="placeholder-image">약국 O4O 플랫폼 이미지</div>
            {/* <img src={heroImage} alt="약국 O4O 플랫폼 이미지" /> */}
          </div>
        </div>
      </div>
      
      <div className="hero-wave">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path fill="#ffffff" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,149.3C960,160,1056,160,1152,138.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;