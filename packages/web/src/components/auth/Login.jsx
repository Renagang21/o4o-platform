// src/components/Login.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';

const Login = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = AuthService.getGoogleLoginUrl();
  };

  const handleNaverLogin = () => {
    window.location.href = AuthService.getNaverLoginUrl();
  };

  const handleKakaoLogin = () => {
    window.location.href = AuthService.getKakaoLoginUrl();
  };

  return (
    <div className="login-container">
      <h2>O4O 플랫폼 로그인</h2>
      <div className="social-login-buttons">
        <button 
          className="google-login-btn"
          onClick={handleGoogleLogin}
        >
          Google 계정으로 로그인
        </button>
        
        <button 
          className="naver-login-btn"
          onClick={handleNaverLogin}
        >
          네이버 계정으로 로그인
        </button>
        
        <button 
          className="kakao-login-btn"
          onClick={handleKakaoLogin}
        >
          카카오 계정으로 로그인
        </button>
      </div>
    </div>
  );
};

export default Login;