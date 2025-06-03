# 02. 시스템 아키텍처 (개정판)

본 문서는 o4o-platform의 전체 시스템 구성과 기술 스택, 백엔드 분리 구조를 설명합니다.  
전자상거래뿐만 아니라 AI 및 RPA 서비스의 확장을 고려하여 구조화되었습니다.

---

## 🏗️ 전체 구성 개요

플랫폼은 다음과 같은 4계층 아키텍처로 구성됩니다:

1. **프론트엔드 계층**
2. **백엔드 계층 (다중 API 서버)**
3. **CMS 및 콘텐츠 계층**
4. **배포 및 인프라 계층**

---

## 🔹 주요 시스템 구성

### 1. 프론트엔드

| 항목 | 내용 |
|------|------|
| 주요 폴더 | `services/main-site/` |
| 프레임워크 | React, TypeScript, Vite |
| 기능 | 로그인/회원가입, 상품 목록, 등록, 관리자 승인 기능 등 |
| 상태 관리 | Context API (추후 Zustand, Redux 도입 고려) |
| 라우팅 | 역할 기반 분기 (`user`, `seller`, `admin`) |

---

### 2. 백엔드 (다중 API 서버)

| 서비스 종류 | 폴더 경로 | 설명 |
|-------------|-----------|------|
| 커머스 API | `services/ecommerce/api/` | Medusa 기반 상품/주문 API |
| 인증 API | `services/api-server/` | 사용자 인증, 회원가입, 역할 확인 등 공통 API |
| AI API | `services/ai-service/` | 문서요약, 챗봇, 추천 시스템 등 (계획) |
| RPA API | `services/rpa-service/` | 반복 업무 자동화, 스케줄러, 외부 연동 등 (계획) |

---

### 3. 콘텐츠/CMS 계층

| 항목 | 설명 |
|------|------|
| 에디터 | Tiptap 기반 내장형 블록 에디터 (React 통합 예정) |
| CMS (예정) | 필요시 Strapi 또는 자체 구축형 Headless CMS 고려 |

---

### 4. 배포 및 인프라 계층

| 항목 | 내용 |
|------|------|
| 서버 환경 | AWS Lightsail 2개 인스턴스 (webserver, apiserver) |
| 리버스 프록시 | Nginx + PM2 + Serve |
| DB | PostgreSQL (Medusa 연동), 향후 Redis 도입 예정 |
| 인증 토큰 | JWT, 이후 OAuth 또는 Social Login 확장 고려 |

---

## 🔁 시스템 간 연동

- **main-site → api-server**: 로그인, 회원가입, 역할 조회
- **main-site → ecommerce-api**: 상품 등록, 목록, 주문 처리
- **main-site/admin → ai-service**: 콘텐츠 생성, 자동 요약 등 호출
- **seller → rpa-service**: 반복 업무 예약 실행, 자동 발송 등

---

## 📌 향후 확장 고려

- AI 서버는 Python 기반 FastAPI 또는 Node 기반 OpenAI Proxy로 설계
- RPA는 Node/Browser 기반 task runner 또는 n8n.io 연동 고려
- API 게이트웨이 또는 프록시 패턴으로 API 통합 관리 가능성 검토

