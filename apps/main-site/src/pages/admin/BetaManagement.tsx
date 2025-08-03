import { useState, useEffect, FC } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Table } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

interface BetaUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  type: string;
  interestArea: string;
  status: string;
  useCase?: string;
  expectations?: string;
  feedbackCount: number;
  loginCount: number;
  createdAt: string;
  lastActiveAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface BetaFeedback {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  feature?: string;
  betaUser: {
    name: string;
    email: string;
  };
  createdAt: string;
  responseAt?: string;
  adminResponse?: string;
  rating?: number;
}

interface BetaAnalytics {
  userStats: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byInterestArea: Record<string, number>;
    newUsersThisWeek: number;
    activeUsersThisWeek: number;
    avgFeedbackPerUser: number;
  };
  feedbackStats: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    newFeedbackThisWeek: number;
    avgResolutionTime: number;
    satisfactionRating: number;
  };
}

const STATUS_COLORS = {
  pending: 'yellow',
  approved: 'green',
  active: 'blue',
  inactive: 'gray',
  suspended: 'red'
} as const;

const PRIORITY_COLORS = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  critical: 'red'
} as const;

const FEEDBACK_STATUS_COLORS = {
  pending: 'yellow',
  reviewed: 'blue',
  in_progress: 'purple',
  resolved: 'green',
  rejected: 'red',
  archived: 'gray'
} as const;

export const BetaManagement: FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('users');
  const [betaUsers, setBetaUsers] = useState([]);
  const [betaFeedback, setBetaFeedback] = useState([]);
  const [analytics, setAnalytics] = useState<BetaAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Search and filter states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('');
  const [feedbackPriorityFilter, setFeedbackPriorityFilter] = useState('');
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<BetaUser | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<BetaFeedback | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');

  // Pagination
  const [userPage, setUserPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAnalytics();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchBetaUsers();
    } else if (activeTab === 'feedback') {
      fetchBetaFeedback();
    }
  }, [activeTab, userPage, feedbackPage, userSearchQuery, userStatusFilter, feedbackSearchQuery, feedbackStatusFilter, feedbackPriorityFilter]);

  const fetchBetaUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: pageSize.toString(),
        ...(userSearchQuery && { search: userSearchQuery }),
        ...(userStatusFilter && { status: userStatusFilter })
      });

      const response = await fetch(`/api/beta/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setBetaUsers(data.data.users);
        setUserTotal(data.data.total);
      } else {
        showToast('베타 사용자 목록을 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Fetch beta users error:', error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBetaFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: feedbackPage.toString(),
        limit: pageSize.toString(),
        ...(feedbackSearchQuery && { search: feedbackSearchQuery }),
        ...(feedbackStatusFilter && { status: feedbackStatusFilter }),
        ...(feedbackPriorityFilter && { priority: feedbackPriorityFilter })
      });

      const response = await fetch(`/api/beta/feedback-admin?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setBetaFeedback(data.data.feedback);
        setFeedbackTotal(data.data.total);
      } else {
        showToast('피드백 목록을 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Fetch beta feedback error:', error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/beta/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/beta/users/${userId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes: '관리자 승인' })
      });

      const data = await response.json();
      if (data.success) {
        showToast('베타 사용자가 승인되었습니다.', 'success');
        fetchBetaUsers();
      } else {
        showToast('승인 처리에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Approve user error:', error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const response = await fetch(`/api/beta/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        showToast('사용자 상태가 업데이트되었습니다.', 'success');
        fetchBetaUsers();
      } else {
        showToast('상태 업데이트에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Update user status error:', error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const handleRespondToFeedback = async () => {
    if (!selectedFeedback || !responseText.trim()) {
      showToast('응답 내용을 입력해주세요.', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/beta/feedback-admin/${selectedFeedback.id}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ response: responseText })
      });

      const data = await response.json();
      if (data.success) {
        showToast('피드백에 응답했습니다.', 'success');
        setShowResponseModal(false);
        setResponseText('');
        setSelectedFeedback(null);
        fetchBetaFeedback();
      } else {
        showToast('응답 처리에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Respond to feedback error:', error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, status: string) => {
    try {
      const response = await fetch(`/api/beta/feedback-admin/${feedbackId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        showToast('피드백 상태가 업데이트되었습니다.', 'success');
        fetchBetaFeedback();
      } else {
        showToast('상태 업데이트에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Update feedback status error:', error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  };

  const renderAnalyticsDashboard = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">총 베타 사용자</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.userStats.total}</p>
            <p className="text-xs text-green-600 dark:text-green-400">
              이번 주 +{analytics.userStats.newUsersThisWeek}
            </p>
          </Card>
          
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">활성 사용자</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.userStats.activeUsersThisWeek}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              이번 주 활동
            </p>
          </Card>
          
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">총 피드백</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.feedbackStats.total}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              이번 주 +{analytics.feedbackStats.newFeedbackThisWeek}
            </p>
          </Card>
          
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">만족도</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.feedbackStats.satisfactionRating.toFixed(1)}/5.0
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              평균 평점
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">사용자 상태별 분포</h3>
            <div className="space-y-2">
              {Object.entries(analytics.userStats.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="capitalize">{status}</span>
                  <Badge color={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">피드백 우선순위별 분포</h3>
            <div className="space-y-2">
              {Object.entries(analytics.feedbackStats.byPriority).map(([priority, count]) => (
                <div key={priority} className="flex justify-between items-center">
                  <span className="capitalize">{priority}</span>
                  <Badge color={PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]}>{count}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderUsersTab = () => {
    const userColumns = [
      {
        key: 'name',
        header: '이름',
        render: (user: BetaUser) => (
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        )
      },
      {
        key: 'company',
        header: '회사/직책',
        render: (user: BetaUser) => (
          <div>
            <div>{user.company || '-'}</div>
            <div className="text-sm text-gray-500">{user.jobTitle || '-'}</div>
          </div>
        )
      },
      {
        key: 'type',
        header: '유형',
        render: (user: BetaUser) => <Badge>{user.type}</Badge>
      },
      {
        key: 'status',
        header: '상태',
        render: (user: BetaUser) => (
          <Badge color={STATUS_COLORS[user.status as keyof typeof STATUS_COLORS]}>
            {user.status}
          </Badge>
        )
      },
      {
        key: 'activity',
        header: '활동',
        render: (user: BetaUser) => (
          <div className="text-sm">
            <div>피드백: {user.feedbackCount}</div>
            <div>로그인: {user.loginCount}</div>
          </div>
        )
      },
      {
        key: 'createdAt',
        header: '등록일',
        render: (user: BetaUser) => new Date(user.createdAt).toLocaleDateString()
      },
      {
        key: 'actions',
        header: '작업',
        render: (user: BetaUser) => (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedUser(user);
                setShowUserModal(true);
              }}
            >
              상세
            </Button>
            {user.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => handleApproveUser(user.id)}
              >
                승인
              </Button>
            )}
          </div>
        )
      }
    ];

    return (
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Input
            placeholder="이름, 이메일, 회사명으로 검색..."
            value={userSearchQuery}
            onChange={(e: any) => setUserSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select
            value={userStatusFilter}
            onChange={setUserStatusFilter}
            options={[
              { value: '', label: '모든 상태' },
              { value: 'pending', label: '대기 중' },
              { value: 'approved', label: '승인됨' },
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
              { value: 'suspended', label: '정지됨' }
            ]}
            className="w-40"
          />
        </div>

        <Card>
          <Table
            columns={userColumns}
            data={betaUsers}
            loading={loading}
            pagination={{
              current: userPage,
              total: userTotal,
              pageSize,
              onChange: setUserPage
            }}
          />
        </Card>
      </div>
    );
  };

  const renderFeedbackTab = () => {
    const feedbackColumns = [
      {
        key: 'title',
        header: '제목',
        render: (feedback: BetaFeedback) => (
          <div>
            <div className="font-medium">{feedback.title}</div>
            <div className="text-sm text-gray-500">
              {feedback.betaUser.name} ({feedback.betaUser.email})
            </div>
          </div>
        )
      },
      {
        key: 'type',
        header: '유형',
        render: (feedback: BetaFeedback) => <Badge>{feedback.type}</Badge>
      },
      {
        key: 'priority',
        header: '우선순위',
        render: (feedback: BetaFeedback) => (
          <Badge color={PRIORITY_COLORS[feedback.priority as keyof typeof PRIORITY_COLORS]}>
            {feedback.priority}
          </Badge>
        )
      },
      {
        key: 'status',
        header: '상태',
        render: (feedback: BetaFeedback) => (
          <Badge color={FEEDBACK_STATUS_COLORS[feedback.status as keyof typeof FEEDBACK_STATUS_COLORS]}>
            {feedback.status}
          </Badge>
        )
      },
      {
        key: 'rating',
        header: '평점',
        render: (feedback: BetaFeedback) => 
          feedback.rating ? `${feedback.rating}/5` : '-'
      },
      {
        key: 'createdAt',
        header: '제출일',
        render: (feedback: BetaFeedback) => new Date(feedback.createdAt).toLocaleDateString()
      },
      {
        key: 'actions',
        header: '작업',
        render: (feedback: BetaFeedback) => (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedFeedback(feedback);
                setShowFeedbackModal(true);
              }}
            >
              상세
            </Button>
            {['pending', 'reviewed'].includes(feedback.status) && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedFeedback(feedback);
                  setResponseText(feedback.adminResponse || '');
                  setShowResponseModal(true);
                }}
              >
                응답
              </Button>
            )}
          </div>
        )
      }
    ];

    return (
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Input
            placeholder="제목, 설명으로 검색..."
            value={feedbackSearchQuery}
            onChange={(e: any) => setFeedbackSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select
            value={feedbackStatusFilter}
            onChange={setFeedbackStatusFilter}
            options={[
              { value: '', label: '모든 상태' },
              { value: 'pending', label: '대기 중' },
              { value: 'reviewed', label: '검토됨' },
              { value: 'in_progress', label: '진행 중' },
              { value: 'resolved', label: '해결됨' },
              { value: 'rejected', label: '거절됨' }
            ]}
            className="w-40"
          />
          <Select
            value={feedbackPriorityFilter}
            onChange={setFeedbackPriorityFilter}
            options={[
              { value: '', label: '모든 우선순위' },
              { value: 'critical', label: '긴급' },
              { value: 'high', label: '높음' },
              { value: 'medium', label: '보통' },
              { value: 'low', label: '낮음' }
            ]}
            className="w-40"
          />
        </div>

        <Card>
          <Table
            columns={feedbackColumns}
            data={betaFeedback}
            loading={loading}
            pagination={{
              current: feedbackPage,
              total: feedbackTotal,
              pageSize,
              onChange: setFeedbackPage
            }}
          />
        </Card>
      </div>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: '대시보드', content: renderAnalyticsDashboard() },
    { id: 'users', label: '베타 사용자', content: renderUsersTab() },
    { id: 'feedback', label: '피드백 관리', content: renderFeedbackTab() }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          베타 프로그램 관리
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          베타 사용자와 피드백을 관리하고 분석합니다.
        </p>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* User Detail Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        size="lg"
      >
        {selectedUser && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">베타 사용자 상세 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
                <p className="mt-1">{selectedUser.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">이메일</label>
                <p className="mt-1">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">회사</label>
                <p className="mt-1">{selectedUser.company || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">직책</label>
                <p className="mt-1">{selectedUser.jobTitle || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">사용 목적</label>
                <p className="mt-1">{selectedUser.useCase || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">기대사항</label>
                <p className="mt-1">{selectedUser.expectations || '-'}</p>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <Select
                value={selectedUser.status}
                onChange={(status: any) => handleUpdateUserStatus(selectedUser.id, status)}
                options={[
                  { value: 'pending', label: '대기 중' },
                  { value: 'approved', label: '승인됨' },
                  { value: 'active', label: '활성' },
                  { value: 'inactive', label: '비활성' },
                  { value: 'suspended', label: '정지됨' }
                ]}
              />
              <Button onClick={() => setShowUserModal(false)}>닫기</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Feedback Detail Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        size="lg"
      >
        {selectedFeedback && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">피드백 상세 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">제목</label>
                <p className="mt-1">{selectedFeedback.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">설명</label>
                <p className="mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>
              {selectedFeedback.adminResponse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">관리자 응답</label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedFeedback.adminResponse}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex space-x-3">
              <Select
                value={selectedFeedback.status}
                onChange={(status: any) => handleUpdateFeedbackStatus(selectedFeedback.id, status)}
                options={[
                  { value: 'pending', label: '대기 중' },
                  { value: 'reviewed', label: '검토됨' },
                  { value: 'in_progress', label: '진행 중' },
                  { value: 'resolved', label: '해결됨' },
                  { value: 'rejected', label: '거절됨' },
                  { value: 'archived', label: '보관됨' }
                ]}
              />
              <Button
                onClick={() => {
                  setResponseText(selectedFeedback.adminResponse || '');
                  setShowResponseModal(true);
                }}
              >
                응답하기
              </Button>
              <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>닫기</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Response Modal */}
      <Modal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">피드백에 응답하기</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                응답 내용
              </label>
              <textarea
                value={responseText}
                onChange={(e: any) => setResponseText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="사용자에게 전달할 응답을 작성해주세요..."
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowResponseModal(false)}>취소</Button>
            <Button onClick={handleRespondToFeedback}>응답 전송</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};