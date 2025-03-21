import React from 'react';
import './LoginPage.css';
import Header from '../../components/layout/Header/Header';

const LoginPage = () => {
  return (
    <div className="login-page">
      <Header />
      <main>
        <div className="container">
          <div className="login-form-container">
            <h1>로그인</h1>
            <p>계정 정보를 입력하여 로그인하세요</p>
            {/* 로그인 폼은 나중에 구현 */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
