import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';
import Header from '../../components/layout/Header/Header';

const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <Header />
      <main>
        <div className="container">
          <div className="not-found-content">
            <h1>404</h1>
            <h2>페이지를 찾을 수 없습니다</h2>
            <p>요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.</p>
            <Link to="/" className="btn-primary">홈으로 돌아가기</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
