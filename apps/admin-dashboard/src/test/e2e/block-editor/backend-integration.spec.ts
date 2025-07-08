import { test, expect } from '@playwright/test';
import { BlockEditorHelpers } from '../../helpers/block-helpers';

/**
 * TC005: 백엔드 연동 테스트 (Backend Integration)
 * 
 * 테스트 시나리오:
 * 1. 문서 저장 및 불러오기
 * 2. 자동 저장 기능
 * 3. API 에러 처리
 * 4. 실시간 동기화
 */

test.describe('백엔드 연동 테스트', () => {
  let helpers: BlockEditorHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BlockEditorHelpers(page);
    
    // API Mock 설정
    await setupApiMocks(page);
    
    await helpers.navigateToEditor();
  });

  test('문서 저장 및 불러오기', async ({ page }) => {
    // Given: 블록이 포함된 문서 작성
    const paragraphId = await helpers.createParagraphBlock('저장 테스트 내용');
    const headingId = await helpers.createHeadingBlock('저장 테스트 제목', 2);

    // When: 저장 버튼 클릭
    await helpers.saveDocument();

    // Then: 저장 성공 메시지 표시
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-success"]')).toContainText('저장되었습니다');

    // When: 페이지 새로고침 후 문서 불러오기
    await page.reload();
    await helpers.navigateToEditor();

    // Then: 저장된 내용이 복원됨
    const blockCount = await helpers.getBlockCount();
    expect(blockCount).toBe(2);
    
    await expect(page.locator('[data-block-type="paragraph"]')).toContainText('저장 테스트 내용');
    await expect(page.locator('[data-block-type="heading"] h2')).toContainText('저장 테스트 제목');
  });

  test('자동 저장 기능', async ({ page }) => {
    // Given: 자동 저장이 활성화된 상태로 에디터 접속
    await page.goto('/block-editor?autosave=true');
    await page.waitForSelector('[data-testid="block-editor"]', { state: 'visible' });
    
    // When: 텍스트 입력
    const blockId = await helpers.createParagraphBlock('자동 저장 테스트');

    // When: 자동 저장 주기 대기 (테스트에서는 짧게 설정)
    await page.waitForTimeout(5000); // 5초 자동 저장 주기

    // Then: 자동 저장 표시가 나타남
    await expect(page.locator('[data-testid="autosave-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="autosave-indicator"]')).toContainText('자동 저장됨');
  });

  test('API 에러 처리', async ({ page }) => {
    // Given: 저장 API가 실패하도록 설정
    await page.route('/api/post-creation/create', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: '서버 오류가 발생했습니다.'
        })
      });
    });

    // Given: 문서 작성
    await helpers.createParagraphBlock('에러 테스트 내용');

    // When: 저장 시도
    await page.click('[data-testid="save-button"]');

    // Then: 에러 메시지 표시
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('저장에 실패했습니다');
    
    // 재시도 버튼 표시
    await expect(page.locator('[data-testid="retry-save"]')).toBeVisible();
  });

  test('실시간 동기화', async ({ page }) => {
    // Given: 문서 작성
    const blockId = await helpers.createParagraphBlock('동기화 테스트');

    // When: 저장
    await helpers.saveDocument();

    // When: 내용 수정
    await helpers.enterBlockContent(blockId, '수정된 동기화 테스트');

    // Then: 수정 상태 표시
    await expect(page.locator('[data-testid="unsaved-changes"]')).toBeVisible();
    await expect(page.locator('[data-testid="unsaved-changes"]')).toContainText('저장되지 않은 변경사항');

    // When: 다시 저장
    await helpers.saveDocument();

    // Then: 수정 상태 해제
    await expect(page.locator('[data-testid="unsaved-changes"]')).not.toBeVisible();
  });

  test('복잡한 문서 저장 및 복원', async ({ page }) => {
    // Given: 복잡한 문서 구조 생성
    const h1Id = await helpers.createHeadingBlock('메인 제목', 1);
    const p1Id = await helpers.createParagraphBlock('첫 번째 단락입니다.');
    const h2Id = await helpers.createHeadingBlock('부제목', 2);
    const p2Id = await helpers.createParagraphBlock('두 번째 단락입니다.');
    
    // 스타일 적용
    await helpers.setBlockAlignment(h1Id, 'center');
    await helpers.setTextColor(h1Id, '#ff0000');
    await helpers.setBlockAlignment(p1Id, 'justify');

    // When: 저장
    await helpers.saveDocument();

    // When: 페이지 새로고침
    await page.reload();
    await helpers.navigateToEditor();

    // Then: 구조와 스타일이 모두 복원됨
    const blockCount = await helpers.getBlockCount();
    expect(blockCount).toBe(4);

    // 콘텐츠 확인
    await expect(page.locator('[data-block-type="heading"] h1')).toContainText('메인 제목');
    await expect(page.locator('[data-block-type="heading"] h2')).toContainText('부제목');
    
    // 스타일 확인
    await expect(page.locator('[data-block-type="heading"] h1')).toHaveClass(/text-center/);
    await expect(page.locator('[data-block-type="heading"] h1')).toHaveCSS('color', 'rgb(255, 0, 0)');
  });

  test('네트워크 연결 실패 처리', async ({ page }) => {
    // Given: 네트워크 연결 실패 시뮬레이션
    await page.route('/api/post-creation/**', (route) => {
      route.abort('failed');
    });

    // Given: 문서 작성
    await helpers.createParagraphBlock('네트워크 테스트');

    // When: 저장 시도
    await page.click('[data-testid="save-button"]');

    // Then: 네트워크 에러 메시지 표시
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-error"]')).toContainText('네트워크 연결을 확인해주세요');
  });

  test('버전 충돌 처리', async ({ page }) => {
    // Given: 문서 저장
    const blockId = await helpers.createParagraphBlock('버전 테스트');
    await helpers.saveDocument();

    // Given: 서버에서 버전 충돌 응답 설정
    await page.route('/api/post-creation/create', (route) => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: '문서가 다른 사용자에 의해 수정되었습니다.',
          conflict: true
        })
      });
    });

    // When: 내용 수정 후 저장 시도
    await helpers.enterBlockContent(blockId, '수정된 버전 테스트');
    await page.click('[data-testid="save-button"]');

    // Then: 충돌 해결 대화상자 표시
    await expect(page.locator('[data-testid="conflict-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-message"]')).toContainText('충돌이 발생했습니다');
    
    // 해결 옵션 표시
    await expect(page.locator('[data-testid="resolve-conflict-merge"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolve-conflict-overwrite"]')).toBeVisible();
  });

  test('대용량 문서 처리', async ({ page }) => {
    // Given: 많은 수의 블록 생성 (성능 테스트)
    const blockIds: string[] = [];
    
    for (let i = 1; i <= 20; i++) {
      const blockId = await helpers.createParagraphBlock(`블록 ${i}번째 내용입니다.`);
      blockIds.push(blockId);
    }

    // When: 저장
    await helpers.saveDocument();

    // Then: 대용량 문서도 정상 저장됨
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    
    // 모든 블록이 유지됨
    const finalCount = await helpers.getBlockCount();
    expect(finalCount).toBe(20);
  });
});

/**
 * API Mock 설정 헬퍼 함수
 */
async function setupApiMocks(page: any) {
  // 저장 API 모킹 (성공)
  await page.route('/api/post-creation/create', (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { 
          id: 'test-post-123', 
          title: 'Test Post',
          saved_at: new Date().toISOString()
        }
      })
    });
  });

  // 불러오기 API 모킹
  await page.route('/api/post-creation/posts/*', (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'test-post-123',
          title: 'Test Post',
          fields: {
            blocks: [
              { 
                id: 'block-1',
                type: 'paragraph', 
                content: '저장 테스트 내용',
                attributes: { align: 'left' }
              },
              { 
                id: 'block-2',
                type: 'heading', 
                content: '저장 테스트 제목',
                attributes: { level: 2, align: 'left' }
              }
            ]
          }
        }
      })
    });
  });

  // 자동 저장 API 모킹
  await page.route('/api/post-creation/autosave', (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { 
          autosaved_at: new Date().toISOString()
        }
      })
    });
  });
}