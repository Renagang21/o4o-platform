/**
 * Yaksa Community Feed Page
 * 커뮤니티 피드 페이지
 */

import React from 'react';
import { useParams } from 'react-router-dom';

export const YaksaCommunityFeed: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">커뮤니티 피드</h1>
        <p className="text-gray-600">Community ID: {id}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <p>커뮤니티 피드 기능은 곧 제공될 예정입니다.</p>
          <p className="text-sm mt-2">Community Feed - Coming Soon</p>
        </div>
      </div>
    </div>
  );
};

export default YaksaCommunityFeed;
