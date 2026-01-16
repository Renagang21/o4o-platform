/**
 * SupportPage - K-Cosmetics 고객지원
 */

import { useState } from 'react';

const tickets = [
  { id: 'TK-2024-001', store: '뷰티랩 강남점', subject: '배송 지연 문의', category: '배송', status: '처리중', priority: '높음', createdAt: '2024-01-15 14:30', assignee: '김상담' },
  { id: 'TK-2024-002', store: '코스메틱 홍대점', subject: '결제 오류 발생', category: '결제', status: '대기중', priority: '긴급', createdAt: '2024-01-15 13:45', assignee: '-' },
  { id: 'TK-2024-003', store: '스킨케어 명동점', subject: '상품 교환 요청', category: '교환/반품', status: '완료', priority: '보통', createdAt: '2024-01-15 11:20', assignee: '이상담' },
  { id: 'TK-2024-004', store: '메이크업 신촌점', subject: '재고 수량 오류', category: '재고', status: '처리중', priority: '보통', createdAt: '2024-01-15 10:15', assignee: '박상담' },
  { id: 'TK-2024-005', store: '뷰티스타 압구정점', subject: '정산 내역 확인', category: '정산', status: '완료', priority: '낮음', createdAt: '2024-01-14 16:30', assignee: '최상담' },
];

const statusColors: Record<string, string> = {
  '대기중': 'bg-gray-100 text-gray-700',
  '처리중': 'bg-blue-100 text-blue-700',
  '완료': 'bg-green-100 text-green-700',
  '보류': 'bg-yellow-100 text-yellow-700',
};

const priorityColors: Record<string, string> = {
  '긴급': 'bg-red-100 text-red-700',
  '높음': 'bg-orange-100 text-orange-700',
  '보통': 'bg-blue-100 text-blue-700',
  '낮음': 'bg-gray-100 text-gray-700',
};

const categoryColors: Record<string, string> = {
  '배송': 'bg-indigo-100 text-indigo-700',
  '결제': 'bg-purple-100 text-purple-700',
  '교환/반품': 'bg-pink-100 text-pink-700',
  '재고': 'bg-teal-100 text-teal-700',
  '정산': 'bg-cyan-100 text-cyan-700',
};

export default function SupportPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const statuses = ['all', '대기중', '처리중', '완료'];

  const filteredTickets = tickets.filter(ticket =>
    statusFilter === 'all' || ticket.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">고객지원</h1>
          <p className="text-slate-500 mt-1">문의 및 요청사항을 관리합니다</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체 문의</p>
          <p className="text-2xl font-bold text-slate-800">{tickets.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">대기중</p>
          <p className="text-2xl font-bold text-gray-600">{tickets.filter(t => t.status === '대기중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">처리중</p>
          <p className="text-2xl font-bold text-blue-600">{tickets.filter(t => t.status === '처리중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">긴급 문의</p>
          <p className="text-2xl font-bold text-red-600">{tickets.filter(t => t.priority === '긴급').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? '전체' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">티켓번호</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">매장</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">제목</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">분류</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">우선순위</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">담당자</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">등록일시</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-pink-600">{ticket.id}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{ticket.store}</td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{ticket.subject}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[ticket.category]}`}>
                    {ticket.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{ticket.assignee}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{ticket.createdAt}</td>
                <td className="px-6 py-4 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-sm">
                    상세
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
