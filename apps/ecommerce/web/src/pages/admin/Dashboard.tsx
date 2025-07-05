import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useAdminLiveStatsStore } from '../../store/adminLiveStatsStore';

const Dashboard: React.FC = () => {
  const {
    sales,
    orders,
    signups,
    orderData,
    salesData,
    signupData,
    topProducts,
    updateLiveStats,
  } = useAdminLiveStatsStore();

  // Highlight animation state
  const [highlight, setHighlight] = useState({ sales: false, orders: false, signups: false });
  const prev = useRef({ sales, orders, signups });

  useEffect(() => {
    const interval = setInterval(() => {
      updateLiveStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [updateLiveStats]);

  useEffect(() => {
    if (prev.current.sales !== sales) {
      setHighlight((h) => ({ ...h, sales: true }));
      setTimeout(() => setHighlight((h) => ({ ...h, sales: false })), 800);
    }
    if (prev.current.orders !== orders) {
      setHighlight((h) => ({ ...h, orders: true }));
      setTimeout(() => setHighlight((h) => ({ ...h, orders: false })), 800);
    }
    if (prev.current.signups !== signups) {
      setHighlight((h) => ({ ...h, signups: true }));
      setTimeout(() => setHighlight((h) => ({ ...h, signups: false })), 800);
    }
    prev.current = { sales, orders, signups };
  }, [sales, orders, signups]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">관리자 대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`bg-white rounded shadow p-6 flex flex-col items-center transition ${highlight.sales ? 'ring-4 ring-green-300' : ''}`}>
          <div className="text-lg font-semibold mb-2">총 매출</div>
          <div className="text-2xl font-bold text-blue-700">₩{sales.toLocaleString()}</div>
        </div>
        <div className={`bg-white rounded shadow p-6 flex flex-col items-center transition ${highlight.orders ? 'ring-4 ring-blue-300' : ''}`}>
          <div className="text-lg font-semibold mb-2">총 주문 수</div>
          <div className="text-2xl font-bold text-blue-700">{orders}</div>
        </div>
        <div className={`bg-white rounded shadow p-6 flex flex-col items-center transition ${highlight.signups ? 'ring-4 ring-purple-300' : ''}`}>
          <div className="text-lg font-semibold mb-2">신규 가입자 수</div>
          <div className="text-2xl font-bold text-blue-700">{signups}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded shadow p-6">
          <div className="font-bold mb-2">최근 7일 주문 수</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={orderData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded shadow p-6">
          <div className="font-bold mb-2">최근 7일 매출 추이</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v: number) => `₩${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="sales" stroke="#059669" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded shadow p-6">
          <div className="font-bold mb-2">최근 7일 회원 가입 추이</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={signupData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="signups" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded shadow p-6">
          <div className="font-bold mb-2">인기 상품 Top 5</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="sales" fill="#f59e42" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 