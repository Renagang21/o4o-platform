# CHECK-O4O-ADMIN-PRODUCT-MANAGEMENT-SCOPE-LOCK-AND-GAP-AUDIT-V1

Status: DONE — read-only 전수 조사 + scope lock + gap audit (2026-07-07). **코드 변경 0(문서만)**
WO: `WO-O4O-ADMIN-PRODUCT-MANAGEMENT-SCOPE-LOCK-AND-GAP-AUDIT-V1`

Scope: admin.neture.co.kr 의 **O4O 상품관리 환경 구축**으로 이 작업공간 범위를 고정하고, 현재 화면·API·mutation·placeholder·gap 을 정리한다. 분류별(의약품/의료기기/의약외품/건기식) 데이터 생성·설명서 제작·대량 승격은 **이 공간의 작업이 아니다**. DB write 0, 신규 기능 0.

---

## 1. Scope Lock 선언

> **이 작업공간 = admin.neture.co.kr O4O 상품관리 환경 구축 전용.**

| 구분 | 내용 |
| --- | --- |
| **포함** | admin O4O 상품관리 메뉴/탭 정리 · read-only 관리/검수 화면 · 상세 화면 구조화 · 상태/수치/연결 현황 표시 · 운영자 작업 환경 설계 · 향후 write action 의 **설계 문서화** |
| **제외** | 의약품·의료기기·의약외품·건기식 설명서 제작 · ProductMaster 대량 생성/승격 · ProductCandidate 대량 상태변경 · SharedProductDescription 대량 insert/update · canonical 대량 반영 · 이미지 실제 업로드/교체/삭제 · QR/태블릿 콘텐츠 제작 · 매장 상품 실제 등록 기능 구현 |

분류별 설명서·데이터 파이프라인(예: OTC 66 draft 적재, e약은요 파생, 승격 apply)은 **각 분류 트랙 WO**에서 수행하며, 본 공간은 그 산출물을 **admin 에서 보고/검수/설계**하는 데 한정한다.

> 참고: 최근 OTC 설명 draft 적재(draft 66 apply)·admin 검수 shell·승격 설계는 분류(의약품) 트랙과 admin 트랙이 함께 진행됐다. 본 WO 이후 두 트랙을 분리한다 — admin 공간은 **화면·연결·설계**, 분류 공간은 **데이터·설명서**.

---

## 2. 조사 방법

- repo 최신(`git pull`, up to date) 기준 정적 조사.
- admin-dashboard: sidebar 메뉴(`admin-menu.static.tsx`), route(`o4o-product-db.routes.tsx`), 페이지, API client(`o4o-product-db.api.ts`).
- api-server: 컨트롤러 mutation 라우트(`product-library` / `product-candidate` / `shared-product-description` / `product-candidate-description-draft`).
- **코드 변경/DB write 없음.**

---

## 3. admin O4O 상품관리 화면 목록 (화면별 표)

| 화면명 | 경로 | 목적 | 상태 | API | write |
| --- | --- | --- | --- | --- | --- |
| 현황 | `/admin/o4o-product-db/overview` | 후보/기본상품 총량·상태·매칭·source 집계 대시보드 | ✅ 완료 | GET `/operator/product-candidates`(total) + GET `/neture/products/library/search`(total) | **GET only** |
| 공공데이터 후보 | `/candidates` | ProductCandidate 목록/필터(status·match·source·검색) | ✅ 완료 | GET `/operator/product-candidates` | GET only |
| 후보 상세 | `/candidates/:id` | 후보 단건 상세(raw payload 등) | ✅ 완료 | GET `/operator/product-candidates/:id` | GET only |
| 기본 상품 | `/masters` | ProductMaster 목록/검색 | ✅ 완료 | GET `/neture/products/library/search` | GET only |
| 기본 상품 상세 | `/masters/:id` | master 상세 + enrichment(identifiers·descriptions·sourceLinks·usageSummary·images·canonical) | ✅ 완료 | GET `/neture/products/library/:id` | GET only |
| 설명 검토 | `/review` | SharedProductDescription 횡단 검토 목록 | ✅ 완료 | GET `/admin/shared-product-descriptions` | GET only |
| **설명 검토 상세** | `/review/:id` | SPD 상세 + **단건 canonical 승격 / 반려(deprecated)** | ✅ 완료 | GET + **PATCH `/admin/shared-product-descriptions/:id/canonical`** · **PATCH `.../:id/status`** | **⚠️ WRITE(단건)** |
| OTC 설명 초안 | `/drug-description-drafts`(+`/:id`) | product_candidate_description_drafts read-only 검수 | ✅ 완료 | GET `/admin/product-candidate-description-drafts` | GET only |
| 데이터 정비 | `/maintenance` | bulk 승격/삭제/병합 | 🔸 **placeholder(준비중)** | 없음 | 없음 |

> **유일한 admin O4O 상품 write 지점 = 설명 검토 상세**의 단건 canonical 승격/반려. 대량 승격·bulk 는 없다(placeholder).

---

## 4. API별 GET / write 정리

| Endpoint | admin O4O 화면 사용 | write 라우트 존재(백엔드) | 이 화면에서 write 호출 |
| --- | --- | --- | --- |
| `/operator/product-candidates` (+`/:id`) | 후보 목록/상세, 현황 | O (POST match/manual-match/reject/archive/refine/link-to-listing) — **operator 리뷰 큐 전용** | ✗ (GET만) |
| `/neture/products/library/search` (+`/:id`) | 기본상품 목록/상세, 현황 | O (POST library, POST library/select) — **상품 선택 흐름 전용** | ✗ (GET만) |
| `/admin/shared-product-descriptions` | 설명 검토 목록/상세 | O (POST by-master, POST seed, PATCH canonical, PATCH status, DELETE) | **✓ PATCH canonical·status (단건)** |
| `/admin/product-candidate-description-drafts` (+`/:id`) | OTC 설명 초안 | ✗ (GET only 컨트롤러) | ✗ |

**함의:** 백엔드는 후보 액션·SPD CRUD 등 **더 넓은 mutation 능력**을 갖지만, admin O4O 상품 DB **화면에는 설명 검토 단건 승격/반려만 연결**되어 있다. 후보 상태변경·bulk 승격은 화면 미노출(operator 큐/파이프라인 별도).

---

## 5. placeholder / 미완성

| 항목 | 현황 |
| --- | --- |
| 데이터 정비(`/maintenance`) | placeholder. 예고 WO: `WO-...-MAINTENANCE-ACTIONS-V1`, `WO-...-PRODUCT-DESCRIPTION-AUTHORING-WORKSPACE-V1` |
| OTC 설명 초안 sidebar 메뉴 | **미등록** — layout 탭에만 존재, `admin-menu.static.tsx` sidebar 에는 없음(현황/후보/기본상품/설명검토/데이터정비 5개만). 딥링크·탭으로만 진입 |
| 사용 연결(usage) | master 상세에 `organizationListingCount` + `storeLocalProductCount` 카운트만. **QR/태블릿/콘텐츠 참조·매장 취급/주문가능 연결은 미표시** |
| 설명 상태 통합 뷰 | 없음. SPD(설명 검토)와 draft(OTC 초안)가 **다른 탭**. master 1건의 canonical/needs_review/draft/none 을 한 화면에서 통합 조회 불가 |
| 이미지 품질 | master 상세에 images 나열만. 있음/없음·대표 지정·품질 감사 화면 없음 |
| master 상세 action | read-only enrichment만. 수정/메모/작업이력/action 없음 |

---

## 6. 사용자 운영 관점 막히는 지점

1. **설명 상태가 두 곳에 분산** — 한 master 의 설명 상태를 보려면 "설명 검토"(SPD canonical/needs_review)와 "OTC 설명 초안"(draft) 두 탭을 오가야 한다. 통합 뷰 부재.
2. **개념 축 혼동** — "설명 검토"는 **master 단위**(SPD), "OTC 설명 초안"은 **성분·함량·제형 그룹 단위**(draft, candidate 앵커). 축이 달라 초보 운영자가 대응 관계를 파악하기 어렵다.
3. **활용 연결 불투명** — 기본상품이 실제 매장/QR/태블릿에서 어떻게 쓰이는지 count 2종 외 상세를 admin 에서 볼 수 없다(§5).
4. **정비 액션 부재** — 잘못된 후보·중복 master·설명 정리를 admin 에서 실행할 수 없다(maintenance placeholder). 현재는 조사·검수까지만.
5. **초안 진입 동선** — OTC 설명 초안이 sidebar 에 없어 탭으로만 접근(발견성 낮음).

---

## 7. 남은 작업 우선순위 (조사 반영)

| 우선 | WO(제안) | 근거 |
| --: | --- | --- |
| **1** | `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1` | §6-1·6-2 최다 혼동 해소. master 기준 canonical/needs_review/draft/none 통합 read-only 뷰. draft↔SPD 대응(그룹→master) 시각화 |
| 2 | `WO-O4O-ADMIN-O4O-PRODUCT-USAGE-LINKS-READONLY-V1` | §5·6-3. usageSummary 확장(org listing/store local + QR/태블릿/콘텐츠/취급·주문가능 연결) read-only |
| 3 | `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1` | §5. 이미지 있음/없음·대표·품질 감사 뷰 |
| 4 | `WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-ACTION-DESIGN-V1` | §5·6-4. 향후 수정/메모/작업이력/action **설계 문서**(write는 별도 승인) |
| 보조 | sidebar 에 'OTC 설명 초안' 등록(소규모, §5·6-5) | 발견성. 단독 WO 불요, 위 작업에 포함 가능 |

> 우선순위 원칙: **통합 조회(1) → 연결 가시화(2) → 이미지(3) → action 설계(4)**. 전부 read-only/설계 우선, write action 은 설계 확정 후 별도 승인.

---

## 8. 분류 트랙 vs admin 트랙 분리 (확정)

| 트랙 | 담당 | 예시 |
| --- | --- | --- |
| **분류 데이터 트랙** (이 공간 아님) | 각 분류 WO | 의약품 설명서 제작, e약은요 파생, ProductMaster 승격, SharedProductDescription 대량 반영, 이미지 GCS 사본 |
| **admin 환경 트랙** (이 공간) | 본 공간 | 상품관리 메뉴/화면, 검수 shell, 상세 구조화, 상태/연결 현황, write action 설계 |

경계 규칙: admin 공간은 설명서를 **보고/검수/설계**만 한다. 설명서를 **직접 대량 생성·canonical 대량 반영·파이프라인 실행**하지 않는다(그것은 분류 트랙).

---

## 9. 검증 (write 0 확인)

| 항목 | 결과 |
| --- | --- |
| DB write / migration | **0** |
| 코드 신규/변경 | **0** (문서만) |
| admin route/menu 변경 | 0 |
| 조사 근거 | admin-menu.static / o4o-product-db.routes / o4o-product-db.api / 4개 컨트롤러 mutation 라우트 |
| git diff --check | 통과 |
| 산출물 | 본 CHECK 1건 |

---

## 10. 다음 WO 추천

**1순위: `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1`** — master 기준으로 canonical(공식)/needs_review/OTC draft/설명 없음 을 한 화면에서 통합 조회하는 read-only 뷰. 현재 "설명 검토"(SPD)와 "OTC 설명 초안"(draft) 이원화로 인한 운영 혼동(§6-1·6-2)을 해소한다. 이후 §7 의 2→3→4 순.
