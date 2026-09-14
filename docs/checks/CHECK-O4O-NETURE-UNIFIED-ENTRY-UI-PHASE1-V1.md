# CHECK-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1

> **WO**: `WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1`
> **선행 IR**: `IR-O4O-NETURE-UNIFIED-ENTRY-AUTH-SERVICE-MEMBERSHIP-ROUTING-AUDIT-V1` (판정 `UI_FIRST_WITH_MINIMAL_FIX`)
> **상태**: 구현 + 정적 · 단위 검증 = **PASS** · 프로덕션 실 화면 검증 = **§7 참조 (배포 후 갱신)**
> **작성일**: 2026-09-14
> **성격**: Neture 대표 홈(`/`) 로그인 후 개인화 + 서비스 이동(handoff) 수신 정합 + 대표 진입 로그인 예외(로그인 허용만). 새 SSO · 범용 권한 엔진 · DB migration · 회원 데이터 변경 **0**.

---

## 0. 한 줄 요약

`neture.co.kr` 홈이 로그인 사용자에게 **접근 가능한 업무 화면 · 이용 중 서비스 · 가입/이용 상태 · 가입 가능 서비스**를 보여주고, 다른 서비스로는 **기존 세션 인계(`POST /auth/handoff`)** 로 이동한다. 다른 O4O 서비스 회원은 Neture 가입 없이도 대표 홈에 **로그인만** 할 수 있다(권한 · 가입 부여 없음). 수신 측 `/handoff` 가 없던 PharmacyHub · KPA 분회에 추가하고, Neture · K-Cosmetics 수신 페이지의 토큰 저장 · 응답 처리 결함을 고쳤다.

---

## 1. 변경 파일

### Backend (`apps/api-server`)
| 파일 | 변경 |
|---|---|
| `src/config/service-catalog.ts` | `REPRESENTATIVE_ENTRY_SERVICE_KEY = 'neture'` 추가 · 헤더 주석의 "(향후)" handoff 표기 갱신 |
| `src/services/auth/auth-login.service.ts` | serviceKey 가 대표 진입(neture)이고 neture membership 이 없어도 **다른 서비스 membership row 가 하나라도 있으면** 로그인 허용. membership · role 생성 없음. 비밀번호는 기존 dual-read(neture credential 없음 → `users.password`) 그대로 — 복사 · 별도 저장 없음 |
| `src/modules/auth/controllers/handoff.controller.ts` | `generateHandoff` 에 `returnPath`(상대 경로 · 1~512자 · `//`·`/\`·제어문자 거부, 위반 시 400 `VALIDATION_ERROR`) → `targetUrl` 에 `&returnTo=` 부가. `getServices` 응답에 `nameKo` · `basePath` 추가(additive) |
| `src/routes/neture/controllers/neture-home-entry.controller.ts` (신규) | `GET /api/v1/neture/home/entry` — `requireAuth` 만. 요청자 본인의 active membership + `{prefix}:store_owner` role + 기존 `findStoreOrganizationCandidates` 로 **매장 전부 나열**(자동 선택 없음) · `branch_memberships(active)⋈kpa_organizations` 로 내 분회(slug · name) |
| `src/routes/neture/neture.routes.ts` | `router.use('/home', …)` 배선 |
| `src/services/auth/__tests__/representativeEntryLoginContract.test.ts` (신규) | 대표 진입 로그인 계약 6 케이스 |

### Frontend
| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/home-entry.ts` (신규) | `useHomeEntry`(`/auth/services` + `/neture/home/entry` 병렬 조회 · 실패 시 error) · `openServiceEntry`(handoff → `targetUrl` 이동) · `buildHomeEntryModel`(주요 업무 / 이용 서비스 / 상태 / 가입 가능 판정) |
| `services/web-neture/src/components/home/HomeEntryPanel.tsx` (신규) | 로그인 후 개인화 영역 UI (로딩 · 오류+재시도 · 정상 · 빈 상태) |
| `services/web-neture/src/pages/O4OHomePage.tsx` | 로그인 후 pill → `HomeEntryPanel`. 로그인 전 O4O 소개 문구 + 로그인 · 회원가입 버튼 + 공개 안내 pill 유지. AI 입력 · 작업 수행 영역 불변 |
| `services/web-neture/src/pages/HandoffPage.tsx` | 응답 body 토큰을 `storeTokens`(localStorage SSOT key)로 저장 · `returnTo` 처리 · 오류 코드별 문구 |
| `services/web-k-cosmetics/src/pages/HandoffPage.tsx` | 동일 (응답 처리 결함 수정) |
| `services/web-pharmacy-hub/src/pages/HandoffPage.tsx` (신규) + `App.tsx` `/handoff` route | 수신 페이지 신설 |
| `services/web-kpa-branch/src/pages/HandoffPage.tsx` (신규) + `App.tsx` `/handoff` route (custom-domain · platform 양쪽) | 수신 페이지 신설 · `detectBasename()` 으로 `/kpa` prefix 처리 |
| `services/web-kpa-society/src/pages/HandoffPage.tsx` | `returnTo` 처리 추가 (기존 fetch · 저장 로직 유지) |

**미변경(의도)**: 각 서비스의 서버 guard · RoleGuard · 회원 데이터 · 로그인 API contract(serviceKey 필수 유지) · 기존 서비스 화면/도메인.

---

## 2. Neture 대표 진입 로그인 처리 (§4 제약 대조)

| 제약 | 처리 |
|---|---|
| 로그인 허가를 다른 서비스 승인에 묶지 않는다 | 다른 서비스 membership **row 존재**만 본다(status 무관 — 기존 서비스 로그인의 row 규칙과 동일). 승인(active) 여부는 각 서비스 guard 가 판정 |
| 공급자 · 파트너 · 운영자 role 자동 부여 금지 | 로그인 경로에서 `assignRole` · membership `save` 호출 0 (테스트 6 으로 고정) |
| 기존 비밀번호 복사 · 별도 저장 금지 | neture credential 이 없으면 기존 dual-read 가 `users.password`(identity password)로 검증. 다른 서비스의 서비스 전용 비밀번호는 사용되지 않음(테스트 2) |
| 인증 검사를 단순 제거하지 않는다 | `SERVICE_NOT_MEMBER` 규칙은 유지, **neture 에 한해** "다른 O4O 서비스 회원" 조건이 추가된 것 |
| 새 SSO · 범용 권한 엔진 · 대규모 회원 데이터 변경 금지 | 없음 |

---

## 3. "가입 가능" 판정 근거 (§3)

`joinEnabled=true` 만으로 노출하지 않는다. 아래 세 조건을 모두 만족할 때만 "가입 가능한 서비스" 에 나열한다.

1. 해당 서비스 membership row 가 **없음** (`/auth/services` `membership === null`)
2. `joinEnabled === true`
3. 프론트에 **가입 경로가 확인된 서비스** — Neture `/register`, KPA `/register`, PharmacyHub `/join`, K-Cosmetics `/register`

`kpa-branch`(joinEnabled=false, 분회 운영자 승인 경로만) · `cafe24-b2b`(O4O 로그인 회원 대상 아님) 는 노출하지 않는다. 가입 링크는 서비스별 기존 경로로 가는 **공개 링크**(handoff 없음)다.

## 4. 주요 업무 · 상태 매핑

| 항목 | 노출 조건 | 이동 |
|---|---|---|
| 커뮤니티 | Neture(항상, 공개) · KPA · PharmacyHub(active) | Neture `/community` 내부 / 타서비스 handoff `returnPath=/` |
| 매장 HUB · 내 매장 | 서비스 active + `{prefix}:store_owner` + 매장 후보 존재 | handoff `/store-hub` · KPA `/store` · PH `/store-owner` · KCos `/store`. **복수 매장은 이름을 전부 나열하고 선택은 서비스 화면에 맡긴다** |
| 공급자 · 파트너 | Neture active(또는 platform:super_admin) + `SUPPLIER_ACCESS_ROLES` / `PARTNER_ONLY_ROLES` | `/supplier/dashboard` · `/partner/dashboard` (RoleGuard 와 같은 상수) |
| 서비스 운영자 화면 | `{prefix}:operator|admin` + 해당 서비스 active · platform:super_admin → Neture `/admin` · 분회 운영자 → `/{slug}/operator/site` | 내부 Link / handoff |
| 내가 이용하는 서비스 | `active` membership | handoff (분회 회원은 자기 분회 `/{slug}`, slug 없으면 `/me`) |
| 가입 · 이용 상태 | `pending · suspended · rejected · withdrawn` | 문구 + 허용된 안내 링크만(Neture pending → `/register/pending`, PH pending/rejected → 공개 `/join/status`, rejected+가입 경로 → 재신청). suspended · withdrawn 은 링크 없음 |
| 조회 실패 | `/auth/services` 또는 `/neture/home/entry` 실패 | **미가입으로 표시하지 않음** — 오류 문구 + "다시 불러오기" + 공개 안내 pill 대체 |

---

## 5. 정적 · 단위 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `npx tsc --noEmit` | PASS (exit 0) |
| `apps/api-server` `npx jest src/services/auth/__tests__` | **4 suites / 29 tests PASS** (신규 6 포함) |
| `services/web-neture` `npx tsc --noEmit` | PASS |
| `services/web-neture` `npx vite build` | PASS (chunk 크기 경고는 기존과 동일) |
| `services/web-neture` eslint (변경 4 파일) | 경고 · 오류 0 |
| `web-k-cosmetics` · `web-pharmacy-hub` · `web-kpa-branch` · `web-kpa-society` `npx tsc --noEmit` | PASS |

신규 테스트 `representativeEntryLoginContract.test.ts` 가 고정하는 사실:
1. neture membership 없음 + kpa-society 회원 → neture 로그인 성공 (identity password)
2. 다른 서비스 전용 비밀번호는 neture 로그인에 쓰이지 않음 (`INVALID_CREDENTIALS`, credential 조회는 `neture` 만)
3. 아무 membership 도 없음 → `SERVICE_NOT_MEMBER`
4. 다른 서비스 membership 이 pending / withdrawn 이어도 row 가 있으면 로그인 허용
5. 예외는 neture 에만 — neture 만 가입된 계정의 kpa-society 로그인은 `SERVICE_NOT_MEMBER`
6. 예외 경로에서 membership save · assignRole 호출 0

---

## 6. 보안 · 데이터 원칙 대조

- 토큰 · 개인정보 로그 출력: 신규 코드에 없음 (HandoffPage · home-entry · controller 모두).
- `returnPath` 는 상대 경로만 허용(서버 검증 + 수신 페이지 `resolveReturnTo` 이중) → open redirect 차단.
- `GET /neture/home/entry` 는 요청자 본인 데이터만(`user.id` 파생). GET 으로 상태 변경 없음.
- 운영 회원 상태 · 역할 임의 변경: 없음.

---

## 7. 프로덕션 실 화면 검증

> 코드가 배포되기 전에는 실 화면 확인이 불가하다. 본 절은 **배포 후** 갱신한다. 갱신 전까지 아래 전 항목은 **미검증**이다.

| # | 시나리오 (WO §7) | 결과 |
|---|---|---|
| 1 | 비로그인 홈 (소개 · 안내 pill · 로그인/회원가입) | 미검증 |
| 2 | PharmacyHub 만 승인된 회원 | 미검증 |
| 3 | PharmacyHub + KPA + 분회 승인 회원 | 미검증 |
| 4 | 화장품 매장 회원 | 미검증 |
| 5 | 서비스 운영자 | 미검증 |
| 6 | 신청 중 · 정지 · 미가입 상태 | 미검증 |
| 7 | 매장 없음 · 복수 매장 | 미검증 |
| 8 | 다른 서비스 회원의 Neture 홈 로그인 | 미검증 |
| 9 | handoff 이동 후 세션 유지 · 도착 화면 | 미검증 |
| 10 | 만료 · 실패 handoff 문구 | 미검증 |
| 11 | 직접 URL · API 권한(서버 최종 판정) | 미검증 |
| 12 | 데스크톱 · 모바일 | 미검증 |
| 13 | 로딩 · 오류 · 빈 상태 | 미검증 |
| 14 | 공급자 · 파트너 · 운영자 · AI 입력 회귀 | 미검증 |

---

## 8. 범위 밖 발견 (보고만)

- `docs/rbac` RBAC 카탈로그에 GlycoPharm 잔재 (IR 에서 기록) — 별도 WO 후보.
- web-kpa-branch 에 `operator` index route 가 없어 분회 운영자 진입은 `operator/site` 로 보냈다. index route 신설은 분회 IA 영역이라 이번 범위 밖.

---

*문서 정합: 발견 1건(service-catalog 헤더 주석 "(향후)" — 코드 주석이라 인라인 갱신) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
