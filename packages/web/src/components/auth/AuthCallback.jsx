// src/components/AuthCallback.jsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const processAuth = async () => {
      try {
        // URL에서 provider와 code 파라미터 추출
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        
        // URL 경로에서 provider 추출 (예: /auth/google/callback -> google)
        const pathParts = location.pathname.split('/');
        const providerIndex = pathParts.indexOf('auth') + 1;
        const provider = providerIndex < pathParts.length ? pathParts[providerIndex] : null;

        if (!provider || !code) {
          throw new Error('Missing authentication information');
        }

        // 인증 처리
        await AuthService.handleLoginCallback(provider, code);
        
        // 로그인 성공 후 메인 페이지로 이동
        navigate('/');
      } catch (err) {
        console.error('Authentication failed:', err);
        setError('로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    };

    processAuth();
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="auth-callback">
        <div className="loading-spinner"></div>
        <p>로그인 처리 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-callback error">
        <p>{error}</p>
        <button onClick={() => navigate('/auth/login')}>로그인 페이지로 돌아가기</button>
      </div>
    );
  }

  return null;
};

export default AuthCallback;