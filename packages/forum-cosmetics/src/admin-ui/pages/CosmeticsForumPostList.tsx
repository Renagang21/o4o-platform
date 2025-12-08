/**
 * Cosmetics Forum Post List Page
 * 화장품 포럼 게시글 목록
 */

import React from 'react';

export const CosmeticsForumPostList: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">게시글 관리</h1>
        <p className="text-gray-600">화장품 포럼 게시글 목록</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <select className="border border-gray-300 rounded px-3 py-2">
                <option value="">전체 카테고리</option>
                <option value="reviews">사용후기</option>
                <option value="qna">질문답변</option>
              </select>
              <select className="border border-gray-300 rounded px-3 py-2">
                <option value="">전체 피부타입</option>
                <option value="dry">건성</option>
                <option value="oily">지성</option>
                <option value="combination">복합성</option>
                <option value="sensitive">민감성</option>
              </select>
            </div>
            <button className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700">
              새 게시글
            </button>
          </div>
        </div>

        <div className="text-center text-gray-500 py-12">
          <p>게시글이 없습니다.</p>
        </div>
      </div>
    </div>
  );
};

export default CosmeticsForumPostList;
