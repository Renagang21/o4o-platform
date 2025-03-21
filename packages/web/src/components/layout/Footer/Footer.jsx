import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section about">
            <h3 className="footer-title">yaksa.site</h3>
            <p>약국 자동화부터 온라인 판매까지, 한 플랫폼에서 모두 해결하는 약국 기반 O4O 플랫폼입니다.</p>
            <div className="contact">
              <p><i className="icon-phone"></i> 02-123-4567</p>
              <p><i className="icon-envelope"></i> contact@yaksa.site</p>
            </div>
            <div className="social-links">
              <button aria-label="Facebook" className="social-button"><i className="icon-facebook"></i></button>
              <button aria-label="Twitter" className="social-button"><i className="icon-twitter"></i></button>
              <button aria-label="Instagram" className="social-button"><i className="icon-instagram"></i></button>
            </div>
          </div>

          <div className="footer-section links">
            <h3 className="footer-title">바로가기</h3>
            <ul>
              <li><Link to="/">홈</Link></li>
              <li><Link to="/b2b">B2B 스토어</Link></li>
              <li><Link to="/b2c">B2C 몰</Link></li>
              <li><Link to="/webpos">WebPOS</Link></li>
              <li><Link to="/learn">학습센터</Link></li>
              <li><Link to="/community">커뮤니티</Link></li>
              <li><Link to="/funding">펀딩</Link></li>
            </ul>
          </div>

          <div className="footer-section support">
            <h3 className="footer-title">고객지원</h3>
            <ul>
              <li><Link to="/faq">자주 묻는 질문</Link></li>
              <li><Link to="/contact">문의하기</Link></li>
              <li><Link to="/terms">이용약관</Link></li>
              <li><Link to="/privacy">개인정보처리방침</Link></li>
            </ul>
          </div>

          <div className="footer-section newsletter">
            <h3 className="footer-title">뉴스레터 구독</h3>
            <p>최신 소식과 업데이트를 받아보세요</p>
            <form>
              <input type="email" placeholder="이메일 주소" required />
              <button type="submit">구독</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} yaksa.site. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
