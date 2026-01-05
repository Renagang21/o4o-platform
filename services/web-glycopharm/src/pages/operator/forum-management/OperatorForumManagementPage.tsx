/**
 * OperatorForumManagementPage - 포럼 관리 (운영자)
 *
 * 포럼 신청 승인/반려
 * 포럼 상태 변경 (Open/ReadOnly/Closed)
 * 공지 작성 및 상단 고정 관리
 */

import { useState } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Lock,
  Archive,
  Settings,
  MessageSquare,
  Users,
  Clock,
  X,
} from 'lucide-react';
import type { Forum, ForumApplication, ForumStatus, ForumApplicationStatus, UserRole } from '@/types';

// Mock 포럼 신청 데이터
const mockApplications: ForumApplication[] = [
  {
    id: 'app1',
    title: '인슐린 펌프 사용자 모임',
    description: '인슐린 펌프 사용 경험을 공유하는 포럼',
    purpose: '인슐린 펌프 사용자들이 경험과 노하우를 공유하고, 새로운 사용자들에게 도움을 주기 위함',
    targetRoles: ['pharmacy'],
    allowedWriteRoles: ['pharmacy', 'operator'],
    applicantId: 'u5',
    applicantName: '최약사',
    status: 'pending',
    createdAt: '2024-01-20',
  },
  {
    id: 'app2',
    title: '당뇨 식단 정보 공유',
    description: '당뇨 환자를 위한 식단 정보 공유 포럼',
    purpose: '당뇨 환자 맞춤 식단 정보와 레시피를 공유하는 공간',
    targetRoles: ['pharmacy', 'supplier'],
    allowedWriteRoles: ['pharmacy', 'supplier', 'operator'],
    note: '영양사 협회와 연계 예정',
    applicantId: 'u6',
    applicantName: '정약사',
    status: 'pending',
    createdAt: '2024-01-19',
  },
];

// Mock 포럼 목록
const mockForums: Forum[] = [
  {
    id: 'forum1',
    title: 'CGM 사용 경험 공유',
    description: 'CGM 기기 사용 경험과 노하우를 공유하는 포럼입니다.',
    status: 'open',
    allowedRoles: ['pharmacy', 'operator'],
    creatorId: 'u1',
    creatorName: '관리자',
    postCount: 45,
    memberCount: 128,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-20',
  },
  {
    id: 'forum2',
    title: '혈당관리 상담 사례',
    description: '약국에서의 혈당관리 상담 사례를 공유합니다.',
    status: 'open',
    allowedRoles: ['pharmacy', 'operator'],
    creatorId: 'u2',
    creatorName: '김약사',
    postCount: 32,
    memberCount: 89,
    createdAt: '2024-01-05',
    updatedAt: '2024-01-19',
  },
  {
    id: 'forum3',
    title: '공지사항',
    description: 'GlycoPharm 플랫폼 공지사항입니다.',
    status: 'readonly',
    allowedRoles: ['operator'],
    creatorId: 'u1',
    creatorName: '관리자',
    postCount: 12,
    memberCount: 500,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-20',
  },
  {
    id: 'forum4',
    title: '2023년 당뇨 케어 캠페인',
    description: '2023년 당뇨 케어 캠페인 관련 아카이브입니다.',
    status: 'closed',
    allowedRoles: ['pharmacy', 'operator'],
    creatorId: 'u1',
    creatorName: '관리자',
    postCount: 67,
    memberCount: 234,
    createdAt: '2023-06-01',
    updatedAt: '2023-12-31',
  },
];

type TabType = 'applications' | 'forums';

export default function OperatorForumManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [applications, setApplications] = useState(mockApplications);
  const [forums, setForums] = useState(mockForums);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [rejectModal, setRejectModal] = useState<{ app: ForumApplication } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  const getStatusBadge = (status: ForumStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Open
          </span>
        );
      case 'readonly':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Lock className="w-3 h-3" />
            읽기전용
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            <Archive className="w-3 h-3" />
            아카이브
          </span>
        );
    }
  };

  const getAppStatusBadge = (status: ForumApplicationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            대기중
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            승인됨
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            반려됨
          </span>
        );
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'pharmacy': return '약국';
      case 'supplier': return '공급자';
      case 'operator': return '운영자';
      default: return role;
    }
  };

  const handleApprove = (appId: string) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, status: 'approved' as ForumApplicationStatus, reviewedAt: new Date().toISOString() } : a
      )
    );
    // TODO: 실제로 포럼 생성 API 호출
    alert('포럼 신청이 승인되었습니다. 새 포럼이 생성됩니다.');
  };

  const handleReject = () => {
    if (!rejectModal || !rejectReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    setApplications((prev) =>
      prev.map((a) =>
        a.id === rejectModal.app.id
          ? { ...a, status: 'rejected' as ForumApplicationStatus, rejectionReason: rejectReason, reviewedAt: new Date().toISOString() }
          : a
      )
    );
    setRejectModal(null);
    setRejectReason('');
    alert('포럼 신청이 반려되었습니다.');
  };

  const handleStatusChange = (forumId: string, newStatus: ForumStatus) => {
    setForums((prev) =>
      prev.map((f) =>
        f.id === forumId ? { ...f, status: newStatus, updatedAt: new Date().toISOString() } : f
      )
    );
    setSelectedForum(null);
    alert(`포럼 상태가 ${newStatus === 'open' ? 'Open' : newStatus === 'readonly' ? '읽기전용' : '아카이브'}으로 변경되었습니다.`);
  };

  const filteredApplications = applications.filter((app) =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.applicantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredForums = forums.filter((forum) =>
    forum.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">포럼 관리</h1>
        <p className="text-slate-500">포럼 신청 처리 및 상태 관리</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'applications'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          신청 관리
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('forums')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'forums'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          포럼 목록
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'applications' ? '신청 검색...' : '포럼 검색...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <div key={app.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getAppStatusBadge(app.status)}
                    <span className="text-xs text-slate-400">{app.createdAt}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{app.title}</h3>
                  <p className="text-sm text-slate-500">{app.description}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <p><span className="font-medium text-slate-700">신청자:</span> {app.applicantName}</p>
                <p><span className="font-medium text-slate-700">목적:</span> {app.purpose}</p>
                <p>
                  <span className="font-medium text-slate-700">참여 대상:</span>{' '}
                  {app.targetRoles.map(getRoleLabel).join(', ')}
                </p>
                <p>
                  <span className="font-medium text-slate-700">작성 권한:</span>{' '}
                  {app.allowedWriteRoles.map(getRoleLabel).join(', ')}
                </p>
                {app.note && (
                  <p><span className="font-medium text-slate-700">비고:</span> {app.note}</p>
                )}
              </div>

              {app.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleApprove(app.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    승인
                  </button>
                  <button
                    onClick={() => setRejectModal({ app })}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    반려
                  </button>
                </div>
              )}

              {app.status === 'rejected' && app.rejectionReason && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">반려 사유:</span> {app.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          ))}

          {filteredApplications.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">신청이 없습니다</h3>
              <p className="text-slate-500">처리할 포럼 신청이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Forums Tab */}
      {activeTab === 'forums' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">포럼명</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">상태</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">게시글</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden lg:table-cell">멤버</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredForums.map((forum) => (
                <tr key={forum.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-slate-800">{forum.title}</p>
                      <p className="text-sm text-slate-500 md:hidden">{getStatusBadge(forum.status)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {getStatusBadge(forum.status)}
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <MessageSquare className="w-4 h-4" />
                      {forum.postCount}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Users className="w-4 h-4" />
                      {forum.memberCount}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => setSelectedForum(forum)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">신청 반려</h3>
            <p className="text-slate-600 mb-4">
              <strong>{rejectModal.app.title}</strong> 신청을 반려합니다.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
              >
                반려하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forum Settings Modal */}
      {selectedForum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">포럼 설정</h3>
              <button
                onClick={() => setSelectedForum(null)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="font-medium text-slate-800 mb-1">{selectedForum.title}</p>
              <p className="text-sm text-slate-500">{selectedForum.description}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">상태 변경</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStatusChange(selectedForum.id, 'open')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                    selectedForum.status === 'open'
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-green-300'
                  }`}
                >
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-medium">Open</span>
                </button>
                <button
                  onClick={() => handleStatusChange(selectedForum.id, 'readonly')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                    selectedForum.status === 'readonly'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <Lock className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-medium">읽기전용</span>
                </button>
                <button
                  onClick={() => handleStatusChange(selectedForum.id, 'closed')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                    selectedForum.status === 'closed'
                      ? 'border-slate-500 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <Archive className="w-5 h-5 text-slate-600" />
                  <span className="text-xs font-medium">아카이브</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setSelectedForum(null)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
