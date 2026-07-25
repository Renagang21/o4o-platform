# CHECK-O4O-NETURE-SUPPLIER-SIDEBAR-REARCHITECTURE-V1

## 1. 완료 범위

- 공급자 사이드바 정보구조를 운영 축 기준으로 재구성
- 최상위 메뉴 구조를 홈 / 상품 / 콘텐츠 / 유통 / 주문·정산 / 커뮤니티 / 설정으로 정리
- 주문·모집·펀딩·포럼 상세/작성 경로에 대한 활성 상태 처리 보강
- 기존 supplier route 및 /account/supplier/* 경로는 유지

## 2. 최종 최상위 메뉴

- 공급자 홈
- 상품
- 콘텐츠
- 유통
- 주문·정산
- 커뮤니티
- 설정

## 3. 활성 경로 처리

다음 경로에서 하위 메뉴가 활성 상태로 유지되도록 처리했다.

- 주문 상세: /supplier/orders/:id
- 판매자 모집 상세: /supplier/recruitments/:id
- 유통참여형 펀딩 상세·수정: /supplier/market-trial/*
- 공급자 포럼 작성·상세: /supplier/forum/*

## 4. 보존 범위

- 기존 supplier route 삭제: 0
- /account/supplier/* 변경: 0
- 기능 삭제: 0

## 5. 검증

- web-neture build: PASS
- desktop sidebar: 레이아웃/활성 경로 처리 반영 확인 완료(코드 기준)
- mobile drawer: 로그인 차단으로 실제 확인은 미완료
- 브라우저 smoke 시도 결과: 공급자 로그인 단계에서 인증 API CORS 차단으로 화면 진입 실패
- (2026-07-25 갱신) 위 미완료 항목은 프로덕션 환경 브라우저 smoke 로 마감 — **§8 참조**. 로컬 dev 의 CORS 차단은 프로덕션(https://neture.co.kr)에서는 발생하지 않음

## 6. 변경 범위

- frontend-only
- backend 변경: 0
- DB 변경: 0
- migration: 0

## 7. 산출물

- docs/checks/CHECK-O4O-NETURE-SUPPLIER-SIDEBAR-REARCHITECTURE-V1.md
- commit hash: f6e67529c
- main push result: success (origin main)

---

## 8. 프로덕션 브라우저 Smoke 마감 (WO-O4O-NETURE-SUPPLIER-SIDEBAR-PRODUCTION-SMOKE-CLOSEOUT-V1)

### 8-1. 검증 일시 / 환경

- 검증 일시: 2026-07-25 (KST)
- 대상: https://neture.co.kr (프로덕션)
- 도구: Playwright MCP (실 브라우저)

### 8-2. 프로덕션 배포 반영 근거

| 근거 | 값 |
|------|-----|
| 대상 commit | `cc1df4f54` (feat(neture): reorganize supplier sidebar IA) |
| GitHub Actions | `Deploy Web Services (Cloud Run)` — headSha `cc1df4f54`, conclusion **success** |
| job 상세 | `detect-changes` success / `deploy-neture` **success** (k-cosmetics·glycopharm·kpa-society는 skipped — 정상) |
| Cloud Run revision | `neture-web-01308-kxk` (traffic 100%, createdAt 2026-07-25T06:10:26Z, commit push 06:05:49Z 이후) |

→ `cc1df4f54` 프로덕션 반영 확인 완료.

### 8-3. 검증 역할

- Neture 공급자 테스트 계정 (`docs/local/TEST-ACCOUNTS.local.md` 의 "Neture 공급자")
- 로그인 성공 → `/supplier/dashboard` 자동 진입
- **자격정보(아이디/비밀번호) 본 문서 비기재 확인** — 스크린샷 미첨부

### 8-4. Desktop Smoke (1440 × 900) — PASS

최상위 7개 축 확인:

| # | 축 | 렌더 라벨 | 비고 |
|---|-----|-----------|------|
| 1 | 공급자 홈 | 대시보드 | 단일 항목 그룹 → 항목 라벨로 평면 렌더 |
| 2 | 상품 | 상품 | 그룹 |
| 3 | 콘텐츠 | 콘텐츠 | 그룹 |
| 4 | 유통 | 유통 | 그룹 |
| 5 | 주문·정산 | 주문·정산 | 그룹 |
| 6 | 커뮤니티 | 커뮤니티 | 그룹 |
| 7 | 설정 | 공급자 정보 | 단일 항목 그룹 → 항목 라벨로 평면 렌더 |

하위 메뉴 20개 전수 진입 결과 (모두 렌더 정상, 404/빈 화면 0):

| 그룹 | 메뉴 | route | 페이지 heading | 결과 |
|------|------|-------|----------------|:---:|
| 상품 | 상품 목록 | /supplier/products | 내 제품 관리 | PASS |
| 상품 | 상품 등록 | /supplier/products/register | 제품 등록 | PASS |
| 상품 | 대량 등록 | /supplier/products/bulk | 대량 등록 | PASS |
| 상품 | 등록 도우미 | /supplier/products/import-assistant | 내 쇼핑몰 관리자 상품 가져오기 | PASS |
| 콘텐츠 | 제품 콘텐츠 | /supplier/b2b-content | B2B 콘텐츠 관리 | PASS |
| 콘텐츠 | 매장용 설명서 | /supplier/store-descriptions | 매장용 상품 설명서 | PASS |
| 콘텐츠 | 태블렛 | /supplier/tablet-screen-sets | 매장용 태블렛 콘텐츠 | PASS |
| 콘텐츠 | 디지털 사이니지 | /supplier/signage | 디지털 사이니지 | PASS |
| 유통 | 공급 오퍼 | /supplier/supply-offers | 공급 오퍼 | PASS |
| 유통 | 판매자 모집 | /supplier/recruitments | 판매자 모집 현황 | PASS |
| 유통 | 유통참여형 펀딩 | /supplier/market-trial | 내 유통참여형 펀딩 | PASS |
| 유통 | 이벤트 오퍼 | /supplier/event-offers | 이벤트 오퍼 현황 | PASS |
| 주문·정산 | 주문 현황 | /supplier/orders | 공급자 운영 허브 | PASS |
| 주문·정산 | 재고 관리 | /supplier/inventory | 재고 관리 | PASS |
| 주문·정산 | 정산 내역 | /supplier/settlements | 정산 관리 | PASS |
| 주문·정산 | 파트너 수수료 | /supplier/partner-commissions | Partner Commissions | PASS (본문 영문 — 8-9 참조) |
| 커뮤니티 | 공급자 포럼 | /supplier/forum | 공급자 포럼 | PASS |
| 커뮤니티 | 내 포럼 | /supplier/my-forum | 내 포럼 | PASS |
| 설정 | 공급자 정보 | /mypage/business-profile | 사업자 프로필 관리 | PASS |
| 홈 | 대시보드 | /supplier/dashboard | 공급자 AI Copilot | PASS |

기타 desktop 검증 항목:

| 항목 | 결과 |
|------|:---:|
| 사이드바 메뉴 영문 잔존 | 0 (20개 항목 전부 한글) |
| 메뉴 중복 | 0 |
| 데드링크 / 404 / 빈 화면 | 0 |
| 현재 route 그룹 자동 열림 | PASS (전 그룹) |
| 현재 메뉴 활성 표시 | 결함 1건 발견 → 수정 (8-9 참조) |
| 사이드바–본문 겹침 | 없음 |
| 가로 overflow | 없음 (scrollWidth 1425 ≤ 1440) |
| 마지막 메뉴까지 스크롤 도달 | PASS (전 그룹 펼침 시 nav 978px, 페이지 스크롤로 `공급자 정보` 도달 확인) |

### 8-5. Mobile Drawer Smoke (390 × 844) — PASS

| 항목 | 결과 | 근거 |
|------|:---:|------|
| 햄버거 버튼 표시 | PASS | `공급자 메뉴` 버튼, `aria-controls="supplier-sidebar"` |
| 햄버거 클릭 시 drawer 열림 | PASS | left −288 → 0, `aria-expanded` false → true |
| 7개 최상위 축 표시 | PASS | drawer nav 7개 항목 |
| 그룹 펼침 | PASS | 상품 그룹 토글 → 하위 4개 노출 |
| 그룹 접힘 | PASS | 재토글 → 하위 0개 |
| 그룹 토글 시 drawer 유지 | PASS | 토글은 닫지 않음(의도된 동작) |
| 모든 하위 메뉴 접근 | PASS | 전 그룹 펼침 시 20개 링크 노출 |
| 메뉴 클릭 시 이동 + 자동 닫힘 | PASS | `공급 오퍼` 클릭 → /supplier/supply-offers 이동 + left −288 |
| overlay 클릭 닫힘 | PASS | backdrop 노출 영역(x=350) 클릭 → 닫힘 |
| ESC 닫힘 | PASS | Escape → left −288, `aria-expanded` false |
| 현재 route 그룹 자동 열림 | PASS | /supplier/market-trial 진입 시 유통 그룹 열림 |
| 현재 메뉴 활성 표시 | PASS | `유통참여형 펀딩` 활성 |
| drawer 내부 세로 스크롤 | PASS | 전 그룹 펼침 시 scrollHeight 976 > clientHeight 780, 스크롤 후 마지막 `공급자 정보` 표시 |
| 본문–drawer 겹침 이상 | 없음 | drawer z-40 > backdrop z-30 |
| 가로 overflow | 없음 | scrollWidth 390 = viewport 390 |

### 8-6. 태블릿 폭 (768 × 1024) — PASS

- desktop 사이드바 숨김 / 햄버거 노출 (lg 미만 분기 정상)
- drawer 열림, 7축 표시, 현재 route(`/supplier/orders`) 기준 주문·정산 그룹 자동 열림 + `주문 현황` 활성
- 가로 overflow 없음 (scrollWidth 753 ≤ 768)

### 8-7. 상세 Route 활성 검증

실데이터(주문·모집·펀딩·포럼 게시글)가 프로덕션 공급자 계정에 존재하지 않아, **DB 데이터를 생성하지 않고** 존재하지 않는 식별자로 접근하여 사이드바 matcher(경로 기반)만 검증했다.

| route | 그룹 자동 열림 | 활성 메뉴 | 결과 |
|-------|:---:|-----------|:---:|
| /supplier/orders/:id | 주문·정산 | 주문 현황 | PASS |
| /supplier/recruitments/:recruitmentId | 유통 | 판매자 모집 | PASS |
| /supplier/market-trial/:id/edit | 유통 | 유통참여형 펀딩 | PASS |
| /supplier/forum/write | 커뮤니티 | 공급자 포럼 | PASS |
| /supplier/forum/post/:slug | 커뮤니티 | 공급자 포럼 | PASS |

- 실데이터 기반 상세 화면 렌더 검증: **미확인** — 사유: 검증 가능한 대상 데이터 없음 (주문 0건 / 모집 0건 / 펀딩 0건 / 포럼 게시글 0건). 각 경로는 "찾을 수 없습니다" 안내 화면으로 정상 처리됨(빈 화면·크래시 없음).
- `/supplier/market-trial/:id`(수정 아님)는 `/edit` 와 동일 matcher 분기(`startsWith('/supplier/market-trial/')`)를 사용하므로 별도 분기 없음.

### 8-8. 기존 Canonical Route 접근 확인

| route | 직접 URL | 사이드바 진입 | 권한 오류 | 렌더 | /account/supplier/* 강제 이동 |
|-------|:---:|:---:|:---:|:---:|:---:|
| /supplier/orders/:id | OK | OK (주문 현황 경유) | 없음 | OK | 없음 |
| /supplier/inventory | OK | OK | 없음 | OK (재고 관리) | 없음 |
| /supplier/settlements | OK | OK | 없음 | OK (정산 관리) | 없음 |

### 8-9. 발견한 문제와 처리

**[결함 1 — 수정함] `/supplier/products/*` 하위 경로에서 `상품 목록` 중복 활성**

- 증상: `/supplier/products/register`, `/supplier/products/bulk`, `/supplier/products/import-assistant` 진입 시 해당 메뉴와 `상품 목록` 이 **동시에** 활성 표시.
- 원인: `isItemActive` 의 generic fallback `pathname.startsWith(path + '/')`. 사이드바 메뉴 경로 중 `/supplier/products` 만 형제 메뉴 3개의 상위 prefix 이므로 이 항목에서만 충돌 발생.
- 수정: `SupplierSpaceLayout.tsx` `isItemActive` 에 `/supplier/products` 전용 분기 추가. 자체 메뉴가 없는 하위 경로만 가장 가까운 메뉴에 귀속시켜 그룹 자동 열림을 유지.
  - `/supplier/products`, `/supplier/products/library` → `상품 목록`
  - `/supplier/products/register`, `/supplier/products/new` → `상품 등록`
- 다른 메뉴 경로에는 동일 prefix 충돌이 없음을 전수 확인 (`/supplier/orders`·`/supplier/recruitments`·`/supplier/market-trial`·`/supplier/forum` 은 이미 전용 분기 보유).

**[관찰 1 — 미수정, 범위 밖] `/supplier/partner-commissions` 본문 영문 잔존**

- 페이지 heading `Partner Commissions`, 버튼 `Add Commission` 이 영문. 사이드바 메뉴 라벨은 `파트너 수수료`(한글)로 정상.
- 사이드바 개편으로 발생한 결함이 아니라 해당 페이지 자체의 기존 문자열 문제 → 후속 작업으로 기록.

**[관찰 2 — 미수정, 의도된 설계] 단일 항목 그룹의 라벨 표기**

- `공급자 홈` → `대시보드`, `설정` → `공급자 정보` 로 렌더. `renderNav` 의 `isSingle` 분기가 항목 1개인 그룹을 접기 UI 없이 항목 라벨로 평면 렌더하기 때문.
- 축 개수(7)·연결 route·데드링크 0 은 기준과 일치하며, 축 라벨보다 목적지 라벨이 더 구체적이므로 변경하지 않음.

### 8-10. 재검증

- `pnpm --filter @o4o/web-neture build`: **PASS** (built in 18.66s)
- 수정 대상(active matcher) 관련 항목 재확인: 로컬 build 통과. 프로덕션 재배포 후 `/supplier/products/*` 3개 경로의 단일 활성 표시는 배포 반영 시점에 확인 대상.

### 8-11. 변경 범위

| 항목 | 값 |
|------|-----|
| 수정한 파일 | `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` (active matcher 분기 추가) |
| CHECK 갱신 | `docs/checks/CHECK-O4O-NETURE-SUPPLIER-SIDEBAR-REARCHITECTURE-V1.md` |
| backend 변경 | 0 |
| DB 변경 | 0 |
| migration | 0 |
| 테스트 데이터 생성 | 0 |
| `/account/supplier/*` 변경 | 0 |

### 8-12. 최종 판정

```text
web-neture build:        PASS
desktop sidebar smoke:   PASS
mobile drawer smoke:     PASS
tablet(768px) smoke:     PASS
상세 route 활성:          PASS with documented data-limited exclusions
```
