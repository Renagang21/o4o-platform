# WO-O4O-PRIVACY-DATA-CENSUS-V1

> **성격**: **현황 조사(Census) 전용** — 삭제 · 이관 · 스키마 변경 · API 계약 변경을 하지 않는다. 조사 결과를 본 뒤 후속 WO 에서 개인정보 구조를 정비한다.
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **산출물 위치**: `docs/investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md` (조사 기록물 — CLAUDE.md §16-1 의 기준 문서가 아님).
> **관련 정본**: [`O4O-BOUNDARY-POLICY-V1`](../architecture/O4O-BOUNDARY-POLICY-V1.md) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) · [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) · [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) — `auth-core` 는 동결 Core 이므로 이번 WO 는 **읽기만** 한다.

---

## 1. 목표와 배경

O4O 전체 서비스에서 현재 **수집 · 저장 · 전송 · 노출**되고 있는 개인정보(및 개인정보와 연결될 수 있는 정보)를 전수 조사한다. `users` 테이블만 보고 끝내지 않는다 — 실제 위험은 API response · console/logger · localStorage · 관리자 화면 · AI prompt · 각 서비스에 복제된 사용자 객체에 숨어 있을 가능성이 크다.

### 판단 기준이 되는 개인정보 기본정책 (2026-09-17 확정)

| 영역 | 정책 |
|---|---|
| 인증 | **O4O 로그인은 Google 단일 로그인으로 한다.** Google `sub` 를 로그인 Identity 기준으로 사용. **Kakao 등 다른 소셜 로그인은 O4O 로그인 수단으로 사용하지 않는다. 외부 메신저는 Connected Channel 로만 연결한다** (확정 정책 · 방향 아님). Census 에서 Kakao Login 코드가 발견되면 삭제하지 않고 `DELETE_CANDIDATE` 또는 의존성에 따라 `REVIEW` 로 보고 |
| 외부 메신저 | KakaoTalk / LINE / WhatsApp 등 = **Connected Channel.** 가입 · 로그인 수단이 아니라, 이미 확인된 사용자와 연결해 AI 작업 요청 · 자동화 명령 · 진행/완료 알림 · 결과 전달에 사용 |
| 수집 | 가입 시 추가 개인정보를 요구하지 않는다. 서비스 사용 과정에서 필요한 정보만 단계적으로 수집 |
| 약사정보 | 약사면허번호는 보관. **면허증 사진은 받지 않는 것이 원칙.** 초기 확인은 운영자가 이름 · 면허번호 · 전화번호 · 출신대학 · 소속 지부/분회 등으로 수행. 면허번호 원본은 O4O 공통 자격영역에서 관리하고 각 서비스에 복제하지 않는 방향 |
| 사업자 · 매장 · 조직 | 사업자 · 매장 · 분회/지부 · 공급자 · 직원 · 매장 경영자는 `users` 의 고정 프로필 속성이 아니라 **사용자 ↔ 대상 객체의 Relationship / Membership** 으로 관리하는 방향 |

장기 목표 구조: `원 개인정보 → O4O Core / Credential / Relationship → 서비스는 claim / role / ID 만 사용`.

향후 목표 개념(이번 WO 에서 구현하지 않음): `professional_credentials(user_id, credential_type, license_number, status, verification_method, verified_by, verified_at)`.

## 2. 승인 범위

읽기 전용 조사. 아래 15개 축을 모두 다룬다.

| # | 축 | 조사 내용 |
|---|---|---|
| A | **Database** | 전체 schema / migration / entity / repository. `name·email·phone·birth·gender·address·license·university·business_number·representative·branch·google·kakao·oauth·provider·profile·avatar·rrn·ci·di·ip·user_agent·device·bank·account_number·health·medical·consultation` 등 이름 또는 **의미상** 개인정보인 컬럼. JSON / JSONB / metadata 컬럼 필수 포함 |
| B | **`users` · 인증 계층** | `users` · auth identities · sessions · social/OAuth accounts · `role_assignments` · profiles · service memberships. 각 컬럼을 Identity / Contact / Personal Profile / Credential / Business Relationship / Store Relationship / Organization Relationship / Authorization 으로 구분하고 **한 테이블에 혼재**돼 있는지 표시 |
| C | **Google / Kakao 인증** | Google: 식별 기준이 `sub` 인지 · email 을 identity key 로 쓰는 코드 · access/refresh token 저장 · 불필요한 profile field 저장. Kakao: 코드 실존 · production 사용 여부 · user ID 저장 위치 · token 저장 · 의존 서비스. provider enum · callback · account linking · email-based lookup · identity merge 포함 |
| D | **서비스별 복제** | 이름 · 이메일 · 전화 · 면허번호 · 사업자번호 · 대표자명 · 주소 · 분회 · 지부가 Core / KPA Society / KPA Branch / GlycoPharm / PharmacyHub / Neture / KCos 등 여러 테이블에 복제돼 있는지 |
| E | **API** | `GET /users` · `/me` · profile · admin/operator users · store · supplier · LMS · community API 의 request/response DTO. 서비스가 필요한 것보다 넓게 반환하면 `OVEREXPOSURE` 표시 (예: `pharmacist=true` 만 필요한데 licenseNumber · phone · email · university · branch 반환) |
| F | **Admin / Operator 화면** | admin · super_admin · operator · service operator · instructor · store_owner · supplier 역할별로 이름 · 전화 · 이메일 · 면허번호 · 사업자 대표자 정보를 볼 수 있는 범위, 분회 정보를 변경할 수 있는 주체. "admin 이면 전부 조회 가능" 구조가 있으면 명시 |
| G | **Frontend 저장소** | localStorage · sessionStorage · IndexedDB · cookies · persisted state · URL query / route param · browser cache 에 email · phone · 면허번호 · 사업자번호 · 이름 · OAuth/access/refresh token 이 들어가는지 |
| H | **로그 / Telemetry** | console · logger · request/error logging · audit log · Cloud Run · CI · analytics. email/전화/면허/사업자번호 전체 출력 · OAuth token · Authorization header · request body 전체 · user 객체 전체 출력. **비밀번호 · 토큰 출력은 `CRITICAL`** |
| I | **파일 업로드 / Storage** | 프로필 이미지 · 면허증 · 사업자등록증 · 신분증 · 자격증 · 계약서 · 첨부파일 수신 기능과 저장 위치(local fs · GCS · S3 호환 · DB blob · 외부 SaaS). **면허증 이미지 수신 경로가 있으면 반드시 표시** |
| J | **사업자 정보** | Business Entity · 사업자번호 · 상호 · 대표자 · Store · User↔Business · User↔Store 를 구분. `users.business_number` · `users.store_name` · `users.representative` · `users.store_id` 형태는 Relationship 분리 후보 |
| K | **약사 · 전문자격** | `role=pharmacist` · `isPharmacist` · pharmacist profile · 면허번호 · service role · store_owner 의 관리 방식. 자격과 서비스 role 동일 처리 · 면허번호 복제 · 면허번호 없는 pharmacist role · 검증자/검증일/검증방식 부재를 찾아냄 |
| L | **조직 / 지부 / 분회** | `users.branch` · `profile.branch` · `store.branch` · `role.branch` · organization membership. 프로필 문자열 구조와 Organization Relationship 구조를 구분 |
| M | **외부 서비스 전송** | Google · Kakao · SMS · Email · Analytics · Error tracking · AI/LLM API · Payment · Cloud storage · 외부 업무 API. 전송점마다 Provider / Purpose / Data / Trigger / 외부 저장 여부 / Risk 기록 |
| N | **AI / LLM prompt** | 실명 · 전화 · 이메일 · 면허번호 · 사업자번호 · 주소 · 개별 사용자 식별정보 · 개별 소비자 개인정보/건강정보가 prompt/context 에 들어가는 전송 지점과 필드 |
| O | **Seed / Test / Demo** | 명백한 가상 데이터 / 실제처럼 보이는 개인정보 / 실제 개인 이메일·전화 / 테스트 관리자 계정 / 하드코딩 OAuth 정보 구분. 실제 개인정보 가능성은 별도 표시 |

### 판정 코드 (각 발견 항목에 1개 부여 · 판정까지만, 변경 없음)

| 코드 | 의미 |
|---|---|
| `KEEP_CORE` | O4O 공통 계층에 계속 보관 |
| `MOVE_CORE` | 현재 서비스에 있으나 공통 계층으로 이동 후보 |
| `CLAIM_ONLY` | 서비스에는 원본이 아니라 검증결과/Claim 만 제공 |
| `RELATIONSHIP` | 프로필이 아니라 사업자 · 매장 · 조직 관계로 전환 |
| `MINIMIZE` | 수집/노출 범위 축소 후보 |
| `DELETE_CANDIDATE` | 목적 없음 · 중복 → 삭제 검토 |
| `SECURITY_FIX` | 토큰 · 로그 등 보안상 수정 필요 |
| `REVIEW` | 정책 결정 추가 필요 |

## 3. 실행 순서

1. **시작 상태 확인**: `git fetch origin` → `branch · HEAD · origin/main · working tree` 기록. 다른 세션의 수정 · 미추적 파일은 불가침.
2. **A · B** — entity/migration 전수 → 테이블별 Inventory 작성 → `users` · 인증 계층 8구분 표.
3. **C** — Google / Kakao 구현 census (provider enum → callback → linking → token storage 순).
4. **D · J · K · L** — 복제 · 사업자 · 약사자격 · 조직 축 (B 의 결과를 기준선으로 서비스별 테이블 대조).
5. **E · F** — API DTO / controller 와 admin · operator 화면 노출 범위 (역할별 표).
6. **G · H** — Frontend 저장소 · 로그/telemetry (`CRITICAL` 우선 표기).
7. **I · M · N** — 파일 업로드 · 외부 전송 · AI/LLM prompt.
8. **O** — seed / fixture / test.
9. 판정 코드 부여 → §7 의 표 · 숫자 · 중요 발견 작성 → IR 파일로 저장 → 보고.

프로덕션 DB 실데이터 조회는 **필수가 아니다.** 코드 · 스키마 · migration 기준으로 충분하며, 실데이터 존재 확인이 꼭 필요하면 read-only 채널로 **건수 · 존재 여부만** 확인하고 값은 기록하지 않는다 ([`SETUP.md`](../../SETUP.md)).

## 4. 제외 범위

이번 WO 에서 하지 않는다.

- DB migration 실행 · 컬럼 삭제/변경 · 데이터 이동 · 개인정보 실제 삭제
- API 계약 변경 · 로그인 구조 변경 · 서비스 UI 변경
- Kakao Login 코드 삭제 (존재 여부 · 사용 여부 보고만)
- 면허증 이미지 · 업로드 파일 삭제 (경로 · 저장 위치 보고만)
- 로그 · AI prompt 의 개인정보 제거 수정 (`SECURITY_FIX` / `CRITICAL` 표기만)
- `professional_credentials` 등 목표 모델 구현
- 후속 Phase 1~7 착수 (§7 참조 — **Census 완료 전에는 시작하지 않는다**)

## 5. 중지 조건

- 조사 중 코드 수정이 필요해 보이는 경우 → 수정하지 않고 판정 코드 + 보고
- 다른 세션의 dirty · 미추적 파일 접촉 필요
- 프로덕션 DB write 가 필요하다고 판단되는 경우 (이번 WO 에는 없어야 함)
- 실제 계정 · 자격정보 · 외부 서비스 승인 필요
- 법률 · 규제 판단이 필요한 항목 → `REVIEW` 로 두고 사용자 판단 요청

CLAUDE.md 의 상시 중지 조건이 그대로 적용된다.

## 6. 검증과 Git

- 조사 결과의 각 항목은 **파일 경로 · 라인 링크**로 근거를 남긴다. 검색 한 번으로 "0건" 을 선언하지 않는다 (이름이 달라도 의미상 개인정보이면 포함).
- 실제 DB host · password · 계정값 · 개인정보 실값을 문서 · 로그 · 커밋에 기록하지 않는다. 예시는 마스킹.
- 코드 변경 없음. 산출물은 IR 문서 1건(+ 필요 시 CHECK). `git add`/`commit` 은 path-specific (`node scripts/git/check-staged-scope.mjs docs/investigations/...` → `git commit -m "..." -- docs/investigations/...`) → push.
- 완료 조건: `HEAD == origin/main` + 이번 WO 범위(IR 문서)의 미커밋 변경 0건.

## 7. 완료 보고

### 7-1. 최우선 별도 표시 (보고 첫 부분)

주민등록번호 · CI/DI · 비밀번호 평문 · OAuth token 평문 로그 · Authorization header 로그 · 면허증 이미지 · 신분증 이미지 · 개인정보 포함 공개 API · 서비스 간 개인정보 무제한 공유 · AI prompt 불필요 개인정보 · 실제 개인정보 포함 seed/test — **발견 시 첫 부분에 별도 기재, 없으면 "해당 없음"**.

### 7-2. 필수 표

**개인정보 Inventory**

| Data | Source | Storage | Service | Purpose | Access | Duplicate | 판정 |
|---|---|---|---|---|---|---|---|

**테이블별 Inventory**

| Table | Column | 개인정보 유형 | 현재 사용처 | 판정 |
|---|---|---|---|---|

**API Exposure**

| API | 노출정보 | 필요한 정보 | 과다노출 여부 |
|---|---|---|---|

**External Transfer**

| Provider | Data | Purpose | 서비스 | 판정 |
|---|---|---|---|---|

**Authentication**

| Provider | 현재 구현 | Production 사용 | 저장정보 | 의존 서비스 | 판정 |
|---|---|---|---|---|---|
| Google | | | | | |
| Kakao | | | | | |

### 7-3. 필수 숫자

```text
개인정보 관련 DB field 수
중복 저장 후보 수
서비스 과다노출 API 수
Relationship 전환 후보 수
삭제 후보 수
Security Fix 후보 수
정책 추가결정 필요 항목 수
```

### 7-4. 완료 체크리스트 (모두 확인돼야 Census 완료)

DB · users/auth 구조 · Google/Kakao · 서비스별 중복 · API 노출 · Admin/Operator 노출 · Frontend 저장소 · 로그/telemetry · 파일 업로드 · 사업자 관계 · 약사자격 · 분회/조직 관계 · 외부 전송 · AI/LLM · seed/test — 15개 축 각각 완료 여부.

보고에 `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` 한 줄 포함 (CLAUDE.md §16-5).

### 7-5. 이후 순서 (별도 WO · 이번 WO 아님)

사용자가 Census 결과를 ① 정말 필요한 정보 ② O4O Core 에 한 번만 둘 정보 ③ 관계로 바꿀 정보 ④ 서비스에는 Claim 만 줄 정보 ⑤ 없앨 정보의 5범주로 재판정한 뒤:

```text
Phase 1  O4O 개인정보 Target Model 확정
Phase 2  Google 단일 로그인 정리
Phase 3  Credential / Business / Store / Organization 관계 분리
Phase 4  서비스별 개인정보 복제 제거 및 Claim 화
Phase 5  불필요 개인정보 삭제
Phase 6  Admin/Operator 접근권한 최소화
Phase 7  로그 / AI / 외부전송 개인정보 최소화
```

---

*작성: 2026-09-17 · 상태: COMPLETE_WITH_UNKNOWNS (2026-09-17) · 산출물: [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md)*
