# CHECK-O4O-FRONTEND-MARKET-TRIAL-LABEL-TO-DISTRIBUTION-FUNDING-V1

> WO: `WO-O4O-FRONTEND-MARKET-TRIAL-LABEL-TO-DISTRIBUTION-FUNDING-V1`
> 목표: O4O 모든 사용자-facing 프론트엔드에서 `Market Trial` 외부 노출명을 **유통참여형 펀딩**으로 통일.
> 내부 코드명 / 라우트 / API / DB 는 변경하지 않음.

## 0. 결론

- 사용자-facing `Market Trial` / `유통 참여형 펀딩`(띄어쓰기) → **`유통참여형 펀딩`**(붙여쓰기) 으로 통일 완료.
- 외부 명칭 = **유통참여형 펀딩**, 내부 기능명 = **Market Trial** (코드명/라우트/API/DB 유지).
- 변경 파일 31개 (사용자-facing 문구만). TypeScript 5/5 PASS.

## 1. 표기 결정 (사용자 확정)

| 항목 | 값 |
|------|-----|
| 외부 사용자-facing 한글 표기 | **유통참여형 펀딩** (붙여쓰기) |
| 기존 `유통 참여형 펀딩`(띄어쓰기) 라벨 | 붙여쓰기로 정규화 |
| `(Market Trial)` 괄호 병기 | 제거 |
| 단독 `Market Trial` 표시 문구 | `유통참여형 펀딩` 치환 (한글 조사 보정 포함: `Market Trial로`→`유통참여형 펀딩으로`) |
| 내부 코드명/라우트/API/DB | **유지** (Market Trial) |

## 2. 변경한 사용자-facing 파일 (31)

### web-neture (15)
- `pages/market-trial/MarketTrialHubPage.tsx` — 제목 괄호 제거 + 본문 라벨 정규화
- `pages/market-trial/MarketTrialDetailPage.tsx` — 허브 링크/참여 안내
- `pages/market-trial/MyParticipationsPage.tsx` — 허브 링크/빈 상태
- `pages/supplier/SupplierDashboardPage.tsx` — CTA h2 + 메뉴 라벨
- `pages/supplier/SupplierTrialListPage.tsx` — 제목
- `pages/supplier/SupplierTrialCreatePage.tsx` — 등록/수정 제목
- `components/layouts/SupplierSpaceLayout.tsx` — 사이드바 라벨
- `pages/guide/GuideHomePage.tsx` — 가이드 카드 제목/설명/이동 라벨
- `pages/CommunityPage.tsx` — 역할 카드 / AppEntry / CTA / help 문구
- `pages/NetureHomePage.tsx` — 섹션 제목/빈 상태/CTA
- `pages/operator/MarketTrialApprovalsPage.tsx` — 운영자 관리 화면 제목
- `config/seoRegistry.ts` — SEO title/description (메타 노출)
- `config/operatorMenuGroups.ts` — 운영자 메뉴 라벨
- `config/navigation.ts` — 상단 메뉴 주석 용어 정합
- (market-trial/index.ts: barrel 주석만 — 미변경)

### web-k-cosmetics (3)
- `pages/HomePage.tsx` — 홈 CTA 제목
- `config/homeStaticData.ts` — 홈 슬라이드/카드 title
- `components/common/MarketTrialNetureRedirect.tsx` — 리다이렉트 안내 제목

### web-glycopharm (8)
- `pages/business/BusinessProductsPage.tsx` — 사업 소개 본문 5곳
- `pages/business/BusinessPreparationPage.tsx` — 준비 항목 본문 2곳
- `pages/business/BusinessHubPage.tsx` — 사업 카드/Hero 본문 3곳
- `pages/business/BusinessForumPage.tsx` — 포럼 주제/제목 prefix 태그/안내 본문
- `pages/business/BloodCareBusinessStatusPage.tsx` — 사업 카드 title/checks
- `api/public.ts` — 공지 mock 제목
- `pages/store-management/StoreMainPage.tsx` — 매장 메뉴 라벨
- `components/common/MarketTrialNetureRedirect.tsx` — 리다이렉트 안내 제목

### web-kpa-society (4)
- `components/ServiceBanner.tsx` — 배너 제목
- `pages/CommunityHomePage.tsx` — 커뮤니티 홈 CTA 제목
- `components/home/MarketTrialSection.tsx` — CTA 카드 헤드라인
- `components/MarketTrialNetureRedirect.tsx` — 리다이렉트 안내 제목

### packages/shared-space-ui (2) — 공통 모듈
- `O4OHelpSection.tsx` — O4O 도움말 섹션 항목 title
- `guide/copy/neture.ts` — Neture 가이드 copy (19곳: 흐름/요약/제안/이용방법 등)

> **Shared Module 영향 확인:** `shared-space-ui` 변경은 **copy(표시 문자열) 한정**이며 export key/타입/구조 계약은 불변. 소비처 = 전 서비스 가이드/도움말 영역이며, 모든 소비처에 **동일 문구가 일괄 반영되는 의도된 변경**이다. route(`/guide/features/market-trial`, `/market-trial`)·serviceKey(`market-trial`) 등 식별자는 유지.

## 3. 변경하지 않은 내부 항목 (스코프 제외)

| 분류 | 예시 | 유지 사유 |
|------|------|----------|
| 라우트 | `/market-trial`, `/supplier/market-trial`, `/guide/features/market-trial`, `/store/market-trial` | WO 제외 |
| 컴포넌트/파일명 | `MarketTrial*` (Hub/Detail/Section/NetureRedirect/Approvals…) | WO 제외 |
| sectionKey / icon map | `serviceKey: 'market-trial'`, `'market-trial': Tag` (store-ui-core) | 내부 식별자 |
| 코드 주석 (JSDoc/`//`) | `Market Trial`, `마켓트라이얼` 주석 | WO 허용 (내부 기능명) |
| API / DB / migration / entity | `apps/api-server/**`, `packages/market-trial/**` | WO 제외 |
| 환경/SEO 보조 | `.env.example`, `robots.txt`, `sitemap.xml` 의 `market-trial` 경로 | 라우트 경로 |

## 4. `Market Trial` 잔존 검색 결과 분류

검색: `services/web-*`, `packages` 의 `.tsx/.ts`

| 분류 | 결과 |
|------|------|
| 사용자-facing 렌더링 `Market Trial` / `마켓 트라이얼` | **0** |
| 사용자-facing 렌더링 `유통 참여형 펀딩`(띄어쓰기) | **0** |
| 코드 주석 내 `Market Trial` / `마켓트라이얼` | 잔존 (유지 대상) |
| 식별자/라우트/import (`MarketTrial*`, `/market-trial`) | 잔존 (유지 대상) |

## 5. TypeScript 검증

| 패키지 | `tsc --noEmit` |
|--------|:---:|
| web-neture | ✅ exit 0 |
| web-glycopharm | ✅ exit 0 |
| web-k-cosmetics | ✅ exit 0 |
| web-kpa-society | ✅ exit 0 |
| shared-space-ui | ✅ exit 0 |

## 6. 라우트/링크 검증

- 변경은 표시 문구뿐, `to=`/`route=`/`path=`/`href=` 의 `/market-trial` 계열 경로는 모두 원본 유지.
- 버튼/카드/메뉴 라벨 텍스트만 변경되고 링크 동작은 불변.

## 7. Smoke (후속)

- 정적/타입 검증 완료. 브라우저 라이브 smoke (Neture Home/Guide/Market Trial Hub, 각 서비스 홈 CTA) 는 배포 후 별도 수행 권장.

---

*상태: 구현·정적검증 완료 / 브라우저 smoke 후속*
