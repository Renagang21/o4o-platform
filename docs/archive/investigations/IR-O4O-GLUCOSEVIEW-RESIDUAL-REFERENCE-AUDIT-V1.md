---
id: IR-O4O-GLUCOSEVIEW-RESIDUAL-REFERENCE-AUDIT-V1
title: "GlucoseView 잔존 참조 전수 감사 — UI / API / DB / 마이그레이션 / 타입 / 테스트"
status: phase1-complete-phase2-inprogress
date: 2026-05-15
last_updated: 2026-05-15
type: investigation
scope:
  - 폐지된 서비스 GlucoseView 의 코드/DB/문서 잔재 전수 점검
  - canonical 운영 서비스 4종(KPA / Neture / GlycoPharm / K-Cosmetics) 외 dead reference 분류
  - 실행 경로(active) vs 인포메이션(legacy) 분리
  - 안전 제거 가능 vs 호환성 유지 항목 판단
related:
  - WO-O4O-ADMIN-OPERATORS-LEGACY-SERVICE-TABS-CLEANUP-V1
  - WO-O4O-ADMIN-OPERATORS-CANONICAL-DATATABLE-V1 (5d8aa5fe5)
  - WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 (c85455881)
  - WO-O4O-GLUCOSEVIEW-RESIDUAL-CLEANUP-PHASE1-V1 (2b2fb92d2)
  - WO-O4O-GLUCOSEVIEW-RESIDUAL-CLEANUP-PHASE2-BACKEND-CONFIG-V1
---

# IR-O4O-GLUCOSEVIEW-RESIDUAL-REFERENCE-AUDIT-V1

> 폐지된 GlucoseView 서비스의 잔존 참조를 코드/DB/마이그레이션/문서 전반에 걸쳐 전수 감사한다. 본 IR 은 cleanup WO 의 근거 자료이며, 실제 cleanup 은 P1/P2/... 분할 WO 로 수행한다.

> **📌 진행 상태 (2026-05-15 갱신)**
>
> | Phase | 항목 | 상태 |
> |---|---|---|
> | **P1** | 사용자 가시 UI/API 잔재 (CMS dropdown 7건 + service-applications) | ✅ 완료 (커밋 `2b2fb92d2`) |
> | **P2** | 백엔드 dead config (cookie.utils / partner-context.guard / OperatorNotificationController) | 🔄 진행 중 (`WO-...-PHASE2-BACKEND-CONFIG-V1`) |
> | **P3** | platform-core type union 위생 | ⏳ 대기 (P4 SQL 점검 선행) |
> | **P4** | DB 잔재 row 점검 + cleanup | ⏳ 대기 (사용자 승인 필요) |
> | **P5** | 서비스별 frontend SERVICE_LABELS 정리 | ⏳ 대기 |
> | **P6** | 문서/주석 통일 | ⏳ 대기 |

---

## 0. Executive Summary

| 항목 | 값 |
|---|---|
| 총 잔존 참조 | **약 213건** (frontend 43 + backend 170) |
| 실제 운영 경로 | **0건** (route mount / controller / 실시간 데이터 흐름 없음) |
| Database 테이블 | **0개 잔존** (migration `20260600000000-DropGlucoseviewAndCgmTables` 로 DROP 완료) |
| DB 잔재 row | `role_assignments.role='glucoseview:*'` 가능성 (별도 SQL 검증 필요) |
| 위험도 | **낮음** — 모든 코드 참조는 dead literal / 타입 / 마이그레이션 / 차단 가드 |
| 권장 cleanup | 4단계 Phase WO (P1: 즉시 / P2: 다음 스프린트 / P3: schema cleanup / P4: 문서 정리) |

**GlucoseView 는 서비스 레벨에서 완전 폐지되었음** — 라우트 마운트·컨트롤러·active 코드 경로·SERVICE_SCOPES 엔트리 모두 부재. 남은 참조는 (a) RBAC catalog 표시용 호환 메타데이터, (b) 폐지 사실을 기록하는 마이그레이션, (c) 차단 가드의 blocklist, (d) 무해한 주석. 모두 dead code 이며 위험은 없으나 코드 위생을 위해 단계적 정리 권장.

---

## 1. Scope & Method

### 1-1. 조사 범위
- **Frontend**: apps/admin-dashboard, apps/main-site, services/web-* (kpa-society, neture, glycopharm, k-cosmetics, account, siteguide), packages/* (ui, operator-ux-core, shared-space-ui, content-editor, auth-client 등)
- **Backend**: apps/api-server, packages/security-core, packages/asset-copy-core, packages/platform-core, packages/cms-core, packages/types, packages/auth-utils
- **Migrations**: apps/api-server/src/database/migrations
- **검색 패턴**: `glucoseview` / `GlucoseView` / `GLUCOSEVIEW` / `glucose-view` / `glucose_view` (case-insensitive)

### 1-2. 분류 기준
1. **Active**: 실행 경로 참조 (route mount, controller, active scope check)
2. **Compat**: 호환성 유지 목적 (역사적 role 의 badge/label 매핑)
3. **Type-only**: TypeScript 타입 union 잔재
4. **Migration**: DB schema 진화 이력
5. **Test**: spec/fixture
6. **Comment**: 문서/주석
7. **Build-artifact**: dist/, build/ 산출물 (committed by mistake)

---

## 2. Backend 감사 결과

### 2-1. 라우트 / 컨트롤러 — **NONE FOUND**

| 검증 항목 | 결과 |
|---|---|
| `apps/api-server/src/index.ts` 또는 `register-routes.ts` 의 `/api/v1/glucoseview` 마운트 | ✗ 없음 |
| `apps/api-server/src/routes/glucoseview/` 서브폴더 | ✗ 없음 |
| controller 클래스 `*GlucoseView*` | ✗ 없음 |
| `SERVICE_SCOPES.glucoseview` in [apps/api-server/src/config/service-scopes.ts](apps/api-server/src/config/service-scopes.ts) | ✗ 없음 (라인 38 주석만 잔존) |
| `GLUCOSEVIEW_SCOPE_CONFIG` in [packages/security-core/src/service-configs.ts](packages/security-core/src/service-configs.ts) | ✗ 없음 |

✓ **백엔드 실행 경로는 완전 단절됨.**

### 2-2. Active Code 잔재 (실행되지만 정책상 dead)

| 파일 | 라인 | 분류 | 내용 |
|---|---|---|---|
| [apps/api-server/src/utils/cookie.utils.ts](apps/api-server/src/utils/cookie.utils.ts) | 14, 26 | Active config | `SERVICE_DOMAINS` 에 `.glucoseview.co.kr` 잔존 — 폐지된 도메인 |
| [apps/api-server/src/modules/partner/guards/partner-context.guard.ts](apps/api-server/src/modules/partner/guards/partner-context.guard.ts) | 59 | Active guard | `allowedServices = ['glycopharm', 'k-cosmetics', 'glucoseview']` — 파트너 컨텍스트 검증 |
| [apps/api-server/src/controllers/OperatorNotificationController.ts](apps/api-server/src/controllers/OperatorNotificationController.ts) | 33 | Comment example | `'glucoseview:operator'` 예시 잔존 |

→ partner-context.guard 의 `allowedServices` 는 polluting 항목 (실제 partner-context 가 glucoseview 를 더 이상 사용하지 않음) — 안전 제거 가능.

### 2-3. Type / Enum 잔재 (compile-time only)

| 파일 | 라인 | 분류 |
|---|---|---|
| [packages/platform-core/src/store-policy/entities/platform-store-policy.entity.ts](packages/platform-core/src/store-policy/entities/platform-store-policy.entity.ts) | 31 | `\| 'glucoseview'` union |
| [packages/platform-core/src/store-policy/entities/platform-store-payment-config.entity.ts](packages/platform-core/src/store-policy/entities/platform-store-payment-config.entity.ts) | 42 | 동일 |
| [packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts](packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts) | 31 | 동일 |
| [packages/cms-core/src/entities/CmsContent.entity.ts](packages/cms-core/src/entities/CmsContent.entity.ts) | 48 | 주석에 `'glucoseview'` 예시 |
| [packages/cms-core/src/entities/Channel.entity.ts](packages/cms-core/src/entities/Channel.entity.ts) | 56 | 동일 |

### 2-4. 테스트 (4건)

| 파일 | 분류 | 의도 |
|---|---|---|
| `apps/api-server/src/__tests__/kpa-role-guard.spec.ts:79` | Security test | KPA 가드가 `glucoseview:admin` 을 차단하는지 검증 — **유지 권장** (regression 방지) |
| `apps/api-server/src/__tests__/security/cross-service.spec.ts:17,41,64,84` | Security test | cross-service role blocking — **유지 권장** |

### 2-5. Comment / Docstring (30+ 건)

대부분 마이그레이션 헤더, 서비스 폐지 이력 기록, 정책 변경 설명 등. 무해. 일부는 historical context 로 유지 가치 있음.

---

## 3. Frontend 감사 결과

### 3-1. RBAC Catalog (canonical compat 잔재)

| 파일 | 라인 | 분류 | 의도 |
|---|---|---|---|
| [apps/admin-dashboard/src/lib/rbac-catalog.ts](apps/admin-dashboard/src/lib/rbac-catalog.ts) | 17 | `SERVICE_KEYS` 에 `'glucoseview'` 잔존 | 과거 할당된 `glucoseview:*` role 의 `parseRole()` 호환 |
| 동 | 34 | `SERVICES.glucoseview` badge meta | 과거 role 표시용 badge/label |
| 동 | 138 | `EXCLUDED_FROM_FACET` 에 `'glucoseview'` 포함 | facet 필터 옵션에서 제외 (WO-OPERATORS-LEGACY-SERVICE-TABS-CLEANUP-V1 적용분) |

✓ **이 3건은 의도된 잔재**: facet/할당 모달에서는 노출 안 됨, 과거 role 표시는 정상.

### 3-2. CMS 폼 dropdown (정책 누락 가능성)

| 파일 | 라인 | 위험도 |
|---|---|---|
| `apps/admin-dashboard/src/pages/cms/slots/SlotFormModal.tsx:23` | 옵션 `{ value: 'glucoseview', label: 'GlucoseView' }` | **중** — 사용자가 신규 슬롯에 glucoseview 지정 가능 |
| `apps/admin-dashboard/src/pages/cms/slots/CMSSlotList.tsx:41` | 동 | 동 |
| `apps/admin-dashboard/src/pages/cms/contents/ContentFormModal.tsx:29` | 동 | 동 |
| `apps/admin-dashboard/src/pages/cms/contents/CMSContentList.tsx:50` | 동 | 동 |
| `apps/admin-dashboard/src/pages/cms/channels/ChannelList.tsx:40` | 동 | 동 |
| `apps/admin-dashboard/src/pages/cms/channels/ChannelFormModal.tsx:28` | 동 | 동 |
| `apps/admin-dashboard/src/pages/supplierops/pages/CampaignRequestPage.tsx:35` | 동 | 동 |

→ **7개 dropdown 에서 GlucoseView 가 여전히 신규 할당 옵션으로 노출됨**. canonical service list (KPA/Neture/GlycoPharm/K-Cosmetics) 외 잔재. 제거 우선순위 높음.

### 3-3. Service Application API 클라이언트

| 파일 | 라인 | 내용 |
|---|---|---|
| [apps/admin-dashboard/src/api/service-applications.ts](apps/admin-dashboard/src/api/service-applications.ts) | 17 | `type ServiceType = 'glycopharm' \| 'glucoseview'` |
| 동 | 90–91 | `case 'glucoseview': return '/api/v1/glucoseview/applications'` |
| 동 | 166 | `glucoseview: 'GlucoseView'` 라벨 |

→ 호출 시 백엔드에 `/api/v1/glucoseview/applications` 라우트가 존재하지 않아 404. **실제 호출 시 사용자에게 깨진 응답 반환**. 위험도 **중**.

### 3-4. 서비스 라벨 매핑 (compat 잔재)

| 파일 | 라인 | 분류 |
|---|---|---|
| `services/web-glycopharm/src/pages/auth/RegisterPage.tsx:33` | SERVICE_LABELS 에 `glucoseview: 'GlucoseView'` |
| `services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx:28` | 동 |
| `services/web-kpa-society/src/pages/operator/UsersPage.tsx:101` | 동 |
| `services/web-neture/src/components/RegisterModal.tsx:56` | 동 |
| `services/web-neture/src/components/ContentUtilizationGuide.tsx:45-46` | 동 |
| `services/web-neture/src/pages/supplier/SupplierOrdersPage.tsx:19` | 동 |
| `services/web-neture/src/pages/seller/MyHandledProductsPage.tsx:18` | 동 |
| `services/web-neture/src/pages/partner/PartnerOverviewPage.tsx:27,34,59` | 동 |
| `services/web-account/src/components/UserProfileCard.tsx:24-25` | `'glucoseview:admin'` / `'glucoseview:operator'` role 라벨 |
| `packages/operator-ux-core/src/member-list/MemberBadges.tsx:50-51,74` | role badge color + SERVICE_LABELS |
| `packages/ui/src/operator-user-detail/UserDetailPage.tsx:50` | SERVICE_LABELS |
| `packages/ui/src/pages/operator/RoleManagementPage.tsx:70` | 폼 옵션 |

→ 과거 role/membership 표시용 — 일부는 compat (legacy data 표시), 일부는 신규 등록 옵션 (잔재). 분리 필요.

### 3-5. Test fixture (Neture AI 페이지)

`services/web-neture/src/pages/admin/ai/*.tsx` — 샘플 데이터에 `serviceId: 'glucoseview'` 등. **운영 데이터 아님**, 데모 fixture. 우선순위 낮음.

---

## 4. Migration 감사

### 4-1. 핵심 마이그레이션 흐름

| 시기 | Migration | 역할 |
|---|---|---|
| 초기 | `20260205070000-Phase4MultiServiceRolePrefixMigration.ts` | role prefix 도입 — glucoseview 포함 |
| 도입 | `20260222300000-CreateGlucoseViewCustomersTable.ts` | glucoseview_customers 테이블 생성 |
| 도입 | `20260318100000-ExtendRolesTable.ts` (84-87) | `glucoseview:admin/operator/pharmacist/user` role 정의 |
| 정리 | `20260228000001-CleanupLegacyRoles.ts` (65-155) | `admin-glucoseview@o4o.com` 시드 계정 삭제 |
| 폐지 시작 | `20260404200000-RemoveGlucoseViewFromFeatured.ts` | featured 서비스에서 제거 |
| **최종 DROP** | **`20260600000000-DropGlucoseviewAndCgmTables.ts`** | **9개 `glucoseview_*` 테이블 일괄 DROP** |

✓ **DB schema 잔재 없음** — 20260600000000 이후 모든 glucoseview_* 테이블 부재. 후속 마이그레이션은 해당 테이블 참조 금지.

### 4-2. 위험 마이그레이션 (재실행 시)

| 파일 | 라인 | 위험 |
|---|---|---|
| `1739700000000-NormalizePhoneNumbers.ts` | 84, 89 | 이미 DROP 된 glucoseview_pharmacies / customers 테이블에 UPDATE — 재실행 시 실패 |

→ 실제 운영에서는 한 번만 실행되므로 영향 없음. 단, fresh DB rebuild 시 순서가 꼬이면 위험. **idempotent guard 추가 또는 historical comment 로 마킹 권장**.

### 4-3. Migration 위생

마이그레이션 파일은 TypeORM history 보존을 위해 **삭제 금지**. 단, `1737000000000-SeedProductionTestAccounts.ts` 의 `glucoseview.co.kr` 도메인 등은 historical context — 유지.

---

## 5. Database 실제 상태 (확인 필요 항목)

### 5-1. 코드 분석으로 확인된 사항
- ✓ `glucoseview_*` 테이블 9개 모두 DROP (migration 20260600000000)
- ✓ `service_memberships` / `role_assignments` 등 공유 테이블은 살아있음
- ? `role_assignments` 에 `role='glucoseview:*'` row 잔재 가능성 — **별도 SQL 검증 필요**

### 5-2. 권장 SQL 검증 쿼리
```sql
-- 1. role_assignments 잔재
SELECT role, COUNT(*) FROM role_assignments
WHERE role LIKE 'glucoseview:%'
GROUP BY role;

-- 2. service_memberships 잔재
SELECT service_key, COUNT(*) FROM service_memberships
WHERE service_key = 'glucoseview' OR service_key LIKE 'glucoseview%'
GROUP BY service_key;

-- 3. users.role 잔재 (legacy column)
SELECT role, COUNT(*) FROM users
WHERE role LIKE 'glucoseview%'
GROUP BY role;

-- 4. service-key 컬럼 보유 테이블 일괄 점검 (CMS slots / contents / channels)
SELECT 'cms_channels' AS tbl, service_key, COUNT(*) FROM cms_channels WHERE service_key = 'glucoseview' GROUP BY service_key
UNION ALL
SELECT 'cms_slots', service_key, COUNT(*) FROM cms_slots WHERE service_key = 'glucoseview' GROUP BY service_key
UNION ALL
SELECT 'cms_contents', service_key, COUNT(*) FROM cms_contents WHERE service_key = 'glucoseview' GROUP BY service_key;
```

CLAUDE.md §0 정책상 read-only `SELECT` 는 Claude Code 가 직접 수행 가능 (`gcloud sql connect`). 결과에 따라 cleanup SQL 발행.

---

## 6. 위험도 분류

### 6-1. ✅ 완료 (P1 — UX 영향, 커밋 `2b2fb92d2` / 2026-05-15)

| 항목 | 위험 |
|---|---|
| CMS form dropdown 7곳 의 `glucoseview` 옵션 | 사용자가 신규 슬롯/콘텐츠/채널/캠페인을 GlucoseView 에 할당 시도 → 데드 데이터 |
| `service-applications.ts` 의 `ServiceType` union + 케이스 분기 | `/api/v1/glucoseview/applications` 호출 시 404 |
| `partner-context.guard.ts:59` 의 `allowedServices` | 폐지 서비스가 허용 목록에 잔존 → 의미적 오류 |
| `cookie.utils.ts:26` `.glucoseview.co.kr` 도메인 | 폐지된 도메인 cookie 설정 시도 — 운영 영향 없으나 잔재 |

### 6-2. 🔄 진행 중 (P2 — 백엔드 dead config, type 위생)

| 항목 | 위험 |
|---|---|
| `platform-store-policy.entity.ts` / `platform-store-payment-config.entity.ts` / `platform-store-slug.entity.ts` 의 `\| 'glucoseview'` union | 새 row 생성 가능 — TypeScript 가 허용 |
| 서비스별 RegisterPage / SERVICE_LABELS 7곳 | 폐지 서비스 라벨 노출 (compat 영역 외 신규 가입 페이지) |

### 6-3. Schema 정리 (P3 — 데이터 정합성)

| 항목 | 위험 |
|---|---|
| `role_assignments.role='glucoseview:*'` 잔재 row (SQL 검증 후 확인) | 사용자에게 dead role 부여 상태 — 권한 시스템 혼선 |
| `cms_slots` / `cms_contents` / `cms_channels` 의 `service_key='glucoseview'` row | 콘텐츠가 표시될 대상 서비스 부재 |

### 6-4. 문서 정리 (P4 — 위생)

| 항목 |
|---|
| `service-scopes.ts:38` / `service-scope-guard.ts:32` / cms-core entity 주석의 glucoseview 예시 |
| 다수 마이그레이션 헤더의 historical context (대부분 유지 권장, 일부 통일) |

### 6-5. 유지 (의도된 잔재)

| 항목 | 이유 |
|---|---|
| `rbac-catalog.ts` 의 `SERVICE_KEYS` / `SERVICES.glucoseview` / `EXCLUDED_FROM_FACET` | 과거 role 표시 호환성 + facet 옵션 제외 |
| Migration 파일 본체 | TypeORM history 보존 |
| `kpa-role-guard.spec.ts` / `cross-service.spec.ts` 의 glucoseview 차단 검증 | regression 방지 |

---

## 7. Cleanup 우선순위 / 후속 WO 제안

### Phase 1 — ✅ 완료 (커밋 `2b2fb92d2`, 2026-05-15)

**WO-O4O-ADMIN-CMS-GLUCOSEVIEW-OPTION-REMOVE-V1**
- 7개 CMS form dropdown 에서 `glucoseview` 옵션 제거
- canonical service list (KPA/Neture/GlycoPharm/K-Cosmetics) 만 노출
- 영향: `apps/admin-dashboard/src/pages/cms/{slots,contents,channels}/*.tsx`, `pages/supplierops/pages/CampaignRequestPage.tsx`

**WO-O4O-ADMIN-SERVICE-APPLICATIONS-GLUCOSEVIEW-REMOVE-V1**
- `apps/admin-dashboard/src/api/service-applications.ts` 에서 `ServiceType` union, case 분기, 라벨 제거
- `apps/admin-dashboard/src/pages/service-applications/*` 의 `service === 'glucoseview'` 분기 제거
- 호출 시 404 발생 가능성 차단

### Phase 2 — 🔄 진행 중 (`WO-O4O-GLUCOSEVIEW-RESIDUAL-CLEANUP-PHASE2-BACKEND-CONFIG-V1`)

**WO-O4O-API-LEGACY-GLUCOSEVIEW-CONFIG-CLEANUP-V1**
- `apps/api-server/src/utils/cookie.utils.ts` 의 SERVICE_DOMAINS 에서 `.glucoseview.co.kr` 제거
- `apps/api-server/src/modules/partner/guards/partner-context.guard.ts:59` 의 `allowedServices` 에서 `'glucoseview'` 제거
- `apps/api-server/src/controllers/OperatorNotificationController.ts:33` 주석 예시 갱신

### Phase 3 — Type union 위생 (조심스럽게)

**WO-O4O-PLATFORM-CORE-GLUCOSEVIEW-UNION-CLEANUP-V1**
- `packages/platform-core/src/store-policy/entities/platform-store-policy.entity.ts:31`
- `packages/platform-core/src/store-policy/entities/platform-store-payment-config.entity.ts:42`
- `packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts:31`
- 각 파일의 `\| 'glucoseview'` union 제거
- **선행 조건**: Phase 4 의 DB 잔재 SQL 점검 (해당 컬럼에 'glucoseview' row 가 없을 때 안전)

### Phase 4 — DB 잔재 점검 + cleanup (사용자 승인 필요)

**WO-O4O-DB-GLUCOSEVIEW-RESIDUAL-DATA-AUDIT-AND-CLEANUP-V1**
- §5-2 SQL 4개를 운영 DB 에서 실행 → 결과 보고
- `role_assignments` / `service_memberships` / `cms_*` 에 잔재 row 있으면 cleanup migration 발행
- CLAUDE.md §0 정책 — DELETE 는 사용자 승인 필수

### Phase 5 — 서비스별 frontend SERVICE_LABELS 정리 (낮은 우선순위)

**WO-O4O-FRONTEND-SERVICE-LABELS-GLUCOSEVIEW-COMPAT-AUDIT-V1**
- 각 서비스 페이지의 SERVICE_LABELS 매핑 검토
- 신규 가입 페이지 (RegisterPage) 등에서는 옵션 제거
- 운영자 회원 표시 화면 (UserDetailPage, MemberBadges) 는 compat 유지 (과거 role 표시)

### Phase 6 — 문서 / 주석 통일 (위생)

**WO-O4O-DOCS-GLUCOSEVIEW-LEGACY-COMMENT-CONSOLIDATION-V1**
- service-scopes.ts / service-scope-guard.ts 주석 정리
- cms-core entity 주석의 예시 service 목록 갱신
- 정책 문서에 "GlucoseView 폐지 완료" 명시

---

## 8. 참조 문서

| 문서 | 관련성 |
|---|---|
| [docs/architecture/USER-OPERATOR-FREEZE-V1.md](docs/architecture/USER-OPERATOR-FREEZE-V1.md) | role_assignments SSOT 정책 |
| [docs/rbac/RBAC-ROLE-CATALOG-V1.md](docs/rbac/RBAC-ROLE-CATALOG-V1.md) | role 카탈로그 단일 출처 |
| [apps/admin-dashboard/src/lib/rbac-catalog.ts](apps/admin-dashboard/src/lib/rbac-catalog.ts) | local catalog (extraction 예정) |
| migration `20260600000000-DropGlucoseviewAndCgmTables.ts` | 최종 schema DROP |
| [CLAUDE.md](CLAUDE.md) §0 | DB 검증 정책 |
| WO-O4O-ADMIN-OPERATORS-LEGACY-SERVICE-TABS-CLEANUP-V1 | facet 필터에서 glucoseview 제외 (선행 완료) |

---

## 9. 최종 결론

1. **GlucoseView 서비스는 코드 실행 경로에서 완전 폐지됨** — route, controller, scope config, DB table 모두 부재.
2. 잔존 참조 ~213건은 모두 dead literal / 타입 / 호환 메타데이터 / 차단 가드 / 마이그레이션 이력 / 무해 주석.
3. **즉시 cleanup 필요한 항목 (P1)**: CMS form 7개 dropdown 옵션 + `service-applications.ts` 의 dead API 경로 — 사용자 가시 dead UI/API 제거.
4. **다음 스프린트 (P2)**: 백엔드 cookie.utils / partner-context.guard / notification controller 의 dead config.
5. **조건부 (P3)**: platform-core entity 의 type union — DB 잔재 SQL 점검 후 진행.
6. **승인 필요 (P4)**: `role_assignments` / `cms_*` 등 DB 잔재 row 점검 및 정리 migration.
7. **유지 (의도)**: `rbac-catalog.ts` 의 SERVICE_KEYS / SERVICES / EXCLUDED_FROM_FACET — facet 제외 + 과거 role 표시 호환.
8. **유지 (regression 방지)**: security spec 의 glucoseview 차단 테스트.

본 IR 의 P1-P6 6 단계 중 **P1 완료 (`2b2fb92d2`, 2026-05-15)**, 현재 **P2 진행 중**. P3-P6 후속 예정. P3 (type union) 는 P4 DB 잔재 SQL 점검 결과를 선행 조건으로 한다.

---

*Status: P1 Complete (`2b2fb92d2`, 2026-05-15). P2 In Progress. P3-P6 Pending.*
*Updated: 2026-05-15 (Phase 진행 상태 반영)*
*Version: 1.1*
