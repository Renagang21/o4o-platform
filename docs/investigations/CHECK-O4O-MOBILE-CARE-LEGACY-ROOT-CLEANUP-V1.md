# CHECK-O4O-MOBILE-CARE-LEGACY-ROOT-CLEANUP-V1

> `apps/mobile-app`(레거시 Capacitor WebView 래퍼) 삭제 및 `@o4o/mobile-app` name 충돌 해소 검증 보고.
>
> WO: `WO-O4O-MOBILE-CARE-LEGACY-ROOT-CLEANUP-V1`
> 선행 IR: [`IR-O4O-MOBILE-APP-ROOT-CARE-LEGACY-AUDIT-V1`](IR-O4O-MOBILE-APP-ROOT-CARE-LEGACY-AUDIT-V1.md)
> 작성일: 2026-06-21
> 상태: cleanup 완료 (삭제 + lockfile 재생성 + 검증 PASS)

---

## 1. Summary

IR 판정대로 `apps/mobile-app`(중단된 구 공식앱 — Capacitor WebView 래퍼)를 삭제하고 `pnpm-lock.yaml`을 재생성했다. `@o4o/mobile-app` workspace name 충돌이 해소되어 해당 패키지는 `services/mobile-app`(Expo/RN canonical) 단일로 남는다.

병렬 세션 WIP가 모두 정리된(working tree clean) 시점에 실행했다. cleanup 직전 `pnpm-lock.yaml`에 남아 있던 mobile-무관 incidental drift(glob deprecation 텍스트 / vitest `@types/node` 해석 drift 3줄)는 `git checkout HEAD`로 되돌린 뒤 작업하여, lockfile diff가 **mobile/capacitor 제거만** 반영하도록 격리했다.

검증: `pnpm install --frozen-lockfile` PASS, `services/mobile-app` type-check PASS, `apps/api-server` `tsc --noEmit` **0 errors**.

---

## 2. 삭제한 파일

| 경로 | 비고 |
|---|---|
| `apps/mobile-app/**` | git tracked 80개 파일 (android/ios 네이티브 프로젝트, www WebView, src/plugins, capacitor.config.ts, package.json, README.md 포함) |

top-level: `.gitignore`, `README.md`, `android/`, `capacitor.config.ts`, `ios/`, `package.json`, `src/`, `www/`.

`pnpm-lock.yaml`: `apps/mobile-app` importer 블록 + `@capacitor/{android,core,ios,cli}` 패키지/스냅샷 prune (2 insertions, 36 deletions).

> README가 가리키던 `docs/dev/mobile/*`는 이미 부재 상태였으므로 추가 정리 없음.

---

## 3. 보존한 파일 (미변경 확인)

```
services/mobile-app/**                       (Expo/RN canonical, @o4o/mobile-app)
apps/api-server/.../entities/MobileProductDraft.entity.ts
apps/api-server/.../services/mobile-product-draft.service.ts
apps/api-server/.../controllers/mobile-product-draft.controller.ts
*CreateMobileProductDrafts* 마이그레이션
/api/v1/mobile/product-drafts, /api/v1/operator/product-candidates
docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md 외 Product Core 문서
```

---

## 4. canonical 고정 근거

`services/mobile-app`을 mobile product collection app의 canonical root로 유지한다.

- Expo SDK 53 / React Native — 현장 상품 수집(카메라/바코드/입력) 앱에 적합한 네이티브 스택.
- `O4O-PRODUCT-CORE-BASELINE-V1` 에 Foundation skeleton(v0.1.0)으로 명시.
- `@o4o/types`·`@o4o/auth-utils` workspace 패키지 의존 + `o4o-core-api` Bearer 연결(실 흐름).
- 활성 WO 이력(FOUNDATION / EXPO-DEPENDENCY-STABILIZATION / EXPO-GITIGNORE-CLEANUP).

삭제한 `apps/mobile-app`은 웹을 감싸는 Capacitor WebView 래퍼로, 상품 수집 기능과 무관하며 CI/CD·코드에서 소비되지 않는 중단된 구 공식앱이었다.

---

## 5. package name 충돌 해소

| 시점 | `@o4o/mobile-app` 위치 |
|---|---|
| before | `apps/mobile-app`, `services/mobile-app` (2개 충돌) |
| after | `services/mobile-app` (1개) |

`grep --include=package.json "@o4o/mobile-app"` → `services/mobile-app/package.json` 단일 hit 확인.

---

## 6. 검증 결과

| 항목 | 결과 |
|---|---|
| `pnpm install` (lockfile 재생성) | PASS — mobile/capacitor만 prune |
| `pnpm install --frozen-lockfile` | PASS — 재생성 후 무변경 |
| `pnpm -C services/mobile-app type-check` | PASS (0 errors) |
| `cd apps/api-server && tsc --noEmit` | PASS (exit 0) |
| `@o4o/mobile-app` 단일화 | 확인 |
| lockfile diff 격리 (mobile-only) | 확인 — incidental drift 미포함 |

---

## 7. 문서 참조 잔존 (정보)

다음 문서는 `apps/mobile-app`을 역사적 맥락으로 언급 — 강제 수정 불필요(레거시 기록):
- `docs/investigations/IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1.md`
- `docs/archive/audits/IR-O4O-PRODUCT-BARCODE-GOVERNANCE-AUDIT-V1.md` (archive)

---

## 8. 후속 작업 (별도 WO)

- `WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1` — `services/mobile-app` 기준 상품 수집 홈 / 바코드 / 촬영 / 입력 / `/api/v1/mobile/product-drafts` 연결
- `WO-O4O-MOBILE-PRODUCT-IMAGE-UPLOAD-V1` — 이미지 업로드 endpoint / GCS / thumbnail·image_urls
- `WO-O4O-ADMIN-PRODUCT-ASSET-CANDIDATE-REVIEW-V1` — admin.neture.co.kr 상품 자산 관리 / 후보 검토 / 병합 / 바코드 정비
