# CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1

> **WO**: `WO-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1`
> **성격**: audit (census) — 코드 변경 0
> **작성일**: 2026-08-20
> **시작 commit**: `31ec7bcd5`
> **대상 서비스**: KPA-Society / K-Cosmetics / GlycoPharm / PharmacyHub / Neture

---

## 1. 전체 집계

```
전체 Guide 모집단: 95
FULLY_COMMON: 49
CORE_ONLY: 3
VIEW_DUPLICATED: 2
SERVICE_SPECIFIC: 1
NOT_IMPLEMENTED: 30
OUT_OF_SCOPE: 10
미조사: 0
```

모집단 = **Guide 기능 단위 19개 × 5서비스 = 95 cell**.

---

## 2. Guide 기능 단위 정의 (19개)

WO §4 기준 — "사용자가 하나의 안내 업무로 인식하는 단위". 한 페이지 안의 개별 설명 블록은 세지 않으며,
Intro 5면(`intro` · `intro/structure` · `intro/operation` · `intro/concept` · `intro/{kpa|neture}`)은 1 단위로 묶었다.
KPA 는 QR 과 Tablet 안내를 한 화면(`kpaGuideFeatureQrTabletProps`)으로 제공하므로 QR·Tablet 도 1 단위다.

| # | 단위 | 대표 route |
|---|------|-----------|
| A | Guide Shell / Templates (공통 shell) | `packages/shared-space-ui/src/guide/**` |
| B | Guide Home (이용 안내 허브) | `/guide` |
| C | Guide Intro (소개·구조·운영·개념·정체성 5면) | `/guide/intro*` |
| D | Guide Usage (이용 흐름) | `/guide/usage` |
| E | Guide Features Index (기능 안내 목차) | `/guide/features` |
| F | Forum·Community Guide | `/guide/features/forum` |
| G | Content Guide | `/guide/features/content` |
| H | Resources 자료실 Guide | `/guide/features/resources` |
| I | LMS·강의 Guide | `/guide/features/lms` |
| J | Store 운영 Guide | `/guide/features/store` |
| K | QR·Tablet Guide | `/guide/features/qr` |
| L | Signage Guide | `/guide/features/signage` |
| M | POP·Blog·제작자료 Guide | `/guide/features/{pop,blog,production-materials}` |
| N | Survey Guide | `/guide/features/survey` |
| O | Role-based Guide (역할별 안내) | `/guide/for/*` · `/guide/for-*` |
| P | Business·시나리오 Guide | `/guide/business/*` · `/guide/o4o-overview` |
| Q | Service Guide (공개 서비스 안내 랜딩) | `/service-guide` |
| R | Operator Guide Contents 관리 콘솔 | `/operator/guide-contents` |
| S | Guide 인라인 편집 (GuideEditableSection) | `api/guideContent.ts` + `guide-client` |

---

## 3. 판정 매트릭스 (95 cell · 미조사 0)

FC=FULLY_COMMON · CO=CORE_ONLY · VD=VIEW_DUPLICATED · SS=SERVICE_SPECIFIC · NI=NOT_IMPLEMENTED · OOS=OUT_OF_SCOPE

| # | 단위 | KPA | KCos | GP | PharmacyHub | Neture |
|---|------|:---:|:----:|:--:|:-----------:|:------:|
| A | Guide Shell | FC | FC | FC | NI | FC |
| B | Guide Home 허브 | NI | NI | NI | NI | CO |
| C | Guide Intro 5면 | FC | FC | FC | NI | FC |
| D | Guide Usage | FC | FC | FC | NI | FC |
| E | Guide Features Index | FC | FC | FC | NI | FC |
| F | Forum·Community Guide | FC | FC | FC | NI | FC |
| G | Content Guide | FC | FC | FC | NI | FC |
| H | Resources 자료실 Guide | FC | FC | FC | NI | FC |
| I | LMS·강의 Guide | FC | FC | **NI** | NI | OOS |
| J | Store 운영 Guide | FC | NI | NI | NI | NI |
| K | QR·Tablet Guide | FC | NI | NI | NI | CO |
| L | Signage Guide | FC | FC | FC | NI | OOS |
| M | POP·Blog·제작자료 Guide | FC | FC | FC | NI | OOS |
| N | Survey Guide | FC | NI | NI | OOS | OOS |
| O | Role-based Guide | FC | NI | NI | NI | FC |
| P | Business·시나리오 Guide | OOS | OOS | OOS | OOS | **SS** |
| Q | Service Guide 랜딩 | **CO** | **VD** | **VD** | NI | OOS |
| R | Operator Guide Contents 콘솔 | FC | FC | FC | NI | FC |
| S | Guide 인라인 편집 | FC | FC | FC | NI | FC |

---

## 4. 서비스별 집계

| 서비스 | 모집단 | FC | CO | VD | SS | NI | OOS | 미조사 |
|--------|:---:|:--:|:--:|:--:|:--:|:--:|:---:|:---:|
| KPA-Society | 19 | 16 | 1 | 0 | 0 | 1 | 1 | 0 |
| K-Cosmetics | 19 | 12 | 0 | 1 | 0 | 5 | 1 | 0 |
| GlycoPharm | 19 | 11 | 0 | 1 | 0 | 6 | 1 | 0 |
| PharmacyHub | 19 | 0 | 0 | 0 | 0 | 17 | 2 | 0 |
| Neture | 19 | 10 | 2 | 0 | 1 | 1 | 5 | 0 |
| **합계** | **95** | **49** | **3** | **2** | **1** | **30** | **10** | **0** |

---

## 5. 기능별 집계

| 기능축 | 단위 | 모집단 | FC | CO | VD | SS | NI | OOS |
|--------|------|:---:|:--:|:--:|:--:|:--:|:--:|:---:|
| 공통 shell | A·B·C·D·E·S | 30 | 20 | 1 | 0 | 0 | 9 | 0 |
| Forum·Community | F | 5 | 4 | 0 | 0 | 0 | 1 | 0 |
| Content | G | 5 | 4 | 0 | 0 | 0 | 1 | 0 |
| Resources 자료실 | H | 5 | 4 | 0 | 0 | 0 | 1 | 0 |
| LMS·강의 | I | 5 | 2 | 0 | 0 | 0 | 2 | 1 |
| Membership·역할 | O | 5 | 2 | 0 | 0 | 0 | 3 | 0 |
| Store 운영 | J | 5 | 1 | 0 | 0 | 0 | 4 | 0 |
| QR·Tablet | K | 5 | 1 | 1 | 0 | 0 | 3 | 0 |
| Signage | L | 5 | 3 | 0 | 0 | 0 | 1 | 1 |
| 기타 (M·N·P·Q·R) | M·N·P·Q·R | 25 | 8 | 1 | 2 | 1 | 5 | 8 |
| **합계** | | **95** | **49** | **3** | **2** | **1** | **30** | **10** |

---

## 6. 공통 Guide shell — 이미 존재한다

`packages/shared-space-ui/src/guide/` 가 **이번 census 의 결정적 사실**이다. WO §7 이 후보로 든
`GuidePageTemplate / GuideSection / GuideStepList / GuideCallout / GuideRelatedLinks` 는 사실상 이미 구현돼 있다.

- **공통 page 템플릿 8개** (1,012L) — `GuideIntroPage` · `GuideIntroStructurePage` · `GuideIntroKpaPage` · `GuideIntroOperationPage` · `GuideIntroConceptPage` · `GuideUsagePage` · `GuideFeaturesPage` · `GuideFeatureManualPage`
- **공통 style primitive 8군** (`styles.ts`) — `heroStyles` · `sectionStyles`(page header/route badge) · `cardStyles` · `indexStyles` · `flowStyles`(step list) · `featureListStyles` · `compareStyles` · `bottomNavStyles`(previous·next)
- **공통 타입 22종** (`types.ts`) — `GuideNavLink` · `GuideCardItem` · `GuideFlowRow` · `GuideLabelDetailItem` · `GuideFeatureGroup` 등
- **서비스별 copy 4파일** — `copy/kpa.ts`(1,965L, 21 export) · `copy/k-cosmetics.ts`(1,132L, 15) · `copy/glycopharm.ts`(1,118L, 14) · `copy/neture.ts`(4,258L, 31)
- **인라인 편집 계약** — `packages/shared-space-ui/src/guide-client/{createGuideClient, GuideEditableSection}` + 서비스별 `src/api/guideContent.ts`(4서비스 전부 존재)
- **운영자 콘솔** — `packages/operator-core-ui/src/modules/guide-contents/`, 서비스별 wrapper 는 14L 동일 형태(`serviceKey` 만 다름)

소비 형태:
- **KPA / Neture** — 서비스에 얇은 wrapper page 파일을 두고 shared 컴포넌트에 props 주입 (KPA 21개 파일 19~24L, Neture 32개 파일 18~23L)
- **KCos / GP** — wrapper 파일조차 없이 `App.tsx` 에서 shared 컴포넌트 + props 를 직접 라우팅

→ **A(shell) 은 4서비스 FULLY_COMMON.** 내용(문구·서비스명·단계 수·강조색) 차이는 WO §8 에 따라 공통화 방해 사유로 보지 않았다.

---

## 7. 강의(LMS) Guide 현황 — WO §6 핵심 축

| 서비스 | LMS 기능 | LMS Guide | 판정 |
|--------|:-------:|:---------:|------|
| KPA | `/lms` ✅ | `/guide/features/lms` (`kpaGuideFeatureLmsProps`) ✅ | FULLY_COMMON |
| KCos | `/lms` ✅ | `/guide/features/lms` (`kCosmeticsGuideFeatureLmsProps`) ✅ | FULLY_COMMON |
| **GlycoPharm** | `/lms` · `/lms/:id` ✅ | **없음** (route·props 모두 부재) | **NOT_IMPLEMENTED (A형)** |
| **PharmacyHub** | `/education` · `/education/course/:id` · lesson ✅ | **없음** | **NOT_IMPLEMENTED (A형)** |
| Neture | LMS 기능 없음 | 없음 | OUT_OF_SCOPE |

GP 는 `copy/glycopharm.ts` 에 LMS props 자체가 없고 `App.tsx` 에도 `guide/features/lms` route 가 없다.
반면 footer 는 `/lms`("교육/자료")를 노출한다 → **기능은 안내 없이 노출 중**.

---

## 8. Content Guide 현황

| 서비스 | Content 기능 | Content Guide | 판정 |
|--------|:-----------:|:-------------:|------|
| KPA | `/content` · `/store/content/*` ✅ | `/guide/features/content` ✅ | FULLY_COMMON |
| KCos | `/library/content` · `/store-hub/content` ✅ | `/guide/features/content` ✅ | FULLY_COMMON |
| GP | `/content` · `/hub/content/:id` ✅ | `/guide/features/content` ✅ | FULLY_COMMON |
| PharmacyHub | store-owner `content` ✅ | **없음** | NOT_IMPLEMENTED (A형) |
| Neture | `/content` · `/supplier/b2b-content` ✅ | `/guide/features/b2b-content` ✅ | FULLY_COMMON |

WO §6 지시대로 "기능이 공통화됐으니 Guide 도 자동 FC" 로 판정하지 않고, 각 서비스에서
route + props + 실제 shared 컴포넌트 소비를 개별 확인한 결과다.

---

## 9. Resources(자료실) Guide 현황

| 서비스 | 자료실 기능 | Guide | 판정 |
|--------|:----------:|:-----:|------|
| KPA | `/resources` ✅ | `/guide/features/resources` ✅ | FULLY_COMMON |
| KCos | `/resources` ✅ | `/guide/features/resources` ✅ | FULLY_COMMON |
| GP | `/resources` ✅ | `/guide/features/resources` ✅ | FULLY_COMMON |
| PharmacyHub | `library` · `library/resources` ✅ | **없음** | NOT_IMPLEMENTED (A형) |
| Neture | `/resources` · `/supplier/library` ✅ | `/guide/features/forum-resources` ✅ | FULLY_COMMON |

**커뮤니티 자료실 ≠ 매장 실행자료.** PharmacyHub 의 `store-owner/ManualsPage`(134L)·`ManualDetailPage` 는
`shared_product_descriptions`(STORE·canonical) 조회 전용 **상품 설명서**이며 저작·번역 경로가 없다.
WO §6 지시에 따라 커뮤니티 자료실 Guide 와 동일 기능으로 세지 않았고, Guide 모집단에도 포함하지 않았다.

---

## 10. PharmacyHub Guide 현황 — 가장 큰 coverage gap

**Guide 화면이 0개다.** `/guide*` route 0건, guide page 파일 0건, `api/guideContent.ts` 없음,
`GuideEditableSection` 소비 0건, `/operator/guide-contents` 없음.
`services/web-pharmacy-hub/src/config/navigation.ts:77` 은 "`/contact` · `/service-guide` 는 여전히 route 가 없어 넣지 않는다" 라고 명시한다.

반면 안내 대상 기능은 이미 운영 중이다 — `/forum`(+write·my-posts·edit) · `/community` · `/education`(course·lesson) ·
store-owner `content` · `library` · `library/resources` · `qr` · `signage` · `tablets` · membership · `/operator` 공통 운영자 셸.

→ **19 단위 중 17 NI / 2 OOS.** NI 17건 중 15건이 A형(기능 존재 + Guide 없음), 2건(R·S)은 B형(Guide 자체가 없어 편집·관리 대상 부재).

---

## 11. View duplication (WO §11)

| 대상 | 서비스 | 유사도 | 판정 | 표시 |
|------|--------|:-----:|------|------|
| `ServiceGuidePage` | KCos(222L) ↔ GP(221L) | **0.871** | VIEW_DUPLICATED × 2 | `HIGH_VALUE_COMMONIZATION` |
| `ServiceGuidePage` | KPA(219L) ↔ KCos 0.671 / ↔ GP 0.673 | <0.80 | CORE_ONLY | `HIGH_VALUE_COMMONIZATION` |
| `GuideHomePage` | Neture(189L) | 단독 | CORE_ONLY | `HIGH_VALUE_COMMONIZATION` |
| `SellerQRGuidePage` | Neture(629L) | 단독 | CORE_ONLY | `ACCEPTABLE_DIFFERENCE` |

- 3개 `ServiceGuidePage` 는 모두 `shared_import = 0` 이며 같은 "공개 서비스 안내 랜딩" 업무에 같은 layout 을 복제한다.
- Neture `GuideHomePage` 는 shared 를 일부 소비하지만 허브 자체는 로컬 구현이다. 나머지 4서비스는 허브가 아예 없어(§12 NI-B)
  이 한 화면을 공통 `GuideHomePage` 로 승격하면 4서비스 허브 부재가 동시에 해소된다 → HIGH_VALUE.
- Neture `SellerQRGuidePage` 는 판매자 QR 발급 동선 전용으로 KPA 의 매장 QR 안내와 업무가 달라 ACCEPTABLE_DIFFERENCE.
- Neture 단독 business guide 5면(`GuideBusinessForeignCustomerStorePage` 289L · `GuideBusinessPharmacyCoopPage` 275L ·
  `GuideBusinessTouristStorePage` 302L · `GuideBusinessWarehousePharmacyPage` 349L · `GuideForeignCustomerSupportPage` 258L)은
  상호 최대 유사도 **0.558** 로 임계 미달 → 복제 아님. P 축은 SERVICE_SPECIFIC.

```
HIGH_VALUE_COMMONIZATION: 4
ACCEPTABLE_DIFFERENCE: 1
```

---

## 12. NOT_IMPLEMENTED 분석 (WO §12)

| 유형 | 건수 | 내용 |
|------|:---:|------|
| **A. 기능은 있고 Guide 만 없음** | **28** | 아래 표 |
| B. 기능도 아직 없음 | 2 | PharmacyHub R(guide-contents 콘솔) · S(인라인 편집) — Guide 자체가 없어 대상 부재 |
| C. 서비스 성격상 Guide 불필요 | 0 | — |

공식 census 판정은 6종 유지(NOT_IMPLEMENTED). A/B/C 는 후속 판단용 내부 분류다.

**A형 28건**

| 서비스 | 단위 | 기능 route (존재) |
|--------|------|------------------|
| KPA | B Guide Home | `/guide` 404 (하위 guide 21면은 존재) |
| KCos | B Guide Home | `/guide` 진입점 없음 |
| KCos | J Store 운영 | `/store/**` 전체 |
| KCos | K QR·Tablet | `/store/marketing/qr` · `commerce/tablet-displays` |
| KCos | N Survey | survey route 2건 |
| KCos | O 역할별 안내 | 매장/운영자/회원 역할 구조 존재 |
| GP | B Guide Home | `/guide` 진입점 없음 |
| GP | **I LMS** | `/lms` · `/lms/:id` |
| GP | J Store 운영 | `/store/**` 전체 |
| GP | K QR·Tablet | `/store/marketing/qr` · `commerce/tablet-displays` |
| GP | N Survey | survey route 2건 |
| GP | O 역할별 안내 | 역할 구조 존재 |
| Neture | J Store 운영 | `/store/manage/**` |
| PharmacyHub | A·B·C·D·E (shell·허브·intro·usage·features index) | 서비스 전체 |
| PharmacyHub | F Forum | `/forum` · `/community` |
| PharmacyHub | G Content | store-owner `content` |
| PharmacyHub | H Resources | `library` · `library/resources` |
| PharmacyHub | **I LMS** | `/education` |
| PharmacyHub | J Store 운영 | store-owner 전체 |
| PharmacyHub | K QR·Tablet | `qr` · `tablets` |
| PharmacyHub | L Signage | `signage` |
| PharmacyHub | M POP·Blog·제작자료 | store-owner content/library |
| PharmacyHub | O 역할별 안내 | membership · operator 셸 |
| PharmacyHub | Q Service Guide | 서비스 공개면 존재 |

(PharmacyHub 15 + KCos 5 + GP 6 + KPA 1 + Neture 1 = 28)

---

## 13. 기능 구현 vs Guide coverage (WO §10)

| 기능축 | KPA | KCos | GP | PH | Neture |
|--------|:---:|:----:|:--:|:--:|:------:|
| Forum·Community | 기능✅ Guide✅ | 기능✅ Guide✅ | 기능✅ Guide✅ | 기능✅ **Guide❌** | 기능✅ Guide✅ |
| Content | ✅/✅ | ✅/✅ | ✅/✅ | ✅/**❌** | ✅/✅ |
| Resources | ✅/✅ | ✅/✅ | ✅/✅ | ✅/**❌** | ✅/✅ |
| LMS | ✅/✅ | ✅/✅ | ✅/**❌** | ✅/**❌** | ❌/❌ (OOS) |
| Membership·역할 | ✅/✅ | ✅/**❌** | ✅/**❌** | ✅/**❌** | ✅/✅ |
| Store 운영 | ✅/✅ | ✅/**❌** | ✅/**❌** | ✅/**❌** | ✅/**❌** |
| QR·Tablet | ✅/✅ | ✅/**❌** | ✅/**❌** | ✅/**❌** | ✅/✅(로컬) |
| Signage | ✅/✅ | ✅/✅ | ✅/✅ | ✅/**❌** | ❌/❌ (OOS) |

```
기능 존재 + Guide 없음: 28
기능 없음 + Guide 없음: 2
stale/dead Guide: 5
```

---

## 14. Stale / Dead Guide 목록 (WO §9 — 6종 census 와 분리)

| # | 분류 | 서비스 | 위치 | 내용 | 확인 |
|---|------|--------|------|------|------|
| 1 | **STALE_ROUTE (dead link)** | GP | `copy/glycopharm.ts:526` → `/guide/features` "B2C 가격 설정" | `/store/commerce/products/b2c` — GP 에 해당 route 없음 | 프로덕션 이동 시 ErrorBoundary "문제가 발생했습니다" 화면 (비로그인 관측) |
| 2 | **STALE_ROUTE (dead link)** | KCos | `copy/k-cosmetics.ts:846`(primaryAction) · `:517`(primaryRoute) · `:438`·`:854`(routeLabel) | `/store/signage/playlist` — canonical 은 `/store/marketing/signage/playlist` | `/guide/features/signage` CTA "플레이리스트 관리로 이동 →" href 확인 |
| 3 | STALE_ROUTE (배지 텍스트) | KCos | `copy/k-cosmetics.ts:396` usage step 04 | `routeLabel: '/store/requests'` — KCos 에 route 없음. `routeLabel` 은 링크가 아닌 배지 텍스트라 이동 실패는 없음 | `GuideUsagePage.tsx:43` |
| 4 | STALE_ROUTE (배지 텍스트) | GP | `copy/glycopharm.ts:550` | `'/tablet/:slug'` — GP 실제는 `/store/:pharmacyId/tablet`. `:` 포함이라 href 는 `group.linkTo`(`/store/marketing/qr`)로 fallback, 표시 텍스트만 stale | `GuideFeaturesPage.tsx:125` |
| 5 | STALE_FEATURE | KPA | `copy/kpa.ts:1728-1740` | 섹션 설명의 "B2C 판매" 표현이 KPA 자체 storefront 폐기 트랙과 어긋남. 하위 item label·route 자체는 현행 유효 | `project-kpa-internal-storefront-retirement-track` 대조 |

- **DEAD_GUIDE: 0** — guide route 전체(KPA 22 · KCos 17 · GP 17 · Neture 39)에 대해 inbound link 를 전수 검사한 결과 **inbound 0 인 route 0건**.
- **PLACEHOLDER: 0** — guide 전체에 `<img>`·screenshot 섹션이 **없다**. "준비 중" 표기(`copy/kpa.ts:1842-1851` Workspace A~E, `copy/{glycopharm,k-cosmetics}.ts` POP 삭제 기능)는
  미구현 기능을 의도적으로 명시한 기대치 관리이므로 placeholder 결함으로 세지 않았다.
- **참고(정상 동작)** — KPA `/store/library/production-materials` 와 KCos `/library/content` 는 `<Navigate>` redirect 대상이다. 이동은 성공하며 결함 아님.

---

## 15. 실제 소비 여부 (WO §3)

파일 존재만으로 판정하지 않고 route · navigation consumer · shared component 소비를 전수 확인했다.

| 서비스 | guide route 수 | 진입 consumer | 인라인 편집 | 운영자 콘솔 |
|--------|:-----------:|--------------|:----------:|:----------:|
| KPA | 22 (`/guide/*` 21 + `/service-guide`) | GlobalHeader "서비스 안내"(`/service-guide`) · Footer `/guide/intro` · 매장 QR/POP/Blog/Signage 화면 · Operator Dashboard | ✅ | ✅ |
| KCos | 17 (`guide/*` 15 + `service-guide` + `guide-contents`) | GlobalHeader `/service-guide` · Operator Dashboard `/guide/usage` · StoreSignagePage `/guide/features/signage` | ✅ | ✅ |
| GP | 17 (+`guidelines` → `/operator/content` redirect) | GlobalHeader `/service-guide` · Operator Dashboard `/guide/usage` · StoreSignageMainPage `/guide/features/signage` | ✅ | ✅ |
| Neture | 39 (`/guide/*` 37 + `/seller/qr-guide` + `/operator/guide-contents`) | GlobalHeader "이용 안내"(`/guide`) · Supplier/Partner/Seller 다수 화면 | ✅ | ✅ |
| PharmacyHub | 0 | — | ❌ | ❌ |

**주의 — `/service-guide` 는 `/guide/*` 로 연결되지 않는다.** KPA·KCos·GP 3서비스의 `ServiceGuidePage` 는 `/contact`·`/store-hub` 만 링크한다.
결과적으로 KCos·GP 에서 `/guide/*` 허브로 가는 공개 진입 경로는 **운영자 대시보드와 매장 사이니지 화면 2곳뿐**이다(KPA 는 Footer `/guide/intro` 보유).
dead route 는 아니지만 **발견 가능성(discoverability) 결함**이며 §17-A 후속 묶음에 포함한다.

---

## 16. 검증 결과

| 항목 | 결과 |
|------|------|
| 코드 변경 | **0** (audit) |
| 5서비스 typecheck (`tsc --noEmit`) | **PASS** (exit 0 · @o4o/web-kpa-society · @o4o/web-k-cosmetics · glycopharm-web · pharmacy-hub-web · @o4o/web-neture) |
| guide route inbound link 전수 | orphan **0** (KPA/KCos/GP/Neture) |
| guide copy → app route 정합 | 참조 168건 중 미해결 4건 → §14 #1~#4 (KPA 61건 중 `/store/commerce/*` 는 와일드카드 라벨로 정상 · Neture 44건 미해결 0) |
| 재배포 | 불필요 (코드 변경 0) |

---

## 17. Browser smoke (production)

| 대상 | 결과 |
|------|------|
| `kpa-society.co.kr/guide/intro` (desktop) | 정상 렌더 · overflow 0 · 401(비로그인 auth/me)만 |
| `kpa-society.co.kr/guide/features` (desktop) | 정상 · guide 링크 23 / 기능 링크 13 전부 유효 |
| `kpa-society.co.kr/guide/features/lms` (**mobile 390×844**) | 정상 · overflow 0 |
| `kpa-society.co.kr/guide` | **404** (의도된 상태 — 허브 미구현. 복구 링크 `/guide/intro` 제공) |
| `www.glycopharm.co.kr/guide/features` (desktop) | 정상 렌더. "B2C 가격 설정" → `/store/commerce/products/b2c` **dead link 확인**, "태블릿 키오스크" 표시 텍스트 `/tablet/:slug` stale 확인 |
| `www.glycopharm.co.kr/store/commerce/products/b2c` | **오류 화면**("문제가 발생했습니다" · ErrorBoundary) |
| `k-cosmetics.site/guide/features/signage` (desktop) | 정상 렌더. CTA href = `/store/signage/playlist` **dead link 확인** |
| `neture.co.kr/guide` (desktop) | 정상 · 안내 영역 7 · guide 링크 29 · overflow 0 |
| `pharmacyhub.co.kr/guide` | **404** · footer 는 커뮤니티/포럼/교육 노출 → 기능 존재 + Guide 부재 확증 |

white screen 0 · 치명 JS exception 0(GP dead link 화면 제외) · mobile overflow 0 · dead navigation 2건(§14 #1·#2).

---

## 18. 후속 작업 판정 (WO §17 — 최대 1~3 묶음)

### A. Guide 진입·랜딩 공통화 (HIGH_VALUE 4건 + discoverability)
- `ServiceGuidePage` 3서비스(KCos↔GP 0.871 복제, KPA 0.67) → 공통 `ServiceGuideLandingPage` + 서비스별 copy 로 수렴
- Neture `GuideHomePage` → 공통 `GuideHomePage` 승격, KPA·KCos·GP 에 `/guide` 허브 route 신설(현재 404)
- `/service-guide` → `/guide/*` 진입 링크 연결 (§15 discoverability 결함)

### B. Guide coverage gap 해소 (NI A형 28건)
- **B-1 PharmacyHub Guide 도입** (15건) — shared guide shell + `copy/pharmacy-hub.ts` + `api/guideContent.ts` + `/operator/guide-contents`. 단일 서비스 작업으로 gap 의 과반 해소
- **B-2 기존 4서비스 누락 축** (13건) — GP LMS · KCos/GP QR·Tablet·Store·Survey·역할별 · Neture Store. 기존 shared 템플릿에 copy 만 추가하는 형태

### C. Guide stale route 정리 (5건)
- dead link 2건(GP `/store/commerce/products/b2c` · KCos `/store/signage/playlist`) 은 **사용자가 실제로 오류 화면을 만나므로 우선순위 최상**
- 배지 텍스트 stale 2건 + KPA "B2C 판매" 표현 1건은 copy 수정만으로 종료

권장 순서: **C(소·즉시) → A(중) → B-1(대) → B-2(대)**.

---

## 19. 제외 범위 준수 (WO §15)

Guide 신규 작성 0 · 디자인 개편 0 · screenshot 제작 0 · 콘텐츠 수정 0 · 기능 신규 구현 0 ·
Forum/LMS/Content 재공통화 0 · DB/backend 변경 0. **본 WO 의 코드 변경은 0건이다.**

---

## 20. 문서 정합

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(§18 A·B·C)
```

기준 문서(`docs/baseline/**` · `docs/architecture/**` · `docs/rules/**`) 중 본 census 와 충돌하는 서술은 발견되지 않았다.
§14 #5(KPA "B2C 판매" 표현)는 문서가 아니라 **소스 copy 파일**의 drift 이므로 §18-C 로 분리한다.
