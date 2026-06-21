# CHECK-O4O-MOBILE-EXPO-SDK54-UPGRADE-FOR-DEVICE-SMOKE-V1

> `services/mobile-app` Expo SDK 53 → 54 업그레이드 + 워크스페이스 분리 검증 보고.
>
> WO: `WO-O4O-MOBILE-EXPO-SDK54-UPGRADE-FOR-DEVICE-SMOKE-V1`
> 선행: [`CHECK-...-SHELL-UI-SMOKE-V1`](CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-UI-SMOKE-V1.md) (실기기 smoke 시도 → Expo Go SDK54 vs 프로젝트 SDK53 불일치)
> 작성일: 2026-06-21
> 상태: 업그레이드 완료 · type-check PASS · expo install --check PASS · Metro 번들 PASS · Expo Go SDK mismatch 해소

---

## 1. Summary

스마트폰 Expo Go(SDK 54) ↔ 프로젝트(SDK 53) 불일치로 실기기 smoke 가 막혀 있었다. `services/mobile-app` 을 **Expo SDK 54** 로 올렸다.

업그레이드 과정에서 **모노레포 전역 `pnpm.overrides` 의 React 19.2.0(웹 스택용)** 이 Expo SDK 54/RN 0.81(React **19.1.0** 요구)과 충돌하는 구조적 문제를 확인했다. `node-linker=hoisted` 라 단일 공유 React 가 강제되어 mobile-app 만 다른 React 를 주는 것이 불가능했다.

→ **결정(사용자 승인): mobile-app 을 pnpm 워크스페이스에서 분리**하여 독립 설치(자체 `pnpm-lock.yaml` + React 19.1.0)한다. 웹/hosted 스택의 React 19.2.0 과 root override 는 **무변경**.

검증: `tsc --noEmit` 0 errors · `expo install --check` "up to date" · `expo export --platform android` 981 모듈 번들 성공.

---

## 2. 변경 패키지 목록 (SDK 53 → 54)

| 패키지 | before (SDK 53) | after (SDK 54) |
|---|---|---|
| expo | ~53.0.0 | **~54.0.35** |
| react | 19.0.0 | **19.1.0** |
| react-dom | (없음, transitive 19.2.7) | **19.1.0** (명시 pin — peer 정렬) |
| react-native | 0.79.6 | **0.81.5** |
| expo-router | ~5.1.11 | **~6.0.24** |
| expo-secure-store | ~14.2.4 | **~15.0.8** |
| expo-splash-screen | ~0.30.10 | **~31.0.13** |
| expo-status-bar | ~2.2.3 | **~3.0.9** |
| react-native-safe-area-context | 5.4.0 | **~5.6.0** |
| react-native-screens | ~4.11.1 | **~4.16.0** |
| @babel/core (dev) | ^7.24.0 | **^7.25.2** |
| @types/react (dev) | ~19.0.10 | **~19.1.0** |
| typescript (dev) | ~5.8.0 | **~5.9.2** |

제거(분리 정리): `@o4o/types`, `@o4o/auth-utils` (`workspace:*`) — **소스 import 0건(미사용)** 이라 독립화하며 제거.

> 버전은 SDK 54 `bundledNativeModules.json` + `expo-template-default@54.0.61` 기준으로 정렬, `expo install --check` 로 검증.

---

## 3. 워크스페이스 분리 (React 충돌 해소)

### 3.1 충돌 원인

```text
root package.json pnpm.overrides: react=19.2.0 / react-dom=19.2.0 / @types/react=19.2.7  (웹 스택)
root .npmrc: node-linker=hoisted + public-hoist-pattern[]=*react*  → 단일 공유 React
Expo SDK 54 / react-native 0.81.5 요구: React 19.1.0
→ react-native(root hoist)가 react 19.2.0 을 사용 → "Incompatible React versions" redbox 위험
```

global override 는 mobile 의 exact pin 도 덮어쓰고, hoisted linker 는 per-package React 분리를 막는다. → mobile-app 만 다른 React 를 주려면 분리가 유일하게 깨끗한 방법.

### 3.2 분리 방식

| 변경 | 내용 |
|---|---|
| `pnpm-workspace.yaml` | `- '!services/mobile-app'` 추가 — 워크스페이스에서 제외 |
| `services/mobile-app/package.json` | `@o4o/*` workspace 의존성 제거(미사용) + SDK54 버전 |
| `services/mobile-app/.npmrc` | `node-linker=hoisted` 추가(RN/Metro 호환, 독립 설치) |
| 설치 | `pnpm install --ignore-workspace` → **자체 `pnpm-lock.yaml`**, root override 미상속 → React **19.1.0** |
| root `pnpm-lock.yaml` | mobile-app 항목 제거(재생성) — resolved 2489→2177 |

> 웹/hosted React 19.2.0, root `pnpm.overrides`, backend/API/Product Core **무변경**.

---

## 4. pnpm-lock.yaml 변경 이유

| 파일 | 변경 | 이유 |
|---|---|---|
| `pnpm-lock.yaml` (root) | mobile-app 의존성 제거 | mobile 을 워크스페이스에서 분리 → root lockfile 에서 빠짐(정리). `--frozen-lockfile` PASS |
| `services/mobile-app/pnpm-lock.yaml` (신규) | 독립 lockfile 생성 | `--ignore-workspace` 독립 설치의 SSOT. React 19.1.0 등 SDK54 트리 고정 |

> 두 lockfile 모두 `--frozen-lockfile` 통과(아래 §6) → CI 안전.

---

## 5. 코드 변경 여부

- 앱 소스(`app/**`, `src/**`) **코드 변경 없음**. 우리 코드는 RN 표준 API(View/Text/FlatList/TextInput/KeyboardAvoidingView/Alert/StyleSheet/ScrollView/TouchableOpacity/ActivityIndicator/RefreshControl)만 사용 → 0.79→0.81 무영향.
- backend / DB / migration / entity / auth backend / Product Core / 상품 수집 기능 / 이미지 업로드 **무변경**.

---

## 6. Verification Results

| 항목 | 결과 |
|---|---|
| `pnpm -C services/mobile-app type-check` | ✅ **0 errors** |
| `expo install --check` (SDK54 버전 정렬) | ✅ **"Dependencies are up to date"** |
| `expo export --platform android` (Metro 번들) | ✅ **981 모듈 번들 성공** → Android Hermes 번들(2.64MB) |
| 설치된 expo / react / react-native | ✅ expo **54.0.35** / react **19.1.0** / RN **0.81.5** |
| root web react (무변경 확인) | ✅ **19.2.0** 유지 |
| root `pnpm install --frozen-lockfile` | ✅ exit 0 (CI 안전) |
| mobile `pnpm install --ignore-workspace --frozen-lockfile` | ✅ exit 0 (CI 안전) |

---

## 7. Expo Go SDK mismatch 해소 여부

> ✅ **해소.** 프로젝트 expo 가 **54.0.35**(SDK 54) → 스마트폰 Expo Go(SDK 54)와 일치. 직전의 *"project uses SDK 53 / Expo Go is for SDK 54"* 오류 조건이 제거됨.

추가로 Metro 번들이 SDK54 의존성 트리로 정상 번들됨 → 런타임 import/resolve 수준의 호환성도 확인.

---

## 8. 실기기 smoke 가능 상태 여부

> ✅ **실기기 Expo Go SDK 54 smoke 진행 가능 상태.** (실제 디바이스 렌더 육안 확인은 사람 몫 — 본 환경엔 Android 툴체인 없음.)

사용자 재실행 절차:

```powershell
cd services/mobile-app
pnpm install --ignore-workspace        # (이미 설치됨 — 새 클론/정리 시에만)
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.0.45"
npx expo start --lan
```

> 스마트폰 Expo Go(SDK 54)로 QR 스캔 시 **SDK mismatch 오류 없이** 로드되어야 한다. 이후 [`CHECK-...-SHELL-UI-SMOKE-V1 §5`](CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-UI-SMOKE-V1.md) 12항목 + 세션 만료 동작([`CHECK-...-AUTH-SESSION-EXPIRY-HANDLING-V1 §7`](CHECK-O4O-MOBILE-AUTH-SESSION-EXPIRY-HANDLING-V1.md)) 육안 확인.
>
> 주의: `npx expo start` 는 반드시 `services/mobile-app` 디렉터리에서 실행(독립 프로젝트). root 에서 실행하면 워크스페이스 컨텍스트로 동작하지 않음.

---

## 9. What Was Not Changed

- ✅ 웹/hosted React 19.2.0 · root `pnpm.overrides` · root `.npmrc` 무변경
- ✅ backend / API / DB / migration / entity / Product Core 무변경
- ✅ 상품 수집 기능 · 이미지 업로드 · 카메라/바코드/OCR 미작업
- ✅ 앱 소스 코드 무변경 (의존성/설정만)

---

## 10. Follow-ups

| # | 항목 | 비고 |
|---|---|---|
| F1 | **사람 실기기 Expo Go smoke** | §8 — Shell UI 12항목 + 세션 만료 동작 |
| F2 | CI: mobile-app 독립 빌드 파이프라인 | 워크스페이스 분리로 root CI 가 mobile 을 더 이상 포함 안 함. 필요 시 별도 expo/eas 워크플로 |
| F3 | `WO-O4O-MOBILE-PRODUCT-IMAGE-UPLOAD-V1` | smoke 통과 후 카메라+GCS |

---

**작성:** O4O Platform Team · 2026-06-21
**상태:** Expo SDK 54 업그레이드 + 워크스페이스 분리 완료. type-check/expo-check/Metro 번들/frozen-lockfile PASS. Expo Go SDK mismatch 해소 → 실기기 smoke 가능.
