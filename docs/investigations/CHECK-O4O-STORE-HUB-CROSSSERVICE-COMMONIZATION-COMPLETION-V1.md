# CHECK-O4O-STORE-HUB-CROSSSERVICE-COMMONIZATION-COMPLETION-V1

> **Type:** CHECK (read-only 검증·고정)
> **Date:** 2026-06-11
> **Scope:** Store Hub cross-service 공통화 재점검 후속 3개 WO 완료 검증 및 Store Hub 공통화 완료 상태 고정
> **판정:** **CONDITIONAL PASS**
> 상위: `IR-O4O-STORE-HUB-CROSSSERVICE-COMMONIZATION-RECHECK-V1`

---

## 1. CHECK 개요

`IR-O4O-STORE-HUB-CROSSSERVICE-COMMONIZATION-RECHECK-V1` 에서 식별된 미흡점 3건(derivation read 경계, GP mock surface, GP/KCos 제작 자료 thin)의 후속 WO 가 실제 main 에 반영되었는지 검증하고, **현재 기준의 Store Hub 공통화 완료 상태**를 고정한다.
**read-only** — 코드/UI/API/DB/route/menu 무수정.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|-----|
| branch | `main` |
| HEAD | `75c051bd2` |
| origin/main ahead/behind | `0 / 0` |

**선행 3 WO 파일 워킹트리 상태:** 전부 미변경(각 WO 커밋 상태 유지).

**다른 세션 WIP (본 CHECK 미접촉):** `M docs/.../CHECK-...-ORDER-VIEW-LOOP`, `?? docs/.../IR-...`(직전 IR 2건), `?? *.png`. 본 CHECK 는 신규 문서 1개만 path-specific add.

---

## 3. 선행 IR/WO 목록

| 단계 | 문서/커밋 |
|------|-----------|
| IR | `IR-O4O-STORE-HUB-CROSSSERVICE-COMMONIZATION-RECHECK-V1` |
| WO (F) | `WO-O4O-STORE-ASSET-DERIVATION-READ-SERVICEKEY-FILTER-V1` (`ecb60a6d6`) |
| WO (E) | `WO-O4O-GLYCOPHARM-SIGNAGE-PREVIEW-MOCK-SURFACE-CLEANUP-V1` (`4b60d5c40`) |
| WO (C) | `WO-O4O-GP-KCOS-STORE-PRODUCTION-MATERIALS-PARITY-UPLIFT-V1` (`75c051bd2`) |

---

## 4. Store Hub route/menu 골격 확인

| 확인 항목 | 결과 |
|-----------|------|
| 3서비스 Store Hub home 존재 | ✅ KPA `pages/pharmacy/StoreHubPage`, GP `pages/hub/StoreHubPage`, KCos `pages/hub/KCosmeticsHubPage` |
| 3서비스 Hub 9항목 route/menu | ✅ (b2b/content/signage/blog/pop/qr/event-offers/cart + home) — 공통 config `packages/store-ui-core/src/config/storeMenuConfig.ts` |
| dead menu / route 없는 menu | ✅ 미발견 (KCos billing label alias 경미 — IR §17) |
| Store Hub ↔ My Store route 경계 | ✅ `/store-hub` vs `/store/*` 분리 |
| Neture Store Hub route/menu | ❌ 없음(정상) |

→ route/menu 골격 **A(공통 유지)**. IR 시점 대비 무변경.

---

## 5. Neture 비대상 확인

| 확인 | 결과 |
|------|------|
| `/store-hub` route | ❌ 없음 (`web-neture/App.tsx` grep 0) |
| store hub menu | ❌ 없음 |
| `createStoreExecutionAssetsController` mount | ❌ 없음 (`neture.routes.ts` grep 0) |
| Blog retire 유지 | ✅ (`WO-O4O-NETURE-BLOG-RETIRE-V1`) |

→ **H: Neture 비대상 유지 — Store Hub 공통화에 미혼입.**

---

## 6. derivation READ serviceKey 필터 확인 (F)

`apps/api-server/src/routes/o4o-store/controllers/store-execution-assets.controller.ts`
```
L118  .where('d.organizationId = :organizationId', { organizationId });   // 유지
L125  if (serviceKey) {
L126    qb.andWhere('d.serviceKey = :serviceKey', { serviceKey });        // 추가
```

| 확인 항목 | 결과 |
|-----------|------|
| organizationId 필터 유지 | ✅ |
| serviceKey 필터 추가 | ✅ (조건부 — mount 가 주입한 serviceKey 존재 시) |
| serviceKey 미주입 mount 없음 | ✅ kpa/glycopharm/cosmetics 3 mount 모두 serviceKey 주입 |
| response shape / write-path / DB·migration 변경 | ❌ 없음 (read 쿼리 AND 1건만) |
| Neture 영향 | ❌ 없음 (미마운트) |

→ write/read boundary 정렬 완료. **F 해소.**

---

## 7. GP SignagePreview mock 제거 확인 (E)

`services/web-glycopharm/src/pages/store-management/signage/SignagePreviewPage.tsx` (404→87줄)

| 확인 항목 | 결과 |
|-----------|------|
| `mockPlaylist` / `mockChannels` 코드 | ❌ 없음 (잔존 매치 1건은 헤더 주석 설명) |
| YouTube/Neture/Abbott 샘플 · `dQw4w9WgXcQ` | ❌ 없음 |
| 하드코딩 display URL(`pharmacy-1`) | ❌ 없음 |
| mock 재생 시뮬레이터 | ❌ 없음 |
| 정직한 준비중 안내 | ✅ "사이니지 미리보기 기능 준비 중" |
| 실제 route 2 카드 | ✅ `/store/marketing/signage/playlist`(L51) · `/store/marketing/signage/player`(L66) |
| route/menu 변경 | ❌ 없음 (route 유지, 컴포넌트만 교체) |

→ live-routed mock surface 제거. **E 해소.**

---

## 8. GP/K-Cos 제작 자료 parity uplift 확인 (C)

`web-glycopharm/.../StoreProductionMaterialsPage.tsx` · `web-k-cosmetics/.../StoreProductionMaterialsPage.tsx`

| 확인 항목 | GP | KCos |
|-----------|:---:|:----:|
| multi-source 구조(executionAssets 단일 탈피) | ✅ | ✅ |
| blog 병합(`fetchStaffBlogPosts` + `getStoreSlug`) | ✅ | ✅ |
| 각 소스 독립 `.catch→null`(부분 실패 격리) | ✅ | ✅ |
| `updatedAt` DESC 정렬 | ✅ | ✅ |
| source kind 배지(`KIND_BADGE` 제작 자료/블로그) | ✅ | ✅ |
| assetType / usageType / blog status 표시 | ✅ | ✅ |
| cross-create CTA(POP/QR/블로그/사이니지) | ✅ | ✅ |
| CTA route 실존 | ✅ `/store/marketing/pop`·`/qr`·`/content/blog`·`/marketing/signage/playlist` | ✅ |
| POP derivation viewer 유지 | ✅ | ✅ |
| blog 원본 보기(derivation viewer + `resultKindToDerivedKind`) | ✅ | ✅ |
| 기존 disabled/no-op 삭제 버튼 제거 | ✅ | ✅ |
| mock/no-op/TODO 신규 유입 | ❌ 없음 | ❌ 없음 |

→ executionAssets 단일 → **executionAssets + blog 2소스 병합 + kind 배지 + cross-create + POP/blog 원본 보기** 로 uplift. **C 부분 해소(아래 §13 gap).**

---

## 9. POP / QR / Blog / Signage 실행 화면 확인

| 자산 | KPA | GP | KCos |
|------|:---:|:--:|:----:|
| POP | ✅ | ✅ | ✅ |
| QR | ✅ | ✅ | ✅ |
| Blog | ✅ | ✅ | ✅ |
| Signage | ✅ | ✅ | ✅ |

- 공통 컴포넌트 사용(IR §11). Signage = asset snapshot 기반(**제품 파생 오처리 없음**).
- mock surface: GP SignagePreview 제거 완료(§7). 그 외 미발견.

---

## 10. Store Hub vs My Store 경계 확인

| 확인 | 결과 |
|------|------|
| `/store-hub` vs `/store/*` 경계 | ✅ 유지 |
| Hub → copy → My Store 단방향 | ✅ |
| Event Offer Store Hub 독립 | ✅ (`/store-hub/event-offers`, product tab 미혼입) |
| My Store 실행/정산/경영 미혼입 | ✅ (GP 경영 그룹은 My Store 영역, 본 축 외) |

→ **A: 경계 유지.**

---

## 11. TypeScript/build 검증

| 대상 | 명령 | 결과 |
|------|------|------|
| api-server | `npx tsc --noEmit` | ✅ clean (derivation controller 오류 0) |
| web-glycopharm | `npx tsc -b` | ✅ clean (제작 자료·SignagePreview 오류 0) |
| web-k-cosmetics | `npx tsc` | ✅ clean (제작 자료 오류 0) |
| web-kpa-society | (선행 WO 시 clean, 본 CHECK 범위 무변경) | ✅ 무변경 |

→ 신규 TS 오류 0.

---

## 12. browser smoke 결과

**NOT TESTED (deferred).** 사유: frontend 변경 + 미배포(프로덕션 이전 버전). 정적 코드 검증(§4~§10) + TypeScript(§11)로 대체.
배포 후 권장: GP/KCos 제작 자료(blog 병합·CTA route 이동·POP/blog 원본 보기 open/close) / GP SignagePreview(mock 미노출·준비중 안내) / console error 0. derivation read 인증 200/empty.

---

## 13. 남은 후순위 후보 (정직한 gap 분리)

**QR list / direct content 소스 — 미구현(미완 parity):**
- GP/KCos 에 `getStoreQrCodes`(QR list)·`directContentApi.list`(direct content) **ready client 부재**(`qrStaff.ts`=`importOperatorQr`만, `assetSnapshot.ts`=`assetSnapshotApi`만).
- 본 uplift 는 **fabrication 금지 원칙(#8)** 에 따라 없는 소스를 mock 으로 만들지 않고 empty 처리.
- 따라서 KPA 의 4소스(direct+execution+QR+blog) 완전 parity 가 아니라 **2소스(execution+blog) 까지 도달** — "backend/client 지원 범위 내 parity uplift 완료".

후속 후보:
- `IR-O4O-STORE-PRODUCTION-MATERIALS-QR-DIRECT-SOURCE-CONTRACT-V1` (QR/direct content client·endpoint 확인)
- `WO-O4O-GP-KCOS-STORE-PRODUCTION-MATERIALS-QR-DIRECT-SOURCE-V1` (소스 추가)
- (보안 후속) `WO-O4O-NETURE-ORDER-SOURCE-LINK-COLUMN-V2` 류와 무관 — 본 축은 Store Hub.

---

## 14. 최종 판정

### CONDITIONAL PASS

PASS 조건 충족:
- ✅ Store Hub route/menu 골격 3서비스 공통 유지
- ✅ Neture 비대상 유지
- ✅ Store Hub vs My Store 경계 유지
- ✅ derivation READ serviceKey 필터 적용(F 해소)
- ✅ GP SignagePreview mock surface 제거(E 해소)
- ✅ GP/KCos 제작 자료 executionAssets 단일 → blog 포함 multi-source 구조 uplift
- ✅ cross-create CTA 제공(실존 route)
- ✅ POP/blog 원본 보기 커버리지 확대
- ✅ backend/API/DB/route/menu 의도치 않은 변경 없음
- ✅ TypeScript 신규 오류 0

**CONDITIONAL** 사유(WO 의 CONDITIONAL PASS lane 정확 해당):
- QR/direct content 소스가 client/backend 부재로 미구현이나 **mock 없이 정직하게 후속 분리**(§13).
- browser smoke 미배포로 정적/TS 검증 대체.
- KPA 4소스 완전 parity 는 아니나 **backend 지원 범위 내 parity uplift 완료**.

→ **Store Hub cross-service 공통화 축을 현재 기준으로 완료 고정.** 남은 QR/direct content 소스는 "향후 고도화"로 분리.

---

## 15. Current Structure vs O4O Philosophy Conflict Check

| 확인 | 결과 |
|------|------|
| Store Hub 가 오프라인 매장용 온라인 도구 허브로 작동 | ✅ Hub→copy→My Store 흐름 |
| 3서비스 동등 기본 Store Hub 경험 | ✅ 골격·실행 화면·제작 자료(2소스+CTA+원본 보기) 근접. QR/direct 는 gap(§13) |
| 남은 차이가 backend/client 부재인지 구현 편차인지 | ✅ 구분됨 — QR/direct 는 **client 부재**(구현 편차 아님), 정직 기록 |
| Neture Store Hub 오포함 | ✅ 아님 |
| Store Hub ↔ My Store 혼합 | ✅ 분리 유지 |
| 제작 자료/POP/QR/Blog/Signage 가 매장 실행 자산 흐름과 일치 | ✅ Signage 제품 파생 오처리 없음 |
| Event Offer/펀딩/상품 과도 혼입 | ✅ Event Offer Hub 전용 |
| 공통화가 1인 개발 유지보수성 향상 | ✅ 공통 config/컴포넌트 + 3서비스 동형 제작 자료 구조 |
| 없는 데이터를 mock 없이 정직 후속 분리 | ✅ QR/direct content empty + 후속 WO 후보 명시 |

**철학 정합 판정:** 구조적 충돌 없음. Store Hub 공통화는 **골격·경계·backend·주요 frontend parity 기준으로 완료**. QR/direct content 는 정직하게 분리된 고도화 항목.

---

*Generated: 2026-06-11 · read-only CHECK · 코드 무변경 · HEAD `75c051bd2`*
