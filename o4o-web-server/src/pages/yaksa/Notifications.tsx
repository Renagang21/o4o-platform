import React, { useState } from 'react';
import YaksaProtectedRoute from '../../components/YaksaProtectedRoute';

interface Notification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: 'n1', message: '신규 주문이 접수되었습니다.', date: '2024-06-01', read: false },
  { id: 'n2', message: '펀딩 목표 달성!', date: '2024-05-30', read: false },
  { id: 'n3', message: '배송이 시작되었습니다.', date: '2024-05-29', read: true },
  { id: 'n4', message: '이벤트 안내', date: '2024-05-28', read: true },
  { id: 'n5', message: '비밀번호가 변경되었습니다.', date: '2024-05-27', read: false },
];

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const markAsRead = (id: string) => {
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, read: true } : notif));
  };
  const markAllAsRead = () => {
    setNotifications(n => n.map(notif => ({ ...notif, read: true })));
  };

  return (
    <YaksaProtectedRoute>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">알림 센터</h1>
        <div className="flex justify-end mb-2">
          <button onClick={markAllAsRead} className="btn btn-sm btn-outline">모두 읽음 처리</button>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl divide-y">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400">알림이 없습니다.</div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-center justify-between p-4 cursor-pointer ${n.read ? 'bg-gray-50 dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-900'}`}
              onClick={() => markAsRead(n.id)}
            >
              <div>
                <div className={`font-semibold ${n.read ? 'text-gray-600' : 'text-blue-700'}`}>{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">{n.date}</div>
              </div>
              {!n.read && <span className="ml-2 px-2 py-1 text-xs rounded bg-blue-500 text-white">NEW</span>}
            </div>
          ))}
        </div>
      </div>
    </YaksaProtectedRoute>
  );
};

export default Notifications; 