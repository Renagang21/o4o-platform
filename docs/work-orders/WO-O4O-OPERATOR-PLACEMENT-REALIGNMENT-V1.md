# 운영자 배치 재정의 — 중앙 회원 관리 · 서비스별 운영 · 분회 · 협동조합 관리 · O4O 회원약국

> **상태**: DRAFT
> **작성일**: 2026-11-14 · **최종 갱신**: 2026-11-14 (U10 · U11 추가 · T3 설계 §10)
> **실행 위치**: BOTH
> **인계**: `claude/ecstatic-mendel-2ohu27-operator-placement` · c92a7a1f · 다음 실행자 CLOUD(T1 기준 문서 개정안) → LOCAL(T2 조회)
> **근거**: 사용자 확정(2026-11-14 · 아래 §2). 선행 기록 — [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V2`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md) §3 · [`O4O-CURRENT-ADMIN-ROLE-POLICY-V1`](../baseline/O4O-CURRENT-ADMIN-ROLE-POLICY-V1.md) · [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) · [`WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1`](WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md)

## 1. 배경 — 현재 코드 · 정본 대조 (2026-11-14 조사)

| 대상 | 현재 코드 | 현재 정본 |
|---|---|---|
| 중앙 업무 운영 `admin.neture.co.kr/operations` | 서비스 메뉴: neture(약국·공통 운영) · supplier · funding · lecture · community · partner-support · pharmcoop(연합회). 중앙 직영 역할은 `operator-role-catalog.ts` `CENTRAL_SERVICE_PREFIXES` + `neture:pharmcoop_*` | V2 §3: 위 서비스를 O4O 직접 운영 · 중앙 담당 |
| 회원 관리 | 중앙 한 곳(`/operations/neture/members` · Admin `/admin/platform/users`) | 같음 |
| 공급자 제품 등록 승인 | 「약국·공통 운영 → 상품 → 상품 취급 승인」(`neture.product-approvals`). API `/neture/operator/products/*` 는 Neture scope + 이 메뉴 위임 필요(`central-operation-menu.middleware.ts`) | 메뉴 위치 규정 없음 |
| 분회(kpa.neture.co.kr) | 중앙 메뉴 없음. 분회 생성 · 수정 · 삭제 API 는 있음(`POST/PATCH/DELETE /kpa-branch/admin/branches` · `platform:super_admin` 전용 · `kpa_organizations`). 화면은 분회 사이트 `/service-admin` 에만 있음. 분회 운영자(`kpa-branch:operator`)는 분회 서비스 관리자가 분회 사이트에서 지정 | V2 :52 분회 서비스 플랫폼 업무 = O4O 직접 운영, :53 개별 분회 = 독립 조직 운영 |
| 협동조합(pharmcoop 산하) | 중앙 「연합회」 메뉴는 목록 · 상태 변경(`/federation/:coop/actions/:action`) · 역할 · 이력. 조합 생성은 **가입 신청(affiliation, `cooperatives.status` pending→active)** 흐름. 중앙에서 직접 생성 · 수정 · 삭제하는 화면 없음 | V2 :47 연합회 범위 = 중앙, :48 개별 조합 = 독립 |
| pharmacy.neture.co.kr | 서브도메인 자체 사업 운영(`/operator/semi-franchises`, `requireNetureBusinessScope` · 중앙 래핑 없음). 사업 Admin 화면은 관리자 사이트 `/admin/semi-franchises` · `/admin/pharmacy-service-settings`(`neture:admin`) | V2 :51 「사업 운영 주체 미확정 · 중앙 편입 금지」. WO-PHARMACY-BUSINESS-INDEPENDENCE D1 「pharmacy 는 다른 세 협력사업과 같은 수준의 독립 사업」(2026-10-20) |
| drugstore · carepharm | 서브도메인 자체 운영 | V2 :49-50 독립 사업자 운영 |

## 2. 사용자 확정 (2026-11-14)

| # | 결정 |
|---|---|
| U1 | 관리 주체는 두 층이다. **중앙 관리**(전체 관리자와 그가 지정한 사람 · `admin.neture.co.kr`)와 **독립 운영**(해당 기관 · 사업의 자체 Admin · Operator · 해당 서브도메인). |
| U2 | **O4O 가입과 회원 관리는 `admin.neture.co.kr` 한 곳**에서 지금처럼 한다. 가입 유형은 약사 · 약국경영자 · 파트너 · 공급자다. |
| U3 | 가입할 때 이용할 서비스가 정해지므로 각 서비스에는 회원 관리가 아니라 **서비스 운영 관리**가 필요하다. 약사 · 약국경영자 · 파트너 · 공급자가 쓰는 서비스의 운영은 모두 중앙에서 한다. 중앙의 **서비스별 메뉴 구조는 지금이 맞다**. (같은 날 앞서 말한 「공급자 · 파트너는 서브도메인 자체」는 사용자가 정정했다.) |
| U4 | O4O 회원이 추가로 가입 신청 · 승인을 거치는 곳은 **약국 협업체 · 연합회 산하 협동조합 · 분회**뿐이다. 그 안의 회원 관리는 각 기관이 한다. |
| U5 | **분회 · 협동조합 자체는 가입 신청 · 승인 절차가 없다.** 중앙이 화면에서 **생성 · 수정 · 삭제 · 목록 관리 · 각 기관 Admin 지정 · 사이트 설정**을 한다(개발자가 코드 · seed 로 만드는 방식이 아니다). 협동조합 연합회 · 분회 관리는 약국 협업체 업무와 비슷하고, 다른 점은 가입이 없다는 것 정도다. |
| U6 | **분회 · 협동조합의 회원 · 회비 · 게시물 · 행사 등 회원 대상 업무는 모두 각 분회 · 각 조합 소관**이다. |
| U7 | **pharmacy.neture.co.kr 의 이름은 「O4O 회원약국」**이다. 약국 협업체이지만 O4O 에 가입한 모든 약국이 대상이므로 **중앙에서 운영**한다. 약국경영자는 자동으로 회원이 되므로 **별도 회원 관리 메뉴를 두지 않는다**. |
| U8 | 약국 협업체 가운데 **독립 운영으로 남는 곳은 drugstore · carepharm** 이다. |
| U9 | 공급자 제품 등록 승인(「상품 취급 승인」)은 상품 정비 메뉴가 아니라 **중앙의 「공급자」 메뉴**에 둔다. 공급자 · 파트너 · 협동조합 연합회는 중앙 유지. |
| U10 | **O4O 회원약국 약관은 따로 둔다. 동의는 약국경영자로 O4O 에 가입할 때 함께 받는다.** 다른 협업체처럼 사업에 다시 가입하며 동의받는 절차는 두지 않는다. |
| U11 | **협업체끼리 게시물 · 자료가 섞이지 않게 하는 분리(WO-PHARMACY-BUSINESS-INDEPENDENCE D2)는 O4O 회원약국에도 유지한다.** 운영 주체만 중앙으로 바뀌고, 포럼 · 콘텐츠 · 자료 · 미디어 · 사이니지 · 장바구니 · 운영 화면 데이터는 사업별로 나뉜다. 로그인 계정은 모든 사업이 O4O 공통 계정 하나다. |

## 3. 설계 판단

| # | 판단 | 근거 · 영향 |
|---|---|---|
| P1 | 중앙 서비스 목록에 **「분회 관리」(`kpa-branch`)와 「O4O 회원약국」(`pharmacy`)** 을 추가한다. 기존 7개 서비스는 유지(U3 · U9). | U3 · U5 · U7. 서비스 key 의 최종 표기(`kpa-branch` · `pharmacy` 또는 기존 `neture:pharmacy_*` 역할 유지)는 T3 에서 기존 역할 · 위임 데이터와 대조해 정한다 |
| P2 | 「분회 관리」 중앙 업무 = 분회 생성 · 수정 · 삭제 · 목록 · 분회 Admin 지정 · 분회 사이트 설정. 기존 API(`/kpa-branch/admin/branches`)를 재사용하고 분회 사이트 `/service-admin` 의 같은 기능은 중앙으로 옮긴다. 분회 내부(회원 · 회비 · 게시물 · 행사 · 임원 · 신상신고)는 분회 사이트에 그대로 둔다. | U5 · U6. 현재 API 는 `platform:super_admin` 전용 — 중앙 위임 운영자에게 열지는 T4 에서 별도 승인(§5 권한 변경) |
| P3 | 「협동조합 관리」(현 「연합회」 메뉴)는 **중앙이 직접 생성 · 수정 · 삭제 · 조합 Admin 지정**을 하도록 바꾼다. 조합의 가입 신청(affiliation) 흐름은 U5 와 맞지 않으므로 신규 신청 진입을 닫는다. 기존 pending · rejected 행이 있으면 처리 방법을 T2 결과로 정한다. | U5. affiliation 흐름 폐지는 상태값 · migration 영향(`cooperatives_status_check` · rollback 가드)이 있어 T2 확인 후 결정 |
| P4 | 「O4O 회원약국」 중앙 메뉴 = 사업 운영(현 pharmacy 서브도메인 `/operator/semi-franchises` 업무) · 서비스 설정(현 Admin `/admin/pharmacy-service-settings`). **회원 관리 메뉴는 만들지 않는다**(U7). 약국경영자 자동 회원 연결은 V2 :40 「Pharmacy 기본 회원은 약국 승인과 함께 연결(2026-10-31)」 현행 동작을 확인만 한다. | U7. pharmacy 서브도메인의 공개 · 회원용 화면은 그대로 두고 운영 화면만 중앙으로 옮긴다 |
| P5 | 「상품 취급 승인」은 중앙 「공급자」 메뉴로 옮긴다(`supplier.product-approvals`). 승인하는 사람은 중앙의 공급자 담당 운영자. API 권한을 공급자 scope 로 넓히는 것과 기존 `neture.product-approvals` 위임의 이전 방법은 T4 에서 정한다. | U9. 권한 범위 변경(§5) · 기존 위임 데이터(`central_operation_menu_grants.menu_keys`) 이전 필요 |
| P6 | drugstore · carepharm · 개별 조합 · 개별 분회의 자체 Admin · Operator 구조는 바꾸지 않는다. | U1 · U6 · U8 |

## 4. 정본 충돌 — 먼저 개정할 문서

| 문서 | 충돌 내용 | 처리 |
|---|---|---|
| `O4O-ROLE-WORKSPACE-ARCHITECTURE-V2` §3 :51 | pharmacy 「사업 운영 주체 미확정 · 중앙 편입 금지」 | U7 로 「O4O 직접 운영 · 중앙의 O4O 회원약국 담당」으로 개정 |
| 같은 문서 :47-48 · :52-53 | 연합회 · 분회 중앙 범위가 「플랫폼 업무」로만 적혀 생성 · 수정 · 삭제 · Admin 지정 주체가 불명확 | U5 · U6 문장으로 명시 |
| `WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1` D1(2026-10-20) | 「pharmacy 는 다른 세 협력사업과 같은 수준의 독립 사업」 | 운영 주체(D1)는 U7, 약관 동의 시점(D3 일부)은 U10 으로 대체. 데이터 분리(D2)는 U11 로 유지. 기록물이라 본문은 고치지 않고 개정 정본에 대체 관계를 적는다 |
| `O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1` :59 admin 행 · :68 | 「각 서비스의 관리자(운영자)는 해당 서브도메인에 배치」(2026-10-08) — V2 와도 어긋난 채 머리말 부분 대체 표기로만 덮여 있음 | 개정 정본 기준으로 SUPERSEDED 범위 표기 정리 |
| `O4O-CURRENT-ADMIN-ROLE-POLICY-V1` :12 | 「운영 업무는 업무 운영(`/operations`) 한 곳에서」 | U3 와 일치. 독립 운영(U1 · U8) 예외 문장만 보강 |

## 5. 범위 밖

- 분회 · 조합 내부 회원 · 회비 · 게시물 · 행사 기능 변경(U6).
- drugstore · carepharm 운영 구조 변경(U8).
- 중앙 회원 관리 화면 구조 변경(U2 — 지금 유지).
- 2026-11-14 운영자 화면 전반 점검에서 나온 보완 항목(안내 문구 API 권한 · 주문 화면 · 포럼 분석 등)은 별도 작업이다. 이 WO 는 배치만 다룬다.

## 6. TODO

순서는 `AGENTS.md` §4-3 R2(공통 먼저 · 서비스 나중)와 R6(기준 문서는 문서 전용 PR)을 따른다.

- [x] **T1 [CLOUD] 기준 문서 개정** (2026-11-14 — V2 상단 결정 · §3 행 · §8-1, SEMANTICS 상단 대체 표기, ADMIN-ROLE-POLICY 현재 결정 보강) — §4 표대로 V2 §3 개정(또는 V3) · SEMANTICS 대체 범위 표기 · ADMIN-ROLE-POLICY 보강. 문서 전용 PR. 사용자 확인 완료(U10 · U11): 데이터 분리 유지, 약관은 따로 두되 동의는 약국경영자 가입 때 받음.
- [ ] **T2 [LOCAL] 운영 DB read-only 조회** — 아래 §7 SQL. 결과는 건수만 마스킹해 이 문서 §8 에 기록.
- [x] **T3 [CLOUD] 중앙 서비스 목록 · 역할 설계** (2026-11-14 — §10. §10-7 사용자 확인 3건 남음) — `CENTRAL_OPERATION_MENUS`(packages/types) · `centralOperationAreas` · `CENTRAL_SERVICE_PREFIXES` 에 분회 관리 · O4O 회원약국 추가 설계. 기존 역할(`kpa-branch:admin` · `neture:pharmacy_*`)과 위임 데이터 대조 후 key 확정. 공유 모듈 변경이므로 [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) 소비처 식별 포함.
- [ ] **T4 [CLOUD] 서버 권한(§5 승인 필요)** — ① 분회 생성 · 수정 · 삭제 API 를 중앙 분회 관리 위임자에게 열지 ② 협동조합 생성 · 수정 · 삭제 API 신설 · affiliation 신규 진입 차단 ③ O4O 회원약국 운영 API 의 중앙 위임 적용 ④ 상품 취급 승인 API 의 공급자 scope 허용과 `neture.product-approvals` 위임 이전. 각 항목 통합 담당 승인 후 진행. 위임 데이터 이전이 필요하면 별도 단계(운영 DB write — 통합 담당 명시 승인).
- [ ] **T5 [CLOUD] 중앙 화면** — 「분회 관리」(목록 · 생성 · 수정 · 삭제 · Admin 지정 · 사이트 설정, §3-1 표준 리스트) · 「협동조합 관리」(같은 구성) · 「O4O 회원약국」(사업 운영 · 서비스 설정) · 「공급자 → 상품 취급 승인」. 서비스당 1 PR.
- [ ] **T6 [CLOUD] 정리** — 분회 사이트 `/service-admin` 의 분회 생성 · 수정 · 삭제를 중앙 안내 링크로 교체, pharmacy 서브도메인 운영 화면 · Admin `/admin/semi-franchises`(pharmacy 분) · `/admin/pharmacy-service-settings` 를 중앙으로 안내, 조합 affiliation 신청 화면 정리, 옛 메뉴 key 제거(expand → migrate → contract).
- [ ] **T7 [LOCAL] 배포 후 확인** — §9.

## 7. LOCAL read-only SQL (T2)

> `o4o_readonly` 계정으로 실행한다. 원문(이름 · 이메일 · 조합명)은 고르지 않고 건수만 본다.

```sql
-- Q1. 분회 수 · 활성 여부 (P2: 중앙 목록 대상 규모)
SELECT type, is_active, COUNT(*) FROM kpa_organizations GROUP BY type, is_active ORDER BY 1, 2;

-- Q2. 협동조합 상태별 수 (P3: affiliation 폐지 시 pending/rejected 처리 필요 여부)
SELECT status, COUNT(*) FROM cooperatives GROUP BY status ORDER BY 1;

-- Q3. 상품 취급 승인 위임 보유 건수 (P5: 위임 이전 대상 규모)
SELECT COUNT(*) AS grants_with_product_approvals
FROM central_operation_menu_grants
WHERE 'neture.product-approvals' = ANY(menu_keys);

-- Q4. 관련 역할 보유 건수 (P1 · P4: 역할 key 확정)
SELECT role, COUNT(*) FROM role_assignments
WHERE is_active = true
  AND (role LIKE 'kpa-branch:%' OR role LIKE 'neture:pharmacy\_%' ESCAPE '\' OR role LIKE 'neture:pharmcoop\_%' ESCAPE '\')
GROUP BY role ORDER BY 1;
```

판정:
- Q2 에 `pending` · `rejected` 가 0 이면 affiliation 신규 진입 차단만 하면 된다. 0 이 아니면 각 건을 중앙 생성으로 확정할지 · 반려로 정리할지 사용자 판단이 필요하다(삭제는 하지 않는다).
- Q3 가 0 이면 위임 이전 없이 key 교체만 한다. 0 이 아니면 T4 에서 이전 단계(운영 DB write)를 따로 승인받는다.
- Q4 의 `neture:pharmacy_*` 보유가 있으면 「O4O 회원약국」 중앙 역할로 이 역할을 그대로 쓸지 T3 에서 정한다. `role_assignments` 의 활성 컬럼 이름이 다르면 조회 전에 정본 스키마로 고친다.

## 8. T2 결과

(LOCAL 실행 후 기록)

## 9. 검증 계획

- T5 각 화면: PC · mobile 에서 목록 → 체크 → 상단 작업 → 실행 → 목록 갱신, 직접 URL · 위임 없는 운영자 차단 확인(§3-1 · `AGENTS.md` §6).
- 분회 · 조합 생성 → 해당 서브도메인에 새 기관이 보이고, 지정한 기관 Admin 이 자기 서브도메인에서 회원 · 게시물 업무를 할 수 있는지.
- 약국경영자 승인 → O4O 회원약국 회원 자동 연결(별도 가입 절차 없음) 확인.
- 약국경영자 가입 시 O4O 회원약국 약관 동의가 함께 기록되는지(U10), drugstore · carepharm 게시물 · 자료가 O4O 회원약국 화면에 보이지 않는지(U11).
- 상품 취급 승인: 중앙 공급자 담당 운영자가 승인 가능, Neture 상품 정비 위임만 있는 운영자는 메뉴가 보이지 않음.
- 운영자 · 관리자 화면은 Demo 계정 권한 밖이다 — 통합 담당이 운영 계정으로 확인한다.

## 10. T3 설계 (2026-11-14 · CLOUD)

> 코드는 바꾸지 않았다. 아래 「기존」은 코드에서 확인한 것, 「신설」은 T4 · T5 에서 만들 것이다.

### 10-1. 중앙 서비스 목록 (`packages/types/src/central-operation-menu.ts` `CENTRAL_OPERATION_SERVICES`)

| 서비스 key | 표시 이름 | 변경 |
|---|---|---|
| neture · supplier · funding · lecture · community · partner-support | 기존 그대로 | 없음 |
| `pharmcoop` | 「협동조합 연합회」 → **「협동조합 관리」** | 표시 이름만. key 유지(저장된 위임 보존) |
| `kpa-branch` | **「분회 관리」** | 신설 |
| `pharmacy` | **「O4O 회원약국」** | 신설 |

### 10-2. 역할 매핑 (`centralServiceForRole` · 서버 `CENTRAL_OPERATION_ROLES`)

| 중앙 서비스 | 중앙 역할 | 판단 |
|---|---|---|
| `kpa-branch` | `kpa-branch:admin` 만 | `kpa-branch:operator` 는 **개별 분회 운영자**(역할 + 본인 활성 분회 소속, `branch_memberships`)라 중앙으로 매핑하지 않는다. 분회 관리 메뉴는 모두 admin 등급. 중앙에서 분회 관리를 맡길 사람은 `kpa-branch:admin` 으로 지정한다(새 역할 없음) |
| `pharmacy` | `neture:pharmacy_admin` · `neture:pharmacy_operator` | 기존 사업 역할 재사용. `pharmcoop` 과 같은 특수 매핑. `CENTRAL_OPERATION_ROLES` 에 추가되므로 서비스 Admin 의 자체 운영자 지정은 서버가 막는다(`CENTRAL_ADMIN_REQUIRED`) — 중앙이 지정한다는 U7 과 일치. drugstore · carepharm 역할은 추가하지 않는다(U8) |
| `supplier` (상품 취급 승인) | `supplier:operator` · `supplier:admin` | 기존 역할 |

### 10-3. 메뉴 항목

| key | 이름 | 등급 | 화면 | API | 상태 |
|---|---|---|---|---|---|
| `kpa-branch.branches` | 분회 목록·생성·수정·삭제 | admin | 신설(§3-1 표준 리스트) | `POST/PATCH/DELETE /kpa-branch/admin/branches` 기존(**`platform:super_admin` 전용** → T4①에서 `kpa-branch:admin` + 중앙 위임으로). 비활성 포함 관리용 목록 API 는 없음 → 신설 | API 일부 기존 |
| `kpa-branch.branch-admins` | 분회 Admin 지정 | admin | 분회 사이트 `/service-admin`(ServiceAdminPage)의 지정 화면을 중앙으로 이전 | `/kpa-branch/admin/branches/:branchId/operators` 기존(`kpa-branch:admin`) | 기존 |
| `kpa-branch.domains` | 분회 사이트 주소 연결 | admin | 이전 | `/kpa-branch/admin/domains` 기존 | 기존 |
| `kpa-branch.site` | 분회 사이트 설정 | admin | 신설 | 현재 `/branches/:slug/operator/site` 는 **그 분회 운영자 전용** → 중앙 접근 경로 신설(T4①) | 신설 |
| (닫음) 분회 개설 신청 승인 | — | — | — | `/kpa-branch/branch-requests` · `/admin/branch-requests/*` 기존 — U5 와 맞지 않아 **신규 신청 진입 차단**. 대기 건 처리는 T2 결과로 | 정리 |
| `pharmacy.business` | 사업 운영(홈 소개·공급 제안·행사·모집·콘텐츠) | operator | `OperatorSemiFranchisePage`(`@o4o/operator-core-ui/modules/pharmacy-management`, key=`pharmacy`) 재사용. **가입 신청(memberships) 탭은 숨김**(U7) | `/neture/operator/semi-franchises/pharmacy/*` 기존(`cooperativeBusinessGuard` · 중앙 래핑 없음 → T4③) | 화면 재사용 |
| `pharmacy.inbox` | 문의 접수·처리 | operator | 기존 업무함 재사용 | `/operator/inbox/business/pharmacy` 계열 기존 | 기존 |
| `pharmacy.settings` | 서비스 설정 | admin | Admin `/admin/pharmacy-service-settings`(AdminPharmacyServiceSettingsPage, `neture:admin`)를 이전 | 기존 | 이전 |
| `pharmacy.legal` | 약관(U10) | admin | 현재 사업 약관 편집 위치 T4 전에 확인 | 확인 필요 | 확인 |
| `pharmcoop.federation` | **협동조합 관리**(목록·생성·수정·삭제·조합 Admin 지정) | members→business | 기존 FederationManagement 확장 | 목록·상태 변경·역할 조회 기존(`/federation*`). **생성·수정·삭제 API 없음 → 신설**(T4②). 조합 Admin 지정은 기존 `assignRole`(초대 · 본인 수락) 재사용. 가입 신청 `POST /affiliations` 은 신규 진입 차단 | 일부 신설 |
| `supplier.product-approvals` | 제품 등록 승인 | operator | `OperatorProductApprovalPage` 재사용 | 현재 `/neture/operator/products{,/:id/approve,/:id/reject,/batch-*}`(Neture scope). Neture scope 를 넓히지 않고 **공급자 scope 경로를 신설**해 같은 서비스 함수를 호출(T4④) | 신설 |
| `neture.product-approvals` | (이전 기간 유지) | — | — | — | expand→contract: 새 메뉴 정착 · 위임 이전(Q3) 후 제거 |

### 10-4. 서버 연결 (`central-operation-menu.middleware.ts` · scope guard)

- `centralApiMenus` 에 `kpa-branch` · `pharmacy` · `supplier.product-approvals` 경로 분류를 추가한다.
- 중앙 래핑(`withCentralOperationMenus`) 적용 대상: `kpa-branch` 의 **서비스 관리자 guard 만**(`adminGuards` · `branchServiceAdminGuards`). 분회 운영자 guard(`operatorGuards`)는 래핑하지 않는다(개별 분회 독립 운영 · U6).
- `pharmacy` 사업 API 는 `key=pharmacy` 일 때만 중앙 위임을 확인한다. drugstore · carepharm 은 지금처럼 래핑 없음(U8).
- 중앙 위임이 있는 사람만 제한받는 현재 동작(`scope_type='o4o-direct'` 일 때만 메뉴 · Google 강제)은 유지한다.

### 10-5. 공유 모듈 소비처 (protocol 1단계)

- `CENTRAL_OPERATION_SERVICES` · `CENTRAL_OPERATION_MENUS` · `centralServiceForRole` · `centralMenusForRole`:
  admin-dashboard `AdminOperationsDutySelection.tsx` · `CentralMenuGrants.tsx` · `CentralOperationsPage.tsx` · `central-operation-groups.ts` · `central-operation-navigation.ts` · 테스트 3개(`CentralOperationDirectory` · `CentralOperationLayout` · `central-operation-coverage`),
  api-server `central-operation-menu.middleware.ts` · `member-management-policy.middleware.ts` · `partner-support-scope.middleware.ts` · `subdomain-operator-scope.ts` · `operator-action-queue.controller.ts` · `service-legal-scope.ts` · `central-operation-access.routes.ts` · `admin-operations-operator-contract.ts` · `admin-operations-operators.ts` · `central-operation-menu-grants.ts` · `central-operation-overview.ts` · `service-operator-invitation.service.ts`.
- `CENTRAL_SERVICE_PREFIXES` · `CENTRAL_OPERATION_ROLES`: api-server `operator-role-catalog.ts` · `AdminUserController.ts` · `role-assignment.service.ts` · `central-operation-access.ts` · `service-operator-management.service.ts` · `service-tenant.resolver.ts`, admin-dashboard `lib/operator-role-catalog.ts` · `tests/operator-role-catalog.test.ts`.
- 구현 PR 에서 `node scripts/quality/check-literal-consumers.mjs --source <파일>` 로 문자열 소비처를 다시 확인한다(식별자 검색만으로 0 선언 금지).

### 10-6. PR 분할 (`AGENTS.md` §4-3 R2 · R1)

1. **PR-A 추가만(expand)** — types 메뉴 · 서비스 추가, 역할 매핑, `centralApiMenus` 분류. 화면 없음 · 기존 동작 불변. lane `shared-package:types` + `core-hub`.
2. **PR-B 서버 권한(T4 · 항목별 통합 담당 승인)** — ① 분회 관리 API(`kpa-branch:admin` + 중앙 위임, 관리용 목록 · 사이트 설정 경로) ② 협동조합 생성·수정·삭제 API · affiliation 신규 차단 ③ O4O 회원약국 사업 API 중앙 위임 ④ 공급자 scope 제품 승인 경로. migration 필요 시 별도 PR(`migration` lane).
3. **PR-C 화면(서비스당 1 PR)** — 분회 관리 · 협동조합 관리 · O4O 회원약국 · 공급자 제품 등록 승인.
4. **PR-D 정리(contract)** — 분회 사이트 `/service-admin` 이전분 · Admin `/admin/pharmacy-service-settings` · pharmacy 서브도메인 운영 화면 안내 · `neture.product-approvals` 제거(위임 이전 후).

### 10-7. 사용자 확인 필요 (T4 전)

1. **분회 「Admin」.** 현재 분회별 Admin 역할은 없고 분회 운영자 하나(`kpa-branch:operator` + 본인 분회 소속)만 있다. 제안: 1단계는 「분회 Admin 지정」 = 기존 분회 운영자 지정으로 쓰고, 분회 안에서 Admin · Operator 구분이 필요해지면 별도 결정(새 역할은 RBAC Freeze F9 변경). 또 지정 대상은 **그 분회에 소속된 회원**이어야 한다.
2. **분회 서비스 전체 설정 2가지의 위치.** 신상신고 연도 서식 열기(`/kpa-branch/admin/annual-report-templates`)와 분회 서비스 회원 상태(`/kpa-branch/admin/service-members`). 제안: 서식은 중앙 「분회 관리」, 회원 상태는 U2 에 따라 중앙 회원 관리로 합칠지 확인.
3. **조합 Admin 지정의 본인 수락.** 기존 조합 Admin 지정은 초대 → 본인 수락이다. 제안: 중앙이 지정해도 본인 수락은 유지.

## 문서 정합

- 발견 1건: `O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1` :59 admin 행이 V2 와 어긋난 채 머리말 부분 대체 표기로만 덮여 있다 → T1 에서 처리.
- SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건(T1 이 기준 문서 개정을 맡는다).
