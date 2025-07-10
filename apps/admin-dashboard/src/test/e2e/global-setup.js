import { chromium } from '@playwright/test';
async function globalSetup(config) {
    const { baseURL } = config.projects[0].use;
    console.log('🚀 Admin Dashboard E2E 테스트 환경 셋업 시작...');
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        console.log('🔍 API 서버 연결 확인 중...');
        const apiResponse = await page.request.get('http://localhost:4000/health');
        if (!apiResponse.ok()) {
            throw new Error(`API 서버가 응답하지 않습니다: ${apiResponse.status()}`);
        }
        console.log('✅ API 서버 연결 확인됨');
        console.log('🔍 Admin Dashboard 서버 연결 확인 중...');
        const adminResponse = await page.request.get(baseURL || 'http://localhost:3001');
        if (!adminResponse.ok()) {
            throw new Error(`Admin Dashboard 서버가 응답하지 않습니다: ${adminResponse.status()}`);
        }
        console.log('✅ Admin Dashboard 서버 연결 확인됨');
        console.log('👤 관리자 테스트 계정 준비 중...');
        try {
            await page.request.post('http://localhost:4000/api/v1/business/auth/register', {
                data: {
                    email: 'admin@neture.co.kr',
                    password: 'admin123!',
                    name: 'Test Admin',
                    role: 'admin'
                }
            });
            console.log('✅ 관리자 테스트 계정 생성됨');
        }
        catch (error) {
            console.log('ℹ️ 관리자 테스트 계정이 이미 존재합니다');
        }
        try {
            await page.request.post('http://localhost:4000/api/v1/business/auth/register', {
                data: {
                    email: 'user@neture.co.kr',
                    password: 'user123!',
                    name: 'Test User',
                    role: 'customer'
                }
            });
            console.log('✅ 일반 사용자 테스트 계정 생성됨');
        }
        catch (error) {
            console.log('ℹ️ 일반 사용자 테스트 계정이 이미 존재합니다');
        }
        await browser.close();
        console.log('🎉 Admin Dashboard E2E 테스트 환경 셋업 완료!');
    }
    catch (error) {
        console.error('❌ Admin Dashboard E2E 테스트 환경 셋업 실패:', error);
        throw error;
    }
}
export default globalSetup;
//# sourceMappingURL=global-setup.js.map