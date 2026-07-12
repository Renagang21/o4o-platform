# CHECK-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1

> 성격: **완료보고(read-only 조사)** · 작성일 2026-07-12
> 대응 WO: `docs/work-orders/WO-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md`
> 조사보고서(상세·근거): `docs/investigations/IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md`
> 기준 정책(SSOT): `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md`

---

## 0. 결과 한 줄

정책 대비 현재 구현을 read-only 감사한 결과, **저장 계층·QR 구분·일반식품 보존은 정책과 일치**하나 **"로그인 전용 열람"(E/F)이 완전 미구현(의도적 공개)**이 최대 격차이며, **공급자 제작원 자동 표시(C)는 스키마 변경 없이 최소 API 확장으로 가능**하다. 코드/DB 무변경.

## 1. 무변경 선언

```
DB write        = 0
코드 변경        = 0
migration       = 0
deploy          = 0
운영 데이터 수정  = 0
QR 재발급        = 0
공급자 조직정보 변경 = 0
신규 연락처 입력 UI = 0
IR·CHECK 역사 문서 소급 수정 = 0
```

산출물 2건(신규 생성)만 추가: 본 CHECK + 대응 IR. 기존 일반식품 설명서·샘플·QR·연결 **무변경**.

> 참고: 작업 시작 시 `git pull origin main`(6df125997→c8c9038cb, fast-forward, 520 commits) 수행. 저장소에 **본 WO와 무관한** 로컬 미커밋 파일 1건(`docs/checks/CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md`, 사용자의 다른 머신 §12 로그)이 있었고 upstream이 같은 파일을 수정하여 pull 시 충돌했다. 사용자 편집은 `git stash`(stash@{0}, `WO-audit-preserve-local-runbook-edit`)에 **온전히 보존**되어 있으며, 본 WO 산출물은 이 파일을 건드리지 않는다. 이 충돌 해소는 사용자 결정 사항으로 남겨둔다.

---

## 2. 조사한 코드·문서·테이블·API 경로

### 2.1 테이블 / 엔티티
| 테이블 | 엔티티 파일 |
|---|---|
| `shared_product_descriptions`(SPD) | `apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts` |
| `product_masters` / `product_identifiers` | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` / `ProductIdentifier.entity.ts` |
| `product_categories` | seed `apps/api-server/src/database/migrations/20260323700000-SeedProductCategories.ts` |
| `product_landings` | migration `20261225000000-CreateProductLandings.ts` |
| `store_qr_codes` / `store_qr_scan_events` | `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts` |
| `store_multilingual_product_content_groups/pages` | `apps/api-server/src/routes/platform/entities/store-multilingual-product-content-group.entity.ts` / `-page.entity.ts` |
| `store_product_description_selections` | migration `20261224000000-CreateStoreProductDescriptionSelections.ts` |
| `organizations` / `organization_members` | `packages/organization-core/src/entities/Organization.ts` / `OrganizationMember.ts` |
| `neture_suppliers` / `supplier_product_offers` | `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` / `SupplierProductOffer.entity.ts` |
| `cosmetics_contents` / signage `signage_cosmetics` | `apps/api-server/src/routes/cosmetics/entities/cosmetics-content.entity.ts` / `routes/signage/extensions/cosmetics/` |
| SPD canonical 인덱스 | `20261114000000` · `20261223000000` · `20261228000000-CanonicalPerMasterTypeLanguage.ts` |

### 2.2 서비스 / 컨트롤러 / API
| 경로 | 파일 |
|---|---|
| `GET /api/v1/public/product-landings/:publicKey` (무인증) | `apps/api-server/src/modules/neture/controllers/product-landing.controller.ts:34-55` |
| landing read model (본문 반환) | `apps/api-server/src/modules/neture/services/product-landing.service.ts:142-230` |
| 동적 QR 생성(비저장) | 동 `:130-135` |
| admin 설명서 write (auth, 카테고리 가드 없음) | `apps/api-server/src/modules/neture/controllers/product-master-description.controller.ts:14-71` |
| SPD 서비스(시드/canonical/bulk) | `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` |
| 공개 QR resolver `GET /qr/public/:slug` | `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts:110-168` |
| route mount | `apps/api-server/src/bootstrap/register-routes.ts:454` |
| 공급자 org 동기화 / 배치 read | `apps/api-server/src/modules/neture/services/supplier.service.ts:1016,1172` |
| 렌더러 | `packages/content-editor/src/components/ContentRenderer.tsx` |
| 소비 페이지 / route | `services/web-neture/src/pages/ProductLandingPage.tsx` · `App.tsx:668` |
| SEO 표면 | `services/web-neture/public/sitemap.xml` · `robots.txt` · `index.html:8-13` |

### 2.3 문서
정책 SSOT 5종, HFF README/AGENT-KICKOFF/PROCESSED-LEDGER/examples, general-food README/AGENT-KICKOFF/samples, DOCUMENT-INDEX, O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1, CONTENT-AUTHORING-PRINCIPLES, drug/knowledge/CONSUMER-WRITING-PATTERNS, F12 baseline(V1+V2 amendment), 선행 IR 3종. (전체 근거 line은 IR 참조.)

---

## 3. 정책 ↔ 현재 구현 일치·불일치 표

| 항목 | 정책 | 구현 | 판정 |
|---|---|---|---|
| A 3 유형 구분 | O4O/공급자/매장 구분 | O4O·공급자 동일 SPD, `source_type`으로만; 매장 별도테이블(유입 가능) | ⚠️ 부분 |
| D 작성주체 메타 | 공통 설명서 주체 충분 | 조직 소유 컬럼 없음, `SUPPLIER_STORE` write 0 | ❌ 불충분 |
| B 공급자 등록정보 | 업체명·연락처 기존 존재 | `organizations.name` + `neture_suppliers.contact_*`(visibility) 존재 | ✅ 일치 |
| C 제작원 자동표시 | 렌더 시 자동 | 링크 존재하나 공개 read model이 org 제거, 렌더러 슬롯 없음 | ⚠️ 최소 API 확장 |
| E 로그인 전용 열람 | 로그인만 본문 | `/p/{key}` API 무인증, returnUrl 미연결 | ❌ 미구현(정반대) |
| F 공개 비노출 | 인터넷 비공개 | server-auth·noindex 어느쪽도 아님, sitemap 미포함·SPA뿐 | ❌ 노출 위험 |
| G 기본 QR vs 사업 QR | 구분 | `product_landings`(동적·master1) vs `store_qr_codes`(org·저장) 분리 | ✅ 일치 |
| H 일반식품 보존 | 삭제·변경 금지, 신규 중단 | 조회 카테고리 무관, 중단=코드영향 0, soft-delete | ✅ 일치(안전) |
| I 화장품 O4O 제작 금지 | 공급자 제작만 | canonical 생성흐름 없음(일치); generic 컨트롤러 카테고리 가드 없음 | ⚠️ 가드 gap |
| J 건기식 실행문서 | 구매우선·신뢰·ko+en | 본문 정렬됨; R1~R10 SSOT 끊김·이중게이트 누락 | ⚠️ Active 정비 |
| K 문서 충돌 | 정렬 | 대부분 정렬; general-food KICKOFF Legacy 미표기 등 | ⚠️ 소수 정비 |

---

## 4. 확인된 DB 수치

**미확정 — Cloud Console SQL Editor 대상.** 이 노트북은 Cloud SQL 5432 아웃바운드 차단(`34.64.96.252:5432` TcpTest=False, memory `o4o-laptop-cloudsql-5432-blocked`)이라 `gcloud sql connect`가 무한 대기한다. 일반식품 설명서 건수·SUPPLIER_STORE 실사용·store_contribution 유입·화장품 SPD 존재 등 실측 SELECT는 **IR §16의 read-only SQL을 Cloud Console에서 실행**하여 후속 확인한다. (DB write는 이번에도 앞으로도 0.)

---

## 5. 수정이 필요한 Active 문서 목록

> 이번 WO에서 **실제 수정한 문서: 0건**(read-only 유지, 후보만 확정). 아래는 후속 문서 정비 WO 대상. IR·CHECK·WO·PROCESSED-LEDGER data rows는 수정 금지.

| # | 문서 | 수정 성격 | 우선 |
|---|---|---|---|
| M1 | `health-functional-food/AGENT-KICKOFF.md:5,:145` | R1~R10 규칙 SSOT 재지정(general-food README에서 소실) | 높음 |
| M2 | `health-functional-food/AGENT-KICKOFF.md §6-§7` | 저장 절차 승인·이중게이트 명문화 | 높음 |
| M3 | `health-functional-food/PROCESSED-LEDGER.md:3,:10` | 정본 예제 포인터·깨진 §앵커·"zh→en" 헤더 | 중 |
| M4 | `general-food/AGENT-KICKOFF.md` | Legacy/신규중단 배너 + 새 SSOT 링크 | 중 |
| M5 | `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md:70` | 새 SSOT 링크 | 낮음 |

**M1 주의**: 단순 링크 오류가 아니라 규칙 콘텐츠 자체가 소실된 실질 gap → 자동 수정하지 않고 후속 WO(P3 HFF 문서 정비)로 분리. 이번 CHECK 시점 문서 수정 0건.

---

## 6. 후속 구현 WO 우선순위

| 우선 | WO(가칭) | 근거 |
|---|---|---|
| **P0** | `WO-O4O-PRODUCT-LANDING-VIEW-AUTH-POLICY-DECISION-V1` — F12/V2 baseline에 열람 인증 정책 결정 반영(공개→로그인 전용). **Frozen baseline이라 구현 전 필수.** | E, F12 ③/V2 충돌 |
| P1 | `WO-O4O-PRODUCT-DESCRIPTION-LOGIN-GATE-V1` — `/p/{key}` API·페이지 인증 게이트 | E(G1) |
| P1 | `WO-O4O-PRODUCT-LANDING-RETURNURL-V1` — 로그인 후 원래 URL 복귀 | E(G2) |
| P1 | `WO-O4O-PRODUCT-DESCRIPTION-PUBLIC-EXPOSURE-BLOCK-V1` — sitemap/robots/OG/noindex/cache 차단 | F(G3) |
| P2 | `WO-O4O-SUPPLIER-CREDIT-AUTO-DISPLAY-V1` — 방식 2 read model org join + `.sd-foot` 푸터 | C(G4) |
| P2 | `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` — 작성주체·소유조직 메타 + store_contribution 유입 가드 | A/D(G5,G7) |
| P3 | `WO-O4O-COSMETICS-DESCRIPTION-WRITE-GUARD-V1` — 카테고리 write 가드 | I(G6) |
| P3 | `WO-O4O-HFF-EXECUTION-DOC-REALIGN-V1` — HFF KICKOFF/LEDGER 정비 | J(M1-M3) |
| P3 | `WO-O4O-GENERAL-FOOD-LEGACY-DOC-BANNER-V1` — general-food KICKOFF Legacy 표기 | H/K(M4) |

---

## 7. 완료 기준 대조

| WO 완료 기준 | 충족 |
|---|---|
| 세 콘텐츠 유형 실제 저장·소유 구조 확인 | ✅ IR §3-4 |
| 작성주체·소유조직 구분 가능 여부 판정 | ✅ 부분(source_type만), 조직 소유 없음 — IR §4.3 |
| 공급자 제작원 자동 표시 가능성 판정 | ✅ 방식2 가능(최소 API) — IR §6 |
| 공급자 업체명·연락처 실제 등록 필드 확인 | ✅ organizations.name + neture_suppliers.contact_* — IR §5 |
| 로그인 전용 열람 현재 상태 확인 | ✅ 미구현·무인증 — IR §7 |
| 비로그인 본문 노출 여부 확인 | ✅ 노출됨(server-auth 없음) — IR §8 |
| 상품 기본 QR vs 사업용 QR 구조 확인 | ✅ 분리 확인 — IR §9 |
| 기존 일반식품 설명서 보존 상태 확인 | ✅ 보존 안전, 코드영향 0 — IR §10 |
| 화장품 직접 제작 충돌 확인 | ✅ 흐름 없음(일치)+가드 gap 1 — IR §11 |
| 건기식 실행문서 잔여 충돌 확인 | ✅ R SSOT 끊김·이중게이트 — IR §12 |
| 최소 후속 WO 제안 | ✅ IR §17 / 본 §6 |
| IR·CHECK 작성 | ✅ 본 2건 |
| commit/push | ⏳ 본 CHECK 커밋으로 완료 |

---

## 8. 미해결·이월

- DB 실건수(§4): Cloud Console SQL Editor에서 IR §16 SQL 실행 필요.
- F12/V2 baseline 열람 인증 정책 결정(P0): Frozen baseline 개정이라 별도 승인·WO 필요.
- 무관 로컬 파일 충돌(`CHECK-...DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md`): 사용자 편집 stash@{0} 보존, 해소는 사용자 결정.
