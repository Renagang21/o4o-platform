import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign,
  UserCheck,
  UserX,
  Settings,
  Activity,
  FileText,
  Edit3,
  Image as ImageIcon
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'b2c' | 'yaksa' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

interface Pagination {
  current: number;
  total: number;
  totalUsers: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: '1',
        name: '김철수',
        email: 'kim@example.com',
        role: 'b2c',
        status: 'active',
        createdAt: '2025-01-01'
      },
      {
        id: '2',
        name: '이영희',
        email: 'lee@example.com',
        role: 'yaksa',
        status: 'pending',
        createdAt: '2025-01-02'
      },
      {
        id: '3',
        name: '박민수',
        email: 'park@example.com',
        role: 'admin',
        status: 'active',
        createdAt: '2025-01-03'
      }
    ];

    setUsers(mockUsers);
    setPagination({
      current: 1,
      total: 1,
      totalUsers: mockUsers.length
    });
    setLoading(false);
  }, []);

  const loadUsers = (page: number = 1) => {
    // Mock function for pagination
    console.log(`Loading users for page ${page}`);
  };

  const getActionButtons = (user: User) => {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => console.log('Edit user:', user.id)}
          className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
        >
          편집
        </button>
        <button
          onClick={() => console.log('Delete user:', user.id)}
          className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
        >
          삭제
        </button>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    const statusLabels = {
      active: '활성',
      inactive: '비활성',
      pending: '대기중'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      b2c: 'bg-blue-100 text-blue-800',
      yaksa: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800'
    };

    const roleLabels = {
      b2c: '일반',
      yaksa: '약사',
      admin: '관리자'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role as keyof typeof roleColors]}`}>
        {roleLabels[role as keyof typeof roleLabels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
              <p className="text-gray-600">시스템 전체를 관리하고 모니터링할 수 있습니다.</p>
            </div>
            
            {/* 관리 메뉴 버튼들 */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/pages')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                페이지 관리
              </button>
              <button
                onClick={() => navigate('/admin/content')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                컨텐츠 관리
              </button>
              <button
                onClick={() => navigate('/admin/media')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                미디어 라이브러리
              </button>
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                사용자 관리
              </button>
              <button
                onClick={() => navigate('/admin/settings')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                설정
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 사용자</p>
                <p className="text-2xl font-semibold text-gray-900">1,234</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 주문</p>
                <p className="text-2xl font-semibold text-gray-900">5,678</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 매출</p>
                <p className="text-2xl font-semibold text-gray-900">₩123M</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">성장률</p>
                <p className="text-2xl font-semibold text-gray-900">+12.3%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div 
          className="bg-white rounded-lg shadow overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">사용자 관리</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {getActionButtons(user)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {pagination.totalUsers}명 중 {((pagination.current - 1) * 10) + 1}-
                  {Math.min(pagination.current * 10, pagination.totalUsers)}명 표시
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => loadUsers(page)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        page === pagination.current
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
