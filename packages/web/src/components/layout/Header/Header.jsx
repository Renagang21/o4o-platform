import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

// 실제 프로젝트에서는 로고 파일을 import
// 임시로 로고가 없는 경우 주석 처리
// import logoPlaceholder from '../../../assets/images/logo-placeholder.svg';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-wrapper">
          <div className="logo">
            <Link to="/">
              {/* 로고 이미지가 없는 경우 텍스트만 표시 */}
              {/* <img src={logoPlaceholder} alt="Yaksa.site 로고" /> */}
              <span>yaksa.site</span>
            </Link>
          </div>

          {/* 모바일 메뉴 토글 버튼 */}
          <button className="menu-toggle" onClick={toggleMenu}>
            <span className={`hamburger ${isMenuOpen ? 'active' : ''}`}></span>
          </button>

          {/* 네비게이션 메뉴 */}
          <nav className={`main-nav ${isMenuOpen ? 'active' : ''}`}>
            <ul className="nav-links">
              <li><Link to="/">홈</Link></li>
              <li><Link to="/b2b">B2B 스토어</Link></li>
              <li><Link to="/b2c">B2C 몰</Link></li>
              <li><Link to="/webpos">WebPOS</Link></li>
              <li><Link to="/learn">학습센터</Link></li>
              <li><Link to="/community">커뮤니티</Link></li>
              <li><Link to="/funding">펀딩</Link></li>
            </ul>
            
            <div className="nav-buttons">
              <Link to="/login" className="btn-login">로그인</Link>
              <Link to="/register" className="btn-register">회원가입</Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
