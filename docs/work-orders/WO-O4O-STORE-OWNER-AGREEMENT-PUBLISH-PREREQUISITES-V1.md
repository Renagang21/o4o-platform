# WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1

> **상태:** DRAFT · HANDOFF ONLY · 실행 전용 WO (등록일 2026-09-18 · 실행 착수는 별도 명시 지시)
> **대상 계약:** [`docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md`](../baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md) (DRAFT · 975ddc217)
> **목적:** 매장 경영자 이용계약 v1.0의 게시 선행조건 4건을 실제 런타임과 정렬
> **적용 서비스:** `kpa-society` · `k-cosmetics` · `pharmacy-hub`
> **제외:** Neture store_owner 신규 계약, 유료 이용권, SLA, 소비자 전자상거래
> **원칙:** 계약서를 시스템에 맞추는 것이 아니라, 확정된 계약내용을 실제 서비스가 이행할 수 있도록 최소 구현한다. 4개 선행조건을 하나의 계약 게시 준비 작업으로 묶되, ④ 데이터 반환·파기는 "조사 후 확장"이 아니라 처음부터 명시적인 lifecycle 구현으로 정의한다.
> **선행:** [`IR-O4O-STORE-OWNER-SERVICE-AGREEMENT-STANDARD-CONTRACT-BASELINE-V1`](../investigations/IR-O4O-STORE-OWNER-SERVICE-AGREEMENT-STANDARD-CONTRACT-BASELINE-V1.md)(afe519c80) · 통합약관 v1.0 게시(bd6d3f02a)
> **후속:** 계약 게시 작업(§7.4) — 시행일 확정 · DRAFT→ACTIVE · 3서비스 publish · CANONICAL-INDEX §7 등록

---

# 1. 기준선 · 목표 · 작업 원칙

## 1.1 기준 문서

정본:

`docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md`

사실 기준:

`docs/investigations/IR-O4O-STORE-OWNER-SERVICE-AGREEMENT-STANDARD-CONTRACT-BASELINE-V1.md`

공통 약관:

`docs/baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md`

개인정보:

* `docs/baseline/O4O-PRIVACY-POLICY-V1.0.md`
* `docs/baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md`

## 1.2 이번 WO의 완료 목표

다음 4건을 모두 닫는다.

```text
A. store_owner_agreement 문서유형 + agreement acceptance
B. Store Workspace 계약 미동의 gate
C. K-Cosmetics / PharmacyHub 사업자정보 필수 확인
D. 계약 종료 시 정보 반환 + 활성 저장소 7일 파기 최소 운영체계
```

4건 중 하나라도 불완전하면 계약을 ACTIVE/published로 전환하지 않는다.

## 1.3 계약 게시 금지

이번 WO 동안:

```text
store_owner_agreement published = 0
```

유지한다.

코드는 **문서가 published되지 않은 상태에서는 기존 사용자 접근을 차단하지 않아야 한다.**

## 1.4 다른 세션 보호

시작 전:

```bash
git status --short
git rev-parse HEAD
git rev-parse origin/main
```

확인한다.

이번 대상 파일과 다른 세션 dirty 파일이 겹치면 해당 파일을 수정하지 말고 먼저 보고한다.

다른 세션 파일 stage/commit 금지.

---

# 2. 계약문서 유형 · 동의 이력 확장

## 2.1 document_type 정식 추가

`SUPPORTED_POLICY_DOCUMENT_TYPES`에 다음을 추가한다.

```text
store_owner_agreement
```

`custom`이나 `seller`를 우회적으로 재사용하지 않는다.

문서 성격을 데이터 모델에서 명확히 구분한다.

## 2.2 런타임 SSOT

계약 원문:

```text
service_policy_documents
document_type = store_owner_agreement
```

계약 동의:

```text
user_policy_acceptances
acceptance_kind = agreement
document_type = store_owner_agreement
```

기존 테이블을 재사용한다.

별도의 계약 acceptance 테이블은 만들지 않는다.

## 2.3 acceptance service 일반화

현재 `policyAcceptanceService.accept`의 `terms` 전용 제약을 안전하게 일반화한다.

권장 구조:

```text
acceptRequiredAgreement({
  userId,
  serviceKey,
  policyDocumentId,
  requiredDocumentType
})
```

또는 동등한 구조.

허용 타입은 명시적으로 제한한다.

현재 mandatory agreement:

```text
terms
store_owner_agreement
```

아무 `custom` 문서나 제출하여 agreement로 인정되지 않아야 한다.

## 2.4 검증 계약

서버는 클라이언트가 보내는 document id를 그대로 신뢰하지 않는다.

최소 검증:

```text
service_key 일치
document_type = store_owner_agreement
status = published
해당 서비스의 현재 적용 문서
version 일치
content_hash 일치
```

성공 시 기존 `user_policy_acceptances` 구조로 저장한다.

## 2.5 published 문서 불변성

통합약관 WO에서 확정한:

```text
PUBLISHED_POLICY_IMMUTABLE
```

계약도 동일하게 적용한다.

published 계약은 덮어쓰지 않는다.

변경은:

```text
새 draft
→ 새 version
→ publish
→ 새 acceptance
```

방식으로 처리한다.

## 2.6 Migration

`service_policy_documents.document_type`가 varchar + 앱 whitelist 구조이고
`user_policy_acceptances.document_type`도 별도 DB CHECK가 없다면 migration을 만들지 않는다.

DB constraint가 실제로 추가 변경을 요구할 경우에만 migration한다.

불필요한 schema 변경 금지.

---

# 3. Store Workspace 전용 계약 Gate

## 3.1 적용 대상

다음 역할을 실제 보유한 사용자만 대상으로 한다.

```text
kpa:store_owner
cosmetics:store_owner
pharmacy-hub:store_owner
```

현행 canonical guard를 기준으로 한다.

legacy `pharmacy` 역할은 실제 Store Workspace 접근 계약을 조사하여 필요한 경우 호환 대상으로 포함한다.

내부 admin/operator 계정이라는 이유만으로 자동 계약대상으로 만들지 않는다.

## 3.2 Gate 범위

통합약관처럼 로그인 전체를 막지 않는다.

차단 범위:

```text
Store Workspace
store-owner 전용 API
매장 콘텐츠/상품/QR/태블릿/사이니지 write
```

일반 커뮤니티·일반 회원 기능은 매장 계약 미동의 때문에 차단하지 않는다.

## 3.3 Gate 판정

현재 서비스에 published `store_owner_agreement`가 없으면:

```text
ALLOW
```

게시 전 코드 선배포가 안전해야 한다.

published 계약이 있고 store_owner인데 acceptance가 없으면:

```text
HTTP 428
code = STORE_OWNER_AGREEMENT_REQUIRED
```

반환 metadata 최소:

```text
serviceKey
documentType
policyDocumentId
version
title
```

본문 전체를 API 오류에 싣지 않는다.

## 3.4 frontend Gate

KPA / K-Cosmetics / PharmacyHub의 Store Workspace shell에서 공통 gate를 사용한다.

권장:

`@o4o/shared-space-ui` 또는 기존 공통 UI 패키지에

```text
StoreOwnerAgreementGate
```

구현.

가능 행동:

```text
계약 전문 보기
동의
일반 서비스로 돌아가기
로그아웃
```

닫기·뒤로가기·직접 URL로 Store Workspace를 우회할 수 없어야 한다.

## 3.5 기존 store_owner

기존 회원의 acceptance를 소급 생성하지 않는다.

```text
BACKFILL_STORE_OWNER_ACCEPTANCE = 0
```

계약 publish 이후 최초 Store Workspace 진입 시 직접 동의한다.

## 3.6 allowlist

계약 미동의 상태에서도 최소 다음은 허용한다.

* 로그인 / 로그아웃 / refresh
* `/auth/me`
* public 계약 조회
* agreement acceptance 제출
* 개인정보 처리방침·통합약관 조회
* 계정 보안
* 문의/contact
* Store Workspace 밖의 일반 회원기능

---

# 4. 사업자정보 필수 확인

## 4.1 정책

store_owner **계정 생성 자체가 아니라 Store Workspace 활성화 전** 사업자정보를 완성한다.

필수항목:

```text
매장명 또는 상호
대표자명
사업자등록번호
사업장 주소
사업장 연락처
```

세금계산서 이메일은 현재 무료서비스이므로 필수 아님.

## 4.2 KPA Society

현재 businessNumber가 없는 경우 store_owner 부여가 보류되는 canonical 구조를 유지한다.

회귀만 검증한다.

불필요한 수정 금지.

## 4.3 K-Cosmetics

프론트 검증만 믿지 않는다.

store_owner 신청 또는 승인 시 backend에서도 필수 5항목을 검증한다.

누락 시 명확한 오류:

```text
STORE_OWNER_BUSINESS_INFO_REQUIRED
```

회원계정 전체 생성을 실패시켜야 하는지,
pending membership 상태로 두고 보완하게 할지는 현재 가입 흐름을 유지하는 방향으로 최소 수정한다.

**핵심 조건: 필수정보 없이 active store_owner가 될 수 없어야 한다.**

## 4.4 PharmacyHub

현행 약국명만 받는 흐름을 정비한다.

store_owner 신청 단계 또는 승인 전 보완단계에서 최소 5항목을 받는다.

약국명:

```text
businessName / pharmacyName
```

canonical 기존 매핑을 유지한다.

사업자등록번호를 운영자가 나중에 임의 입력해야만 계약이 성립하는 구조를 없앤다.

## 4.5 승인 guard

최종 store_owner 활성화 직전 공통 또는 서비스별 backend에서 재검증한다.

```text
businessInfo complete
→ approve store_owner

businessInfo incomplete
→ approval reject/hold
```

프론트 validation 우회로 active role을 받을 수 없어야 한다.

## 4.6 기존 store_owner

기존 store_owner 중 필수 사업자정보가 부족한 계정을 read-only로 census한다.

기존 값을 임의 생성하거나 추정하지 않는다.

계약 publish 전:

```text
COMPLETE
INCOMPLETE
```

만 집계 보고한다.

INCOMPLETE 사용자는 계약 동의 화면에서 사업자정보 보완을 먼저 요구하도록 한다.

---

# 5. 계약 종료 · 정보 반환 · 7일 파기 운영체계

## 5.1 목표

계약 제21조의 다음 약속을 실제 수행할 수 있어야 한다.

```text
반환 요청 접수
→ 합리적인 전자적 형식으로 반환
→ 계약 종료
→ 활성 저장소 7일 이내 파기 절차 완료
→ 백업은 보존주기 만료 시 소멸
```

"즉시 전체 export" 기능을 만들 필요는 없다.

그러나 계약 게시 후 실제 요청이 들어왔을 때 운영자가 이를 수행하고 증빙할 수 있어야 한다.

## 5.2 종료 Case SSOT

종료·반환·파기 진행상태를 action log만으로 추적하지 않는다.

전용 case 구조를 만든다.

권장 table:

```text
store_owner_termination_cases
```

이번 WO는 이 목적의 migration을 **승인**한다.

최소 필드:

```text
id
service_key
organization_id
user_id

status

requested_at
requested_by

return_requested
return_completed_at

termination_effective_at
purge_due_at
purge_completed_at

created_at
updated_at
```

필요 시:

```text
cancelled_at
failure_reason
```

정도만 추가한다.

개인정보 원문·export 내용 자체는 case table에 저장하지 않는다.

## 5.3 상태

최소:

```text
requested
return_pending
return_completed
termination_scheduled
terminated
purge_completed
cancelled
failed
```

실제 구현에 맞게 단순화 가능하나

```text
종료일
7일 purge deadline
purge 완료
```

는 반드시 추적 가능해야 한다.

## 5.4 반환 범위

계약 별표 1 기준:

### 반환 대상

A. 매장 기본정보
B. 매장 자체 상품·선택정보
D. 매장 사본의 매장 편집정보
E. 매장 제작자료

### 반환 제외

C. 공급자·운영자 원본
F. 회사 보안·감사·시스템로그

반환 package에 공급자 원본파일 전체를 회사가 매장 소유자료인 것처럼 포함하지 않는다.

## 5.5 반환 형식

V1은 완전한 셀프서비스 export UI를 만들지 않는다.

운영자 실행 가능한:

```text
StoreOwnerDataExportService
```

또는 동등한 backend/maintenance 경로를 만든다.

합리적인 형식:

```text
JSON
CSV
원본 파일 또는 파일 목록
```

중 데이터 유형에 적절한 형식을 사용한다.

가능하면 하나의 ZIP package로 묶을 수 있으나,
ZIP 자체가 완료조건은 아니다.

반환 결과 manifest는 다음을 기록할 수 있다.

```text
exported categories
counts
generated_at
hash
```

개인정보 본문을 로그에 출력하지 않는다.

## 5.6 반환 전달

V1에서는 별도의 고객용 다운로드 포털을 필수로 만들지 않는다.

운영자가 요청자의 신원을 확인한 뒤 안전한 방법으로 전달할 수 있도록 한다.

공개 GCS URL에 개인정보 export package를 방치하지 않는다.

임시 export 파일을 서버/스토리지에 두는 경우 짧은 만료정책을 적용한다.

## 5.7 Purge inventory

파기 로직을 작성하기 전에 organization/service 기준으로 A/B/D/E 데이터의 실제 table/FK/GCS 경로를 전수 확정한다.

최소 조사대상:

```text
organizations
organization_service_enrollments
users.businessInfo 관련 service 사용

store_products
store_product_profiles
store_local_products
organization_product_listings
organization_product_channels

asset_snapshots
kpa_store_contents
store_execution_assets
store_asset_derivations
관련 product/content link tables

store_blog_posts
store_pops
store_pop_documents
store_qr_codes
store_qr_placements
store_tablets
store_tablet_displays
screen sets
store_playlists
store_playlist_items
store_videos
service-specific playlist tables
multilingual store content
관련 GCS objects
```

실제 최신 schema가 다르면 최신 구조를 따른다.

테이블명을 추측하여 DELETE하지 않는다.

## 5.8 Shared-data 보호

하나의 organization이 여러 O4O 서비스를 이용할 수 있으므로
특정 serviceKey 계약 종료 시 다른 활성 서비스의 공용 데이터를 파괴해서는 안 된다.

각 row를:

```text
SERVICE_SCOPED
ORGANIZATION_SHARED
USER_SHARED
SUPPLIER_OWNED
SYSTEM_LOG
```

로 분류한다.

특정 서비스 종료만으로 shared organization 자체를 무조건 삭제하지 않는다.

## 5.9 공개표면 우선 중단

계약 종료 effective 시점에는 최소한 다음 공개표면을 즉시 또는 우선 비활성화한다.

* QR
* 공개 product/content landing
* 태블릿 공개 세트
* 사이니지 공개/재생 구성
* 해당 서비스의 Store Workspace 접근

내부 파기는 그 후 7일 이내 완료한다.

## 5.10 GCS

DB row만 지우고 GCS 객체를 orphan으로 남기지 않는다.

삭제대상 row에 연결된 매장 소유 GCS object를 식별하여 함께 제거한다.

단:

* 공급자 원본
* 다른 매장/서비스가 공유하는 object
* system asset

을 삭제하지 않는다.

GCS 삭제 실패 시 DB row만 제거하고 성공 처리하지 않는다.

```text
PURGE_INCOMPLETE
```

로 남기고 재처리한다.

## 5.11 7일 deadline

계약 종료일:

```text
termination_effective_at
```

파기 기한:

```text
purge_due_at =
termination_effective_at + 7 days
```

로 명확히 기록한다.

V1은 daily scheduled job 또는 운영자 dashboard/manual command 중 어느 방식도 가능하다.

그러나 overdue case를 발견할 수 있어야 한다.

최소:

```text
due
overdue
completed
```

조회가 가능해야 한다.

## 5.12 백업

Cloud SQL 자동백업/PITR의 개별 매장 단위 삭제는 하지 않는다.

활성 DB에서 삭제 후:

```text
backup retention cycle expiry
```

에 따라 자연 소멸하도록 한다.

수동 복구본은 기존 개인정보 보유정책:

```text
최대 30일
```

을 유지한다.

## 5.13 로그

F 운영·감사로그는 store termination purge 대상에서 제외한다.

현재 정본 보유기간:

```text
접속·감사로그 1년
법정 2년 대상이면 2년
로그인 시도 30일
```

을 유지한다.

## 5.14 실삭제 안전장치

production purge는 반드시:

```text
dry-run
→ 대상 count
→ GCS object count
→ shared-data exclusion
→ apply
→ post-assertion
```

순서로 수행한다.

초기 production smoke에서는 실제 운영 매장을 삭제하지 않는다.

격리 fixture organization으로 검증한다.

실운영 종료 case가 최초 발생하면 별도 사용자 승인 또는 canonical 운영절차에 따라 실행한다.

---

# 6. 테스트 · 배포 · 안전성 검증

## 6.1 계약문서/acceptance

테스트:

* `store_owner_agreement` draft 생성 가능
* published 조회 가능
* agreement acceptance 저장 가능
* 다른 service document 제출 거부
* terms acceptance 회귀 없음
* published immutability 유지

## 6.2 Store Gate

각 3서비스:

```text
published agreement 없음 → 기존 접근 PASS
published agreement + 미동의 → Store Workspace 428
일반 회원영역 → PASS
agreement 동의 → Store Workspace PASS
```

직접 API 호출 우회 실패 확인.

## 6.3 사업자정보

### KPA

기존 business gate 회귀 PASS.

### K-Cosmetics

필수 5항목 누락:

```text
active store_owner 승인 불가
```

### PharmacyHub

약국명만 입력:

```text
active store_owner 승인 불가
```

필수 5항목 완성 후 승인 PASS.

## 6.4 종료 lifecycle

격리 DB fixture로 최소 검증:

1. service-only store data 생성
2. shared organization data 생성
3. supplier original 생성
4. GCS/mock object 생성
5. termination case 생성
6. export
7. public surface disable
8. purge dry-run
9. purge apply
10. post assertion

기대:

```text
A/B/D/E target deleted
C supplier original retained
F logs retained
other-service shared data retained
GCS target deleted
unrelated GCS retained
case purge_completed
```

## 6.5 Production smoke

실제 매장 데이터 삭제 금지.

허용:

* schema 확인
* agreement type API 확인
* published 문서가 없을 때 gate no-op
* business validation UI/backend
* termination dry-run 구조
* 테스트/fixture 데이터가 명시적으로 허용된 경우에만 cleanup

## 6.6 Build/CI

최소:

* API typecheck/build
* migration fresh bootstrap
* migration production prefix/post assertion
* policy acceptance tests
* Store guard tests
* KPA/KCos/PH frontend typecheck/build
* relevant contract tests
* CI pipeline

## 6.7 Git

변경 파일만 path-specific commit.

다른 세션 파일 stage 금지.

migration manifest 충돌 시 타 세션 commit 완료 후 최신 main에서 순서를 다시 계산한다.

---

# 7. 완료조건 · 산출물 · 완료보고

## 7.1 완료조건

다음 모두 충족해야 CLOSED다.

```text
store_owner_agreement document type = canonical
agreement acceptance = production capable

published agreement 없음 → no blocking
published agreement 있음 → store_owner only gate
bypass = 0

KPA business gate = retained
KCos incomplete store_owner activation = 0
PH incomplete store_owner activation = 0

termination case lifecycle = implemented
return procedure = executable
active-store purge = executable
purge deadline = 7 days
shared-data accidental deletion = 0
supplier original deletion = 0
audit/log retention regression = 0
GCS orphan-on-purge = 0

existing store_owner acceptance backfill = 0
role/membership unrelated change = 0
```

## 7.2 문서 산출물

최소:

```text
docs/checks/CHECK-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1.md
```

필요하다면 운영 runbook:

```text
docs/runbooks/STORE-OWNER-CONTRACT-TERMINATION-AND-DATA-RETURN-V1.md
```

를 추가할 수 있다.

단순 구현설명을 baseline으로 새로 만들지 않는다.

## 7.3 계약 DRAFT 상태

이번 WO 완료 후 계약 기준문서는:

```text
DRAFT — 게시 선행조건 완료, 게시 대기
```

상태로 갱신할 수 있다.

시행일은 아직 확정하지 않는다.

`CANONICAL-INDEX` ACTIVE 등록은 아직 하지 않는다. (통합약관·개인정보 처리방침과 동일하게 실제 `ACTIVE + published` 시점에 등록한다.)

## 7.4 다음 작업

이번 WO가 CLOSED된 뒤 별도 게시 작업에서:

```text
1. 시행일 확정
2. DRAFT → ACTIVE
3. render-policy-plain --verify
4. 3서비스 store_owner_agreement v1 publish
5. 기존 store_owner explicit acceptance smoke
6. Store Workspace 428 → 동의 → PASS 검증
7. CANONICAL-INDEX §7 등록
8. 게시 CHECK
```

를 수행한다.

## 7.5 완료보고

다음 순서로 보고한다.

1. 시작 Git 상태 / 타 세션 충돌 여부
2. document_type 확장
3. acceptance service 변경
4. store_owner agreement API 계약
5. Store Workspace gate
6. KPA 사업자정보 회귀
7. K-Cosmetics 사업자정보 gate
8. PharmacyHub 사업자정보 보완
9. 기존 store_owner incomplete census
10. termination case schema
11. 반환 package 구현
12. purge inventory
13. service/shared/supplier/log 분류
14. GCS purge
15. 7일 deadline 및 overdue 처리
16. 백업·로그 제외 정책
17. migration 결과
18. tests/build/CI
19. production smoke
20. 실운영 데이터 삭제 건수
21. 기존 acceptance backfill 0
22. role/membership 비의도 변경 0
23. CHECK/runbook
24. commit SHA / push
25. 최종 Git 상태
26. 매장 경영자 이용계약 v1.0 게시 가능 여부
