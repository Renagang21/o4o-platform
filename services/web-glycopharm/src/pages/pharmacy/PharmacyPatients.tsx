import { useState } from 'react';
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  Calendar,
  Activity,
  MoreVertical,
} from 'lucide-react';

// Mock customers
const mockCustomers = [
  {
    id: '1',
    name: '김철수',
    phone: '010-1234-5678',
    email: 'chulsoo@email.com',
    diabetesType: 'type2',
    lastVisit: '2024-01-15',
    totalOrders: 12,
    totalSpent: 1250000,
    status: 'active',
  },
  {
    id: '2',
    name: '이영희',
    phone: '010-2345-6789',
    email: 'younghee@email.com',
    diabetesType: 'type1',
    lastVisit: '2024-01-14',
    totalOrders: 8,
    totalSpent: 890000,
    status: 'active',
  },
  {
    id: '3',
    name: '박민수',
    phone: '010-3456-7890',
    email: 'minsu@email.com',
    diabetesType: 'prediabetes',
    lastVisit: '2024-01-10',
    totalOrders: 3,
    totalSpent: 180000,
    status: 'inactive',
  },
  {
    id: '4',
    name: '정수진',
    phone: '010-4567-8901',
    email: 'sujin@email.com',
    diabetesType: 'type2',
    lastVisit: '2024-01-12',
    totalOrders: 15,
    totalSpent: 2100000,
    status: 'active',
  },
  {
    id: '5',
    name: '최동현',
    phone: '010-5678-9012',
    email: 'donghyun@email.com',
    diabetesType: 'gestational',
    lastVisit: '2024-01-08',
    totalOrders: 5,
    totalSpent: 450000,
    status: 'active',
  },
];

const diabetesLabels: Record<string, string> = {
  type1: '제1형 당뇨',
  type2: '제2형 당뇨',
  gestational: '임신성 당뇨',
  prediabetes: '당뇨 전단계',
};

export default function PharmacyPatients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const filteredCustomers = mockCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const customer = selectedCustomer
    ? mockCustomers.find((c) => c.id === selectedCustomer)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">고객 관리</h1>
          <p className="text-slate-500 text-sm">총 {mockCustomers.length}명의 고객</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25">
          <Plus className="w-5 h-5" />
          고객 등록
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 연락처, 이메일로 검색..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          {/* Customers */}
          <div className="space-y-3">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCustomer(c.id)}
                className={`bg-white rounded-2xl p-4 cursor-pointer transition-all ${
                  selectedCustomer === c.id
                    ? 'ring-2 ring-primary-500 shadow-md'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-white font-semibold">{c.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{c.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            c.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {c.status === 'active' ? '활성' : '비활성'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800">
                      {c.totalSpent.toLocaleString()}원
                    </p>
                    <p className="text-xs text-slate-400">{c.totalOrders}회 구매</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl">
              <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">고객이 없습니다</h3>
              <p className="text-slate-500">검색 조건에 맞는 고객이 없습니다.</p>
            </div>
          )}
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-1">
          {customer ? (
            <div className="bg-white rounded-2xl shadow-sm sticky top-6">
              <div className="p-5 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">고객 상세</h2>
                  <button className="p-1 hover:bg-slate-100 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {/* Profile */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-white">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{customer.name}</h3>
                  <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full mt-2">
                    {diabetesLabels[customer.diabetesType]}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-700">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      마지막 방문: {customer.lastVisit}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 bg-primary-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-primary-700">
                      {customer.totalOrders}
                    </p>
                    <p className="text-xs text-primary-600">총 주문</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-lg font-bold text-green-700">
                      {(customer.totalSpent / 10000).toFixed(0)}만원
                    </p>
                    <p className="text-xs text-green-600">총 구매액</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
                    주문 내역 보기
                  </button>
                  <button className="w-full py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                    메모 작성
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                고객을 선택하면 상세 정보를 볼 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
