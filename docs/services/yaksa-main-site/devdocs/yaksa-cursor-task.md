# Yaksa Site - Cursor 작업 요청 안내

## 📌 목적

이 문서는 Cursor IDE에 `o4o-platform/.cursor/.cursorrules` 설정을 기반으로  
`services/yaksa-main-site` 폴더를 중심으로 개발을 진행하기 위한 지시 요청서입니다.

---

## 1️⃣ 전제 설정

- `.cursorrules` 위치: `o4o-platform/.cursor/.cursorrules`
- 적용 폴더: `services/yaksa-main-site`
- 타입스크립트 기반 React SPA 구조

---

## 2️⃣ 요청할 작업 예시

> 현재 설정에 따라 다음과 같은 작업 요청이 가능해야 합니다:

### ✅ 예시 요청

- `src/pages/Home.tsx` 생성 및 기본 라우팅 구성
- `vite.config.ts`, `tailwind.config.js`, `index.html` 관련 코드 점검
- dist 빌드 결과를 nginx에서 서빙 가능한지 확인하는 정적 export 플로우 설정

---

## 3️⃣ 향후 확장 예정 대상

- `services/api-server` 백엔드 구성
- `services/portal-site`, `services/ecommerce`, `services/crowdfunding` 등 모듈 추가 시 `.cursorrules` `"folders"` 확장

---

## 📝 최종 요청 문구 예시

```
`.cursor/.cursorrules` 설정에 따라 `services/yaksa-main-site` 디렉토리를 중심으로 코딩 지원을 시작해 주세요.
```