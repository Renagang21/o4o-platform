/**
 * Operator Support Page (Customer Support Management)
 *
 * 세미-프랜차이즈 고객지원 관리
 * - 문의/티켓 관리
 * - FAQ 관리
 * - 공지사항 관리
 */

import { useState } from 'react';
import {
  HelpCircle,
  Search,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Store,
  Calendar,
  Reply,
  Eye,
  Tag,
  BookOpen,
  Bell,
} from 'lucide-react';

// Types
interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  pharmacyName: string;
  contactName: string;
  status: 'open' | 'inProgress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  lastReplyAt: string;
  replyCount: number;
}

type TabType = 'tickets' | 'faq' | 'notices';

// Sample data
const sampleTickets: Ticket[] = [
  {
    id: '1',
    ticketNumber: 'TK-2025-001234',
    subject: '주문 배송 지연 문의',
    category: '배송',
    pharmacyName: '건강한약국',
    contactName: '김약사',
    status: 'open',
    priority: 'high',
    createdAt: '2025-01-16T09:30:00',
    lastReplyAt: '2025-01-16T09:30:00',
    replyCount: 0,
  },
  {
    id: '2',
    ticketNumber: 'TK-2025-001233',
    subject: '정산 내역 확인 요청',
    category: '정산',
    pharmacyName: '행복약국',
    contactName: '이약사',
    status: 'inProgress',
    priority: 'medium',
    createdAt: '2025-01-15T16:20:00',
    lastReplyAt: '2025-01-16T10:15:00',
    replyCount: 2,
  },
  {
    id: '3',
    ticketNumber: 'TK-2025-001232',
    subject: '상품 불량 신고',
    category: '상품',
    pharmacyName: '사랑약국',
    contactName: '박약사',
    status: 'waiting',
    priority: 'urgent',
    createdAt: '2025-01-15T11:45:00',
    lastReplyAt: '2025-01-15T14:30:00',
    replyCount: 3,
  },
  {
    id: '4',
    ticketNumber: 'TK-2025-001231',
    subject: '회원 정보 수정 요청',
    category: '계정',
    pharmacyName: '미래약국',
    contactName: '최약사',
    status: 'resolved',
    priority: 'low',
    createdAt: '2025-01-14T10:00:00',
    lastReplyAt: '2025-01-15T09:00:00',
    replyCount: 4,
  },
  {
    id: '5',
    ticketNumber: 'TK-2025-001230',
    subject: '신규 상품 입점 문의',
    category: '기타',
    pharmacyName: '청춘약국',
    contactName: '정약사',
    status: 'closed',
    priority: 'low',
    createdAt: '2025-01-13T15:30:00',
    lastReplyAt: '2025-01-14T11:20:00',
    replyCount: 5,
  },
];

// Stats
const supportStats = {
  openTickets: 15,
  inProgressTickets: 8,
  avgResponseTime: '2.5시간',
  resolutionRate: 94.2,
  todayTickets: 12,
  satisfactionScore: 4.6,
};

// Status badge
function StatusBadge({ status }: { status: Ticket['status'] }) {
  const config = {
    open: { label: '신규', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    inProgress: { label: '처리중', color: 'bg-amber-100 text-amber-700', icon: Clock },
    waiting: { label: '대기', color: 'bg-purple-100 text-purple-700', icon: Clock },
    resolved: { label: '해결', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    closed: { label: '종료', color: 'bg-slate-100 text-slate-600', icon: CheckCircle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// Priority badge
function PriorityBadge({ priority }: { priority: Ticket['priority'] }) {
  const config = {
    low: { label: '낮음', color: 'text-slate-500' },
    medium: { label: '보통', color: 'text-blue-600' },
    high: { label: '높음', color: 'text-amber-600' },
    urgent: { label: '긴급', color: 'text-red-600' },
  };

  const { label, color } = config[priority];

  return (
    <span className={`text-xs font-medium ${color}`}>{label}</span>
  );
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter tickets
  const filteredTickets = sampleTickets.filter((ticket) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !ticket.ticketNumber.toLowerCase().includes(search) &&
        !ticket.subject.toLowerCase().includes(search) &&
        !ticket.pharmacyName.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">고객지원</h1>
          <p className="text-slate-500 text-sm">문의 관리 및 지원 서비스</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
          <Plus className="w-4 h-4" />
          공지사항 작성
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{supportStats.openTickets}</p>
              <p className="text-xs text-slate-500">미해결 티켓</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{supportStats.inProgressTickets}</p>
              <p className="text-xs text-slate-500">처리중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{supportStats.avgResponseTime}</p>
              <p className="text-xs text-slate-500">평균 응답시간</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{supportStats.resolutionRate}%</p>
              <p className="text-xs text-slate-500">해결률</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{supportStats.todayTickets}</p>
              <p className="text-xs text-slate-500">오늘 접수</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{supportStats.satisfactionScore}/5</p>
              <p className="text-xs text-slate-500">만족도</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tickets'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              문의 티켓
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                {supportStats.openTickets}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'faq'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              FAQ 관리
            </button>
            <button
              onClick={() => setActiveTab('notices')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'notices'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Bell className="w-4 h-4" />
              공지사항
            </button>
          </nav>
        </div>

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <>
            {/* Filters */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="티켓번호, 제목, 약국명 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="all">전체 상태</option>
                  <option value="open">신규</option>
                  <option value="inProgress">처리중</option>
                  <option value="waiting">대기</option>
                  <option value="resolved">해결</option>
                  <option value="closed">종료</option>
                </select>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      티켓
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      약국
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      우선순위
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      최근 활동
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      답변
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{ticket.subject}</p>
                          <p className="text-xs text-slate-500">{ticket.ticketNumber}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
                          <Tag className="w-3 h-3" />
                          {ticket.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-800">{ticket.pharmacyName}</p>
                            <p className="text-xs text-slate-500">{ticket.contactName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(ticket.lastReplyAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-medium text-slate-800">{ticket.replyCount}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <div className="relative">
                            <button
                              onClick={() => setSelectedTicket(selectedTicket === ticket.id ? null : ticket.id)}
                              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-400" />
                            </button>
                            {selectedTicket === ticket.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setSelectedTicket(null)}
                                />
                                <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-2 z-20">
                                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    상세 보기
                                  </button>
                                  <button className="w-full px-4 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2">
                                    <Reply className="w-4 h-4" />
                                    답변하기
                                  </button>
                                  {ticket.status !== 'closed' && (
                                    <button className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4" />
                                      해결 완료
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  총 {filteredTickets.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredTickets.length)}개 표시
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-primary-500 text-white'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="p-8 text-center text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-600 mb-2">FAQ 관리</p>
            <p className="text-sm">자주 묻는 질문 관리 기능이 여기에 표시됩니다.</p>
          </div>
        )}

        {/* Notices Tab */}
        {activeTab === 'notices' && (
          <div className="p-8 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-600 mb-2">공지사항 관리</p>
            <p className="text-sm">약국 네트워크 공지사항 관리 기능이 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
