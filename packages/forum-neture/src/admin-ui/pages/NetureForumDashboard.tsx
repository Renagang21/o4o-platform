/**
 * Neture Forum Dashboard Page
 * Neture 화장품 포럼 대시보드
 */

import React from 'react';

export const NetureForumDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Neture 화장품 포럼</h1>
        <p className="text-gray-600">화장품 관련 토론 및 정보 공유</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">총 게시글</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">활성 사용자</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">오늘의 댓글</h3>
          <p className="text-3xl font-bold text-purple-600">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 게시글</h2>
        <div className="text-center text-gray-500 py-8">
          <p>게시글이 없습니다.</p>
          <p className="text-sm mt-2">No posts available</p>
        </div>
      </div>
    </div>
  );
};

export default NetureForumDashboard;
