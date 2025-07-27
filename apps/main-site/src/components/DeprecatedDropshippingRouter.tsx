import { useEffect, FC } from 'react';
import { useNavigate } from 'react-router-dom';

const DropshippingRouter: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 워드프레스 스타일: 모든 사용자가 쇼핑몰로 이동
    // 관리자도 먼저 쇼핑몰을 보고, AdminBar를 통해 대시보드로 이동
    navigate('/dropshipping/shop', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">쇼핑몰로 이동 중...</p>
      </div>
    </div>
  );
};

export default DropshippingRouter;