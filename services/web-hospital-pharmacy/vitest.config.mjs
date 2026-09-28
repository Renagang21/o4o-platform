/**
 * web-hospital-pharmacy 테스트 설정
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE §19:
 *   원내 약품 파일 직접 선택 · handle 재사용 · 권한 상태 · 변경 감지 · mapping 재사용 · 데이터셋 비저장 계약을 고정한다.
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-hospital-pharmacy/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest 를 그대로 쓴다 — 이 서비스에 테스트 의존성을 추가하지 않는다
 * (package.json · lockfile 무변경, web-kpa-society 와 같은 방식). 테스트는 src 밖(tests/)에 두어
 * 서비스 `tsc -b`·Docker 빌드에 섞이지 않게 한다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['services/web-hospital-pharmacy/tests/**/*.test.ts'],
    passWithNoTests: false,
  },
});
