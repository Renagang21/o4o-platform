# 📚 O4O Platform 기준 문서 통합본


---

## 📄 01-project-overview.md

<!-- From: foundation/01-project-overview.md -->

# 🧭 O4O Platform 프로젝트 개요

이 문서는 O4O Platform 전체 프로젝트의 개요, 목적, 구성요소, 기술 스택을 요약합니다.

## 🌐 주요 도메인
- yaksa.site: 메인 포털 SPA
- admin.yaksa.site: 관리자용 인터페이스
- store.yaksa.site: 사용자 쇼핑몰/서비스 포털

## 🧱 기술 스택
- 백엔드: Medusa (Node.js)
- 프론트엔드: React + Tailwind
- CMS: Strapi
- 인증: JWT 기반 (약사 인증/자동 승인 등)
- 인프라: AWS Lightsail, Nginx, PM2


---

## 📄 02-folder-naming-guidelines.md

<!-- From: foundation/02-folder-naming-guidelines.md -->

# 📁 폴더 및 파일명 네이밍 규칙

O4O Platform에서는 다음과 같은 규칙을 따릅니다:

## 📦 폴더 네이밍
- 소문자 + 하이픈(`-`) 사용: 예) `o4o-api-server`
- 기능 단위로 분리: `products/`, `orders/`

## 📝 파일 네이밍
- 컴포넌트: PascalCase (`ProductCard.tsx`)
- API/유틸리티: camelCase (`fetchProducts.ts`)
- 문서: kebab-case + `.md`


---

## 📄 03-dev-flow-guide.md

<!-- From: foundation/03-dev-flow-guide.md -->

# 🚀 개발 흐름 가이드

## 🧪 로컬 개발
- React 앱: `npm run dev` (`o4o-web-server/`)
- Medusa API: `medusa develop` (`o4o-api-server/`)

## 🧱 빌드 & 배포
- 프론트: `npm run build` → serve 또는 nginx
- 백엔드: PM2 + Nginx 구성

## 🧠 GPT/Cursor 지시 흐름
1. docs 기준 확인
2. 경로 지시 포함하여 요청
3. 결과 확인 및 통합 문서 반영


---

## 📄 04-cursor-integration.md

<!-- From: foundation/04-cursor-integration.md -->

# 🧠 Cursor IDE 연동 기준

## `.cursorrules` 설정 예시
```json
{
  "defaultWorkspace": "Coding/o4o-platform/o4o-web-server",
  "rules": [
    {
      "pattern": "pages/.*\.tsx",
      "purpose": "UI 페이지 컴포넌트"
    }
  ]
}
```

## 활용 팁
- workspace 기준 엄수
- GPT 응답 시 항상 파일 위치 명시


---

## 📄 05-taskmanager-connection.md

<!-- From: foundation/05-taskmanager-connection.md -->

# 🤖 AI TaskManager 및 MCP 연동

## 사용 목적
- Claude/ChatGPT를 Task 기반 자동화에 연동
- TaskMaster로 명시적 지시 생성

## 연동 흐름
1. `mcp.json` 또는 Task 템플릿 작성
2. GPT에게 문서/코드/흐름 설명 요청
3. context7 등으로 확장 가능


---

## 📄 06-service-map.md

<!-- From: foundation/06-service-map.md -->

# 🗺️ O4O Platform 서비스 맵

## yaksa-site 주요 서비스
- 약사 인증 + 회원 가입 흐름
- B2C 쇼핑몰: 소셜 로그인 + 자동 승인
- B2B 쇼핑몰: 약사 대상
- 포럼, 사이니지, 강좌 등 확장형 구조

## 연동 예시
- `store.yaksa.site`: 제품 구매 및 관리
- `admin.yaksa.site`: 관리자 기능 통합

