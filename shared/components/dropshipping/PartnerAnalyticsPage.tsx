import React from 'react';

export const PartnerAnalyticsPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">파트너 분석</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">총 수수료</h3>
          <p className="text-3xl font-bold text-green-600">₩2,450,000</p>
          <p className="text-sm text-gray-500 mt-1">이번 달</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">추천 클릭</h3>
          <p className="text-3xl font-bold text-blue-600">1,284</p>
          <p className="text-sm text-gray-500 mt-1">지난 30일</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">전환율</h3>
          <p className="text-3xl font-bold text-purple-600">12.5%</p>
          <p className="text-sm text-gray-500 mt-1">평균 전환율</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">성과 차트</h3>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">차트가 여기에 표시됩니다 (개발 예정)</p>
        </div>
      </div>
    </div>
  );
};