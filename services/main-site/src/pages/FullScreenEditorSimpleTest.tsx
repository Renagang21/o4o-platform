import React from 'react';
import { FullScreenEditor } from '@o4o/ui/editor/fullscreen';

export function FullScreenEditorSimpleTest() {
  const handleSave = async (content: string) => {
    console.log('저장된 콘텐츠:', content);
    // 실제 저장 로직
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('저장 완료!');
        resolve(void 0);
      }, 1000);
    });
  };

  const handlePreview = () => {
    console.log('미리보기 열기');
    // 미리보기 모달 또는 새 탭 열기
    window.open('/preview', '_blank');
  };

  return (
    <FullScreenEditor
      pageId="test-page"
      initialContent="<p>여기에 초기 콘텐츠를 입력하세요...</p><h2>WordPress Gutenberg 스타일 풀스크린 에디터</h2><p>이 에디터는 완전한 WordPress Gutenberg 경험을 제공합니다:</p><ul><li>왼쪽 사이드바: 블록 삽입기</li><li>중앙: Tiptap 에디터 캔버스</li><li>오른쪽 사이드바: 설정 패널</li></ul>"
      onSave={handleSave}
      onPreview={handlePreview}
    />
  );
}