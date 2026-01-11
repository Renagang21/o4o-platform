# Business Service Rules (Mandatory)

> **CLAUDE.md §14-17에서 분리된 상세 규칙**
> 이 문서는 CLAUDE.md의 보조 문서입니다.

---

## 1. API Contract Enforcement (§14)

> OpenAPI 스펙은 **문서가 아니라 계약**이며,
> 코드보다 우선한다. 계약 위반 코드는 **빌드/배포 단계에서 차단**된다.

### 1.1 OpenAPI의 지위

| 원칙 | 설명 |
|------|------|
| 단일 진실 원본 | `openapi.yaml`이 API 계약의 유일한 기준 |
| 계약 우선 | 코드와 스펙 충돌 시 → 코드가 틀린 것 |
| CI 강제 | 계약 위반 시 빌드 실패 |

### 1.2 허용/금지 스키마

| 허용 | 금지 |
|------|------|
| 도메인 비즈니스 스키마 | User/Auth 스키마 |
| 명시적 타입 정의 | `any`, `additionalProperties: true` |
| `cosmetics:*` scope | `users:*`, `admin:*` scope |

### 1.3 HTTP 상태코드 규칙

허용 상태코드: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `500`

```yaml
# 금지: 의미 없는 200
responses:
  '200':
    description: OK  ❌

# 필수: 명확한 스키마
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Response'  ✅
```

### 1.4 CI 검증 규칙

| 대상 | 검증 항목 | 실패 시 |
|------|-----------|---------|
| API | OpenAPI에 없는 라우트 | 빌드 실패 |
| API | 응답 스키마 불일치 | 빌드 실패 |
| Web | OpenAPI에 없는 API 호출 | 빌드 실패 |
| Web | 요청/응답 타입 불일치 | 빌드 실패 |

### 1.5 변경 프로세스

```
1. OpenAPI 스펙 먼저 업데이트 (Phase 승인)
2. 타입 재생성
3. API/Web 구현
4. CI 통과 확인
5. 병합
```

**금지**: 코드 먼저 구현 후 스펙 업데이트

---

## 2. Business API Template (§15)

> 모든 Business API는 **템플릿에서 시작**해야 하며,
> 임의 생성은 금지된다.

### 2.1 적용 대상

| API | 상태 |
|-----|------|
| cosmetics-api | Active (템플릿 원본) |
| yaksa-api | Planned |
| dropshipping-api | Planned |
| tourism-api | Planned |
| 이후 모든 business-api | 필수 적용 |

### 2.2 공통 원칙

| 원칙 | 설명 |
|------|------|
| 자신의 DB만 소유 | `{business}_` prefix 테이블 |
| Core 의존 최소화 | 인증·권한만 Core 사용 |
| OpenAPI 계약 필수 | 단일 진실 원본 |
| 독립 배포 | Core와 분리된 Cloud Run 서비스 |

### 2.3 금지 사항 (공통)

| 금지 | 이유 |
|------|------|
| 사용자/권한/인증 처리 | Core 책임 |
| Core DB 쓰기 | 절대 금지 |
| 다른 Business API 호출 | 결합 방지 |
| OpenAPI 미정의 API | 계약 위반 |
| 템플릿 없이 생성 | 표준화 위반 |

### 2.4 템플릿 사용 절차

```bash
# 1. 템플릿 복사
cp -r docs/templates/business-api-template docs/services/{business}/

# 2. 플레이스홀더 치환
sed -i 's/{business}/cosmetics/g' *.md *.yaml

# 3. OpenAPI 정의
vim openapi.yaml

# 4. 규칙 확인 후 개발
```

---

## 3. Business Web Template (§16)

> 모든 Business Web은 **템플릿에서 시작**해야 하며,
> 임의 생성은 금지된다.

### 3.1 적용 대상

| Web | 상태 |
|-----|------|
| cosmetics-web | **Active (Reference Implementation)** |
| yaksa-web | Planned |
| dropshipping-web | Planned |
| tourism-web | Planned |
| 이후 모든 business-web | 필수 적용 |

### 3.2 역할 정의

| 허용 | 금지 |
|------|------|
| UI 렌더링 및 사용자 상호작용 | 비즈니스 로직 구현 |
| API 응답 데이터 표시 | 데이터 검증 (형식만 허용) |
| 폼 입력 수집 및 API 전달 | DB/ORM 직접 접근 |
| JWT 보관 및 전달 | JWT 발급/검증 |

### 3.3 호출 규칙

| 허용 | 금지 |
|------|------|
| Browser → {business}-web | Browser → {business}-api 직접 |
| {business}-web → {business}-api | {business}-web → Core API 직접 |
| {business}-web → Core (로그인만) | {business}-web → 타 business-api |

### 3.4 JWT 처리 규칙

| 역할 | 허용/금지 |
|------|-----------|
| JWT 저장 | ✅ (localStorage 또는 httpOnly cookie) |
| JWT 전달 | ✅ (Authorization 헤더) |
| JWT 만료 확인 | ✅ (exp 클레임 확인만) |
| JWT 발급 | ❌ |
| JWT 서명 검증 | ❌ |

### 3.5 라우팅 규칙

**허용 패턴**:
```
/                     # 메인 페이지
/{entities}           # 목록 페이지
/{entities}/{id}      # 상세 페이지
/admin/{entities}     # 관리 페이지
```

**금지 패턴**:
```
/api/*                ❌  # API 라우트 처리 금지
/auth/*               ❌  # Core 담당
/users/*              ❌  # Core 담당
/settings/*           ❌  # Core 담당
```

---

## 4. Multi-Business Operations (§17)

> 여러 Business 서비스가 동시에 운영될 때의 규칙.
> 서비스 간 격리 및 독립성을 보장해야 한다.

### 4.1 독립성 원칙

| 원칙 | 설명 |
|------|------|
| 배포 독립 | 각 서비스는 독립 배포 단위 |
| 데이터 독립 | 각 서비스는 자체 DB/스키마 소유 |
| 장애 격리 | 하나의 장애가 다른 서비스에 영향 없음 |
| 버전 독립 | 각 서비스는 독립 버전 관리 |

### 4.2 금지 통신 경로

| 금지 경로 | 이유 |
|-----------|------|
| cosmetics-api → yaksa-api | 서비스 간 직접 호출 금지 |
| cosmetics-web → yaksa-api | 타 서비스 API 호출 금지 |
| cosmetics-api → yaksa_db | 타 서비스 DB 접근 금지 |
| Core API → {business}-api | 역방향 호출 금지 |

### 4.3 DB 분리 규칙

| 원칙 | 설명 |
|------|------|
| 전용 DB/스키마 | 각 서비스는 자체 DB 소유 |
| 테이블 네이밍 | `{business}_` 접두사 필수 |
| FK 금지 | 타 서비스 테이블에 FK 설정 금지 |
| 직접 접근 금지 | API를 통해서만 데이터 접근 |

### 4.4 Scope 분리

각 서비스는 자체 Scope 네임스페이스를 가진다:

```
cosmetics:read, cosmetics:write, cosmetics:admin
yaksa:read, yaksa:write, yaksa:admin
dropshipping:read, dropshipping:write, dropshipping:admin
tourism:read, tourism:write, tourism:admin
```

### 4.5 개발 환경 포트 할당

| 서비스 | Web 포트 | API 포트 |
|--------|----------|----------|
| Core | - | 3001 |
| cosmetics | 4001 | 4002 |
| yaksa | 4011 | 4012 |
| dropshipping | 4021 | 4022 |
| tourism | 4031 | 4032 |

---

## 5. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| OpenAPI에 없는 API 구현 | CI 실패, 병합 불가 |
| 금지 스키마 포함 | 즉시 제거 |
| 승인 없는 스펙 변경 | 롤백 |
| 템플릿 미사용 | 개발 중단, 재시작 |
| 금지 API 구현 | 즉시 삭제 |
| Core DB 쓰기 | 롤백 |
| 타 Business 호출 | 제거 |
| 서비스 간 직접 호출 | 즉시 제거 |
| 타 서비스 DB 접근 | 즉시 제거 및 재설계 |

---

## 참조 문서

- 📄 템플릿 디렉터리 (API): `docs/templates/business-api-template/`
- 📄 템플릿 디렉터리 (Web): `docs/templates/business-web-template/`
- 📄 공통 규칙: `docs/architecture/business-api-template.md`
- 📄 Multi-Business 규정: `docs/architecture/multi-business-operations.md`

---

*Phase 9-A (2026-01-11) - CLAUDE.md 정리*
