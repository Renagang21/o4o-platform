import React from 'react';
import { BlockEditorPoC } from '@/components/block-editor/BlockEditorPoC';
import { AdminLayout } from '@/components/AdminLayout';

/**
 * 블록 에디터 백엔드 연동 테스트 페이지
 */
export const BlockEditorTest: React.FC = () => {
  return (
    <AdminLayout>
      <BlockEditorPoC />
    </AdminLayout>
  );
};