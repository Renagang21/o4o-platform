# IR-O4O-KCOS-ICON-CORE-AUDIT-V1

> WO-O4O-KCOS-ICON-CORE-AUDIT-AND-CLEANUP-V1 조사 결과
> 작성일: 2026-06-14

## 1. 로그인 모달 아이콘 원천 판정

| 항목 | 결과 |
|------|------|
| 원천 파일 | `services/web-k-cosmetics/src/components/common/LoginModal.tsx` |
| core / service-local | **service-local** (core 컴포넌트 아님) |
| 형제 복사본 | `services/web-glycopharm/src/components/common/LoginModal.tsx` (독립 복사본) |
| 표준 기준 | **GlycoPharm LoginModal** 이 이미 `lucide-react` 기반 (Activity / X / AlertCircle / Mail / Lock / Eye / EyeOff) |
| 의존성 | web-k-cosmetics 에 `lucide-react ^0.523.0` 존재 ✅ |

**결론:** core 수정 불필요. K-Cosmetics 로그인 모달은 자체 구현이며, 동일 서비스의 다른 화면이 inline-style 구조를 쓰므로 **Tailwind 전면 재작성 없이 emoji만 lucide 로 최소 교체**한다.

> 참고: GlycoPharm 모달도 체험 계정 버튼에 `🧪` emoji 가 남아있음 (본 WO 범위 외, 별도 정비 권장).

## 2. K-Cosmetics emoji 사용 전체 분류

### A. 코드 주석 — UI 아님, 제외
`productionTemplates.ts`, `storeOrders.ts`, `signage/MediaDetailPage.tsx`, `signage/PlaylistDetailPage.tsx`, `store/StoreOrdersPage.tsx`, `store/StoreProductDescriptionsPage.tsx`, `store/StoreRevenueSummaryPage.tsx` 의 `⚠️` / `❌` 는 JSDoc/인라인 주석. **유지.**

### B. 사용자 emoji 입력 필드 — 정상, 유지
`forum/MyForumDashboardPage.tsx:559` `placeholder="예: 💄"` — 포럼 카테고리 iconEmoji 입력 필드. **유지.**

### C. 직접 JSX 컨트롤/시각 아이콘 — 정비 대상
| 파일 | emoji | 교체 |
|------|-------|------|
| `components/common/LoginModal.tsx` | 💄✕⚠️📧🔒👁️🙈🧪 | Sparkles/X/AlertCircle/Mail/Lock/Eye/EyeOff/Store ✅ |
| `pages/auth/RegisterPage.tsx` | 💄🛍️🏪🙈👁️ | Sparkles/ShoppingBag/Store/Eye/EyeOff ✅ |
| `pages/auth/LoginPage.tsx` | 💄 | Sparkles ✅ |
| `components/common/Footer.tsx` | 💄📧 | Sparkles/Mail |
| `pages/NotFoundPage.tsx` | 🔍 | Search |
| `pages/library/ContentLibraryPage.tsx` | 📄 (empty state) | FileText |
| `pages/store-cart/StoreCartPage.tsx` | ✅⚠️ (상태) | CheckCircle2/AlertTriangle |
| `components/auth/MembershipGate.tsx` | ⏳📝🚫 (상태) | Clock/FileText/Ban |
| `pages/lms/LmsLessonPage.tsx` | ⚠️📄📝 | AlertCircle + 타입맵 |
| `pages/lms/LmsCourseDetailPage.tsx` | ⚠️🔒👤 | AlertCircle/Lock/User |
| `pages/HomePage.tsx` | 🧪 | FlaskConical/Sparkles |

### D. 데이터 `icon:` emoji 필드 (dashboard/config) — 구조 변경 동반
문자열 emoji → lucide 컴포넌트 전환 시 데이터 shape + 렌더 사이트 동시 수정 필요:
- `config/homeStaticData.ts` `icon: '📦'`
- `components/KCosGlobalHeader.tsx` `icon: '💄'`
- `pages/admin/KCosmeticsAdminDashboard.tsx` `👤🏪⚙️`
- `pages/operator/KCosmeticsOperatorDashboard.tsx` `🏪`
- `pages/RoleNotAvailablePage.tsx` `📦🛒`
- `pages/PartnerInfoPage.tsx` `📦`

## 3. core 수정 여부 / 영향 서비스
- core 패키지 수정 **없음** (로그인 모달이 service-local 로 확정)
- `packages/ui/content-discovery/*`, `packages/shared-space-ui/*` 에도 emoji 가 있으나 K-Cosmetics 전용이 아니므로 본 WO 범위 외 (별도 WO 필요)

## 4. 진행 단계
- [x] Phase B — 로그인 모달 (LoginModal.tsx)
- [x] auth 티어 — LoginPage.tsx / RegisterPage.tsx
- [x] Phase C — C 분류 JSX 아이콘 (Footer / NotFound / ContentLibrary / StoreCart / MembershipGate / LMS 2종 / HomePage)
- [x] Phase C — D 분류 데이터 icon 필드 (RoleNotAvailablePage / PartnerInfoPage / KCosGlobalHeader / AdminDashboard)

## 5. 보류 / 범위 외 결정 (의도적 emoji 유지)

| 대상 | 사유 |
|------|------|
| `pages/operator/KCosmeticsOperatorDashboard.tsx` (KCOS_AXES 🏪📋) | **공유 core 계약** — `OperatorAxisGroup.icon: string`, `AxisNavigationSection` 이 `<span>{icon}</span>` 로 raw 렌더. **Neture / KPA / GlycoPharm / K-Cosmetics 4개 서비스 전부 emoji string** 사용. lucide 전환 시 core 계약(ReactNode) 변경 → 전 서비스 영향 → **별도 Shared Module WO 필요**. 본 WO 범위("타 서비스 흐름 불변") 외. |
| `config/homeStaticData.ts` (quickActionCards 📦📋) | **dead config** — `.tsx` 어디에서도 import/렌더되지 않음. 화면 비노출. 별도 정리(삭제 후보)는 본 WO 범위 외. |
| `MyForumDashboardPage.tsx:559` `placeholder="예: 💄"` | 포럼 카테고리 iconEmoji **사용자 입력 예시**. UI 아이콘 아님. |
| 각종 JSDoc/인라인 주석 `⚠️`/`❌` | 코드 주석. UI 아님. |

> 참고: `AdminDashboard` 의 quick action 은 core `ActionIcon` 의 **icon-name → lucide 매핑(19종)** 을 활용 — emoji 문자열을 `users`/`store`/`shield`/`settings` 이름으로 교체 (계약 무변경, 플랫폼 ADMIN-QUICKACTION-CONVERGE 방향 일치).

## 6. 검증
- `web-k-cosmetics` tsc --noEmit: **PASS** (에러 0)
- core 패키지 수정 없음 → core typecheck 불필요
