import React, { useEffect } from 'react';
import { BlockEditor } from '@/components/block-editor/BlockEditor';
import { AdminLayout } from '@/components/AdminLayout';
import { initializeBlocks } from '@/lib/initialize-blocks';
import { Button } from '@/components/ui/button';
import { Save, Eye, FileText } from 'lucide-react';

/**
 * 구텐베르크 스타일 블록 에디터 데모 페이지
 */
export const BlockEditorDemo: React.FC = () => {
  // 컴포넌트 마운트 시 블록 레지스트리 초기화
  useEffect(() => {
    initializeBlocks();
  }, []);

  // 저장 핸들러
  const handleSave = (data: { blocks: any[] }) => {
    console.log('💾 Save triggered:', data);
    // TODO: 실제 API 호출로 교체
    alert(`저장되었습니다! 블록 ${data.blocks.length}개`);
  };

  // 미리보기 핸들러
  const handlePreview = () => {
    console.log('👀 Preview triggered');
    // TODO: 미리보기 모달 또는 새 탭으로 열기
    alert('미리보기 기능은 개발 중입니다.');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              구텐베르크 블록 에디터
            </h1>
            <p className="text-gray-600 mt-1">
              WordPress 구텐베르크와 동일한 블록 기반 콘텐츠 에디터입니다.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </Button>
            <Button onClick={() => handleSave({ blocks: [] })}>
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          </div>
        </div>

        {/* 기능 안내 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">✨ 블록 기반 편집</h3>
            <p className="text-sm text-blue-700">
              단락, 제목, 이미지 등을 블록 단위로 편집하세요.
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">🎨 실시간 편집</h3>
            <p className="text-sm text-green-700">
              Tiptap 에디터로 실시간 텍스트 편집이 가능합니다.
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">⚙️ 상세 설정</h3>
            <p className="text-sm text-purple-700">
              우측 패널에서 블록별 상세 설정을 변경하세요.
            </p>
          </div>
        </div>

        {/* 에디터 */}
        <BlockEditor
          onSave={handleSave}
          autoSave={false}
          className="min-h-[600px]"
        />

        {/* 도움말 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">🚀 사용법</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>블록 추가:</strong> '블록 추가' 버튼을 클릭하거나 빈 줄에서 + 버튼 클릭</li>
            <li>• <strong>블록 편집:</strong> 블록을 클릭하여 선택 후 다시 클릭하여 편집 모드 진입</li>
            <li>• <strong>블록 이동:</strong> 블록 선택 후 좌측 드래그 핸들로 위아래 이동</li>
            <li>• <strong>블록 설정:</strong> 블록 선택 후 우측 패널에서 상세 옵션 변경</li>
            <li>• <strong>키보드 단축키:</strong> Ctrl+S (저장), Esc (선택 해제), Ctrl+Z/Y (되돌리기/다시실행)</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};