import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleAIModal } from '@/components/ai/SimpleAIModal';
import { Sparkles } from 'lucide-react';
import type { Block, GenerateResult } from '@/services/ai/SimpleAIGenerator';

export default function AIPageGeneratorTest() {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<Block[]>([]);
  const [testResult, setTestResult] = useState<string>('');

  const handleAIGenerate = (result: GenerateResult) => {
    setGeneratedBlocks(result.blocks);
    const message = result.newBlocksRequest && result.newBlocksRequest.length > 0
      ? `✅ 성공: ${result.blocks.length}개 블록 생성됨 (${result.newBlocksRequest.length}개의 새 블록 요청 포함)`
      : `✅ 성공: ${result.blocks.length}개 블록 생성됨`;
    setTestResult(message);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI 페이지 생성 실제 흐름 테스트</h1>

      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="font-semibold text-yellow-900 mb-2">🧪 테스트 목적</h2>
        <p className="text-sm text-yellow-800">
          이 페이지는 실제 편집기와 동일한 방식으로 SimpleAIModal을 사용합니다.<br />
          AI가 블록을 생성하면 onGenerate 콜백이 호출되고, 블록을 state에 저장합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 컨트롤 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>AI 페이지 생성 테스트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setIsAIModalOpen(true)}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI 페이지 생성 모달 열기
            </Button>

            {testResult && (
              <div className={`p-3 rounded ${testResult.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult}
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p className="font-semibold mb-2">테스트 단계:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>위 버튼 클릭하여 AI 모달 열기</li>
                <li>프롬프트 입력 (예: "랜딩 페이지 만들기")</li>
                <li>생성 버튼 클릭</li>
                <li>오른쪽에 블록이 표시되는지 확인</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* 결과 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>생성된 블록 ({generatedBlocks.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedBlocks.length > 0 ? (
              <div className="space-y-4">
                {generatedBlocks.map((block, index) => (
                  <div key={block.id || index} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">#{index + 1}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {block.type}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-semibold">Content:</span>
                        <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(block.content, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <span className="font-semibold">Attributes:</span>
                        <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(block.attributes, null, 2)}
                        </pre>
                      </div>

                      {/* innerBlocks 표시 */}
                      {block.innerBlocks && block.innerBlocks.length > 0 && (
                        <div>
                          <span className="font-semibold">InnerBlocks ({block.innerBlocks.length}개):</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(block.innerBlocks, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* 블록 검증 */}
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-semibold">검증:</span>
                        <div className="mt-1 space-y-1">
                          {block.type === 'o4o/heading' && (
                            <div className="text-xs">
                              {block.attributes?.content ? '✅' : '❌'} attributes.content
                              {' | '}
                              {block.attributes?.level ? '✅' : '❌'} attributes.level
                              {' | '}
                              {Object.keys(block.content || {}).length === 0 ? '✅' : '❌'} content 빈 객체
                            </div>
                          )}
                          {block.type === 'o4o/paragraph' && (
                            <div className="text-xs">
                              {block.attributes?.content ? '✅' : '❌'} attributes.content
                              {' | '}
                              {Object.keys(block.content || {}).length === 0 ? '✅' : '❌'} content 빈 객체
                            </div>
                          )}
                          {block.type === 'o4o/list' && (
                            <div className="text-xs">
                              {block.attributes?.items ? '✅' : '❌'} attributes.items
                              {' | '}
                              {Object.keys(block.content || {}).length === 0 ? '✅' : '❌'} content 빈 객체
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                아직 생성된 블록이 없습니다.<br />
                왼쪽에서 AI 생성을 시작하시기 바랍니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Modal - 실제 편집기와 동일한 방식 */}
      <SimpleAIModal
        isOpen={isAIModalOpen}
        mode="new"
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={handleAIGenerate}
      />
    </div>
  );
}
