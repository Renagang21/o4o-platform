import { chromium } from '@playwright/test';
async function globalTeardown() {
    console.log('🧹 Admin Dashboard E2E 테스트 환경 정리 시작...');
    try {
        const browser = await chromium.launch();
        await browser.close();
        console.log('✅ Admin Dashboard E2E 테스트 환경 정리 완료!');
    }
    catch (error) {
        console.error('⚠️ Admin Dashboard E2E 테스트 환경 정리 중 오류:', error);
    }
}
export default globalTeardown;
//# sourceMappingURL=global-teardown.js.map