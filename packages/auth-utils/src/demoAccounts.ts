/** Public experience accounts. Identity and authorization remain server-owned. */
export const PUBLIC_DEMO_ACCOUNTS = Object.freeze([
  { type: 'STORE_OWNER' as const, label: '매장 경영자 테스트 로그인', email: 'teststoreowner@gmail.com', password: 'testmail1!' },
  { type: 'SUPPLIER' as const, label: '공급자 테스트 로그인', email: 'testsupplier@gmail.com', password: 'testmail1!' },
  { type: 'STORE_STAFF' as const, label: '매장 직원 테스트 로그인', email: 'teststaff@gmail.com', password: 'testmail1' },
]);
export type PublicDemoAccountType = typeof PUBLIC_DEMO_ACCOUNTS[number]['type'];
