# WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1 — Audit Phase

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `d0bf9e123` 시점 정적 코드 (read-only)  
**작업 성격**: Audit Phase — 코드 수정 전 조사·분류. **이 문서 단계에서 소스 수정 없음.**  
**조사 도구**: Explore sub-agent ×4 (서비스별 병렬) + Grep/Read

---

## 1. 핵심 결론

**4개 서비스 모두 공개 사용자-facing 메인 페이지는 Layout 레벨에서 Footer가 이미 커버되어 있다.** 누락된 페이지는 전부 **standalone 특수 페이지**(인증 플로우 / QR 랜딩 / 404 / 공개 매장 블로그)이며, 다수는 서비스 간 일관된 **의도적 제외** 패턴이다.

**→ 일괄 Footer 추가는 부적절. 실제 보강 가치가 있는 소수 후보만 사용자 확정 후 처리 권장.**

| 서비스 | Footer 레이아웃 | 공개 메인 커버 | 보강 후보 |
|--------|---------------|:---:|---------|
| KPA-Society | `Layout` + `InfoPageLayout`(PlatformFooter) | ✅ | auth/QR/404/공개뷰 (대부분 의도적) |
| GlycoPharm | `MainLayout` | ✅ | 없음 (현 구조 적절) |
| K-Cosmetics | `MainLayout` | ✅ | 404, 공개 매장 블로그 |
| Neture | `NetureLayout` + `MainLayout` (inline footer) | ✅ | 없음 (현 구조 적절) |

---

## 2. 서비스별 Footer 구조 요약

### KPA-Society
- `components/Footer.tsx` → `components/Layout.tsx`에서 렌더 (커뮤니티/포럼/가이드/콘텐츠/마이페이지 등 70+ 라우트)
- `components/platform/PlatformFooter.tsx` → `InfoPageLayout`(`/services/*`, `/join/pharmacy`)
- `InstructorLayout`도 Footer 포함
- **제외(적절)**: `/admin/*`, `/operator/*`, `/store`(경영 대시보드), `/tablet/:slug`(키오스크), `/signage/play/*`(풀스크린), `*`(404)

### GlycoPharm
- `components/common/Footer.tsx` → `components/layouts/MainLayout.tsx`에서 `<Outlet/>` 아래 렌더 (공개 페이지 60+ 라우트)
- StoreLayout/KioskLayout/TabletLayout은 자체 Store/Kiosk/Tablet Footer 보유
- **제외(적절)**: `/admin/*`, `/operator/*`, `/store/*`(경영), `/store-hub/*`(탐색 허브), auth 플로우, `/qr/:id`, `*`(404)

### K-Cosmetics
- `components/common/Footer.tsx` → `components/layouts/MainLayout.tsx`에서 렌더 (공개 페이지 60+ 라우트)
- **제외(적절)**: `/admin/*`, `/operator/*`, `/store/*`(내 매장 경영), `/tablet/:slug`(키오스크)
- **누락 후보**: `*`(404), `/store/:slug/blog`·`/store/:slug/blog/:postSlug`(공개 매장 블로그)

### Neture
- `components/Footer.tsx`는 **미사용**(import 0건). 각 레이아웃이 inline `<footer>` 보유.
- Footer 포함: `NetureLayout`(공개: `/`, `/forum`, `/guide/*`, `/o4o/*`, `/market-trial`, `/supplier`, `/partner`, `/mypage` 등), `MainLayout`(`/store/*`, `/seller/*`), `SupplierSpaceLayout`/`PartnerSpaceLayout`/`SupplierOpsLayout`, `AdminVaultLayout`
- **제외(적절)**: `/account/supplier/*`, `/account/partner/*`, `/admin/*`, `/operator/*`(OperatorAreaShell), auth 플로우, `/qr/:slug`

---

## 3. Footer 누락 페이지 전체 목록 (서비스별)

### 3-1. 인증 플로우 (4개 서비스 공통 — standalone)

| 라우트 | KPA | GP | K-Cos | Neture |
|--------|:---:|:---:|:---:|:---:|
| `/login` | 모달(Layout) | standalone | MainLayout | 모달 |
| `/forgot-password` | ❌ | ❌ | MainLayout | ❌ |
| `/reset-password` | ❌ | ❌ | MainLayout | ❌ |
| `/auth/verify-email` | ❌ | ❌ | MainLayout | ❌ |
| `/handoff` | ❌ (redirect) | ❌ (redirect) | MainLayout | ❌ (redirect) |

**판정**: auth 플로우는 **서비스 간 일관되게 standalone/모달**. K-Cos만 MainLayout 안에 둠. 4개 서비스 통일 관점에서 **의도적 제외가 표준** — 보강 대상 아님(단, 서비스 간 정책 통일 시 별도 결정).

### 3-2. 공개 standalone 페이지 (KPA)

| 라우트 | 파일 | 성격 | Footer 보강 가치 |
|--------|------|------|:---:|
| `/setup-activity` | `ActivitySetupPage.tsx` | 직역/근무처 설정 (인증 후) | 낮음 (단계형 폼) |
| `/pending-approval` | `PendingApprovalPage.tsx` | 승인 대기 안내 | 낮음 (상태 안내) |
| `/qr/:slug` | `QrLandingPage.tsx` | QR 랜딩 (모바일 공개) | 낮음 (모바일 minimal 의도) |
| `/public/signage` | `PublicSignagePage.tsx` | 공개 사이니지 렌더 | 제외 (display-only) |
| `/certificate/verify/:id` | `CertificateVerifyPage.tsx` | 자격증 검증 (외부 공유) | 중간 |
| `/view/:snapshotId` | `PublicContentViewPage.tsx` | 공개 콘텐츠 뷰 | 조건부 (displayMode) |
| `/store/:slug/payment/success\|fail` | 결제 결과 | e-commerce | 낮음 (자동 이동) |

### 3-3. 404 / 공개 블로그 (K-Cos, KPA)

| 라우트 | 서비스 | 성격 | Footer 보강 가치 |
|--------|--------|------|:---:|
| `*` (404) | K-Cos, KPA, GP, Neture | 에러 페이지 | **중간** (복귀 네비) — 단 minimal이 의도일 수 있음 |
| `/store/:slug/blog`, `.../blog/:postSlug` | K-Cos | 공개 매장 블로그 | **논쟁** (매장 자율 영역 vs 플랫폼 정보) |

---

## 4. 분류: 적용 / 비적용 / 확정 필요

### A. 이미 적용 (보강 불필요) — 4개 서비스 공개 메인
홈·서비스 소개·가이드·커뮤니티(포럼)·공지/뉴스/콘텐츠·마이페이지(일반 사용자) → **Layout 레벨 Footer 커버 완료.**

### B. 의도적 제외 (보강하면 안 됨)
- operator/admin 대시보드, store/my-store 경영 화면, supplier/partner 업무 공간
- kiosk/tablet/signage fullscreen/player
- auth 플로우(서비스 간 일관 standalone), handoff/redirect, public-view display, 404 minimal

### C. 확정 필요 (사용자 판단 — 보강 가치 논쟁)
| 후보 | 쟁점 |
|------|------|
| **404 페이지 (4서비스)** | 복귀 네비 제공 vs minimal 에러 페이지 의도 |
| **K-Cos 공개 매장 블로그** | 플랫폼 Footer 통일 vs 매장 자율 영역 (GP 조사에서 "자율성 침해" 우려 제기) |
| **KPA `/certificate/verify`, `/setup-activity`** | 외부 공유/단계형 폼에 Footer 필요성 |
| **auth 플로우 정책 통일** | 4서비스 모두 standalone로 통일할지, K-Cos만 MainLayout 유지할지 |

---

## 5. 권고

**일괄 Footer 추가는 권장하지 않는다.** 근거:
1. 공개 메인 페이지는 4개 서비스 모두 이미 Footer 커버 완료 — 실질 drift 없음.
2. 누락 후보는 전부 standalone 특수 페이지로, 다수가 서비스 간 일관된 의도적 제외.
3. auth/404/QR/매장블로그는 "Footer 없음이 의도"일 가능성이 높아, 무분별 추가 시 오히려 UX 회귀.

**다음 단계 제안 (사용자 확정 후 진행)**:
- 보강 가치가 가장 명확한 단일 후보: **404 페이지에 "홈으로/주요 링크" 네비 보강** (4서비스 공통, 사용자 복귀 경로) — 단 Footer 전체가 아닌 minimal 네비로 한정 가능.
- K-Cos 공개 매장 블로그: 매장 자율 정책 확인 후 결정.
- 나머지(auth/QR/certificate/setup): 현 standalone 유지 권장.

**부수 발견**: Neture `components/Footer.tsx`는 미사용(import 0건) — 각 레이아웃 inline footer로 대체됨. 정리 여부는 별도 cleanup 판단(이번 WO 범위 외).

---

## 6. 코드 변경 없음 확인

이 Audit Phase에서 수정한 소스/DB/migration: **없음.**  
조사 파일: 4개 서비스 `App.tsx`, layouts/*, Footer 컴포넌트.  
git status: 다른 세션 WIP(`CHECK-...NEXT-SCOPE` modified) 미접촉.

---

## 7. Fix Phase 대기

이 문서는 Audit Phase 산출물이다. **Fix Phase(실제 Footer 보강)는 §4-C 확정 후 진행**한다. 사용자 확정 항목:
1. 404 페이지 Footer/네비 보강 여부 (4서비스)
2. K-Cos 공개 매장 블로그 Footer 여부
3. auth 플로우 정책 통일 여부
4. 그 외 §3-2 KPA standalone 페이지 처리 여부

---

*작성: Claude Code (2026-06-01)*  
*Audit Phase — read-only. Fix Phase는 사용자 확정 후.*
