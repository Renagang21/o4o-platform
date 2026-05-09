/**
 * OrdersPage - K-Cosmetics 주문 관리
 *
 * WO-O4O-KCOS-ORDERS-DATATABLE-CANONICAL-ALIGN-V1:
 *   raw <table> → @o4o/operator-ux-core DataTable canonical 정렬.
 *   mock data, status filter, stats cards, 도메인 워크플로 변경 없음.
 */

import { useState } from 'react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

interface OrderRow {
  id: string;
  store: string;
  items: number;
  total: string;
  status: string;
  date: string;
}

const orders: OrderRow[] = [
  { id: 'ORD-2024-001', store: '뷰티랩 강남점', items: 5, total: '₩1,250,000', status: '배송중', date: '2024-01-15 14:30' },
  { id: 'ORD-2024-002', store: '코스메틱 홍대점', items: 3, total: '₩890,000', status: '준비중', date: '2024-01-15 13:45' },
  { id: 'ORD-2024-003', store: '스킨케어 명동점', items: 8, total: '₩2,100,000', status: '완료', date: '2024-01-15 11:20' },
  { id: 'ORD-2024-004', store: '메이크업 신촌점', items: 2, total: '₩560,000', status: '배송중', date: '2024-01-15 10:15' },
  { id: 'ORD-2024-005', store: '뷰티스타 압구정점', items: 12, total: '₩3,400,000', status: '결제대기', date: '2024-01-15 09:30' },
];

const statusColors: Record<string, string> = {
  '결제대기': 'bg-gray-100 text-gray-700',
  '준비중': 'bg-yellow-100 text-yellow-700',
  '배송중': 'bg-blue-100 text-blue-700',
  '완료': 'bg-green-100 text-green-700',
  '취소': 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const statuses = ['all', '결제대기', '준비중', '배송중', '완료'];

  const filteredOrders = orders.filter(order =>
    statusFilter === 'all' || order.status === statusFilter
  );

  const columns: ListColumnDef<OrderRow>[] = [
    {
      key: 'id',
      header: '주문번호',
      sortable: true,
      render: (_v, o) => <span className="font-medium text-pink-600">{o.id}</span>,
    },
    {
      key: 'store',
      header: '매장',
      sortable: true,
      render: (_v, o) => <span className="text-slate-800">{o.store}</span>,
    },
    {
      key: 'items',
      header: '상품수',
      align: 'right',
      sortable: true,
      sortAccessor: (o) => o.items,
      render: (_v, o) => <span className="text-slate-600">{o.items}개</span>,
    },
    {
      key: 'total',
      header: '금액',
      align: 'right',
      render: (_v, o) => <span className="font-medium text-slate-800">{o.total}</span>,
    },
    {
      key: 'status',
      header: '상태',
      render: (_v, o) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-gray-100 text-gray-700'}`}>
          {o.status}
        </span>
      ),
    },
    {
      key: 'date',
      header: '주문일시',
      sortable: true,
      sortAccessor: (o) => new Date(o.date.replace(' ', 'T')).getTime(),
      render: (_v, o) => <span className="text-sm text-slate-500">{o.date}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">주문 관리</h1>
          <p className="text-slate-500 mt-1">B2B 주문 현황을 관리합니다</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체</p>
          <p className="text-2xl font-bold text-slate-800">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">결제대기</p>
          <p className="text-2xl font-bold text-gray-600">{orders.filter(o => o.status === '결제대기').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">준비중</p>
          <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === '준비중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">배송중</p>
          <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === '배송중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">완료</p>
          <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === '완료').length}</p>
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

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <DataTable<OrderRow>
          columns={columns}
          data={filteredOrders}
          rowKey="id"
          emptyMessage={statusFilter === 'all' ? '주문이 없습니다.' : '조건에 맞는 주문이 없습니다.'}
          tableId="kcosmetics-operator-orders"
        />
      </div>
    </div>
  );
}
