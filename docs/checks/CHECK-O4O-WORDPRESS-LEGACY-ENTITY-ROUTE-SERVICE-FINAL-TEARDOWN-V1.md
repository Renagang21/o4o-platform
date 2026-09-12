# CHECK-O4O-WORDPRESS-LEGACY-ENTITY-ROUTE-SERVICE-FINAL-TEARDOWN-V1

- **WO**: WO-O4O-WORDPRESS-LEGACY-ENTITY-ROUTE-SERVICE-FINAL-TEARDOWN-V1
- **작업일**: 2026-09-12
- **입력**: `CHECK-O4O-SCHEMA-COMPATIBILITY-RESIDUE-AND-ORPHANED-TABLE-CLOSURE-V1 §4` (entity-without-table 50 인계) · PASS2 IR §4-3·§14
- **기준 SHA**: `origin/main` = `829cfdc2b` · 전용 worktree `.claude/worktrees/wo-wp-teardown-v1` · branch `work/wordpress-legacy-entity-teardown-v1`
- **성격**: entity-without-table 50 전수 dependency 분류 + **소비자 0 이 확인된 isolated dead entity 8개만 제거**. schema 변경 0
- **schema / migration / production data**: **0 · 0 · 0**

---

## 1. 요약

> entity-without-table 50건을 `route → controller → service → repository → entity` 그래프로 전수 추적했다.
>
> 결론: **50건은 "일괄 삭제 대상"이 아니다.** 대부분은 **살아 있는 라우트 트리 안에 박혀 있거나(cosmetics/neture/partner/cms) canonical 로 보호되는(CPT/ACF/Taxonomies/FormPreset) 축**이다. 이름이 WordPress 계열이라는 이유로 지우면 live 기능이 깨진다.
>
> 이번 회차는 그중 **import·string-relation 소비자가 0 이고, 보호 계약도 없고, 어떤 라우트에도 연결되지 않은 순수 dead TypeORM entity 8개(파일 7개)만** 제거했다. 나머지는 도메인별 teardown WO 로 인계한다(각 라우트 트리의 dead sub-endpoint 를 그 도메인 맥락에서 외과적으로 걷어내야 안전).

```text
entity-without-table 모집단        : 50
  DEAD_ENTITY → REMOVED           :  8  (Category·Tag·Theme·ThemeInstallation·ReusableBlock·BlockPattern·CustomizerPreset·WidgetArea)
  PRESERVED_WITH_REASON (CPT/ACF) : 11  (canonical 런타임 · /api/v1/cpt · FormPreset spec 보호)
  LEGACY_ACTIVE (live 트리 내장)   : 25  (cosmetics 12 · neture 4 · partner 3 · cms Page/View/Media 6)
  PRESERVED_WITH_REASON (기타 소비): 6   (LinkingSession·ApprovalLog·UserActivityLog·TemplatePart·SmtpSettings·RoleApplication)
```

---

## 2. 제거 (DEAD_ENTITY = REMOVED) — 8 class / 7 file

각 항목 확인: (a) 엔티티 파일을 import 하는 파일 = `entities.ts` 등록뿐(0 소비자), (b) `@ManyToOne('X')` 등 **string relation 참조 0**(제거해도 TypeORM metadata 안 깨짐), (c) 관계 out 은 `User` 뿐이고 `User` 에 역방향 관계 없음, (d) 보호 spec 없음, (e) production 테이블 부재.

| entity(table) | 파일 | 소비자 | 관계 | 판정 |
|---|---|---|---|---|
| Category (categories) | `entities/Category.ts` | 0 | 없음 | REMOVED |
| Tag (tags) | `entities/Tag.ts` | 0 | 없음 | REMOVED |
| Theme (themes) | `entities/Theme.ts` | 0 | →User | REMOVED |
| ThemeInstallation (theme_installations) | `entities/Theme.ts` | 0 | →User | REMOVED |
| ReusableBlock (reusable_blocks) | `entities/ReusableBlock.ts` | 0 | →User ×2 | REMOVED |
| BlockPattern (block_patterns) | `entities/BlockPattern.ts` | 0 | →User | REMOVED |
| CustomizerPreset (customizer_presets) | `entities/CustomizerPreset.ts` | 0 | 없음 | REMOVED |
| WidgetArea (widget_areas) | `entities/WidgetArea.ts` | 0 | 없음 | REMOVED |

- 변경: 엔티티 파일 7개 삭제 · `database/entities.ts` 에서 import 6줄 + registry 배열 8줄 제거.
- `packages/types/src/widget.ts` 의 `WidgetArea` **인터페이스**(프론트 타입)는 엔티티와 별개 — 보존.

---

## 3. 보존 — CPT/ACF canonical (PRESERVED_WITH_REASON) · 11

`/api/v1/cpt` (register-routes L140) 로 **mount 된 canonical 런타임**. `unprovisioned-form-and-legacy-app-axis-final-disposition.spec.ts` 가 CPT·FieldGroups·Taxonomies·**FormPreset 등록 유지를 명시 단언**. 테이블 부재이나 **삭제 금지**(WO 중지조건 #3 · spec 보호).

CustomPost · CustomPostType · FieldGroup(custom_field_groups) · CustomFieldValue · Taxonomy · Term · TermRelationship · FormPreset · ViewPreset · TemplatePreset · CMSCustomField(cms_fields)

- 소비처: `controllers/cpt/FieldGroupsController.ts` · `controllers/cpt/TaxonomiesController.ts` · `services/cpt/*` · `services/MetaDataService.ts` · admin-dashboard `cpt-engine`.
- preset 3종은 CustomPostType 와 상호 참조(한 family) → CPT 클러스터와 함께 판단.

---

## 4. 보존 — live 라우트 트리 내장 (LEGACY_ACTIVE) · 25 → 도메인 WO 인계

이름은 legacy 지만 **mount 된 라우트 트리의 repository/service 가 실제 import** 한다. 테이블 부재라 해당 sub-endpoint 호출 시 500 (**latent 500**). 안전 제거 = 그 도메인 라우트 트리에서 dead sub-controller 만 외과적으로 분리하는 별도 WO.

| 클러스터 | entity | mount | 내장 위치 | 인계 |
|---|---|---|---|---|
| Cosmetics legacy catalog | CosmeticsProduct/Brand/Line/Store*/Price* (12) | `/api/v1/cosmetics` (L674, **live 트리** — store ops·tablet·QR·assets 20개 sub-router 중 legacy `/` catalog sub-controller) | `routes/cosmetics/repositories/cosmetics.repository.ts` · `controllers/admin/adminDashboardController.ts` | Cosmetics legacy catalog 은퇴 WO |
| Neture legacy | NetureProduct/OrderItem/Partner/ProductLog (4) | `/api/v1/neture` (L817·833·841) | `routes/neture/repositories/neture.repository.ts` · `services/neture.service.ts` · `modules/neture/neture.service.ts` | Neture 도메인 정리 WO (canonical=Neture V3) |
| Partner | PartnerContent/Event/Target (3) | `/api/partner` (L398) · `/api/v1/partner` (L402) | `modules/partner/services/partner-*.service.ts` | partner-core 은퇴 WO (PASS2 F09) |
| CMS module | CMSPage(cms_pages)·CMSView(cms_views)·CmsMedia(+File/Folder/Tag) (6) | `/api/v1/cms`(L1009 canonical CmsContent) · dashboard-assets | `packages/cms-core` · `routes/dashboard/dashboard-assets.*` (CmsMedia) | CMS media/page 정리 WO |

- **CANONICAL CMS(CmsContent) · O4O Editor 는 보존.** `/api/v1/cms` = CmsContent(테이블 존재) canonical, 이번 대상 아님.

---

## 5. 보존 — 기타 소비자 존재 (PRESERVED_WITH_REASON) · 6

| entity(table) | 소비처 | 판정 |
|---|---|---|
| LinkingSession (linking_sessions) | `services/account-linking.service.ts` | 계정 연동 서비스 — live 가능 · 별도 확인 |
| ApprovalLog (approval_logs) | `controllers/UserManagementController.ts` · `repositories/UserRepository.ts` | user 관리 경로 소비 |
| UserActivityLog (user_activity_logs) | admin-dashboard `pages/users/UserDetail.tsx` (**frontend**) | 프론트 소비 존재 |
| TemplatePart (template_parts) | `services/settingsService.ts` (`getRepository`) | settings 서비스 소비 |
| SmtpSettings (smtp_settings) | `@o4o/mail-core` `mail-transport.service` (런타임 fallback) | mail 계약 — 삭제 시 fallback 경로 영향 |
| RoleApplication (role_applications) | `routes/v2/role-application.controller.ts` (`/api/v2/roles`) | PASS2 F14 DEAD_ROUTE 후보이나 RBAC 인접 → RBAC WO 에서 판단 |

---

## 6. 회귀 검증

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm run build:packages` | PASS (TS error 0) |
| `pnpm --filter @o4o/api-server run type-check` | **PASS (error 0)** — 제거된 8 class 를 import 하는 곳이 없음을 컴파일로 확증 |
| Jest `typeorm-entity-registry-guard` · `ai-admin-typeorm-entity-registration` · `registry-audit-missing-and-dangling-closure` | **38/38 PASS** (registry 계약 무결) |
| Jest `unprovisioned-form-and-legacy-app-axis-final-disposition` (CPT·FormPreset 보호) | **20/20 PASS** |
| Jest `wordpress-legacy-dead-entity-teardown-contract` (신규 guard) | **4/4 PASS** |
| dangling import (`entities/{제거파일}.js`) | **0** |
| string relation 참조 (`@ManyToOne('제거class')`) | **0** |

---

## 7. 변경 목록

```text
삭제  apps/api-server/src/entities/Category.ts
삭제  apps/api-server/src/entities/Tag.ts
삭제  apps/api-server/src/entities/Theme.ts            (Theme + ThemeInstallation)
삭제  apps/api-server/src/entities/ReusableBlock.ts
삭제  apps/api-server/src/entities/BlockPattern.ts
삭제  apps/api-server/src/entities/CustomizerPreset.ts
삭제  apps/api-server/src/entities/WidgetArea.ts
수정  apps/api-server/src/database/entities.ts          (import 6 + registry 8 제거)
신규  apps/api-server/src/__tests__/wordpress-legacy-dead-entity-teardown-contract.spec.ts
신규  docs/checks/CHECK-…-WORDPRESS-LEGACY-ENTITY-ROUTE-SERVICE-FINAL-TEARDOWN-V1.md
```

route/controller/service/repository/manifest/permission 변경 0 · schema 변경 0.

---

## 8. 완료 조건

```text
ENTITY_WITHOUT_TABLE CENSUS       = CLOSED (50 전수 · route→controller→service→entity 분류)
DEAD TYPEORM ENTITIES             = REMOVED (isolated 8 · 소비자·string relation·보호계약 0 확인)
CANONICAL CMS                     = PRESERVED (CmsContent · /api/v1/cms 무접촉)
O4O EDITOR                        = PRESERVED (무접촉)
WORDPRESS LEGACY ROUTES           = PRESERVED_WITH_REASON (live 트리 내장 · 도메인 WO 인계 §4)
WORDPRESS LEGACY SERVICES         = PRESERVED_WITH_REASON (§4·§5)
BROKEN EXPORTS / MANIFESTS        = 0 (registry guard 38/38)
SCHEMA CHANGE                     = 0
OTHER SERVICE REGRESSION          = PASS (build·tsc·jest)
PRODUCTION SMOKE                  = N/A (런타임 코드/스키마 변경 0 · entity 등록만 축소)
```

> **미달 조건 (명시)**: `ACTIVE 500-PRONE ROUTES = 0` 은 **이번 회차에서 달성하지 못했다.** cosmetics/neture/partner/cms 의 mount 된 legacy sub-endpoint 는 테이블 부재로 여전히 500 가능하다. 이들은 live 라우트 트리에 내장돼 있어, 한 번의 sweep 이 아니라 도메인별 외과적 teardown WO 로만 안전하게 0 으로 만들 수 있다(§9). 이번 WO 는 그 전제인 **census 확정 + 무위험 dead entity 제거**를 수행했다.

---

## 9. 후속 인계 (도메인별 route→service teardown)

1. **Cosmetics legacy catalog 은퇴 WO** — `/api/v1/cosmetics` 의 legacy `/` catalog sub-controller + `cosmetics.repository` + cosmetics 12 entity. store ops·tablet·QR·assets sub-router 는 보존.
2. **Neture legacy 정리 WO** — `routes/neture` legacy repository/service + neture 4 entity (canonical=Neture V3).
3. **partner-core 은퇴 WO** — `/api/partner`·`/api/v1/partner` + `modules/partner` + partner 3 entity (PASS2 F09). neture supplier settlement 과의 분리 확인 필요.
4. **CMS media/page 정리 WO** — dashboard-assets 의 CmsMedia 경로 + cms Page/View/Media 6 entity. canonical CmsContent 는 무접촉.
5. **RBAC dead route WO** — `/api/v2/roles`(role_applications) · `/api/v1/userRole` (PASS2 F14).
6. CPT/ACF 는 canonical(보호) — teardown 대상 아님.

각 WO 는 mount → controller → service → repository → entity 를 그 도메인 맥락에서 확인하고, frontend 동적 URL(`${API_BASE}/...`) 소비까지 실측한 뒤 제거한다(이번 census 의 literal-0 은 동적 URL 을 놓칠 수 있어 route 제거의 단독 근거로 쓰지 않는다).

---

## 10. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건(§9)
```
