# {Business} Service Flow

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: {date}

이 문서는 {Business} 서비스의 통신 흐름, 인증 흐름, 데이터 흐름을 정의합니다.

---

## 1. 서비스 구성

### 1.1 구성 요소

| 구성 요소 | 역할 | 기술 스택 |
|-----------|------|-----------|
| {business}-web | 프론트엔드 | React/Next.js |
| {business}-api | 백엔드 API | NestJS |
| {Business} DB | 비즈니스 데이터 | PostgreSQL |
| Core API | 플랫폼 인증/설정 | NestJS |
| Core DB | 사용자/권한 데이터 | PostgreSQL |

### 1.2 서비스 관계도

```
┌─────────────────────────────────────────────────────────────────┐
│                         사용자 브라우저                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        {business}-web                            │
│  (React/Next.js 프론트엔드)                                       │
│  - 도메인 화면                                                    │
│  - 관리자 대시보드                                                │
│  - JWT 저장 및 전달                                               │
└─────────────────────────────────────────────────────────────────┘
                │                               │
                │ API 요청                       │ 로그인 요청
                │ (Bearer JWT)                  │
                ▼                               ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│       {business}-api      │    │          Core API             │
│  (NestJS 백엔드)          │◄───│  (인증/사용자 관리)            │
│                           │    │                               │
│  - 도메인 CRUD            │    │  - 로그인 처리                 │
│  - 비즈니스 검증          │    │  - JWT 발급                   │
│  - JWT 검증 (verify only) │    │  - 사용자 정보 제공            │
└───────────────────────────┘    └───────────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│      {Business} DB        │    │          Core DB              │
│  ({business}_* 테이블)    │    │  (users, roles 테이블)        │
│                           │    │                               │
│  - {business}_resources   │    │  - users (읽기만 허용)        │
│  - {business}_categories  │    │  - 쓰기 절대 금지             │
│  - {business}_logs        │    │                               │
└───────────────────────────┘    └───────────────────────────────┘
```

---

## 2. 인증 흐름

### 2.1 로그인 흐름

```
[사용자] ──(1)──▶ [{business}-web] ──(2)──▶ [Core API]
                                              │
                                         (3) JWT 발급
                                              │
[사용자] ◀──(5)── [{business}-web] ◀──(4)──────┘
   │
   │ JWT 저장 (localStorage/cookie)
   ▼
```

### 2.2 API 요청 흐름 (인증 필요)

```
[사용자] ──(1)──▶ [{business}-web] ──(2)──▶ [{business}-api]
                                              │
                                         (3) JWT 검증
                                              │
                                         (4) 비즈니스 로직
                                              │
                                         (5) DB 조회/수정
                                              │
[사용자] ◀──(7)── [{business}-web] ◀──(6)──────┘
```

### 2.3 JWT 검증 상세

```
┌─────────────────────────────────────────────────────────────────┐
│                      {business}-api JWT 검증                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ Authorization 헤더     │
                    │ Bearer <JWT>          │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │ JWT 서명 검증          │
                    │ (Core 공개키 사용)     │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
        검증 실패          검증 성공           만료됨
              │                 │                 │
              ▼                 ▼                 ▼
    401 Unauthorized    Scope 확인        401 Token Expired
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        {business}:read  {business}:write  {business}:admin
```

---

## 3. 데이터 흐름

### 3.1 조회 흐름 (Public)

```
[사용자] ──▶ [{business}-web] ──▶ [{business}-api] ──▶ [{Business} DB]
    │                                                       │
    │                                                  resources
    │                                                  categories
    │                                                       │
[화면] ◀── [응답 데이터] ◀────────────────────────────────────┘
```

**특징**:
- 인증 불필요 (Public API)
- Core DB 접근 없음
- {Business} DB만 조회

### 3.2 등록 흐름 (Admin)

```
[관리자] ──▶ [{business}-web] ──▶ [{business}-api]
                                      │
                                 JWT 검증
                                      │
                            {business}:admin 확인
                                      │
                              ┌───────┴───────┐
                              │               │
                       유효성 검증      관계 확인
                              │               │
                              └───────┬───────┘
                                      │
                              [{Business} DB]
                                      │
                               resources INSERT
                                      │
                              [감사 로그 저장]
                                      │
                                      ▼
[화면 업데이트] ◀── [생성 결과] ◀─────────┘
```

---

## 4. 상태 전이 흐름

### 4.1 리소스 상태 전이

```
                    ┌──────────────────┐
                    │      draft       │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              │              ▼
       ┌─────────────┐       │       ┌─────────────┐
       │   active    │◀──────┴──────▶│  inactive   │
       └──────┬──────┘               └──────┬──────┘
              │                             │
              │         ┌───────────────────┤
              │         │                   │
              ▼         ▼                   ▼
       ┌─────────────────────────────────────────┐
       │               archived                   │
       └─────────────────────────────────────────┘
```

**상태 전이 API**:

```
PATCH /{business}/admin/resources/:id/status
{
  "status": "active",
  "reason": "활성화"
}
```

---

## 5. 통신 제약 규칙

### 5.1 허용 통신

```
✅ {business}-web → {business}-api
✅ {business}-web → core-api (로그인만)
✅ {business}-api → core-api (필요 시, 읽기만)
```

### 5.2 금지 통신

```
❌ core-api → {business}-api (역방향)
❌ {business}-api → other-business-api (타 비즈니스)
❌ {business}-api → core 내부 모듈 (직접 import)
```

### 5.3 DB 접근 제약

```
┌─────────────────────────────────────────────────────────────────┐
│                        {business}-api                            │
├─────────────────────────────────────────────────────────────────┤
│  {Business} DB   │  Core DB                                     │
│  ───────────     │  ────────                                    │
│  READ    ✅      │  users.id, users.name 읽기 ✅               │
│  WRITE   ✅      │  users 민감정보 읽기 ❌                      │
│  DELETE  ✅      │  WRITE ❌ (절대 금지)                        │
│                  │  roles, permissions ❌                       │
│                  │  apps, settings ❌                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 참조 문서

- docs/services/{business}/api-rules.md
- docs/services/{business}/openapi.yaml
- docs/services/{business}/web-integration-rules.md
- docs/services/{business}/deployment-boundary.md
- CLAUDE.md §15 Business API Template Rules

---

*이 문서는 {Business} 서비스 개발 및 운영 시 반드시 준수해야 하는 통신/흐름 규칙입니다.*
