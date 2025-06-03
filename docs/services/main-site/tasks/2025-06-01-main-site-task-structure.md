# 🧱 main-site 전반 구조 정비 작업 문서

## 목적
- `services/main-site` 내부의 코드 구조와 라우팅 체계를 점검하고, 현재 환경에 맞게 정리한다.
- yaksa.site → neture.co.kr로 이전된 구조를 반영한다.

## 작업 목록
- [ ] 폴더명 확인: `yaksa-main-site` → `main-site`로 변경되었는지 확인
- [ ] 홈 화면 `/`의 컴포넌트 계층 구조 정리 (`App.tsx`, `Layout.tsx`, `Home.tsx`)
- [ ] 폴더 구조 재검토: `pages/`, `components/`, `context/` 등 명확히 구분
- [ ] 불필요한 샘플 컴포넌트 제거 (`vite.svg`, placeholder 등)
- [ ] PM2 실행 기준 포트 확인 (3000) → Nginx 프록시와 일치 여부 확인
