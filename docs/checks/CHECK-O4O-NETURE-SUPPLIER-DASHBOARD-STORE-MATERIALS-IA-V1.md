# CHECK-O4O-NETURE-SUPPLIER-DASHBOARD-STORE-MATERIALS-IA-V1

> **결과: 구현 완료** — 프론트 한정(web-neture). 백엔드·DB·migration 무변경.
> **작성일:** 2026-08-09
> **근거 IR:** `IR-O4O-KPA-STORE-QR-TABLET-CONTENT-FLOW-AUDIT-V1` §9 (IA 시사점) · §10 (1차 메뉴 제안)
> **선행 정책:** `CHECK-O4O-SUPPLIER-SIGNAGE-HUB-TARGET-AND-MEDICATION-GUARD-ALIGN-V1 §0-A`
> **commit:** `2d84e3fe7`

---

## 1. 목적과 범위

공급자 대시보드의 콘텐츠 그룹을 **"매장 제공 자료"** 중심으로 정리한다.

```text
포함
- 매장용 상품 설명서
- 매장 활용 콘텐츠 / Signage
- Screen Set 자료
- 검수·게시 현황

제외 (구현하지 않음)
- QR 생성
- 태블릿 적용
- 매장 자료함 직접 조작
- 특정 매장 배포
- Signage 의약품/비의약품 판정
```

---

## 2. 변경 내용

### 2.1 사이드바 재구성 (`SupplierSpaceLayout.tsx`)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 그룹명 | `콘텐츠` | **`매장 제공 자료`** |
| 제품 콘텐츠 | 콘텐츠 그룹 | **상품 그룹으로 이동** |
| 매장용 설명서 | `매장용 설명서` | **`매장용 상품 설명서`** |
| 태블릿 | `태블릿` | **`태블릿 화면 자료`** |
| 디지털 사이니지 | 유지 | 유지 |
| 검수·게시 현황 | 없음 | **신규 추가** |

**제품 콘텐츠를 옮긴 이유** — `SupplierB2BContentPage` 는 offer 행의 `businessShort/DetailDescription` 을
직접 편집하는 **B2B 도매 상품 정보**다. SPD 검수 큐(매장용 설명서)와 컬럼·소비처가 전혀 다른데
같은 그룹에 있어 혼동을 유발했다(IR §8). **route·page·API 무변경 — 그룹 소속만 이동**했으므로
기능 은폐 0 / 데드링크 0 이다.

**`매장용 상품 설명서` 로 개칭한 이유** — 매장 사이드바에도 `상품 설명` 메뉴가 있으나 그것은
`store_local_products.detail_html`(매장 자체 상품)이고, 공급자 쪽은 SPD STORE canonical 축이다.
같은 이름이 서로 다른 축을 가리키던 문제(IR §4.1 / §9-5)를 라벨로 분리했다.

> **라벨 표기 노트:** 요청서의 `매장 활용 콘텐츠 / Signage`, `Screen Set 자료` 는 자료 **범주** 표현으로
> 읽고, 실제 라벨은 매장 측 canonical 어휘(`디지털 사이니지`, `태블릿 화면`)에 맞췄다. 서비스 간
> 어휘가 갈리면 IR §4 D-4(태블릿/타블렛 혼용)와 같은 문제가 재발하기 때문이다.

### 2.2 신규 화면 — 검수·게시 현황

```text
route     : /supplier/store-materials-status
component : pages/supplier/SupplierStoreMaterialsStatusPage.tsx
성격       : 읽기 전용 집계 (상태 변경 액션 없음 — 수정·게시는 각 자료 화면이 canonical)
```

**신규 백엔드 0.** 기존 3개 목록 API 를 클라이언트에서 합친다.

| 자료 유형 | 원본 API | 상태 어휘 |
|-----------|----------|-----------|
| 매장용 상품 설명서 | `supplierStoreDescriptionApi.listMine()` | draft / needs_review / revision_requested / canonical / hidden / candidate / deprecated |
| 태블릿 화면 자료 | `fetchSupplierScreenSets()` | draft / active / archived |
| 디지털 사이니지 | `fetchSupplierSignageList()` | draft / active / archived |

- 상품명 해석용으로 `supplierApi.getProducts()` 를 함께 호출한다(보조 정보 — 실패해도 오류로 다루지 않고 `상품 {masterId 앞 8자}` 로 축약 표기).
- 요약 카드 4종: **수정 요청 / 검수 대기 / 매장 노출·게시 중 / 작성 중** (조치 필요 우선).
- 행 컬럼: 자료 유형 · 제목 · 상태 · 게시 대상 · 최종 수정 · 관리(각 자료 화면 링크).

**게시 대상 칸 규칙 (중요)**

```text
태블릿 화면 자료 → hub_target_store_type (약국 매장 / 비약국 매장 / 전체 매장) 표기
매장용 상품 설명서 → '—'  (매장 유형 대상 축 없음)
디지털 사이니지     → '—'  (매장 유형 대상 축 없음 — 확정 정책)
```

선행 정책(`...-MEDICATION-GUARD-ALIGN-V1 §0-A`)에 따라 **사이니지에 약국/비약국 축을 만들지 않는다.**
빈 칸을 임의 값으로 채우지 않고 `—` 로 두며, 화면 하단에 그 이유를 문장으로 명시한다.

### 2.3 활용 채널 안내 (`StoreMaterialUsageNote`)

신규 공통 컴포넌트를 3개 자료 화면 + 현황 화면에 배치했다.

```text
이 자료는 매장이 {채널}에서 활용할 수 있습니다.
실제 적용 여부와 적용 위치는 매장 경영자가 선택합니다.
공급자가 특정 매장·QR·태블릿 코너에 직접 배포하지 않습니다.
```

| 화면 | channels |
|------|----------|
| 매장용 상품 설명서 | QR · 태블릿 · 매장 자료함 |
| 태블릿 화면 자료 | 태블릿 코너 화면 · 코너 QR |
| 디지털 사이니지 | 매장 사이니지 화면 · 매장 자료함 |
| 검수·게시 현황 | QR · 태블릿 · 매장 자료함 · 매장 사이니지 화면 |

**왜 메뉴가 아니라 문구인가** — 공급자는 QR 생성도 코너 적용도 할 수 없다. 백엔드가 차단한다:

```text
supplier-screen-set.controller.ts:33
  차단: 매장·코너 직접 적용 / current 지정 / 공개 타블렛 URL / Screen Set QR 생성 / 매장 제작 콘텐츠 조회
createSupplierContentSourceAdapter().fetchStoreContent() → 항상 null
공개 resolver / ensureScreenSetQr → origin='store' 게이트
```

메뉴로 노출하면 클릭 시 403·빈 화면이 되어 `SupplierSupplyOffersPage` 같은 dead-end 가 하나 더 생긴다(IR §9-3).

---

## 3. 명시적 제외 확인

| 제외 항목 | 확인 |
|-----------|------|
| QR 생성 | 메뉴·화면·API 호출 **0** |
| 태블릿 적용 (코너 배치 / current 지정) | **0** |
| 매장 자료함 직접 조작 | **0** |
| 특정 매장 배포 | **0** (게시 대상은 기존 매장 **유형** 축만 표시) |
| Signage 의약품/비의약품 판정 | **0** — 대상 칸을 `—` 로 두고 판정 축을 만들지 않음 |

---

## 4. 변경 파일

```
M services/web-neture/src/App.tsx                                          (lazy import + route 1)
M services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx        (사이드바 그룹 재구성)
A services/web-neture/src/components/supplier/StoreMaterialUsageNote.tsx    (신규 공통 안내)
A services/web-neture/src/pages/supplier/SupplierStoreMaterialsStatusPage.tsx (신규 집계 화면)
M services/web-neture/src/pages/supplier/SupplierSignagePage.tsx            (안내 삽입)
M services/web-neture/src/pages/supplier/SupplierStoreDescriptionsPage.tsx  (안내 삽입)
M services/web-neture/src/pages/supplier/SupplierTabletScreenSetsPage.tsx   (안내 삽입)
```

**무변경 확인:** `apps/api-server` 0 · migration 0 · DB write 0 · 공용 패키지(`packages/*`) 0 ·
KPA/GlycoPharm/K-Cosmetics 0 · Screen Set / Signage / SPD 백엔드 계약 0.

---

## 5. 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` (web-neture) | **PASS** (rc=0) |
| `npm run build` (tsc && vite build) | **PASS** — 31.25s, 신규 chunk `SupplierStoreMaterialsStatusPage-*.js` 생성 확인 |
| 배포 | (아래 §6) |
| 실브라우저 smoke | (아래 §7) |

---

## 6. 배포

| 항목 | 값 |
|------|-----|
| commit | `2d84e3fe7` |
| workflow | Deploy Web Services (Cloud Run) — run `31293764068` |
| detect-changes | `deploy-neture` 만 실행, 나머지 4서비스 **skipped** (변경 범위와 정확히 일치) |
| 결과 | **success** |

---

## 7. 실브라우저 smoke (프로덕션 `https://neture.co.kr`)

계정: Neture 공급자 (`renagang21@gmail.com`). 자격증명은 env 주입 — 스크립트·문서에 literal 없음.

### 7.1 결과

| # | 검증 | 결과 |
|:-:|------|:----:|
| 1 | 로그인 후 `/supplier/dashboard` 도달 | **PASS** |
| 2 | 사이드바 `매장 제공 자료` 그룹 존재 · 기존 `콘텐츠` 그룹 소멸 | **PASS** |
| 3 | 그룹 4항목 실제 링크 | **PASS** — `/supplier/store-descriptions :: 매장용 상품 설명서` · `/supplier/tablet-screen-sets :: 태블릿 화면 자료` · `/supplier/signage :: 디지털 사이니지` · `/supplier/store-materials-status :: 검수·게시 현황` |
| 4 | `제품 콘텐츠` 가 **상품** 그룹으로 이동 | **PASS** — `/supplier/b2b-content :: 제품 콘텐츠` 가 상품 목록·등록·대량 등록·등록 도우미와 같은 그룹 |
| 5 | QR 메뉴 **없음** | **PASS** (`hasQrMenu=false`) |
| 6 | 코너 적용·태블릿 적용 메뉴 **없음** | **PASS** (`hasCornerApply=false`) |
| 7 | 검수·게시 현황 렌더 + 요약 카드 | **PASS** |
| 8 | 집계 표 실데이터 | **PASS** — 12행 (태블릿 화면 자료 2 · 매장용 상품 설명서 10) |
| 9 | 컬럼 | **PASS** — 자료 유형 / 제목 / 상태 / 게시 대상 / 최종 수정 |
| 10 | **게시 대상 규칙** | **PASS** — 태블릿 화면 자료 2건만 `전체 매장`, 설명서 10건 전부 `—` |
| 11 | 3개 자료 화면 활용 안내 노출 + 채널 문구 일치 | **PASS** (설명서 / 태블릿 화면 자료 / 사이니지 전부 `hasNote=true, hasChannel=true`) |
| 12 | 사이니지에 약국/의약품 대상 표기 **없음** | **PASS** (`mentionsPharmacyTarget=false`) — 확정 정책 준수 |
| 13 | 콘솔 에러 | **0건** |
| 14 | 실패 API 응답(4xx/5xx) | **0건** |

`loadFailureBanner=false` · `emptyState=false` → 집계가 "실패를 0건으로 위장"한 상태가 아님을 확인했다.

### 7.2 smoke 중 발견한 **기존 결함** (본 WO 무관 — 미수정)

웹 로그인 폼이 401 로 실패한다. **동일 자격증명인데 body 의 `serviceKey` 유무로 결과가 갈린다.**

```
POST /api/v1/auth/login
  {"email":…,"password":…,"serviceKey":"neture","includeLegacyTokens":true}  → 401 INVALID_CREDENTIALS
  {"email":…,"password":…}                                                   → 200
```

- 프론트(`/login` 폼)는 항상 `serviceKey:'neture'` 를 실어 보내므로 **웹 로그인이 막힌다.**
- curl 로 재현했다. 응답 코드가 `INVALID_CREDENTIALS`(비밀번호 불일치)라 **원인 오인 위험**이 크다 — 실제로는 자격증명 문제가 아니다.
- 본 WO 는 프론트 IA 변경만 했고 인증 코드를 건드리지 않았다. **범위 밖이라 수정하지 않고 분리 보고**한다.
- smoke 는 페이지 컨텍스트에서 `serviceKey` 없이 로그인해 쿠키·`o4o_accessToken` 을 확보하는 우회로 진행했다.
- 참고: `docs/local/TEST-ACCOUNTS.local.md` 의 `sohae21@naver.com` 비밀번호도 프로덕션과 불일치(401) — 문서 drift.

> 이 두 건은 후속 §9 에 WO 후보로 올린다.

---

## 8. 임시 파일 정리

smoke 스크립트·스크린샷은 저장소에 커밋하지 않는다.

```
tmp-smoke-supplier-ia.cjs · tmp-smoke-debug.cjs · tmp-smoke-sidebar*.cjs
smoke-*.png · tmp-sidebar-*.png
→ 전부 삭제 (커밋 0)
```

`[SMOKE]` 접두 테스트 **데이터 생성 0** — 본 smoke 는 조회만 수행했다(DB write 0).

---

## 9. 후속 후보

| ID | 내용 | 등급 |
|----|------|:---:|
| 1 | `SupplierStoreDescriptionsPage` 초기 load silent swallow → throw+재시도 (IR §9-6 / 선행 IR §13-C) | P2 |
| 2 | `/account/supplier/*` 중복 트리 정리 (선행 IR §19 버킷 B) | P2 |
| 3 | 공급 오퍼 dead-end 해소 (선행 IR §19 버킷 C, P1) | P1 |
| 4 | 게시 후 피드백 — 가져간 매장 **수** 집계 노출 여부 (IR §11-A 결정 필요) | P3 |
| **5** | **`serviceKey` 포함 시 로그인 401 — 웹 로그인 차단 (§7.2)** | **P0 후보** |
| 6 | `docs/local/TEST-ACCOUNTS.local.md` 프로덕션 비밀번호 drift 정리 (§7.2) | P3 |

> 4번은 `store_asset_derivations` 로 조회 가능하나 **매장 식별 노출은 독립 사본 설계·매장 프라이버시와 충돌**한다. 집계 수준까지만 검토할 것.

---

*범위: web-neture 프론트 한정 · 백엔드/DB 무변경 · 제외 5항목 전부 미구현 확인*
