import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ForumHome: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 즉시 대시보드로 리다이렉트
    navigate('/forum/dashboard', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">포럼 대시보드로 이동 중...</p>
      </div>
    </div>
  );
};

export default ForumHome;
