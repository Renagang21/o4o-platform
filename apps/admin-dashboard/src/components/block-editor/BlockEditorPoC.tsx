import React, { useState, useEffect } from 'react';
import { useBlockEditorStore } from '@/stores/block-editor-store';
import { blockEditorAPI, BlockEditorPost } from '@/api/block-editor-api';
import { blockRegistry } from '@/lib/block-registry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Save, 
  FolderOpen, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';

interface TestResult {
  type: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

/**
 * 백엔드 연동 PoC 테스트 컴포넌트
 */
export const BlockEditorPoC: React.FC = () => {
  const {
    blocks,
    addBlock,
    getEditorData,
    loadBlocks,
    reset,
    isLoading,
    setLoading,
    setError
  } = useBlockEditorStore();

  const [postTitle, setPostTitle] = useState('블록 에디터 테스트 포스트');
  const [lastSavedPostId, setLastSavedPostId] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestMode, setIsTestMode] = useState(true);

  // 테스트 결과 추가
  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, { ...result, details: JSON.stringify(result.details, null, 2) }]);
  };

  // 테스트 결과 초기화
  const clearTestResults = () => {
    setTestResults([]);
  };

  // API 연결 테스트
  const testAPIConnection = async () => {
    setLoading(true);
    try {
      const result = await blockEditorAPI.testConnection();
      addTestResult({
        type: result.success ? 'success' : 'error',
        message: `API 연결 테스트: ${result.message}`,
      });
    } catch (error) {
      addTestResult({
        type: 'error',
        message: 'API 연결 테스트 실패',
        details: error,
      });
    } finally {
      setLoading(false);
    }
  };

  // 샘플 블록 추가
  const addSampleBlocks = () => {
    // 간단한 테스트용 블록 데이터 생성
    const sampleBlocks = [
      {
        id: 'test-block-1',
        type: 'paragraph' as const,
        content: '',
        attributes: {
          content: '이것은 단락 블록 테스트입니다.',
          align: 'left',
        },
        metadata: {
          created: new Date(),
          modified: new Date(),
          version: 1,
        },
      },
      {
        id: 'test-block-2',
        type: 'heading' as const,
        content: '',
        attributes: {
          content: '제목 블록 테스트',
          level: 2,
          align: 'left',
        },
        metadata: {
          created: new Date(),
          modified: new Date(),
          version: 1,
        },
      },
    ];

    loadBlocks(sampleBlocks);
    addTestResult({
      type: 'success',
      message: '샘플 블록 데이터 로드 완료',
      details: sampleBlocks,
    });
  };

  // 저장 테스트
  const testSavePost = async () => {
    if (blocks.length === 0) {
      addTestResult({
        type: 'warning',
        message: '저장할 블록이 없습니다. 먼저 샘플 블록을 추가하세요.',
      });
      return;
    }

    setLoading(true);
    try {
      const postData: BlockEditorPost = {
        title: postTitle,
        content: `${postTitle} - 검색용 텍스트`,
        fields: {
          blocks,
          editorVersion: '1.0',
          lastModified: new Date(),
        },
        status: 'draft',
        meta: {
          featured: false,
          tags: ['테스트', '블록에디터'],
        },
      };

      const response = await blockEditorAPI.createPost(postData);

      if (response.success && response.data) {
        setLastSavedPostId(response.data.id);
        addTestResult({
          type: 'success',
          message: `포스트 저장 성공! ID: ${response.data.id}`,
          details: response.data,
        });
      } else {
        addTestResult({
          type: 'error',
          message: '포스트 저장 실패',
          details: response.error,
        });
      }
    } catch (error) {
      addTestResult({
        type: 'error',
        message: '포스트 저장 중 오류 발생',
        details: error,
      });
    } finally {
      setLoading(false);
    }
  };

  // 불러오기 테스트
  const testLoadPost = async () => {
    if (!lastSavedPostId) {
      addTestResult({
        type: 'warning',
        message: '불러올 포스트 ID가 없습니다. 먼저 포스트를 저장하세요.',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await blockEditorAPI.getPost(lastSavedPostId);

      if (response.success && response.data) {
        // 서버에서 받은 블록 데이터로 에디터 상태 업데이트
        const serverBlocks = response.data.fields?.blocks || [];
        
        if (Array.isArray(serverBlocks) && serverBlocks.length > 0) {
          loadBlocks(serverBlocks);
          setPostTitle(response.data.title);
          
          addTestResult({
            type: 'success',
            message: `포스트 불러오기 성공! 블록 ${serverBlocks.length}개 로드됨`,
            details: response.data,
          });
        } else {
          addTestResult({
            type: 'warning',
            message: '포스트는 불러왔지만 블록 데이터가 없습니다',
            details: response.data,
          });
        }
      } else {
        addTestResult({
          type: 'error',
          message: '포스트 불러오기 실패',
          details: response.error,
        });
      }
    } catch (error) {
      addTestResult({
        type: 'error',
        message: '포스트 불러오기 중 오류 발생',
        details: error,
      });
    } finally {
      setLoading(false);
    }
  };

  // 전체 플로우 테스트
  const runFullTest = async () => {
    clearTestResults();
    addTestResult({
      type: 'success',
      message: '=== 백엔드 연동 통합 테스트 시작 ===',
    });

    // 1. API 연결 테스트
    await testAPIConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. 샘플 데이터 생성
    addSampleBlocks();
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. 저장 테스트
    await testSavePost();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. 초기화 후 불러오기 테스트
    reset();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testLoadPost();

    addTestResult({
      type: 'success',
      message: '=== 통합 테스트 완료 ===',
    });
  };

  const getResultIcon = (type: TestResult['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">블록 에디터 백엔드 연동 PoC</h1>
          <p className="text-gray-600 mt-1">
            API 서버와의 블록 데이터 저장/로드 기능을 테스트합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runFullTest}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <TestTube className="w-4 h-4 mr-2" />
            전체 테스트 실행
          </Button>
          <Button variant="outline" onClick={clearTestResults}>
            결과 초기화
          </Button>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">테스트 컨트롤</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="postTitle">포스트 제목</Label>
            <Input
              id="postTitle"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="테스트 포스트 제목"
            />
          </div>
          <div>
            <Label>저장된 포스트 ID</Label>
            <Input
              value={lastSavedPostId}
              onChange={(e) => setLastSavedPostId(e.target.value)}
              placeholder="포스트 ID (자동 생성됨)"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={testAPIConnection} disabled={isLoading} variant="outline">
            <TestTube className="w-4 h-4 mr-2" />
            API 연결 테스트
          </Button>
          <Button onClick={addSampleBlocks} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            샘플 블록 추가
          </Button>
          <Button onClick={testSavePost} disabled={isLoading} variant="outline">
            <Save className="w-4 h-4 mr-2" />
            저장 테스트
          </Button>
          <Button onClick={testLoadPost} disabled={isLoading} variant="outline">
            <FolderOpen className="w-4 h-4 mr-2" />
            불러오기 테스트
          </Button>
        </div>
      </Card>

      {/* 현재 에디터 상태 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">현재 에디터 상태</h3>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm mb-2">
            <strong>블록 개수:</strong> {blocks.length}개
          </p>
          {blocks.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-blue-600">
                블록 데이터 보기
              </summary>
              <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                {JSON.stringify(blocks, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </Card>

      {/* 테스트 결과 */}
      {testResults.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">테스트 결과</h3>
          <div className="space-y-2 max-h-96 overflow-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-2 rounded text-sm ${
                  result.type === 'success' ? 'bg-green-50' :
                  result.type === 'error' ? 'bg-red-50' : 'bg-yellow-50'
                }`}
              >
                {getResultIcon(result.type)}
                <div className="flex-1">
                  <p className="font-medium">{result.message}</p>
                  {result.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs opacity-70">
                        상세 정보
                      </summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                        {result.details}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>테스트 실행 중...</span>
          </div>
        </div>
      )}
    </div>
  );
};