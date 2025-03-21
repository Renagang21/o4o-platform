import React from 'react';
import { Link } from 'react-router-dom';
import './FeatureCards.css';

// 실제 프로젝트에서는 아이콘 import
// import iconB2B from '../../../assets/icons/b2b-icon.svg';
// import iconB2C from '../../../assets/icons/b2c-icon.svg';
// import iconWebPOS from '../../../assets/icons/webpos-icon.svg';

const FeatureCards = () => {
  const features = [
    {
      id: 'b2b',
      // icon: iconB2B,
      title: '약국 간 B2B 거래',
      description: '여러 도매업체 상품을 한 곳에서 비교하고 구매하세요. 자동 재고 관리와 연계되어 효율적인 약국 운영이 가능합니다.',
      link: '/b2b'
    },
    {
      id: 'b2c',
      // icon: iconB2C,
      title: '소비자 대상 온라인 판매',
      description: '약국의 제품을 온라인으로 판매하고 매출을 증대하세요. QR코드 기반 주문 시스템으로 오프라인과 온라인을 연결합니다.',
      link: '/b2c'
    },
    {
      id: 'webpos',
      // icon: iconWebPOS,
      title: '디지털 포스 시스템',
      description: '클라우드 기반 WebPOS로 언제 어디서나 약국 판매와 재고를 관리할 수 있습니다. 다양한 결제 시스템과 연동됩니다.',
      link: '/webpos'
    }
  ];
  
  return (
    <section className="feature-cards-section">
      <div className="container">
        <div className="section-header">
          <h2>약국 경영의 모든 것</h2>
          <p>약국 운영에 필요한 모든 기능을 하나의 플랫폼에서 제공합니다</p>
        </div>
        
        <div className="feature-cards">
          {features.map(feature => (
            <div className="feature-card" key={feature.id}>
              <div className="feature-icon">
                {/* 아이콘 이미지가 없는 경우 텍스트로 대체 */}
                <div className="icon-placeholder">{feature.title.charAt(0)}</div>
                {/* <img src={feature.icon} alt={`${feature.title} 아이콘`} /> */}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link to={feature.link} className="feature-link">자세히 보기</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;
