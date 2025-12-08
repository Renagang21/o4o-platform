/**
 * Cosmetics Forum Stats Page
 * 화장품 포럼 통계
 */

import React from 'react';

export const CosmeticsForumStats: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">포럼 통계</h1>
        <p className="text-gray-600">화장품 포럼 활동 분석</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skin Type Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">피부타입별 게시글</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">건성</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">지성</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">복합성</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">민감성</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </div>

        {/* Popular Concerns */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">인기 피부고민</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">여드름</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">주름</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">미백</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">모공</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">활동 요약</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-pink-600">0</p>
              <p className="text-sm text-gray-600">이번 주 게시글</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600">이번 주 댓글</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">활성 사용자</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">제품 언급</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CosmeticsForumStats;
