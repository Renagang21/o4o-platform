# CHECK-O4O-NETURE-SUPPLIER-CANONICAL-WORKSPACE-SMOKE-CLOSEOUT-V1

> WO: `WO-O4O-NETURE-SUPPLIER-CANONICAL-WORKSPACE-SMOKE-CLOSEOUT-V1`
> **결과: PASS — 잔여 drift 2건 수정·배포·실브라우저 확인 완료**
> 단, 공급자 **정식 폼 로그인은 불가**(L2 credential unknown) → 문서화된 L1 우회로 UI 검증 (§2)

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 main | `8ab10fb3a4806700a84409e7955ad65da0d0ff71` (**clean** · `HEAD == origin/main`) |
| 결과 commit | `2fd4ed32d329f47bec09be76a1401f69d0eeb022` |
| 배포 리비전 | `neture-web-01412-7m7` |
| API 서버 | 재배포 없음 |
| 검증 일자 | 2026-08-10 |

착수 게이트:

```text
$ git status --porcelain
(출력 없음)          ← clean 확인 후 착수
```

---

## 2. 사용 계정과 권한 상태

### 2-1. 정식 폼 로그인은 불가 (HOLD 조건 부분 해당)

Neture 웹 로그인 폼은 `serviceKey: 'neture'` 를 보낸다
(`packages/auth-react/src/useServiceAuth.ts:94` → `services/web-neture/src/contexts/AuthContext.tsx:62`).
→ **L2 서비스 자격**으로 판정되는데, `docs/local/TEST-ACCOUNTS.local.md §2` 기준 전 계정이 `unknown` 이다.

실측 (2026-08-10, read-only):

| 계정 | serviceKey | 결과 |
|---|---|:---:|
| `renagang21@gmail.com` (Neture 공급자) | `neture` | **401** |
| `renagang21@gmail.com` | 없음 (L1) | 200 |
| `sohae2100@gmail.com` | `neture` | **401** |

`renariver21@gmail.com` 은 L2 `neture` 200 이지만 **공급자가 아니다** —
`SupplierRoute` 가 `SUPPLIER_ROLES` + `requireMembership="neture"` 를 요구하는데
(`components/auth/RoleGuard.tsx:166-175`), 이 계정은 `roles=['platform:super_admin']` ·
`memberships=[{platform, active, super_admin}]` 뿐이라 통과하지 못한다.

### 2-2. 사용한 채널 — 문서화된 L1 토큰 주입 우회

`TEST-ACCOUNTS.local.md §4-2` 에 명시된 우회로를 사용했다.

```text
계정   renagang21@gmail.com
채널   POST /api/v1/auth/login  (serviceKey 없음, includeLegacyTokens:true) → 200
       accessToken/refreshToken 을 o4o_accessToken / o4o_refreshToken 에 주입
roles  kpa:store_owner · cosmetics:store_owner · lms:instructor · pharmacy ·
       glycopharm:store_owner · **supplier** · pharmacy-hub:store_owner
```

`supplier` 역할 보유로 `SupplierRoute` 를 통과해 **모든 공급자 화면의 실제 렌더·API 호출을 관측**했다.

> ⚠️ **이것은 로그인 검증이 아니다.** 정식 폼 로그인 경로(L2)는 여전히 401 이며,
> 본 CHECK 의 PASS 는 **화면·링크·API 동작**에 한정된다. 로그인 자체는 미검증이다.

---

## 3. route별 smoke 결과 — canonical 20경로

리비전 `neture-web-01412-7m7` · Playwright(chromium, headless) · `https://neture.co.kr`

| 구분 | route | 결과 | 콘솔 | API | 비-2xx | HTML응답 API |
|---|---|:---:|:---:|:---:|:---:|:---:|
| 홈·상품 | `/supplier/dashboard` | ok | 0 | 17 | 0 | 0 |
| | `/supplier/products` | ok | 0 | 5 | 0 | 0 |
| | `/supplier/products/register` | ok | 0 | 4 | 0 | 0 |
| | `/supplier/products/new` | ok | 0 | 6 | 0 | 0 |
| | `/supplier/products/bulk` | ok | 0 | 4 | 0 | 0 |
| | `/supplier/products/import-assistant` | ok | 0 | 5 | 0 | 0 |
| | `/supplier/products/library` | ok | 0 | 7 | 0 | 0 |
| 매장 제공 자료 | `/supplier/store-descriptions` | ok | 0 | 6 | 0 | 0 |
| | `/supplier/tablet-screen-sets` | ok | 0 | 4 | 0 | 0 |
| | `/supplier/signage` | ok | 0 | 5 | 0 | 0 |
| | `/supplier/store-materials-status` | ok | 0 | 7 | 0 | 0 |
| 유통·주문·정산 | `/supplier/supply-offers` | ok | 0 | 3 | 0 | 0 |
| | `/supplier/recruitments` | ok | 0 | 4 | 0 | 0 |
| | `/supplier/event-offers` | ok | 0 | 6 | 0 | 0 |
| | `/supplier/market-trial` | ok | 0 | 4 | 0 | 0 |
| | `/supplier/orders` | ok | 0 | 5 | 0 | 0 |
| | `/supplier/orders/manage` | ok | 0 | 4 | 0 | 0 |
| | `/supplier/inventory` | ok | 0 | 4 | 0 | 0 |
| | `/supplier/settlements` | ok | 0 | 5 | 0 | 0 |
| | `/supplier/partner-commissions` | ok | 0 | 5 | 0 | 0 |

**20/20 정상 렌더 · redirect 0 · blank 0 · 콘솔 에러 0 · 비-2xx 0 · `text/html` 로 응답된 API 0.**

---

## 4. legacy redirect 결과

| legacy | 착지 | 결과 |
|---|---|:---:|
| `/account/supplier` | `/supplier/dashboard` | ✅ |
| `/account/supplier/products` | `/supplier/products` | ✅ |
| `/account/supplier/orders` | `/supplier/orders/manage` | ✅ |
| `/account/supplier/orders/test-id-1234` | `/supplier/orders/test-id-1234` | ✅ (§4-1) |
| `/account/supplier/inventory` | `/supplier/inventory` | ✅ |
| `/account/supplier/settlements` | `/supplier/settlements` | ✅ |

**6/6 canonical 착지 · blank 0 · redirect loop 0.**

### 4-1. 유일한 비-2xx — 결함 아님

`GET /api/v1/neture/supplier/orders/test-id-1234` → **400**.
`test-id-1234` 는 WO §3.4 가 지정한 **가짜 주문 id** 이므로 400 이 정상이다.
중요한 것은 화면 처리인데, **빈 화면·0건 위장이 아니라 명시적 오류 UI** 를 냈다.

```text
"주문 정보를 불러오지 못했습니다 / 잠시 후 다시 시도해 주세요. / [다시 시도] / [주문 목록으로 돌아가기]"
```

---

## 5. 발견한 잔여 drift

| # | 위치 | 분류 | 내용 |
|---|---|:---:|---|
| 1 | `pages/supplier/SupplierProductsPage.tsx:1347` | **FIX_SMALL** | 안내문이 `판매자 모집 연결 — 준비 중` 인데 기능은 **live** 다. `SUPPLIER_OFFER_ACTION_META.recruit` 는 `ready: true` 이고 제품 행 `[후속 작업]` 에서 모집 생성 modal 이 열린다(`WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1`). `/supplier/recruitments` 도 실재 route. |
| 2 | `components/layouts/SupplierSpaceLayout.tsx:371` | **FIX_SMALL** | 푸터 `About → /about` 이 **죽은 링크**. App.tsx 에 `/about` route 가 없고 **catch-all `path="*"` 도 없어** 클릭 시 빈 화면. |

### 5-1. 오탐으로 확인된 것 (수정하지 않음)

| 후보 | 판정 |
|---|---|
| `/workspace/supplier/library → /supplier/library` redirect | `/supplier/library` **실재** (App.tsx:838) — PASS |
| `SupplierOpsLayout` 사이드바 4개 목적지 | 4개 모두 route 실재 — PASS |
| `SupplierProductsPage:979` `if (!meta?.ready) return; // no-op` | 4개 액션 전부 `ready: true` → **도달 불가한 방어 코드** — PASS |
| `ProductDetailDrawer.tsx:1504` "전용 공급 방식 관리 화면은 준비 중" | 전용 공급방식 관리 화면은 실제로 없음(`/supplier/supply-offers` 는 공급 **오퍼**로 다른 개념) — 문구 정확, PASS |

### 5-2. load-error 위장 — 0건

supplier 화면의 조회 실패 처리를 전수 확인했다. 모두 **명시적 오류 플래그**를 세운다.

```text
SupplierProductsPage      setLoadError(true)
SupplierB2BContentPage    setLoadError(true)
SupplierLibraryPage       setLoadError(true)
SupplierOrdersPage        setUnifiedError(true)
SupplierRecruitmentsPage  setLoadError(true)
SupplierEventOfferPage    setItemsError(true) / setProposalsError(true)
SupplierSignagePage       setLoadError(true)
SupplierTabletScreenSets  setLoadError(true)
SupplierStoreMaterialsStatusPage   Promise.allSettled + 소스별 failed 플래그
SupplierProductCreatePage setCategoriesError(true)
```

`WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1` ·
`WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1` 계약이 지켜지고 있다.

> **관찰(수정 안 함)**: `SupplierSignagePage.tsx:73` 의 `supplierApi.getProducts().then(setProducts).catch(() => {})`
> 는 빈 catch 다. 다만 이 값은 **"연결 상품 (선택 — 참고 정보)"** 드롭다운 전용 보조 데이터이고,
> 형제 화면 `SupplierStoreMaterialsStatusPage:147` 이 동일 호출에 대해
> *"상품명은 보조 정보라 실패해도 오류로 다루지 않는다"* 를 **명문 정책으로 선언**하고 있다.
> 즉 동작은 코드베이스의 기존 계약과 일치하며, 주석만 없다. 정책을 바꾸는 변경이 되므로 손대지 않았다.

### 5-3. 역할 혼동 CTA — 0건

매장 제공 자료 4화면에서 **공급자가 QR·태블릿을 직접 적용하는 것처럼 보이는 CTA 는 없었다.**
`components/supplier/StoreMaterialUsageNote` 가 공급자=자료 제공 / 매장=적용 경계를 안내한다.

---

## 6. 수정한 항목

```text
services/web-neture/src/pages/supplier/SupplierProductsPage.tsx
services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx
```

commit diff: **2 files changed, 5 insertions(+), 2 deletions(-)**

### 6-1. 배포본 실측 검증 (리비전 `01412-7m7`)

**FIX 1** — `/supplier/products` 안내 아코디언

```text
표시   "판매자 모집 연결 — 각 제품 행의 [후속 작업] 에서 모집을 생성합니다
        (제품을 취급할 약국/매장 판매자를 모집하는 기능). [모집 현황으로 이동]"
'준비 중' 문구 잔존   false
[모집 현황으로 이동] 클릭 → /supplier/recruitments 로 이동 확인
```

**FIX 2** — 공급자 푸터

```text
footer 링크 = [ { text: "Contact Us", href: "/contact" } ]
/about 링크 존재   false
```

### 6-2. 정적 링크 전수 대조

```text
수정 전   supplier 화면 고유 정적 링크 35개 중 1개가 route 미매칭 (/about)
수정 후   34개 전부 매칭 — 미매칭 0
```

(`App.tsx` route 정의 288개를 파라미터·와일드카드 정규화 후 대조)

---

## 7. 수정하지 않은 항목과 이유

| 항목 | 이유 |
|---|---|
| `PartnerSpaceLayout.tsx:237` 의 동일한 `/about` 죽은 링크 | 파트너 surface — 본 WO 범위(`/supplier/*`)가 아님. §11 후속 |
| `SupplierSignagePage:73` 빈 catch | 형제 화면이 동일 호출을 "보조 정보, 실패 허용"으로 명문화 — 고치면 정책 변경 (§5-2) |
| `ProductDetailDrawer:1504` "준비 중" | 실제로 해당 화면이 없어 문구가 정확 |
| `/about` route 신설 | 새 화면 추가는 WO §5 금지 |
| catch-all `path="*"` (404 화면) 신설 | 라우팅 IA 변경 — 범위 밖. §11 후속 |
| `SupplierOpsLayout` (`/workspace/*` admin·operator) | 공급자 canonical surface 아님 |

---

## 8. typecheck / build 결과

| 명령 | 결과 |
|---|---|
| `pnpm --filter @o4o/web-neture run build` (`tsc && vite build`) | ✅ PASS (`✓ built in 16.82s`) |

`web-neture` 는 별도 `type-check` 스크립트가 없고 `build` 가 `tsc && vite build` 이므로
**build 가 typecheck 를 포함**한다.

---

## 9. 배포 결과

| 항목 | 값 |
|---|---|
| Workflow | `deploy-web-services.yml` run `31395475473` |
| 결론 | ✅ `success` |
| 리비전 | `neture-web-01412-7m7` |
| API 서버 | 재배포 없음 (backend 무변경) |

---

## 10. console / network 검증 결과

전 26경로(canonical 20 + legacy 6) 합계:

| 지표 | 값 |
|---|:---:|
| console error | **0** (§4-1 의 400 1건 제외 — 의도된 가짜 id) |
| pageerror | **0** |
| route 404 | **0** |
| blank page | **0** |
| 비-2xx API | **1** (§4-1, 결함 아님) |
| `text/html` 로 응답된 API (index.html 위장) | **0** |
| redirect loop | **0** |
| 역할 혼동 CTA | **0** |

---

## 11. 금지사항 준수 확인

| 금지 | 상태 |
|---|:---:|
| backend API 신설 · DB write · migration | ❌ 없음 (api-server 파일 0건, DB 접속 없음) |
| 상품/오퍼/정산/주문 상태머신 변경 | ❌ 없음 |
| 공급자 역할 정책 변경 | ❌ 없음 |
| SupplierProductOffer / ProductMaster / ProductApproval 모델 변경 | ❌ 없음 |
| 새 대시보드 설계 · 메뉴 IA 대개편 | ❌ 없음 |
| partnerops 수정 | ❌ 없음 |
| admin-dashboard 수정 | ❌ 없음 |
| lockfile · 무관 파일 스테이징 | ❌ 없음 — `git commit -- <2 pathspec>` |
| 다른 세션 커밋 함께 push | ❌ 없음 — push 전 `git log origin/main..HEAD` 로 내 커밋 1개 확인 |

---

## 12. commit / push

| 항목 | 값 |
|---|---|
| commit (코드) | `2fd4ed32d` |
| push | ✅ `8ab10fb3a..2fd4ed32d  main -> main` (내 커밋 1개만) |
| 완료 조건 | 본 WO 범위 미커밋 변경 0건 · `HEAD == origin/main` |

---

## 13. 후속 후보

| 후보 | 근거 |
|---|---|
| **`WO-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1`** | `PartnerSpaceLayout` 에 동일한 죽은 `/about` 잔존 + App.tsx 에 catch-all(404) 부재 → 없는 경로는 전부 빈 화면 |
| **`IR-O4O-PARTNEROPS-ACTIVE-LEGACY-API-AUDIT-V1`** | partnerops 는 app registry **active** → legacy 16건 실제 도달 가능 |
| `WO-O4O-NETURE-SERVICE-CREDENTIAL-SMOKE-ACCOUNT-V1` | §2-1 — 공급자 **정식 폼 로그인** 검증 채널 부재. 계정 소유자의 L2 비밀번호 설정 필요 |
| `WO-O4O-SUPPLIEROPS-REMAINING-DEMO-SCREENS-GUIDE-V1` | admin-dashboard supplierops 잔여 데모 4화면 |

---

*작성: 2026-08-10 · 기준 commit `2fd4ed32d` · 리비전 `neture-web-01412-7m7`*
