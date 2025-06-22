import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, Package, Heart, CreditCard, MapPin, Bell, 
  Settings, HelpCircle, LogOut, ChevronRight, Star,
  Clock, Truck, RefreshCw, MessageCircle, Gift,
  Award, Shield, TrendingUp, Calendar, DollarSign,
  Users, BarChart3, Target, Zap, Building, UserCheck
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import Navbar from '../../../components/Navbar';

// 역할별 대시보드 컴포넌트들
import AdminMyPage from './role-pages/AdminMyPage';
import SellerMyPage from './role-pages/SellerMyPage';
import SupplierMyPage from './role-pages/SupplierMyPage';
import PartnerMyPage from './role-pages/PartnerMyPage';
import UserMyPage from './role-pages/UserMyPage';

const MyPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return '관리자';
      case 'seller': return '판매자';
      case 'supplier': return '공급자';
      case 'partner': return '파트너';
      default: return '일반사용자';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'seller': return '🛍️';
      case 'supplier': return '📦';
      case 'partner': return '🤝';
      default: return '👤';
    }
  };

  const renderRoleSpecificPage = () => {
    switch (user.role) {
      case 'admin':
      case 'administrator':
        return <AdminMyPage user={user} />;
      case 'seller':
        return <SellerMyPage user={user} />;
      case 'supplier':
        return <SupplierMyPage user={user} />;
      case 'partner':
        return <PartnerMyPage user={user} />;
      default:
        return <UserMyPage user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-blue-600">홈</Link>
            <ChevronRight className="w-4 h-4" />
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-gray-900">마이페이지</span>
            </div>
          </div>
        </div>
      </div>

      {/* 사용자 정보 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                {getRoleIcon(user.role)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.name}님</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {getRoleDisplayName(user.role)}
                  </span>
                  <span className="text-sm text-gray-500">{user.email}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link
                to="/dropshipping/shop"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🛍️ 쇼핑하기
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 역할별 페이지 렌더링 */}
      {renderRoleSpecificPage()}
    </div>
  );
};

export default MyPage;