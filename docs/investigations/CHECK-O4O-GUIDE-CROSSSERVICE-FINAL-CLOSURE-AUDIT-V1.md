# CHECK-O4O-GUIDE-CROSSSERVICE-FINAL-CLOSURE-AUDIT-V1

- **WO**: WO-O4O-GUIDE-CROSSSERVICE-FINAL-CLOSURE-AUDIT-V1
- **성격**: 최종 census · closure 감사 (읽기 전용 · 신규 Guide 제작 없음)
- **기준 커밋**: `2ea6cd81f` (origin/main, 2026-08-21)
- **대상**: KPA-Society · K-Cosmetics · GlycoPharm · PharmacyHub · Neture (5 서비스)
- **선행 CHECK**: CENSUS-V1 · STALE-ROUTE-AND-COPY-CONTRACT-CLEANUP-V1 · ENTRY-AND-LANDING-COMMONIZATION-V1 · PHARMACYHUB-GUIDE-ADOPTION-V1 · CROSSSERVICE-COVERAGE-GAP-CLOSURE-V1

---

## 1. 최종 집계 (§27)

```text
전체 Guide 모집단: 115
FULLY_COMMON: 85
CORE_ONLY: 0
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 2
NOT_IMPLEMENTED: 12
OUT_OF_SCOPE: 16
미조사: 0
```

```text
A형 coverage gap: 3
B형 잔존: 5
C형 잔존: 6

MUST_FIX_BEFORE_CLOSE: 3
ACCEPTED_RESIDUAL: 15
OUTSIDE_GUIDE: 3

최종 판정:
GUIDE_COMMONIZATION = NOT_COMPLETE
```

> **NOT_COMPLETE 사유**: 외국인 여행객 판매지원(`/store/sales-channels/foreign-visitor`) 은
> KPA · K-Cosmetics · GlycoPharm 3 서비스 매장 사이드바에 상시 노출되는 실기능(월 이용권 구독 →
> 파트너 등록 → 파트너별 QR 발급 → 공개 랜딩 → 유입 확인) 인데 Guide 언급이 **0** 이다.
> A형 coverage gap 3 → §24 필수 조건(A형 = 0 · MUST_FIX = 0) 미충족.

---

## 2. 모집단 정의 (§3 · §4)

기능 단위는 "사용자가 하나의 독립된 안내 기능으로 인식하는 단위" 로 잡았다.
Guide 한 페이지 안의 step 은 분해하지 않았고, Guide 전체를 한 cell 로 뭉치지도 않았다.
**23 기능 단위 × 5 서비스 = 115 cell**. 이전 census 의 95 / 85 숫자는 재사용하지 않고
현재 `main` 의 `<Route>` 정의 · guide copy · storeMenuConfig · navigation config 에서 재산출했다.

| # | 기능 단위 | 축 |
|---|---|---|
| U1 | 서비스 소개 `/service-guide` | A |
| U2 | Guide canonical 진입 `/guide` | A |
| U3 | Guide 개요 `/guide/intro` | A |
| U4 | Guide 개요 하위 4종(structure · 서비스 · operation · concept) | A |
| U5 | 서비스 활용 방법 `/guide/usage` | A |
| U6 | 기능별 이용 방법 index `/guide/features` | A |
| U7 | Guide 진입점(header · footer · shell · community home) | A |
| U8 | 커뮤니티 · 포럼 guide | B |
| U9 | 콘텐츠 guide | C |
| U10 | 자료(자료실 · 자료함) guide | D |
| U11 | LMS · 교육 guide | E |
| U12 | 매장 운영 guide | F |
| U13 | QR guide | G |
| U14 | 태블릿 guide | G |
| U15 | 사이니지 guide | G |
| U16 | POP guide | G |
| U17 | 제작 자료 · 상품 설명서 guide | G |
| U18 | 블로그 guide | G |
| U19 | 설문 guide | H |
| U20 | 역할별 guide | H |
| U21 | 서비스 고유 기능 guide(공급자 · 상품등록 · 오퍼 · 펀딩 · 파트너 · Copilot) | H |
| U22 | 서비스 고유 사업 안내 guide(business 상세 · 서비스 소개) | H |
| U23 | 외국인 여행객 판매지원 guide | H |

---

## 3. Census matrix (115 cell · 미조사 0)

범례: **FC** FULLY_COMMON · **CO** CORE_ONLY · **VD** VIEW_DUPLICATED · **SS** SERVICE_SPECIFIC · **NI** NOT_IMPLEMENTED · **OOS** OUT_OF_SCOPE

| # | 기능 단위 | KPA | KCos | GP | PH | Neture |
|---|---|:--:|:--:|:--:|:--:|:--:|
| U1 | 서비스 소개 | FC | FC | FC | FC | OOS |
| U2 | `/guide` 진입 | FC | FC | FC | FC | FC |
| U3 | `/guide/intro` | FC | FC | FC | FC | FC |
| U4 | intro 하위 4종 | FC | FC | FC | FC | FC |
| U5 | `/guide/usage` | FC | FC | FC | FC | FC |
| U6 | `/guide/features` | FC | FC | FC | FC | FC |
| U7 | Guide 진입점 | FC | FC | FC | FC | FC |
| U8 | 포럼 · 커뮤니티 | FC | FC | FC | FC | FC |
| U9 | 콘텐츠 | FC | FC | FC | FC | FC |
| U10 | 자료 · 자료함 | FC | FC | FC | FC | FC |
| U11 | LMS · 교육 | FC | FC | FC | FC | NI |
| U12 | 매장 운영 | FC | FC | FC | FC | FC |
| U13 | QR | FC | FC | FC | FC | OOS |
| U14 | 태블릿 | FC | FC | **NI** | FC | OOS |
| U15 | 사이니지 | FC | FC | FC | FC | OOS |
| U16 | POP | FC | FC | FC | FC | OOS |
| U17 | 제작 자료 · 상품 설명서 | FC | FC | FC | FC | OOS |
| U18 | 블로그 | FC | FC | FC | FC | OOS |
| U19 | 설문 | FC | NI | NI | NI | NI |
| U20 | 역할별 | FC | NI | NI | NI | FC |
| U21 | 서비스 고유 기능 | OOS | OOS | OOS | OOS | FC |
| U22 | 서비스 고유 사업 안내 | OOS | OOS | OOS | OOS | SS |
| U23 | 외국인 여행객 판매지원 | **NI** | **NI** | **NI** | OOS | SS |

**서비스별 집계**

| 서비스 | FC | CO | VD | SS | NI | OOS | 계 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| KPA-Society | 19 | 0 | 0 | 0 | 1 | 3 | 23 |
| K-Cosmetics | 17 | 0 | 0 | 0 | 3 | 3 | 23 |
| GlycoPharm | 16 | 0 | 0 | 0 | 4 | 3 | 23 |
| PharmacyHub | 17 | 0 | 0 | 0 | 2 | 4 | 23 |
| Neture | 16 | 0 | 0 | 2 | 2 | 3 | 23 |
| **계** | **85** | **0** | **0** | **2** | **12** | **16** | **115** |

**기능축별 집계**

| 축 | cell | FC | 비고 |
|---|:--:|:--:|---|
| A. Guide shell · entry | 35 | 34 | Neture `/service-guide` 미도입(OOS) |
| B. 커뮤니티 · 포럼 | 5 | 5 | 전 서비스 |
| C. 콘텐츠 | 5 | 5 | 전 서비스 |
| D. 자료 · 자료함 | 5 | 5 | PH 는 콘텐츠·자료함 통합 매뉴얼 |
| E. LMS · 교육 | 5 | 4 | Neture 기능 없음 |
| F. 매장 운영 | 5 | 5 | PH 는 공급 주문 + 매장 제품 2 매뉴얼 |
| G. QR · 태블릿 · 사이니지 · POP · 제작자료 · 블로그 | 30 | 23 | GP 태블릿 NI · Neture 6 OOS |
| H. 설문 · 역할별 · 서비스 고유 · 외국인 여행객 | 25 | 4 | A형 3 포함 |

---

## 4. shared Guide adoption 최종 확인 (§6)

canonical 체계 `packages/shared-space-ui/src/guide/` — View 9 · copy 5 · types · styles · tests 3.

| shared View | 소비 서비스 |
|---|---|
| `GuideServiceIntroPage` | KPA · KCos · GP · PH (4) |
| `GuideIntroPage` | 5 |
| `GuideIntroStructurePage` · `GuideIntroKpaPage` · `GuideIntroOperationPage` · `GuideIntroConceptPage` | 5 |
| `GuideUsagePage` | 5 |
| `GuideFeaturesPage` | 5 (Neture 는 `index` · `indexPosition` · `serviceShowcase` 옵션 props 사용 — 서비스 분기 아님) |
| `GuideFeatureManualPage` | 5 |

wrapper 규모 — 서비스 Guide 페이지는 전부 route + config/copy 수준이다.

| 서비스 | wrapper 형태 | 크기 |
|---|---|---|
| KPA | `pages/guide/*.tsx` 21 개 (shared View + copy + `GuideEditableSection` renderText 주입) | 19~24 L |
| KCos · GP | App.tsx 라우트에서 shared View 직접 렌더 + `ServiceGuidePage` 13 L | 13 L |
| PH | App.tsx 라우트에서 shared View 직접 렌더 | 별도 wrapper 파일 없음 |
| Neture | `pages/guide/*.tsx` 32 개 shared wrapper | 18~23 L |

shared View 내부의 `if (service === ...)` 분기 **0**.

---

## 5. VIEW_DUPLICATED 최종 감사 (§7) — 0

과거 census 의 VIEW_DUPLICATED 2 건(KCos ↔ GP `ServiceGuidePage`) 은
ENTRY-AND-LANDING-COMMONIZATION-V1 에서 shared `GuideServiceIntroPage` 로 수렴됐다.
현재 KPA · KCos · GP `ServiceGuidePage` 는 3 개 모두 **13 L 동일 구조 wrapper**
(`<GuideServiceIntroPage {...{service}ServiceIntroProps} />`) 이며 JSX 복제가 없다.

Neture 의 5 개 대형 로컬 JSX 페이지(`GuideBusinessPharmacyCoopPage` 275 L ·
`GuideBusinessTouristStorePage` 302 L · `GuideBusinessForeignCustomerStorePage` 289 L ·
`GuideBusinessWarehousePharmacyPage` 349 L · `GuideForeignCustomerSupportPage` 258 L) 는
**cross-service View 복제가 아니다** — 다른 서비스에 대응 화면이 없는 Neture 전용 사업 안내
랜딩이며 shared Guide View 의 매뉴얼 골격과 정보구조가 다르다 → `SERVICE_SPECIFIC`.
단, 5 파일이 각자 `SectionTitle` 등 표시용 helper 를 자체 정의하는 **서비스 내부 중복**은 있다
(§20 ACCEPTED_RESIDUAL 로 기록, closure blocker 아님).

---

## 6. CORE_ONLY 재확인 (§8) — 0

CORE_ONLY cell 이 0 이므로 `MUST_FIX_BEFORE_CLOSE` 로 승격될 CORE_ONLY 항목도 0 이다.
모든 Guide cell 이 shared View + service copy/config 로 수렴했다.
KPA 의 `renderText` 주입과 Neture 의 `index`/`serviceShowcase` 는 shared `types.ts` 가 정의한
공식 옵션 props 이므로 fork 가 아니다.

---

## 7. Coverage gap 최종 재산출 (§9 · §19)

### A형 (기능 존재 + user-facing + Guide 없음) — 3

| 서비스 | 기능 | route | 진입 동선 | Guide |
|---|---|---|---|---|
| KPA | 외국인 여행객 판매지원 | `/store/sales-channels/foreign-visitor` (+ `/partners`, `/partners/:partnerId/qr-codes`, 구독 결제) | 매장 사이드바 "판매 채널 확장 > 외국인 여행객 판매지원" | 없음 (copy 언급 0) |
| KCos | 동일 | 동일 | 동일 | 없음 |
| GP | 동일 | 동일 | 동일 | 없음 |

- 게이트 확인: `StoreSidebar` 에 조건부 숨김 로직 없음 → 메뉴는 상시 노출된다.
- 화면은 소개 + 월 이용권 구독(Toss) 패널이지만, 구독 후 **파트너 등록 → 파트너별 QR 발급 →
  공개 랜딩(`/foreign-visitor/affiliate/:shortCode`) → 유입 확인** 의 다단계 운영 흐름이 있다.
- Neture 는 인접 개념(`/guide/foreign-customer-support`) 에 대해 이미 안내 페이지를 갖고 있어
  "안내가 필요 없는 기능" 이라는 판단은 성립하지 않는다.
- 3 서비스 guide copy 에서 `외국인` 문자열 검색 결과 **0 건**.

### B형 (기능 없음) — 5

| 항목 | 근거 |
|---|---|
| KCos 설문 | 매장·회원 대상 설문 기능 없음. `operator/surveys`(운영자 콘솔) 만 존재 |
| GP 설문 | 동일 |
| PH 설문 | survey route 0 |
| Neture 설문 | survey route 0 |
| Neture LMS | lms route 0 |

### C형 (기능은 있으나 Guide 불필요 / IA 미채택) — 6

| 항목 | 근거 |
|---|---|
| GP 태블릿 | `/store/commerce/tablet-displays` route 는 있으나 `GLYCOPHARM_STORE_CONFIG` 에 태블릿 메뉴 항목 없음(KCos·PH·KPA 만 보유) → 진입 동선 없는 기능을 정상 동선처럼 안내하지 않는다. 제품 결정 없이 A형 전환하지 않음(§10) |
| KCos 역할별 guide | 역할별 Value Guide IA 미채택(KPA·Neture 만 보유) |
| GP 역할별 guide | 동일 |
| PH 역할별 guide | 동일 |
| PH 설정(`/store-owner/account`) | 계정 폼 수준 — PH Guide 는 영역별 매뉴얼 구조이며 별도 안내 단위 아님 |
| Neture `/service-guide` | `/guide` 허브가 그 역할을 겸함(선행 WO 판정 유지) · dead link 0 |

---

## 8. GlycoPharm 최종 확인 (§10)

| route | copy export | shared View | 기능 index 진입 | 프로덕션 |
|---|---|---|---|---|
| `/guide/features/lms` | `glycopharmGuideFeatureLmsProps` | `GuideFeatureManualPage` | 그룹 "강의" | 200 · h1 "강의(LMS) 이용 방법" |
| `/guide/features/store` | `glycopharmGuideFeatureStoreProps` | 동일 | 그룹 "매장 운영" | 200 · h1 "약국 매장 운영 이용 방법" |
| `/guide/features/qr` | `glycopharmGuideFeatureQrProps` | 동일 | 그룹 "QR" | 200 · h1 "QR 코드 이용 방법" |

GP 태블릿은 **C형 유지** — 코드 상태(route 존재 · 메뉴 없음)가 감사 시점에도 동일하다.

---

## 9. K-Cosmetics 최종 확인 (§11)

- `/guide/features/store` · `/guide/features/qr` 정상(200 · 기능 index 진입 · shared View).
- stale cleanup 재검증: canonical signage 경로 사용 · legacy alias(`/store/signage/playlist` · `/store/qr`) 참조 **0** ·
  `/store/interest-requests` 유효 · QR canonical 경로 유효. **재stale 0**
  (route contract test + 전수 sweep 양쪽에서 확인).
- 참고(비blocker): 사이니지 하위 "스케줄" 항목이 KCos copy 에 문구로 등장하지 않는다(동영상·TV 재생은 등장).

---

## 10. KPA 최종 확인 (§12)

- `/service-guide`(shared `GuideServiceIntroPage`) · `/guide/*` route 정상.
- 운영자 Guide 편집 진입 유지, Guide 페이지의 `GuideEditableSection` 계약 유지.
- 폐기된 B2C 판매 표현 미사용(route contract test 로 회귀 방지) · 매장 진열 관리 용어 유지.
- 참고(비blocker): KPA copy 가 상품 마스터 안내를 `/store/my-products` 로 하는데 canonical 사이드바 항목은
  `/store/handled-products`(매장 경영활용 제품) 다. 두 화면 모두 실재하고 역할 분리 판정 이력이 있어 dead link 는 아니다.

---

## 11. PharmacyHub 최종 확인 (§13)

- `/service-guide` · `/guide` · Guide route **17** 전부 mount.
- header/footer/커뮤니티 홈/store shell 진입점 존재(`서비스 소개` · `이용 가이드` · `기능별 이용 방법`).
- **orphan Guide 0** — 직전 WO 에서 기능 index "매장 실행" 그룹이 Guide 링크를 갖도록 교정한 상태가 유지된다.
- 기능-copy 정합: 메뉴 5 섹션(상품·거래 / 매장 제품 / 콘텐츠·자료함 / 매장 실행 / 설정) 중
  설정의 "내 계정" 만 copy 미언급(C형). 나머지 전 항목 언급.
- shared View adoption 100%(별도 wrapper 파일 0).
- "신규 서비스" 예외 없이 전 축 census 에 포함했다.

---

## 12. Neture 최종 확인 (§14)

- `/guide` = `GuideHomePage`(shared `GuideFeaturesPage` + `index`/`indexPosition`/`serviceShowcase` 옵션 props) — 플랫폼 이용 안내 허브.
- `/service-guide` 미도입이며 참조도 0 → 끊긴 링크 없음.
- shared wrapper 32 개(18~23 L) · 서비스 고유 사업 안내 5 개는 로컬 JSX(`SERVICE_SPECIFIC`).
- 공급자/파트너 guide 는 `/guide/features/*` · `/guide/for-*` 로, 사업 안내는 `/guide/business/*` 로 분리돼
  커뮤니티/매장 Guide 와 혼재하지 않는다.

---

## 13. stale / dead Guide 최종 sweep (§15)

Guide copy 5 개 + 서비스 `pages/guide/**`(`.ts`/`.tsx`) 전체에서 링크 문자열을 추출해
해당 서비스 route 집합과 대조했다(brace 확장 · param route 동형 매칭 · 주석 제거 · `path="..."` 제외).

| 서비스 | route 수 | Guide 링크 참조 | 미해결 |
|---|:--:|:--:|:--:|
| KPA | 284 | 62 | **0** |
| K-Cosmetics | 185 | 39 | **0** |
| GlycoPharm | 242 | 42 | **0** |
| Neture | 291 | 55 | **0** |
| PharmacyHub | 71 | 38 | **0** |

| 분류 | 건수 | 내용 |
|---|:--:|---|
| STALE_ROUTE | 0 | — |
| STALE_FEATURE | 0 | — |
| DEAD_GUIDE | 0 | — |
| ORPHAN_GUIDE | 0 | mount 된 Guide route 중 진입 링크 없는 것 0(test 로 상시 검증) |
| INTENTIONAL_LEGACY | 1 | KPA `/store/my-products` 안내(§10 참고 — 화면 실재 · 메뉴 밖) |

closure blocker 판정 기준(클릭 시 404/error · 없는 기능 안내 · inbound 0 Guide · canonical 불일치) 중
**실제 blocker 0**.

---

## 14. Route contract 최종 검증 (§16)

`npx vitest run --config packages/shared-space-ui/vitest.config.mjs packages/shared-space-ui/src/guide/__tests__/`

```text
guideRouteContract.test.ts       9 tests   PASS
guideCoverageContract.test.ts   13 tests   PASS
guideServiceIntro.test.tsx      31 tests   PASS
─────────────────────────────────────────────
3 files / 53 tests              ALL PASS
```

| 보장 항목 | 결과 |
|---|:--:|
| Guide internal dead route | 0 |
| brace-expanded unresolved route | 0 |
| param route 오인 | 0 |
| orphan Guide route | 0 |
| stale canonical route(GP b2c · KCos legacy alias · KPA B2C 표현) | 0 |

테스트는 서비스 `.tsx` 의 `<Route>` 트리를 정적 파싱한 **실제 route 집합**과 Guide copy 를 대조한다(런타임 import 없음).

---

## 15. `/service-guide` vs `/guide` 역할 (§17)

| 서비스 | `/service-guide` | `/guide` | 상호 링크 |
|---|---|---|---|
| KPA | 서비스 소개(공개) | `/guide/intro` 리다이렉트 | 소개 → `/guide/intro`·`/guide/usage`·`/guide/features` · Guide copy → `/service-guide` 1 건 |
| KCos | 동일 | 동일 | 동일 |
| GP | 동일 | 동일 | 동일 |
| PH | 동일 | 동일 | 동일 |
| Neture | 미도입(OOS) | `GuideHomePage` 허브 | `/service-guide` 참조 0 → 끊긴 링크 없음 |

`/service-guide` = 서비스 소개, `/guide/*` = 기능 사용 Guide 의 역할 분리는 5 서비스에서 유지되며
**끊긴 상호 진입 0**.

---

## 16. Navigation / discoverability (§18)

| 서비스 | canonical 진입점 |
|---|---|
| KPA | header `서비스 안내`(/service-guide) · footer `이용 가이드`(/guide/intro) + `서비스 안내` · 커뮤니티 홈 |
| KCos | header `서비스 안내` · footer `서비스 안내` |
| GP | header `서비스 안내` · footer `서비스 안내` |
| PH | header `이용 안내` 3 항목(서비스 소개 · 이용 가이드 · 기능별 이용 방법) · store-owner shell 동일 3 항목 |
| Neture | header `이용 안내`(/guide) · `/guide` 허브 |

URL 로만 도달 가능한 Guide **0**. 모든 메뉴가 Guide 진입점을 가질 필요는 없다는 §18 단서를 적용했다.

---

## 17. 최초 census 대비 변화 (§21)

| 지표 | 최초(95 모집단) | 최종(115 모집단) | 변화 |
|---|:--:|:--:|---|
| FULLY_COMMON | 49 | 85 | +36 (모집단 정의 확장 포함) |
| CORE_ONLY | 3 | 0 | -3 (shared View 수렴) |
| VIEW_DUPLICATED | 2 | 0 | **-2 (해소 완료)** |
| SERVICE_SPECIFIC | 1 | 2 | Neture 사업 안내 · 외국인 고객 응대 |
| NOT_IMPLEMENTED | 30 | 12 | -18 |
| OUT_OF_SCOPE | 10 | 16 | 축 재정의 반영 |
| 미조사 | 0 | 0 | 유지 |

- PharmacyHub adoption: 0 → **Guide route 17 · shared View 100% · orphan 0**
- 신규 Guide route(직전 WO): GP 3 · KCos 2
- stale route: cleanup 이후 재발 **0**
- A형 gap: 직전 WO 5 → 0 → 본 감사에서 **신규 발견 3**(외국인 여행객 판매지원)

> 모집단 정의가 달라졌으므로 숫자를 억지로 맞추지 않았다(§21).

---

## 18. Residual matrix (§20)

### MUST_FIX_BEFORE_CLOSE — 3

| # | 항목 | 서비스 |
|---|---|---|
| 1 | 외국인 여행객 판매지원 Guide 부재(A형) | KPA |
| 2 | 동일 | K-Cosmetics |
| 3 | 동일 | GlycoPharm |

### ACCEPTED_RESIDUAL — 15

| # | 항목 | 근거 |
|---|---|---|
| 1~5 | B형 5(설문 4 · Neture LMS) | 기능 자체가 없음 |
| 6~11 | C형 6(GP 태블릿 · 역할별 3 · PH 내 계정 · Neture `/service-guide`) | IA 미채택 또는 안내 단위 아님 |
| 12 | KPA copy 의 `/store/my-products` 안내 | 화면 실재 · dead link 아님 · 역할 분리 판정 이력 |
| 13 | KPA 판매자 모집 · 신청·승인 현황 copy 미언급 | 매장 운영 매뉴얼 내 문구 보강 수준 |
| 14 | KPA 매장 자체 상품 copy 미언급 | 동일 |
| 15 | Neture 사업 안내 5 페이지의 서비스 내부 helper 중복 | runtime 영향 없음 · cross-service 복제 아님 |

### OUTSIDE_GUIDE — 3

| # | 항목 | 근거 |
|---|---|---|
| 1 | KPA `online-sales/*` 3 항목(판매 설정 · 판매 상품 · 주문 관리) | 자체 storefront 폐기 트랙(네이버·쿠팡 대체) — 제품 결정 |
| 2 | KCos·GP 설문 사용자 대면 도입 여부 | 제품 결정 |
| 3 | GP 태블릿 메뉴 노출 여부 | IA/제품 결정 |

---

## 19. 검증 결과 (§22 · §23)

| 항목 | 결과 |
|---|---|
| Guide vitest 3 파일 | **53 PASS** |
| `@o4o/shared-space-ui` typecheck | **PASS** |
| 5 서비스 frontend typecheck | **전부 PASS** |
| 5 서비스 build | 미수행 — **코드 변경 0**(§22 "필요 시") |
| 프로덕션 smoke desktop+mobile | **52/52 PASS**(26 경로 × 2 viewport) |

프로덕션 smoke 기준 — 404 **0** · dead navigation **0** · white screen **0** ·
console error **0** · pageerror **0** · mobile 가로 overflow **0**.
viewport: desktop 1440×900 / mobile 390×844.

| 서비스 | 검증 경로 |
|---|---|
| KPA | `/service-guide` · `/guide/intro` · `/guide/features` · `/guide/features/forum` · `/guide/features/store` |
| KCos | `/service-guide` · `/guide/intro` · `/guide/features` · `/guide/features/store` · `/guide/features/qr` |
| GP | `/service-guide` · `/guide/intro` · `/guide/features` · `/guide/features/lms` · `/guide/features/store` · `/guide/features/qr` |
| PH | `/service-guide` · `/guide` · `/guide/features` · `/guide/features/qr` · `/guide/features/manuals` · `/guide/features/tablet` |
| Neture | `/guide` · `/guide/features` · `/guide/for-seller` · `/guide/business/pharmacy-coop` · `/guide/foreign-customer-support` |

---

## 20. 후속 제안 (§25)

blocker 를 잘게 쪼개지 않고 **1 개 묶음**으로 제안한다.

**WO-O4O-GUIDE-FOREIGN-VISITOR-SALES-SUPPORT-COVERAGE-V1 (제안)**

- 범위: KPA · KCos · GP 3 서비스에 외국인 여행객 판매지원 Guide 추가
  (shared `GuideFeatureManualPage` + 서비스 copy · 신규 View 0),
  기능별 이용 방법 index 진입 링크 추가, coverage contract test 확장.
- 함께 처리: ACCEPTED_RESIDUAL 12~14(KPA 매장 운영 매뉴얼 copy 보강 — 매장 자체 상품 ·
  판매자 모집 · 신청·승인 현황 · 매장 경영활용 제품 canonical 정합), KCos 사이니지 "스케줄" 문구.
- 제외: 기능 신규 구현 · 유료 게이트 정책 변경 · B/C형 해소 · 디자인 개편.

이 묶음이 PASS 하면 `GUIDE_COMMONIZATION = COMPLETE` 선언 조건이 충족된다
(현재 미충족 항목은 A형 3 = MUST_FIX 3 뿐이다).

---

## 21. 코드 변경

**0 건.** 본 WO 는 감사이며 Guide route · copy · View · test · config 어느 것도 수정하지 않았다.
문서 1 건(본 CHECK) 만 추가한다. 프로덕션 재배포 불필요(§29).

---

## 22. 문서 정합 (CLAUDE.md §16)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```
