import React, { useState } from 'react';
import { useAdminNotificationStore } from '../../store/adminNotificationStore';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useNavigate } from 'react-router-dom';

const typeOptions = [
  { value: 'all', label: '전체' },
  { value: 'order', label: '주문' },
  { value: 'user', label: '회원' },
  { value: 'status', label: '상태' },
  { value: 'error', label: '오류' },
];
const readOptions = [
  { value: 'all', label: '전체' },
  { value: 'read', label: '읽음' },
  { value: 'unread', label: '안읽음' },
];

const AdminNotifications: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, removeNotification } = useAdminNotificationStore();
  const { admin } = useAdminAuthStore();
  const navigate = useNavigate();
  const [type, setType] = useState('all');
  const [read, setRead] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = notifications.filter(n =>
    (type === 'all' || n.type === type) &&
    (read === 'all' || (read === 'read' ? n.read : !n.read)) &&
    (n.message.includes(search) || (n.link || '').includes(search))
  );

  const handleRowClick = (n: typeof notifications[0]) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">알림 내역</h1>
      <div className="flex gap-4 mb-4 flex-wrap">
        <select value={type} onChange={e => setType(e.target.value)} className="border rounded px-3 py-2">
          {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select value={read} onChange={e => setRead(e.target.value)} className="border rounded px-3 py-2">
          {readOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="메시지/링크 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-64"
        />
        <button className="btn btn-sm btn-outline ml-auto" onClick={markAllAsRead}>모두 읽음</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">수신 시간</th>
              <th className="px-4 py-2 border-b">종류</th>
              <th className="px-4 py-2 border-b">메시지</th>
              <th className="px-4 py-2 border-b">읽음</th>
              <th className="px-4 py-2 border-b">링크</th>
              {admin?.role === 'superadmin' && <th className="px-4 py-2 border-b">삭제</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(n => (
              <tr
                key={n.id}
                className={`cursor-pointer ${!n.read ? 'bg-blue-50' : ''} hover:bg-gray-50`}
                onClick={() => handleRowClick(n)}
              >
                <td className="px-4 py-2 border-b whitespace-nowrap">{n.createdAt.replace('T', ' ').slice(0, 19)}</td>
                <td className="px-4 py-2 border-b">{n.type}</td>
                <td className="px-4 py-2 border-b">{n.message}</td>
                <td className="px-4 py-2 border-b">{n.read ? '읽음' : '안읽음'}</td>
                <td className="px-4 py-2 border-b">{n.link ? <span className="text-blue-600 underline">이동</span> : '-'}</td>
                {admin?.role === 'superadmin' && (
                  <td className="px-4 py-2 border-b">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={e => { e.stopPropagation(); removeNotification(n.id); }}
                    >
                      삭제
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminNotifications; 