# Phase C — Frontend 실행 요청서 (P0 · Zero-Data · 코드 미포함)

## 0) 사전 동기화(필수)

* 브랜치: `feat/user-refactor-p0-zerodata` 최신화 → CI 상태 확인.
* 서버 배포 버전: Phase B 적용본(`/me`, `/enrollments`, `/admin/enrollments`, RBAC) 운영/스테이징 URL 동기화.
* 환경설정: FE에서 **withCredentials=true** 요청 경로 확인(CORS/쿠키 도메인/경로 일치).

---

## 1) 구현 범위 요약

* **라우팅(공개/대시보드/관리자)**:

  * 공개: `/register`, `/apply/supplier`, `/apply/seller`, `/apply/partner`, `/apply/{role}/status`
  * 대시보드: `/dashboard/supplier`, `/dashboard/seller`, `/dashboard/partner`
  * 관리자: `/admin/suppliers`(applications/approved), `/admin/sellers`, `/admin/partners`
* **보호 가드**: 서버 RBAC를 신뢰하고, FE는 **UX 보조**(리디렉션·노출 제어).

  * 승인 전: 대시보드 접근 시 `/apply/{role}/status`로 유도
* **신청 폼(3종)**: `/enrollments` POST 연동, 중복신청(409)·검증(422) 처리.
* **내 신청 현황**: `/enrollments/my` GET 연동(상태 배지, 재안내).
* **/me 구조 반영**: `assignments[]` 사용. 레거시 `role/roles/activeRole` **미사용**.
* **전역 헤더/메뉴**: 역할 대시보드는 **'승인 사용자만' 표시**(또는 클릭 시 상태 안내).

---

## 2) 상세 실행 지시

### C-1. 세션/유저 상태 모델 정리

* **세션 소스**: `/me` 응답을 단일 소스로 사용(로그인 직후 및 앱 로드 시 호출).
* **상태 구조(예시 개념)**

  * `user.basic`: id, email, status …
  * `user.assignments`: `{ role, active, activated_at, deactivated_at? }[]`
  * `user.has(role)`: `assignments.some(r => r.role===role && r.active)`
* **금지**: FE에서 `role/roles/activeRole` 레거시 참조 금지.

### C-2. 라우팅·리디렉션 규칙

* **공개 경로**(보호 없음): `/register`, `/apply/{role}`, `/apply/{role}/status`
* **대시보드 보호**(UX 보조 가드):

  * 접근 시 `has(role)`가 **true**면 진입, 아니면 `/apply/{role}/status`로 안내
  * 안내 문구: "승인 대기/보류/반려 상태에 따른 다음 단계"를 표시
* **관리자 경로**: 메뉴 노출은 관리자만(서버 403 대비, FE는 숨김/리디렉션)

### C-3. 신청 폼(3종) UX

* **필수 필드/약관**: 문서 기준의 MVP 필수값만 우선(추가 필드는 P1)
* **중복 방지(409)**: 기존 `pending/on_hold` 가 있을 때는 폼 제출 금지 + 상태 페이지로 안내 링크
* **성공 후 흐름**: 제출 성공 → `/apply/{role}/status` 이동(상태 폴링은 불필요, 새로고침 시 GET `/enrollments/my`)

### C-4. 신청 현황(/apply/{role}/status)

* **데이터 소스**: `GET /enrollments/my`
* **표시 항목**: 최근 제출/역할별 최신 상태, `pending/approved/rejected/on_hold` 배지
* **CTA**:

  * `pending`: "심사 중 안내"
  * `on_hold`: "보완 제출 방법/연락 경로"
  * `rejected`: "사유 표시 + 재신청 규정 안내"
  * `approved`: "대시보드 바로가기(/dashboard/{role})"

### C-5. 대시보드(역할별 빈 화면)

* P0에서는 **역할 보유 확인 + 접근만 보장**하는 빈/목업 페이지로 충분
* 추후 KPI/위젯은 P1에서 연결(지금은 자리만 확보)

### C-6. 관리자 화면(목록/탭)

* 경로: `/admin/{suppliers|sellers|partners}`

  * 탭: Applications(pending/on_hold/rejected), Approved
* **목록 데이터**: `GET /api/admin/enrollments?role=&status=`
* **행동 버튼**: approve/reject/hold → 성공 시 목록 갱신
* **에러 처리**: 403/429/409/422 별 티핑 포인트 안내(토스트 + 가이드 문구)

### C-7. 네트워킹/보안

* **withCredentials** 전역 적용(axios/fetch 인스턴스)
* **레이트 리밋 대응**: 중복 클릭 방지, 429 시 사용자 메시지 노출
* **전역 에러 핸들링**: 401 → 로그인 유도, 403 → 권한 안내, 409/422 → 입력/상태 안내

---

## 3) 테스트(DoD 체크리스트)

### 기능

* [ ] 로그인 후 `/me` 호출 → `assignments[]`가 존재(또는 빈 배열)
* [ ] `/apply/supplier`에서 제출 → 201, `/apply/supplier/status` 이동
* [ ] `/enrollments/my`에 방금 신청 건 보임(상태 `pending`)
* [ ] 승인 전 `/dashboard/supplier` 접근 → 상태 안내로 리디렉션
* [ ] 운영자 승인 후 → `/dashboard/supplier` 진입 가능
* [ ] 관리자 목록/필터/전이(approve/reject/hold) 정상 동작

### 보안·정합

* [ ] 레거시 `role/roles/activeRole` **미참조**
* [ ] httpOnly 쿠키 기반 통신(콘솔에서 토큰 액세스 불가)
* [ ] 401/403/409/422/429에 대한 사용자 메시지 일관
* [ ] 다중 탭/새로고침에서 상태 불일치 없음(`/me` 재동기화)

### 회귀

* [ ] 기존 "단일 사용자 메뉴" 경로 접근 시 적절한 안내/리디렉션
* [ ] 서버 403 시 FE 가드가 과도하게 개입하지 않음(UX 보조에 그칠 것)

---

## 4) 모니터링 & 롤백

* **모니터링(초기 24~72h)**:

  * `/enrollments` 성공률·429 비율, `/admin/enrollments` 전이 성공률, `/me` 실패율
  * FE 콘솔/네트워크 에러 로그, 리디렉션 루프 유무
* **롤백**:

  * 라우팅 비활성 및 메뉴 숨김으로 **기능적 롤백**,
  * 서버는 Phase B 유지(데이터/보안은 회귀 금지),
  * 필요 시 배포 리버전.

---

## 5) 필요 문서/URL (FE 구현 근거)

다음의 **GitHub URL**만 주시면, 위 요청서를 해당 코드베이스에 정확히 매핑한 "최종 실행안(파일 경로/컴포넌트 명세 포함)"으로 보강해 드리겠습니다.

1. **라우팅/엔트리**

   * 앱 라우터 설정 파일(예: `apps/main-site/src/routes/*` 또는 `src/App.tsx`/`src/router.tsx`)
   * 최상단 레이아웃/네비게이션(헤더/사이드바) 컴포넌트

2. **세션/인증 상태**

   * `AuthContext.tsx` 또는 등가 컨텍스트/스토어
   * API 클라이언트(axios/fetch 인스턴스): `services/api.ts` / 인터셉터

3. **신청/대시보드/관리자 화면**

   * (있다면) 기존 사용자/관리자 관련 페이지 경로(리스트/상세)
   * 신규 작성 예정 경로의 빈 컴포넌트 위치(폴더 구조)

4. **전역 에러/토스트/모달**

   * 에러 핸들링/알림 공용 컴포넌트

> URL을 주시는 범위 내에서만 **파일 단위 실행 지시**로 세부화하겠습니다(코드 없음).

---

## 6) 권장 진행 절차

1. **사전 동기화(필수)**
2. **세션(/me) 반영 → 라우팅/가드 적용 → 신청 폼/현황 → 관리자 목록/전이** 순으로 한 번에 P0 완결
3. **DoD 체크리스트 표**로 결과 보고(PR 본문 첨부)
4. 리뷰/승인 후 배포 및 모니터링

---

*최종 업데이트: 2025-11-09*
