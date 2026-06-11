# IR-O4O-SERVICE-LEGAL-POLICY-SETTINGS-MANAGEMENT-AUDIT-V1

> **성격**: read-only 조사 IR — 코드/UI/API/DB/migration/route/menu 수정 0. 문서 1개만 생성.
> **목적**: O4O 4개 서비스 푸터 법정정보 + 약관/개인정보처리방침을 코드 하드코딩이 아니라 **Admin 운영자 설정에서 수정 가능한 구조**로 관리하기 위해, 기존 설정·CMS·정책문서·푸터·권한·audit 구조를 조사하고 재사용성/gap/권고안을 정리.
> **작성일**: 2026-06-11
> **조사 기준 commit**: `181d1892b` (main, working tree clean — 외부 세션 WIP 미접촉)
> **조사 도구**: 3 병렬 Explore agent (CMS/Guide CMS/KPA legal · 서비스 설정 entity·API·Admin UI · RBAC·audit)
> **선행 IR**: `IR-O4O-CROSSSERVICE-FOOTER-LEGAL-DISPLAY-REQUIREMENTS-V1` (commit b55530d62)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **서비스별 법정정보 관리 구조는 부재(신규 필요). 약관/정책 문서는 재사용 가능한 기존 모델 3종 존재 — 신규 테이블보다 기존 모델 채택 권장.**
>
> 1. **법정정보(사업자정보) 저장·관리 구조 = 없음.** `Settings`(global key/value, 법정필드 없음) · `BusinessInfo`(per-USER 매장주, service-level 아님) · `organizations`(business_number/address/phone만, 상호·대표자·통신판매·개인정보책임자·호스팅 없음 + 편집 UI 없음). → **`ServiceLegalProfile`(serviceKey 기준) 신규 필요.**
> 2. **약관/정책 문서 = 재사용 가능 모델 3종 존재.** ① KPA `kpa_legal_documents` + `LegalManagementPage`(draft/published, admin write·operator read, public published — **동작하는 UI까지 존재**, KPA-only) ② `cms-core` `CmsContent`(serviceKey + visibilityScope + status draft/pending/published + publishedAt/expiresAt — **요구 필드 거의 충족**) ③ Neture가 쓰는 `cms_pages`(global slug — 서비스 간 충돌 위험). → **KPA 모델을 cross-service 일반화하거나 `CmsContent` 채택. 신규 `ServicePolicyDocument` 테이블 생성 전 둘 중 재사용 우선 검토.**
> 3. **Guide CMS(`guide_contents`) + `OperatorGuideContentsPage`는 4개 서비스 모두 존재** — per serviceKey/pageKey/sectionKey, operator 편집 UI 공통(`packages/operator-core-ui`). 단 version/published/draft 없음 → 법정문서엔 부적합, **Admin 설정 UI 패턴 참고용**으로 유용.
> 4. **Admin 설정 UI 현황**: GP/KCos `SettingsPage` = **mock(저장 미연동)**. Neture `EmailSettingsPage`(admin) = live. KPA `LegalManagementPage`(operator) = live. → **신규 법정정보/약관 설정 UI는 KPA LegalManagementPage + Neture settings 패턴을 템플릿으로, `operator-core-ui` 공통화 권장.**
> 5. **권한**: `service-scope-guard` + `resolveOperatorScope()` 패턴 재사용 가능(service admin=자기 서비스, super_admin=`?serviceKey=`/`?all=` opt-in + audit). ⚠️ **KPA는 `platformBypass:false`** — super_admin이 기본적으로 KPA에 cross 불가. "super_admin 전체 수정" 설계 시 KPA 예외 고려 필요.
> 6. **Audit**: 범용 `AuditLog`(`audit_logs`: entityType/action/changes JSONB/userId/reason) 재사용 — `entityType='service_legal_profile' | 'service_policy_document'`.
> 7. **공개 렌더링**: 4개 서비스 CSR(Vite SPA), 푸터 client fetch 안전(Neture LegalPage 선례). **미설정 시 placeholder 절대 노출 금지 → 빈 표시 + operator 미설정 경고**.

**권고 순서**: ① (긴급·안전) GP/KCos placeholder 법정정보 노출 차단 → ② 법정정보 실값 확정(사용자/법무) → ③ `ServiceLegalProfile` 신규 + policy 문서 모델 재사용 결정 → ④ Admin 설정 UI(공통) → ⑤ 공개 policy route + 동적 푸터.

---

## 1. 조사 목적 / 2. 조사 범위

선행 IR이 "푸터에 **무엇을** 표시해야 하는가"를 다뤘다면, 본 IR은 "그 정보를 **어디에 저장하고 Admin에서 어떻게 수정 가능하게** 할 것인가"를 조사한다. 범위: 4개 서비스(GlycoPharm/K-Cosmetics/KPA Society/Neture) frontend 푸터·정책 route·설정 UI + backend 설정/CMS/정책 entity·API + shared packages + RBAC/audit.

## 3. 선행 IR 요약 (반영)

GP/KCos 푸터 placeholder 법정정보 하드코딩(홍길동/000-00-00000/통신판매 placeholder) · KPA/Neture 실값(㈜쓰리라이프존 108-86-02873) · GP/KCos 약관·개인정보 route 부재 · KPA PolicyPage/PrivacyPage orphaned · Neture `/terms`·`/privacy` CMS 완비 · 통신판매중개 검토 필요 · 운영주체 불일치 · 공통 Footer 부재 · **법정정보 임의작성 금지** · 푸터 구현 전 설정 관리 구조 필요.

---

## 4. 현재 frontend 푸터/정책 route 상태

| 서비스 | 푸터 파일 | `/terms` | `/privacy` | `/contact` | guide 진입 | Admin/Operator 설정 UI |
|--------|----------|:---:|:---:|:---:|:---:|------|
| GlycoPharm | `web-glycopharm/src/components/common/Footer.tsx` (placeholder) | ❌ | ❌ | ✅ | `/service-guide` | `/operator/settings` SettingsPage **(mock, 저장 미연동)** |
| K-Cosmetics | `web-k-cosmetics/src/components/common/Footer.tsx` (placeholder) | ❌ | ❌ | ✅ | `/service-guide` | `/operator/settings` SettingsPage **(mock)** |
| KPA Society | `web-kpa-society/src/components/Footer.tsx` (실값+placeholder) | ❌ route | ❌ route | ✅ | `/service-guide` | **`/operator/legal/documents` LegalManagementPage (live, terms/privacy)** + SettingsPage |
| Neture | `web-neture/src/components/Footer.tsx` (실값, 최소) | ✅ CMS | ✅ CMS | ✅ | `/guide` | `/admin/settings/email` EmailSettingsPage (live, SMTP) |

- KPA `PolicyPage.tsx`/`PrivacyPage.tsx` 는 컴포넌트만 존재(route 미연결). 단 KPA는 **별도로 `kpa_legal_documents` 기반 LegalManagementPage 운영 UI가 살아있음** — orphaned static 페이지와 별개의 동적 정책 관리 경로가 이미 존재.

## 5. 현재 backend/API/entity/settings 상태

### 5.1 설정/사업자정보 entity

| Entity / Table | 위치 | 스코프 | 법정/사업자 필드 | 평가 |
|---|---|:---:|---|---|
| `Settings` / `settings` | `apps/api-server/src/entities/Settings.ts` | **global** key/value JSONB | siteName/siteDescription/siteUrl/adminEmail만 | ❌ 법정정보 없음, per-service 아님 |
| `BusinessInfo` / `business_info` | `apps/api-server/src/entities/BusinessInfo.ts` | **per-USER** (store owner) | taxId/businessLicense/address/contact | ❌ service-level 아님 (매장주 개인) |
| `organizations` | `...migrations/20260221000000-OrgServiceModelNormalization...` | per-org/service | `business_number`/`address`/`phone`/`description` | △ 일부만. 상호·대표자·통신판매·개인정보책임자·호스팅 없음. **편집 UI/전용 API 없음** |

→ **서비스 단위 법정정보 전용 저장 구조 부재. read/write API·Admin UI 모두 없음.**

### 5.2 약관/정책/CMS 콘텐츠 entity (재사용 후보)

| Entity / Table | 위치 | 스코프 | status/version | 공개 API | Admin UI | 재사용 적합도 |
|---|---|:---:|---|---|---|:---:|
| `kpa_legal_documents` | `apps/api-server/src/routes/kpa/.../legal-documents.controller.ts` + migration `20260404000200` | **KPA only** (document_type terms/privacy) | draft/published, published_by/at, created/updated_by | `GET /kpa/legal/documents/published/:type` | **`LegalManagementPage` (live)** | ★★★ (일반화 필요) |
| `CmsContent` / cms_content | `packages/cms-core/src/entities/CmsContent.entity.ts` | **serviceKey** + organizationId + visibilityScope(platform/service/org) | draft/pending/published/archived + publishedAt + expiresAt + createdBy | (cms-content service) | (CMS 관리) | ★★★ (필드 거의 충족) |
| `cms_pages` (`Page`) | `apps/api-server/src/modules/cms/entities/Page.ts` | **global slug** (siteId nullable) | draft/published/scheduled/archived + versions[] + publishedAt + scheduledAt | `GET /cms/public/page/:slug` (Neture 사용) | CMS pages | ★★ (slug 충돌 위험) |
| `guide_contents` | `apps/api-server/src/routes/guide/entities/guide-content.entity.ts` | **serviceKey+pageKey+sectionKey** | 없음 (단순 override) | `GET /guide/contents` | **`OperatorGuideContentsPage` (4서비스 공통)** | ★ (version 없음 → 법정문서 부적합, UI 패턴 참고) |

### 5.3 설정 API

- `apps/api-server/src/routes/settingsRoutes.ts`: `/settings/general`(public), `/settings/:type`(admin GET/PUT) — **global, per-service 아님, 법정정보 endpoint 없음.**
- store-settings (`/stores/:slug/settings`): 템플릿/블록/채널만 — 법정정보 아님.

## 6. 현재 Admin 설정 UI 상태

| 서비스 | 설정 페이지 | 상태 | 법정/약관 편집? |
|--------|-----------|------|:---:|
| GlycoPharm | `pages/operator/SettingsPage.tsx` | mock (저장 미연동, 데모 토글) | ❌ |
| K-Cosmetics | `pages/operator/SettingsPage.tsx` | mock | ❌ |
| Neture | `pages/admin/settings/EmailSettingsPage.tsx` | **live (SMTP)** | ❌ (인프라) |
| KPA Society | `pages/operator/LegalManagementPage.tsx` | **live (terms/privacy)** | ✅ |

→ **법정정보(사업자정보) 편집 UI는 어디에도 없음.** 약관/정책 편집 UI는 KPA만 존재(live). 동적 콘텐츠 운영 UI 패턴(`OperatorGuideContentsPage`)은 4서비스 공통 존재.

## 7. Neture/KPA CMS·policy 구조 재사용 가능성

- **약관/개인정보처리방침**: KPA `kpa_legal_documents`(+LegalManagementPage)는 이미 **draft/published + admin write/operator read + public published**를 갖춘 **동작하는 정책 문서 시스템**. 단점=KPA 전용(document_type만, serviceKey 없음, version/effectiveDate 없음). → **serviceKey + version + effectiveDate 추가하여 cross-service 일반화**가 가장 빠른 경로. 대안으로 `CmsContent`(이미 serviceKey+status+publishedAt+expiresAt 보유)를 정책 문서 백엔드로 채택하면 신규 테이블 없이 가능.
- **Neture `cms_pages`**: global slug라 4서비스 동시 `/terms`엔 충돌(같은 slug 공유). siteId(nullable)로 분리 가능하나 현 사용은 global. cross-service 표준으로는 `CmsContent`(serviceKey 내장)가 더 적합.
- **권고**: 정책 문서는 **(A) KPA 모델 일반화** 또는 **(B) `CmsContent` 채택** 중 택1 — 신규 `ServicePolicyDocument` 테이블 생성 전에 (B) `CmsContent` 재사용 가능성을 1순위 검토(필드 충족도 최고). Admin UI는 KPA `LegalManagementPage`를 cross-service 템플릿으로.

## 8. 서비스별 gaps

| 항목 | GP | KCos | KPA | Neture |
|---|:--:|:--:|:--:|:--:|
| 푸터 법정정보 실값 | ❌ placeholder | ❌ placeholder | △ 일부 실값 | △ 최소 실값 |
| `/terms`·`/privacy` route | ❌❌ | ❌❌ | ❌route(컴포넌트만) | ✅✅(CMS) |
| 약관 동적 관리 backend | ❌ | ❌ | ✅(kpa_legal) | ✅(cms_pages) |
| 약관 Admin UI | ❌ | ❌ | ✅ | △(CMS pages) |
| 법정정보 설정 entity/API/UI | ❌ | ❌ | ❌ | ❌ |

## 9. 법정정보 관리 구조 권고안

- 신규 **`ServiceLegalProfile`** (serviceKey PK 또는 unique) — 선행 IR §7.1 후보 채택. 필드: companyName/representativeName/businessRegistrationNumber/ecommerceRegistrationNumber/ecommerceRegistrationAgency/businessAddress/customerServicePhone/customerServiceEmail/privacyOfficerName·Email·Phone/hostingProvider/businessInfoVerificationUrl/mailOrderBrokerNotice/purchaseSafetyServiceInfo/isActive/updatedBy/updatedAt.
- `organizations`의 business_number/address/phone와 **중복 방지**: ServiceLegalProfile은 "사이버몰 운영 주체(법정 표시)" 전용으로 분리하고, organizations는 매장/조직 운영용으로 유지(역할 구분 문서화).
- 공개 read API `GET /api/v1/{service}/legal/profile`(public) + admin write `PUT`(service admin / super_admin).

## 10. 약관/정책 문서 관리 구조 권고안

- 우선순위: **`CmsContent`(cms-core) 재사용 1순위** → 불가 시 **KPA `kpa_legal_documents` 일반화** → 최후 신규 `ServicePolicyDocument`.
- 필수 필드(선행 WO §7.2 기준): serviceKey/documentType(terms,privacy,refund,commerce,seller,partner,community,…)/title/slug/body/version/status(draft·pending·published·archived)/effectiveDate/publishedAt/createdBy/updatedBy/changeReason/previousVersion. `CmsContent`는 status·publishedAt·serviceKey·visibilityScope를 이미 보유 → version/effectiveDate/documentType/changeReason 보강만 필요.
- 이전 버전 보존: `cms_pages.versions[]` 또는 AuditLog snapshot 패턴 활용.

## 11. Admin UI 권고안

- **공통 컴포넌트**를 `packages/operator-core-ui`(GuideContentsConsolePage 선례)에 두고 4서비스 thin wrapper. 2개 탭: ①법정정보(ServiceLegalProfile 폼) ②정책 문서(목록+RichTextEditor, draft/published/시행일/버전).
- KPA `LegalManagementPage`(동작 UI)를 정책 문서 탭의 베이스 템플릿으로, Neture `EmailSettingsPage`(live admin settings)를 폼 패턴 참고로.
- GP/KCos의 mock SettingsPage에 메뉴 슬롯 연결.

## 12. 공개 footer rendering 권고안

- 4서비스 CSR(Vite SPA) → 푸터가 `GET /{service}/legal/profile` + published 정책 링크 client fetch(= Neture LegalPage 선례). SSR 부담 없음.
- **fallback**: 값 미설정 시 해당 항목 **렌더 안 함(빈 표시)** — placeholder 절대 노출 금지. 로그인 operator에게만 "법정정보 미설정" 경고 배지.
- 캐시: 공개 GET은 단순/저빈도 → 짧은 캐시 허용.

## 13. 권한/audit 권고안

- 쓰기 권한: **service admin = 자기 serviceKey만**, **platform super_admin = `?serviceKey=`/`?all=` opt-in** — `resolveOperatorScope()`(`apps/api-server/src/utils/serviceScope.ts`) + `service-scope-guard`(`packages/security-core`) 재사용.
- ⚠️ **KPA `platformBypass:false`** (service-configs) — super_admin 기본 cross 불가. "전체 서비스 수정" 설계 시 KPA는 명시 예외 처리 필요(설계 결정 항목).
- operator = read(또는 일부) / 일반·비로그인 = published만.
- audit: 범용 `AuditLog`(`apps/api-server/src/entities/AuditLog.ts`) — entityType=`service_legal_profile`|`service_policy_document`, action=created/updated/published/archived, changes JSONB[{field,old,new}], userId, reason. 정책 전용 테이블 불필요.

## 14. 후속 작업 분리안

| 단계 | WO(가칭) | 내용 | 선행 조건 |
|:--:|---|---|---|
| **0 (긴급·안전)** | `WO-O4O-GP-KCOS-FOOTER-PLACEHOLDER-LEGAL-INFO-SUPPRESSION-V1` | GP/KCos 푸터 placeholder 법정정보(홍길동/000-00-00000/통신판매 placeholder) 공개 노출 제거. **실값 임의작성 금지** — 미확인 항목은 숨김 | 없음 (즉시 가능) |
| 1 | `WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1` | ServiceLegalProfile 신규 + 정책문서 모델 재사용(CmsContent 우선) + public read/admin write API + AuditLog 연동 | 법정정보 실값 확정 |
| 2 | `WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1` | operator-core-ui 공통 설정 UI(법정정보+정책문서), draft/published/시행일/버전, 권한 경계 | 단계 1 |
| 3 | `WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1` | 4서비스 `/terms`·`/privacy`(필요시 `/policies/:slug`) 공개 route. KPA orphaned 정리 | 단계 1 |
| 4 | `WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1` | 공통 Footer가 ServiceLegalProfile+published 정책 읽어 렌더, placeholder 제거, 안내/문의/약관/개인정보 연결 | 단계 1~3 |

> **단계 0은 단계 1~4와 독립**으로 즉시 진행 가능(노출 위험 차단). 나머지는 법정정보 실값 확정 후.

## 15. 위험 및 주의사항

- ⚠️ **법정정보 실값 미확보 상태에서 backend/UI 구현은 가능하나, 데이터(실 사업자정보)는 사용자/법무만 입력** — 코드/시드에 임의 작성 금지.
- ⚠️ **운영 주체 단일/분리 미확정**(선행 IR §7-1) — ServiceLegalProfile를 serviceKey별로 두되, 단일 법인이면 동일 값 복제. 구조는 serviceKey 분리가 안전.
- ⚠️ **KPA platformBypass:false** — super_admin 전체 편집 모델과 충돌 가능. 설계 시 명시.
- ⚠️ **CMS 이원화**(`cms_pages` global slug vs `CmsContent` serviceKey) — 정책 문서 백엔드 채택 시 하나로 통일 권장(혼용 금지). Neture 기존 `/terms`(cms_pages)와의 마이그레이션 경로 별도 설계.
- ⚠️ 통신판매중개 고지(전상법 §20) 문구는 법무 확인 후 ServiceLegalProfile.mailOrderBrokerNotice에 저장 — 임의 단정 금지.
- 본 IR은 코드/구조 조사이며 확정 법률 자문 아님.

---

## 부록 — 조사 산출/제약 + 핵심 파일

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (read-only IR) |
| 생성 문서 | `docs/investigations/IR-O4O-SERVICE-LEGAL-POLICY-SETTINGS-MANAGEMENT-AUDIT-V1.md` (유일) |
| 조사 기준 commit | `181d1892b` |
| serviceKey (UI canonical) | `glycopharm` / `k-cosmetics` / `kpa-society` / `neture` |
| 법정정보 entity | **부재** (신규 ServiceLegalProfile 필요) |
| 정책문서 재사용 후보 | CmsContent(cms-core) ★ / kpa_legal_documents ★ / cms_pages △ |
| 권한 재사용 | service-scope-guard + resolveOperatorScope (KPA platformBypass=false 주의) |
| audit 재사용 | AuditLog (entityType 신설) |
| git status | working tree clean |
| commit hash | (commit 후 기재) |

**핵심 참조 파일**:
`apps/api-server/src/entities/Settings.ts` · `entities/BusinessInfo.ts` · `entities/AuditLog.ts` ·
`packages/cms-core/src/entities/CmsContent.entity.ts` · `apps/api-server/src/modules/cms/entities/Page.ts` ·
`apps/api-server/src/routes/kpa/controllers/legal-documents.controller.ts` (+ migration `20260404000200`) ·
`apps/api-server/src/routes/guide/entities/guide-content.entity.ts` · `packages/operator-core-ui/src/modules/guide-contents/GuideContentsConsolePage.tsx` ·
`packages/security-core/src/service-scope-guard.ts` · `service-configs.ts` · `apps/api-server/src/utils/serviceScope.ts` ·
`services/web-kpa-society/src/pages/operator/LegalManagementPage.tsx` · `services/web-neture/src/pages/LegalPage.tsx` · `services/web-neture/src/pages/admin/settings/EmailSettingsPage.tsx`
