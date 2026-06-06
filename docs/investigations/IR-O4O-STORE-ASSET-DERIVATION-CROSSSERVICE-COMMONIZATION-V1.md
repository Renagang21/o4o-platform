# IR-O4O-STORE-ASSET-DERIVATION-CROSSSERVICE-COMMONIZATION-V1

> **목적**: KPA에서 완료된 Store Asset Derivation("원본 보기") 흐름을 GlycoPharm / K-Cosmetics로 확장 가능한지 조사.
> **성격**: read-only 조사 (코드/API/DB/migration 변경 없음). 결론은 실제 코드 기준.
> **작성일**: 2026-06-06
> **선행 완료**: `WO-KPA-STORE-ASSET-DERIVATION-VIEWER-QR-BLOG-EXTEND-V1` (commit `66bafbbaf`)
> **연관 규칙**: `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`, CLAUDE.md §7(Boundary Policy), §13/§13-A(공통 구조/APP 표준)

---

## 1. Summary / Verdict

**백엔드 derivation 인프라는 이미 완전히 service-neutral 하며, KPA·GlycoPharm·K-Cosmetics 3개 서비스 모두에 동일하게 마운트되어 동작 중**이다. 따라서 cross-service 확장에 **백엔드 변경은 불필요(zero change)**.

확장의 갭은 **전적으로 프론트엔드**다. 3개 서비스의 `StoreProductionMaterialsPage.tsx`는 **공통 컴포넌트가 아니라 서비스별 copy-paste**이며, KPA만 ~8개 후속 WO를 거쳐 고도화(ResultKind + 다중소스 병합 + 원본 보기 viewer + 활용하기)되었고, GlycoPharm/K-Cosmetics는 동일한 **Phase 2-D 스냅샷**(단일 소스 카드 리스트, viewer 없음)에 머물러 있다.

→ **권장: "지금 공통화"가 아니라 "백엔드 공통 위에서 프론트 parity를 서비스별로 먼저 달성"**. 3개 페이지가 parity로 수렴한 뒤(드리프트가 실제 문제가 될 때) 공통 컴포넌트 추출을 별도로 검토. ("필요한 범위만 공통화" 원칙)

---

## 2. Scope

- 대상: KPA(reference) / GlycoPharm / K-Cosmetics의 내 자료함·제작 자료(POP/QR/블로그/사이니지) 화면 + 저장소 + route + derivation 인프라.
- 제외: Neture(해당 화면 없음). 코드 수정·API·DB·migration·커밋 대상 코드 변경.
- 산출물: 본 문서 1건.

---

## 3. 백엔드 derivation 인프라 — service-neutral 평가

| 요소 | 위치 | service-neutral? |
|---|---|---|
| 테이블 `store_asset_derivations` | `migrations/20261103000000-CreateStoreAssetDerivations.ts` | ✅ `service_key`(NOT NULL) + `organization_id`(NOT NULL) + source/derived(kind,id,title) + UNIQUE(service_key,org,source_kind,source_id,derived_kind,derived_id) |
| 엔티티 | `routes/platform/entities/store-asset-derivation.entity.ts` | ✅ 서비스 리터럴 없음 |
| 서비스 `recordDerivations()` | `routes/o4o-store/services/store-asset-derivation.service.ts` | ✅ kind 화이트리스트 + 경계 검증 + `.orIgnore()`(ON CONFLICT DO NOTHING). 완전 service-agnostic |
| READ endpoint `GET /store/asset-derivations` | `routes/o4o-store/controllers/store-execution-assets.controller.ts` | ✅ 제네릭 경로(`/store/...`, `/kpa/` 아님). guard `requireAuth + requireStoreOwner(serviceKey)`. orgId는 auth context에서 파생 |
| 마운트 | `kpa.routes.ts` / `cosmetics.routes.ts` / `glycopharm.routes.ts` | ✅ **3서비스 모두** 각자 serviceKey('kpa'/'cosmetics'/'glycopharm')로 마운트 |

**Canonical kind 값** (앱 레벨 화이트리스트, DB enum 아님):
- **derivedKind**: `pop_pdf`, `qr_code`, `blog_post`, `signage_item`, `signage_playlist`(뒤 2개 예약)
- **sourceKind**: `content_snapshot`, `content_direct`, `library_resource`, `production_material`, `store_execution_asset`

**Write-path 호출처** (전부 공통 `o4o-store` 컨트롤러, 서비스별 마운트가 serviceKey 주입):
- `blog.controller.ts` → `blog_post`
- `store-pop.controller.ts` → `pop_pdf`
- `store-qr-landing.controller.ts` → `qr_code`
- 모두 best-effort(try/catch, 부모 응답 실패시키지 않음).

**`service_key` + `organization_id` 적용성**: ✅ 그대로 적용 가능. GlycoPharm/K-Cosmetics는 이미 자기 serviceKey + org로 read/write 모두 동작.

**경미한 주의(차단 아님)**:
1. READ 쿼리는 `organization_id`만 필터(스키마/UNIQUE는 service_key 포함). org가 전역 유일이라 기능상 안전하나, CLAUDE.md §7 "Domain Primary Boundary 복합 조건" 관점에선 `service_key`도 필터에 넣는 게 정합. (별도 보강 후보)
2. `store-pop`/`store-qr-landing` 컨트롤러에 `serviceKey ?? 'kpa'` 폴백 2곳 존재 — 단, 모든 마운트가 명시적 serviceKey를 넘기므로 **실행되지 않는 dead 폴백**. (정리 후보)

→ **백엔드 reuse 결론: 변경 0. 이미 3서비스 공통.**

---

## 4. 3-서비스 프론트엔드 비교

| 차원 | **KPA (reference, DONE)** | **GlycoPharm** | **K-Cosmetics** |
|---|---|---|---|
| 페이지 | `pages/pharmacy/StoreProductionMaterialsPage.tsx` (~1200줄) | `pages/store-management/StoreProductionMaterialsPage.tsx` (~255줄) | `pages/store/StoreProductionMaterialsPage.tsx` |
| Result 모델 | `ResultKind = 'material'\|'qr'\|'blog'` + `ProductionMaterialItem` | **없음** — raw `StoreExecutionAsset[]` | **없음** — raw `StoreExecutionAsset[]` |
| 데이터 소스 | **4종 병합**: directContent + executionAssets + QR + blog | **1종**: executionAssets only | **1종**: executionAssets only |
| 원본 보기 viewer | ✅ **완비** (모달 + `openDerivations` + derivedKind 매핑) | ❌ **없음** | ❌ **없음** |
| derivation API client | ✅ `api/storeAssetDerivations.ts` | ❌ 없음 | ❌ 없음 |
| 삭제/액션 | 활용하기 dropdown + 원본 보기 + 삭제 + bulk | disabled 삭제 stub만 | disabled 삭제 stub만 |
| route | `/store/.../production-materials` (App.tsx) | `library/production-materials` (App.tsx) | `library/production-materials` (App.tsx) |
| 구조 유사성 | (기준) | KPA의 과거 스냅샷(Phase 2-D) | GlycoPharm과 **거의 동일**(같은 Phase 2-D) |

**핵심**: GlycoPharm·K-Cosmetics 두 페이지는 서로 near-identical(같은 Phase 2-D 스냅샷)이고, KPA만 고도화됨. 공통 패키지 import 0 — 셋 다 자기 `api/`만 사용하는 **copy-paste**.

**저장소 매핑 (참고)**: POP/제작 결과물 = `store_execution_assets`; 직접 콘텐츠 = `kpa_store_contents`(legacy physical, service-neutral canonical = "Store Production Material"); QR = `store_qr_codes`; blog = `store_blog_posts`. 모두 o4o-store 공통, serviceKey 격리.

---

## 5. Gap 분석 (parity 도달에 필요한 것)

### GlycoPharm / K-Cosmetics 공통 (각 서비스 동일 패턴)

**백엔드**: 없음 (endpoint + write-path 이미 마운트).

**프론트 — read/viewer 측**:
1. `api/storeAssetDerivations.ts` 추가 (KPA 클라이언트 포팅; 단, 서비스별 apiClient 컨벤션 차이 — glyco/kcos는 axios `api.get('/{service}/store/asset-derivations')` + `res.data` unwrap, KPA는 fetch 기반 `/kpa` pre-scoped).
2. `ResultKind` row 모델 도입(현재 raw asset) + 다중 소스 병합(QR/블로그 행 생성).
3. 원본 보기 모달 + `openDerivations()` + derivedKind 매핑(`material→pop_pdf / qr→qr_code / blog→blog_post`).

**프론트 — write/record 측(viewer가 비지 않으려면)**:
4. 교차 생성(활용하기) production-state forwarding 배선(KPA `goCreate` + `buildProductionState`) — POP/블로그 생성 시 원본 출처를 backend가 기록하도록. 미배선 시 derivation row가 거의 생성되지 않아 viewer가 "연결된 원본 없음" 위주가 됨.

> 즉 GlycoPharm/K-Cosmetics는 **KPA가 지나온 경로를 동일하게 밟는** 프론트 확장이며, 1줄 포팅이 아니라 "단일소스 카드 → 다중소스 ResultKind 테이블 + viewer" 구조 업그레이드다.

---

## 6. Consumer Impact Matrix

`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 기준 — 현재 시점 "변경되는 공통 모듈"과 소비처.

### 6.1 공통(이미 공유 중인) 백엔드 표면
| 공통 모듈 | 소비처 | 변경 영향(본 확장) | 검증 |
|---|---|---|---|
| `o4o-store/.../store-execution-assets.controller`(read endpoint) | kpa/glycopharm/cosmetics routes | **변경 없음**(reuse) | endpoint 200 probe(서비스별) |
| `o4o-store/.../store-asset-derivation.service`(recordDerivations) | blog/pop/qr 컨트롤러(3서비스) | **변경 없음**(reuse) | write 후 read 확인 |
| 테이블 `store_asset_derivations` | 동일 | **변경 없음** | — |

### 6.2 프론트 페이지 (분기/divergent — 확장 대상)
| 소비처 | 현재 사용 | 본 확장 영향 | route/role/capability 영향 | 검증 |
|---|---|---|---|---|
| web-kpa-society | viewer 완비 | 변경 없음(기준) | 없음 | 기존 smoke PASS(66bafbbaf) |
| web-glycopharm | viewer 없음 | **추가 대상**(프론트만) | route 동일, store_owner role 동일 | 배포 후 /store 자료함 smoke |
| web-k-cosmetics | viewer 없음 | **추가 대상**(프론트만) | route 동일, store_owner role 동일 | 배포 후 /store 자료함 smoke |
| web-neture | 화면 없음 | 해당 없음 | — | — |
| admin/operator/forum/store-hub/mypage | 미사용 | 영향 없음 | — | — |

**판정**: 본 확장은 공통 모듈(백엔드)을 **건드리지 않으므로** Shared Module Change Protocol의 "공통 모듈 변경" 트리거에 해당하지 않는다(프론트 per-service 추가). 다만 향후 **프론트 공통 컴포넌트 추출**을 택하면 그 시점에 본 매트릭스를 정식 작성하고 3서비스 모두 smoke 필요.

---

## 7. 사용자-facing 용어 차이

| 요소 | KPA(약국) | GlycoPharm(매장) | K-Cosmetics(매장) |
|---|---|---|---|
| Breadcrumb root | `내 자료함` | `내 자료함` | `내 자료함` |
| H1/leaf | `매장 제작 자료` | `제작 자료` | `제작 자료` |
| 부제 | `AI로 생성하거나 편집한 POP·QR·블로그·상품 상세설명 제작 결과물을 관리합니다.` | `POP·QR·블로그·상품 상세설명 등 매장 실행 자산을 관리합니다.` | (Glyco와 동일) |
| kind 배지 | `제작 자료`/`QR-code`/`블로그` | 없음 | 없음 |
| 원본 보기 | ✅ "원본 보기"/"원본 자료"/"연결된 원본 정보가 없습니다" | ❌ | ❌ |
| 교차 생성 | `POP 만들기`/`QR-code 만들기`/`블로그 글쓰기`/`사이니지에 추가` | 없음 | 없음 |
| 위치 | `pages/pharmacy/` | `pages/store-management/` | `pages/store/` |

**노트**: 가설과 달리 3서비스 모두 breadcrumb root는 service-neutral `내 자료함`(내 "약국" 자료함 vs 내 "매장" 자료함 리터럴 분기 없음). 약국 vs 매장 구분은 간접적(KPA는 pharmacy 디렉터리, H1 `매장 제작 자료`). 가장 큰 사용자-facing 차이는 **KPA의 풍부한 어휘(원본 보기/활용하기/kind 배지)가 두 copy에 전무**하다는 점. `상점` 용어는 어디에도 미사용.

---

## 8. 후속 공통화 WO 범위 제안

백엔드가 이미 공통이므로, **2-phase**를 권장한다.

### Phase 1 (권장 — 즉시): 서비스별 프론트 parity 확장 (공통 모듈 무변경)
- `WO-O4O-GLYCOPHARM-STORE-ASSET-DERIVATION-VIEWER-EXTEND-V1`
- `WO-O4O-KCOSMETICS-STORE-ASSET-DERIVATION-VIEWER-EXTEND-V1`
- 내용: KPA WO와 동형 — derivation client 추가 + ResultKind/다중소스 + viewer 모달 + (선택) 교차생성 write 배선. 백엔드/DB/API 변경 없음. 각 서비스 1~2 프론트 파일.
- 장점: 저위험, 공통 모듈 미변경 → Shared Module Protocol 무거운 절차 불필요. 빠른 사용자 가치.
- 단점: copy-paste 3중화 지속(허용 가능한 의도적 단계).

### Phase 2 (선택 — 드리프트가 실제 문제일 때): 프론트 공통 컴포넌트 추출
- `WO-O4O-STORE-PRODUCTION-MATERIALS-COMMONIZATION-V1`(가칭)
- 내용: 3서비스 parity 수렴 후 공통 `@o4o/store-*` 컴포넌트로 추출 + 3서비스 adopt. 용어/route는 props로 주입.
- 전제: **Shared Module Change Protocol 정식 적용**(본 문서 §6 매트릭스 확장 + 3서비스 smoke 필수).
- 시점: parity 달성 전 추출은 3개 diverged 복사본을 강제 통일하는 비용이 커 비권장.

---

## 9. 변경하지 않은 것 / 금지 준수

- 코드/API/DB/migration/커밋(코드) 변경 없음 — read-only 조사.
- 다른 세션 untracked 파일(`vite.config.js/.d.ts`, 보류 IR) 미접촉.
- 본 산출물 = 문서 1건.

---

## 10. Follow-ups

1. (권장) Phase 1 서비스별 viewer extend WO 2건 — Glyco/KCos.
2. (백엔드 보강 후보, 별도) read 쿼리에 `service_key` 필터 추가(§7 경계 정합) + `?? 'kpa'` dead 폴백 정리. 기능 영향 없으나 정합성.
3. (선택) Phase 2 공통화 — parity 수렴 후 Shared Module Protocol 적용.
