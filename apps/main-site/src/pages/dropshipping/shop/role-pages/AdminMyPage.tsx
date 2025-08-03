import { useState, useEffect, FC } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, Users, Package, TrendingUp, DollarSign,
  Settings, BarChart3, AlertTriangle, Bell, FileText,
  MessageCircle, Zap, Calendar, Clock, Eye, ChevronRight,
  UserCheck, ShoppingCart, Award, Target, Building, Database,
  Activity, Lock, Download, Upload, RefreshCw, HelpCircle
} from 'lucide-react';

// 공통 타입 import
import { User, RolePageProps } from '../../../../types/user';

interface SystemStats {
  totalUsers: number;
  newUsersToday: number;
  totalOrders: number;
  ordersToday: number;
  totalRevenue: number;
  revenueToday: number;
  totalProducts: number;
  totalPartners: number;
  systemUptime: string;
  pendingApprovals: number;
  activeUsers: number;
  serverLoad: number;
}

interface RecentActivity {
  id: string;
  type: 'user_register' | 'order_placed' | 'product_added' | 'partner_joined' | 'system_alert';
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  user?: string;
}

interface PendingApproval {
  id: string;
  type: 'user_verification' | 'partner_application' | 'product_approval' | 'seller_registration';
  title: string;
  requester: string;
  requestDate: string;
  priority: 'high' | 'medium' | 'low';
}

const AdminMyPage: FC<RolePageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState({
    totalUsers: 12547,
    newUsersToday: 23,
    totalOrders: 8934,
    ordersToday: 47,
    totalRevenue: 284750000,
    revenueToday: 1247000,
    totalProducts: 1856,
    totalPartners: 143,
    systemUptime: '99.8%',
    pendingApprovals: 12,
    activeUsers: 847,
    serverLoad: 67
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  useEffect(() => {
    // 모의 최근 활동 데이터
    const mockRecentActivity: RecentActivity[] = [
      {
        id: '1',
        type: 'user_register',
        description: '신규 사용자 가입',
        timestamp: '5분 전',
        severity: 'success',
        user: '김한슬 (partner@test.com)'
      },
      {
        id: '2',
        type: 'order_placed',
        description: '고액 주문 접수 (500,000원)',
        timestamp: '12분 전',
        severity: 'info',
        user: '이영희 (user@test.com)'
      },
      {
        id: '3',
        type: 'system_alert',
        description: '서버 CPU 사용률 85% 도달',
        timestamp: '23분 전',
        severity: 'warning'
      },
      {
        id: '4',
        type: 'partner_joined',
        description: '새로운 파트너 승인 완료',
        timestamp: '1시간 전',
        severity: 'success',
        user: '박민수 (partner2@test.com)'
      },
      {
        id: '5',
        type: 'product_added',
        description: '신제품 등록 요청',
        timestamp: '2시간 전',
        severity: 'info',
        user: '㈜헬스케어'
      }
    ];

    // 모의 승인 대기 데이터
    const mockPendingApprovals: PendingApproval[] = [
      {
        id: '1',
        type: 'partner_application',
        title: '파트너 가입 신청',
        requester: '정수현 (jung@example.com)',
        requestDate: '2025.01.21',
        priority: 'high'
      },
      {
        id: '2',
        type: 'product_approval',
        title: '상품 등록 승인',
        requester: '㈜바이오텍 (admin@biotech.com)',
        requestDate: '2025.01.21',
        priority: 'medium'
      },
      {
        id: '3',
        type: 'seller_registration',
        title: '판매자 등록 신청',
        requester: '김영수 (seller@shop.com)',
        requestDate: '2025.01.20',
        priority: 'medium'
      },
      {
        id: '4',
        type: 'user_verification',
        title: '사업자 인증 요청',
        requester: '이마트 (mart@emart.com)',
        requestDate: '2025.01.20',
        priority: 'low'
      }
    ];

    setRecentActivity(mockRecentActivity);
    setPendingApprovals(mockPendingApprovals);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_register': return '👤';
      case 'order_placed': return '🛒';
      case 'product_added': return '📦';
      case 'partner_joined': return '🤝';
      case 'system_alert': return '⚠️';
      default: return '📄';
    }
  };

  const getApprovalIcon = (type: string) => {
    switch (type) {
      case 'partner_application': return '🤝';
      case 'product_approval': return '📦';
      case 'seller_registration': return '🛍️';
      case 'user_verification': return '✅';
      default: return '📋';
    }
  };

  const menuItems = [
    { id: 'overview', name: '관리자 대시보드', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'users', name: '사용자 관리', icon: <Users className="w-5 h-5" /> },
    { id: 'orders', name: '주문 관리', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'products', name: '상품 관리', icon: <Package className="w-5 h-5" /> },
    { id: 'partners', name: '파트너 관리', icon: <UserCheck className="w-5 h-5" /> },
    { id: 'approvals', name: '승인 관리', icon: <Award className="w-5 h-5" /> },
    { id: 'analytics', name: '분석 리포트', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'system', name: '시스템 모니터링', icon: <Activity className="w-5 h-5" /> },
    { id: 'notices', name: '공지사항 관리', icon: <FileText className="w-5 h-5" /> },
    { id: 'support', name: '고객지원 관리', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'security', name: '보안 관리', icon: <Lock className="w-5 h-5" /> },
    { id: 'backup', name: '백업/복원', icon: <Database className="w-5 h-5" /> },
    { id: 'settings', name: '시스템 설정', icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 왼쪽: 메뉴 */}
        <div className="lg:col-span-1">
          {/* 관리자 상태 카드 */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-3xl mb-2">👑</div>
              <div className="text-xl font-bold mb-2">시스템 관리자</div>
              <div className="text-sm opacity-90">
                시스템 가동률: {systemStats.systemUptime}
              </div>
              <div className="text-sm opacity-90">
                현재 접속자: {systemStats.activeUsers.toLocaleString()}명
              </div>
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
            <h3 className="font-semibold mb-3">빠른 액션</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTab('approvals')}
                className="w-full text-left bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-100 flex items-center justify-between"
              >
                ⚡ 승인 대기 ({systemStats.pendingApprovals})
                <span className="bg-red-600 text-white rounded-full px-2 py-1 text-xs">
                  {systemStats.pendingApprovals}
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className="w-full text-left bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg text-sm hover:bg-yellow-100"
              >
                🖥️ 시스템 모니터링
              </button>
              <button 
                onClick={() => setActiveTab('backup')}
                className="w-full text-left bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-100"
              >
                💾 시스템 백업
              </button>
              <button 
                onClick={() => window.open('/admin', '_blank')}
                className="w-full text-left bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-100"
              >
                🔧 관리자 전용 페이지
              </button>
            </div>
          </div>

          {/* 메뉴 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                } ${activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.id === 'approvals' && systemStats.pendingApprovals > 0 && (
                  <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                    {systemStats.pendingApprovals}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽: 콘텐츠 */}
        <div className="lg:col-span-3">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* 핵심 지표 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-blue-500" />
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      +{systemStats.newUsersToday}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">전체 사용자</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {systemStats.totalUsers.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <ShoppingCart className="w-8 h-8 text-green-500" />
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      +{systemStats.ordersToday}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">전체 주문</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {systemStats.totalOrders.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-purple-500" />
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      +{(systemStats.revenueToday / 10000).toFixed(0)}만원
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">전체 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(systemStats.totalRevenue / 100000000).toFixed(1)}억원
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <UserCheck className="w-8 h-8 text-orange-500" />
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      활성
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">파트너</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {systemStats.totalPartners}
                  </p>
                </div>
              </div>

              {/* 시스템 상태 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-6">시스템 상태</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {systemStats.systemUptime}
                    </div>
                    <div className="text-sm text-gray-600">시스템 가동률</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {systemStats.activeUsers}
                    </div>
                    <div className="text-sm text-gray-600">현재 접속자</div>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600 mb-1">
                      {systemStats.serverLoad}%
                    </div>
                    <div className="text-sm text-gray-600">서버 부하율</div>
                  </div>
                </div>
              </div>

              {/* 승인 대기 목록 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">승인 대기 목록</h3>
                  <button 
                    onClick={() => setActiveTab('approvals')} 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    전체보기 →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {pendingApprovals.slice(0, 4).map((approval: any) => (
                    <div key={approval.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getApprovalIcon(approval.type)}</div>
                        <div>
                          <div className="font-medium text-gray-900">{approval.title}</div>
                          <div className="text-sm text-gray-500">
                            {approval.requester} • {approval.requestDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(approval.priority)}`}>
                          {approval.priority === 'high' ? '긴급' : 
                           approval.priority === 'medium' ? '보통' : '낮음'}
                        </span>
                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                          처리
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 활동 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">최근 시스템 활동</h3>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    전체 로그 보기 →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border-l-4 border-l-blue-500 bg-gray-50 rounded-r-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{getActivityIcon(activity.type)}</div>
                        <div>
                          <div className="font-medium text-gray-900">{activity.description}</div>
                          {activity.user && (
                            <div className="text-sm text-gray-600">{activity.user}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                          {activity.severity === 'success' ? '성공' : 
                           activity.severity === 'warning' ? '경고' : 
                           activity.severity === 'error' ? '오류' : '정보'}
                        </span>
                        <span className="text-sm text-gray-500">{activity.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 오늘의 요약 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold mb-4 text-gray-900">📊 오늘의 요약</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {systemStats.newUsersToday}
                    </div>
                    <div className="text-sm text-gray-600">신규 가입</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {systemStats.ordersToday}
                    </div>
                    <div className="text-sm text-gray-600">신규 주문</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {(systemStats.revenueToday / 10000).toFixed(0)}만원
                    </div>
                    <div className="text-sm text-gray-600">오늘 매출</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {systemStats.pendingApprovals}
                    </div>
                    <div className="text-sm text-gray-600">승인 대기</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 다른 탭들 */}
          {activeTab !== 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold">
                  {menuItems.find((item: any) => item.id === activeTab)?.name}
                </h3>
              </div>
              
              <div className="p-6">
                {activeTab === 'approvals' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-sm text-gray-600">
                        총 {systemStats.pendingApprovals}개의 승인 대기 항목이 있습니다.
                      </div>
                      <div className="flex gap-2">
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                          일괄 승인
                        </button>
                        <button className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">
                          필터
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {pendingApprovals.map((approval: any) => (
                        <div key={approval.id} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="text-3xl">{getApprovalIcon(approval.type)}</div>
                              <div>
                                <div className="text-lg font-semibold text-gray-900">{approval.title}</div>
                                <div className="text-sm text-gray-600">
                                  신청자: {approval.requester}
                                </div>
                                <div className="text-sm text-gray-500">
                                  신청일: {approval.requestDate}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded text-sm font-medium ${getPriorityColor(approval.priority)}`}>
                                {approval.priority === 'high' ? '긴급' : 
                                 approval.priority === 'medium' ? '보통' : '낮음'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                              승인
                            </button>
                            <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                              거부
                            </button>
                            <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-400">
                              상세보기
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab !== 'approvals' && (
                  <div className="text-center py-12 text-gray-500">
                    <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>해당 기능은 개발 중입니다.</p>
                    <p className="text-sm mt-2">곧 강력한 관리자 전용 기능을 제공할 예정입니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMyPage;
