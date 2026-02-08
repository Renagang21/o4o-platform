# Reference Freeze Policy (G6 Phase)

> **Status**: Active (Constitution Level)
> **Created**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-REFERENCE-FREEZE-G6
> **Phase**: G6 - Reference Freezing & Adoption Gate

---

## 1. Overview

이 문서는 O4O Platform의 **기준 구현체(Reference Implementation)**에 대한
동결 정책과 사용 규칙을 정의합니다.

**목적**:
- Reference를 명확히 지정
- Reference 수정 조건 고정
- 새 앱 생성 시 필수 절차 정의
- 위반 기준 명확화

---

## 2. Reference Implementation 목록 (동결)

### 2.1 동결된 Reference

| Reference | 위치 | 용도 | 동결일 |
|-----------|------|------|--------|
| **App API Reference** | `apps/app-api-reference/` | App API 서버 기준 | 2025-12-25 |
| **Web Server Reference** | `apps/web-server-reference/` | 프론트엔드 기준 | 2025-12-25 |

### 2.2 Reference의 정의

Reference는 다음 조건을 모두 만족하는 코드입니다:

1. **아키텍처 문서를 정확히 구현**
2. **복사하면 즉시 동작**
3. **최소 기능만 포함** (과도한 기능 없음)
4. **빌드 및 타입 체크 통과**

### 2.3 Reference가 아닌 것

| 디렉토리 | 이유 |
|----------|------|
| `apps/forum-api/` | Reference를 복사해 만든 **도메인 앱** |
| `apps/admin-dashboard/` | 기존 레거시 구조 |
| `apps/api-server/` | Core API (별도 규칙 적용) |

---

## 3. Reference 동결 규칙

### 3.1 수정 금지 원칙

동결된 Reference는 **기본적으로 수정 금지**입니다.

```
❌ 새 기능 추가
❌ 구조 변경
❌ 의존성 추가
❌ 파일 삭제
```

### 3.2 수정 허용 조건

다음 경우에만 Reference 수정이 허용됩니다:

| 조건 | 허용 범위 |
|------|-----------|
| **버그 수정** | 동작 오류 해결만 |
| **의존성 업데이트** | 보안/호환성 패치만 |
| **아키텍처 문서 변경 반영** | CLAUDE.md 또는 아키텍처 문서가 먼저 변경된 경우 |
| **플랫폼 정책 변경** | 전체 회의/승인 후 |

### 3.3 수정 절차

Reference를 수정해야 할 경우:

```
1. 수정 사유 문서화
2. 아키텍처 문서 먼저 수정 (필요시)
3. feature/reference-update-{reason} 브랜치 생성
4. 수정 후 모든 Reference 동기화 확인
5. PR 리뷰 후 병합
```

---

## 4. Adoption Rule (새 앱 생성 규칙)

### 4.1 새 App API 생성 시

```bash
# 1단계: Reference 복사
cp -r apps/app-api-reference apps/{new-app-api}

# 2단계: 필수 수정 항목
- package.json: name, description 변경
- .env.example: 포트 번호 변경
- src/main.ts: 서버명, 엔드포인트 설명 변경
- src/routes/health.routes.ts: service명 변경
- Dockerfile: 주석 수정

# 3단계: 도메인 로직 추가
- src/routes/{domain}.routes.ts 생성
- src/main.ts에 라우트 등록

# 4단계: 검증
pnpm -F @o4o/{new-app-api} type-check
pnpm -F @o4o/{new-app-api} build
```

### 4.2 새 Web Server 생성 시

```bash
# 1단계: Reference 복사
cp -r apps/web-server-reference apps/{new-web-app}

# 2단계: 필수 수정 항목
- package.json: name, description 변경
- index.html: title 변경
- src/main.tsx: 필요시 Provider 추가

# 3단계: 페이지 및 서비스 추가
- src/pages/{NewPage}.tsx 생성
- src/services/{domain}.service.ts 생성
- src/App.tsx에 라우트 추가

# 4단계: 검증
pnpm -F @o4o/{new-web-app} type-check
pnpm -F @o4o/{new-web-app} build
```

### 4.3 복사 후 금지 사항

| 금지 항목 | 이유 |
|-----------|------|
| `authClient` 제거 | 인증 규칙 위반 |
| Health 엔드포인트 제거 | 배포 규칙 위반 |
| API URL 하드코딩 | 아키텍처 규칙 위반 |
| 직접 axios/fetch 사용 | authClient 우회 |
| 직접 DB 연결 | 계층 규칙 위반 |

---

## 5. Violation Rule (위반 기준)

### 5.1 명확한 위반 (즉시 수정 필요)

| 위반 | 판단 기준 | 조치 |
|------|-----------|------|
| **Reference 미복사** | 새 앱이 빈 디렉토리에서 시작 | 작업 중단 → Reference 복사 |
| **authClient 미사용** | 직접 axios/fetch로 API 호출 | 즉시 수정 |
| **API URL 하드코딩** | 코드에 `https://...` 직접 기재 | 즉시 수정 |
| **Health 엔드포인트 없음** | `/health`, `/health/ready` 미구현 | 즉시 추가 |

### 5.2 허용되는 변형

| 변형 | 허용 조건 |
|------|-----------|
| **새 라우트 추가** | 기존 구조 유지 시 허용 |
| **새 컴포넌트 추가** | 기존 패턴 따를 시 허용 |
| **새 서비스 함수 추가** | authClient.api 사용 시 허용 |
| **스타일 변경** | 기능에 영향 없을 시 허용 |

### 5.3 예외 승인 절차

Reference 규칙을 따를 수 없는 경우:

```
1. 예외 사유 문서화 (docs/exceptions/{app-name}.md)
2. 아키텍처 문서와 충돌 여부 확인
3. 승인 후 작업 진행
4. 예외 코드에 주석으로 사유 기재
```

---

## 6. 검증 체크리스트

### 6.1 App API 검증

```
□ Reference에서 복사했는가?
□ package.json name이 변경되었는가?
□ Health 엔드포인트가 작동하는가?
□ Core API 인증 위임을 사용하는가?
□ type-check가 통과하는가?
□ build가 성공하는가?
```

### 6.2 Web Server 검증

```
□ Reference에서 복사했는가?
□ authClient를 사용하는가?
□ API URL이 하드코딩되지 않았는가?
□ AuthProvider가 적용되었는가?
□ type-check가 통과하는가?
□ build가 성공하는가?
```

---

## 7. Q&A

### Q1: "Reference와 약간 다른 구조가 필요합니다"

**A**: 먼저 Reference를 복사한 후, 필요한 부분만 수정하세요.
구조적 변경이 필요하면 예외 승인 절차를 따르세요.

### Q2: "Reference에 없는 패키지를 추가해도 되나요?"

**A**: 네, 도메인 로직에 필요한 패키지는 추가 가능합니다.
단, 기존 패키지(authClient 등)를 대체하는 것은 금지입니다.

### Q3: "Reference가 오래되어 업데이트가 필요합니다"

**A**: Reference 수정 절차(3.3)를 따라 공식적으로 업데이트하세요.
개별 앱에서 임의로 "더 나은 방식"을 적용하지 마세요.

### Q4: "기존 앱(admin-dashboard 등)도 이 규칙을 따라야 하나요?"

**A**: 기존 앱은 레거시로 분류됩니다.
신규 기능 추가 시에는 Reference 패턴을 따르는 것을 권장합니다.

---

## 8. Reference

- [CLAUDE.md](../../CLAUDE.md) - Platform Constitution
- [app-api-architecture.md](./app-api-architecture.md) - App API 규칙
- [web-server-architecture.md](./web-server-architecture.md) - Web Server 규칙
- [core-boundary.md](./core-boundary.md) - Core/Domain 경계

---

*This document is part of the G6 Phase - Reference Freezing & Adoption Gate.*
*It is subordinate to CLAUDE.md and governs all new app creation.*
