# P0 Zero-Data 구현 요청서 (Execution Order)

> **작성일**: 2025-01-08
> **대상**: 로컬 에이전트 (자율 구현용)
> **형식**: 코드 없음, BE→FE 순서, DoD/테스트/롤백 포함

---

## 0) 근거 문서 (이 브랜치 고정 참조)

* **스키마**: [01_schema_baseline.md](./01_schema_baseline.md)
* **플로우**: [02_flows_enrollment.md](./02_flows_enrollment.md)
* **RBAC**: [04_rbac_policy.md](./04_rbac_policy.md)
* **FE 라우팅**: [05_routes_fe.md](./05_routes_fe.md)

---

## 1) 사전 동기화 (필수) · 브랜치/PR

1. `main` 최신 반영 확인 → 작업 브랜치: `feat/user-refactor-p0-zerodata` 유지
2. CI/CD 파이프라인 정상 여부 점검 (빌드/테스트/배포 시뮬레이션)
3. 문서 변경은 모두 동일 브랜치에 동시 반영

---

## 2) 구현 범위 요약 (이번 P0)

### DB/엔티티
- `users` 슬림화
- `role_enrollments` (역할 신청)
- `role_assignments` (역할 할당)
- `supplier_profiles` / `seller_profiles` / `partner_profiles`
- `kyc_documents`
- `audit_logs`

세부 필드는 스키마 문서 기준

### API
- 회원가입
- 역할 신청/조회
- 관리자 심사 (승인·반려·보류)
- `/me`에 assignments 노출

### RBAC
- 서버 미들웨어에서 assignments 기반 접근 판정 (MVP)

### FE
- 공개: `/register`, `/apply/{role}`, `/apply/{role}/status`
- 대시보드: `/dashboard/{role}`
- 관리자: `/admin/enrollments/{suppliers|sellers|partners}`

### 보안
- httpOnly 쿠키 기반 인증 사용
- FE 토큰 저장 금지
- SameSite 정책 준수

---

## 3) 상세 작업 순서

### A. 데이터베이스/엔티티 (서버 우선)

#### A-1. 스키마 생성

- `01_schema_baseline.md`에 정의된 테이블/필드/제약을 기준으로 **마이그레이션 작성 및 적용**
- `users`에는 레거시 역할 필드가 **존재하더라도 권한 판정에 사용 금지** (deprecated 표기만 유지)

#### A-2. 최소 시드

- 운영자/관리자 1계정만 생성 (테스트용)
- 테스트용 더미 신청 1~2건 (각 역할별) 입력 가능하면 작성

#### A-3. 감사/로그 정책

- 승인/반려/보류 이벤트 시 `audit_logs` 레코드 필수 기록 (행위자, 시각, 사유)

---

### B. API 구현

#### B-1. 공개/사용자 API

- `POST /auth/register`
  - 일반 가입
  - 가입 직후 **역할 없음**, 사용자 상태는 문서 기준

- `POST /enrollments`
  - 본인 계정으로 역할 신청 생성
  - 필수 필드·동의·KYC 업로드 레퍼런스 포함

- `GET /enrollments/my`
  - 본인 신청 목록/상태 조회

- `GET /me`
  - 사용자 기본 정보 + `assignments[]` (role, active, activated_at 등) 포함

#### B-2. 관리자 API

- `GET /admin/enrollments?role=&status=`
  - 역할·상태 기반 목록

- `PATCH /admin/enrollments/:id/approve|reject|hold`
  - 상태 전환 + `audit_logs` 기록
  - **approve 시 `role_assignments` 활성화**

#### B-3. 표준 응답/에러

- 성공/에러 응답 포맷 일관화 (401/403/404/409/422)
- 중복 신청, 유효하지 않은 상태전이 → 적절한 에러 코드 반환

#### B-4. RBAC 미들웨어 (MVP)

- 접근 판정은 `role_assignments.active == true` 기준
- 대시보드/관리자 엔드포인트 등 보호 대상에 적용
- 프론트 가드는 보조 (UX 리디렉션)

---

### C. 프론트엔드 라우팅/화면

#### C-1. 공개 경로

- `/register`: 일반 가입 폼. 성공 시 홈 또는 신청 페이지 안내
- `/apply/supplier`, `/apply/seller`, `/apply/partner`: 역할별 신청 폼
- `/apply/{role}/status`: 본인 신청 현황/상태 안내

#### C-2. 대시보드

- `/dashboard/supplier`, `/dashboard/seller`, `/dashboard/partner`
  - 승인 사용자만 접근
  - 승인 전 접근 시 `/apply/{role}/status`로 안내

#### C-3. 관리자

- `/admin/enrollments/suppliers`, `/admin/enrollments/sellers`, `/admin/enrollments/partners`
  - 기본 탭: Applications (pending/on_hold/rejected), Approved
  - 목록 컬럼/필터: 문서의 MVP 정의 준수

#### C-4. 인증/세션

- FE는 **httpOnly 쿠키 기반** (withCredentials) 전제
- 토큰 로컬 저장/헤더 주입 없음

---

## 4) 테스트 계획 (DoD 체크리스트)

### 기능 흐름

- [ ] **회원가입 → /me 호출**: 정상 반환, `assignments[]`는 비어있음 (역할 없음)
- [ ] **역할 신청 (3종)**: 각 `/apply/{role}`에서 신청 생성 성공, `/enrollments/my`에 반영
- [ ] **관리자 승인/반려/보류**: 각 상태 전환 가능, 로깅 기록 확인
- [ ] **승인 후 대시보드 접근**: 해당 `/dashboard/{role}` 진입 가능, 타 역할 대시보드는 차단 (403/리디렉션)
- [ ] **승인 전 대시보드 접근**: `/apply/{role}/status` 안내 동작

### RBAC/보안

- [ ] 서버 RBAC 미들웨어가 **assignments.active** 기준으로 접근 판정
- [ ] httpOnly 쿠키만 사용, 프론트에서 토큰 접근 불가
- [ ] CORS `credentials` 정상 왕복 및 SameSite 정책 기대 동작

### 오류/회귀

- [ ] 중복 신청, 잘못된 상태전이 → 적절한 에러 코드/메시지
- [ ] 기존 단일 사용자 경로 접근 시 안내/리디렉션 동작
- [ ] 레거시 역할 필드 참조 제거로 인한 빌드/런타임 오류 없음

---

## 5) 산출물 (로컬 에이전트 제출 형식)

- **변경 요약 1p**: DB/엔드포인트/라우팅 변경 포인트 목록화 (문장형)
- **테스트 결과표**: 상기 DoD 체크 항목별 Pass/Fail/비고
- **정책 표**: `/admin/enrollments/*` 전이 규칙 (누가/언제/무엇을) 요약
- **리스크/이슈**: 남은 레거시 의존/추가 결정 필요 사항
- **롤백 가이드**: 스키마 태그/배포 리버트 절차

---

## 6) 배포/모니터링/롤백

### 배포 순서
API (서버) → FE (웹) → 스모크 테스트 → 모니터링 (24h)

### 모니터링 지표
- 가입 성공률
- 신청→승인 리드타임
- `/me` 실패율
- 401/403 비율
- 콘솔 오류·네트워크 실패율

### 롤백 (Zero-Data 전제)
- 마이그레이션 태그 기반 되돌리기
- FE는 라우팅 리디렉션 임시 롤백
- **보안 정책 회귀 금지**

---

## 7) 역할·책임 (R&R)

- **총괄/결정**: Rena
- **구현**: 로컬 에이전트 (백엔드→프론트)
- **문서 동기화**: 구현자
- **리뷰/검수**: Rena + 어시스턴트 (문서 기준 체크)

---

## 8) 시작 지시 (로컬 에이전트 전달 문구)

> 아래 근거 문서를 기준으로 P0 Zero-Data 구현을 시작하라.
>
> 1. **서버**: 스키마/엔드포인트/RBAC (MVP)
> 2. **프론트**: 라우팅/신청/대시보드/관리자
> 3. **보안**: httpOnly 쿠키 전제
>
> DoD 체크리스트 기준으로 결과 보고서를 제출하라.
>
> **참조**:
> - 01_schema_baseline.md
> - 02_flows_enrollment.md
> - 04_rbac_policy.md
> - 05_routes_fe.md

---

**작성**: Claude Code
**상태**: ✅ P0 실행 요청서 확정
**다음**: 즉시 구현 시작
