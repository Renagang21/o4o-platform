# 🧭 Phase C — Frontend Implementation Execution Order

**Project:** o4o-platform (P0 Zero-Data Refactor)
**Branch:** `feat/user-refactor-p0-zerodata`
**Dependency:** API Server Phase B Deployed (c52566f9)

---

## 0️⃣ 사전 동기화 (필수)

1. 브랜치 동기화 및 CI 확인

   ```bash
   git fetch origin
   git checkout feat/user-refactor-p0-zerodata
   git pull --ff-only origin feat/user-refactor-p0-zerodata
   pnpm install
   pnpm run build --filter main-site
   ```

2. API 서버 환경 연결 확인

   * `NEXT_PUBLIC_API_URL=https://api.neture.co.kr/api/v1`
   * CORS `credentials:true` 활성
   * 브라우저 쿠키 도메인 일치 (`.neture.co.kr`)

---

## 1️⃣ 작업 범위 개요

| 구분             | 목표                 | 주요 작업                                                  |
| :------------- | :----------------- | :----------------------------------------------------- |
| Auth & Session | Phase B /me API 반영 | assignments[] 기반 상태 관리                                 |
| Routing        | 역할 별 라우트 신설        | /apply/{role}, /apply/{role}/status, /dashboard/{role} |
| User UI        | 신청 폼/현황 페이지        | 3종 폼, 상태 페이지, 리디렉션                                     |
| Admin UI       | 신청 관리 페이지          | /admin/enrollments                                     |
| Global         | RoleGuard 및 메뉴 동기화 | assignments 기반 표시 제어                                   |

---

## 2️⃣ 세부 실행 지시

### C-1. 타입 및 API 클라이언트 업데이트

* **packages/auth-client/src/types.ts**

  * `RoleAssignment`, `Enrollment`, `MeResponse` 정의 추가
* **packages/auth-client/src/cookie-client.ts**

  * `getMe()`, `createEnrollment(role, fields)`, `getMyEnrollments()` 메서드 추가
  * 쿠키 기반 요청 (`withCredentials:true`) 설정
* **services/api.ts** (메인 사이트)

  * Bearer → Cookie 전환
  * axios 인스턴스 전역 옵션에 `withCredentials:true`

---

### C-2. AuthContext 리팩토링

* `useAuth()` 에서 `/auth/cookie/me` 응답을 단일 소스로 사용
* 상태 형태 예시:

  ```ts
  user: { id, email, status }, assignments: RoleAssignment[], hasRole(r) => boolean
  ```
* 레거시 `role/roles/activeRole` 모든 참조 제거
* 초기화 시점: 앱 로딩 or 로그인 후 자동 /me 호출

---

### C-3. 라우팅 구조 추가 (`apps/main-site/src/pages`)

| 경로                     | 용도             | 비고                  |
| :--------------------- | :------------- | :------------------ |
| `/apply/supplier`      | 공급자 신청 폼       | POST /enrollments   |
| `/apply/seller`        | 판매자 신청 폼       | POST /enrollments   |
| `/apply/partner`       | 파트너 신청 폼       | POST /enrollments   |
| `/apply/{role}/status` | 신청 상태 페이지      | GET /enrollments/my |
| `/dashboard/{role}`    | 역할 별 대시보드 (목업) | requireRole(role)   |
| `/admin/enrollments`   | 운영자 리뷰 페이지     | GET/PATCH admin API |

> 라우트 등록은 `src/App.tsx` 또는 동등 파일에서 실행.

---

### C-4. RoleGuard / Redirect 정책

* `requireRole(role)` 훅 또는 HOC 작성 (서버 RBAC 보조 용도)
* 대시보드 접근 시 `!hasRole(role)` 이면 `/apply/{role}/status`로 리디렉션
* 승인 전 상태(`pending/on_hold/rejected`)별 메시지 출력 컴포넌트 추가

---

### C-5. 신청 폼 3종

* 공통 컴포넌트 `EnrollmentForm` 생성

  * 필수 필드: agreeTerms, basicInfo (이름/연락처 등)
  * 중복 시 409 → 상태 페이지 리디렉션
  * 422/429 → 토스트 오류 메시지 표시
* 제출 성공 → `/apply/{role}/status` 이동

---

### C-6. 상태 페이지

* `GET /enrollments/my` 데이터 표시 (최근 신청 1건)
* `status` 별 배지 색상/안내문 표시:

  * pending = "심사 중입니다"
  * on_hold = "보완 요청 중"
  * rejected = "승인 거부 – 사유 확인 후 재신청 가능"
  * approved = "승인 완료 – 대시보드로 이동"

---

### C-7. 관리자 화면 (/admin/enrollments)

* 표 + 필터(역할/상태/기간/검색)
* 액션 버튼: Approve / Reject / Hold
* PATCH 전이 후 목록 자동 갱신
* 403 → "권한이 필요합니다" 토스트
* 429 → "요청 빈도가 높습니다" 경고

---

### C-8. 전역 UI 동기화

* 헤더/메뉴: `hasRole()` 결과로 대시보드 탭 노출 제어
* 승인 전에는 "신청하기" 버튼, 승인 후에는 "대시보드" 버튼

---

## 3️⃣ 테스트 (DoD 체크리스트)

| 항목                 | 기대                     | 결과 |
| :----------------- | :--------------------- | :- |
| 로그인 후 /me 호출       | assignments[] 정상 표시    |    |
| 공급자 신청             | 201 Created, 상태 페이지 이동 |    |
| 중복 신청              | 409 Conflict 처리        |    |
| 승인 전 대시보드 접근       | 상태 안내 리디렉션             |    |
| 승인 후 대시보드 접근       | 정상 진입                  |    |
| 관리자 리스트 조회 / 전이    | 정상 처리                  |    |
| 401/403/422/429 에러 | 메시지 표준 노출              |    |
| 레거시 role 필드        | FE 참조 없음               |    |

---

## 4️⃣ 모니터링 및 롤백

* **초기 72h 모니터링**: `/enrollments`, `/admin/enrollments`, `/auth/cookie/me` 요청 성공률 및 FE 콘솔 에러
* **긴급 롤백**: 라우팅 비활성 또는 이전 배포 리버트 (서버 RBAC 유지)
* **보안 회귀 금지**: httpOnly/CORS 정책 유지

---

## 5️⃣ 산출물 (에이전트 제출 항목)

1. `p0_phase_c_implementation_report.md` — 변경 요약, DoD 체크 결과
2. UI 스크린샷 또는 경로별 상태 출력 캡처
3. 오류/레이트리밋 로그 샘플 (선택)
4. 문서 업데이트: `p0_phase_c_detailed_plan.md` 상태 완료 마커 추가

---

*최종 업데이트: 2025-11-09*
