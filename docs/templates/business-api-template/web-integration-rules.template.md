# {Business} Web Integration Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: {date}

이 문서는 {business}-web과 {business}-api 간의 연동 규칙을 정의합니다.
**설명이 아닌 준수 규칙**이며, 위반 시 즉시 작업 중단 대상입니다.

---

## 1. 역할 분리 원칙

### 1.1 구성 요소별 책임

| 구성 요소 | 책임 | 금지 |
|-----------|------|------|
| **{business}-web** | UI/UX, 상태 표현, 사용자 상호작용 | 비즈니스 로직, DB 접근 |
| **{business}-api** | 비즈니스 로직, 검증, DB CRUD | JWT 발급, 사용자 관리 |
| **core-api** | 인증, 권한, 사용자 관리 | 도메인 비즈니스 로직 |

---

## 2. 호출 규칙

### 2.1 허용 호출 경로

```
Browser → {business}-web → {business}-api → (필요 시) Core API
                                  │
                                  ▼
                           {Business} DB
```

### 2.2 금지 호출 경로

| 경로 | 상태 | 이유 |
|------|------|------|
| Browser → {business}-api | ❌ **금지** | CORS, 보안 |
| {business}-web → core-api | ❌ **금지** | 계층 분리 (로그인 제외) |
| {business}-api → {business}-web | ❌ **금지** | 역방향 |
| core-api → {business}-api | ❌ **금지** | 역방향 |

---

## 3. 인증/권한 규칙

### 3.1 인증 흐름

```
[로그인]
Browser → {business}-web → core-api → JWT 발급
                              │
                              ▼
                    {business}-web에 JWT 전달
                              │
                              ▼
                    localStorage/cookie 저장

[API 호출]
{business}-web → {business}-api
    │
    └── Header: Authorization: Bearer <JWT>
```

### 3.2 JWT 처리 원칙

| 역할 | {business}-web | {business}-api | core-api |
|------|----------------|----------------|----------|
| JWT 발급 | ❌ | ❌ | ✅ |
| JWT 저장 | ✅ | ❌ | ❌ |
| JWT 전달 | ✅ | ✅ (검증 후) | - |
| JWT 검증 | ❌ | ✅ | ✅ |
| JWT 갱신 | 요청만 | ❌ | ✅ |

### 3.3 Scope 규칙

{business}-web이 요청하는 API는 아래 Scope만 사용:

```
{business}:read      # 조회
{business}:write     # 수정 (관리자)
{business}:admin     # 관리 기능
```

---

## 4. 라우팅 규칙

### 4.1 {business}-web 라우트 구조

```
/                       # 메인 페이지
/resources              # 리소스 목록
/resources/:id          # 리소스 상세
/admin                  # 관리자 대시보드 (권한 필요)
/admin/resources        # 리소스 관리
/admin/resources/new    # 리소스 등록
/admin/resources/:id    # 리소스 수정
```

### 4.2 금지 라우트

```
/api/*                  ❌  # 웹에서 API 라우트 처리 금지
/auth/*                 ❌  # 인증 라우트는 Core 담당
/users/*                ❌  # 사용자 관리는 Core 담당
```

### 4.3 API Base URL 설정

```typescript
// 환경변수로만 설정 (하드코딩 금지)
const API_BASE_URL = process.env.{BUSINESS}_API_URL;

// 금지: 하드코딩
const API_BASE_URL = 'https://api.{business}.example.com';  // ❌
```

---

## 5. 에러 처리 규칙

### 5.1 에러 처리 책임

| 계층 | 책임 |
|------|------|
| {business}-api | 의미 있는 HTTP Status + 에러 코드 반환 |
| {business}-web | 사용자 친화적 메시지 표시 |

### 5.2 HTTP Status 매핑

| Status | {business}-web 처리 |
|--------|---------------------|
| 400 | 입력 오류 안내 |
| 401 | 로그인 페이지 리다이렉트 |
| 403 | 권한 없음 안내 |
| 404 | 404 페이지 표시 |
| 409 | 충돌 상황 안내 |
| 500 | 일반 오류 안내 |

---

## 6. 금지 사항 (절대 규칙)

### 6.1 {business}-web 금지 목록

| 금지 사항 | 이유 |
|-----------|------|
| 비즈니스 검증 로직 구현 | API 책임 |
| DB/ORM 직접 접근 | 계층 분리 |
| Core 설정 직접 참조 | 도메인 분리 |
| JWT 발급/검증 | Core 책임 |
| API URL 하드코딩 | 환경 분리 |
| 다른 API 직접 호출 | 계층 분리 |

---

## 7. 환경변수 규칙

### 7.1 필수 환경변수

```bash
# {business}-web 필수
{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
CORE_API_URL=https://api.neture.co.kr

# 클라이언트용
NEXT_PUBLIC_{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
```

### 7.2 금지

```bash
# 하드코딩 URL
const API_URL = 'https://...'  ❌

# JWT 시크릿 (발급 금지)
JWT_SECRET=...  ❌
```

---

## 8. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| Browser → API 직접 호출 | 즉시 제거 |
| Web에서 비즈니스 로직 | API로 이전 |
| Web에서 DB 접근 | 즉시 제거, 재설계 |
| 하드코딩 URL | 환경변수로 변경 |
| Core API 직접 호출 | {business}-api 경유로 변경 |

---

## 9. 참조 문서

- docs/architecture/business-api-template.md
- docs/services/{business}/api-rules.md
- docs/services/{business}/openapi.yaml
- docs/services/{business}/deployment-boundary.md
- CLAUDE.md §15 Business API Template Rules

---

*이 문서는 규칙이며, 모든 {business}-web 개발은 이 문서를 기준으로 검증됩니다.*
