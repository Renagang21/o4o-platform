# CHECK — WO-O4O-GLOBAL-HEADER-REGISTER-CONTRACT-AND-PRODUCTION-VALIDATION-V1

- **작업일**: 2026-08-14
- **범위**: 공통 `GlobalHeader` 회원가입 경로 계약 정정 + 공식 4서비스 프로덕션 헤더·메뉴·푸터 최종 검증
- **결과**: PASS — 헤더·메뉴·푸터 공통화 **production baseline 완료**
- **선행**: [WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1](WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1-CHECK.md)

---

## 1. 조사 — 계약 결함 확정

`packages/ui/src/layout/GlobalHeader.tsx`

| 블록 | 이전 | 문제 |
|---|---|---|
| desktop | `<Link to="/register" onClick={onRegister}>` | Link 이동이 콜백보다 우선. 서비스 중립 헤더가 특정 경로를 알고 있음 |
| mobile | `<button onClick={onRegister}>` | 이미 올바른 계약 |

동일 컴포넌트 안에서 desktop 과 mobile 의 계약이 서로 달랐다.

### 소비처별 실제 영향 (조사 결과)

| 서비스 | 주입값 | 이전 실제 동작 | 정정 후 |
|---|---|---|---|
| KPA-Society | `openRegisterModal` | `/register` 이동 → `RegisterRoute` shim 이 모달 오픈 (URL 왕복) | 모달 즉시 오픈, 이동 없음 |
| Neture | `openRegisterModal` | `/register` 이동 → `RegisterRedirect` shim 이 모달 오픈 후 `/` 로 redirect | 모달 즉시 오픈, 이동 없음 |
| K-Cosmetics | `navigate('/register')` | `/register` → `RegisterPage` | 동일 (`RegisterPage`) |
| GlycoPharm | `openRegisterModal` | `/register` → `Navigate to="/"` (동작 모호) | 모달 오픈으로 확정 |
| Pharmacy-Hub | (미주입 — 우회) | `/register` route 없음 → **데드링크**. nav 항목으로 우회 중이었음 | 표준 버튼 → `/join` |

기존 `/register` 라우트(shim 포함)는 외부 링크·북마크 호환을 위해 **그대로 유지**했다.

## 2. 변경

- `packages/ui/src/layout/GlobalHeader.tsx` — desktop 회원가입 `<Link to="/register">` → `<button onClick={onRegister}>` (스타일 동일). `onRegister` prop 주석에 "경로는 서비스가 결정한다" 계약 명시
- `services/web-pharmacy-hub/src/components/PharmacyHubGlobalHeader.tsx` — 우회로 넣었던 public nav `가입 신청` 항목 제거, `onRegister={() => navigate('/join')}` 표준 버튼으로 정렬

KPA-Society · K-Cosmetics · Neture · GlycoPharm 서비스 코드는 **무변경**(공통 계약 정정만으로 각자 의도한 동작이 성립).

## 3. typecheck / build / CI

- `pharmacy-hub-web type-check` PASS
- build PASS — `kpa-society-web` · `k-cosmetics-web` · `neture-web` · `pharmacy-hub-web` (+ 소비처 `glycopharm-web`)
- CI Pipeline (`32730cd79`) PASS · Deploy Web Services (Cloud Run) PASS
- `packages/**` 변경이므로 detect-changes 가 전 web 서비스 재배포로 판정 (workflow §"shared packages changed → rebuild all")

## 4. 프로덕션 검증 — 공개 화면 (Playwright · desktop 1440×900 / mobile 390×844)

| 서비스 | 도메인 | 라우트 | header | footer | 404 | "준비 중" | JS 예외 |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | kpa-society.co.kr | `/` `/login` | 1 | O | 0 | 0 | 0 |
| K-Cosmetics | k-cosmetics.site | `/` `/login` `/service-guide` | 1 | O | 0 | 0 | 0 |
| Neture | neture.co.kr | `/` `/login` | 1 | O | 0 | 0 | 0 |
| Pharmacy-Hub | pharmacyhub.co.kr | `/` `/login` `/join` `/join/status` `/forum` | 1 | O | 0 | 0 | 0 |

모든 라우트는 **직접 URL 진입**으로 확인 → deep link · 새로고침 동시 검증.

### 회원가입 버튼 계약 (프로덕션 실측)

| 서비스 | `<a>` 하드코딩 | desktop 클릭 결과 | mobile 클릭 결과 |
|---|:---:|---|---|
| KPA-Society | **0** | URL `/` 유지 + 모달 오픈 | 동일 |
| K-Cosmetics | **0** | `/register` (RegisterPage) | 동일 |
| Neture | **0** | URL `/` 유지 + 모달 오픈 | 동일 |
| Pharmacy-Hub | **0** | `/join` | 동일 |

**공통 헤더 내부 `/register` 하드코딩에 의한 dead link 0.** 로그인 버튼도 4서비스 모두 정상.

### 헤더·푸터 내부 링크 데드링크 점검 (실제 진입 후 NotFound 판정)

| 서비스 | 점검 링크 | 데드링크 |
|---|---|:---:|
| KPA-Society | `/` `/service-guide` `/about` `/contact` `/guide/intro` `/policy` `/privacy` | 0 |
| K-Cosmetics | `/` `/service-guide` `/contact` `/register` `/terms` `/privacy` | 0 |
| Neture | `/` `/guide` `/contact` | 0 |
| Pharmacy-Hub | `/` `/forum` `/join` `/join/status` | 0 |

## 5. 프로덕션 검증 — 역할 로그인

| 계정 / 역할 | 컨텍스트 메뉴 | 역할 셸 header/footer | JS 예외 |
|---|---|---|:---:|
| `renagang21@gmail.com` · `pharmacy-hub:store_owner` | `['/', '/forum', '/store-hub', '/store-owner']` | `/store-hub` `/store-owner` `/store-owner/account` header 1 · footer X(의도) | 0 |
| `sohae2100@gmail.com` · `pharmacy-hub:operator` | `['/', '/forum', '/store-hub', '/operator']` (내 약국 미노출 = 의도) | `/store-hub` `/operator` `/operator/memberships` header 1 · footer X | 0 |
| `sohae2100@gmail.com` · `kpa-society` 운영자 | `['/', '/store', '/store-hub', '/service-guide', '/about']` | `/operator` header 1 | 0 |

## 6. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
(선행 CHECK 가 제안한 `GlobalHeader` `/register` 하드코딩 건은 **본 WO 에서 해소**)

## 7. 제외 범위 (WO 명시 · 미수행)

- Pharmacy-Hub 법적 프로필(`footer-legal`) 데이터 등록 — 미등록 시 비표시 정책 그대로 유지
- admin 전용 업무 화면 기능 검증
