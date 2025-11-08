# 사용자 영역 리팩토링 작업 오더 v1.0

(Zero-Data Fast Track · 역할 분리형 전환 · 코드 미포함)

## 0) 참조(근거 문서)

* Schema (03): [03_schema_current.md](./current-state-audit/03_schema_current.md)
* Flows  (04): [04_flows_current.md](./current-state-audit/04_flows_current.md)
* ACL    (05): [05_acl_matrix_current.md](./current-state-audit/05_acl_matrix_current.md)
* Gaps   (06): [06_gap_analysis.md](./current-state-audit/06_gap_analysis.md)

---

## 1) 전체 원칙

* **Zero-Data**: 기존 사용자 데이터 의존 없음(서비스 전).
* **분리 설계**: 일반회원 + (공급자/판매자/파트너) 신청·승인·운영 분리.
* **서버 중심 RBAC**: 권한 판정은 서버에서 단일화, 프론트는 UX 보조(리디렉션/숨김).
* **CI/CD 기본**: 브랜치 → PR → 자동 빌드/배포.
* **문서 우선**: 모든 변경은 docs에 동시 반영.

---

## 2) 작업 구간(Phase) 및 산출물

### Phase P0 — 구조 정렬 & 최소 플로우 개통

**목표**: "가입→역할 신청→승인→대시보드 진입"이 끊김 없이 동작.

**범위**

1. **DB 스키마(텍스트 정의 적용)**
   * `users` 슬림화(레거시 3중 역할 필드 *사용 중지 표기*)
   * `role_enrollments` / `role_assignments` / `*_profiles`(3종) / `kyc_documents` / `audit_logs` 신설
   * **데이터 시드**: 관리자 1계정

2. **API**
   * 공개: `/auth/register`, `/enrollments`(생성/조회), `/me`(assignments 포함)
   * 백오피스: `/admin/enrollments`(role/status 필터) + 승인/반려/보류(PATCH)
   * **RBAC 미들웨어**: assignments.active 기반 판정(최소)

3. **FE 라우팅**
   * 공개: `/register`, `/apply/supplier|seller|partner`
   * 대시보드: `/dashboard/supplier|seller|partner`
   * 관리자: `/admin/users|suppliers|sellers|partners`
   * 승인 전 대시보드 접근 시 신청 현황 안내로 리디렉션

4. **P1 보안 패치 반영(이미 준비됨)**
   * httpOnly 쿠키 전환, FE 스토리지 제거, SameSite 정책 적용

5. **운영 화면(목록/상세 최소)**
   * 역할별 "신청/승인" 탭과 승인 액션만 우선 제공

**산출물**

* `zerodata/01_schema_baseline.md` 확정본
* `zerodata/02_flows_enrollment.md` 확정본
* `zerodata/04_rbac_policy.md`(MVP 표)
* `zerodata/05_routes_fe.md`(경로 고정표)
* 변경 요약 문서(체크리스트 & DoD)

**Definition of Done (P0)**

* 일반 가입 → 역할 신청 → 운영자 승인 → 해당 대시보드 접근이 **연속 성공**
* `/me`가 **assignments[]**를 반환, 서버 RBAC가 접근을 결정
* 승인/반려/보류 이벤트가 `audit_logs`에 기록
* 보안 패치 이후 토큰이 **httpOnly 쿠키로만** 존재

---

### Phase P1 — 역할별 운영 편의 & 레거시 정리

**목표**: 운영 효율 개선, 혼재 필드 제거, 메뉴/리스트 안정화.

**범위**

1. 역할별 리스트/필터/컬럼 확정(공급·판매·파트너별 KPI 기초)
2. 레거시 **role/roles/activeRole** 사용 라인 제거·폐기 문서화
3. **activeRole** 개념은 UI 선택값(뷰 전용)으로만 사용(권한 판정은 assignments)
4. 알림/이벤트(승인 결과 통지) 1차 도입(이메일/내부 알림 중 택1)

**DoD (P1)**

* 운영자 화면에서 역할별 검색/필터가 자연스럽게 동작
* FE/BE 전 구간에 레거시 역할 필드 의존 제거
* 승인/반려 알림 경로 1개 이상 가동

---

### Phase P2 — 권한 세분화 & 품질 고도화

**목표**: Permission 테이블·ACL 미들웨어 확장, JWT에 activeRole(옵션) 등 고도화.

**범위**

1. Permission/Role-Permission 맵 표준화(테이블 또는 정책 레이어)
2. 서버 RBAC 미들웨어 세분화(리소스×행위)
3. JWT에 `activeRole` claim 반영 여부 결정(정책상 필요 시)
4. SSO/서브도메인 운영 고려 시 SameSite 정책/도메인 범위 재조정

**DoD (P2)**

* 주요 리소스에 대해 표준화된 권한 매트릭스 적용
* 운영 정책 변경 시 코드 수정 없이 정책 갱신으로 반영(가능한 범위)

---

## 3) 브랜치·PR 전략

* **브랜치**
  * `feat/user-refactor-p0-zerodata`
  * `feat/user-refactor-p1-ops`
  * `feat/user-refactor-p2-acl`

* **커밋 단위(예)**
  * DB 스키마 정의 문서 확정 → API 계약 문서 확정 → 라우팅 확정 → 운영 화면 최소 구성 → 보안 패치 통합

* **PR 본문 공통 포함 요소**
  * 변경 요약(한 페이지)
  * 참조 문서 링크(03/04/05/06 + zerodata/*)
  * 테스트 체크리스트(아래 5장 표준 사용)
  * 롤백 가이드

---

## 4) 실행 순서(세부 체크리스트)

### A. 공통

- [ ] **사전 동기화(필수)**: main ↔ 작업 브랜치 최신화
- [ ] CI/CD 파이프라인 상태 확인

### B. API 서버(우선) — P0

- [ ] 스키마 적용(DDL/마이그레이션) & 관리자 1계정 시드
- [ ] `/auth/register`, `/enrollments(POST/GET)`, `/admin/enrollments(목록/승인계열)`, `/me` 구현
- [ ] RBAC 미들웨어: `role_assignments.active` 기반 판정
- [ ] **보안 패치**: httpOnly 쿠키·SameSite 정책·레이트리밋(로그인·리프레시)

### C. 프론트엔드 — P0

- [ ] 라우팅: `/register`, `/apply/{role}`, `/dashboard/{role}`, `/admin/*` 반영
- [ ] 승인 전 대시보드 접근 시 신청 안내로 리디렉션
- [ ] **보안 패치**: 토큰 저장/헤더 주입 제거, `withCredentials` 경로 점검
- [ ] 운영자: 역할별 "신청/승인" 탭 1차 가시화

### D. 레거시 정리 — P1

- [ ] FE/BE 전 구간 `role/roles/activeRole` 참조 제거(권한 판정은 assignments)
- [ ] 역할별 리스트화면 컬럼/필터 확정, 공통 컴포넌트 추출
- [ ] 승인/반려 알림 경로 1개 도입

### E. ACL 고도화 — P2

- [ ] Permission 구조 도입(표준 정책)
- [ ] 미들웨어 세분화 및 테스트
- [ ] JWT 확장(필요 시)

---

## 5) 테스트 시나리오(표준)

### 기능

- [ ] 회원가입 → `/me` 기본 응답 정상, 역할 없음
- [ ] 역할 신청 생성 → 사용자 측 신청 목록 조회 가능
- [ ] 운영자 승인/반려/보류 → `audit_logs` 기록 확인
- [ ] 승인 후 해당 `/dashboard/{role}` 접근 가능, 타 역할 대시보드는 403

### 보안/세션

- [ ] 로그인 후 토큰이 **httpOnly 쿠키로만** 존재(콘솔 접근 불가)
- [ ] CORS `credentials` 정상 왕복, SameSite 정책 기대 동작
- [ ] 레이트리밋(로그인/리프레시) 작동

### 회귀

- [ ] 기존 단일 사용자 메뉴 경로 접근 시 적절한 안내/리디렉션
- [ ] 레거시 역할 필드 참조 라인 제거에 따른 빌드/런타임 에러 없음

---

## 6) 모니터링 & 롤백

### 모니터링(24h 이상)

* 가입 성공률, 신청→승인 리드타임, `/me` 실패율, 401/403 비율, 에러 로그

### 롤백(Zero-Data 전제)

* 스키마 태그로 이전 버전 복원
* FE는 라우팅 리디렉션만 임시 되돌림
* 보안 패치는 회귀 금지(정책 완화로만 조정)

---

## 7) 문서 동기화(필수)

* 모든 변경점은 `zerodata/*` 문서에 **즉시 반영**
* API/FE 경로·정책 변경 시 표/시퀀스 업데이트

---

## 다음 액션

1. **사전 동기화(필수)**
2. **API 서버 P0 적용**
3. **FE P0 적용**
4. **테스트/모니터링**

---

**작성일**: 2025-01-08
**버전**: 1.0.0
**상태**: 작업 시작 준비 완료
