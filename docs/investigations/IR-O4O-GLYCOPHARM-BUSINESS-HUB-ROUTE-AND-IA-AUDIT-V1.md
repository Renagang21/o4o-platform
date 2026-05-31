# IR-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-IA-AUDIT-V1

**작성 일자**: 2026-05-31
**작업 성격**: 조사 IR (Investigation / IA Audit) — 코드 / 라우트 / 페이지 / 푸터 / UI / 게시판 연결 수정 일절 없음
**선행 작업 (BloodCare 트랙)**:
- `b7474ca68` WO-O4O-GLYCOPHARM-BLOODCARE-BUSINESS-STATUS-PAGE-V1 (신규 페이지 + 푸터 + 라우트)
- `e6adfcf2b` WO-O4O-GLYCOPHARM-BLOODCARE-BUSINESS-PAGE-REWRITE-V1 (본문 재정렬)
- `76c0ec625` WO-O4O-GLYCOPHARM-BLOODCARE-HERO-VISUAL-CLARITY-FIX-V1 (Hero 2열)
- `17d5b4b59` WO-O4O-GLYCOPHARM-BLOODCARE-PREP-PRODUCT-SUPPLIER-SECTION-ALIGNMENT-V1 (제품 등록·공급자 협의 섹션)

---

## 0. 핵심 결론 (TL;DR)

> ✅ **권장: 권장안 B (중간 구조) — 단, 2-Phase 점진 도입**
>
> 1. **`/business` 404 원인 확정** — `/business/bloodcare` 는 MainLayout 공개 블록의 **단일 경로 라우트**(`path="business/bloodcare"`)로 등록되어 있을 뿐, `/business` 부모(index) 라우트가 없다. 따라서 `/business` 직접 접근은 어떤 라우트에도 매칭되지 않아 최상위 catch-all `path="*"` → `NotFoundPage` 로 떨어진다 (HTTP 200 + SPA 404 화면).
> 2. **푸터 연결 구조 확인** — "혈당관리 약국 사업" 은 `NavLink to="/business/bloodcare"` 내부 SPA 링크 (새창 아님). 다른 서비스 메뉴(포럼/교육)와 동일 패턴. 메뉴명("사업")은 **상위 영역**처럼 보이는데 실제로는 **단일 세부 페이지**로 직행 — 사용자 기대와 라우트 구조 사이에 경미한 불일치.
> 3. **`/business/bloodcare` 는 7-섹션 단일 flat 페이지** — Hero / 사업 진행 단계 / 제품 등록·공급자 협의 준비 / 사업 논의 게시판 / 주요 사업 항목 / 참여자별 확인 사항 / 다음 확인 사항. 이미 길고, 제품 등록·공급자 협의 준비 섹션(189줄 추가)만으로도 상당한 분량.
> 4. **상위 허브 도입은 기존 패턴 재사용 가능** — `store-hub` 가 이미 **중첩 허브 패턴**(부모 `element={<Layout/>}` + `<Route index>` + 자식 라우트)을 사용 중. `/business` 도 동일 패턴으로 무리 없이 구성 가능.
5. **Market Trial 정합성 주의** — GlycoPharm 에서는 Market Trial 을 **사업 항목으로 소개**만 하고, 실제 실행 플로우는 **Neture 담당**. 현재 페이지는 소개 수준(카드 + 체크리스트)이라 정합. 향후 `/business/market-trial` 페이지를 만들더라도 **안내/entry 수준**으로 한정하고 실행은 Neture 로 링크해야 한다.
> 6. **즉시 대규모 분리는 비권장** — 현재 콘텐츠는 placeholder 수준(실 데이터/CMS 없음). 1단계는 **`/business` 허브 + 라우트 정합 + 푸터 재연결**(저위험)만, 콘텐츠 분리는 2단계로.

권고 단계: ① 본 IR 로 IA 방향 확정 → ② Phase 1 WO (`/business` 허브 신설 + `/business/bloodcare` 중첩 정합 + 푸터 → `/business`) → ③ Phase 2 WO (제품 등록·공급자 협의 / 사전 준비 등 하위 페이지 분리, 필요 시) → ④ (선택) 사업 논의 게시판의 forum category 실연동

---

## 1. 조사 목적

GlycoPharm 푸터 "혈당관리 약국 사업" → `/business/bloodcare` 직행 구조와 `/business` 404 문제를 조사하고, 사업 진행 페이지가 커질 것을 대비한 상위 허브 + 하위 페이지 IA 를 제안한다. 본 IR 은 **조사·제안만** 수행하며 코드/라우트/페이지/푸터 변경은 하지 않는다.

---

## 2. 현재 라우팅 구조

### 2.1 `/business/bloodcare` 등록 위치

[`services/web-glycopharm/src/App.tsx`](../../services/web-glycopharm/src/App.tsx)

```
<Route element={<MainLayout />}>           // 공개 라우트 블록 (line 519)
  ...
  <Route path="contact" element={<ContactPage />} />
  <Route path="business/bloodcare" element={<BloodCareBusinessStatusPage />} />   // line 575
  ...
</Route>
...
<Route path="*" element={<NotFoundPage />} />   // 최상위 catch-all (line 950)
```

| 항목 | 값 |
|------|------|
| 경로 | `business/bloodcare` (MainLayout 공개 블록의 직속 자식) |
| 부모 `/business` 라우트 | ❌ 없음 |
| Layout | `MainLayout` (공개) |
| Guard | 없음 — **비로그인 공개 접근** |
| lazy | ✅ `lazy(() => import('@/pages/business/BloodCareBusinessStatusPage'))` (line 57) |
| 404 처리 | 최상위 `path="*"` → `NotFoundPage` (line 950) |

### 2.2 핵심 관찰

- `path="business/bloodcare"` 는 React Router v6 에서 **단일 경로 매칭**으로 동작 — `/business` 부모 세그먼트가 별도로 존재할 필요 없이 `/business/bloodcare` 전체를 매칭한다.
- 따라서 `/business` 라우트는 **명시적으로 등록되지 않았고**, 자동 생성되지도 않는다.
- `/business` 하위 라우트 추가는 구조상 자유롭게 가능 — MainLayout 블록 내에 `business` 부모 라우트(+index +자식)를 추가하거나, 개별 `business/*` 평면 라우트를 추가하는 두 방식 모두 가능.

### 2.3 참고 모델 — `store-hub` 중첩 허브 패턴 (이미 존재)

```
<Route path="store-hub" element={<GlycoHubGuard><GlycoPharmHubLayout /></GlycoHubGuard>}>
  <Route index element={<GlycoStoreHubPage />} />     // /store-hub
  <Route path="b2b" element={<HubB2BCatalogPage />} />
  <Route path="content" element={<HubContentListPage />} />
  ...
</Route>
```

→ `/business` 도 동일하게 **부모 라우트 + `<Route index>` 허브 페이지 + 자식 상세 페이지** 패턴으로 구성 가능. 신규 패턴 발명 불필요.

---

## 3. 현재 푸터 메뉴 연결 구조

[`services/web-glycopharm/src/components/common/Footer.tsx`](../../services/web-glycopharm/src/components/common/Footer.tsx)

"서비스" 그룹:

```
<h4>서비스</h4>
<ul>
  <li><NavLink to="/forum">포럼</NavLink></li>
  <li><NavLink to="/education">교육/자료</NavLink></li>
  <li><NavLink to="/business/bloodcare">혈당관리 약국 사업</NavLink></li>   // line 50-51
</ul>
```

| 항목 | 값 |
|------|------|
| 연결 방식 | `react-router-dom` `NavLink` (내부 SPA 클라이언트 네비게이션) |
| 새창 | ❌ 아님 (target 없음) |
| 그룹 | "서비스" (포럼 / 교육/자료 와 동일 그룹) |
| `/business` 로 변경 가능성 | ✅ 가능 — `to="/business"` 로 1줄 변경. 단 `/business` 라우트가 먼저 존재해야 함 |
| 다른 메뉴와 일관성 | 포럼(`/forum`)·교육(`/education`)은 **상위 영역 루트**로 연결되나, "혈당관리 약국 사업"만 **세부 페이지**(`/business/bloodcare`)로 직행 → **일관성 결여** |

### 3.1 핵심 관찰

- 포럼/교육은 영역 루트로 가는데 사업 메뉴만 세부 페이지로 직행 → 메뉴 레벨과 라우트 레벨 불일치.
- `/business` 허브 신설 후 푸터를 `to="/business"` 로 바꾸면 다른 메뉴와 일관성 확보 + 404 동시 해소.

> ⚠️ `/education` 은 라우트 상 `/lms` 로 통일되어 있어(App.tsx line 536 `path="lms"`) `/education` 직접 접근도 404 가능성 있음. **본 IR scope 외**이나 별도 점검 후보로 기록.

---

## 4. 현재 `/business/bloodcare` 페이지 구성

[`services/web-glycopharm/src/pages/business/BloodCareBusinessStatusPage.tsx`](../../services/web-glycopharm/src/pages/business/BloodCareBusinessStatusPage.tsx) — 단일 flat 페이지, 7 섹션.

| # | 섹션 | anchor / 위치 | 분량 | 성격 |
|---|------|--------------|:----:|------|
| 1 | Hero (제목 + 현재 단계 배지 + 3버튼 + 사업 진행 요약 카드) | line 287 (h1) | 중 | 대표 안내 |
| 2 | 사업 진행 단계 (사전 준비 / 초기 오픈 / 사업 확장 3카드) | line 365 | 소 | 흐름 안내 |
| 2-B | 제품 등록 및 공급자 협의 준비 (framing + O4O 활용 9 + 검토 질문 10 + 하위 흐름 3) | `#prep-product-supplier` line 402 | **대** | 사전 준비 상세 |
| 3 | 사업 논의 게시판 (버튼 3 + 안내형 최근 논의 + 카테고리 chip) | `#discussion-board` line 497 | 중 | 포럼 연결 |
| 4 | 주요 사업 항목 (6 카드) | line 585 | 중 | 사업 목록 |
| 5 | 참여자별 확인 사항 (4 카드) | line 618 | 중 | 역할 안내 |
| 6 | 다음 확인 사항 (14 체크리스트) | `#prep-checklist` line 651 | 중 | 점검 목록 |

### 4.1 관찰

- 섹션 2-B(제품 등록·공급자 협의 준비)가 단일 섹션으로 가장 큼 — **분리 1순위 후보**.
- Hero / 사업 진행 단계 / 주요 사업 항목 6개는 **허브(요약)** 성격 — `/business` 상위로 이동/요약하기 적합.
- 다음 확인 사항(14항목)은 사전 준비 점검 — `/business/preparation` 또는 bloodcare 상세에 귀속.

---

## 5. `/business` 404 원인

```
https://glycopharm.co.kr/business/bloodcare  → 200, BloodCareBusinessStatusPage 렌더 ✅
https://glycopharm.co.kr/business             → SPA 404 (NotFoundPage)
```

**원인**: `/business` 경로에 매칭되는 라우트가 없음.
- 등록된 것은 `business/bloodcare` 단일 경로뿐.
- `/business` 는 MainLayout 블록 내 어떤 자식과도 매칭되지 않고, 최상위 `<Route path="*" element={<NotFoundPage />} />` 로 떨어진다.
- (SPA 특성상 서버는 index.html 을 HTTP 200 으로 반환하고, 클라이언트 라우터가 NotFoundPage 를 렌더 → "200 OK + 404 화면")

**해소 방법**: `/business` 에 매칭되는 라우트(허브 index 또는 redirect)를 추가하면 됨. 본 IR 은 제안만, 구현은 후속 WO.

---

## 6. `/business` 상위 허브 필요성

### 6.1 필요성 평가

| 근거 | 평가 |
|------|:----:|
| 메뉴명("사업")이 영역 수준인데 단일 세부 페이지 직행 → 사용자 기대 불일치 | ✅ 허브 필요 |
| `/business` 404 (빈 영역 루트) | ✅ 허브가 자연 해소 |
| `/business/bloodcare` 단일 페이지에 콘텐츠 누적(7섹션, 점증) | ✅ 허브 + 분리로 완화 |
| 향후 사전 준비 / 초기 오픈 / 사업 확장 / 무료혈당기 / 제품 등록 / 이벤트 오퍼 / Market Trial 개별 관리 | ✅ 상위 허브 + 하위 페이지가 적합 |
| 다른 메뉴(포럼/교육)와의 레벨 일관성 | ✅ 영역 루트로 통일 |

→ **상위 허브 도입은 타당**. 단 즉시 전면 분리가 아니라 **허브 골격 먼저, 콘텐츠 분리는 점진**.

### 6.2 허브 도입 비용

- 라우트: `store-hub` 패턴 재사용 → 낮음.
- 페이지: `/business` 허브 1개 신규(요약 카드 + 하위 entry 링크).
- 푸터: `to="/business"` 1줄.
- 위험: 낮음 (공개 페이지, guard 없음, 기존 패턴).

---

## 7. `/business/bloodcare`에서 분리할 후보

| 후보 | 현재 위치 | 분리 판단 | 비고 |
|------|----------|----------|------|
| 사업 진행 단계 (3단계) | bloodcare §2 | **허브 요약** | `/business` 허브에 3단계 요약 카드로 |
| 제품 등록 및 공급자 협의 준비 | bloodcare §2-B | **별도 하위 페이지** → `/business/products` | 분량 大, 독립성 높음 (1순위) |
| 사전 준비 (단계 상세 + 다음 확인 사항) | bloodcare §2/§6 | **별도 하위 페이지** → `/business/preparation` | 체크리스트 + 단계 상세 묶기 |
| 무료혈당기 사업 | bloodcare §4 카드 | **placeholder 하위** → `/business/free-glucose-meter` | 핵심 사업, 추후 상세화 |
| 혈당관리 지원약국 | bloodcare §4 카드 | **placeholder 하위** (선택) | 추후 |
| 이벤트 오퍼 | bloodcare §4 카드 | **허브 요약 + entry** | 운영자 기능은 `/operator/event-offers` 기존 존재 — 중복 주의 |
| 설문조사 | bloodcare §4 카드 | **허브 요약** | 운영자 `/operator/surveys` 존재 |
| Market Trial 기반 제품 개발 | bloodcare §4 카드 | **소개/anentry 만** | 실행은 Neture (§8 참조) |
| 참여자별 역할 | bloodcare §5 | **허브 또는 유지** | 허브에 두면 전체 안내로 적합 |
| 사업 논의 게시판 | bloodcare §3 | **forum 연결 유지** → `/business/forum` 은 redirect/wrapper 검토 | 전용 게시판 신설은 비권장(§9) |

판단 기준 적용:
- **허브 요약만**: 사업 진행 단계, 이벤트 오퍼, 설문조사, 참여자별 역할
- **bloodcare 상세 유지 또는 preparation 으로**: 다음 확인 사항
- **별도 하위 페이지 분리**: 제품 등록·공급자 협의(`/business/products`), 사전 준비(`/business/preparation`)
- **placeholder 하위**: 무료혈당기, 지원약국, Market Trial(안내)

---

## 8. Market Trial 및 O4O 원칙 정합성 검토

### 8.1 Market Trial 경계

| 기준 | 현재 상태 | 판정 |
|------|----------|:----:|
| GlycoPharm 에서 Market Trial 을 **사업 항목으로 소개** | bloodcare §4 카드 + §6 체크리스트 "Market Trial 기반 제품 개발 후보" | ✅ 소개 수준 — 정합 |
| GlycoPharm 에 Market Trial **실행 플로우** 존재 | ❌ 없음 (소개 텍스트만) | ✅ 정합 (실행 미구현) |
| 실제 Market Trial 실행 = Neture 담당 | Neture Distribution Engine / Market Trial = Neture 영역 (Freeze F8) | ✅ 경계 유지 |

### 8.2 향후 `/business/market-trial` 도입 시 가드

- **반드시 안내/entry 수준**: 개념 소개 + 약국 현장 반응 연결 의미만.
- 실제 trial 생성/모집/검증 플로우는 **Neture 로 링크** — GlycoPharm 내부 구현 금지.
- O4O 3-Role Flow: GlycoPharm = 약국 경영자 접점(entry/안내), Neture = 공급자/B2B 실행. Market Trial 실행은 Neture 측 책임.

### 8.3 O4O 공통 구조 원칙 정합

- **Home/공통 구조**는 공통화 대상이나 **메뉴·사업 표현은 서비스 정체성 영역** — `/business` 허브를 GlycoPharm 정체성(약국 경영자 중심 혈당관리 사업)으로 구성하는 것은 정합.
- forum/lms/signage 는 플랫폼 공통 구조 — 사업 논의 게시판도 **GlycoPharm 전용 게시판 신설이 아니라 공통 forum 재사용**이 원칙(§9).

---

## 9. 가능한 IA 대안

### 권장안 A — 단순 구조 (최소)

```
/business            사업 전체 허브 (요약 + bloodcare entry)
/business/bloodcare  혈당관리 약국 사업 상세 (현재 페이지 거의 그대로)
```

| 측면 | 평가 |
|------|------|
| 장점 | 404 해소 + 메뉴 레벨 정합. 변경 최소. bloodcare 내용 보존. |
| 단점 | bloodcare 누적 문제 미해결 (여전히 1페이지에 7섹션). |
| 위험 | 매우 낮음 |

### 권장안 B — 중간 구조 ✅ (현 단계 권장)

```
/business             사업 전체 허브 (사업 진행 단계 요약 + 참여자 역할 + 하위 entry 카드)
/business/bloodcare   혈당관리 약국 사업 상세 (사업 항목 6 + 현황)
/business/products    제품 등록 및 공급자 협의 준비 (현재 §2-B 이관)
/business/preparation 사전 준비 (단계 상세 + 다음 확인 사항)
/business/forum       사업 논의 게시판 → 공통 forum 연결 (redirect 또는 wrapper)
```

| 측면 | 평가 |
|------|------|
| 장점 | 404 해소 + 누적 완화(가장 큰 §2-B 분리) + 확장 골격 확보 + forum 재사용. 점진 도입 가능. |
| 단점 | 페이지 2-3개 신규 — Phase 분할 필요. |
| 위험 | 낮음~중간 (공개 페이지, 콘텐츠 이관 위주) |

### 권장안 C — 확장 구조 (조기 과설계)

```
/business + bloodcare + free-glucose-meter + support-pharmacy
        + products + event-offers + market-trial + preparation
```

| 측면 | 평가 |
|------|------|
| 장점 | 모든 사업 항목 독립 페이지. 장기 목표 구조. |
| 단점 | 현재 콘텐츠가 placeholder 수준 — **빈 페이지 다수 양산**. event-offers/surveys 는 `/operator/*` 와 의미 중복. market-trial 은 Neture 경계 주의. 조기 과설계. |
| 위험 | 중간~높음 (유지 부담 + 빈 페이지 UX) |

---

## 10. 권장 구조

### ✅ 권장안 B (중간 구조) — 2-Phase 점진 도입

**근거**:
1. `/business` 404 + 메뉴 레벨 불일치를 허브 신설로 동시 해소.
2. 가장 큰 단일 섹션(제품 등록·공급자 협의, §2-B)을 `/business/products` 로 분리해 bloodcare 누적 완화.
3. `store-hub` 중첩 패턴 재사용으로 신규 패턴 불필요.
4. 콘텐츠가 placeholder 단계이므로 권장안 C 의 빈 페이지 양산을 피하고, 실제 필요해질 때 추가.
5. 사업 논의 게시판은 공통 forum 재사용(전용 게시판 신설 금지 — O4O 공통 구조 원칙).

### Phase 1 (저위험, 우선)
- `/business` 허브 페이지 신설 (`store-hub` 패턴: 부모 라우트 + index).
- `/business/bloodcare` 를 허브 하위로 정합 (라우트 유지 가능 — 평면 또는 중첩).
- 푸터 "혈당관리 약국 사업" → `to="/business"`.
- 허브 = 사업 진행 단계 요약 + 참여자 역할 요약 + 하위 entry 카드(현재는 bloodcare 1개 + "준비 중" placeholder).

### Phase 2 (콘텐츠 분리, 필요 시)
- `/business/products` (제품 등록·공급자 협의 준비 이관).
- `/business/preparation` (사전 준비 단계 상세 + 다음 확인 사항).
- `/business/forum` → 공통 forum redirect/wrapper.
- 무료혈당기/지원약국/Market Trial(안내)은 수요 발생 시 placeholder 하위로.

---

## 11. 후속 WO 후보

| ID (가칭) | 범위 | Phase | 우선 |
|-----------|------|:-----:|:----:|
| **WO-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-PAGE-V1** | `/business` 허브 라우트 + 허브 페이지 신설 + bloodcare 중첩 정합 + 푸터 `/business` 재연결 | 1 | 높음 (404 해소) |
| WO-O4O-GLYCOPHARM-BUSINESS-PRODUCTS-PAGE-SPLIT-V1 | §2-B 제품 등록·공급자 협의 준비를 `/business/products` 로 이관 | 2 | 중간 |
| WO-O4O-GLYCOPHARM-BUSINESS-PREPARATION-PAGE-SPLIT-V1 | 사전 준비 단계 상세 + 다음 확인 사항을 `/business/preparation` 으로 | 2 | 중간 |
| WO-O4O-GLYCOPHARM-BUSINESS-FORUM-LINK-V1 | `/business/forum` → 공통 forum redirect/wrapper + 사업 카테고리 검토 | 2 | 낮음 |
| (선택) WO-O4O-GLYCOPHARM-EDUCATION-ROUTE-404-CHECK-V1 | 푸터 `/education` → `/lms` 정합 점검 (본 IR scope 외) | — | 낮음 |
| (선택) IR-O4O-GLYCOPHARM-MARKET-TRIAL-ENTRY-VS-NETURE-BOUNDARY-V1 | Market Trial 안내 페이지 도입 시 Neture 경계 정책 | 2+ | 낮음 |

---

## 12. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) + [`o4o-common-structure`](../o4o-common-structure.md) + Neture Distribution Engine Freeze(F8) 정합 점검.

| 질문 | 현재 구조 | 판정 |
|------|----------|:----:|
| 현재 구조가 O4O 철학과 충돌하는가 | 사업 표현은 서비스 정체성 영역 — `/business` 허브 도입은 정체성 강화로 정합. 단 메뉴 레벨/라우트 레벨 불일치(영역 메뉴 → 세부 페이지)는 경미한 UX 흠. | △ 경미 |
| `/business` 없이 `/business/bloodcare` 만 존재가 사업 확장에 적절한가 | ❌ 부적절 — 영역 루트 부재 + 단일 페이지 누적. 확장 시 어수선. 허브 필요. | ❌ |
| Market Trial 을 GlycoPharm 내부 실행 기능처럼 오해하게 만드는가 | 현재는 소개 수준이라 오해 위험 낮음. 단 향후 `/business/market-trial` 페이지를 실행형으로 만들면 **Neture 경계(F8) 위반 위험**. 안내/entry 한정 가드 필요. | ⚠️ 향후 주의 |
| 푸터 메뉴와 실제 라우트가 사용자 기대와 맞는가 | "사업"(영역) 메뉴가 세부 페이지로 직행 + `/business` 404 → **기대 불일치**. 허브 + 푸터 재연결로 해소 권장. | ❌ → 권장안 B 로 해소 |
| 사업 논의 게시판을 GlycoPharm 전용으로 신설하는가 | 현재 공통 forum(`/forum/*`) 재사용 — O4O 공통 구조 원칙(forum=플랫폼 공통) 정합. 전용 게시판 신설은 **비권장**. | ✅ |

### 12.1 종합

> **현재 구조는 사업 확장 관점에서 `/business` 허브 부재 + 메뉴/라우트 레벨 불일치라는 구조적 약점이 있다.** 권장안 B(중간 구조, 2-Phase)가 O4O 정체성(서비스별 사업 표현) + 공통 구조(forum 재사용) + Neture 경계(Market Trial 실행은 Neture) 를 모두 만족한다. 즉시 전면 분리(권장안 C)는 placeholder 콘텐츠 단계에서 빈 페이지를 양산하므로 비권장.

### 12.2 핵심 통찰

> **"메뉴는 영역, 라우트는 영역 루트" 를 맞추되, 콘텐츠 분리는 실제 분량이 생긴 뒤에.**
> 허브 골격(Phase 1)은 저위험으로 먼저 세우고, 페이지 분리(Phase 2)는 콘텐츠가 placeholder 를 벗어날 때 진행한다. Market Trial 은 끝까지 GlycoPharm = 안내, Neture = 실행 경계를 지킨다.

---

## 13. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| **작성 문서** | `docs/investigations/IR-O4O-GLYCOPHARM-BUSINESS-HUB-ROUTE-AND-IA-AUDIT-V1.md` |
| **조사한 주요 파일** | `App.tsx` (라우트/catch-all), `Footer.tsx` (서비스 그룹), `pages/business/BloodCareBusinessStatusPage.tsx` (7섹션), `store-hub` 중첩 허브 패턴, forum 공개 라우트 |
| **`/business` 404 원인** | `business/bloodcare` 단일 경로만 등록 + `/business` 부모/index 라우트 부재 → 최상위 `path="*"` → NotFoundPage |
| **푸터 메뉴 연결 구조** | `NavLink to="/business/bloodcare"` (내부 SPA, 새창 아님). 포럼/교육과 달리 영역 메뉴가 세부 페이지로 직행 — 레벨 불일치 |
| **`/business/bloodcare` 현재 구성 요약** | Hero / 사업 진행 단계 / 제품 등록·공급자 협의 준비(최대 분량) / 사업 논의 게시판 / 주요 사업 항목 6 / 참여자별 확인 사항 / 다음 확인 사항 — 단일 flat 7섹션 |
| **권장 IA 구조** | 권장안 B (중간 구조, 2-Phase): Phase1 `/business` 허브+푸터 재연결, Phase2 `/business/products`·`/business/preparation`·`/business/forum` 분리 |
| **Market Trial 정합성 판단** | 현재 소개 수준 = 정합. 실행은 Neture(F8) 담당. 향후 `/business/market-trial` 도입 시 안내/entry 한정 + Neture 링크 가드 필요 |
| **후속 WO 후보** | Phase1: BUSINESS-HUB-ROUTE-AND-PAGE (높음). Phase2: PRODUCTS-PAGE-SPLIT / PREPARATION-PAGE-SPLIT / FORUM-LINK. 선택: education 404 점검, Market Trial 경계 IR |
| **코드 / 라우트 / 페이지 / 푸터 / UI 수정** | **없음** ✅ (조사 전용) |
| **문서 commit 여부** | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 조사 IR 완료. `/business` 404 원인 = index 라우트 부재. 권장 = 권장안 B(중간 구조, 2-Phase). 즉시 코드 작업 없음. Market Trial 은 GlycoPharm=안내 / Neture=실행 경계 유지. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
