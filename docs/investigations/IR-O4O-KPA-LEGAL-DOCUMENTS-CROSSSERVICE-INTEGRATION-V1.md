# IR-O4O-KPA-LEGAL-DOCUMENTS-CROSSSERVICE-INTEGRATION-V1

> **유형:** Read-only 조사 (코드/UI/API/DB/migration 무변경). 문서 1개 생성.
> **목적:** KPA Society 의 법정정보·약관·개인정보처리방침 관리 경로를 전수 조사하고, 기존 KPA 전용 구조와
> 신규 cross-service 구조(`service_legal_profiles`/`service_policy_documents`) 통합 방향을 결정한다.
> **상위:** `CHECK-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1` §16 / 선행 legal 체계 5단계 완료 후 KPA 잔여 정리.
> **작성일:** 2026-06-12

---

## 1. 조사 목적
O4O 법정정보·정책문서 체계는 Neture/GP/KCos 에 대해 (a) `service_legal_profiles` (b) `service_policy_documents`
(c) Admin 설정 UI (d) 동적 푸터 (e) `/terms`·`/privacy` 까지 닫혔다. **KPA 만 예외**로, 기존 전용 구조와 mock 이
혼재한다. 본 IR 은 KPA 의 실제 상태를 확정하고 통합 옵션을 비교·권고한다(구현 없음).

## 2. 조사 범위
`services/web-kpa-society`(legal 페이지/footer/route/operator 관리화면) · `apps/api-server`(kpa_legal_documents +
service-legal 모듈) · `packages/security-core`(KPA 권한). 조사 기준 commit: 동적 푸터 완료 후 main.

## 3. 기존 KPA legal 구조 (사실 확인)

### 3.1 backend — `kpa_legal_documents`
- 엔티티: `apps/api-server/src/routes/kpa/entities/kpa-legal-document.entity.ts` — 필드:
  `id` / `document_type`(terms·privacy·policy) / `title` / `content` / `status`(draft·published) /
  `published_by` / `published_at` / `created_by` / `updated_by` / `created_at` / `updated_at`.
  인덱스 `(document_type, status)`. **`service_key`/`version`/`effective_date`/`change_reason`/`slug` 없음.**
- 마이그레이션: `apps/api-server/src/database/migrations/20260404000200-CreateKpaLegalDocuments.ts` —
  **seed INSERT 존재**(terms·privacy 각 1건, draft, 템플릿 텍스트).
- 컨트롤러: `routes/kpa/controllers/legal-documents.controller.ts` (별도 service 없이 `dataSource.query`).
  - **public(무인증):** `GET /api/v1/kpa/legal/documents/published/:documentType`
  - **admin/operator:** `GET /operator/legal/documents`(kpa:operator) · `GET /:id`(operator) ·
    `POST`(kpa:admin) · `PUT /:id`(admin) · `PATCH /:id/publish`(admin, 같은 type 기존 published→draft 후 게시).
  - mount: `kpa.routes.ts` → `/api/v1/kpa/...`.

### 3.2 frontend — 공개 정책 페이지 (**localStorage, mock**)
- `services/web-kpa-society/src/pages/legal/PolicyPage.tsx` — `localStorage.getItem('kpa_legal_policy')` +
  static 하드코딩 fallback(라인 69~). **kpa_legal_documents API 미호출.**
- `PrivacyPage.tsx` — `localStorage.getItem('kpa_legal_privacy')` + static fallback. 동일.
- route: `App.tsx` — `/policy`→PolicyPage, `/privacy`→PrivacyPage. **`/terms` route 없음(dead).**

### 3.3 frontend — operator 관리화면 (**DB 연동, 정상**)
- `pages/operator/LegalManagementPage.tsx` — `/api/v1/kpa/operator/legal/documents` CRUD + publish.
  본문 **textarea(markdown)**, RichText 미사용. route `/operator/legal`(RoleGuard kpa:admin).
  파일 주석: "Backend API 연동 — localStorage 의존 제거" (operator 측은 이미 DB).

### 3.4 footer
- `services/web-kpa-society/src/components/Footer.tsx` (inline style, Layout.tsx 에서 렌더 — 공개 페이지 전반).
- **하드코딩 법정정보**: 주소 `서울특별시 OO구 OO로 123 약사회관`(더미) / 전화 `02-1234-5678`(더미) /
  팩스 `02-1234-5679`(더미) / 이메일 `info@kpa-society.kr` / `㈜쓰리라이프존 | 사업자등록번호 108-86-02873`(실값).
- footer 링크: 약사회 소개(`/about`✅) · 이용 가이드(`/guide/intro`✅) · 협업 문의(`/contact`✅) ·
  **이용약관(`/terms`❌ dead)** · 개인정보처리방침(`/privacy`✅) · **사이트맵(`/sitemap`❌ dead)**.

## 4. localStorage 기반 경로 확인 결과
- 공개 `PolicyPage`/`PrivacyPage` 는 **DB가 아니라 localStorage** 를 읽는다(key `kpa_legal_policy`/`kpa_legal_privacy`).
  localStorage 는 브라우저 단말 로컬 — **운영자가 다른 기기/세션에서 입력해도 일반 공개 사용자에게 반영되지 않는다.**
  실질적으로 **mock/legacy**(static fallback 이 실제 표시 내용).

## 5. kpa_legal_documents 구조 (요약) — §3.1 참조
운영용 DB 구조는 갖췄으나(draft/published, publish 전환, public API 존재), **공개 페이지가 이 API 를 쓰지 않는다.**

## 6. 신규 `service_policy_documents` / `service_legal_profiles` 와 비교

### 6.1 저장소 비교 — 정책문서
| 항목 | localStorage | kpa_legal_documents | service_policy_documents |
|------|:---:|:---:|:---:|
| 운영 적합성 | ❌ (단말 로컬, mock) | △ (DB·operator UI 있으나 공개 미연결) | ✅ (4서비스 공통, 공개 연결됨) |
| draft/published | ❌ | ✅ | ✅ |
| version 관리 | ❌ | ❌ | ✅ |
| effectiveDate | ❌ | ❌ | ✅ |
| change_reason(audit) | ❌ | ❌ | ✅ |
| public API | ❌ (없음) | ✅ `/kpa/legal/documents/published/:type` (미사용) | ✅ `/public/services/:sk/policies/:type` (GP/KCos 사용 중) |
| admin UI | operator/legal(DB) | operator/legal(textarea) | 공통 service-legal Admin UI(3탭) |
| serviceKey 지원 | ❌ | ❌ (KPA 전용) | ✅ |
| 공개 viewer | static fallback | 없음(연결 안 됨) | `PolicyDocumentViewer`(GP/KCos `/terms`·/privacy) |
| seed/기존 데이터 | (localStorage 단말별) | **seed terms/privacy draft 존재** | 없음(additive) |

### 6.2 저장소 비교 — 법정정보(footer)
| 항목 | KPA 현재(footer 하드코딩) | service_legal_profiles |
|------|:---:|:---:|
| 저장 위치 | 코드 하드코딩(더미+실값 혼재) | DB(serviceKey 'kpa-society'), Admin 입력 |
| 동적 표시 | ❌ | ✅ `PublicLegalFooterInfo`(GP/KCos/Neture 사용) |
| 값 없을 때 | 더미 노출 | 비표시(placeholder 0) |
| serviceKey | — | ✅ |

### 6.3 route 비교
| route | 현재 상태 | 데이터 소스 | 문제 | 권고 |
|-------|-----------|-------------|------|------|
| `/terms` | **미정의(dead)** — footer 가 링크 | — | footer dead link | route 신설 또는 footer 링크 `/policy` 로 정정 |
| `/privacy` | 정의됨 → PrivacyPage | localStorage(mock) | 공개 미반영 | 공개 데이터 소스를 DB/public API 로 전환 |
| `/policy` | 정의됨 → PolicyPage(=이용약관) | localStorage(mock) | "약관"인데 경로명이 policy | 명칭/경로 정리 + 데이터 소스 전환 |
| `/operator/legal` | 정의됨(admin) → LegalManagementPage | kpa_legal_documents(DB) | 공개와 단절 | 공개 연결 또는 공통 Admin 으로 수렴 |
| `/sitemap` | **미정의(dead)** — footer 가 링크 | — | footer dead link | footer 링크 제거 또는 sitemap 신설(범위 외) |

## 7. KPA public route 상태 (정리)
- 공개 노출 정책 페이지 = `/policy`(이용약관)·`/privacy` 두 개, **둘 다 localStorage mock**.
- `/terms`·`/sitemap` 은 footer 가 링크하나 route 부재 → **dead link 2건**.
- operator 가 `kpa_legal_documents` 에 입력·게시해도 공개 페이지에 **반영 경로 없음**(public API 미사용).

## 8. KPA footer 상태 (정리)
- 하드코딩 법정정보: **더미 3건**(주소/전화/팩스) + **실값 2건**(이메일·사업자번호/상호) 혼재.
- GP/KCos/Neture 는 이미 `PublicLegalFooterInfo`(동적, 값 있을 때만) 전환 완료 — KPA 만 정적.
- KPA 는 `@o4o/shared-space-ui` 를 이미 일부 import(App.tsx `templates,usePageSeo`; CommunityHomePage) →
  `PublicLegalFooterInfo`/`PolicyDocumentViewer` **import 기술적 가능**.

## 9. KPA 권한 정책 고려사항
- `KPA_SCOPE_CONFIG.platformBypass = false` — platform:super_admin 도 KPA 격리(우회 불가).
- 신규 `requireServiceLegalScope` 는 `serviceKey`('kpa-society') → KPA_SCOPE_CONFIG 매핑 → `kpa:admin`/`kpa:operator`
  요구 + platformBypass=false 그대로 준수. 즉 **신규 공통 Admin service-legal API(`/admin/services/kpa-society/*`)를
  KPA 에 써도 권한 정책 우회 없음**(kpa:admin 만 write). 통합의 권한 장벽은 없음.
- public API(`/public/services/kpa-society/*`)는 무인증이라 권한 무관.

## 10. 통합 옵션 비교

### 옵션 A — KPA 기존 구조 유지
- `kpa_legal_documents` + `/operator/legal` 유지, 공개 페이지를 **kpa_legal_documents public API 로 연결**(localStorage 제거).
- 장점: 최소 변경, KPA operator workflow 무중단, seed 데이터 활용. 단점: cross-service 표준과 영구 분기,
  version/effectiveDate/공통 Admin UI/공통 viewer 미활용, KPA 만 별도 유지보수.
- 리스크: 낮음. 단 "법정정보는 serviceKey 기반으로 수렴" 방향(§권고 기준 6)과 어긋남.

### 옵션 B — 신규 cross-service 구조로 전환
- KPA 도 `service_legal_profiles`(footer) + `service_policy_documents`(정책) + 공통 Admin UI + 공통 viewer 사용.
  기존 `kpa_legal_documents` 는 데이터 이관 후 archive, `/operator/legal` 은 폐기/redirect, localStorage 제거.
- 장점: 4서비스 완전 일원화, 단절·dead link·mock·더미 일괄 해소, 공통 Admin/viewer 재사용(유지보수 1곳).
  단점: 변경 폭 큼(데이터 이관 + 공개 페이지 교체 + operator 화면 폐기), KPA operator 가 익숙한 화면 변경.
- 리스크: 중. 데이터 이관 시 published 상태/내용 보존 필요. operator workflow 재안내 필요.

### 옵션 C — 단계적 이행 (권장 베이스)
1. **footer**: `service_legal_profiles` 동적(`PublicLegalFooterInfo`)으로 전환 + 더미 제거 + dead link(`/terms`·`/sitemap`) 정정.
2. **공개 정책 페이지**: localStorage → 공통 `PolicyDocumentViewer` + `service_policy_documents` public API 로 전환
   (kpa_legal_documents 내용 이관). `/policy`·`/privacy`·`/terms` 경로 정리.
3. **admin 수렴**: `/operator/legal`(kpa_legal_documents) → 공통 Admin service-legal UI(`/admin/services/kpa-society`)
   로 수렴, kpa_legal_documents archive.
- 장점: 각 단계 독립 배포·검증, 위험 분산, 공개 단절·더미 우선 해소(사용자 체감 즉효). 단점: 다단계.
- 리스크: 낮음~중(단계별).

## 11. 권고안

**옵션 C(단계적) 채택 — 최종 지향점은 옵션 B(서비스 표준 일원화).**

근거(권고 기준 §7 대조):
1. 중복 입력 경로 금지 → 최종적으로 `service_policy_documents` 단일화(operator/legal·localStorage 제거)로 해소.
2. 공개 dead link 금지 → Phase 1 에서 `/terms`·`/sitemap` 정정.
3. 기존 KPA 운영 갑작스런 파괴 금지 → 단계적, operator 화면은 Phase 3 까지 유지.
4. cross-service 표준 정합 → 최종 B 로 수렴.
5. platformBypass:false 우회 금지 → 신규 API 가 KPA config 그대로 적용(§9), 우회 없음.
6. 법정정보 serviceKey 기반 우선 → Phase 1 에서 footer 를 `service_legal_profiles` 로.
7. 정책문서 이행 전략 → Phase 2 에서 데이터 존재(seed terms/privacy + 운영 입력분) 실측 후 이관.
8. mock/placeholder 공개 잔존 금지 → localStorage·더미 footer 제거.

**우선순위**: Phase 1(footer + dead link, 저위험·즉효) → Phase 2(공개 페이지 DB 연결, 단절 해소) → Phase 3(admin 수렴·archive).

## 12. 후속 WO 제안
1. **`WO-O4O-KPA-SERVICE-LEGAL-PROFILE-FOOTER-V1`** (Phase 1, 저위험)
   - KPA footer 를 `PublicLegalFooterInfo`(serviceKey 'kpa-society') 동적 전환 + 더미 3건 제거 + 하드코딩 실값 제거.
   - footer dead link 정정: `/terms` → 정책 route 정비 후 연결 또는 `/policy` 로, `/sitemap` 링크 제거(또는 sitemap 별도).
2. **`WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1`** (Phase 2)
   - 공개 `/policy`·`/privacy`(+필요시 `/terms`)를 공통 `PolicyDocumentViewer` + `service_policy_documents` public API 로 전환,
     localStorage 경로 제거. KPA 명칭(`/policy`=이용약관) 정리.
3. **`WO-O4O-KPA-LEGAL-DOCUMENTS-MIGRATION-TO-SERVICE-POLICY-V1`** (Phase 2 동반, **DB 변경 — 승인 필요**)
   - `kpa_legal_documents`(seed + 운영 입력분) → `service_policy_documents`(serviceKey 'kpa-society') 데이터 이관.
     published 상태/내용 보존. 이관 전 DB 실측(행 수·published 여부) 선행.
4. **`WO-O4O-KPA-LEGAL-ADMIN-UI-CONSOLIDATION-V1`** (Phase 3)
   - `/operator/legal`(LegalManagementPage) → 공통 Admin service-legal UI 로 수렴, kpa_legal_documents archive,
     legacy 컨트롤러/엔티티 정리(데드 surface 제거).

## 13. 위험 및 주의사항
- **단절 우선 인지**: 현재 KPA 공개 약관/개인정보는 operator 입력과 무관한 localStorage/static — Phase 2 전까지는
  "운영자가 고쳐도 공개 미반영" 상태가 지속됨(본 IR 로 명문화). 긴급 공개 수정이 필요하면 Phase 2 를 우선.
- **데이터 이관**: kpa_legal_documents → service_policy_documents 이관은 DB 변경 → 반드시 실측·승인·보존 정책 동반.
- **operator 변경**: Phase 3 에서 KPA 운영자 입력 화면이 공통 UI 로 바뀌므로 사전 안내 필요.
- **footer 실값 제거**: KPA footer 의 실 사업자번호(108-86-02873)도 코드 하드코딩이므로 Phase 1 에서 제거 →
  Admin `service_legal_profiles` 입력 전까지 공개 footer 에 사업자정보 비표시(GP/KCos/Neture 와 동일 전환 패턴).
- **dead link**: `/terms`·`/sitemap` 은 본 IR 이전부터 존재한 기존 결함(본 WO 들이 함께 정리).
- **read-only**: 본 IR 은 코드/DB/route/footer 무변경, 문서 1개만 생성.

---

## 최종 요약
- KPA legal = **3중 혼재 + 단절**: operator 입력(kpa_legal_documents DB) ↔ 공개 표시(localStorage mock) **단절**,
  신규 cross-service 구조 미적용, footer 더미+실값 하드코딩, `/terms`·`/sitemap` dead link.
- `kpa_legal_documents` 는 `service_policy_documents` 대비 serviceKey/version/effectiveDate/change_reason/공통 UI·viewer 미보유.
- 권한: 신규 service-legal API 는 KPA config(platformBypass:false) 그대로 적용 → **통합에 권한 장벽 없음**.
- **권고: 옵션 C(단계적) → 종착 옵션 B**. Phase 1(footer 동적+dead link, 저위험) → Phase 2(공개 페이지 DB 연결+이관) →
  Phase 3(admin 수렴·archive). 후속 WO 4건 제안.
- 본 IR: 수정 파일 없음, 문서 1건 생성, path-specific commit.

*Date: 2026-06-12 · read-only IR · KPA legal 통합 방향 = 단계적(C)→표준일원화(B). 구현은 후속 WO.*
