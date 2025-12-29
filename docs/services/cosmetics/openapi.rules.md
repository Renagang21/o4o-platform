# Cosmetics OpenAPI Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 Cosmetics OpenAPI 스펙의 작성 및 관리 규칙을 정의합니다.
**OpenAPI는 문서가 아니라 계약**이며, 코드보다 우선합니다.

---

## 1. OpenAPI의 지위

### 1.1 단일 진실 원본 (Single Source of Truth)

| 원칙 | 설명 |
|------|------|
| 계약 우선 | OpenAPI 스펙이 코드보다 우선 |
| 변경 통제 | OpenAPI 변경 = 별도 Phase 승인 필요 |
| 자동 검증 | CI에서 계약 준수 자동 검사 |

### 1.2 OpenAPI 파일 위치

```
docs/services/cosmetics/openapi.yaml  # 유일한 계약 파일
```

---

## 2. 작성 규칙

### 2.1 허용 범위

cosmetics-api는 **OpenAPI에 정의된 엔드포인트만 구현 가능**

```yaml
# 허용: OpenAPI에 정의된 엔드포인트
/cosmetics/products       ✅
/cosmetics/brands         ✅
/cosmetics/admin/prices   ✅

# 금지: OpenAPI에 없는 엔드포인트
/cosmetics/users          ❌
/cosmetics/auth           ❌
/cosmetics/settings       ❌
```

### 2.2 금지 스키마

다음 스키마는 **어떤 형태로든 포함 금지**:

| 금지 스키마 | 이유 |
|-------------|------|
| User 관련 (email, password) | Core 책임 |
| Auth 관련 (token, session) | Core 책임 |
| Role/Permission | Core 책임 |
| Settings/Config | Platform 책임 |

### 2.3 금지 타입

```yaml
# 절대 금지
type: any                     ❌
additionalProperties: true    ❌
oneOf/anyOf (느슨한 검증)      ❌

# 필수 사용
type: object with properties  ✅
additionalProperties: false   ✅ (명시적)
```

---

## 3. HTTP 상태코드 규칙

### 3.1 허용 상태코드

| 코드 | 용도 | 필수 스키마 |
|------|------|-------------|
| 200 | 조회/수정 성공 | data 필드 필수 |
| 201 | 생성 성공 | data 필드 필수 |
| 204 | 삭제 성공 | 본문 없음 |
| 400 | 유효성 검증 실패 | ErrorResponse |
| 401 | 인증 필요 | ErrorResponse |
| 403 | 권한 없음 | ErrorResponse |
| 404 | 리소스 없음 | ErrorResponse |
| 409 | 충돌 (중복 등) | ErrorResponse |
| 500 | 서버 오류 | ErrorResponse |

### 3.2 금지 사항

```yaml
# 금지: 의미 없는 200 반환
responses:
  '200':
    description: OK  # 내용 없음 ❌

# 금지: 잘못된 상태코드
responses:
  '200':
    description: 생성됨  # 201 사용해야 함 ❌
```

---

## 4. Scope 규칙

### 4.1 허용 Scope

cosmetics-api는 **다음 scope만 사용 가능**:

```yaml
security:
  - bearerAuth: [cosmetics:read]    # 조회
  - bearerAuth: [cosmetics:write]   # 수정
  - bearerAuth: [cosmetics:admin]   # 관리
```

### 4.2 금지 Scope

```yaml
# 절대 금지
security:
  - bearerAuth: [users:*]           ❌
  - bearerAuth: [auth:*]            ❌
  - bearerAuth: [admin:*]           ❌
  - bearerAuth: [platform:*]        ❌
```

### 4.3 Scope 명시 규칙

```yaml
# 인증 필요 API: scope 필수 명시
post:
  security:
    - bearerAuth: [cosmetics:admin]  ✅

# Public API: 빈 배열 명시
get:
  security: []  ✅
```

---

## 5. 스키마 작성 규칙

### 5.1 필수 필드

모든 스키마는 **required 명시 필수**:

```yaml
# 올바른 예
ProductSummary:
  type: object
  required:            # 필수 명시 ✅
    - id
    - name
    - status
  properties:
    id:
      type: string
      format: uuid
```

### 5.2 응답 구조 통일

```yaml
# 단일 객체 응답
SingleResponse:
  type: object
  required:
    - data
  properties:
    data:
      $ref: '#/components/schemas/Entity'

# 목록 응답
ListResponse:
  type: object
  required:
    - data
    - meta
  properties:
    data:
      type: array
      items:
        $ref: '#/components/schemas/Entity'
    meta:
      $ref: '#/components/schemas/PaginationMeta'
```

### 5.3 에러 응답 통일

```yaml
ErrorResponse:
  type: object
  required:
    - error
  properties:
    error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object
```

---

## 6. 버전 관리 규칙

### 6.1 버전 변경 조건

| 변경 유형 | 버전 증가 | 승인 필요 |
|-----------|-----------|-----------|
| 새 엔드포인트 추가 | Minor (1.x) | Phase 승인 |
| 기존 스키마 필드 추가 | Minor (1.x) | Phase 승인 |
| 기존 엔드포인트 제거 | Major (x.0) | 별도 Phase |
| 기존 스키마 필드 제거 | Major (x.0) | 별도 Phase |
| 오타/설명 수정 | Patch (1.0.x) | PR 승인 |

### 6.2 하위 호환성 규칙

```yaml
# 허용: 선택적 필드 추가 (하위 호환)
properties:
  new_field:
    type: string
    nullable: true  # nullable로 선택적 추가 ✅

# 금지: 필수 필드 추가 (하위 호환 파괴)
required:
  - new_field  # 기존 클라이언트 파괴 ❌
```

---

## 7. CI 검증 규칙

### 7.1 cosmetics-api 검증

| 검증 항목 | 실패 조건 |
|-----------|-----------|
| 라우트 일치 | OpenAPI에 없는 라우트 존재 |
| 응답 스키마 | 실제 응답이 스키마와 불일치 |
| 상태코드 | 정의되지 않은 상태코드 반환 |

### 7.2 cosmetics-web 검증

| 검증 항목 | 실패 조건 |
|-----------|-----------|
| API 호출 | OpenAPI에 없는 API 호출 |
| 요청 스키마 | 요청 body가 스키마와 불일치 |
| 응답 처리 | 응답 타입이 스키마와 불일치 |

### 7.3 검증 도구

```bash
# OpenAPI 스펙 검증
npx @redocly/cli lint openapi.yaml

# API 계약 테스트
npx dredd openapi.yaml http://localhost:3003

# 타입 생성
npx openapi-typescript openapi.yaml -o types.ts
```

---

## 8. 변경 프로세스

### 8.1 엔드포인트 추가 절차

```
1. Phase 승인 요청
2. OpenAPI 스펙 업데이트 (PR)
3. 타입 재생성
4. API 구현
5. 테스트 추가
6. CI 통과 확인
7. 병합
```

### 8.2 금지 절차

```
# 금지: 코드 먼저 구현
1. API 구현      ❌
2. OpenAPI 업데이트

# 올바른 순서
1. OpenAPI 업데이트 ✅
2. API 구현
```

---

## 9. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| OpenAPI에 없는 API 구현 | CI 실패, 병합 불가 |
| 금지 스키마 포함 | 즉시 제거 |
| 느슨한 타입 사용 | 엄격한 타입으로 변경 |
| 승인 없는 변경 | 롤백 |

---

## 10. 참조 문서

- docs/services/cosmetics/openapi.yaml (계약 원본)
- docs/services/cosmetics/api-definition.md
- docs/architecture/cosmetics-api-rules.md
- CLAUDE.md §14 API Contract Enforcement Rules

---

*이 문서는 규칙이며, 모든 OpenAPI 변경은 이 문서를 기준으로 검증됩니다.*
