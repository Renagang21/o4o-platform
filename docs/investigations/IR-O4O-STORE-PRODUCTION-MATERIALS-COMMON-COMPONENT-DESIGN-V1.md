# IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-COMPONENT-DESIGN-V1

> **목적**: KPA에서 안정화된 `StoreProductionMaterialsPage`의 derivation("원본 보기") 기능을 GlycoPharm/K-Cosmetics에 **복붙하지 않고**, 공통 컴포넌트/contract로 추출할 범위와 단계를 설계한다.
> **성격**: read-only 설계 조사 (코드/API/DB/migration 변경 없음).
> **작성일**: 2026-06-06
> **선행**: `IR-O4O-STORE-ASSET-DERIVATION-CROSSSERVICE-COMMONIZATION-V1`(백엔드 service-neutral 확인), `WO-KPA-STORE-ASSET-DERIVATION-VIEWER-QR-BLOG-EXTEND-V1`(KPA 완료)
> **연관 규칙**: `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`, CLAUDE.md §13/§13-A(공통 구조/APP 표준), §7(Boundary)

---

## 1. Summary / Verdict

**KPA→타서비스 복붙을 중단**한다. KPA가 앞으로도 계속 고도화되므로, 복붙은 매 업그레이드마다 3중 수정·드리프트를 강제한다.

대신 **가장 작고 효과 큰 단위부터 공통 컴포넌트로 추출**하고, **KPA에 먼저 재적용해 회귀 0을 확인한 뒤** GlycoPharm/K-Cosmetics에 단계적으로 붙인다.

**1차 추출 대상 = `StoreAssetDerivationViewer`** (원본 보기 모달). 백엔드는 이미 service-neutral 하므로 추출은 **프론트 전용**이며, 컴포넌트는 endpoint를 모르고 서비스가 fetcher를 주입한다.

전체 페이지를 한 번에 공통화하지 않는다 — viewer → (이후) ResultKind/통합목록 → (이후) 활용하기 순으로 쪼갠다.

---

## 2. Scope

- 대상: 공통화 **설계**(무엇을 추출/주입할지, 어느 패키지에, 어떤 contract로, 어떤 순서로).
- 제외: 실제 코드 추출/이동/구현, 백엔드/DB/migration, 커밋 대상 코드 변경.
- 산출물: 본 문서 1건.

---

## 3. KPA `StoreProductionMaterialsPage` 분해 — 공통 vs 서비스별

기준 파일: `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx` (+ `src/api/storeAssetDerivations.ts`).

### 3.1 공통화 후보 (3서비스 동일하게 동작 가능)
| 요소 | KPA 현재 위치 | 공통화 형태 |
|---|---|---|
| **원본 보기 모달 + 상태머신** | 페이지 내 `derivOpen/derivItems/derivLoading/derivError` + 모달 JSX | **`StoreAssetDerivationViewer` 컴포넌트** (loading/error/empty/list 자체 소유) |
| `openDerivations()` 조회 로직 | 페이지 내 useCallback | viewer 내부로 흡수(fetcher 주입) |
| `ResultKind` 모델 | `type ResultKind = 'material'\|'qr'\|'blog'` | 공통 타입 export (확장: `'pop'` 별칭 고려) |
| **derivedKind 매핑** | `material→pop_pdf, qr→qr_code, blog→blog_post` (inline) | 공통 helper `resultKindToDerivedKind(kind)` |
| **source_kind 라벨 매핑** | `SOURCE_KIND_LABELS`(content_snapshot/content_direct→'콘텐츠', library_resource/store_execution_asset→'자료') | 공통 default 맵 + override prop |
| derivation client contract | `getStoreAssetDerivations({derivedKind,derivedId})` + `StoreAssetDerivation` 타입 | 공통 **타입/시그니처** contract (구현은 서비스별 주입) |
| empty/loading/error 문구 | 페이지 내 | viewer 기본 문구(+override) |
| 활용하기 dropdown(후순위) | RowUseMenu | (2차 이후) 공통화 검토 |

### 3.2 서비스별로 남길 것 (주입)
| 요소 | 이유 |
|---|---|
| **API base prefix** (`/kpa` vs `/glycopharm` vs `/cosmetics`) + client 컨벤션(KPA fetch-scoped vs glyco/kcos axios `res.data`) | 서비스별 apiClient 상이 → viewer는 **fetcher 주입**으로 흡수 |
| **source 목록 fetcher** (execution assets / QR / blog / direct contents) | 서비스별 소스 구성·진척도 상이(KPA 4종, glyco/kcos 1종) |
| **route** (POP/QR/블로그/사이니지 만들기 경로) | 서비스별 route 상이 |
| **사용자 문구** (KPA/Glyco: "내 약국" 문맥 / KCos: "내 매장" 문맥) | 도메인 용어 차이 |

### 3.3 핵심 설계 원칙
- **viewer는 endpoint를 모른다.** 서비스가 `fetchDerivations` 함수를 주입 → API base 차이를 컴포넌트 밖으로 격리.
- **viewer는 "결과물 1건의 원본 역추적"만 책임진다.** 목록 구성/소스 병합은 페이지(서비스)의 책임으로 남긴다(1차 범위 최소화).

---

## 4. 1차 추출 컴포넌트 — `StoreAssetDerivationViewer` contract

제안 위치: **`@o4o/store-ui-core`** (3서비스 모두 의존, `components/` 보유). 대안: `@o4o/shared-space-ui`.

```ts
// 공통 타입 (백엔드 store_asset_derivations 응답과 정합)
export interface StoreAssetDerivationItem {
  id: string;
  serviceKey: string;
  organizationId: string;
  sourceKind: string;
  sourceId: string;
  sourceTitle?: string | null;
  derivedKind: string;
  derivedId: string;
  derivedTitle?: string | null;
  createdAt: string;
}

export type StoreResultKind = 'material' | 'pop' | 'qr' | 'blog';

// 공통 매핑 helper
export function resultKindToDerivedKind(kind: StoreResultKind): 'pop_pdf' | 'qr_code' | 'blog_post';
//  material|pop → pop_pdf, qr → qr_code, blog → blog_post

export interface StoreAssetDerivationViewerProps {
  open: boolean;
  onClose: () => void;
  /** 결과물 식별 — 서비스가 derivedKind/derivedId를 직접 주거나, kind만 주고 helper로 매핑 */
  derivedKind: string;
  derivedId: string;
  /** 헤더 표기: `{kindLabel} · {title}` */
  title: string;
  kindLabel?: string;
  /** endpoint 주입 — 서비스별 API base/컨벤션 흡수. viewer는 호출만. */
  fetchDerivations: (p: { derivedKind: string; derivedId: string }) =>
    Promise<{ items: StoreAssetDerivationItem[] }>;
  /** source_kind → 사용자 라벨 override (기본 맵 내장) */
  sourceKindLabels?: Record<string, string>;
}
```

- viewer 내부: open 시 `fetchDerivations` 호출 → loading/error/empty/list 자체 처리. "연결된 원본 정보가 없습니다" 등 문구 기본 제공.
- 개발자 용어(derivedKind/relation table) 사용자 노출 금지 — `sourceKindLabels`로 한글화.

---

## 5. Consumer Impact Matrix

`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 기준. **1차(viewer 추출+KPA 적용)** 시점.

### 변경되는 공통 모듈
- 신규: `@o4o/store-ui-core` 에 `StoreAssetDerivationViewer` + 타입/helper 추가 (신규 export — 기존 export 무변경).

| 소비처 | 현재 사용 | 1차(viewer 추출+KPA 적용) 영향 | route/role/capability | 검증 |
|---|---|---|---|---|
| `@o4o/store-ui-core` (패키지) | 본 컴포넌트 신규 | **추가 only**(기존 export 불변) | — | 패키지 typecheck/build |
| web-kpa-society | viewer 인라인 보유 | **인라인 → 공통 컴포넌트 교체** | route/role 불변 | KPA 화면 무변화 + POP/QR/블로그 원본 보기 회귀 0 smoke |
| web-glycopharm | 미사용 | **1차 영향 없음**(2차에서 적용) | — | (2차) |
| web-k-cosmetics | 미사용 | **1차 영향 없음**(3차에서 적용) | — | (3차) |
| web-neture | 화면 없음 | 없음 | — | — |
| admin/operator/forum/store-hub/mypage | 미사용 | 없음 | — | — |

**판정**: 1차는 `@o4o/store-ui-core`에 **신규 export 추가 + KPA만 내부 교체**이므로, 공통 모듈의 기존 계약을 깨지 않는다. 단 store-ui-core는 공통 패키지이므로 Protocol에 따라 **추가 시점에 본 매트릭스를 갱신**하고, 최소 KPA smoke(기준 서비스) 필수. Glyco/KCos는 각 적용 차수에서 smoke.

---

## 6. 단계적 추출 플랜

```
1. (본 IR) 공통화 범위·contract·홈 패키지 설계 확정
2. WO-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1
   - @o4o/store-ui-core 에 StoreAssetDerivationViewer + 타입 + resultKindToDerivedKind 추가
   - KPA 페이지를 공통 컴포넌트로 교체 (인라인 모달 제거) → KPA 회귀 0 검증 (기준 서비스 우선)
3. WO-O4O-GLYCOPHARM-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1
   - glyco: storeAssetDerivations fetcher(axios) 주입 + 기존 execution-asset 행(POP)에 viewer 적용
4. WO-O4O-KCOSMETICS-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1
   - kcos 동형 적용
5. (이후) ResultKind 모델 + 다중소스 통합목록 공통화 검토 — QR/blog 실엔티티 병합은 이 단계
6. (이후) 활용하기 dropdown 공통화 검토
```

원칙:
- **복붙 금지** — 기능 덩어리를 공통 컴포넌트로 빼서 주입.
- **KPA 먼저 교체·검증** 후 타서비스 적용 (KPA가 기준 구현).
- 각 차수는 **작은 단위**(먼저 viewer만, 그 다음 ResultKind, 그 다음 통합목록).
- 백엔드/DB/migration 무변경 (이미 service-neutral).

---

## 7. 미해결/주의

- **QR/blog 다중소스**: glyco/kcos의 QR(store_qr_codes)·blog(store_blog_posts)는 현재 제작자료 페이지에 미병합. 이는 viewer 추출과 **분리된** 후속 단계(5번). 1차 viewer는 POP(execution_asset.id=derivedId 일치)부터 안전.
- **client 컨벤션 차이**: KPA는 fetch 기반 `/kpa` pre-scoped, glyco/kcos는 axios `/{service}` + `res.data`. fetcher 주입으로 흡수 — viewer 내부에 fetch 로직 두지 않음.
- **store-ui-core vs shared-space-ui**: 둘 다 3서비스 의존. store-ui-core 권장(스토어 UI 코어). 최종 홈은 추출 WO에서 확정.

---

## 8. 변경하지 않은 것 / 금지 준수

- 코드/API/DB/migration/커밋(코드) 변경 없음 — read-only 설계.
- KPA/Glyco/KCos 코드 복붙·수정 없음. 백엔드 무변경.
- 다른 세션 untracked 파일(`vite.config.*`, 보류 IR) 미접촉.
- 본 산출물 = 문서 1건.

---

## 9. Follow-ups (제안 WO)

1. `WO-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1` — store-ui-core 컴포넌트 추출 + **KPA 우선 적용·회귀검증**.
2. `WO-O4O-GLYCOPHARM-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1`
3. `WO-O4O-KCOSMETICS-STORE-ASSET-DERIVATION-VIEWER-ADOPT-V1`
4. (이후) ResultKind/다중소스 통합목록 공통화 + 활용하기 공통화.
