/**
 * SettingsPage - K-Cosmetics 설정
 */

import { useState } from 'react';

export default function SettingsPage() {
  const [platformName, setPlatformName] = useState('K-Cosmetics');
  const [commissionRate, setCommissionRate] = useState('10');
  const [minOrderAmount, setMinOrderAmount] = useState('50000');
  const [settlementDay, setSettlementDay] = useState('5');
  const [notifications, setNotifications] = useState({
    newOrder: true,
    newStore: true,
    lowStock: true,
    settlement: true,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">설정</h1>
        <p className="text-slate-500 mt-1">플랫폼 운영 설정을 관리합니다</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">기본 설정</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              플랫폼명
            </label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>
      </div>

      {/* Commission Settings */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">수수료 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              기본 수수료율 (%)
            </label>
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <p className="text-sm text-slate-500 mt-1">매장 매출에 대한 기본 수수료율</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              최소 주문 금액 (원)
            </label>
            <input
              type="number"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <p className="text-sm text-slate-500 mt-1">B2B 주문 최소 금액</p>
          </div>
        </div>
      </div>

      {/* Settlement Settings */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">정산 설정</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            정산일
          </label>
          <select
            value={settlementDay}
            onChange={(e) => setSettlementDay(e.target.value)}
            className="w-full md:w-1/4 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="5">매월 5일</option>
            <option value="10">매월 10일</option>
            <option value="15">매월 15일</option>
            <option value="20">매월 20일</option>
            <option value="25">매월 25일</option>
          </select>
          <p className="text-sm text-slate-500 mt-1">매장 정산금 지급일</p>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">알림 설정</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.newOrder}
              onChange={(e) => setNotifications({ ...notifications, newOrder: e.target.checked })}
              className="w-5 h-5 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
            />
            <div>
              <p className="font-medium text-slate-800">새 주문 알림</p>
              <p className="text-sm text-slate-500">새로운 주문이 접수되면 알림</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.newStore}
              onChange={(e) => setNotifications({ ...notifications, newStore: e.target.checked })}
              className="w-5 h-5 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
            />
            <div>
              <p className="font-medium text-slate-800">신규 매장 알림</p>
              <p className="text-sm text-slate-500">새로운 매장 입점 신청시 알림</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.lowStock}
              onChange={(e) => setNotifications({ ...notifications, lowStock: e.target.checked })}
              className="w-5 h-5 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
            />
            <div>
              <p className="font-medium text-slate-800">재고 부족 알림</p>
              <p className="text-sm text-slate-500">상품 재고가 안전 재고 이하일 때 알림</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.settlement}
              onChange={(e) => setNotifications({ ...notifications, settlement: e.target.checked })}
              className="w-5 h-5 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
            />
            <div>
              <p className="font-medium text-slate-800">정산 알림</p>
              <p className="text-sm text-slate-500">정산 처리 완료시 알림</p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
          설정 저장
        </button>
      </div>
    </div>
  );
}
