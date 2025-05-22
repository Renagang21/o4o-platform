import React from 'react';
import YaksaProtectedRoute from '../../components/YaksaProtectedRoute';
import { Link } from 'react-router-dom';

const mockOrders = [
  { id: 'o1', item: '해열제', date: '2024-06-01', status: '배송중' },
  { id: 'o2', item: '비타민C', date: '2024-05-28', status: '완료' },
  { id: 'o3', item: '마스크', date: '2024-05-25', status: '완료' },
];
const mockFundings = [
  { id: 'f1', title: '지역아동센터 지원', amount: 50000 },
  { id: 'f2', title: '의약품 나눔', amount: 30000 },
  { id: 'f3', title: '약국 환경개선', amount: 20000 },
];
const mockNotifications = [
  { id: 'n1', message: '신규 주문이 접수되었습니다.', date: '2024-06-01' },
  { id: 'n2', message: '펀딩 목표 달성!', date: '2024-05-30' },
  { id: 'n3', message: '배송이 시작되었습니다.', date: '2024-05-29' },
  { id: 'n4', message: '이벤트 안내', date: '2024-05-28' },
  { id: 'n5', message: '비밀번호가 변경되었습니다.', date: '2024-05-27' },
];

const Dashboard: React.FC = () => (
  <YaksaProtectedRoute>
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">약사 대시보드</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">최근 주문</h2>
          <ul className="space-y-2">
            {mockOrders.map(o => (
              <li key={o.id} className="flex justify-between text-sm border-b pb-1 last:border-b-0">
                <span>{o.item}</span>
                <span className="text-gray-500">{o.date}</span>
                <span className="text-blue-600">{o.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">참여 중인 펀딩</h2>
          <ul className="space-y-2">
            {mockFundings.map(f => (
              <li key={f.id} className="flex justify-between text-sm border-b pb-1 last:border-b-0">
                <span>{f.title}</span>
                <span className="text-green-600 font-semibold">{f.amount.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">최신 알림</h2>
          <ul className="space-y-2">
            {mockNotifications.map(n => (
              <li key={n.id} className="flex justify-between text-sm border-b pb-1 last:border-b-0">
                <span>{n.message}</span>
                <span className="text-gray-500">{n.date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex justify-end">
        <Link to="/yaksa/profile" className="btn btn-primary">내 정보로 이동</Link>
      </div>
    </div>
  </YaksaProtectedRoute>
);

export default Dashboard; 