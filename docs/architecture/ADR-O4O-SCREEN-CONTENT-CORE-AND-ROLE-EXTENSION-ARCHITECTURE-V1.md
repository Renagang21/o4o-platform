# ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1

> 성격: **설계 전용 ADR**. 코드·DB·마이그레이션 변경 0.
> IR: `IR/ADR-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1`
> 조사 방식: 코드 정적 분석(4개 병렬 read-only 조사 + 기존 태블릿 IR 축적). 실측 근거는 각 항목 file:line.

---

## 결정 요약 (ADR Decision)

**확정 원칙에 필요한 구조는 거의 전부 이미 존재한다. "새 패키지·새 테이블을 만드는 작업"이 아니라 "이미 있는 경계를 명명·정리하고 2개 정책 공백만 메우는 작업"이다.**

- ✅ **GO** — Core/Extension 경계를 **기존 자산 위에** 확정: (Core) `resolveScreenSetSections` + `@o4o/tablet-kiosk-core` + 블록 스키마/정규화 pure 모듈 / (Channel Extension) tablet·screen-set-QR·general-QR / (Role Extension) store·operator·supplier.
- ⛔ **HOLD / REJECT** — **신규 `screen_content_packages` 테이블 도입 보류**. 복사 primitive(`o4o_asset_snapshots`/asset-copy-core)와 복합 모델(`store_tablet_screen_sets`/`_blocks`, 이미 `origin='operator'`·`status='operator_template'` 보유)과 **중복**. (HOLD 조건 ①)
- ⚠️ **HOLD(정책 공백 2개)** — 확정 근거를 세우기 전 구현하지 않는다:
  - **(H1) 미디어 복사 독립성**: 현재 복사는 GCS URL **참조 복사**(재호스팅 없음) → 원본 미디어 하드삭제 시 사본 이미지 깨짐. 텍스트는 독립. "원본 삭제 후 독립 렌더" 원칙을 미디어까지 보장하려면 정책 결정 필요. (HOLD 조건 ②③)
  - **(H2) Screen Set QR teardown**: QR 생성은 멱등이나 **명시적 해제 없음**(archived 시 resolve 게이트로만 차단). general QR(`is_active` soft-delete)과 생명주기 비대칭. (HOLD 조건 ④ — 분리 가능하나 teardown 정의 필요)
- ✅ **HOLD 미해당** — 공급자 정책 충돌 없음(⑤), 공통화가 KPA 공개 화면 계약 변경 안 함(⑥).

즉 **부분 GO**: Core/Extension 명명·경계 확정은 진행하되, 미디어 정책(H1)·QR teardown(H2)은 결정 후 후속 WO로 분리.

---

## 1. 현재 구조도 (as-is)

```text
[제작 — 매장 소유]
 web-kpa-society/TabletScreenSetManager (빌더 UI, KPA 카피/3단계/템플릿5)
   → PUT /store/screen-sets/:id/blocks   (full-replace, blocks=jsonb config)
   → POST /store/screen-sets/preview     (미저장 draft resolve, DB write 0)
        블록 8종: idle_media·content_list·product_list·product_content·
                  corner_description·health_info·staff_inquiry·qr_guide
   저장 → store_tablet_screen_sets(id,org,service_key,tablet_id,name,origin,status,public_qr_slug)
          + store_tablet_screen_blocks(screen_set_id FK, block_type, sort_order, is_visible, config)

[적용 — 매장 실행 영역만]
 store_tablet_corner_contents(연결)  +  store_tablets.current_screen_set_id(현재 표시)
   POST /tablets/:id/current-screen-set  (status='active' 필요, 원자적 연결+current)

[해석 — 공통 resolver 1개]
 resolveScreenSetSections(org, serviceKey, storeId, tabletContext?, productMode?)
   읽음: store_tablet_screen_sets/_blocks, store_tablets, store_tablet_displays,
         store_local_products, organization_product_listings/supplier_product_offers,
         product_masters + shared_product_descriptions(STORE canonical, 서비스중립),
         ★ kpa_store_contents(= "Store Production Material" 논리, 유일 확장 seam)

[렌더 — 이미 공유 패키지]
 @o4o/tablet-kiosk-core (KPA/K-Cosmetics/GlycoPharm 공유)
   입력계약 TabletScreenResponse{mode,templateKey,sections:[{blockType,sortOrder,data}]}
   ├─ 채널 A 태블릿:  GET /:slug/tablet/screen  → resolve(tabletContext=full)
   └─ 채널 B ScreenSet QR: GET /qr/public/:slug → resolve(tabletContext=none, idle 제외)
        └ store_qr_codes(landing_type='screen_set', target=set.id) ; public_qr_slug=denorm 미러(SSOT=store_qr_codes)

[복사 primitive — 운영자/HUB → 매장 소유 독립 사본]
 asset-copy-core → o4o_asset_snapshots(content_json 값복사, source_* provenance, FK 없음, 비멱등)
 HUB(테이블 없음, 7개 도메인 집계) → 도메인별 copy 엔드포인트 → 매장 소유 row + provenance
 kpa_store_contents(source_type: direct | snapshot_edit) / store_asset_derivations(provenance 원장)

[일반 QR — 같은 테이블, landing_type 다형]
 store_qr_codes(slug 전역 unique) landing_type ∈ product|promotion|page|link|video|screen_set
   scan 통계 store_qr_scan_events ; 공개 /qr/public/:slug (무인증)
```

## 2. 목표 구조도 (to-be) — 명명만 정리, 배치는 유지

```text
                ┌──────────────── SCREEN CONTENT CORE (서비스 중립) ─────────────────┐
                │ (a) 블록 스키마·상수  SET_BLOCK_TYPES/STATUS/TEMPLATE_KEYS           │
                │ (b) 블록 pure 정규화·검증  parseIdleMediaConfig/resolveIdleMediaItems │
                │      parseContentListConfig / shapeStaticBlock / resolveTemplateKey    │
                │ (c) resolver 오케스트레이션  resolveScreenSetSections(블록 loop+safe) │
                │ (d) 렌더 계약  @o4o/tablet-kiosk-core (TabletScreenResponse)           │
                │ (e) 프론트 pure 헬퍼  defaultConfig/normalizeBlocks/seedInitialBlocks  │
                └───────────────────────────────┬───────────────────────────────────────┘
   ROLE EXTENSION                               │                       CHANNEL EXTENSION
   ├ Store Ext.  store_tablet_* 소유·제작·적용   │   ├ Tablet Ext.   tabletContext=full, /tablet/screen
   ├ Operator Ext. origin='operator'/           │   ├ ScreenSet-QR Ext. tabletContext=none, /qr/public/:slug
   │   status='operator_template' → 매장 copy    │   │      (Screen Set 공유, 복사 아님)
   └ Supplier Ext. 콘텐츠 직접 없음(원천→운영자) │   └ General-QR Ext. landing_type≠screen_set (별 domain)
        복사 seam = asset-copy-core / o4o_asset_snapshots (독립 사본 + provenance)
        데이터 seam = kpa_store_contents(→ StoreProductionMaterial repo 주입)
```

## 3. Core 범위 (확정)

| Core 후보 | 위치 | 판정 | 근거 |
|-----------|------|------|------|
| 블록 스키마/상수 | store-tablet.routes.ts:1173-1190 | **Core** (상수 추출) | 서비스 무관 whitelist |
| idle_media 파서/resolve | store-tablet-idle-block.ts:50-129 | **Core** (이미 pure/DI) | DB 접근 없음 |
| content_list 파서 | store-tablet-content-list-block.ts:70-121 | **Core** (pure) | "DB access none" |
| shapeStaticBlock/resolveTemplateKey | store-public-tablet-screen.ts:38-51 | **Core** (pure) | 정적 매핑 |
| resolver 오케스트레이션 | store-public-screen-set-resolve.ts:115-225 | **Core (seam 주입형)** | 시그니처 서비스중립, store_content만 확장 seam |
| kiosk-core 렌더 계약 | packages/tablet-kiosk-core | **이미 Core** (3서비스 공유) | 작업 불필요 |
| 프론트 pure 헬퍼 | TabletScreenSetManager defaultConfig/normalizeBlocks/normalizeCornerBody/seedInitialBlocks | **Core (추출 가능)** | 순수 함수 |
| 복사 primitive | asset-copy-core / o4o_asset_snapshots | **이미 Core (FROZEN)** | 서비스중립 copy engine |
| 미리보기 계약 | POST /screen-sets/preview | **Core (동일 resolver 재사용)** | 런타임 helper 공유 |
| **복사 가능한 "Screen Content Package" 계약** | — | **정의만, 신규 테이블 없음** | §데이터모델 참조. 복합=store_tablet_screen_sets, 원자=asset_snapshots |

> Core = "블록 스키마 + pure 정규화 + resolver 오케스트레이션 + 렌더 계약". **Screen Set draft 타입·headless builder state**는 프론트 pure 헬퍼로 추출 가능하나 **선택(P3)** — 현재 KPA 단일 소비라 추출 이득이 낮다.

## 4. Role/Channel Extension 책임표

### 4.1 Role Extension

| 역할 | 권한(제작/적용) | API 소유 | UI | 데이터 소유권 |
|------|----------------|----------|-----|---------------|
| **Store** | Screen Set 제작·수정·보관·**코너 적용** | `/store/screen-sets*`, `/tablets/:id/current-screen-set` (withStoreAuth→requirePharmacyOwner) | KPA 빌더(TabletScreenSetManager) | `store_tablet_screen_sets/_blocks/_corner_contents`, `kpa_store_contents`(direct/snapshot_edit) — 매장 org 소유 |
| **Operator** | 템플릿·원천 콘텐츠 제작 → HUB 게시. **매장 태블릿 직접 적용 없음** | HUB 게시(Workspace C), `operator_qr_templates`, `origin='operator'`/`status='operator_template'` set | 운영자 콘텐츠 게시 표준(RichTextEditor) | 운영자 원본(kpa_contents/store_blog_posts 등) — **매장이 copy 시 매장 소유 사본 생성** |
| **Supplier** | **O4O 내부 콘텐츠 직접 제작 없음** — 원천 자료를 운영자에게 전달만 | 없음(태블릿/스크린셋 write-path 부재) | 없음 | 상품 listing(`organization_product_listings`→`supplier_product_offers`) read-only 유입만 |

> 근거: PHILOSOPHY §3.1, 3-ROLE §2/§6. 코드상 태블릿 write 전면이 `requirePharmacyOwner(org)` 게이트 — 공급자/운영자 직접 write-path **부재**. (D 조사)

### 4.2 Channel Extension

| 채널 | Screen Set 관계 | resolve 파라미터 | 엔드포인트/뷰어 | 데이터 소유 |
|------|----------------|-----------------|-----------------|-------------|
| **Tablet** | 공유(동일 set) | `tabletContext={tabletId,configured}`, productMode=full, idle 포함 | `GET /:slug/tablet/screen` → kiosk-core | store_tablet_* |
| **ScreenSet-QR** | **공유(복사 아님)** | tabletContext 없음, productMode=org, idle 제외 | `GET /qr/public/:slug` → PublicScreenSetViewer | 콘텐츠 = tablet 도메인 소유, QR record = store_qr_codes |
| **General-QR** | 무관(별 domain) | — | 같은 `/qr/public/:slug` 다형 dispatch(landing_type≠screen_set) | store_qr_codes(landing product/page/link/video) |

> 확정 원칙 "타블렛+Screen Set QR은 하나의 Screen Set 공유" = **이미 사실**(동일 `resolveScreenSetSections`·동일 `store_tablet_screen_sets`, 채널차=tabletContext뿐). "일반 QR 별도 도메인" = **같은 store_qr_codes 테이블의 다른 landing_type**로 이미 분리(레코드 Core 공유 + landing 해석 pluggable).

## 5. 데이터 소유권 및 복사 규칙표

| 항목 | 값 | 근거 |
|------|-----|------|
| 복사되는 값 | 콘텐츠 본문/구조 = `content_json` **전체 값복사**(import 시점 materialize) | asset-copy.service.ts:124-134; b2c import controller.ts:584-606 |
| 공통 SSOT 참조 값 | STORE canonical 상세설명서(`shared_product_descriptions`, F12) = 참조(복사 아님) / QR slug SSOT=`store_qr_codes` | 조사 D/C |
| 이미지·미디어 복사 방식 | **GCS URL 참조 복사(재호스팅 없음)** — 원본 master 하드삭제 시에만 깨짐 | kpa-asset.resolver.ts:190-194; controller.ts:439-442 **← H1 공백** |
| provenance | `source_service`+`source_asset_id`(FK 없음), `source_metadata.sourceRefId`, `store_asset_derivations` 원장(best-effort) | entity.ts:9-29; store-asset-derivation.service.ts |
| 멱등성 | **비멱등** — unique 제약 제거됨(20260920000000), 재가져오기마다 **새 독립 사본** | migration + reimport-source endpoint |
| 동일 원본 재가져오기 | `create_copy` 모드 — 기존 사본 보존, 새 사본 생성(덮어쓰기 없음) | store-content.controller.ts:642-793 |
| 원본 수정·삭제 후 사본 생존 | **텍스트/구조 무조건 독립 렌더**(FK/cascade/sync 전무). **미디어만 조건부**(GCS 객체가 원본 row보다 오래 살아야) | entity.ts:9-13 **← H1** |
| 자동 동기화·전파·연쇄삭제 | **없음**(원칙 부합) | FK 부재, sync job 부재 |

## 6. 데이터/API 변경 예상안

| 영역 | 변경 예상 | 필요성 |
|------|----------|--------|
| 신규 테이블 | **없음(REJECT `screen_content_packages`)** | HUB/asset-snapshot/screen-sets 중복 (HOLD①) |
| store_tablet_screen_sets | (조건부) operator 저작을 정식 지원하려면 `origin='operator'`·`status='operator_template'` **소비 경로** 명세화(스키마 이미 존재, 컬럼 추가 불필요) | 운영자 템플릿→매장 copy 흐름 명시 시 |
| asset-copy-core | FROZEN — 변경 없음. (H1 결정 시) 미디어 재호스팅 옵션은 resolver 계층에서 처리(Core 무변경) | H1 정책 결정 후 |
| store_qr_codes | (H2 결정 시) Screen Set QR **teardown**(archive 시 QR is_active=false 또는 tombstone) 추가 | H2 정책 결정 후 |
| resolver | store_content source를 **repository seam**으로 파라미터화(kpa_store_contents 하드코딩 제거) — 계약 무변경 | 다서비스 확장 시 |
| 공개 태블릿/QR 계약 | **변경 없음**(TabletScreenResponse 그대로) | 회귀 0 보장 |

## 7. 유지·추출·폐기 대상

- **유지(그대로)**: `@o4o/tablet-kiosk-core`, `resolveScreenSetSections`, `store_tablet_screen_sets/_blocks/_corner_contents`, `store_qr_codes`+landing dispatch, `asset-copy-core`/`o4o_asset_snapshots`, HUB 쿼리 레이어, `store_asset_derivations`.
- **추출 후보(선택·저위험, 서비스중립화)**: 블록 스키마 상수 + pure 정규화(`parseIdleMediaConfig`/`parseContentListConfig`/`shapeStaticBlock`) + 프론트 pure 헬퍼 → `@o4o/screen-content-core`(headless). **KPA 공개 계약 무변경으로 가능**.
- **추출 seam(확장 주입)**: `kpa_store_contents` 접근 → StoreProductionMaterial repository 인터페이스; 관리 라우트 하드코딩 상수(`TABLET_QR_SERVICE_KEY='kpa'`, `KPA_FORCED_SERVICE_KEY='kpa-society'`).
- **폐기 후보**: asset-copy factory의 죽은 `DUPLICATE_SNAPSHOT` 409 경로(unique 제거로 dead). **폐기 신규 테이블 후보 = `screen_content_packages`(도입 자체 반려)**.

## 8. 단계별 후속 WO (권고 순서)

1. **WO-P0 (문서)**: 본 ADR 확정 + Core/Extension 경계 baseline 등재. (코드 0)
2. **WO-P1 (결정, HOLD 해소)**: **미디어 복사 독립성 정책(H1)** — (a) 참조유지+GCS 보존 보장, (b) copy 시 재호스팅, (c) 하이브리드 중 택1. + **Screen Set QR teardown 정책(H2)**.
3. **WO-P2 (저위험 추출)**: 블록 스키마 상수 + pure 정규화 모듈을 `@o4o/screen-content-core` headless 패키지로 이동(공개 계약 무변경, 3서비스 회귀 검증).
4. **WO-P3 (seam)**: resolver `store_content` source repository 파라미터화 → 다서비스 소비 가능화. (KPA 회귀 검증)
5. **WO-P4 (운영자 저작, 원할 때)**: `origin='operator'`·`status='operator_template'` 소비 경로 명세 + 매장 copy 흐름(asset-copy 재사용)으로 운영자 템플릿→매장 Screen Set. **신규 테이블 없이**.
6. **WO-P5 (채널)**: General-QR/ScreenSet-QR 공유 "QR record Core"(slug/stats/dispatch) 명명 + landing 해석 pluggable 정리 + H2 teardown 구현.

## 9. 회귀 위험 · 중지(HOLD) 조건 · 미결정

| HOLD 조건 | 판정 | 조치 |
|-----------|------|------|
| ① HUB와 신규 Screen Content Package 책임 중복 | **HOLD 발동** | 신규 테이블 반려. 복사=asset-snapshot, 복합=screen_sets 재사용 |
| ② 매장 사본 원본 삭제 후 독립 렌더 불가 | **부분 HOLD(미디어)** | 텍스트 OK / 미디어 정책 H1 결정 전 미구현 |
| ③ 미디어 복사·참조 정책 근거 없음 | **HOLD(정책 공백)** | 현행=참조복사(문서화됨)이나 완전독립 미보장 → H1 결정 필요 |
| ④ 일반 QR/ScreenSet QR 생명주기 분리 불가 | **HOLD 미발동(경고)** | 분리 가능하나 teardown 비대칭 → H2 정의 |
| ⑤ 공급자 정책 충돌 | **HOLD 미발동** | 충돌 없음(D 조사) |
| ⑥ 공통화가 KPA 공개 화면 계약 변경 | **HOLD 미발동** | 추출은 공개 계약 무변경으로 가능(D) |

**회귀 위험**: (1) resolver seam 파라미터화 시 KPA content_list 회귀 — 브라우저 스모크 필수. (2) 블록 상수 추출 시 3서비스(kiosk-core 소비) 회귀. (3) H2 teardown 구현 시 기존 활성 Screen Set QR 접근 영향 — 반드시 archived-only 대상.

**미결정(요결정)**: H1(미디어 독립성), H2(QR teardown). 이 둘 확정 전 P2~P5 구현 착수 금지.

## 10. 코드·DB 변경 0 확인

- 본 ADR 작성 중 **소스 코드·마이그레이션·DB write 0**. 조사는 전부 read-only 정적 분석(4 병렬 에이전트 + 기존 IR). 산출물 = 본 문서 1개.

---

## 완료 보고

```text
IR/ADR-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1 완료

1. 현재 구조: 제작(store_tablet_screen_sets/_blocks, full-replace)→적용(current_screen_set_id+corner_contents, store-only)
   →해석(resolveScreenSetSections 공통 1개)→렌더(@o4o/tablet-kiosk-core 3서비스 공유). tablet+ScreenSetQR 동일 set/resolver 공유.
2. 확정 아키텍처: 새 패키지·새 테이블 신설 아님. 기존 자산에 Core/Extension 경계 명명. 부분 GO.
3. Core 범위: 블록 스키마+pure 정규화+resolver 오케스트레이션+kiosk-core 렌더 계약(+프론트 pure 헬퍼 선택추출).
4. Role/Channel Extension: Role(store 제작·적용 / operator 템플릿→매장copy / supplier 직접없음) · Channel(tablet / ScreenSetQR 공유 / generalQR 별 landing_type).
5. 소유권·복사: 값복사+provenance(FK 없음)+비멱등+미디어 참조복사. 자동동기화·연쇄삭제 없음. 텍스트 독립, 미디어만 조건부(H1).
6. 데이터/API 변경: 신규 테이블 REJECT. resolver store_content seam화, (H1)미디어정책, (H2)QR teardown만 후속.
7. 유지·추출·폐기: 유지=kiosk-core/resolver/screen_sets/qr_codes/asset-copy/HUB. 추출=블록상수·pure정규화(→screen-content-core, 선택). 폐기=screen_content_packages(반려)+dead DUPLICATE_SNAPSHOT 경로.
8. 후속 WO: P0 baseline→P1 HOLD결정(H1/H2)→P2 pure추출→P3 seam→P4 운영자저작(무신규테이블)→P5 QR core.
9. HOLD/미결정: ①신규테이블 반려(발동) ②③미디어독립성(부분/정책공백) ④QR teardown 정의 / ⑤공급자·⑥공개계약 미발동. H1·H2 확정 전 구현 착수 금지.
10. 코드·DB 변경 0 확인: ✅ (read-only 조사, 산출물=문서 1개)
```
