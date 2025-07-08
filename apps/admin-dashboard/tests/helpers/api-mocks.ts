import { Page, Route } from '@playwright/test';
import mockResponses from '../fixtures/mock-responses.json';
import testData from '../fixtures/test-data.json';

/**
 * API Mock 유틸리티 클래스
 * 테스트에서 다양한 API 응답을 쉽게 설정할 수 있도록 도와줍니다.
 */
export class ApiMockHelper {
  constructor(private page: Page) {}

  /**
   * 기본 API Mock 설정 (성공 케이스)
   */
  async setupDefaultMocks() {
    await this.setupSaveMock('success');
    await this.setupLoadMock('success');
    await this.setupAutosaveMock('success');
  }

  /**
   * 저장 API Mock 설정
   */
  async setupSaveMock(scenario: 'success' | 'error' | 'conflict' | 'unauthorized') {
    const mockData = mockResponses.save[scenario];
    
    await this.page.route('/api/post-creation/create', (route: Route) => {
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });

    await this.page.route('/api/post-creation/update/*', (route: Route) => {
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });
  }

  /**
   * 불러오기 API Mock 설정
   */
  async setupLoadMock(scenario: 'success' | 'notFound' | 'empty') {
    const mockData = mockResponses.load[scenario];
    
    await this.page.route('/api/post-creation/posts/*', (route: Route) => {
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });

    await this.page.route('/api/post-creation/load/*', (route: Route) => {
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });
  }

  /**
   * 자동 저장 API Mock 설정
   */
  async setupAutosaveMock(scenario: 'success' | 'throttled') {
    const mockData = mockResponses.autosave[scenario];
    
    await this.page.route('/api/post-creation/autosave', (route: Route) => {
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });
  }

  /**
   * 네트워크 오류 시뮬레이션
   */
  async setupNetworkError(scenario: 'timeout' | 'offline' | 'slow') {
    const mockData = mockResponses.network[scenario];
    
    if (mockData.action === 'abort') {
      await this.page.route('/api/post-creation/**', (route: Route) => {
        route.abort(mockData.reason as any);
      });
    } else if (scenario === 'slow') {
      await this.page.route('/api/post-creation/**', async (route: Route) => {
        await new Promise(resolve => setTimeout(resolve, mockData.delay));
        route.fulfill({
          status: mockData.status,
          contentType: 'application/json',
          body: JSON.stringify(mockData.body)
        });
      });
    }
  }

  /**
   * 검증 오류 Mock 설정
   */
  async setupValidationError(scenario: 'invalidBlock' | 'missingContent') {
    const mockData = mockResponses.validation[scenario];
    
    await this.page.route('/api/post-creation/**', (route: Route) => {
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });
  }

  /**
   * 블록 연산 API Mock 설정
   */
  async setupBlockOperationMocks() {
    // 블록 생성
    await this.page.route('/api/block-editor/blocks/create', (route: Route) => {
      const mockData = mockResponses.blockOperations.createBlock;
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });

    // 블록 업데이트
    await this.page.route('/api/block-editor/blocks/*/update', (route: Route) => {
      const mockData = mockResponses.blockOperations.updateBlock;
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });

    // 블록 삭제
    await this.page.route('/api/block-editor/blocks/*/delete', (route: Route) => {
      const mockData = mockResponses.blockOperations.deleteBlock;
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });
  }

  /**
   * 버전 관리 API Mock 설정
   */
  async setupVersioningMocks() {
    // 버전 목록 조회
    await this.page.route('/api/post-creation/*/versions', (route: Route) => {
      const mockData = mockResponses.versioning.getVersions;
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });

    // 버전 되돌리기
    await this.page.route('/api/post-creation/*/revert', (route: Route) => {
      const mockData = mockResponses.versioning.revertVersion;
      route.fulfill({
        status: mockData.status,
        contentType: 'application/json',
        body: JSON.stringify(mockData.body)
      });
    });
  }

  /**
   * 사용자 정의 Mock 응답 설정
   */
  async setupCustomMock(
    endpoint: string, 
    response: { status: number; body: any }
  ) {
    await this.page.route(endpoint, (route: Route) => {
      route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.body)
      });
    });
  }

  /**
   * 모든 Mock 정리
   */
  async clearAllMocks() {
    await this.page.unroute('/api/post-creation/**');
    await this.page.unroute('/api/block-editor/**');
  }

  /**
   * Mock 응답 지연 설정
   */
  async setupDelayedResponse(endpoint: string, delay: number, response: any) {
    await this.page.route(endpoint, async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      route.fulfill({
        status: response.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(response.body || response)
      });
    });
  }

  /**
   * 순차적 응답 설정 (첫 번째 요청은 실패, 두 번째는 성공 등)
   */
  async setupSequentialResponses(endpoint: string, responses: any[]) {
    let callCount = 0;
    
    await this.page.route(endpoint, (route: Route) => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      
      if (response.action === 'abort') {
        route.abort(response.reason);
      } else {
        route.fulfill({
          status: response.status || 200,
          contentType: 'application/json',
          body: JSON.stringify(response.body || response)
        });
      }
    });
  }

  /**
   * 테스트 데이터 기반 Mock 설정
   */
  async setupTestDataMocks(postId: string = 'test-post-1') {
    const testPost = testData.testPosts.find(post => post.id === postId);
    
    if (!testPost) {
      throw new Error(`Test post with id '${postId}' not found`);
    }

    // 불러오기 Mock
    await this.page.route('/api/post-creation/posts/*', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: testPost.id,
            title: testPost.title,
            fields: {
              blocks: testPost.blocks
            }
          }
        })
      });
    });

    // 저장 Mock
    await this.page.route('/api/post-creation/create', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: testPost.id,
            title: testPost.title,
            saved_at: new Date().toISOString()
          }
        })
      });
    });
  }

  /**
   * 실시간 업데이트 Mock (WebSocket 시뮬레이션)
   */
  async setupRealtimeUpdateMocks() {
    // 실시간 업데이트 상태 확인
    await this.page.route('/api/realtime/status', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            connected: true,
            active_users: 1,
            last_update: new Date().toISOString()
          }
        })
      });
    });

    // 협업 상태 확인
    await this.page.route('/api/collaboration/status/*', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            document_locked: false,
            active_editors: [],
            last_modified_by: 'test-user'
          }
        })
      });
    });
  }
}

/**
 * 간편한 Mock 설정을 위한 헬퍼 함수들
 */
export const setupBasicMocks = async (page: Page) => {
  const mockHelper = new ApiMockHelper(page);
  await mockHelper.setupDefaultMocks();
  return mockHelper;
};

export const setupErrorScenario = async (page: Page, errorType: string) => {
  const mockHelper = new ApiMockHelper(page);
  
  switch (errorType) {
    case 'save-error':
      await mockHelper.setupSaveMock('error');
      break;
    case 'network-error':
      await mockHelper.setupNetworkError('offline');
      break;
    case 'validation-error':
      await mockHelper.setupValidationError('invalidBlock');
      break;
    case 'conflict':
      await mockHelper.setupSaveMock('conflict');
      break;
    default:
      throw new Error(`Unknown error scenario: ${errorType}`);
  }
  
  return mockHelper;
};

export const setupPerformanceTest = async (page: Page, delay: number = 5000) => {
  const mockHelper = new ApiMockHelper(page);
  await mockHelper.setupNetworkError('slow');
  return mockHelper;
};