/**
 * Get test accounts from login page
 */

import { chromium } from 'playwright';

async function getTestAccounts() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://glycopharm.co.kr/login', { waitUntil: 'networkidle' });

  // 페이지 전체 텍스트 가져오기
  const pageText = await page.textContent('body');
  console.log('=== Login Page Content ===\n');
  console.log(pageText);

  // 테스트 계정 관련 요소 찾기
  const testAccountsSection = await page.locator('text=/테스트|test|계정/i').all();
  console.log('\n=== Test Account Elements ===');
  for (const el of testAccountsSection) {
    const text = await el.textContent();
    console.log(text);
  }

  await browser.close();
}

getTestAccounts();
