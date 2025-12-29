# Business API Template Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 모든 Business API의 공통 헌법입니다.
새로운 비즈니스 API는 반드시 이 규칙을 준수해야 합니다.

---

## 1. 적용 대상

### 1.1 현재 적용 API

| API | 도메인 | 상태 |
|-----|--------|------|
| cosmetics-api | 화장품 비즈니스 | Active (템플릿 원본) |
| yaksa-api | 약사 서비스 | Planned |
| dropshipping-api | 드롭십핑 | Planned |
| tourism-api | 관광 서비스 | Planned |

### 1.2 적용 기준

다음 조건을 **모두** 만족하면 Business API 규칙 적용:

- Core API가 아닌 도메인 전용 API
- 자체 DB 스키마를 가짐
- 독립 배포 단위

---

## 2. 공통 원칙 (Constitutional Rules)

### 2.1 역할 분리

```
┌─────────────────────────────────────────────────────────────────┐
│                      Business API 역할                           │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 자신의 비즈니스 로직                                          │
│  ✅ 자신의 DB (읽기/쓰기)                                         │
│  ✅ JWT 검증 (verify only)                                       │
│  ✅ 감사 로그 기록                                                │
├─────────────────────────────────────────────────────────────────┤
│  ❌ 사용자/권한/인증 처리 (Core 책임)                              │
│  ❌ JWT 발급/갱신 (Core 책임)                                     │
│  ❌ Core DB 쓰기 (절대 금지)                                      │
│  ❌ 다른 Business API 호출 (결합 방지)                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 계층 구조

```
Browser → {business}-web → {business}-api → (필요 시) Core API
                                  │
                                  ▼
                          {business} DB
```

### 2.3 DB 소유권

| 원칙 | 설명 |
|------|------|
| 독립 스키마 | 각 Business는 자체 DB 스키마 소유 |
| Prefix 필수 | 모든 테이블은 `{business}_` prefix |
| FK 금지 | Core 테이블에 FK 제약 설정 금지 |
| 참조만 허용 | `user_id`는 UUID 문자열로만 저장 |

---

## 3. API 규칙 (공통)

### 3.1 허용 API 패턴

```yaml
# Public API (인증 불필요)
GET /{business}/{resources}
GET /{business}/{resources}/{id}
GET /{business}/{resources}/search

# Admin API (인증 필요)
POST /{business}/admin/{resources}
PUT /{business}/admin/{resources}/{id}
PATCH /{business}/admin/{resources}/{id}/{action}
DELETE /{business}/admin/{resources}/{id}

# Log API (인증 필요)
GET /{business}/admin/logs/{entity}
```

### 3.2 금지 API 패턴

```yaml
# 절대 금지
POST /{business}/users              ❌
POST /{business}/auth/*             ❌
GET  /{business}/settings           ❌
POST /{business}/orders             ❌ (E-commerce Core 책임)
*    /{business}/roles              ❌
*    /{business}/permissions        ❌
```

### 3.3 Scope 규칙

각 Business는 자신의 scope만 사용:

```yaml
{business}:read      # 조회
{business}:write     # 수정
{business}:admin     # 관리
```

---

## 4. 인증 규칙 (공통)

### 4.1 JWT 처리

| 허용 | 금지 |
|------|------|
| JWT 검증 (verify) | JWT 발급 (sign) |
| user_id 추출 | 토큰 갱신 (refresh) |
| Scope 확인 | 새 토큰 생성 |

### 4.2 인증 흐름

```
[로그인]
Browser → {business}-web → Core API → JWT 발급
                              │
                              ▼
                    {business}-web에 JWT 전달

[API 호출]
{business}-web → {business}-api (Bearer JWT)
                        │
                   JWT 검증
                        │
                  비즈니스 처리
```

---

## 5. 데이터 접근 규칙 (공통)

### 5.1 DB 접근 권한

| DB | 읽기 | 쓰기 |
|----|------|------|
| {business} DB | ✅ | ✅ |
| Core DB | ⚠️ 제한적 | ❌ 절대 금지 |

### 5.2 Core DB 읽기 허용

```sql
-- 허용 (감사 로그용)
SELECT id, name FROM users WHERE id = ?

-- 금지 (민감정보)
SELECT email, phone, password FROM users  ❌
SELECT * FROM roles                        ❌
SELECT * FROM permissions                  ❌
SELECT * FROM settings                     ❌
```

### 5.3 테이블 네이밍

```sql
-- 필수: prefix 사용
{business}_products
{business}_categories
{business}_price_policies
{business}_audit_logs

-- 금지: prefix 없음
products              ❌
categories            ❌
```

---

## 6. 통신 규칙 (공통)

### 6.1 허용 통신

```
✅ {business}-web → {business}-api
✅ {business}-web → Core API (로그인만)
✅ {business}-api → Core API (읽기, 필요 시)
```

### 6.2 금지 통신

```
❌ Core API → {business}-api (역방향)
❌ {business}-api → other-business-api (타 비즈니스)
❌ {business}-api → Core 내부 모듈 (직접 import)
❌ Browser → {business}-api (직접 호출)
```

---

## 7. 배포 규칙 (공통)

### 7.1 독립 배포 원칙

| 원칙 | 설명 |
|------|------|
| 독립 서비스 | 각 Business API는 독립 Cloud Run 서비스 |
| 독립 빌드 | Core 변경과 무관하게 빌드 |
| 독립 버전 | Core 버전과 독립적 버전 관리 |

### 7.2 마이그레이션 규칙

```bash
# 허용: 자신의 마이그레이션만
{business}-api → {business} DB 마이그레이션

# 금지: Core 마이그레이션
{business}-api → Core DB 마이그레이션 ❌

# 금지: 동시 실행
{business} 마이그레이션 + Core 마이그레이션 ❌
```

### 7.3 환경변수 규칙

```bash
# 필수 환경변수
PORT=300X
NODE_ENV=production
DB_HOST=...
DB_NAME={business}
JWT_PUBLIC_KEY=...

# 금지 환경변수
JWT_SECRET=...        ❌ (발급 금지)
CORE_DB_PASSWORD=...  ❌ (Core DB 쓰기 금지)
```

---

## 8. OpenAPI 규칙 (공통)

### 8.1 OpenAPI의 지위

| 원칙 | 설명 |
|------|------|
| 단일 진실 | `openapi.yaml`이 유일한 API 계약 |
| 계약 우선 | 코드와 충돌 시 → 코드가 틀린 것 |
| CI 강제 | 계약 위반 시 빌드 실패 |

### 8.2 금지 스키마

```yaml
# 절대 금지
User:               ❌
Auth:               ❌
Token:              ❌
Role:               ❌
Permission:         ❌
Settings:           ❌
type: any           ❌
additionalProperties: true  ❌
```

### 8.3 필수 구조

```yaml
# 응답 구조
SingleResponse:
  type: object
  required: [data]
  properties:
    data: { $ref: '#/...' }

ListResponse:
  type: object
  required: [data, meta]
  properties:
    data: { type: array }
    meta: { $ref: '#/.../PaginationMeta' }

ErrorResponse:
  type: object
  required: [error]
  properties:
    error:
      type: object
      required: [code, message]
```

---

## 9. 에러 처리 규칙 (공통)

### 9.1 에러 코드 패턴

```
{BUSINESS}_001    # 첫 번째 비즈니스 에러
{BUSINESS}_002    # 두 번째 비즈니스 에러
{BUSINESS}_401    # 인증 필요
{BUSINESS}_403    # 권한 없음
{BUSINESS}_500    # 서버 오류
```

### 9.2 에러 응답 형식

```json
{
  "error": {
    "code": "{BUSINESS}_001",
    "message": "Resource not found",
    "details": {}
  }
}
```

---

## 10. 템플릿 사용 절차

### 10.1 새 Business API 생성 절차

```bash
# 1. 템플릿 복사
cp -r docs/templates/business-api-template docs/services/{business}/

# 2. 파일 내 {business} 치환
sed -i 's/{business}/cosmetics/g' docs/services/{business}/*.md
sed -i 's/{BUSINESS}/COSMETICS/g' docs/services/{business}/*.md

# 3. OpenAPI 엔드포인트 정의
vim docs/services/{business}/openapi.yaml

# 4. DB prefix 확인
# 모든 테이블: {business}_*

# 5. CLAUDE.md 규칙 확인
# §11-14 규칙 자동 적용
```

### 10.2 금지 절차

```bash
# 금지: 빈 프로젝트에서 시작
mkdir apps/{business}-api && cd ...  ❌

# 금지: 템플릿 없이 OpenAPI 작성
vim openapi.yaml  ❌

# 금지: 규칙 문서 없이 개발
# API 먼저 구현  ❌
```

---

## 11. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 템플릿 미사용 | 개발 중단, 템플릿에서 재시작 |
| 금지 API 구현 | 즉시 삭제 |
| Core DB 쓰기 | 롤백 및 재설계 |
| 타 Business 호출 | 제거 |
| OpenAPI 미정의 API | CI 실패, 병합 불가 |

---

## 12. 참조 문서

### 12.1 템플릿 디렉터리

```
docs/templates/business-api-template/
├── openapi.template.yaml
├── api-rules.template.md
├── web-integration-rules.template.md
├── deployment-boundary.template.md
├── service-flow.template.md
└── README.md
```

### 12.2 구현 예시 (cosmetics)

```
docs/services/cosmetics/
├── openapi.yaml
├── api-definition.md
├── service-flow.md
├── web-api-contract.md
├── deployment-boundary.md
├── openapi.rules.md
└── contract-validation.md
```

### 12.3 CLAUDE.md 섹션

- §11 Cosmetics Domain Rules
- §12 Cosmetics API Rules
- §13 Cosmetics Web Integration Rules
- §14 API Contract Enforcement Rules
- §15 Business API Template Rules

---

*이 문서는 모든 Business API의 공통 헌법이며, 위반 시 즉시 작업 중단 대상입니다.*
