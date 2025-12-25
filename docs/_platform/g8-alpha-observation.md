# G8 Alpha Observation Log

> **Status**: Active (Observation Phase)
> **Created**: 2025-12-25
> **Purpose**: 리팩토링 근거 수집 (리팩토링 실행 아님)

---

## 1. 이 문서의 목적

G7 Forum Service Alpha 구현 과정에서 발견한:
- 불편한 점
- 반복 작업
- Reference에 있었으면 좋았을 것
- 다음 앱에서도 100% 동일하게 할 작업

**중요**: 이 문서는 리팩토링 계획이 아님. 근거 수집만 함.

---

## 2. Forum API Alpha 관찰

### 2.1 반복된 작업

| 작업 | 횟수 | 비고 |
|------|------|------|
| Validation 유틸 작성 | 1 | 다음 앱에서도 필요할 것 |
| Error 응답 유틸 작성 | 1 | 다음 앱에서도 필요할 것 |
| UserContext에 name 추가 | 1 | Reference에 없었음 |

### 2.2 불편했던 점

| 항목 | 설명 |
|------|------|
| UserContext 타입 불완전 | Reference의 UserContext에 name이 없어서 추가 필요 |
| console.log CI 실패 | main.ts가 예외 목록에 없었음 (수정 완료) |

### 2.3 다음 앱에서도 100% 동일할 것

- [ ] Express 기본 설정 (helmet, cors, compression)
- [ ] Health 엔드포인트 구조
- [ ] Auth middleware 패턴
- [ ] Error 응답 형식 (success: false, error: { code, message })

### 2.4 Reference에 있었으면 좋았을 것 (후보)

| 후보 | 이유 | 판정 대기 |
|------|------|-----------|
| validation 유틸 기본 구조 | 모든 앱에서 입력 검증 필요 | 2번째 앱에서 확인 |
| error 응답 유틸 | 일관된 에러 형식 필요 | 2번째 앱에서 확인 |
| UserContext.name | 사용자 이름 표시 필수 | 2번째 앱에서 확인 |

---

## 3. Forum Web Alpha 관찰

### 3.1 반복된 작업

| 작업 | 횟수 | 비고 |
|------|------|------|
| package.json name/port 변경 | 1 | 필수 절차 (문서화됨) |
| README 재작성 | 1 | Reference용 → 앱용 |
| 서비스 함수 타입 정의 | 1 | API 응답 타입 |

### 3.2 불편했던 점

| 항목 | 설명 |
|------|------|
| Reply 타입 없음 | Reference에 Thread만 있고 Reply 없었음 |
| 서비스 함수 반환 타입 | Promise 타입 명시 필요 |

### 3.3 다음 앱에서도 100% 동일할 것

- [ ] AuthContext 패턴
- [ ] authClient.api 사용 패턴
- [ ] 페이지 구조 (pages/, components/, hooks/, services/)
- [ ] Tailwind 설정

### 3.4 Reference에 있었으면 좋았을 것 (후보)

| 후보 | 이유 | 판정 대기 |
|------|------|-----------|
| CRUD hooks 템플릿 | useCreate, useList, useDetail 패턴 반복 | 2번째 앱에서 확인 |
| 에러 처리 패턴 | axios error → 한국어 메시지 변환 | 2번째 앱에서 확인 |
| Form 유효성 표시 UI | 입력 오류 표시 패턴 | 2번째 앱에서 확인 |

---

## 4. 리팩토링 판정 기준 (고정)

리팩토링은 아래 조건이 **모두** 충족될 때만 시작:

1. ✅ G7 완료 (Forum Service Alpha)
2. ⬜ 두 번째 도메인 앱 완료 (예: Commerce API)
3. ⬜ 같은 불편이 2번 이상 반복 확인
4. ⬜ "안 고치면 확장이 느려진다" 증명

---

## 5. 관찰 이력

| 날짜 | Phase | 앱 | 관찰 항목 수 |
|------|-------|-----|-------------|
| 2025-12-25 | G7 | Forum API/Web | 초기 관찰 |

---

## 6. 다음 단계

두 번째 Alpha 앱 구현 시 이 문서에 추가 관찰 기록.
동일한 불편이 반복되면 리팩토링 후보로 승격.

---

*This document is part of the G8 Phase - Alpha Observation.*
*It does NOT authorize refactoring. It only collects evidence.*
