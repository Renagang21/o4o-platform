# CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-UI-SMOKE-V1

> 모바일 상품 수집 앱 Shell 의 **UI 육안 smoke** 시도 및 코드 레벨 감사 보고.
>
> WO: `WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-UI-SMOKE-V1`
> 선행: [`CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1`](CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1.md)
> 작성일: 2026-06-21
> 상태: ⚠️ **DEVICE VISUAL SMOKE = NOT RUN (환경 제약)** · 코드 레벨 감사 = PASS · 코드 변경 없음

---

## 0. 판정 (먼저 읽을 것)

> **본 WO 의 핵심 산출물인 "에뮬레이터/디바이스 육안 smoke" 는 이 환경에서 실행하지 못했다.**
> 따라서 화면 동작에 대한 "PASS" 를 선언하지 않는다. 대신 (1) 환경 제약을 명시하고, (2) 12개 점검 항목을 **코드 경로 정적 감사**로 대체 검증하고, (3) 사람이 실제 기기에서 수행할 runbook 을 제공한다.

| 구분 | 결과 |
|---|---|
| 디바이스/에뮬레이터 육안 smoke | ⛔ **NOT RUN** — Android 툴체인 부재 (아래 §1) |
| 코드 경로 정적 감사 (12 항목) | ✅ PASS (구조적 결함 없음, §3) |
| 발견된 런타임 리스크 | 1건 — 토큰 만료(~15분) 미처리 (§4 R1), **이번 WO 미수정 권고** |
| 코드 변경 | 없음 (smoke 전용 — 보정 불필요/미검증 보정 지양) |

---

## 1. 환경 제약 (육안 smoke 불가 사유)

이 작업 환경(Windows, Claude Code)에서 Android 앱을 실제 구동·관찰할 수단이 없다. 실측:

```text
adb            : NOT FOUND
ANDROID_HOME   : (empty)
ANDROID_SDK_ROOT: (empty)
emulator       : NOT FOUND
java           : NOT FOUND
node_modules/expo-router : MISSING (의존성 미설치)
```

- **에뮬레이터/디바이스 부재** → 화면 렌더·터치·키보드·back 동작을 관찰 불가.
- **의존성 미설치** → 헤드리스 Metro 번들(`expo export`)조차 `pnpm install` 선행 필요 → `pnpm-lock.yaml` 변경 위험(WO §11 금지) → **시도하지 않음**.
- `expo start --web` 폴백도 부적합: 앱은 `platforms:["android"]` 전용이고 `expo-secure-store` 는 web 미지원이라 `AuthContext` 가 즉시 throw → 실제 Android 동작을 대표하지 못함.

> 결론: 육안 smoke 는 **사람이 실기기/에뮬레이터에서 수행**해야 한다 (§5 runbook).

---

## 2. 검증 방법 (대체)

`tsc --noEmit` (Shell WO 에서 0 errors) + 프로덕션 API e2e(Shell WO 에서 PASS) 는 이미 확보됨. 본 문서는 그 위에 **화면 흐름의 코드 경로**를 12개 항목 기준으로 정적 감사한다. (런타임 렌더/픽셀/제스처는 감사 대상 외 — 사람 육안 몫.)

---

## 3. 12개 점검 항목 — 코드 경로 정적 감사

| # | 항목 | 코드 경로 | 정적 판정 | 사람 육안 필요 |
|---|---|---|:---:|---|
| 1 | 로그인 + SecureStore 토큰 복원 | `AuthContext.restoreToken`(mount), `login()` 저장, `setAuthToken` | ✅ 경로 정상 | 입력→복원 실제 동작 |
| 2 | 홈 화면 진입 | `(app)/index.tsx`, `(app)/_layout` 토큰 가드 | ✅ | 렌더/레이아웃 |
| 3 | 수집 시작 진입 | `index→router.push('/collect')`, `collect/index.tsx` | ✅ | 전환 |
| 4 | 기본 정보 입력 | `collect/new.tsx` 7필드 | ✅ | 입력/포커스 |
| 5 | 필수값 검증 | `buildPayload` — 상품명·바코드 둘 다 비면 Alert + return | ✅ 로직 확인 | Alert 표출 |
| 6 | 임시저장 / 제출 | `handleSaveOnly`(create), `handleSubmit`(create→submit) | ✅ | 버튼/로딩/이동 |
| 7 | 제출 완료 문구 | `collect/done.tsx` — "제출되었습니다 …" (금지문구 미사용) | ✅ 문구 확인 | 화면 표출 |
| 8 | 내 제출 목록 | `drafts/index.tsx` — `useFocusEffect`+`listDrafts`, pull-to-refresh, empty state | ✅ | 목록/새로고침 |
| 9 | 제출 상세 | `drafts/[id].tsx` — `useLocalSearchParams<{id}>`, `getDraft` | ✅ param 처리 확인 | 상세 표출 |
| 10 | Android back | Stack; `done` 은 `replace` 로 진입(폼 재진입 방지), `headerBackVisible:false` | ✅ 흐름 안전 | 하드웨어 back 실제 |
| 11 | 키보드/스크롤/버튼 가림 | `KeyboardAvoidingView`(iOS padding) + `ScrollView keyboardShouldPersistTaps` | ⚠️ 구조 OK | **Android 키보드 가림 실측 필요** |
| 12 | console/error log | — | ⛔ 런타임 전용 | 실행 로그 관찰 |

> 11번: Android 는 `behavior=undefined` 로 OS `adjustResize` 에 의존(Expo 기본). 코드상 문제는 없으나 **입력 필드가 키보드에 가리는지** 는 실기기에서만 확정 가능.

---

## 4. 발견된 런타임 리스크

### R1 — 토큰 만료(~15분) 미처리 (실재, 이번 WO 미수정 권고)

- accessToken 은 `Max-Age=900`(15분). `restoreToken` 은 저장 토큰을 **만료 검사 없이** 복원 → 토큰 존재로 간주 → 홈 진입.
- 만료된 토큰으로 첫 API 호출 시 **401** 이 나지만, 클라이언트에 **401 인터셉터/로그아웃 유도가 없다** → "로그인된 듯 보이나 모든 호출이 401" 상태로 갇힐 수 있음.
- `AuthContext` 주석에 이미 "향후: Refresh Token 자동 갱신" 으로 인지된 영역.
- **권고: 본 smoke WO 에서 blind 수정하지 않는다.** 401→logout 인터셉터나 refresh 플로우는 디바이스 검증을 동반한 별도 소형 WO(`WO-O4O-MOBILE-AUTH-TOKEN-REFRESH-V1`)로 분리. (검증 불가한 인증 로직을 무검증 추가하면 logout 루프 등 신규 결함 위험.)

> 그 외 12개 항목에서 코드 레벨 결함은 발견되지 않았다. 따라서 이번 WO 는 코드 변경 없이 종료한다.

---

## 5. 사람 육안 smoke Runbook (실기기/에뮬레이터)

Android SDK + 에뮬레이터(또는 Expo Go 설치된 실기기)가 있는 환경에서:

```bash
cd services/mobile-app
pnpm install            # 최초 1회 (워크스페이스 루트에서 이미 설치됐다면 생략 가능)
npx expo start          # QR → Expo Go(실기기) 또는 a(에뮬레이터)
```

확인 순서(§3 항목 1~12):

```text
1. 로그인(SSOT 계정) → 홈 진입 / 앱 재시작 시 토큰 복원되어 홈 유지
2. 홈 → '상품 수집 시작'
3. → '신규 상품 정보 제출 시작'
4. 상품명/바코드 모두 비우고 제출 → "상품명 또는 바코드 중 하나" Alert
5. 상품명 입력 → '제출하기' → 완료 화면 문구 확인
6. 완료 → '내 제출 목록' → 방금 항목 'submitted' 표시
7. 항목 탭 → 상세(판매원/수입원/규격 표시)
8. '임시 저장' 경로: 입력 → 임시저장 → 목록 'draft' → 상세 '제출하기'
9. 목록 pull-to-refresh
10. 각 화면 Android 하드웨어 back
11. 입력 화면 키보드가 '제출하기' 버튼/필드를 가리지 않는지
12. Metro 콘솔에 red box / warning 없는지
```

> 계정: `docs/local/TEST-ACCOUNTS.local.md` (SSOT). 제출 시 disposable 데이터는 상세/목록에서 확인 후 운영자 검토 큐에 노이즈가 되지 않도록 `[SMOKE]` 표기 권장(아카이브 API 는 현재 UI 미노출).

---

## 6. What Was Not Changed / Not Done

- ⛔ 디바이스 육안 smoke 미실행 (환경 제약) — PASS 미선언
- ✅ 코드 변경 없음 (backend/entity/migration/native/`pnpm-lock.yaml` 전부 무변경)
- ✅ 이미지/OCR/바코드 스캔/AI/convert-to-candidate 미구현·미호출 유지
- ✅ R1(토큰 만료) 무검증 보정 지양 — 별도 WO 로 분리

---

## 7. Follow-ups

| # | 항목 | 비고 |
|---|---|---|
| F1 | **사람 육안 smoke** (§5 runbook) | Android 툴체인/Expo Go 보유 환경에서 12항목 확인 |
| F2 | `WO-O4O-MOBILE-AUTH-TOKEN-REFRESH-V1` | R1 — 401 인터셉터 또는 refresh 플로우(디바이스 검증 동반) |
| F3 | `WO-O4O-MOBILE-PRODUCT-IMAGE-UPLOAD-V1` | Shell 안정 확인 후 카메라+GCS |

---

**작성:** O4O Platform Team · 2026-06-21
**상태:** ⚠️ 디바이스 육안 smoke NOT RUN(환경 제약) · 코드 레벨 감사 PASS · 코드 변경 없음. 다음: 사람 육안 smoke(F1) → 미통과 시 보정, 통과 시 이미지 업로드(F3).
