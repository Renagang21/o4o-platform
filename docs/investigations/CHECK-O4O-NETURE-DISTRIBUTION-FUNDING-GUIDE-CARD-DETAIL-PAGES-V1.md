# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-GUIDE-CARD-DETAIL-PAGES-V1

> WO: `WO-O4O-NETURE-DISTRIBUTION-FUNDING-GUIDE-CARD-DETAIL-PAGES-V1`
> 목표: Neture `/guide/features/market-trial` 를 **유통참여형 펀딩**을 단계적으로 이해시키는 카드 목차 + 상세 섹션 구조로 보강.
> 기능 로직 / 라우트 / API / DB 변경 없음.

## 1. 최종 판정

PASS (구현·정적검증 완료, 브라우저 라이브 smoke 후속).

- 유통참여형 펀딩 가이드를 **카드 목차(8) + 학습 섹션(8) + FAQ** 로 재구성.
- 카드 클릭 → 같은 페이지 **상세 섹션 anchor 이동**(`#overview` … `#faq`).
- 공급자 / 매장 경영자 / 운영자 관점 분리, 제품 정산→매장 랜딩 개념, 투자형 아님 안내, 3,000만/500만/100명/5만 예시 포함.
- 사용자-facing `Market Trial` / bare `Trial` 노출 제거. 내부 라우트·식별자(`/market-trial`, `MarketTrial*`)는 유지.
- TypeScript 5/5 PASS.

## 2. 변경한 파일

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/guide/types.ts` | `GuideFeatureManualSection.id?`(섹션 anchor), `GuideManualIndexCard` 신규, `GuideFeatureManualPageProps.index?`(카드 목차) — **모두 optional, 하위호환** |
| `packages/shared-space-ui/src/guide/styles.ts` | `indexStyles`(카드 목차 wrap/lead/card/audienceTag/summary) 추가 |
| `packages/shared-space-ui/src/guide/GuideFeatureManualPage.tsx` | Hero 아래 카드 목차(lead + 클릭 카드 그리드) 렌더, 섹션 wrapper `id`+`scrollMarginTop` |
| `packages/shared-space-ui/src/guide/copy/neture.ts` | `netureGuideFeatureMarketTrialProps` 전면 재작성 (8 섹션 + 카드 목차 + FAQ, bare `Trial` 제거) |
| `services/web-neture/src/config/seoRegistry.ts` | `/guide/features/market-trial` SEO title/description 추가 |

## 3. 기존 가이드 구조 조사 결과

- Neture 가이드는 **데이터 주도**. `GuideFeatureMarketTrialPage`(web-neture wrapper) 가 shared `GuideFeatureManualPage` 를 `netureGuideFeatureMarketTrialProps`(shared-space-ui copy) + `renderText`(DB 편집 `GuideEditableSection`, pageKey=`guide/features/market-trial`)로 렌더.
- shared `GuideFeatureManualPage` 는 Hero(편집가능 desc + flowBar + primary CTA) → step 섹션(번호+제목+desc+label/detail 카드 grid) → 하단 nav 구조였고, **카드 목차/anchor 메커니즘이 없었음**.
- 따라서 §15 완료기준(카드 클릭→상세 섹션 이동)을 위해 shared 컴포넌트를 **additive optional 방식**으로 확장하는 것을 택함.

## 4. 선택한 라우트 / 상세 구조

- **선택 A + C 혼합**: 라우트는 기존 `/guide/features/market-trial` 유지(변경 없음), 단일 페이지 내 **카드 목차 + anchor 섹션**(`#overview`/`#store-landing`/`#supplier`/`#participant`/`#settlement`/`#process`/`#operator`/`#faq`).
- 카드 목차는 plain `<a href="#id">` → 같은 페이지 native 스크롤. 섹션 `scrollMarginTop:88` 로 헤더 오프셋 보정.
- 새 라우트/페이지 추가 없음.

## 5. 카드 목차 (8)

1. 유통참여형 펀딩이란? (공통) → #overview
2. 왜 매장 랜딩이 중요한가? (공통) → #store-landing
3. 공급자는 어떻게 활용하나? (공급자) → #supplier
4. 참여자는 어떤 이익을 얻나? (매장 경영자) → #participant
5. 펀딩 금액과 제품 정산 설계 (공급자) → #settlement
6. 참여 절차는 어떻게 진행되나? (공통) → #process
7. 운영자는 무엇을 확인하나? (운영자) → #operator
8. 자주 묻는 질문 (공통) → #faq

핵심 요약(lead) 3개: 개발비 전체 조달이 목적이 아님 / 제품 정산을 통한 매장 랜딩 / 참여자는 매장 경영자·매장 랜딩 가능 사업자 중심.

## 6. 상세 섹션 (8)

overview · store-landing · supplier · participant · settlement · process · operator · faq — 각 섹션 step 01~08, label/detail 카드 grid. process 는 9단계, faq 는 8개 Q/A(label=Q, detail=A).

## 7. 포함한 핵심 설명 항목 (§12-4 체크)

- [x] 유통참여형 펀딩 정의
- [x] 개발비 전체 조달이 목적이 아님
- [x] 제품 정산을 통한 매장 랜딩
- [x] 참여자 = 매장 경영자 또는 매장 랜딩 가능 사업자 중심
- [x] 공급자의 설계 책임
- [x] 참여자의 이익
- [x] 제품 정산 기준(도매 공급가 또는 그 이하)
- [x] 예시(개발비 3,000만 / 펀딩 500만 / 100명 / 5만 / 100개 매장 랜딩)
- [x] 투자형 펀딩이 아님 안내(주식·채권·배당·이자·원금 상환 제공 안 함)
- [x] 단계별 참여 절차
- [x] FAQ

## 8. 제외한 범위

Market Trial 기능 로직 / API / DB / 엔티티 / 라우트명 / 결제·정산 자동화 / 운영자 승인 플로우 / 공급자 신청 폼 필드 — 변경 없음.

## 9. TypeScript 결과

| 패키지 | `tsc --noEmit` |
|--------|:---:|
| shared-space-ui | ✅ exit 0 |
| web-neture | ✅ exit 0 |
| web-glycopharm | ✅ exit 0 |
| web-k-cosmetics | ✅ exit 0 |
| web-kpa-society | ✅ exit 0 |

## 10. 검색 검증

- `rg "Market Trial|마켓 트라이얼|유통 참여형 펀딩" services packages` — 사용자-facing 렌더링 잔재 0 (내부 코드명/라우트/주석만 잔존).
- 재작성한 copy 에서 bare `Trial` 노출 제거 확인.

## 11. Shared Module 영향 (변경한 공통 모듈)

- `GuideFeatureManualPage` / `types` 변경은 **추가된 필드가 전부 optional** — 기존 소비처(neture/glycopharm/k-cosmetics/kpa 의 `GuideFeature*Page` 다수)는 `index`/`section.id` 미지정 시 **기존 레이아웃 그대로**. 5개 패키지 tsc PASS 로 무영향 확인.
- 동작 변경은 `index`/`id` 를 채운 Neture market-trial copy 에만 적용.

## 12. 내부 `Market Trial` 식별자 유지

- 라우트 `/market-trial`, `/supplier/market-trial/new`, `/guide/features/market-trial` 유지.
- 컴포넌트/wrapper `GuideFeatureMarketTrialPage`, props export `netureGuideFeatureMarketTrialProps` 유지.
- pageKey `guide/features/market-trial`(DB 편집 콘텐츠 키) 유지.

## 13. 사용자-facing `유통참여형 펀딩` 표기 일관성

- 신규/재작성 copy 전부 `유통참여형 펀딩`(붙여쓰기) 사용. [[project-market-trial-external-label]] 표준 준수.

## 14. Live smoke 결과 (PASS — WO-O4O-NETURE-DISTRIBUTION-FUNDING-GUIDE-LIVE-SMOKE-V1)

검증: 2026-06-06, 프로덕션 `https://neture.co.kr` (커밋 `1d7972a39` 배포 = "Deploy Web Services" run 27051387790 success), Playwright. 가이드는 공개 페이지 — 비로그인.

| 항목 | 결과 |
|------|------|
| `/guide/features/market-trial` 타이틀 | ✅ `유통참여형 펀딩 이용 방법 — Neture` (신규 SEO 반영) |
| H1 / 섹션 H2 | ✅ H1 `유통참여형 펀딩`, H2 9개(한눈에 보기 + 8 섹션) |
| 카드 목차 | ✅ 8개, href `#overview`…`#faq`, audience 태그 표시 |
| 섹션 anchor id | ✅ overview/store-landing/supplier/participant/settlement/process/operator/faq 8개 |
| 카드 클릭 스크롤 | ✅ `#operator` 클릭 → scrollY 0→3463, 섹션 top=88px(`scrollMarginTop` 적용), hash 갱신 |
| Hero CTA | ✅ `유통참여형 펀딩으로 이동 →` → `/market-trial` |
| 하단 nav | ✅ `← 기능별 이용 방법`→`/guide/features`, `홈으로`→`/` |
| `/guide` 진입 | ✅ `유통참여형 펀딩 보러 가기`→`/market-trial`, `유통참여형 펀딩 이용 방법`→`/guide/features/market-trial` |
| 모바일(375px) | ✅ 가로 오버플로 없음(scrollW=docW=375), 카드 8개 단일 열 정상 |
| 예시 / 투자형 아님 안내 | ✅ 3,000만·500만·100개 매장 / 주식·배당 면책 표시 |
| 사용자-facing `Market Trial` | ✅ 노출 0 |
| bare `Trial` | ✅ 노출 0 |
| DB override(GuideEditableSection) | ✅ 구 copy("Trial …")가 화면에 없음 → 기존 override 가 새 default copy 를 덮지 않음 확인. 별도 reseed/clear 불필요 |
| 콘솔 | 비로그인 `/auth/me`·`/auth/refresh` 401 만(공개 페이지 정상), 가이드 관련 오류 0 |

---

*상태: 구현·정적검증·라이브 smoke 완료 (PASS)*
