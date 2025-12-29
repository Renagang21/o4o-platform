# G10.5 Reference Adoption Verification

> **Status**: Complete
> **Created**: 2025-12-25
> **Purpose**: G11 필요성 판정

---

## 1. 검증 목적

G10에서 개선된 app-api-reference가 "기준"으로서 실제 적용 가능한 상태인지 검증.

---

## 2. Reference 일관성 검증

### 2.1 validation.ts 비교

| 항목 | Reference (G10) | Forum API | Commerce API | 상태 |
|------|-----------------|-----------|--------------|------|
| ValidationError | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| ValidationResult | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| PAGINATION_LIMITS | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| validatePagination | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| 도메인 validators | 없음 | validateCreateThread, validateCreateReply | validateCreateOrder | 정상 (앱별 확장) |

**결론**: validation 기본 구조 100% 일치. 도메인별 확장은 의도된 차이.

### 2.2 errors.ts 비교

| 항목 | Reference (G10) | Forum API | Commerce API | 상태 |
|------|-----------------|-----------|--------------|------|
| ErrorCodes (기본) | ✅ 12개 | ✅ 동일 + 3개 추가 | ✅ 동일 + 4개 추가 | 정상 (앱별 확장) |
| ApiErrorResponse | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| sendValidationError | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| sendUnauthorizedError | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| sendForbiddenError | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| sendNotFoundError | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| sendInternalError | ✅ | ✅ 동일 | ✅ 동일 | 일치 |
| sendError | ✅ | ✅ 동일 | ✅ 동일 | 일치 |

**주요 차이점**:
- Reference의 `ErrorCode | string` 타입 vs Alpha 앱의 `ErrorCode` 타입
- Reference가 더 유연함 (앱에서 커스텀 코드 사용 가능)

**결론**: error 기본 구조 100% 일치. Reference가 더 확장 가능한 타입 제공.

### 2.3 auth.middleware.ts 비교

| 항목 | Reference (G10) | Forum API | Commerce API | 상태 |
|------|-----------------|-----------|--------------|------|
| UserContext.name | ✅ 있음 | ✅ 있음 | ✅ 있음 | 일치 |
| authenticated 필드 | ✅ authenticated | ✅ authenticated | ✅ authenticated | 일치 |
| CoreAPIVerifyResponse | ✅ 있음 | ✅ 있음 | ✅ 있음 | 일치 |
| isAxiosError 타입가드 | ✅ 있음 | ✅ 있음 | ✅ 있음 | 일치 |
| error: unknown | ✅ unknown | ✅ unknown | ✅ unknown | 일치 |

**결론**: auth.middleware 100% 일치. 구조적 차이 없음.

---

## 3. Adoption 난이도 평가

### 3.1 Forum API → Reference 재적용 시

| 작업 | 영향 파일 | 난이도 |
|------|-----------|--------|
| validation.ts에서 기본 타입/함수 import로 변경 | 1 | 낮음 |
| errors.ts에서 기본 코드 import로 변경 | 1 | 낮음 |
| auth.middleware.ts 교체 | 1 | 낮음 |
| 도메인 validators 유지 | 0 | 없음 |
| 도메인 error codes 유지 | 0 | 없음 |

**총 예상 변경**: 3파일, 주로 import 경로 변경

### 3.2 Commerce API → Reference 재적용 시

| 작업 | 영향 파일 | 난이도 |
|------|-----------|--------|
| validation.ts에서 기본 타입/함수 import로 변경 | 1 | 낮음 |
| errors.ts에서 기본 코드 import로 변경 | 1 | 낮음 |
| auth.middleware.ts 교체 | 1 | 낮음 |

**총 예상 변경**: 3파일, 주로 import 경로 변경

---

## 4. G11 필요성 판정

### 4.1 현재 상태 분석

| 관점 | 현재 상태 | 문제 여부 |
|------|-----------|-----------|
| 코드 동작 | Forum/Commerce 정상 작동 | ❌ 없음 |
| 타입 안전성 | 모든 앱 strict 통과 | ❌ 없음 |
| 유지보수 부담 | utils 중복 존재 | ⚠️ 경미 |
| 확장성 | Reference에서 복사하면 됨 | ❌ 없음 |

### 4.2 G11 수행 시 이점

- utils 중복 제거 (약 300줄)
- Reference import 패턴 확립
- 코드 일관성 향상

### 4.3 G11 수행 시 리스크

- 작동 중인 앱 수정
- 테스트 필요
- 시간 소요

---

## 5. 최종 판정

### ⭕ 선택: **차기 앱부터 적용 (기존 앱 유지)**

**근거**:

1. **동작 문제 없음**: Forum/Commerce API 모두 정상 작동
2. **구조적 일치**: Reference와 Alpha 앱의 핵심 구조가 이미 동일
3. **차이는 중복뿐**: 유일한 차이는 코드 중복이며, 기능적 불일치 아님
4. **리스크 대비 이점 낮음**: G11로 얻는 것은 코드 정리뿐

### 결론

> **G11은 불필요. 차기 앱부터 개선된 Reference 사용.**

---

## 6. 차기 앱 개발 가이드

G10 이후 새 App API 생성 시:

```bash
# 1. Reference 복사
cp -r apps/app-api-reference apps/<new-api>

# 2. 기본 설정 변경
# - package.json: name, port
# - health.routes.ts: service name
# - env.ts: port

# 3. 도메인 라우트 작성
# - utils/validation.ts에 도메인 validator 추가
# - utils/errors.ts에 도메인 error code 추가
# - routes/<domain>.routes.ts 생성

# 4. 타입/빌드 확인
pnpm -F @o4o/<new-api> type-check
pnpm -F @o4o/<new-api> build
```

**중복 작업 제거됨**:
- ~~validation 기본 구조 작성~~ → Reference에서 제공
- ~~errors 기본 구조 작성~~ → Reference에서 제공
- ~~auth.middleware 타입 수정~~ → Reference에서 제공
- ~~health.routes 타입 수정~~ → Reference에서 제공

---

## 7. 정리

| 질문 | 답변 |
|------|------|
| G11 즉시 필요? | **No** |
| 기존 앱 수정 필요? | **No** |
| Reference 기준으로 확정? | **Yes** |
| 다음 앱부터 적용? | **Yes** |

---

*Verification ID: WO-VER-PLATFORM-REFERENCE-ADOPTION-G10-5*
*Completed: 2025-12-25*
