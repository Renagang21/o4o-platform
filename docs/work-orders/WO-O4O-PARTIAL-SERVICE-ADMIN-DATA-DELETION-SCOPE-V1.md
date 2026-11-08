# 일부 이용자 서비스(공급자 · 파트너 · 약국협업체) admin 의 「서비스 데이터만 삭제」 범위 조사

> **상태**: ACTIVE
> **작성일**: 2026-11-07 · **최종 갱신**: 2026-11-08 (§8 CLOUD 조사 결과)
> **실행 위치**: BOTH
> **인계**: claude/vibrant-allen-56f5dq · 다음 실행자 **사용자 결정(§8-6)** → LOCAL (§7 운영 건수 확인) → CLOUD (구현 WO)
> **근거**: 2026-11-07 사용자 확정(아래 §2) · admin.neture.co.kr 운영자 메뉴 정리 PR(같은 branch) · [`WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1`](WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1.md) · [`WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1`](WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)

이 문서는 **조사 지시서**다. 삭제 기능 구현 · 운영 데이터 변경은 범위 밖이며, 조사 결과로 범위를 확정한 뒤 별도 구현 WO 를 연다.

## 1. 배경 — 현재 코드 (2026-11-07 main `03f13810` 기준)

| 항목 | 현재 상태 | 근거 |
|---|---|---|
| 서비스 관계 삭제 API | `DELETE /api/v1/operator/members/:userId` → `MembershipApprovalService.deleteMember`. hard 는 해당 서비스 `service_memberships` 만 지우고 `users` 는 건드리지 않는다(Identity 분리 완료) | `services/approval/MembershipApprovalService.ts` STEP H4 주석 · `routes/operator/membership.routes.ts:68` |
| admin.neture.co.kr 중앙 운영 화면 | `supplier` · `funding` · `lecture` · `community` 의 `members` 영역은 `allowDestructiveActions={false}` — admin 도 관계 삭제 버튼이 없다. 상태 변경(활성 · 정지 · 탈퇴)만 가능 | `apps/admin-dashboard/src/pages/operators/central-operation-renderers.tsx` |
| partner-support | 회원 이용 정지 · 해제, 글 · 댓글 숨김 · 복구. 서비스 데이터 삭제 경로 미확인 | `CentralPartnerModeration` · `PartnerCommunityOperator` |
| 약국협업체 | `pharmcoop` 은 중앙 운영에 「연합회 가입·참여 운영」만 있다. drugstore · carepharm 등은 각자 서브도메인 운영 화면 | `packages/types/src/central-operation-menu.ts` · [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) |
| 계정 · 개인자료 완전삭제 | platform admin 만. `DELETE /api/v1/admin/users/:id` (운영 실행은 `ACCOUNT_ERASURE_MODE=apply` 필요) | `WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1` |

## 2. 사용자 확정 (2026-11-07)

- 강의 · 커뮤니티 · 유통기반 펀딩은 neture.co.kr 의 **모든 가입자에게 제공하는 공통 서비스**라 admin.neture.co.kr 에서 운영한다. 계정 해지는 neture operator, 계정 완전삭제는 platform admin 이 한다.
- 공급자 · 파트너 · 약국협업체는 **일부 이용자만 쓰는 서비스**라 해당 서비스 운영자가 이용자를 관리한다.
  - 그 서비스의 **operator 는 참여 해지(복구 가능)** 를 한다.
  - 그 서비스의 **admin 은 그 서비스의 데이터만 삭제**한다. **서비스 사용자(계정)는 삭제할 수 없다.**
- 강의별 수강 해지는 강사가 정한다. admin.neture.co.kr 운영 업무가 아니다.

## 3. 조사할 질문

각 서비스(supplier · partner-support · pharmcoop, 필요하면 drugstore · carepharm)마다 아래를 표로 답한다.

1. **서비스 데이터 목록** — 그 서비스 참여로 생기는 테이블 · 파일(GCS) · 외부 연동 기록. 소유 주체(개인 / 사업자 조직 / 다른 사용자와 공유)를 구분한다.
2. **삭제 · 보존 분류** — 각 항목을 「서비스 데이터 삭제 시 지움 / 익명화 / 법정 보존(기간) / 다른 주체 소유라 유지」로 분류한다.
   - 공급자: 공급자 신청 · 증빙 파일, `neture_suppliers`, 상품 제안 · 공급 offer, 매장과의 B2B 주문 · 정산(`checkout_orders` 원장 — §4 CLAUDE.md 단일 원장, 삭제 대상 아님 추정) 을 반드시 포함한다. 공급자 사업자 접근은 serviceKey 가 아니라 `organization_members → organizations(type='supplier') → neture_suppliers` 가 판정한다(FROZEN, `O4O-SUPPLIER-DOMAIN-BOUNDARY-V1` §7) — 개인 관계 삭제와 사업자 조직 데이터 삭제를 구분한다.
   - 파트너: 게시글 · 댓글 · 신고 · 운영 이력. 다른 사용자의 댓글이 달린 글의 처리.
   - 약국협업체: `semi_franchise_memberships` · 운영자 지정 · 사업별 매장 콘텐츠.
3. **기존 경로 재사용 가능성** — `deleteMember` hard 경로 · 각 도메인의 기존 cleanup/erasure 서비스(`account-erasure` 의 domain handler 등)가 이미 지우는 범위와 빠진 범위.
4. **선행 조건** — 참여 해지(operator) 상태여야만 삭제 가능하게 할지. 회원 계정 삭제는 사전 정지 불요(정책 2026-11-03)지만, 서비스 데이터 삭제는 별도 판단이 필요하다 — 판단 근거와 제안을 적는다(결정은 사용자).
5. **권한 경계** — `{service}:admin` 이 자기 서비스 데이터만 지우는지, `platform:super_admin` 은 어느 경로를 쓰는지. serviceKey 는 URL 경로에서만(CLAUDE.md §7 Guard Rule 4).
6. **UI 위치** — admin.neture.co.kr 중앙 운영(`/operations/{service}/members`) 에서 admin 에게만 「서비스 데이터 삭제」를 열지, 각 서비스 운영 화면에 둘지.

## 4. 설계 판단 (조사 전 가정 — 조사 결과로 확정)

| 판단 | 가정 | 근거 |
|---|---|---|
| 계정(`users`)은 서비스 데이터 삭제로 건드리지 않는다 | 확정 | §2 사용자 확정 · Identity 분리 WO |
| 주문 · 정산 원장은 서비스 데이터 삭제 대상이 아니다 | 가정 | CLAUDE.md §4 단일 원장 · 법정 보존 가능성 |
| 다른 사용자 · 사업자 소유 자료는 유지한다 | 확정 | 개인정보 정책 §보존 |
| 구현은 core 먼저(API · 도메인 handler) → UI 나중 | 가정 | AGENTS.md §4-3 R2 |

## 5. 범위 밖

- 실제 삭제 기능 구현 · migration · 운영 DB write (구현 WO 와 통합 담당 승인 필요 — AGENTS.md §5)
- 공통 서비스(강의 · 커뮤니티 · 펀딩)의 계정 삭제 — 기존 계정 완전삭제 경로
- 강의 수강 관계 정리(강사 업무)

## 6. TODO

- [x] [CLOUD] §3-1 · §3-2 서비스별 데이터 목록과 삭제 · 보존 분류표 작성 (코드 · entity · migration 기준) — §8-1~§8-3 (2026-11-08)
- [x] [CLOUD] §3-3 기존 삭제 경로가 지우는 범위와 빠진 범위 대조 — §8-4
- [x] [CLOUD] §3-4 · §3-5 · §3-6 제안 작성 — §8-5
- [ ] [사용자] §8-6 결정 D1~D5
- [ ] [LOCAL] §7 read-only 조회로 서비스별 대상 규모 확인(건수만, 마스킹)
- [ ] [CLOUD] 결과로 구현 WO 작성(서비스별 1 PR · core 먼저)

## 7. 검증 계획 — LOCAL read-only 조회

`o4o_readonly` 계정만 사용한다(AGENTS.md §5). 원문(이름 · 이메일 · 상호) 대신 상태 · 건수만 기록한다.

```sql
-- Q1. 공급 · 파트너 서비스 참여 관계 상태 분포 (삭제 대상 규모)
SELECT service_key, status, COUNT(*) AS n
FROM service_memberships
WHERE service_key IN ('supplier', 'partner-support')
GROUP BY service_key, status
ORDER BY service_key, status;

-- Q2. 해지(정지 · 탈퇴)된 공급 참여자 중 공급자 조직이 남은 수
SELECT COUNT(DISTINCT sm.user_id) AS n
FROM service_memberships sm
JOIN organization_members om ON om.user_id = sm.user_id
JOIN organizations o ON o.id = om.organization_id AND o.type = 'supplier'
WHERE sm.service_key = 'supplier' AND sm.status IN ('suspended', 'withdrawn');

-- Q3. 공급자 상태 분포 · 비활성 공급자 중 진행 중 주문 · 미정산이 있는 수는 구현 WO 에서 쿼리를 확정한다
SELECT status, COUNT(*) AS n FROM neture_suppliers GROUP BY status ORDER BY status;

-- Q4. 파트너 커뮤니티 · 업무공간 규모
SELECT 'posts' AS t, state, COUNT(*) AS n FROM partner_community_posts GROUP BY state
UNION ALL SELECT 'comments', state, COUNT(*) FROM partner_community_comments GROUP BY state
UNION ALL SELECT 'spaces', NULL, COUNT(*) FROM partner_support_spaces
ORDER BY 1, 2;

-- Q5. 약국협업체 사업별 참여 상태 분포
SELECT sf.key AS business, m.status, COUNT(*) AS n
FROM semi_franchise_memberships m
JOIN semi_franchises sf ON sf.id = m.semi_franchise_id
GROUP BY sf.key, m.status
ORDER BY sf.key, m.status;

-- Q6. 협동조합 조합원 상태 분포
SELECT status, COUNT(*) AS n FROM cooperative_memberships GROUP BY status ORDER BY status;
```

판정:
- Q1 · Q5 · Q6 에서 해지 상태(`suspended` · `withdrawn` · `terminated`)가 0 인 서비스는 서비스 데이터 삭제 구현이 급하지 않다 → 구현 순서를 뒤로 미룬다.
- Q4 의 `partner_support_spaces` 가 0 이면 D5 결정은 구현 WO 로 미뤄도 된다.
- Q2 가 0 보다 크면 「개인 관계는 해지됐지만 사업자 조직 데이터가 남은」 경우가 실제로 있다 → 개인 관계 삭제와 사업자 데이터 삭제를 분리 설계해야 한다(§3-2).
- 테이블 · 컬럼 이름이 다르면 조회를 멈추고 CLOUD 조사 결과(§6 첫 항목)로 쿼리를 고친 뒤 다시 실행한다.

## 8. CLOUD 조사 결과 (2026-11-08, main `4c1005bc1a`)

조사는 코드 · entity · migration 만 읽었다. 운영 DB 건수는 §7(LOCAL). 「(미확인)」은 코드로 확정하지 못한 항목이다.

### 8-1. 공급자 (`supplier`)

| 데이터 | 소유 | 제안 |
|---|---|---|
| `service_memberships`(supplier) · `role_assignments` `supplier:*` | 개인 | 삭제. 단 기존 hard 삭제는 `supplier:%` 만 지워 **bare `supplier` · `neture:supplier` 역할이 남는다**(`MembershipApprovalService.ts:1405-1411`) |
| `neture_suppliers` | 공급자 조직 | **행 삭제 금지** — 지우면 CASCADE 로 매장의 listing · 서비스 승인 · 가격 · 사업 제안까지 사라진다. 개인 필드 16개 비움(목록은 `supplier-account-erasure.ts:3-20` 재사용) + `INACTIVE` |
| `organizations`(supplier) · `organization_members`(owner) | 조직 | owner 관계 삭제 · 조직 행은 주문 원장이 참조하므로 유지 + `isActive=false` · `metadata.businessProfile.managerEmail` 제거 |
| `kyc_documents` + GCS `o4o-private-documents/neture/suppliers/{id}/kyc/…` · `neture_supplier_regulated_categories` · `neture_supplier_review_requests` | 조직 증빙 · 심사 | 삭제(파일 포함, 공유 문서 제외 판정은 기존 `mayEraseSupplierProfileFile` 재사용) |
| `supplier_product_offers` | 조직이 만들고 매장이 참조 | 비활성 유지(삭제 시 매장 · 사업 자료 CASCADE) |
| `product_masters` · 이미지 · `shared_product_descriptions` | 플랫폼 공용 | 유지 |
| library · contents · requests · CSV import · 캠페인 · spot price 테이블 | 조직 | 삭제 후보 — 매장 쪽 참조 여부 (미확인) |
| `checkout_orders` · `neture_orders` · 정산 · 배송 | 거래 원장 | 보존(정책 §14: 대금결제 · 공급 5년, 분쟁 3년). 실결제 미개시로 현재 처리항목 아님 |
| `action_logs` | 감사 | 보존(1년) |

### 8-2. 파트너 (`partner-support`)

| 데이터 | 소유 | 제안 |
|---|---|---|
| `service_memberships`(partner-support) | 개인 | 삭제 |
| `partner_community_posts` · `comments` | 개인 · 다른 사람 댓글 · 신고가 매달림 | **익명화**(본문 비움 + `deleted`, 행 유지) — 행 삭제는 다른 사람 댓글 · 신고에 영향 |
| `partner_community_reports` | 신고자 · 운영 기록 | 미처리 신고 삭제, 처리 신고는 신고자 · 사유 익명화 |
| `partner_community_events` | 운영 감사 | 보존(1년 기준). `target_id` 에 사용자 UUID 가 FK 없이 남음 → 최소화 필요 |
| `partner_support_spaces` · `members` · `reads` · `invites` · `events` · `files` + 디스크 `PARTNER_MEDIA_DIR` | 개인 업무공간(공동편집자 포함) | 삭제 — 단 **업무공간은 서비스 가입 없이 누구나 만든다**(`partner.service.ts:81-99`) → D5 |
| `partner_community_boards` | 서비스 공용 | 유지 |

### 8-3. 약국협업체 (`pharmacy` · `drugstore` · `carepharm` · `pharmcoop`)

| 데이터 | 소유 | 제안 |
|---|---|---|
| `semi_franchise_memberships` | 약국 조직 + 사업 | 행 유지(`terminated` 상태로 복구 가능 구조) + `applied_by` · `decided_by` · `reason` 익명화 |
| 약국 `organizations.metadata.semiFranchiseApplications[key]` | 사업에 낸 신청서 | 해당 사업 키만 삭제 |
| `supply_proposals`(약국 대상) · `store_cart_items.supply_proposal_id` · 공지 수신 기록 | 공급자 · 사업 · 약국 공동 | 약국 대상 연결만 정리 (구체 범위 구현 WO) |
| `semi_franchise_contents` · `cooperation_*` 업무 테이블 | 사업 | 사업 종료 시 삭제 후보 → D4 |
| `cooperative_memberships` · `cooperative_roles` · `cooperative_management_events` | 조합 · 개인 | 관계 삭제 · 감사 이벤트는 보존(1년) — 현재 계정 삭제 시 CASCADE 로 함께 사라짐(아래 8-7) |
| `kpa_store_contents` | 매장(약국) · legacy 공용 물리 테이블 | 유지 — 사업별 구분 열이 없어 사업 단위 선택 삭제 불가 |
| `checkout_orders` · 정산 · 문의 | 원장 · 문의 | 보존(5년 / 3년 / 처리 후 1년) |

### 8-4. 기존 삭제 경로 대조

| 경로 | 공급자 | 파트너 | 약국협업체 |
|---|---|---|---|
| `deleteMember` hard (`DELETE /operator/members/:userId`) | 관계 · `supplier:%` 역할만. 조직 · 증빙 · offer 0 | 관계만. `partner_*` 0. 콘솔 허용 역할에 `partner-support:*` 없음 → 사실상 platform admin 전용 | 효과 없음(사업 가입은 `semi_franchise_memberships`) |
| 상태 전이 | `deactivateSupplier`: `INACTIVE` · 승인 회수 · listing 비활성(진행 주문 · 미정산 있으면 차단) | 정지 · 복구 · 글 숨김 | `terminated` · 정지 · 운영자 해제 — 세 서비스 파일 모두 `DELETE FROM` 0건 |
| 계정 완전삭제(platform admin) | 개인 필드 비움 · KYC 파일 판정 · offer 유지 | `PRIVATE_OWNERS` 에 partner 테이블 없음 → 본문 · `target_id` · 디스크 파일 잔존, 잔여 스캔 REVIEW 로 멈출 가능성 (미확인) | `cooperative_*` 삭제 · `semi_franchise_operators` · `cooperation_*` 미등록 (미확인) |
| 완전폐업(platform admin) | — | — | 약국 전체 폐업용. 사업 하나 탈퇴용 아님 |

**결론: 세 서비스 모두 「계정은 두고 그 서비스 데이터만 지우는」 경로가 없다.** 새로 만든다면 서비스별 domain handler + 공통 실행 틀(사전 계획 → 확인 문구 → 실행 → 결과 기록)이 필요하다. 계정 완전삭제의 handler 들은 `users` 삭제를 전제로 해 그대로 재사용할 수 없고, 개인 필드 목록 · 파일 판정 같은 부품만 재사용한다.

### 8-5. 제안 (§3-4 ~ §3-6)

- **선행 조건(§3-4):** 그 서비스 참여가 해지 상태이고, 진행 중 주문 · 미정산이 0 일 때만 실행. 공급자는 기존 `deactivateSupplier` 의 의무 확인을 재사용한다. 계정 삭제(사전 정지 불요)와 다르게 두는 이유: 서비스 데이터 삭제는 매장 · 다른 사용자 자료와 얽혀 있어 운영이 먼저 멈춰 있어야 영향 범위가 고정된다. → D1
- **권한(§3-5):** `{service}:admin` 과 `platform:super_admin` 만. operator 는 불가. 대상 서비스는 URL 경로에서만 받는다(CLAUDE.md §7 Rule 4). 파트너는 지금 admin · operator 구분이 코드에 없으므로(`community.service.ts:57` 의 `admin` 미사용) 구분을 먼저 만든다.
- **UI(§3-6):** 공급자 · 파트너는 admin.neture.co.kr 중앙 운영 `/operations/{service}/members` 의 admin 등급 작업으로 둔다. 약국협업체는 사업 운영자가 일하는 각 사업 화면(web-pharmacy-business · web-pharmacy-coop · carepharm)에 둔다 — 사업 운영자 지정 구조(`semi_franchise_operators`)가 그쪽에 있다.
- **구현 순서(AGENTS.md §4-3 R2):** 공통 실행 틀 + 서비스별 handler 를 서비스당 1 PR. 순서 제안: 공급자 → 파트너 → 약국협업체. migration 이 필요하면(삭제 이력 테이블 등) migration lane 규칙과 통합 담당 승인을 따른다.

### 8-6. 사용자 결정 필요

- **D1** 선행 조건: 「참여 해지 + 진행 주문 · 미정산 0」일 때만 서비스 데이터 삭제 허용 — 제안: 예
- **D2** 파트너 게시글 · 댓글: 익명화(본문 비움, 스레드 유지) vs 행 완전삭제 — 제안: 익명화
- **D3** 공급자 상품 offer: 삭제하지 않고 비활성 유지(매장 자료 보호) — 제안: 유지
- **D4** 약국협업체: 「약국 하나의 사업 참여 데이터 삭제」만 할지, 「사업 자체 종료 시 사업 데이터 삭제」도 포함할지 — 제안: 이번에는 약국 단위만
- **D5** 파트너 업무공간(`partner_support_*`)이 서비스 가입 없이 만들어진다 — 서비스 데이터로 볼지(가입 해지 시 삭제), 개인 계정 자료로 둘지(계정 삭제 때만) — 제안: 개인 계정 자료로 두고 별도 확인

### 8-7. 조사 중 발견한 별건 (구현 범위 아님 · 보고)

1. `deleteMember` hard 가 bare `supplier` · `neture:supplier` 역할을 남긴다(`MembershipApprovalService.ts:1405-1411`).
2. 파트너 커뮤니티의 admin · operator 권한이 같다(`community.service.ts:57`).
3. 계정 완전삭제 `PRIVATE_OWNERS` 에 partner 테이블 · `semi_franchise_operators` · `cooperation_*` 가 없다 — 본문 · 파일 잔존 또는 REVIEW 정지 가능성 (미확인, 잔여 스캔 동작 확인 필요).
4. `cooperative_management_events` 는 actor · subject 가 users CASCADE 라 계정 삭제 시 감사 이벤트가 함께 사라진다 — 감사기록 1년 보존 정책과 맞는지 판정 필요.
5. 일반 계약 종료 7일 절차(`store-owner-termination.service.ts:42-46`)는 `kpa-society` 만 대상이다.
6. 조합 연결 사업에서는 `/memberships` 경로가 운영자에게 403 이다(`neture-pharmacy.routes.ts:168`) — 의도 여부 확인 필요.
7. `deleteMember` 는 대상 serviceKey 를 body · query 로 받는다. 요청자 범위(`resolveWriteScope`)로 다시 검증하므로 스푸핑 위험은 막혀 있지만, CLAUDE.md §7 Rule 4(URL 경로에서만) 와 형식이 다르다.
8. 은퇴 Partner 테이블 금지 패턴 `^partner_` 이 현행 `partner_support_*` · `partner_community_*` 에도 걸린다(`canonical-schema-baseline.meta.ts:53-66`) — 스냅샷 기준일 이후 추가라 지금은 충돌이 없지만, 재생성 시 오판 가능.

## 문서 정합

해당 없음 — 기준 문서 변경 없음. 8-7 의 4번(감사 이벤트 CASCADE)은 보존 정책 판정이 필요해 보고만 한다.
