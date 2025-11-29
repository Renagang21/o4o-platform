/**
 * Forum Yaksa Admin UI (Placeholder)
 *
 * This is a placeholder component for the Yaksa organization forum extension.
 * Future implementation will include:
 * - Drug database integration
 * - Case study sharing interface
 * - Medication guidance tools
 * - Pharmacy-focused post management
 */

import React from 'react';

export default function ForumYaksaApp() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Forum Yaksa Extension</h1>
      <p>약사 조직 특화 포럼 (Placeholder)</p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          border: '1px solid #1E40AF',
          borderRadius: '8px',
          backgroundColor: '#EFF6FF',
        }}
      >
        <h2>Features (향후 구현 예정)</h2>
        <ul>
          <li>약물 데이터베이스 연동</li>
          <li>케이스 스터디 공유 인터페이스</li>
          <li>복약지도 템플릿</li>
          <li>약사 전용 카테고리 관리</li>
          <li>게시글 승인 시스템</li>
        </ul>
      </div>

      <div style={{ marginTop: '1rem', color: '#666' }}>
        <p>
          이 화면은 <strong>forum-core</strong>를 확장하는{' '}
          <strong>forum-yaksa</strong> extension 앱입니다.
        </p>
      </div>
    </div>
  );
}
