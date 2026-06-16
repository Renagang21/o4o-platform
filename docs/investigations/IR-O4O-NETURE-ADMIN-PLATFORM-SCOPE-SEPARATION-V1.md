# IR-O4O-NETURE-ADMIN-PLATFORM-SCOPE-SEPARATION-V1

> **성격**: read-only 조사 IR — 코드/UI/API/DB/guard/menu 수정 0. 문서 1개만 생성.
> **목적**: Neture admin 메뉴·route·page·API·guard 를 실측하여 각 기능을 (A) Neture 서비스 admin / (B) O4O platform admin / (C) operator 이관 / (D) 보류 / (E) 정책 결정 5축으로 분류, 후속 WO 범위 확정.
> **작성일**: 2026-06-16
> **조사 기준 commit**: `cc756f1a7` (main, working tree clean)
> **조사 도구**: 2 병렬 Explore agent (admin/operator route·menu·platform surface · backend guard·role·service API) + 직접 검증(OperatorsPage / RoleManagementPage / ServiceAudiencePolicyPage / UsersManagementPage / adminOperatorApi)
> **선행 정비 모델**: GP/KCos admin cleanup · KPA admin 보강(service_legal_profiles / service_policy_documents / 공개 상태 점검)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **Neture frontend admin 은 사실상 전부 Neture-서비스-scope(`requireNetureScope('neture:admin')`) 이다. platform-admin frontend 표면은 소비처가 없음.** 단 **cross-service/RBAC 성격 3종**이 neture admin 가드 아래 섞여 있어 platform-admin 분리/정책 결정이 필요.
>
> 1. **Neture admin 대부분 = Neture 서비스 admin** — 회원 완전삭제 / 법정정보·약관 / 문의 설정 / 이메일 설정 / 카탈로그·브랜드·카테고리·마스터 거버넌스 / AI 관리 / 공급자 승인 / 정산·커미션 등 전부 `/neture/admin/*` 또는 `/admin/services/neture/*`(neture-scoped). GP/KCos/KPA 대비 admin 기능이 **풍부**(과소 아님).
> 2. **platform-admin frontend 표면 부재** — Neture UI 에 서비스 목록·플랫폼 계정·cross-service 운영자 지정 화면 **없음**. 백엔드에 platform API(`/admin/platform-accounts`·`/admin/platform-services`·global `/admin/users`, `requireRole(platform:admin|super_admin)`)는 존재하나 **Neture frontend 미소비**(별도 platform-admin 앱 영역).
> 3. **cross-service 성격 1종 (B 강력 후보)** — `약국 대상 서비스 설정`(`/admin/settings/service-audience`, ServiceAudiencePolicyPage)은 `/neture/admin/service-audience-policies` 로 **여러 serviceKey 의 정책을 동시 편집**(neture-admin 가드, 데이터는 cross-service). → platform-admin 분리 후보.
> 4. **RBAC/운영자 지정 2종 (E 정책 결정)** — `운영자 관리`(`/admin/operators` → `/neture/admin/operators`, neture:admin 이 neture:operator/admin 부여) + `역할 관리`(`/admin/roles`, 공유 `@o4o/ui` RoleManagementPage). 정비 정책("운영자 지정 = platform admin 영역")과 충돌 가능 — 단 Neture 가 O4O 허브라 within-service 부여 유지 여지. **결정 필요**(즉시 이동/삭제 금지).
> 5. **Finance (D 보류)** — 정산/커미션/파트너 정산/파트너 모니터링은 neture-admin(neture-scoped). WO §5.9 원칙대로 실운영 후 정책 결정 — 지금 이동/삭제 금지.
> 6. **operator 경계 양호** — 실무(공급자 활성화·상품/오퍼 승인·주문·콘텐츠·포럼·문의 처리)는 이미 `/operator/*`(neture:operator). admin 메뉴는 admin-proper 위주. 회원 soft(operator `/operator/members`) / hard(admin `/admin/members`) 분리 정합.

**권고 후속 순서**: ① (E) 운영자 지정/역할 관리 소속 결정 + (B) service-audience platform 분리 → `WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1` ② (D) finance scope 별도 IR ③ admin cleanup 은 소폭(메뉴는 대체로 정합).

---

## 1. Neture admin 현재 메뉴표 (실측 — `operatorMenuGroups.ts getAdminMenu()`, 8 그룹)

가드: `<AdminRoute>` = `['neture:admin','platform:super_admin']` + `requireMembership="neture"`.

| 그룹 | 메뉴 | route | component | API(대표) | 분류 |
|---|---|---|---|---|:--:|
| DASHBOARD | 관리자 대시보드 | `/admin` | AdminDashboardPage | neture admin snapshot | A |
| USERS | 회원 완전삭제 | `/admin/members` | AdminMemberManagementPage | `/neture` hard-delete(단건) | A |
| USERS | 운영자 관리 | `/admin/operators` | OperatorsPage | **`/neture/admin/operators`** (neture:admin↔operator 부여) | **E** |
| USERS | 문의 메시지 | `/admin/contact-messages` | AdminContactMessagesPage | `/neture/admin/contact-messages` | A (operator 와 분담) |
| APPROVALS | 공급자 승인 | `/admin/admin-suppliers` | AdminSupplierApprovalPage | `/neture/admin/suppliers/*` | A |
| APPROVALS | 서비스 승인 | `/admin/service-approvals` | AdminServiceApprovalPage | neture-scoped | A |
| PRODUCTS | 카테고리/브랜드/마스터/정리/일괄등록/매핑 | `/admin/categories` 등 | (각 page) | neture-scoped 거버넌스 | A |
| ORDERS | 파트너 현황/정산/파트너 정산/커미션 | `/admin/partners`·`/admin/settlements`·`/admin/partner-settlements`·`/admin/commissions` | (각 page) | `/neture/admin/settlements\|commissions` | **D(보류)** |
| CONTENT | 커뮤니티 광고 | `/admin/community-admin` | CommunityManagementPage | neture-scoped | A |
| ANALYTICS | AI 관리/AI 카드 규칙/AI 비즈팩 | `/admin/ai-admin*` 등 | (각 page) | neture-scoped | A |
| SYSTEM | 역할 관리 | `/admin/roles` | RoleManagementPage(@o4o/ui wrapper) | 공유 RBAC | **E** |
| SYSTEM | 이메일 설정 | `/admin/settings/email` | EmailSettingsPage | neture SMTP | A |
| SYSTEM | 법정정보·약관 설정 | `/admin/settings/legal-terms` | ServiceLegalSettingsPage | `/admin/services/neture/legal-profile\|policies` | A |
| SYSTEM | 문의 설정 | `/admin/settings/contact` | ServiceContactSettingsPage | `/admin/services/neture/contact-settings` | A |
| SYSTEM | 약국 대상 서비스 설정 | `/admin/settings/service-audience` | ServiceAudiencePolicyPage | **`/neture/admin/service-audience-policies` (cross-service)** | **B/E** |

> admin 메뉴 외 `/admin/*` 공유 route(operator page 재사용): `/admin/users`·`/admin/stores`·`/admin/orders`·`/admin/community`·`/admin/forum-*`·`/admin/analytics` 등 — admin 이 operator 화면에 접근하는 통로(메뉴 미노출). 실제 호출은 `/operator/*`(neture-operator) 엔드포인트.

## 2. 각 메뉴 route/component/API/guard

§1 표 참조. 백엔드 가드 요지:
- Neture admin 도메인: `requireNetureScope('neture:admin')`(= `createMembershipScopeGuard(NETURE_SCOPE_CONFIG)`, **platformBypass=true** → platform:super_admin 접근 가능, cross-service prefix 차단).
- 법정정보·약관·문의 설정: `requireServiceLegalScope('admin'|'operator')` (`:serviceKey` 경로 — neture 고정 호출).
- platform API(별개): `requireRole(['platform:admin','platform:super_admin'])` (`/admin/platform-accounts`·`/admin/platform-services`·global `/admin/users`) — **Neture frontend 미소비**.

## 3. Neture operator 대응 메뉴 현황 (`/operator/*`, neture:operator)

대시보드·회원 관리(soft)·문의 메시지(읽기/처리)·가입 승인·유통참여형 펀딩·공급자 활성화·상품 관리/후보/승인·매장 관리·주문 관리·홈페이지 CMS·안내 문구·포럼(신청/삭제요청/분석)·AI 리포트/운영·운영 분석·공급자 품질·알림 설정. supplier/partner workspace(`/supplier/*`,`/partner/*`) 별도.
→ 실무 운영은 operator 에 충분히 존재(이관 대상 적음).

## 4. Neture 자체 서비스 admin 기능 목록 (A — 유지)

회원 완전삭제(개인정보 파기) · 법정정보(service_legal_profiles, neture) · 약관/정책(service_policy_documents, neture) · 문의 설정 · 이메일 설정 · 공급자 승인 · 서비스 승인 · 카탈로그/브랜드/카테고리/마스터/정리/매핑 거버넌스 · AI 관리 · 커뮤니티 광고 · 관리자 대시보드.
→ Neture 공개 사이트·서비스 운영에 필요한 admin. **유지**.

## 5. O4O platform admin 기능 목록 (B — 분리 후보)

| 기능 | 현 위치 | cross-service 여부 | 판단 |
|---|---|:--:|---|
| 약국 대상 서비스 설정 | `/admin/settings/service-audience` (neture admin) | ✅ 여러 serviceKey 정책 동시 편집 | **platform-admin 분리 후보** — Neture 가 허브라 두는 것이 의도일 수 있으나, 데이터가 cross-service 이므로 소속 명확화 필요 |
| (백엔드) 플랫폼 계정/서비스 카탈로그/global user | `/admin/platform-accounts`·`/admin/platform-services`·`/admin/users` (platform guard) | ✅ | 백엔드만 존재, Neture UI 미소비 — platform-admin 앱 영역(현 Neture 범위 외) |

## 6. operator 성격 기능 목록 (C — 이관)

- admin 메뉴에 잔존하는 순수 operator 실무는 **거의 없음**(이미 분리). `문의 메시지`는 admin(전체 관리)·operator(공급자/파트너 읽기·처리) 분담 — 의도된 분리.
- `/admin/*` 공유 route(operator page 재사용: users/stores/orders/forum/analytics)는 메뉴 미노출 통로 — 정리 시 "admin 메뉴에서 operator 통로 제거" 정도(소폭, 선택).
→ **대규모 operator 이관 불필요.**

## 7. 역할 관리 / 운영자 지정 기능 소속 판단 (E — 정책 결정 핵심)

| 기능 | 현 동작 | 정책 충돌 | 판단 |
|---|---|---|---|
| 운영자 관리 (`/admin/operators`) | neture:admin 이 neture:operator/admin **생성·부여·비활성**(`/neture/admin/operators`, neture-scoped) | "운영자 지정=platform admin" 정책과 충돌 가능 | **E**. 단 neture: 로컬 범위라 within-service 부여 정당성 있음. Neture=O4O 허브 특성 고려해 ①Neture 서비스 admin 유지 vs ②platform-admin 이관 결정 |
| 역할 관리 (`/admin/roles`) | 공유 `@o4o/ui` RoleManagementPage(apiClient 주입, isAdmin=neture:admin/super_admin) | RBAC 가 platform RBAC(role_assignments) 와 겹침 | **E**. neture-scoped 인지 platform RBAC 접근인지 + 소속(서비스 vs platform) 결정 필요 |

→ **즉시 제거/이동 금지.** platform-admin 분리 WO 에서 함께 결정.

## 8. 법정정보·약관 설정 구조

- Neture 는 이미 cross-service 표준 사용: 법정정보 `service_legal_profiles`(serviceKey=neture), 정책문서 `service_policy_documents`(serviceKey=neture). admin 편집 = `/admin/settings/legal-terms`(ServiceLegalSettingsPage, 전체 3탭). 공개 `/terms`·`/privacy` = CMS(LegalPage). footer = PublicLegalFooterInfo(neture).
- 타 서비스 법정정보 관리 기능 **없음**(neture 고정) → **Neture 서비스 admin** (A). KPA 와 달리 정책문서도 이미 표준.

## 9. 문의 설정 / 문의 관리 구조

- 설정: `/admin/settings/contact`(admin, `/admin/services/neture/contact-settings`). 관리: admin `/admin/contact-messages`(전체) + operator `/operator/contact-messages`(공급자/파트너 읽기·처리, service/other 는 admin escalation). 공개 접수: `POST /neture/contact`(public).
→ 설정=admin / 처리=operator(+admin) 분리 정합. Neture 가 O4O 대표 사이트 문의를 받는 성격 반영(supplier/partner/service/other 타입).

## 10. 회원 데이터 관리 구조

- soft(승인/반려/정지/탈퇴): operator `/operator/members`(`?mode=soft`, batch) — UsersManagementPage(operator). `/admin/users` route 는 동일 operator page 재사용.
- hard(완전삭제/개인정보 파기): admin `/admin/members`(AdminMemberManagementPage, 단건).
→ soft=operator / hard=admin 분리 정합(타 서비스와 동일 canonical).

## 11. Finance/정산성 기능 보류 여부 (D)

- 정산 관리·파트너 정산·커미션 관리·파트너 현황: neture-admin(`/neture/admin/settlements|commissions`). 정산 정책 설정 vs 실무 처리 경계 미분리(현재 admin 통합).
- WO §5.9 / §8.4 원칙대로 **보류** — 실운영 후 별도 IR(`IR-O4O-NETURE-FINANCE-ADMIN-OPERATOR-SCOPE-AUDIT-V1`)로 admin/operator 경계 결정. 지금 이동/삭제 금지.

## 12. 삭제/숨김 후보

- **없음(명확한 dead/stub 미발견).** admin 메뉴는 실기능 위주. (소폭 후보: `/admin/*` 공유 operator-page 통로의 admin 메뉴 비노출 정리 — 선택, 위험 낮음.)

## 13. 이관 후보

- (B) `/admin/settings/service-audience` → platform-admin 소속 명확화(분리 또는 "허브가 관리" 명문화).
- (C) 대규모 operator 이관 불필요.

## 14. 정책 결정 필요 항목 (E)

1. `운영자 관리`(/admin/operators) 소속: Neture 서비스 admin 유지 vs platform-admin 이관.
2. `역할 관리`(/admin/roles) 소속 + scope(neture vs platform RBAC).
3. `약국 대상 서비스 설정`(cross-service) 소속.
4. Finance(정산/커미션) admin/operator 경계 (D, 별도 IR).
5. (전제) O4O platform-admin **앱/표면의 위치** — Neture 안에 둘지, 별도 platform-admin 앱으로 둘지. 현재 Neture frontend 엔 platform 표면 없음 → 별도 앱 가정이 자연스러움.

## 15. 후속 WO 제안

| WO(가칭) | 범위 | 우선 |
|---|---|:--:|
| **WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1** | service-audience(cross-service) + 운영자 관리/역할 관리 소속 결정·분리. platform-admin 표면 위치(별도 앱 vs neture 내 분리) 확정 | **1** |
| IR-O4O-NETURE-FINANCE-ADMIN-OPERATOR-SCOPE-AUDIT-V1 | 정산/커미션 admin(정책)·operator(실무) 경계 조사 (보류 해제 시) | 2 |
| WO-O4O-NETURE-ADMIN-SCOPE-CLEANUP-V1 (선택·소폭) | admin 메뉴에서 operator-page 통로 정리, 라벨 정합 | 3(낮음) |
| WO-O4O-NETURE-OPERATOR-WORKFLOW-MIGRATION-V1 | (대상 적음 — 현재 operator 분리 양호, 필요 시) | 보류 |

> GP/KCos(축소)·KPA(보강) 와 달리 Neture 는 **"분리(서비스 admin vs platform admin)"** 가 핵심. 삭제/이관보다 소속 명확화 + cross-service/RBAC 항목 결정이 우선.

---

## 부록 — 조사 산출/제약 + 핵심 파일

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (read-only IR) |
| 생성 문서 | `docs/investigations/IR-O4O-NETURE-ADMIN-PLATFORM-SCOPE-SEPARATION-V1.md` (유일) |
| 조사 기준 commit | `cc756f1a7` |
| Neture admin guard | `requireNetureScope('neture:admin')` (platformBypass=true) |
| platform admin frontend 표면 | **부재**(백엔드 platform API 만 존재, Neture 미소비) |
| B(분리 후보) | service-audience(cross-service) |
| E(정책 결정) | 운영자 관리 / 역할 관리 / service-audience / finance / platform 표면 위치 |
| D(보류) | finance(정산·커미션) |
| 경계 정상 | 회원 soft/hard · 문의 설정/처리 · operator 실무 |
| git status | working tree clean (외부 세션 WIP 미접촉) |
| commit hash | `52804e82b` |

**핵심 참조 파일**:
`services/web-neture/src/App.tsx`(admin/operator routes) · `src/config/operatorMenuGroups.ts`(getAdminMenu/filterMenuByRole) ·
`src/components/auth/RoleGuard.tsx`·`lib/role-constants.ts`(ADMIN_ROLES) ·
`src/pages/admin/{OperatorsPage,AdminMemberManagementPage,ServiceLegalSettingsPage,ServiceContactSettingsPage,ServiceAudiencePolicyPage,AdminSettlementsPage}.tsx` ·
`src/pages/operator/{RoleManagementPage,UsersManagementPage}.tsx` · `src/lib/api/admin.ts`(adminOperatorApi/serviceAudiencePolicyApi) ·
`packages/security-core/src/service-configs.ts`(NETURE_SCOPE_CONFIG, platformBypass=true) · `apps/api-server/src/middleware/neture-scope.middleware.ts` ·
`apps/api-server/src/routes/admin/{platform-accounts,users}.routes.ts` · `apps/api-server/src/routes/platform-services/admin-platform-services.routes.ts` (platform API, Neture 미소비)
