import React from 'react';
import { useBlockEditorStore } from '@/stores/block-editor-store';
import { blockRegistry } from '@/lib/block-registry';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export const InspectorPanel: React.FC = () => {
  const { getSelectedBlock, updateBlock } = useBlockEditorStore();
  const selectedBlock = getSelectedBlock();

  return (
    <Card className="p-4">
      <Tabs defaultValue="block">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="block">블록</TabsTrigger>
          <TabsTrigger value="document">문서</TabsTrigger>
        </TabsList>
        
        <TabsContent value="block" className="space-y-4">
          {selectedBlock ? (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-semibold">{getBlockTitle(selectedBlock.type)} 설정</h3>
                <p className="text-sm text-gray-600">
                  선택된 블록의 속성을 편집할 수 있습니다.
                </p>
              </div>

              {/* 실제 블록 인스펙터 렌더링 */}
              {renderBlockInspector(selectedBlock, updateBlock)}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <div className="text-lg mb-2">🎨</div>
              <div className="font-medium mb-1">블록을 선택하세요</div>
              <div className="text-sm">
                블록을 선택하면 설정 옵션이 여기에 표시됩니다.
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="document" className="space-y-4">
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="font-semibold">문서 설정</h3>
              <p className="text-sm text-gray-600">
                전체 문서에 적용되는 설정입니다.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="text-sm font-medium text-blue-900 mb-1">
                  🚀 개발 진행 중
                </div>
                <div className="text-sm text-blue-700">
                  문서 설정 기능은 현재 개발 중입니다.
                </div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>예정 기능:</strong></div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>문서 제목 및 설명</li>
                  <li>SEO 메타데이터</li>
                  <li>공개 설정</li>
                  <li>썸네일 이미지</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

/**
 * 블록 타입에 따른 제목 가져오기
 */
function getBlockTitle(blockType: string): string {
  const blockDef = blockRegistry.getBlock(blockType);
  return blockDef?.title || blockType;
}

/**
 * 블록 인스펙터 컴포넌트 렌더링
 */
function renderBlockInspector(
  block: any, 
  updateBlock: (id: string, attributes: any) => void
) {
  const blockDef = blockRegistry.getBlock(block.type);
  
  if (!blockDef || !blockDef.inspector) {
    return (
      <div className="p-3 bg-yellow-50 rounded-md">
        <div className="text-sm font-medium text-yellow-900 mb-1">
          ⚠️ 인스펙터 없음
        </div>
        <div className="text-sm text-yellow-700">
          이 블록 타입({block.type})에는 설정 인스펙터가 정의되지 않았습니다.
        </div>
      </div>
    );
  }

  const InspectorComponent = blockDef.inspector;
  
  return (
    <InspectorComponent
      block={block}
      onChange={(attributes) => updateBlock(block.id, attributes)}
    />
  );
}