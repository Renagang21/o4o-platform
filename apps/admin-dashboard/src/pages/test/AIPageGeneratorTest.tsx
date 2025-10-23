import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { simpleAIGenerator, type Block } from '@/services/ai/SimpleAIGenerator';
import { Loader2 } from 'lucide-react';

export default function AIPageGeneratorTest() {
  const [prompt, setPrompt] = useState('혁신적인 AI 기반 웹사이트 빌더를 소개하는 랜딩 페이지를 만들어주세요.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [validatedBlocks, setValidatedBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const handleTest = async () => {
    setIsGenerating(true);
    setError(null);
    setRawResponse(null);
    setValidatedBlocks([]);
    setProgress('시작 중...');

    try {
      const blocks = await simpleAIGenerator.generatePage({
        prompt,
        template: 'landing',
        config: {
          provider: 'gemini',
          model: 'gemini-2.5-flash'
        },
        onProgress: (prog, msg) => {
          setProgress(`${prog}% - ${msg}`);
        }
      });

      setValidatedBlocks(blocks);
      setProgress('완료!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI 페이지 생성 테스트</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입력 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="프롬프트 입력..."
            />
            <Button onClick={handleTest} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                'AI 페이지 생성'
              )}
            </Button>
            {progress && (
              <div className="text-sm text-gray-600">{progress}</div>
            )}
          </CardContent>
        </Card>

        {/* 검증된 블록 */}
        <Card>
          <CardHeader>
            <CardTitle>검증된 블록 ({validatedBlocks.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(validatedBlocks, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* 에러 */}
        {error && (
          <Card className="lg:col-span-2 border-red-300">
            <CardHeader>
              <CardTitle className="text-red-600">에러</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-red-50 p-4 rounded text-sm text-red-800">
                {error}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* 블록 상세 분석 */}
        {validatedBlocks.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>블록 상세 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validatedBlocks.map((block, index) => (
                  <div key={index} className="border rounded p-4">
                    <h3 className="font-bold mb-2">블록 #{index + 1}: {block.type}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-600">Content:</p>
                        <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(block.content, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-600">Attributes:</p>
                        <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(block.attributes, null, 2)}
                        </pre>
                      </div>
                    </div>
                    {/* 검증 체크 */}
                    <div className="mt-2 text-xs">
                      {block.type === 'o4o/heading' && (
                        <div>
                          ✓ Heading:
                          {block.attributes?.content ? ' ✅ attributes.content 있음' : ' ❌ attributes.content 없음'}
                          {block.attributes?.level ? ' ✅ attributes.level 있음' : ' ❌ attributes.level 없음'}
                          {typeof block.content === 'object' && Object.keys(block.content).length === 0
                            ? ' ✅ content는 빈 객체'
                            : ' ❌ content에 데이터 있음'}
                        </div>
                      )}
                      {block.type === 'o4o/paragraph' && (
                        <div>
                          ✓ Paragraph:
                          {block.attributes?.content ? ' ✅ attributes.content 있음' : ' ❌ attributes.content 없음'}
                          {typeof block.content === 'object' && Object.keys(block.content).length === 0
                            ? ' ✅ content는 빈 객체'
                            : ' ❌ content에 데이터 있음'}
                        </div>
                      )}
                      {block.type === 'o4o/image' && (
                        <div>
                          ✓ Image:
                          {block.attributes?.alt ? ' ✅ attributes.alt 있음' : ' ❌ attributes.alt 없음'}
                          {typeof block.content === 'object' && Object.keys(block.content).length === 0
                            ? ' ✅ content는 빈 객체'
                            : ' ❌ content에 데이터 있음'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
