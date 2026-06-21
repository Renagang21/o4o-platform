# IR-O4O-MOBILE-APP-ROOT-CARE-LEGACY-AUDIT-V1

> 모바일 앱 루트 2종(`apps/mobile-app`, `services/mobile-app`) 케어/레거시 잔재 조사 및 정리 판정.
>
> WO(후속): `WO-O4O-MOBILE-CARE-LEGACY-ROOT-CLEANUP-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §모바일 수집
> 관련: [`IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1`](IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1.md), [`CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1`](CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1.md)
> 작성일: 2026-06-21
> 상태: 조사 완료 — 판정 확정, cleanup 실행은 별도 게이트(아래 §9)

---

## 1. Summary

O4O 플랫폼에 모바일 앱 루트가 2개 존재한다.

| 경로 | 스택 | 정체 | 판정 |
|---|---|---|---|
| `apps/mobile-app` | Capacitor 7.4.4 / WebView | 과거 "공식 앱" WebView 래퍼 (앱스토어 제출 준비 단계에서 중단된 잔재) | **DELETE_CANDIDATE** |
| `services/mobile-app` | Expo SDK 53 / React Native | 상품 수집/운영 모바일 앱의 Foundation skeleton | **CANONICAL** |

핵심 결론:

1. **케어/혈당/복약/건강관리 잔재는 두 모바일 루트 어디에도 없다.** `glucose|혈당|복약|건강관리|케어` 검색 결과는 전부 GlycoPharm 의 정상 사업 화면(BloodCare 등)이며 모바일 앱과 무관하다.
2. `apps/mobile-app` 는 CI/CD·Dockerfile·scripts·turbo·앱 코드 어디에서도 참조되지 않는다. 외부 참조는 (a) `pnpm-lock.yaml` workspace importer 블록, (b) 문서 2건의 수동 언급뿐이다.
3. `apps/mobile-app/README.md` 가 가리키는 참고 문서(`docs/dev/mobile/mobile_app_investigation_report.md`, `mobile_app_appstore_preparation.md`)는 **이미 삭제됨**("Full documentation cleanup" 커밋). 즉 README 가 dead link 만 남긴 abandoned 산출물이다.
4. 두 패키지 모두 package name 이 **`@o4o/mobile-app`** 로 동일 → workspace name 충돌. `apps/mobile-app` 삭제로 해소된다.
5. `services/mobile-app` 는 `O4O-PRODUCT-CORE-BASELINE-V1.md` 에 Foundation skeleton 으로 명시된 canonical 경로이므로 보존한다.

---

## 2. apps/mobile-app 조사 결과

### 2.1 구성

```
apps/mobile-app/
├── android/                 # Capacitor Android 네이티브 프로젝트 (tracked)
├── ios/                     # Capacitor iOS 네이티브 프로젝트 (tracked)
├── www/                     # WebView 소스 (index.html, app-settings.html)
├── src/
│   ├── plugins/{camera,push,geolocation,barcode,filesystem}.ts
│   ├── bridge/mobileBridge.ts
│   └── main.ts
├── capacitor.config.ts      # appId: com.o4o.mobile, appName: 'O4O Mobile'
├── package.json             # name: @o4o/mobile-app (Capacitor + React)
└── README.md                # dead doc links
```

- git tracked 파일 80개 (android/ios 네이티브 프로젝트 포함).
- `capacitor.config.ts`: `allowNavigation` 으로 neture.co.kr 도메인을 WebView 로 띄우는 **하이브리드 래퍼**. 자체 기능 없음 — 웹을 감싸는 셸.
- README: "O4O Platform 의 **공식 모바일 애플리케이션**", "Phase 4: 앱스토어 제출 준비 (진행 중)", 브랜치 `feature/mobile-app-phase4`. → 앱스토어 제출 준비 중 중단된 구 공식앱.

### 2.2 활동 이력

```
2a83b6b0b fix(mobile-app): Remove console.log statements for CI compliance
dd424957e refactor(mobile-app): Move APPSTORE_PREPARATION.md to docs/dev/mobile
a337d4c0f docs(mobile-app): Add App Store submission preparation guide (Phase 4)
```

마지막 활동 2026-01 (디스크 mtime 기준 Jan 6~11). 이후 무변경. README 가 가리키는 `docs/dev/mobile/` 디렉터리는 현재 부재(삭제됨).

### 2.3 참조 현황 (repo 전체)

| 위치 | 참조 | 성격 |
|---|---|---|
| `.github/workflows/**` | 없음 | CI/CD 미사용 |
| `Dockerfile*` | 없음 | 배포 미사용 |
| `scripts/**` | 없음 | — |
| `turbo.json` | 파일 자체 부재 | — |
| `pnpm-lock.yaml` | importer 블록 1개 (~14줄) | workspace 등록 |
| `docs/.../IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1.md` | "Capacitor Android 래퍼" 설명 | 수동 언급 |
| `docs/archive/audits/IR-O4O-PRODUCT-BARCODE-GOVERNANCE-AUDIT-V1.md` | `barcode.ts` 플러그인 표 | 수동 언급(archive) |

→ **코드/CI/배포 어디에서도 소비되지 않음.** 삭제해도 api-server·web services·services/mobile-app 에 영향 없음.

---

## 3. services/mobile-app 조사 결과

### 3.1 구성

```
services/mobile-app/
├── app/
│   ├── (auth)/login.tsx, _layout.tsx
│   ├── (app)/index.tsx, _layout.tsx     # 홈: 상품 관리/주문 현황/사이니지/카메라·업로드 (전부 disabled "준비 중")
│   └── _layout.tsx
├── src/
│   ├── api/client.ts                    # o4o-core-api Bearer 연결
│   └── contexts/AuthContext.tsx
├── app.json                             # name: 'O4O 운영앱', package: com.o4o.mobileapp (Expo)
└── package.json                         # name: @o4o/mobile-app, deps: @o4o/types, @o4o/auth-utils
```

- Expo SDK 53 / RN 0.79 / expo-router. workspace 패키지(`@o4o/types`, `@o4o/auth-utils`) 의존.
- `src/api/client.ts` → 실제 prod API(`o4o-core-api`) Bearer 인증 연결.
- 홈 화면은 상품 수집 방향(상품 관리 / 카메라·업로드)의 placeholder. Foundation skeleton (v0.1.0).

### 3.2 활동 이력 (WO 기반, 활성)

```
353f2b9fd chore(mobile): WO-O4O-MOBILE-EXPO-GITIGNORE-CLEANUP-V1
92cb38b81 chore(mobile-app): WO-O4O-MOBILE-EXPO-DEPENDENCY-STABILIZATION-V1
66ef1755c feat(mobile-app): WO-O4O-MOBILE-APP-FOUNDATION-V1 — RN + Expo 모바일 운영앱 초기 구조
```

마지막 활동 2026-05. baseline 문서에 canonical 로 명시.

### 3.3 Product Core 정합성

`O4O-PRODUCT-CORE-BASELINE-V1.md:150` —
> `services/mobile-app/` (Expo/RN) — **Foundation skeleton (v0.1.0)**. 홈 메뉴(`상품 관리`, `카메라/업로드`)는 전부 `disabled` "준비 중".

흐름 원칙(보존):
```
모바일 수집 → mobile_product_drafts → product_candidates → Identifier 매칭 → 웹/운영자 검토
(모바일은 ProductMaster 직접 저장 안 함)
```
backend(`MobileProductDraft` 엔티티/서비스/컨트롤러, `/api/v1/mobile/product-drafts`)는 별개 모듈로 이미 구현됨 — 본 정리와 무관, 무변경.

---

## 4. 케어/건강관리 잔재 검색 결과

`glucose|GlucoseView|혈당|복약|건강관리|케어` 검색 → 50+ hit, **전부 GlycoPharm 정상 사업 영역** (예: `BloodCareBusinessStatusPage.tsx`, guide copy, 당뇨 관련 카피). **`apps/mobile-app` / `services/mobile-app` 내부 hit 0건.**

→ 과거 케어 기능의 모바일 잔재는 **존재하지 않음.** apps/mobile-app 삭제 근거는 "케어 잔재"가 아니라 "**중단된 구 공식앱(Capacitor WebView 래퍼) 잔재 + package name 충돌**"이다.

---

## 5. package name 충돌

| 경로 | name | appId |
|---|---|---|
| `apps/mobile-app` | `@o4o/mobile-app` | `com.o4o.mobile` |
| `services/mobile-app` | `@o4o/mobile-app` | `com.o4o.mobileapp` |

동일 workspace name 2개. `apps/mobile-app` 삭제 시 `@o4o/mobile-app` 는 `services/mobile-app` 단일로 정리된다.

---

## 6. 판정

| 대상 | 판정 | 근거 |
|---|---|---|
| `apps/mobile-app` | **DELETE_CANDIDATE** | 중단된 구 공식앱(Capacitor WebView 래퍼), CI/CD·코드 미참조, dead doc link, package name 충돌, 삭제 시 타 영역 영향 없음 |
| `services/mobile-app` | **CANONICAL** | 상품 수집/운영 모바일 앱 Foundation skeleton, baseline 명시, 활성 WO, workspace 패키지 의존 |

§6.1 삭제 기준 5개 조건 전부 충족(무관/CI미사용/잔재/충돌/무영향).

---

## 7. 삭제 대상 vs 보존 대상

### 삭제 대상
```
apps/mobile-app/**                                    (80 tracked files)
pnpm-lock.yaml 의 apps/mobile-app importer 블록        (pnpm install 로 자동 정리)
```

### 보존 대상 (절대 미변경)
```
services/mobile-app/**
apps/api-server/.../entities/MobileProductDraft.entity.ts
apps/api-server/.../services/mobile-product-draft.service.ts
apps/api-server/.../controllers/mobile-product-draft.controller.ts
*CreateMobileProductDrafts* 마이그레이션
/api/v1/mobile/product-drafts, /api/v1/operator/product-candidates
docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md 외 Product Core 문서
```

> README 가 가리키던 `docs/dev/mobile/*` 는 이미 삭제 상태 → 추가 정리 불필요.

---

## 8. 문서 참조 정리

삭제 후 다음 문서의 `apps/mobile-app` 언급은 "삭제됨(레거시 Capacitor 래퍼)" 맥락으로 남겨도 무방(역사적 기록). 강제 수정 불필요:
- `docs/investigations/IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1.md`
- `docs/archive/audits/IR-O4O-PRODUCT-BARCODE-GOVERNANCE-AUDIT-V1.md` (archive)

---

## 9. cleanup 실행 게이트 (중요 — 병렬 세션 충돌)

조사 시점(2026-06-21) working tree 에 **다른 세션의 미커밋 WIP** 가 존재한다:
- `store-entitlement.routes.ts`, `store-ui-core/*`, `web-*/ForeignVisitorSalesSupport*` (M/??)
- `pnpm-lock.yaml` 이 이미 dirty (mobile 무관 — glob deprecation 텍스트 + vitest `@types/node` drift 3줄)

`apps/mobile-app` **파일 삭제 자체**는 경로가 격리되어 충돌 없음. 그러나 **lockfile 재생성(`pnpm install`)** 은 이미 dirty 한 공유 `pnpm-lock.yaml` 을 다른 세션 WIP 위에서 건드리게 되어, 본 작업과 타 세션 변경이 lockfile 한 파일에 엉킨다 (WO §11 "다른 세션 WIP 충돌" / 커밋 위생 규칙 위반).

**따라서 cleanup 은 다음 중 하나가 충족될 때 실행한다:**
1. 병렬 세션 WIP 가 커밋/정리되어 working tree 가 깨끗해진 뒤, 또는
2. 사용자가 "지금 lockfile 재생성 진행" 을 명시 승인한 경우.

cleanup 절차(실행 시):
```
1. git rm -r apps/mobile-app
2. pnpm install            # apps/mobile-app importer 블록 + 미사용 capacitor 패키지 prune
3. pnpm install --frozen-lockfile   # 무변경 확인
4. pnpm -C services/mobile-app type-check
5. pnpm -C apps/api-server exec tsc --noEmit -p tsconfig.json
6. @o4o/mobile-app 가 services/mobile-app 단일로 남는지 확인
7. CHECK-O4O-MOBILE-CARE-LEGACY-ROOT-CLEANUP-V1.md 작성
8. 명시 pathspec 으로만 stage (apps/mobile-app 삭제 + 문서 + lockfile)
```

---

## 10. 금지 사항 (재확인)

- `services/mobile-app` 삭제 금지
- `mobile_product_drafts` / `product_candidates` / `ProductMaster` / `ProductIdentifier` 변경 금지
- 상품 등록 정책·이미지 업로드·바코드 기능 신규 구현 금지
- `git add .` / `git add -A` 금지 — 명시 pathspec 만
- 다른 세션 WIP 미접촉
