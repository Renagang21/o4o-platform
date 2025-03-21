import React from 'react';
import './SignupPage.css';
import Header from '../../components/layout/Header/Header';

const SignupPage = () => {
  return (
    <div className="signup-page">
      <Header />
      <main>
        <div className="container">
          <div className="signup-form-container">
            <h1>회원가입</h1>
            <p>약사.site 서비스 이용을 위한 회원정보를 입력해주세요</p>
            {/* 회원가입 폼은 추후 구현 */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupPage;
