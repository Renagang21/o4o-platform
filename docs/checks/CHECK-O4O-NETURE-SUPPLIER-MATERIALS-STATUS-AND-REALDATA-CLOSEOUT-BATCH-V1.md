# CHECK-O4O-NETURE-SUPPLIER-MATERIALS-STATUS-AND-REALDATA-CLOSEOUT-BATCH-V1

> WO: `WO-O4O-NETURE-SUPPLIER-MATERIALS-STATUS-AND-REALDATA-CLOSEOUT-BATCH-V1`
> **결과: PASS (수정 3파일 배포 완료) / write smoke 는 HOLD — 상품 보유 공급자 계정 없음**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 base | `b35b1832a` (`origin/main`) |
| 결과 commit | `e9b2c3254` |
| 배포 리비전 | `neture-web-01431-fjh` |
| API 서버 | 재배포 없음 (backend 무변경) |
| 작업 격리 | 전용 worktree `C:\tmp\o4o-supplier-batch2` · 브랜치 `work/supplier-batch2-20260811` |

### 1-1. 왜 worktree 였나

착수 시점 main 작업트리가 clean 이 아니었다 — 병렬 세션이 화장품 설명서 보완 산출물 **57 파일을 공유 index 에 stage** 한 상태였다(`apply.sql.gz` · `rollback.sql.gz` 포함).
WO §4 는 clean 이 아니면 중지를 요구하므로 보고했고, 사용자 판단으로 **전용 worktree 완전 격리** 방식을 택했다.
배포 단계에서 main 이 clean(`b35b1832a`) 으로 돌아온 것을 확인하고 **fast-forward 병합**했다 —
다른 세션 커밋이 내 push 에 실리지 않았다(`b35b1832a..e9b2c3254`, 내 커밋 1개).

---

## 2. 공급자 계정 / 테스트 데이터 확보 여부

### 2-1. 웹 정식 로그인은 여전히 불가

Neture 로그인 폼은 `serviceKey:'neture'` 를 보내 L2 자격으로 판정된다.

| 계정 | serviceKey | 결과 |
|---|---|:---:|
| `renagang21@gmail.com` (Neture 공급자) | `neture` | **401** |
| `renagang21@gmail.com` | 없음(L1) | 200 |

→ 직전 WO 와 동일하게 **문서화된 L1 토큰 주입 우회**(`TEST-ACCOUNTS.local.md §4-2`)를 사용했다.
`roles` 에 `supplier` 가 있어 `SupplierRoute` 를 통과한다. **로그인 자체는 미검증.**

### 2-2. 실데이터 실측 (read-only, 쿠키 인증)

`renagang21` 기준 프로덕션 API 응답:

| 자료 | 건수 | 상태 분포 |
|---|---:|---|
| 공급자 상품(offer) `GET /neture/supplier/products` | **0** | — |
| 매장용 설명서 `GET /neture/supplier/store-descriptions` | **10** | **전부 `hidden`, 전부 `ko`** (master 5종, 같은 master+ko 가 최대 4행 중복) |
| 태블릿 화면 자료 `GET /kpa/supplier/screen-sets` | 2 | 전부 `archived` |
| 디지털 사이니지 `GET /kpa/supplier/signage/media` | 0 | — |

---

## 3. 실데이터 smoke 가능/불가 판정

| 항목 | 판정 | 근거 |
|---|:---:|---|
| 읽기 경로(목록·집계·상태 표기) | **가능 — 수행함** | 위 3개 API 실응답으로 화면 렌더까지 확인 |
| **쓰기 경로(draft 저장·검수요청·수정요청·재요청)** | **HOLD** | `SaveSupplierStoreDescriptionInput.offerId` 가 필수인데 **공급자 상품 0건** → 생성 자체가 불가 |

WO §8 의 **"상품 보유 공급자 계정 없음"** 에 정확히 해당한다.
운영 데이터를 만들어 우회하지 않았다(§3 금지 "운영 데이터 직접 보정 금지").

---

## 4. draft / 검수요청 / 수정요청 / 재요청 확인 결과

**정적(계약) 검증까지 수행, 실행 미검증.**

| 단계 | 프런트 | 백엔드 | 연결 |
|---|---|---|:---:|
| 임시저장 | `save({submit:false})` → `draft` | `POST /neture/supplier/store-descriptions` | ✅ |
| 검수요청 | `save({submit:true})` → `needs_review` + `submitted_at` | 동일 | ✅ |
| 수정요청(운영자) | `revision_requested` + `reviewNote` + `revisionDueAt` 수신·표시 | `operator-supplier-store-description-review.controller.ts:183` (사유 필수, due=+30일) | ✅ |
| 재요청(공급자) | 같은 `save({submit:true})` 로 재제출 | 동일 | ✅ |
| 철회 | `withdraw(id)` (draft/needs_review/revision_requested 만, canonical 등은 409) | `DELETE /:id` | ✅ |

화면 상태 라벨도 5개 상태를 모두 갖추고 있다(§6 표).
**실제 상태 전이는 상품 부재로 실행하지 못했다.**

---

## 5. store-materials-status 조사 결과

읽기 전용 집계 화면이며 설계가 이미 견고하다.

- 3개 소스를 `Promise.allSettled` 로 **영역별 격리** — 한 소스가 실패해도 나머지를 표시하고
  실패는 "0건" 이 아니라 배너로 드러낸다(소스별 `failed` 플래그).
- 상태 변경 액션을 두지 않는다(수정·게시는 각 자료 화면이 canonical 진입점).
- `tone`(working/waiting/action/live/closed) 추상화로 이질적인 상태군을 이미 통일하고 있다.
- 상품명은 보조 정보로 실패를 허용한다고 **명문화**돼 있다.

발견한 결함은 **요약 카드 라벨 1건**뿐이다 → §6-2.

---

## 6. 설명서 / 태블릿 / 사이니지 상태 문구 정리

### 6-1. 현행 용어 (수정 없음 — 워크플로가 실제로 다름)

| 자료 | 작성 단계 | 검수 단계 | 노출 단계 | 종료 |
|---|---|---|---|---|
| 매장용 상품 설명서 | `draft` **임시저장** | `needs_review` **검수 대기** · `revision_requested` **수정 요청** | `canonical` **매장 노출** | `hidden` **숨김** |
| 태블릿 화면 자료 | `draft` **작성 중** | — | `active` **게시 중** | `archived` **보관** |
| 디지털 사이니지 | `draft` **작성 중** | — | `active` **게시 중** | `archived` **보관** |

**설명서만 운영자 검수를 거친다.** 따라서 "매장 노출"(검수 통과) 과 "게시 중"(공급자 게시) 은
서로 다른 사실이며, 억지로 한 단어로 합치면 오히려 오해를 만든다 → **통일하지 않았다.**

### 6-2. 수정한 것 — 요약 카드 라벨 정합

집계 화면 요약은 `live` 를 이미 **"매장 노출·게시 중"** 으로 **병기**하는데,
`working` 만 **"작성 중"** 이라 설명서 행의 **"임시저장"** 배지와 어긋났다(같은 카운터에 들어가는데 라벨이 다름).

```text
before   작성 중
after    작성 중·임시저장      ← live 와 동일한 병기 패턴
```

### 6-3. `hidden` 의 다의성 (보고만 — 수정하지 않음)

`hidden` 은 세 경로가 공유한다.

```text
운영자 반려/보류                    reject → hidden
canonical 교체 시 기존 canonical 강등  setCanonical(demotedStatus:'hidden')
관리자 노출 중단                     hidden
```

공급자 화면은 셋 다 **"숨김"** 한 단어로 표시한다. 실데이터의 10건이 전부 `hidden` 이고
같은 master+ko 가 최대 4행 중복인 것도 이 강등 이력으로 설명된다.
**원인을 구분하려면 백엔드가 사유 필드를 내려줘야 한다** — API 계약 변경이라 이번 범위 밖이다(§13 후속).

---

## 7. 언어별 STORE 상태 표기 확인

### 7-1. 발견 — 목록 화면이 언어를 잃고 있었다

에디터는 ko/en/zh/ja 를 **독립 작업행**으로 저장한다(`shared_product_descriptions` STORE+language).
그런데 목록은 `draftByMaster` 로 **master 당 최고 순위 1건**만 남겨, 언어 정보를 버렸다.

```text
예) KO = canonical(매장 노출) · EN = revision_requested(수정 요청)
    → 목록에는 "수정 요청" 배지 하나. 어느 언어가 조치 대상인지 알 수 없다.
       KO 가 이미 매장에 노출 중이라는 사실도 보이지 않는다.
```

집계 화면(`store-materials-status`)은 `상품명 · KO` 로 언어를 표기하고 있어 **두 화면이 불일치**했다.

### 7-2. 수정

`(master, language)` 단위로 접고 **언어 칩과 함께** 상태 배지를 표기한다.

```text
before   [수정 요청]
after    [KO 매장 노출] [EN 수정 요청]      ← 지원 언어 순서 고정, 작업행 있는 언어만
```

같은 `(master, language)` 에 여러 행이 있는 경우(강등된 과거 행)는 기존과 동일하게 최고 순위 1건만 남긴다.

`SUPPORTED_LANGS` · `LANG_LABELS` · `LANG_SHORT` · `normLang` 을 에디터에서 **export** 해 목록이 재사용한다 —
백엔드 `ALLOWED_LANG` 과의 접점을 한 곳으로 유지하고 중복 정의를 만들지 않았다.

### 7-3. 검증 한계 (숨기지 않음)

smoke 계정은 **상품 0건**이라 설명서 목록이 빈 상태로 렌더된다.
따라서 **언어 칩이 실제로 그려지는 화면은 브라우저로 확인하지 못했다.**
확인한 것은 다음까지다.

```text
tsc(타입) 통과 — langRows 타입 가드 포함
vite build 통과
집계 화면의 언어 표기는 실데이터로 확인(· KO ×10)
```

---

## 8. QR / 태블릿 직접 적용 UI 부재 확인

**0건.** 공급자 화면 전체에서 매장 적용을 유도하는 CTA 를 찾지 못했다.
오히려 경계가 코드 주석과 화면 문구 양쪽에 명문화돼 있다.

```text
components/supplier/StoreMaterialUsageNote.tsx
  "이 자료는 매장이 {channels} 에서 활용할 수 있습니다.
   실제 적용 여부와 적용 위치는 매장 경영자가 선택합니다.
   공급자가 특정 매장·QR·태블릿 코너에 직접 배포하지 않습니다."

SupplierStoreDescriptionsPage:366
  "QR 생성·태블릿 코너 적용은 매장이 수행합니다."

SupplierTabletScreenSetsPage:15
  "차단(WO): 매장·코너 직접 적용 / 공개 URL·QR 생성 / 특정 매장 태블릿 선택·배치"
```

백엔드도 차단하고 있어(`supplier-screen-set.controller.ts`) UI·API 양쪽이 일치한다.

---

## 9. legacy / dead CTA · load-error 위장

| 항목 | 결과 |
|---|---|
| dead link | **0** (직전 WO 에서 `/about` 정리 후 유지) |
| 준비중/stub | **0** — 잔여 2건은 모두 PASS 판정: `ProductDetailDrawer:1491`(전용 공급방식 관리 화면이 실제로 없어 문구가 정확) · `SupplierProductsPage:979`(4개 액션 전부 `ready:true` 라 도달 불가한 방어 코드) |
| load-error 위장 | **0** — 공급자 화면 전 조회가 명시적 error 플래그를 세운다(`setLoadError` / `setItemsError` / `setUnifiedError` / `Promise.allSettled` 소스별 `failed`) |

---

## 10. HOLD 항목

| # | 항목 | 사유 |
|---|---|---|
| 1 | **draft·검수요청·수정요청·재요청 실행 smoke** | 공급자 상품 0건 → `offerId` 확보 불가 (WO §8 "상품 보유 공급자 계정 없음") |
| 2 | 언어 칩 렌더 육안 확인 | 동일 사유 — 목록이 상품 기반이라 빈 상태 |
| 3 | `hidden` 사유 구분 표기 | 백엔드가 사유를 내려주지 않음 → API 계약 변경 필요 (WO §3 금지) |
| 4 | 공급자 **정식 폼 로그인** 검증 | L2 service credential unknown (계정 소유자 설정 필요) |

---

## 11. smoke 결과

**환경**: Playwright(chromium, headless) · `https://neture.co.kr` · 리비전 `neture-web-01431-fjh`
**세션**: L1 토큰 주입(§2-1) · `roles` 에 `supplier` 포함 확인

| route | 결과 | 콘솔 | API | 비-2xx | HTML응답 API |
|---|:---:|:---:|:---:|:---:|:---:|
| `/supplier/dashboard` | ok | 0 | 21 | 0 | 0 |
| `/supplier/products` | ok | 0 | 5 | 0 | 0 |
| `/supplier/products/new` | ok | 0 | 6 | 0 | 0 |
| `/supplier/store-descriptions` | ok | 0 | 6 | 0 | 0 |
| `/supplier/store-materials-status` | ok | 0 | 7 | 0 | 0 |
| `/supplier/tablet-screen-sets` | ok | 0 | 4 | 0 | 0 |
| `/supplier/signage` | ok | 0 | 5 | 0 | 0 |
| `/supplier/recruitments` | ok | 0 | 4 | 0 | 0 |

**8/8 정상 · blank 0 · 404 0 · redirect 0 · 콘솔 에러 0 · 비-2xx 0 · `text/html` 로 응답된 API 0.**

수정분 실측:

```text
검수·게시 현황 요약   "작성 중·임시저장" 병기   확인 ✅
                     "매장 노출·게시 중" 병기   확인 ✅ (기존)
언어 표기            "· KO" ×10 (실데이터 전량 ko)  확인 ✅
```

### 11-1. 부수 관찰 (수정하지 않음, 후속 후보)

`renagang21` 은 **상품 0건인데 설명서 작업행 10건**을 갖고 있다.
설명서 목록은 상품 기반이라 이 10건이 **화면에서 도달하지 않는다**(빈 상태로 보임).
집계 화면(`store-materials-status`)에서만 보인다.
전부 `hidden` 이라 조치 대상은 아니지만, 상품이 삭제·비활성화돼도 설명서 작업행이 남는 구조라
**상품 없이 남은 설명서의 처리 정책**이 정의돼 있지 않다 → §13 후속.

---

## 12. typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| `pnpm --filter @o4o/web-neture run build` (`tsc && vite build`) | ✅ PASS (`✓ built in 21.24s`) |
| worktree 부트스트랩 | `pnpm install --frozen-lockfile` exit 0 · `build:packages` exit 0 |
| Deploy Web Services run `31497910817` | ✅ `success` |
| 리비전 | `neture-web-01431-fjh` |
| api-server | 배포 없음 (backend 무변경) |

---

## 13. 금지사항 준수 확인

| 금지 | 상태 |
|---|:---:|
| 공통 UI 패키지 수정 | ❌ 없음 (`packages/**` 무변경) |
| KPA / Glyco / K-Cos / Pharmacy-Hub 수정 | ❌ 없음 |
| partnerops · admin-dashboard 수정 | ❌ 없음 |
| backend schema / migration | ❌ 없음 (api-server 파일 0건) |
| 권한 · role 변경 | ❌ 없음 |
| 운영 데이터 직접 보정 | ❌ 없음 (read-only 조회만) |
| 화장품 전량 apply | ❌ 없음 |
| QR / 태블릿 직접 적용 권한 부여 | ❌ 없음 |
| 매장 경영자 선택·적용 권한 침범 | ❌ 없음 |
| 다른 세션 커밋 함께 push | ❌ 없음 — worktree 격리 + push 전 `git log origin/main..HEAD` 확인 |

변경 파일 **3개, 전부 `services/web-neture/src/pages/supplier/`** (+70/−18).

---

## 14. commit / push

| 항목 | 값 |
|---|---|
| commit (코드) | `e9b2c3254` |
| push | ✅ `b35b1832a..e9b2c3254  main -> main` (fast-forward, 내 커밋 1개) |

---

## 15. 다음 공급자 batch 후보

| 후보 | 근거 |
|---|---|
| **`WO-O4O-NETURE-SUPPLIER-TEST-DATA-AND-WRITE-SMOKE-ENABLEMENT-V1`** | §10-1 — 상품 보유 공급자 확보가 남은 모든 write smoke 의 선결 조건. 안전한 테스트 공급자 계정 + 폐기 가능한 상품 1건 확보 |
| `WO-O4O-SUPPLIER-STORE-DESCRIPTION-HIDDEN-REASON-EXPOSURE-V1` | §6-3 — `hidden` 3경로(반려/강등/관리자숨김) 구분 표기. API 계약 확장 필요 |
| `WO-O4O-SUPPLIER-ORPHAN-STORE-DESCRIPTION-POLICY-V1` | §11-1 — 상품 없이 남은 설명서 작업행 처리 정책 |
| `WO-O4O-NETURE-SERVICE-CREDENTIAL-SMOKE-ACCOUNT-V1` | §10-4 — 공급자 정식 폼 로그인 검증 채널 |
| 공급자 상품 등록 확장 smoke | 화장품/일반상품/이미지/상세 HTML/ProductMaster 연결 (사용자 제안) |

---

*작성: 2026-08-11 · 기준 commit `e9b2c3254` · 리비전 `neture-web-01431-fjh`*
