/**
 * Policy History Component
 * 정책 변경 히스토리 및 감사 로그 시스템
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Clock,
  User,
  Settings,
  Search,
  Download,
  Edit,
  Trash2,
  Plus,
  ArrowUpRight,
  Minus,
  RefreshCw
} from 'lucide-react';

interface PolicyHistoryItem {
  id: string;
  category: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, any>;
  userId: string;
  userName: string;
  timestamp: string;
  description: string;
}

interface PolicyHistoryProps {
  category?: string;
  maxItems?: number;
}

const PolicyHistory: React.FC<PolicyHistoryProps> = ({ 
  category, 
  maxItems = 50 
}) => {
  const [historyItems, setHistoryItems] = useState<PolicyHistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PolicyHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Mock data for demonstration
  const mockHistoryItems: PolicyHistoryItem[] = [
    {
      id: '1',
      category: 'partners',
      action: 'update',
      changes: { commissionRate: { from: 3.0, to: 5.0 } },
      userId: 'admin-1',
      userName: '관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      description: '파트너 기본 커미션 비율을 3%에서 5%로 변경'
    },
    {
      id: '2',
      category: 'sales',
      action: 'update',
      changes: { monthlyTarget: { from: 40000000, to: 50000000 } },
      userId: 'manager-1',
      userName: '영업매니저',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      description: '월 매출 목표를 4천만원에서 5천만원으로 상향 조정'
    },
    {
      id: '3',
      category: 'inventory',
      action: 'update',
      changes: { lowStockThreshold: { from: 5, to: 10 } },
      userId: 'admin-1',
      userName: '관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      description: '재고 부족 임계값을 5개에서 10개로 변경'
    },
    {
      id: '4',
      category: 'users',
      action: 'update',
      changes: { 'passwordPolicy.minLength': { from: 6, to: 8 } },
      userId: 'security-admin',
      userName: '보안관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      description: '비밀번호 최소 길이를 6자에서 8자로 강화'
    },
    {
      id: '5',
      category: 'partners',
      action: 'create',
      changes: { tierLevels: { added: { name: '플래티넘', minSales: 10000000, commissionRate: 10.0 } } },
      userId: 'admin-1',
      userName: '관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      description: '플래티넘 파트너 등급 신규 추가'
    },
    {
      id: '6',
      category: 'inventory',
      action: 'update',
      changes: { autoReorder: { from: false, to: true } },
      userId: 'warehouse-manager',
      userName: '창고관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      description: '자동 재주문 시스템 활성화'
    },
    {
      id: '7',
      category: 'sales',
      action: 'update',
      changes: { alertThreshold: { from: 70, to: 80 } },
      userId: 'manager-1',
      userName: '영업매니저',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
      description: '매출 알림 임계값을 70%에서 80%로 조정'
    },
    {
      id: '8',
      category: 'users',
      action: 'update',
      changes: { requireApproval: { from: false, to: true } },
      userId: 'admin-1',
      userName: '관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
      description: '신규 사용자 수동 승인 필수로 변경'
    },
    {
      id: '9',
      category: 'partners',
      action: 'delete',
      changes: { tierLevels: { removed: { name: '브론즈 플러스' } } },
      userId: 'admin-1',
      userName: '관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
      description: '브론즈 플러스 등급 삭제'
    },
    {
      id: '10',
      category: 'users',
      action: 'update',
      changes: { sessionTimeout: { from: 4, to: 8 } },
      userId: 'security-admin',
      userName: '보안관리자',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 192).toISOString(),
      description: '세션 타임아웃을 4시간에서 8시간으로 연장'
    }
  ];

  useEffect(() => {
    loadHistoryData();
  }, [category, maxItems]);

  useEffect(() => {
    applyFilters();
  }, [historyItems, searchTerm, selectedCategory, selectedAction, dateRange, selectedUser]);

  const loadHistoryData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHistoryItems(mockHistoryItems.slice(0, maxItems));
    } catch (error) {
      console.error('Failed to load history data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...historyItems];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Action filter
    if (selectedAction !== 'all') {
      filtered = filtered.filter(item => item.action === selectedAction);
    }

    // User filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(item => item.userId === selectedUser);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (dateRange) {
        case '1d':
          cutoff.setDate(now.getDate() - 1);
          break;
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(now.getDate() - 90);
          break;
        default:
          cutoff.setFullYear(1970);
      }
      
      filtered = filtered.filter(item => new Date(item.timestamp) >= cutoff);
    }

    setFilteredItems(filtered);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 1000 * 60) {
      return '방금 전';
    } else if (diff < 1000 * 60 * 60) {
      return `${Math.floor(diff / (1000 * 60))}분 전`;
    } else if (diff < 1000 * 60 * 60 * 24) {
      return `${Math.floor(diff / (1000 * 60 * 60))}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      partners: <User className="w-4 h-4 text-blue-600" />,
      sales: <ArrowUpRight className="w-4 h-4 text-green-600" />,
      inventory: <Settings className="w-4 h-4 text-orange-600" />,
      users: <User className="w-4 h-4 text-purple-600" />
    };
    return icons[category as keyof typeof icons] || <Settings className="w-4 h-4 text-gray-600" />;
  };

  const getCategoryName = (category: string) => {
    const names = {
      partners: '파트너스',
      sales: '매출 목표',
      inventory: '재고 관리',
      users: '사용자 보안'
    };
    return names[category as keyof typeof names] || category;
  };

  const getActionIcon = (action: string) => {
    const icons = {
      create: <Plus className="w-4 h-4 text-green-600" />,
      update: <Edit className="w-4 h-4 text-blue-600" />,
      delete: <Trash2 className="w-4 h-4 text-red-600" />
    };
    return icons[action as keyof typeof icons] || <Settings className="w-4 h-4 text-gray-600" />;
  };

  const getActionName = (action: string) => {
    const names = {
      create: '생성',
      update: '수정',
      delete: '삭제'
    };
    return names[action as keyof typeof names] || action;
  };

  const getActionColor = (action: string) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800'
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderChangeDetails = (changes: Record<string, any>) => {
    return Object.entries(changes).map(([key, value]) => {
      if (typeof value === 'object' && value.from !== undefined && value.to !== undefined) {
        return (
          <div key={key} className="text-xs text-gray-600 mt-1">
            <span className="font-medium">{key}:</span>
            <span className="mx-1">{String(value.from)}</span>
            <ArrowUpRight className="w-3 h-3 inline text-gray-400" />
            <span className="mx-1">{String(value.to)}</span>
          </div>
        );
      } else if (typeof value === 'object' && value.added) {
        return (
          <div key={key} className="text-xs text-green-600 mt-1">
            <Plus className="w-3 h-3 inline mr-1" />
            <span className="font-medium">추가:</span>
            <span className="ml-1">{JSON.stringify(value.added)}</span>
          </div>
        );
      } else if (typeof value === 'object' && value.removed) {
        return (
          <div key={key} className="text-xs text-red-600 mt-1">
            <Minus className="w-3 h-3 inline mr-1" />
            <span className="font-medium">삭제:</span>
            <span className="ml-1">{JSON.stringify(value.removed)}</span>
          </div>
        );
      }
      return null;
    });
  };

  const exportHistory = () => {
    const csvContent = [
      ['시간', '카테고리', '액션', '사용자', '설명'].join(','),
      ...filteredItems.map(item => [
        new Date(item.timestamp).toLocaleString('ko-KR'),
        getCategoryName(item.category),
        getActionName(item.action),
        item.userName,
        item.description
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `policy-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const uniqueUsers = [...new Set(historyItems.map(item => item.userName))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <History className="w-5 h-5 mr-2 text-gray-600" />
            정책 변경 히스토리
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            모든 정책 변경 사항이 기록되고 추적됩니다.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={loadHistoryData}
            className="wp-button-secondary"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            onClick={exportHistory}
            className="wp-button-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="wp-input"
              >
                <option value="all">모든 카테고리</option>
                <option value="partners">파트너스</option>
                <option value="sales">매출 목표</option>
                <option value="inventory">재고 관리</option>
                <option value="users">사용자 보안</option>
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="wp-input"
              >
                <option value="all">모든 액션</option>
                <option value="create">생성</option>
                <option value="update">수정</option>
                <option value="delete">삭제</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="wp-input"
              >
                <option value="all">전체 기간</option>
                <option value="1d">최근 1일</option>
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
              </select>
            </div>

            {/* User Filter */}
            <div>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="wp-input"
              >
                <option value="all">모든 사용자</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              총 {filteredItems.length}개의 변경 사항 (전체 {historyItems.length}개 중)
            </div>
            {(searchTerm || selectedCategory !== 'all' || selectedAction !== 'all' || 
              dateRange !== 'all' || selectedUser !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedAction('all');
                  setDateRange('all');
                  setSelectedUser('all');
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="wp-card">
        <div className="wp-card-body p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">히스토리를 불러오는 중...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">표시할 히스토리가 없습니다.</p>
              {(searchTerm || selectedCategory !== 'all' || selectedAction !== 'all' || 
                dateRange !== 'all' || selectedUser !== 'all') && (
                <p className="text-sm text-gray-500 mt-2">
                  다른 필터 조건을 시도해보세요.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item, _index) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getCategoryIcon(item.category)}
                        <span className="text-sm font-medium text-gray-900">
                          {getCategoryName(item.category)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(item.action)}`}>
                          {getActionIcon(item.action)}
                          <span className="ml-1">{getActionName(item.action)}</span>
                        </span>
                      </div>
                      
                      <div className="text-gray-900 mb-2">
                        {item.description}
                      </div>
                      
                      {renderChangeDetails(item.changes)}
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {item.userName}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        #{item.id}
                      </div>
                      <button className="text-xs text-blue-600 hover:text-blue-800 mt-1">
                        자세히 보기
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredItems.filter(item => item.action === 'update').length}
            </div>
            <div className="text-sm text-blue-800">수정</div>
          </div>
        </div>
        
        <div className="wp-card">
          <div className="wp-card-body text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredItems.filter(item => item.action === 'create').length}
            </div>
            <div className="text-sm text-green-800">생성</div>
          </div>
        </div>
        
        <div className="wp-card">
          <div className="wp-card-body text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredItems.filter(item => item.action === 'delete').length}
            </div>
            <div className="text-sm text-red-800">삭제</div>
          </div>
        </div>
        
        <div className="wp-card">
          <div className="wp-card-body text-center">
            <div className="text-2xl font-bold text-gray-600">
              {uniqueUsers.length}
            </div>
            <div className="text-sm text-gray-800">사용자</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyHistory;