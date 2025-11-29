/**
 * Forum Neture Admin UI (Placeholder)
 *
 * This is a placeholder component for the Neture cosmetics forum extension.
 * Future implementation will include:
 * - Skin type filtering
 * - Routine builder interface
 * - Product integration
 * - Beauty-focused post management
 */

import React from 'react';

export default function ForumNetureApp() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Forum Neture Extension</h1>
      <p>화장품 매장 특화 포럼 (Placeholder)</p>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #8B7355', borderRadius: '8px' }}>
        <h2>Features (향후 구현 예정)</h2>
        <ul>
          <li>피부 타입별 게시글 필터링</li>
          <li>루틴 빌더 인터페이스</li>
          <li>제품 연동 및 추천</li>
          <li>화장품 특화 카테고리 관리</li>
        </ul>
      </div>

      <div style={{ marginTop: '1rem', color: '#666' }}>
        <p>
          이 화면은 <strong>forum-core</strong>를 확장하는{' '}
          <strong>forum-neture</strong> extension 앱입니다.
        </p>
      </div>
    </div>
  );
}
