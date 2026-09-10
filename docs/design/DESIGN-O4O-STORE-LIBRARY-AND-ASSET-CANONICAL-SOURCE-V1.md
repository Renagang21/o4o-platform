# DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1

- **WO**: WO-O4O-KCOS-STORE-ASSETS-AND-LIBRARY-CONTENT-CANONICAL-SCOPE-AUDIT-V1 (§14 조건부 산출물)
- **작성일**: 2026-09-10
- **성격**: 설계 확정 — 구현 0 / schema 0
- **근거**: [`IR-O4O-KCOS-STORE-ASSETS-AND-LIBRARY-CONTENT-CANONICAL-SCOPE-AUDIT-V1`](../investigations/IR-O4O-KCOS-STORE-ASSETS-AND-LIBRARY-CONTENT-CANONICAL-SCOPE-AUDIT-V1.md)
- **선행 정본**: CLAUDE.md §5 (Store Production Material) · §7 (Boundary Policy) · `O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1`

---

## 0. 왜 DESIGN 을 쓰는가

WO §14 는 "canonical source 를 명확히 확정할 수 있을 때만" DESIGN 을 쓰라고 했다.
확정할 수 있다. **KPA 와 PH 가 이미 같은 축 위에 있고, KCos 는 마운트만 어긋나 있다.**
새 개념·새 테이블·사업 판단이 필요한 지점이 없다.

---

## 1. 매장 자료함 / 자산의 canonical 축 (3서비스 공통)

```text
[1] 매장 직접 콘텐츠   kpa_store_contents (Store Production Material · source_type='direct')
        ↓ 제작
[2] 실행 자산          store_execution_assets (pop/qr/signage/banner/notice · derivation 추적)
        ↓ 배치·운영
[3] POP V2 · QR · Tablet · Signage
```

| 축 | 원장 | 조직 경계 | 3서비스 데이터 |
|---|---|---|---|
| **매장 직접 콘텐츠** | `kpa_store_contents` | `organization_id` | KPA 15 · PH 0 · KCos 0 (마운트 결함으로 쓸 수 없었음) |
| **실행 자산** | `store_execution_assets` | `organization_id` + 서비스 스코프 마운트 | KPA 29 · PH 4 · KCos 5 |
| POP V2 | `store_pop_documents` | 동일 | 6 · 4 · 4 |

이 두 축(+POP V2/QR)이 **매장이 자기 것으로 소유하는 자료**의 전부다.

### 1-1. 이름 정정 없이 간다

`kpa_store_contents` 는 CLAUDE.md §5 대로 **legacy physical table name** 이며 논리 개념은 service-neutral 이다.
rename 은 이번 설계의 결론에 영향을 주지 않으므로 다루지 않는다.

---

## 2. 스냅샷과 asset control 은 "확장"이다

```text
o4o_asset_snapshots         HUB(운영자/커뮤니티) → 매장 복사 채널      frozen core
kpa_store_asset_controls    KPA 가 그 위에 얹은 게시/채널/본사 강제 배포   KPA_SPECIFIC
```

| | KPA | PH | KCos |
|---|---|---|---|
| 스냅샷 채택 | ✓ (7) | ✗ 미채택 (0) | 경로만 있음 · 원천 0 |
| asset control 채택 | ✓ (5) | ✗ (0) | ✗ (0) · 잘못된 마운트만 존재 |

**결정:**

1. 스냅샷은 **HUB 복사 채널**로 유지한다. 자료함의 1차 원천이 아니다.
2. `kpa_store_asset_controls` 는 **KPA 전용 확장**으로 둔다. KCos·PH 는 채택하지 않는다.
   구조는 공통화 가능하지만 KPA 밖 수요·데이터·소비자가 모두 0 이다 — 수요가 생길 때 승격한다.
3. 따라서 **KCos 가 `kpa_store_asset_controls` 를 참조해야 할 이유는 없다.** KCos `/store-assets` 마운트는 제거 대상이다.

---

## 3. 조직 해석 계약 (서비스별 mount 규칙)

```text
서비스 route  →  서비스 전용 controller(조직 결정만)  →  공용 service(검증·SQL)
```

| 규칙 | 근거 |
|---|---|
| 공용 controller 에 `isStoreOwner(…, 'kpa')` 가 박혀 있으면 **다른 서비스에서 마운트하지 않는다** | `/assets` · `/store-assets` · `/store-contents` 결함의 공통 원인 |
| 서비스 전용 controller 는 **조직 결정 + 상태코드 매핑**만 한다. 로직 복제 0 | PH `PharmacyHubStoreContentController` · KCos `cosmetics-asset-snapshot.controller` 가 선례 |
| 조직 해석은 `createRequireStoreOwner(ds, serviceKey)` 또는 서비스 enrollment resolver | 0/1/2+ 계약 · 2+ 면 `AMBIGUOUS` (임의 선택 금지) |
| 다른 서비스 조직으로의 fallback 금지 (`KpaMember` 류) | "없는 fallback 을 남의 테이블로 채우는 것"이 결함 |
| body/query `organizationId` 불신 | 이미 전 컨트롤러 준수 |

---

## 4. KCos 자료함 '콘텐츠' 탭의 정본

현재: `type=content` 스냅샷만 나열 → KPA 잔재 어휘 → 구조적으로 0.

**확정:**

```text
KCos 자료함 '콘텐츠' = [1] 매장 직접 콘텐츠(direct)  +  [2] 실행 자산 중 content 계열  +  (HUB 복사 스냅샷 cms — 있으면)
```

KPA `StoreContentsSelector` 의 3-origin 병합(`snapshot | direct | execution-asset`)과 **같은 의미**다.
차이는 KCos 의 snapshot 이 `cms`(HUB 운영자 콘텐츠) 라는 점뿐이며, `content`(KPA 콘텐츠 허브 사본)는 KCos 에 존재하지 않는다.

- 공통 `StoreLibraryContentsView` 에 **origin 별 fetch 를 주입**하는 방식으로 맞춘다 (서비스 조건문 0).
- KPA 의 `store-library-feed.controller` 를 **KCos 로 공통화하지 않는다** — controls JOIN 이 결함을 재생산한다.

---

## 5. POP V2 source 계약과의 정합

| 자료함 origin | POP V2 origin | resolver | 비고 |
|---|---|---|---|
| direct (`kpa_store_contents`) | `direct` | org 스코프 | 3서비스 동일 |
| execution-asset (`store_execution_assets`) | `library` | org 스코프 | 3서비스 동일 · KCos 실측 200 |
| snapshot (`o4o_asset_snapshots`) | `snapshot` | org 스코프 · `assetType='content'` 고정 | **KCos cms 스냅샷은 현재 resolver 가 받지 않는다** (`assetType='content'` 필터) — KCos 콘텐츠 탭 재정렬(§4) 시 `cms` 허용 여부를 함께 결정 |

`StoreContentsSelector` V2 이관은 KPA 범위에서 **지금 가능**하다(IR §9).

---

## 6. 하지 않는 것

| 항목 | 이유 |
|---|---|
| `kpa_store_asset_controls` 공통 승격 | 수요 0 · 소비자 전부 KPA |
| `kpa_store_contents` rename | 결론에 무관 · 별도 판단 |
| 공통 projection / 신규 entity | 기존 축 2개로 충분 (WO 중지 조건 3) |
| KCos HUB 콘텐츠 공급(cms 0행) 해결 | 운영자 콘텐츠 게시 축 — 이 설계 범위 밖 |

---

## 7. 최종 판정

```text
KCOS STORE-ASSET SCOPE          = CLOSED   (/store-assets 는 KPA 확장 — KCos 미채택 · 마운트 제거 대상)
KCOS LIBRARY CONTENT SOURCE     = CLOSED   (B 매장 직접 콘텐츠 + D 실행 자산 · snapshot 은 HUB 채널)
KPA_STORE_ASSET_CONTROLS ROLE   = CLOSED   (KPA_SPECIFIC · 구조 commonizable · 승격 보류)
TENANT ISOLATION                = CLOSED   (위험 경로 = KPA 하드 controller 의 타 서비스 마운트 2곳 · 그 외 안전)
POP V2 SOURCE READINESS         = CLOSED   (KPA 3 origin V2_RESOLVABLE_NOW · KCos cms 스냅샷은 §5 조건)
IMPLEMENTATION                  = NOT_STARTED
```
