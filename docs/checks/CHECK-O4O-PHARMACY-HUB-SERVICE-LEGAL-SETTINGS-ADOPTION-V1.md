# CHECK-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1

- **WO**: `WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1`
- **성격**: 기존 공통 기능 채택 (신규 체계 신설 아님)
- **작성일**: 2026-08-18
- **기준 브랜치**: `main`

---

## 1. 기존 공통 구조 (조사)

법정정보 관리는 이미 **공통 컴포넌트 + 공통 backend 계약** 으로 존재한다. 서비스별로 있는 것은 얇은 wrapper 뿐이다.

| 계층 | 위치 |
|---|---|
| 공통 UI | `packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx` (437줄, 3탭) |
| 공통 타입/어댑터 계약 | 같은 디렉터리 `types.ts` — `ServiceLegalApi` 6 메서드 |
| backend admin API | `apps/api-server/src/modules/service-legal/admin-service-legal.controller.ts` (mount `/api/v1/admin/services`) |
| backend public API | `public-service-legal.controller.ts` (mount `/api/v1/public/services`) |
| 권한 guard | `service-legal-scope.ts` → `requireServiceLegalScope` |

### 4서비스 wrapper 비교

| 서비스 | wrapper 경로 | route | serviceKey | http 어댑터 | 탭 |
|---|---|---|---|---|---|
| Neture | `pages/admin/ServiceLegalSettingsPage.tsx` | `/admin/settings/legal-terms` | `neture` | `lib/apiClient` (`api`) | 전체 3 |
| GlycoPharm | 동일 경로 | `admin/settings/legal-terms` | `glycopharm` | 동일 | 전체 3 |
| K-Cosmetics | 동일 경로 | `admin/settings/legal-terms` | `k-cosmetics` | 동일 | 전체 3 |
| KPA-Society | 동일 경로 | `admin/settings/legal` | `kpa-society` | `coreApiClient` (KPA `api`는 `/api/v1/kpa` prefix라 사용 불가) | **`['profile']` 부분 노출** |

→ **서비스 측 구현은 "serviceKey + api 어댑터 주입" 이 전부**이며, KPA 선례대로 `enabledTabs` 로 탭 범위를 줄이는 것이 이미 지원되는 계약이다.

### 필수/선택 필드

`ServiceLegalProfileInput` 16 필드 전부 **선택**이다. 백엔드가 빈 문자열을 `null` 로 정규화하며 placeholder seed 를 하지 않는다(`normalizeStr`). 필수 항목 강제는 없다.

---

## 2. PharmacyHub 적용 방식

`services/web-pharmacy-hub` 에 **wrapper 1개 + 라우트 1줄 + 메뉴 1줄 + capability 1개**만 추가했다. 다른 서비스 화면을 복사한 별도 대형 페이지를 만들지 않았다.

- 공통 컴포넌트/공통 패키지 **수정 0건** → 기존 4서비스 회귀는 구조적으로 발생할 수 없다(§9).
- backend **수정 0건** — 직전 WO(`...LEGAL-SERVICE-SCOPE-AND-FOOTER-404-FIX-V1`)에서 `pharmacy-hub` 가 이미 `SUPPORTED_LEGAL_SERVICE_KEYS` + `CONFIG_BY_SERVICE_KEY` 에 연결돼 있어 admin API 도 그대로 동작한다.
- `@o4o/operator-core-ui` 는 이미 `package.json` dependency + `Dockerfile` COPY 대상이라 빌드 계약 변경도 없다.

### 탭 범위 결정 — `enabledTabs={['profile', 'status']}`

PharmacyHub 에는 정책문서 공개 route(`/terms` · `/privacy`)가 **없다**(`config/navigation.ts` 의 푸터 SSOT 에도 없음). 정책문서를 게시해도 공개 화면이 존재하지 않으므로 `policies` 탭을 열지 않았다 — CLAUDE.md §1 "route 없는 메뉴는 노출하지 않는다(데드링크 0)". KPA 가 이미 쓰는 기존 prop 이며 공통 컴포넌트에 서비스 분기를 넣지 않았다.

---

## 3. route / menu

```text
route :  /operator/settings/legal   (OperatorLayoutWrapper 하위 · App.tsx)
menu  :  system 그룹 → '법정정보 설정'  (config/operatorMenuGroups.ts)
capability : OperatorCapability.SETTINGS 활성화 (config/operatorCapabilities.ts)
domain IA  : system → 'common'(운영 공통) — 기존 매핑 그대로, 변경 없음
```

PharmacyHub 는 `/admin` 영역이 없고 운영자 셸(`/operator`)만 있으므로 다른 서비스의 `/admin/settings/*` 대신 운영자 셸 하위에 둔다. `system` 그룹은 `DomainIASidebar` 의 capability gate 때문에 `SETTINGS` 활성화가 필요했고, 이 그룹의 실재 항목은 이번 1건뿐이다.

---

## 4. 권한

**권한 모델을 변경하지 않았다** (auth / membership / role / scope config 파일 수정 0건).

| 동작 | 요구 권한 | 강제 지점 |
|---|---|---|
| 법정정보 조회 (GET) | `pharmacy-hub:operator` 이상 | backend `requireServiceLegalScope` |
| 법정정보 저장 (PUT) | `pharmacy-hub:admin` | 동일 |
| 공개 footer 조회 | 인증 불필요 (기존 계약 유지) | `public-service-legal.controller` |
| store_owner / 일반 사용자 | **관리 API 접근 불가** | 동일 guard (default DENY) |

메뉴를 `adminOnly` 로 숨기지 않은 이유: backend 조회 권한이 operator 이상이므로 operator 도 정상적으로 열람할 수 있다. 저장 권한만 admin 이며 이는 backend 403 + 화면 메시지로 처리한다(프론트에서 이중 판정하지 않는다).

---

## 5. 조회 / 저장 API

```text
GET  /api/v1/admin/services/pharmacy-hub/legal-profile      조회 (미설정 시 data: null)
PUT  /api/v1/admin/services/pharmacy-hub/legal-profile      upsert
GET  /api/v1/public/services/pharmacy-hub/footer-legal      공개 반영 확인
```

프론트 어댑터는 Neture/GlycoPharm 과 동일한 `api.get/put` + status→문구 매핑이다.

---

## 6. 실데이터 E2E (정규 API · DB 직접 write 0)

프로덕션 `https://pharmacyhub.co.kr` · 실 브라우저(Playwright) · 계정 `sohae2100@gmail.com`
(roles: `pharmacy-hub:operator` + `pharmacy-hub:admin`) · 2026-08-18 KST.

**DB 직접 write 0건.** 모든 write 는 화면 → `PUT /api/v1/admin/services/pharmacy-hub/legal-profile` 만 사용했다.
**법적 문구를 작성하지 않았다** — 전 항목 `[E2E_TEST]` 로 명시한 검증용 값만 사용하고 정규 API 로 원복했다.

| # | 단계 | 요청 | 결과 |
|:--:|---|---|:---:|
| 1 | 최초 조회 | `GET .../legal-profile` | **200** `data: null` → 빈 폼 렌더 (empty 상태 정상) |
| 2 | 저장 | `PUT .../legal-profile` (상호·대표자명·주소·문의이메일 = `[E2E_TEST]…`) | **200** · "법정정보가 저장되었습니다." |
| 3 | 재조회 | 페이지 새로고침 후 input value 실측 | 저장값 **4/4 동일** |
| 4 | 수정 반영 | 상호 → `[E2E_TEST] 파머시허브 검증상호 R2` 저장 | **200** · public API 즉시 반영 확인(§8) |
| 5 | 원복 | 전 항목 공백 + 공개 사용(활성) 해제 저장 | **200** · public `data: null` 복귀 |

- 공개 상태 확인 탭: `법정정보 공개 활성 = 활성` / `입력 항목 존재 = 입력 있음` / terms·privacy = `확인 필요`(미게시) 로 정상 표기.
- 음성 케이스(§4 권한)는 `pharmacy-hub:store_owner` 계정으로 별도 확인 — 조회·저장 API 모두 **403**, 화면에 권한 안내 문구 노출.

---

## 7. desktop / mobile 브라우저 검증

| 뷰포트 | 경로 | 렌더 | 저장 | console error | 네트워크 4xx/5xx |
|---|---|:---:|:---:|:---:|:---:|
| desktop 1440×900 | `/operator/settings/legal` | PASS | PASS (§6-2) | **0** | **0** |
| mobile 390×844 | `/operator/settings/legal` | PASS (`scrollWidth 375 ≤ 390`, 가로 스크롤 없음 · 사이드바 drawer 전환) | PASS (§6-4) | **0** | **0** |
| desktop 1440×900 | `/` (공개 푸터) | PASS | — | **0** | **0** |

관리자 경로 네트워크 실측 — 전부 200:

```text
GET  /api/v1/auth/me                                   200
GET  /api/v1/admin/services/pharmacy-hub/legal-profile 200
GET  /api/v1/admin/services/pharmacy-hub/policies      200
PUT  /api/v1/admin/services/pharmacy-hub/legal-profile 200
```

> `policies` 는 탭을 숨겨도 공통 컴포넌트의 "공개 상태 확인"이 소비하므로 호출된다. admin 권한에서 200 이므로 4xx 는 발생하지 않는다.

**완료 기준 대비: dead link 0 / 준비 중 0 / white screen 0 / JS exception 0 / 핵심 API 404·5xx 0 — 모두 충족.**

---

## 8. footer / public 반영

`GET https://api.neture.co.kr/api/v1/public/services/pharmacy-hub/footer-legal`

| 시점 | 응답 | 공개 푸터 |
|---|---|---|
| 저장 전 | 200 `data: null` | 법정정보 영역 비표시 |
| 저장 후 | 200 · `companyName` `representativeName` `businessAddress` `customerServiceEmail` = 입력값 | `[E2E_TEST] 파머시허브 검증상호 \| 대표 [E2E_TEST] 검증대표` / 주소 / 이메일 **렌더 확인** |
| 수정 후 | 200 · `companyName = "[E2E_TEST] 파머시허브 검증상호 R2"` | 수정값 반영 |
| 원복 후 | 200 `data: null` | 법정정보 영역 **비표시로 복귀** |

미입력 항목은 `null` 로 내려가 푸터에 표시되지 않는다 — 기존 공개 계약 그대로다.

### 기존 4서비스 public 회귀 (원복 후 동일 시점)

| serviceKey | 응답 |
|---|---|
| `kpa-society` / `neture` / `glycopharm` / `k-cosmetics` | 전부 **200** `data: null` (WO 이전과 동일) |

---

## 9. 기존 서비스 회귀

| 서비스 | 확인 |
|---|---|
| KPA-Society / K-Cosmetics / GlycoPharm / Neture | 공통 패키지·backend **수정 0건** → 코드 경로 불변. 공개 footer-legal 실측으로 재확인(§8) |
| PharmacyHub | 신규 화면 외 기존 route·메뉴 불변 (`memberships` 등) |

변경 파일은 전부 `services/web-pharmacy-hub/` 하위다.

| 파일 | 변경 |
|---|---|
| `src/pages/operator/ServiceLegalSettingsPage.tsx` | **신설** — 공통 컴포넌트 wrapper |
| `src/App.tsx` | route 1줄 + import + 헤더 주석 |
| `src/config/operatorMenuGroups.ts` | `system` 그룹 메뉴 1건 |
| `src/config/operatorCapabilities.ts` | `SETTINGS` capability 1건 |

---

## 10. 검증

| 항목 | 결과 |
|---|---|
| `web-pharmacy-hub` typecheck (`tsc -b`) | ✅ PASS |
| `web-pharmacy-hub` build (`vite build`) | ✅ PASS (3,686 modules) |
| backend 변경 | 없음 (테스트 대상 아님) |

---

## 11. DB / migration 변경 여부

**0건.** 새 legal schema·migration 없음. 데이터 입력은 전부 정규 admin API(PUT)로만 수행했다. 법적 문구는 작성하지 않았으며 E2E 는 `[E2E_TEST]` 표식 데이터만 사용하고 검증 후 정규 API 로 정리했다(§6).

---

## 12. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

후속 제안: PharmacyHub 공개 정책문서 route(`/terms` · `/privacy`) 신설 시 `policies` 탭 개방 — 별도 WO.
