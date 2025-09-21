/**
 * Integration Test Example
 * MediaSelector 컴포넌트들의 통합 테스트 예시
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import {
  MediaSelector,
  CompactMediaSelector,
  InlineMediaBrowser,
  useMediaSelector,
  MediaItem,
  formatFileSize,
  isImageFile,
  isVideoFile
} from '../index';

type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  result?: string;
}

const IntegrationTest: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'media-selector-basic',
      name: 'MediaSelector 기본 기능',
      description: '미디어 선택기가 열리고 닫히는지 테스트',
      status: 'pending'
    },
    {
      id: 'media-selection',
      name: '미디어 선택 기능',
      description: '단일/다중 미디어 선택이 정상 작동하는지 테스트',
      status: 'pending'
    },
    {
      id: 'filter-search',
      name: '필터링 및 검색',
      description: '검색과 필터링 기능이 정상 작동하는지 테스트',
      status: 'pending'
    },
    {
      id: 'hook-functionality',
      name: 'useMediaSelector Hook',
      description: 'Hook의 상태 관리가 정상 작동하는지 테스트',
      status: 'pending'
    },
    {
      id: 'utility-functions',
      name: '유틸리티 함수',
      description: '파일 형식 검증 및 변환 함수들이 정상 작동하는지 테스트',
      status: 'pending'
    }
  ]);

  const [showMainSelector, setShowMainSelector] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // useMediaSelector hook test
  const {
    state: hookState,
    actions: hookActions,
    computed: hookComputed,
    allFiles
  } = useMediaSelector({
    multiple: true,
    maxSelection: 5,
    acceptedTypes: ['image', 'video'],
    enabled: true
  });

  const updateTestStatus = (testId: string, status: TestStatus, result?: string) => {
    setTestCases(prev => prev.map(test =>
      test.id === testId ? { ...test, status, result } : test
    ));
  };

  const runTest = async (testId: string) => {
    updateTestStatus(testId, 'running');

    try {
      switch (testId) {
        case 'media-selector-basic':
          await testMediaSelectorBasic();
          break;
        case 'media-selection':
          await testMediaSelection();
          break;
        case 'filter-search':
          await testFilterSearch();
          break;
        case 'hook-functionality':
          await testHookFunctionality();
          break;
        case 'utility-functions':
          await testUtilityFunctions();
          break;
        default:
          throw new Error('Unknown test case');
      }
      updateTestStatus(testId, 'passed', 'Test completed successfully');
    } catch (error: any) {
      updateTestStatus(testId, 'failed', error.message);
    }
  };

  const testMediaSelectorBasic = async () => {
    // Test modal open/close
    setShowMainSelector(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!showMainSelector) {
      throw new Error('MediaSelector failed to open');
    }

    setShowMainSelector(false);
    await new Promise(resolve => setTimeout(resolve, 100));

    setTestResults(prev => ({
      ...prev,
      basicTest: { modalOpened: true, modalClosed: true }
    }));
  };

  const testMediaSelection = async () => {
    // Test selection functionality
    const testMediaItems: MediaItem[] = [
      {
        id: 'test-1',
        url: 'https://example.com/image1.jpg',
        type: 'image',
        title: 'Test Image 1'
      },
      {
        id: 'test-2',
        url: 'https://example.com/video1.mp4',
        type: 'video',
        title: 'Test Video 1'
      }
    ];

    setSelectedMedia(testMediaItems);
    await new Promise(resolve => setTimeout(resolve, 100));

    if (selectedMedia.length !== 2) {
      throw new Error('Media selection failed');
    }

    setTestResults(prev => ({
      ...prev,
      selectionTest: {
        itemsSelected: selectedMedia.length,
        typesSelected: [...new Set(selectedMedia.map(m => m.type))]
      }
    }));
  };

  const testFilterSearch = async () => {
    // Test hook filter functionality
    hookActions.updateFilter('searchTerm', 'test');
    await new Promise(resolve => setTimeout(resolve, 100));

    if (hookState.filters.searchTerm !== 'test') {
      throw new Error('Search filter update failed');
    }

    hookActions.updateFilter('fileType', 'image');
    await new Promise(resolve => setTimeout(resolve, 100));

    if (hookState.filters.fileType !== 'image') {
      throw new Error('File type filter update failed');
    }

    setTestResults(prev => ({
      ...prev,
      filterTest: {
        searchTerm: hookState.filters.searchTerm,
        fileType: hookState.filters.fileType
      }
    }));
  };

  const testHookFunctionality = async () => {
    // Test hook state management
    const initialSelectedCount = hookState.selectedFiles.length;

    // Test file selection (simulate)
    if (allFiles.length > 0) {
      hookActions.selectFile(allFiles[0].id);
      await new Promise(resolve => setTimeout(resolve, 100));

      if (hookState.selectedFiles.length <= initialSelectedCount) {
        throw new Error('Hook file selection failed');
      }
    }

    // Test view mode change
    hookActions.setViewMode('list');
    await new Promise(resolve => setTimeout(resolve, 100));

    if (hookState.viewMode !== 'list') {
      throw new Error('View mode change failed');
    }

    setTestResults(prev => ({
      ...prev,
      hookTest: {
        viewMode: hookState.viewMode,
        selectedCount: hookState.selectedFiles.length,
        computedValues: {
          canSelectMore: hookComputed.canSelectMore,
          isAllSelected: hookComputed.isAllSelected
        }
      }
    }));
  };

  const testUtilityFunctions = async () => {
    // Test utility functions
    const imageTest = isImageFile('image/jpeg');
    const videoTest = isVideoFile('video/mp4');
    const formatTest = formatFileSize(1024000);

    if (!imageTest) {
      throw new Error('Image file detection failed');
    }

    if (!videoTest) {
      throw new Error('Video file detection failed');
    }

    if (!formatTest.includes('MB')) {
      throw new Error('File size formatting failed');
    }

    setTestResults(prev => ({
      ...prev,
      utilityTest: {
        imageDetection: imageTest,
        videoDetection: videoTest,
        sizeFormatting: formatTest
      }
    }));
  };

  const runAllTests = async () => {
    for (const test of testCases) {
      await runTest(test.id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between tests
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestStatus) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      passed: 'default',
      failed: 'destructive'
    } as const;

    const colors = {
      pending: 'text-gray-600',
      running: 'text-blue-600',
      passed: 'text-green-600',
      failed: 'text-red-600'
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const passedTests = testCases.filter(t => t.status === 'passed').length;
  const failedTests = testCases.filter(t => t.status === 'failed').length;
  const totalTests = testCases.length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          MediaSelector Integration Tests
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          MediaSelector 컴포넌트들의 통합 테스트 결과를 확인하세요.
        </p>

        <div className="flex justify-center gap-4 mb-6">
          <Button onClick={runAllTests} size="lg">
            모든 테스트 실행
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTestCases(prev => prev.map(t => ({ ...t, status: 'pending' as TestStatus })));
              setTestResults({});
            }}
          >
            테스트 초기화
          </Button>
        </div>

        {/* Test Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{passedTests}</div>
              <p className="text-sm text-gray-600">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{failedTests}</div>
              <p className="text-sm text-gray-600">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{totalTests}</div>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Cases */}
      <div className="space-y-4">
        {testCases.map((test) => (
          <Card key={test.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <p className="text-sm text-gray-600">{test.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(test.status)}
                  <Button
                    onClick={() => runTest(test.id)}
                    size="sm"
                    variant="outline"
                    disabled={test.status === 'running'}
                  >
                    테스트 실행
                  </Button>
                </div>
              </div>
            </CardHeader>

            {(test.result || testResults[test.id.replace('-', '')]) && (
              <CardContent>
                {test.result && (
                  <div className={`p-3 rounded ${
                    test.status === 'passed'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {test.result}
                  </div>
                )}

                {testResults[test.id.replace('-', '')] && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">테스트 결과:</h4>
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(testResults[test.id.replace('-', '')], null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Live Components for Testing */}
      <Card>
        <CardHeader>
          <CardTitle>실제 컴포넌트 테스트</CardTitle>
          <p className="text-sm text-gray-600">
            실제 MediaSelector 컴포넌트들을 테스트해보세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Main MediaSelector</h4>
              <Button onClick={() => setShowMainSelector(true)}>
                미디어 선택기 열기
              </Button>
              {selectedMedia.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedMedia.length}개 미디어 선택됨
                </p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Compact MediaSelector</h4>
              <CompactMediaSelector
                onSelect={(media) => {
                  console.log('Compact selector:', media);
                }}
                multiple={false}
                acceptedTypes={['image']}
                title="컴팩트 선택기"
                height={200}
              />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Hook State (실시간)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">View Mode:</span>
                <p className="font-medium">{hookState.viewMode}</p>
              </div>
              <div>
                <span className="text-gray-600">Selected:</span>
                <p className="font-medium">{hookState.selectedFiles.length}</p>
              </div>
              <div>
                <span className="text-gray-600">Search:</span>
                <p className="font-medium">{hookState.filters.searchTerm || 'None'}</p>
              </div>
              <div>
                <span className="text-gray-600">Filter:</span>
                <p className="font-medium">{hookState.filters.fileType}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MediaSelector Modal */}
      <MediaSelector
        isOpen={showMainSelector}
        onClose={() => setShowMainSelector(false)}
        onSelect={(media) => {
          setSelectedMedia(Array.isArray(media) ? media : [media]);
        }}
        multiple={true}
        acceptedTypes={['image', 'video']}
        maxSelection={10}
        title="통합 테스트 - 미디어 선택"
        selectedItems={selectedMedia}
      />
    </div>
  );
};

export default IntegrationTest;