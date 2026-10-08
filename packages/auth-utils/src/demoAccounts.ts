/** Public experience accounts. Identity and authorization remain server-owned. */
export const PUBLIC_DEMO_ACCOUNTS = Object.freeze([
  { type: 'STORE_OWNER' as const, label: '매장 경영자 테스트 로그인', email: 'teststoreowner@example.com', password: 'testmail1!' },
  { type: 'SUPPLIER' as const, label: '공급자 테스트 로그인', email: 'testsupplier@example.com', password: 'testmail1!' },
]);
