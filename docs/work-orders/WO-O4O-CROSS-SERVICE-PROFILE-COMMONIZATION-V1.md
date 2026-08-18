# WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1

- **대상 에이전트**: Agent D
- **작성일**: 2026-08-18
- **성격**: 조사 + **실제 구현(수렴)** — 조사 전용 아님
- **선행 문서**: [`docs/checks/CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1.md`](../checks/CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1.md)

---

## 1. 목표 · 배경

KPA-Society · GlycoPharm · K-Cosmetics · PharmacyHub · Neture 5개 서비스의 사용자 프로필/마이페이지 기능을 **전수조사**하고, 동일 기능을 `Core + Service Extension` 구조로 **실제 수렴**시킨다.

```text
계정 기본정보 / 서비스 회원정보 / 사업자·매장정보 / 비밀번호·계정관리 / 서비스별 전문정보
        ↓
공통 Profile Core  +  서비스별 Extension
```

**배경**: 선행 CHECK 에서 데이터 정본(ownership · write path) 은 이미 깊게 조사되어 있고, **신규 통합 테이블은 불필요**하며 `users` · `service_memberships` · `service_credentials` · 서비스별 profile · `organizations` 의 기존 경계 유지가 타당하다고 판정됐다. 따라서 본 WO 는 또 하나의 조사 트랙으로 끝내지 않고, 그 결과를 근거로 **UI · API 사용 구조를 공통 Core 로 수렴**시키는 단계다.

**핵심 차이 (선행 CHECK 기준, 재검증 필요)**: GP · K-Cosmetics 는 각각 `users.businessInfo` 를 수정, KPA 는 별도 KPA profile 경로 보유, PharmacyHub 는 당시 자체 profile write 없음 → 이 차이를 **Extension / adapter 로 처리**하는 것이 본 WO 의 중심이다.

---

## 2. 승인 범위

### 2-1. 모집단 전수조사 (미조사 0)

`MyProfilePage` 만 보지 않는다. 확인된 대표 화면:

```text
KPA           services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx
GlycoPharm    services/web-glycopharm/src/pages/mypage/MyProfilePage.tsx
K-Cosmetics   services/web-k-cosmetics/src/pages/mypage/MyProfilePage.tsx
Neture        services/web-neture/src/pages/mypage/MyProfilePage.tsx + 사업자/공급자 프로필
PharmacyHub   store-owner Account/Profile 계열
```

조사 축: `route` · `page` · `component` · `API client` · `backend endpoint` · `controller/service` · **실제 write table** · `메뉴 진입점` · `desktop/mobile UI`

기능 단위 판정 라벨:

```text
FULLY_COMMON / CORE_ONLY / VIEW_DUPLICATED / SERVICE_SPECIFIC / NOT_IMPLEMENTED / OUT_OF_SCOPE
```

### 2-2. 프로필 경계 고정 (공통화 전 선행)

```text
ACCOUNT_CORE       이름 · 이메일 · 전화번호 · 닉네임 · 비밀번호/계정관리
SERVICE_PROFILE    서비스 membership · 서비스 role · service credential · 직역/면허/회원 속성
DOMAIN_EXTENSION   약국/매장/회사 · 사업자 정보 · organizations 관계
SERVICE_EXTENSION  KPA 약사/학생 · GlycoPharm 고유 회원정보 · Neture 공급자 · 기타 서비스 고유 필드
```

**금지 사항**:
- `users.businessInfo` 에 모든 정보 몰아넣기
- 신규 Profile 통합 테이블 생성
- 서비스 고유 정보를 억지로 공통 schema 로 변경
- `organizations` 와 개인 Profile 을 하나의 객체로 병합

### 2-3. 실제 공통화 (조사에서 멈추지 않는다)

우선순위:

```text
1. 공통 Profile layout/shell
2. 기본 계정정보 section
3. 공통 Form field / 상태 / save feedback
4. 비밀번호·계정관리 진입
5. 공통 API adapter/interface
6. 서비스별 Extension slot
```

개념 구조 (파일명 · 패키지 위치는 현 코드 구조를 보고 **가장 단순하게** 결정):

```text
ProfilePage / ProfileLayout
 ├─ AccountProfileSection
 ├─ ContactSection
 ├─ ServiceProfileSection
 ├─ BusinessOrStoreSection
 ├─ SecuritySection
 └─ extension { KPA / GlycoPharm / K-Cosmetics / PharmacyHub / Neture }
```

> **공통화를 위한 추상화가 기존 중복보다 더 복잡해지면 공통화하지 않는다.**

### 2-4. Backend — 필요한 경우만

- API 계약 차이가 단순하면 **frontend adapter** 로 처리한다.
- 동일 의미 API 가 서비스마다 복제돼 있고 안전하게 하나로 합칠 수 있으면 공통 endpoint/service 사용도 허용한다.

### 2-5. PharmacyHub 처리 원칙

프로필 기능이 부족하다는 이유로 **전용 큰 구현을 새로 만들지 않는다.**

```text
공통 기능 부재 → PharmacyHub 전용 복사본 생성   ❌
공통 기능 부재 → Profile Core adoption          ✅
```

---

## 3. 실행 순서

1. **시작 정합** — `origin/main` 최신 기준. `git fetch origin` → `git status -sb` → clean 확인.
2. **선행 CHECK 정독** — `CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1.md`.
3. **현재 main 재검증** — 과거 감사 결과를 그대로 믿지 않는다. 아래 P0/P1 이 후속 작업으로 **이미 수정됐는지** 확인하고, 수정됐으면 **다시 수정하지 않는다**.
   ```text
   users.updated_at 잘못된 write
   KPA 승인 sync 예외 처리
   주소 key 비대칭
   pharmacy_phone key 이중화
   KPA 운영자 대리수정 원자성
   organizations 이중 entity 문제
   ```
4. **모집단 전수조사** (§2-1) → 기능 단위 판정표 작성. **미조사 0**.
5. **프로필 경계 고정** (§2-2) → 각 기능을 4개 계층에 배치.
6. **공통 Core 구현** (§2-3) → 우선순위 1~6 순.
7. **5서비스 adoption** — KPA · GlycoPharm · K-Cosmetics · PharmacyHub · Neture 를 Core 로 전환. Core 만 만들고 소비처 미전환 상태로 두지 않는다.
8. **검증** (§5) → **CHECK 작성** (§6) → path-specific stage → commit → push.

---

## 4. 제외 범위 (이번에 하지 않는다)

```text
DB schema migration
대규모 데이터 migration
membership / identity 체계 재설계 (Identity V2 재설계로 확대 금지)
organizations 재설계
서비스별 승인 정책 통합
```

- 데이터 정본을 하나의 테이블로 억지 병합하지 않는다.
- 조사 중 발견한 **범위 밖 결함은 고치지 말고 CHECK 에 기록 후 별도 WO 로 분리**한다.

---

## 5. 중지 조건

CLAUDE.md 실행 원칙의 중지 조건을 그대로 따른다. 특히 본 WO 에서 발생 가능성이 높은 항목:

- WO 범위 밖 파일 수정 필요 / 다른 세션의 dirty · 미추적 파일 접촉 필요
- DB schema · migration · 데이터 삭제 · 대량 update 필요
- 권한 · role · route · API contract 변경 필요 (공통 endpoint 통합이 계약 변경으로 번지는 경우)
- Core · Frozen Baseline(§14 F10 O4O Core / F11 User·Operator) 변경 필요
- `package.json` · lockfile · dependency 변경 필요
- 현재 변경과 무관한 build · test 실패

> 공통 모듈 변경이므로 **CLAUDE.md §1 Shared Module Change Rule** 적용: 단일 서비스 기준으로 완료 판단하지 않는다. 모든 소비처를 먼저 식별한다.

---

## 6. 검증 · Git

### 6-1. 사용자 흐름 (5서비스)

```text
로그인 → 프로필/마이페이지 진입 → 기존 정보 표시 → 수정 가능 필드 수정
       → 저장 → 새로고침 → 저장값 유지
```

대상: KPA-Society / GlycoPharm / K-Cosmetics / PharmacyHub / Neture. **가능한 서비스는 실제 브라우저로 검증**한다 (계정 SSOT: `docs/local/TEST-ACCOUNTS.local.md`).

### 6-2. 확인 항목

```text
desktop / mobile
console exception 0
white screen 0
dead link 0
404 0
잘못된 serviceKey 호출 0
타 서비스 profile 오염 0
```

### 6-3. 정적 검증

5개 서비스에서 typecheck / build 수행.

### 6-4. Git

- main 직접 작업, path-specific stage (`git add .` 금지)
- 완료 조건: **이번 WO 범위의 미커밋 변경 0건 + `HEAD == origin/main`**

---

## 7. 완료 보고

### 7-1. 완료 판정 (엄격)

> **Core 하나 만들었다는 이유로 전체 완료 선언 금지.**

최종 census 에서 다음이어야 한다.

```text
미조사          = 0
VIEW_DUPLICATED = 0
CORE_ONLY       = 0
```

- `SERVICE_SPECIFIC` — 실제 서비스 차이면 정상적으로 남겨도 된다 (사유 명기).
- `NOT_IMPLEMENTED` — 실제 필요 기능이 없으면 숨기지 말고 **그대로 보고**한다.

### 7-2. CHECK 문서

`docs/checks/CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1.md`

포함 항목:

```text
전체 census
Before / After 판정
공통화한 기능
서비스별 Extension
남긴 SERVICE_SPECIFIC 사유
API / backend 변경
데이터 정본 변경 여부
5서비스 build / typecheck
브라우저 검증
잔여 MUST_FIX_BEFORE_CLOSE
```

### 7-3. 보고 형식

- 한국어. 기술 식별자(파일명 · route · API · component · commit hash)는 원문 유지.
- 변경 / 미변경 / 검증 결과 / CHECK / Git 상태 중심. 긴 diff 금지.
- **검증 실패나 건너뛴 항목을 숨기지 않는다.**
- `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` 한 줄 포함 (CLAUDE.md §16-5).

작업 완료 후 commit / push 까지 수행한다.

---

## 후속

본 WO 완료 보고의 census 와 변경 결과를 근거로, **프로필 후속 작업 필요 여부 또는 프로필 트랙 종료**를 사용자가 판정한다.
