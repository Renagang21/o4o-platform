# IR-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-DRIFT-AUDIT-V1

**작성 일자**: 2026-05-31
**조사 환경**: HEAD (main) `2b9f64adb` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Glob
**작업 성격**: read-only 조사 — 코드 / UI / API / DB / menu / route 수정 없음
**기준**: KPA-Society = Store HUB canonical. GlycoPharm / K-Cosmetics = 정렬 대상. Neture = 제외(내 매장 기능 없음)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **Store HUB 는 "공통화 완료"가 아니라 service-local 병렬 복제 상태. 공유 컴포넌트 0 — 같은 이름 페이지도 3개 별도 파일.**
>
> 1. **공유 컴포넌트 부재** — `HubB2BCatalogPage` / `HubBlogLibraryPage` 등 동명 페이지가 KPA(`pages/pharmacy/`) · GlycoPharm/K-Cos(`pages/hub/`) 에 **각각 service-local 로 별도 존재**. packages 공유 0. "공통화 완료"로 보였던 영역에 실제 shared 컴포넌트가 없음(GlycoPharm b2b 정렬에서 드러난 패턴이 HUB 전반).
> 2. **K-Cosmetics b2b = GlycoPharm 과 동일 drift (미정렬, HIGH)** — `HubB2BPage`(KPA `HubB2BCatalogPage` 와 다른 컴포넌트), **품목 탭**(화장품/뷰티디바이스/헤어케어/스킨케어/바디케어, `category` param), "B2B 상품 카탈로그" / "내 매장에 신청". → GlycoPharm 과 동일 정렬 WO 필요(단 store terminology).
> 3. **K-Cosmetics POP/QR = 미구현(`badge: '준비 중'`)** — 메뉴엔 있으나 store-hub route 없음. KPA 는 완전 구현. → PORT WO 후보(MED).
> 4. **GlycoPharm 사이니지 = hub page 없음** — `/store-hub/signage` 가 `/store/marketing/signage/library` 로 redirect. KPA/K-Cos 는 hub page. 구조 분기(MED).
> 5. **콘텐츠 = 3개 다른 컴포넌트** — HubContentLibraryPage(KPA) / HubContentListPage(Glyco) / HubContentPage(K-Cos). 분기(MED).
> 6. **블로그 = 3 service-local 이나 패턴 정합** — 3개 다 canonical DataTable + ActionBar + 가져가기. 기능 정합(LOW) 이나 병렬 복제(공통화 후보).
> 7. **메뉴 layout 자체 분기** — KPA = `HubSubNav`(가로 탭, label only). GlycoPharm/K-Cos = `*HubLayout`(사이드바, label+desc). KPA 만 다른 layout.
>
> → 정렬 우선순위: **K-Cos b2b 정렬(HIGH)** → K-Cos pop/qr PORT + GlycoPharm signage 정합(MED) → 장기 공유 컴포넌트 추출 IR. Neture 제외 정합.

---

## 1. 서비스별 Store HUB 메뉴 비교

| 항목 | KPA (HubSubNav, 가로) | GlycoPharm (사이드바) | K-Cosmetics (사이드바) | 판정 |
|------|----------------------|----------------------|----------------------|:----:|
| 홈/마켓 | HUB 마켓 (/store-hub) | 홈 (/store-hub) | 홈 (/store-hub) | A |
| **상품 카탈로그** | **상품 카탈로그** (/store-hub/b2b) | **상품 카탈로그** ✅ | **"B2B 상품"** (…매장에 신청) | **C (K-Cos)** |
| 사이니지 | 사이니지 (/store-hub/signage) | 사이니지 (redirect→store marketing) | 사이니지 (/store-hub/signage) | C (Glyco 구조) |
| 콘텐츠 | 콘텐츠 (/store-hub/content) | 콘텐츠 | 콘텐츠/자료 | B~C (컴포넌트 분기) |
| 블로그 | (HubSubNav 미노출, route 有) | 블로그 | 블로그 | A~B |
| POP | (HubSubNav 미노출, route 有) | POP (/store-hub/pop) | **POP (badge '준비 중')** | **D (K-Cos)** |
| QR | (HubSubNav 미노출, route 有) | QR 코드 (/store-hub/qr) | **QR 코드 (badge '준비 중')** | **D (K-Cos)** |
| 이벤트/특가 | 이벤트/특가 (/store-hub/event-offers) | 이벤트/특가 | 캠페인·이벤트 | B (label) |
| 서비스 | 서비스 (/services/pharmacy) | — | — | E (서비스별) |

> **메뉴 layout 분기**: KPA = `components/pharmacy/HubSubNav.tsx`(가로 탭, label only, blog/pop/qr 미노출). GlycoPharm = `GlycoPharmHubLayout.tsx`, K-Cos = `KCosmeticsHubLayout.tsx`(사이드바, label+desc, blog/pop/qr 노출). → KPA 메뉴 UX 자체가 다른 형태(별도 정합 고려 대상).

---

## 2. 서비스별 Store HUB route / page 비교

| route | KPA | GlycoPharm | K-Cosmetics |
|-------|-----|-----------|-------------|
| index | StoreHubPage | GlycoStoreHubPage | KCosmeticsHubPage |
| **b2b** | **HubB2BCatalogPage** (`pages/pharmacy/`) | **HubB2BCatalogPage** (`pages/hub/`) ✅ | **HubB2BPage** (`pages/hub/`) ⚠️ |
| signage | HubSignageLibraryPage | **Navigate→/store/marketing/signage/library** | HubSignagePage |
| content | HubContentLibraryPage | HubContentListPage | HubContentPage |
| blog | HubBlogLibraryPage (`pages/pharmacy/`, 400줄) | HubBlogLibraryPage (`pages/hub/`, 322줄) | HubBlogLibraryPage (`pages/hub/`, 320줄) |
| pop | HubPopLibraryPage | HubPopLibraryPage | **route 없음 (준비 중)** |
| qr | HubQrLibraryPage | HubQrLibraryPage | **route 없음 (준비 중)** |
| event-offers | KpaEventOfferPage | HubEventOffersPage | HubEventOffersPage |

> **공유 컴포넌트 0**: 모든 페이지가 service-local. 동명(HubB2BCatalogPage / HubBlogLibraryPage)도 KPA `pages/pharmacy/` vs Glyco/K-Cos `pages/hub/` 로 **3개 별도 구현**. packages/store-ui-core 에 hub 페이지 컴포넌트 없음.

---

## 3. 주요 항목별 drift 조사

### 3-1. 상품 카탈로그 (b2b)

| | KPA (canonical) | GlycoPharm | K-Cosmetics |
|--|-----------------|-----------|-------------|
| 컴포넌트 | HubB2BCatalogPage | HubB2BCatalogPage | **HubB2BPage** (다름) |
| title | 상품 카탈로그 | 상품 카탈로그 ✅ | **B2B 상품 카탈로그** |
| desc/action | …탐색하고 내 매장에 추가 | ✅ | …탐색하고 **내 매장에 신청** |
| 탭 축 | 유통유형(전체/B2B/운영자/판매자 모집) | 유통유형 ✅ | **품목(화장품/뷰티디바이스/헤어케어/스킨케어/바디케어)** |
| 탭 → API | distributionType/operatorView | ✅ | **category** param |
| 테이블 | canonical DataTable + checkbox + ActionBar + bulk | ✅ | 로컬(품목 탭 내장, canonical DataTable 미사용 추정) |
| 메뉴 label | 상품 카탈로그 | 상품 카탈로그 ✅ | **B2B 상품** |

→ **GlycoPharm = 정렬 완료(A)**. **K-Cosmetics = 미정렬 drift(C, HIGH)** — GlycoPharm 직전 WO 와 동일 패턴(품목 탭 + 로컬 테이블 + "신청" + 다른 컴포넌트). 정렬 WO 필요(단 의약품 아닌 store terminology, 화장품 품목 탭 제거).

### 3-2. 디지털 사이니지

| KPA | GlycoPharm | K-Cosmetics |
|-----|-----------|-------------|
| HubSignageLibraryPage (hub page) | `/store-hub/signage` → **/store/marketing/signage/library redirect** (hub page 없음) | HubSignagePage (hub page) |

→ GlycoPharm 은 사이니지를 store marketing 영역으로 통합(hub page 미존재). KPA/K-Cos 는 hub page. **구조 분기(MED)** — 의도적 통합인지/정렬 대상인지 정책 결정 필요.

### 3-3~3-5. 블로그 / POP / QR

| | KPA | GlycoPharm | K-Cosmetics |
|--|-----|-----------|-------------|
| 블로그 | DataTable+ActionBar+useBatchAction+가져가기 (canonical, 400줄) | DataTable+ActionBar (322줄, 정합) | DataTable+ActionBar (320줄, 정합) |
| POP | HubPopLibraryPage (구현) | HubPopLibraryPage (구현) | **미구현 (badge '준비 중')** |
| QR | HubQrLibraryPage (구현) | HubQrLibraryPage (구현) | **미구현 (badge '준비 중')** |

→ **블로그 = 3 서비스 패턴 정합(DataTable+ActionBar+가져가기)** 이나 **3개 별도 service-local 파일**(공통화 후보, LOW). **K-Cos POP/QR = 미구현(D)** — PORT WO 필요.

### 3-6. 콘텐츠 / 자료

| KPA | GlycoPharm | K-Cosmetics |
|-----|-----------|-------------|
| HubContentLibraryPage | HubContentListPage | HubContentPage |

→ **3개 다른 컴포넌트명/구현**. 콘텐츠 가져가기 구조가 ContentHubTemplate/DataTable 중 무엇을 쓰는지 서비스별 상이 가능. 분기(MED) — 별도 정밀 비교 후보.

### 3-7. 이벤트 / 특가

| KPA | GlycoPharm | K-Cosmetics |
|-----|-----------|-------------|
| KpaEventOfferPage | HubEventOffersPage | HubEventOffersPage |

→ KPA 는 자체 KpaEventOfferPage, Glyco/K-Cos 는 HubEventOffersPage(이름 동일하나 service-local). 메뉴 label "이벤트/특가" vs "캠페인·이벤트"(K-Cos). 분기(MED/LOW).

---

## 4. KPA canonical 기준 drift 등급화

| 항목 | 서비스 | 등급 | 중요도 | 근거 |
|------|--------|:----:|:------:|------|
| b2b 상품 카탈로그 | GlycoPharm | **A** | — | 정렬 완료(직전 WO) |
| b2b 상품 카탈로그 | **K-Cosmetics** | **C** | **HIGH** | 품목 탭 + 로컬 테이블 + "신청" + HubB2BPage. 품목·노출 제어를 화면이 떠안음 |
| POP / QR | **K-Cosmetics** | **D** | **MED** | 미구현(준비 중). KPA 완전 구현 |
| 사이니지 | GlycoPharm | **C** | MED | hub page 없음(store marketing redirect) |
| 콘텐츠 | Glyco / K-Cos | **B~C** | MED | 컴포넌트 분기(3종) |
| 블로그 | Glyco / K-Cos | **A~B** | LOW | 패턴 정합, 단 service-local 병렬 복제 |
| 이벤트/특가 | Glyco / K-Cos | **B** | LOW | label drift(캠페인·이벤트), 컴포넌트 분기 |
| 메뉴 layout | KPA | **C** | LOW | HubSubNav(가로) vs HubLayout(사이드바) |
| 전 항목 공유 컴포넌트 | 전 서비스 | **C(구조)** | MED | service-local 병렬 복제(공유 0) |

---

## 5. GlycoPharm / K-Cosmetics 남은 drift 요약

**GlycoPharm 남은 drift**:
- 사이니지 hub page 없음(store marketing redirect) — KPA 정합 여부 정책 결정(MED)
- 콘텐츠(HubContentListPage) 컴포넌트 분기(MED)
- blog/pop/qr service-local(공통화 후보, LOW)
- b2b 는 정렬 완료 ✅

**K-Cosmetics 남은 drift**:
- **b2b 미정렬(HIGH)** — 품목 탭 + HubB2BPage + "신청"
- **POP/QR 미구현(MED)** — 준비 중 badge
- 콘텐츠(HubContentPage) 분기, 이벤트 label(캠페인·이벤트)(LOW)
- blog 는 패턴 정합(service-local)

---

## 6. 후속 WO 우선순위 제안

| 순서 | WO (가칭) | 범위 | 우선 |
|:---:|-----------|------|:----:|
| 1 | **WO-O4O-KCOS-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1** | K-Cos HubB2BPage → KPA canonical(유통유형 탭 + canonical DataTable + bulk ActionBar + "상품 카탈로그"/"내 매장에 추가"). 화장품 품목 탭 제거. store terminology(의약품 미사용). GlycoPharm WO mirror. backend 무변경(공유 컨트롤러 동일) | **HIGH** |
| 2 | **WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1** | K-Cos POP/QR 구현(KPA HubPop/QrLibraryPage 패턴 이식). 준비 중 badge → 실제 페이지 | MED |
| 3 | **IR-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-STRUCTURE-DECISION-V1** | GlycoPharm 사이니지 hub page 부재(store marketing redirect) 정합/유지 정책 결정 | MED |
| 4 | IR-O4O-CROSSSERVICE-STORE-HUB-CONTENT-PAGE-ALIGNMENT-V1 | 콘텐츠 3종 컴포넌트(Library/List/Content) 비교·정합 | MED |
| 5 (장기) | **IR-O4O-CROSSSERVICE-STORE-HUB-PAGE-COMMONIZATION-V1** | b2b/blog/pop/qr/content service-local 병렬 복제 → 공유 컴포넌트(store-ui-core) + service-config 주입(DomainIASidebar 패턴) | LOW |
| 6 (선택) | WO-O4O-CROSSSERVICE-STORE-HUB-MENU-LABEL-ALIGNMENT-V1 | 메뉴 label 정합(캠페인·이벤트→이벤트/특가 등) + KPA HubSubNav vs HubLayout layout 정책 | LOW |

> 실제 후속은 사용자 우선순위에 따라 재정렬. 1(K-Cos b2b)이 GlycoPharm 직전 WO 와 동일 패턴이라 가장 즉시 처리 가능(저위험).

---

## 7. Current Structure vs O4O Philosophy Conflict Check

| 확인 항목 | 판정 |
|-----------|------|
| 1. Store HUB 가 매장 실행 자산 탐색·가져가기 공간으로 유지 | ✅ 3 서비스 모두 "탐색 + 내 매장에 추가/가져가기" 구조. 단 K-Cos b2b 가 "신청" 어휘 drift |
| 2. 공급자/품목/노출 제어 책임이 Neture 영역에 유지 | ⚠️ **K-Cos b2b 가 품목 탭(화장품/뷰티디바이스 등)으로 품목 제어를 화면이 떠안음** — Neture 책임 위반 drift(GlycoPharm 정렬로 해소된 패턴이 K-Cos 에 잔존) |
| 3. 서비스별 품목 탭/service-local legacy 가 공통 구조와 충돌 | ⚠️ **충돌** — 모든 hub 페이지 service-local 병렬 복제(공유 0) + K-Cos 품목 탭 = O4O 공통 구조(§13) drift |
| 4. KPA canonical 기준 다른 서비스 정렬 가능 | ✅ 가능 — GlycoPharm 이 이미 입증(데이터 소스 동일, 공유 backend). K-Cos 도 동일 경로 |
| 5. Neture 를 비교 대상에 잘못 포함 안 함 | ✅ Neture 제외(내 매장 기능 없음) 정합 |

**결론**: Store HUB 는 **"공통화 완료"가 아니라 service-local 병렬 복제 + 부분 drift** 상태. O4O 공통 구조(§13)·HUB 철학(§5)·Neture 품목 책임 분리 관점에서 **K-Cos b2b 품목 탭 제거 + KPA 정렬이 최우선(HIGH)** 이고, 나머지는 단계적 정렬·장기 공유 컴포넌트 추출이 정합 경로. Twin Axis: KPA reference 기준 GlycoPharm/K-Cos 정렬(역방향 아님), Neture 제외.

---

## 8. Working tree 격리 / commit 정책

- 조사 시작 시점 working tree **clean** (staged/deleted/modified/untracked 0).
- 본 IR 문서 1개만 생성. **read-only — 코드/UI/API/DB/menu/route 미변경.**
- commit 시 본 IR 문서 1개만 path-restricted. `git add .` 금지.

---

> **상태**: read-only 조사 완료. Store HUB 는 공유 컴포넌트 0 의 service-local 병렬 복제. **K-Cos b2b = GlycoPharm 과 동일 drift(품목 탭+로컬테이블+"신청", HIGH)**, K-Cos POP/QR 미구현(MED), GlycoPharm 사이니지 hub page 부재(MED), 콘텐츠 3종 분기(MED), 블로그 패턴 정합(LOW). 최우선 후속 = WO-O4O-KCOS-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1. Neture 제외 정합.
