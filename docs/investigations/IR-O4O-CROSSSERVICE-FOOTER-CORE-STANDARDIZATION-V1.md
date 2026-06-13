# IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** 4서비스 공개 Footer 구조를 비교하고, `Footer Core + Service Extension` 표준화 가능성을 판단한다. "공통화하자"를 정해놓고 시작하는 문서가 아니라, 현행 유지 / 링크 guard 강화 / 얇은 FooterCore 중 하나를 고르게 하는 안전장치.
> **작성일:** 2026-06-13
> **선행:** Footer/Legal/Contact 정비 (CROSSSERVICE-DYNAMIC-LEGAL-FOOTER, GP-KCOS-PLACEHOLDER-SUPPRESSION, SERVICE-LEGAL-POLICY-SETTINGS-BACKEND, KPA-SERVICE-LEGAL-PROFILE-FOOTER, PUBLIC-INFO / CONTACT 마일스톤)

---

## 0. 핵심 결론 (Executive Summary)

| 질문 | 답 |
|------|-----|
| 법정정보 drift(하드코딩·placeholder)는 아직 위험한가? | **아니다 — 이미 해결.** 4서비스 footer 모두 공통 `PublicLegalFooterInfo`(@o4o/shared-space-ui)를 쓰고, backend는 미설정/비활성 시 `null` 반환, 컴포넌트는 값 없으면 **아무것도 렌더 안 함**(placeholder 0). 최고 위험은 이미 공통 인프라로 닫혀 있다. |
| 그럼 무엇이 남았나? | ① footer **컴포넌트 자체**가 서비스별 4개로 분산(스타일 2종·구조 3형) ② **실제 dead link 2건**(GP `/education`, Neture `/about`) ③ **route 네이밍 불일치**(KPA `/policy` vs 나머지 `/terms`) ④ **Neture ContactPage에 하드코딩 법정정보 잔존**(㈜쓰리라이프존/108-86-02873 — footer 아님, footer가 보이는 `/contact` 페이지) ⑤ `loadFooterLegal` 4중 중복(동일 로직) ⑥ Neture footer 자체가 3중 구현 |
| Footer 4개를 하나 Core로 묶을 수 있나? | **부분만.** GP·KCos는 구조가 거의 동일(컬럼형·dark·brand+3컬럼) → 묶기 쉬움. KPA(단일행 nav+divider)·Neture(흰색·최소)는 **shape 자체가 다름** → 한 Core로 강제 시 "비대해짐" 위험(Option D trap). |
| 최종 권고 | **Option B(현상 유지 + guard 강화) 우선** — 공통 `PublicLegalFooterInfo` 유지 + **링크/route guard**로 dead link·네이밍 정리 + `loadFooterLegal` 공통화. **Option C는 GP/KCos 쌍에만 한정 적용**(구조 동일한 둘만 `PublicFooterCore` 공유). KPA/Neture는 shape 차이로 현행 유지. 전면 공통(D)은 비권장. |

**핵심:** footer 표준화의 실익은 "4개를 1개로 합치는 것"이 아니다. 위험했던 **법정정보는 이미 공통 블록으로 닫혔고**, 남은 건 **링크 정합성(dead link·route 네이밍)과 중복 loader**다. 이건 무거운 FooterCore가 아니라 **링크 guard + 부분 공통화**로 더 싸고 안전하게 해결된다.

---

## 1. 이미 공통인 인프라 (Baseline)

footer의 **법정정보·정책·문의 폼**은 이미 `@o4o/shared-space-ui`로 공통화됨.

- **`PublicLegalFooterInfo`** @ [packages/shared-space-ui/src/legal/PublicLegalFooterInfo.tsx](../../packages/shared-space-ui/src/legal/PublicLegalFooterInfo.tsx)
  - props: `serviceKey`, `loadProfile(serviceKey)→Promise<dto|null>`, `style`, `linkColor`
  - **값 없으면 렌더 0:** `if (!profile) return null;` + `if (lines.length === 0 && !url) return null;` (placeholder/더미 불가능)
- **loader** `loadFooterLegal(serviceKey)` — 4서비스 각자 파일이나 **로직 동일**: `GET /api/v1/public/services/:serviceKey/footer-legal` → `data ?? null`, 오류 시 null.
- **backend** [public-service-legal.controller.ts](../../apps/api-server/src/modules/service-legal/public-service-legal.controller.ts) — `is_active=true`만 조회, 미설정/비활성 → `data: null`(placeholder 없음). `legal-profile`·`footer-legal` 동일 핸들러.
- **저장** `service_legal_profiles`(4서비스 공통, 모든 법정 필드 nullable, seed 없음).
- 함께 공통: **`PolicyDocumentViewer`**(약관/개인정보 뷰어), **`PublicContactForm`**(문의 폼).

> 결론: footer에서 **법정정보 block·copyright 옆 법정 표기는 이미 service-neutral**. 하드코딩/placeholder 재발 위험은 이 블록 한정으로는 구조적으로 차단됨.

## 2. GlycoPharm Footer
- **파일:** [services/web-glycopharm/src/components/common/Footer.tsx](../../services/web-glycopharm/src/components/common/Footer.tsx) — **Tailwind**, `bg-slate-900`(dark), 4컬럼 grid, brand+desc+email + 3 link 컬럼.
- **적용:** `MainLayout`(공개 home/forum/guide/business/mypage/store-hub…). admin/operator/store/auth 제외.
- **링크:** 포럼 `/forum`, 교육/자료 **`/education`**, 사업 `/business`, 서비스안내 `/service-guide`, 약국입점(모달), 제휴/문의 `/contact`, 문의 `/contact`, 약관 `/terms`, 개인정보 `/privacy`.
- **법정정보:** `PublicLegalFooterInfo serviceKey="glycopharm"` ✅. 하드코딩 **없음**.
- ⚠️ **dead link:** `/education` route 없음(LMS는 `/lms`).

## 3. K-Cosmetics Footer
- **파일:** [services/web-k-cosmetics/src/components/common/Footer.tsx](../../services/web-k-cosmetics/src/components/common/Footer.tsx) — **inline style**, `#0f172a`(dark), `auto-fit minmax(200px)` grid, pink brand, brand+desc+email + 3 link 컬럼. **구조는 GP와 거의 동일.**
- **적용:** `MainLayout`(GP와 동일 패턴).
- **링크:** 홈 `/`, 서비스안내 `/service-guide`, 문의 `/contact`, 매장입점 `/register`, 제휴 `/contact`, 약관 `/terms`, 개인정보 `/privacy`. 전부 유효.
- **법정정보:** `PublicLegalFooterInfo serviceKey="k-cosmetics"` ✅. 하드코딩 **없음**.

## 4. KPA Society Footer
- **파일:** [services/web-kpa-society/src/components/Footer.tsx](../../services/web-kpa-society/src/components/Footer.tsx) — **inline**, `#1E293B`(dark), **단일행 nav + `|` divider**(컬럼형 아님), 💊+약사회 로고 + 6링크, copyright+legal.
- **적용:** `Layout`(공개). admin/operator/store(PharmacyHubLayout)/auth 제외.
- **링크:** 약사회소개 `/about`, 이용가이드 `/guide/intro`, 서비스안내 `/service-guide`, 협업문의 `/contact`, **이용약관 `/policy`**, 개인정보 `/privacy`. 전부 유효(dead link 없음).
- **법정정보:** `PublicLegalFooterInfo serviceKey="kpa-society"` ✅. 하드코딩 **없음**.
- ⚠️ **route 네이밍:** 약관이 **`/policy`**(나머지 3서비스는 `/terms`). 또한 KPA 정책 저장은 legacy `kpa_legal_documents`(나머지는 `service_legal_profiles`/CMS).

## 5. Neture Footer
- **파일:** footer가 **3중**: ① [NetureLayout.tsx](../../services/web-neture/src/components/layouts/NetureLayout.tsx) 임베드(주 사용, **흰색** `bg-white`, 최소: copyright+legal+2링크) ② [components/Footer.tsx](../../services/web-neture/src/components/Footer.tsx) standalone(거의 미사용) ③ MainLayout 임베드(`/o4o/*`).
- **적용:** `NetureLayout`(home/contact/terms/privacy/forum/guide/notices/content/market-trial…). operator/admin/supplier/partner/account/auth 제외.
- **링크(NetureLayout):** Contact Us `/contact`, **About `/about`**.
- **법정정보:** `PublicLegalFooterInfo serviceKey="neture"` ✅. footer 하드코딩 **없음**.
- ⚠️ **dead link:** `/about` route 없음.
- ⚠️ **하드코딩 법정정보(footer 아님, footer 보이는 페이지):** [ContactPage.tsx](../../services/web-neture/src/pages/ContactPage.tsx) "회사 정보" 블록에 `㈜쓰리라이프존` / `사업자등록번호: 108-86-02873` 하드코딩. placeholder-suppression 원칙과 상충 — `service_legal_profiles` 동적화 대상.
- ⚠️ Neture 내부 footer 3중 구현 → 자체 fragmentation.

## 6. 비교표

| 항목 | GlycoPharm | K-Cosmetics | KPA Society | Neture |
|------|-----------|-------------|-------------|--------|
| Footer 파일 | `common/Footer.tsx` | `common/Footer.tsx` | `components/Footer.tsx` | `NetureLayout`(+standalone+Main) |
| 적용 layout | MainLayout | MainLayout | Layout | NetureLayout / MainLayout |
| 스타일 방식 | Tailwind | inline style | inline style | Tailwind |
| 배경 | dark `slate-900` | dark `#0f172a` | dark `#1E293B` | **흰색** `bg-white` |
| 구조 | 4컬럼 grid | auto-fit grid(≈4컬럼) | **단일행 nav+divider** | **최소(copyright+2링크)** |
| serviceKey | glycopharm | k-cosmetics | kpa-society | neture |
| legal block | `PublicLegalFooterInfo` | 동일 | 동일 | 동일 |
| guide link | `/service-guide` | `/service-guide` | `/guide/intro` | `/guide`(메뉴), footer엔 없음 |
| terms link | `/terms` | `/terms` | **`/policy`** | `/terms` |
| privacy link | `/privacy` | `/privacy` | `/privacy` | `/privacy` |
| contact link | `/contact` | `/contact` | `/contact` | `/contact` |
| extra links | 포럼/교육/사업/입점 | 홈/입점/제휴 | 약사회소개/가이드/서비스안내 | About |
| 하드코딩 법정정보(footer) | 없음 | 없음 | 없음 | 없음 |
| placeholder 잔존 | 없음 | 없음 | 없음 | 없음(footer) / ContactPage 하드코딩 있음 |
| dead link | **`/education`** | 없음 | 없음 | **`/about`** |
| 디자인 특이점 | dark 4컬럼 | dark pink brand | dark 단일행 | 흰색 최소·3중 구현 |
| 공통화 난이도 | 낮음(KCos와 쌍) | 낮음(GP와 쌍) | 중(단일행 shape) | 중(흰색·최소·3중) |

## 7. 옵션 무관 즉시 정합 권장 (drift fix, Core 결정과 독립)
1. **GP `/education` → `/lms`** dead link 수정.
2. **Neture `/about`** dead link — route 추가 또는 링크 제거 결정.
3. **약관 route 네이밍 canonical 결정** — KPA `/policy` vs 나머지 `/terms`. (KPA 정책 저장이 legacy `kpa_legal_documents`라 route alias만 정렬할지, 표준 `/terms`로 통일할지 별도 판단.)
4. **Neture ContactPage 하드코딩 법정정보(㈜쓰리라이프존/108-86-02873) → `service_legal_profiles` 동적화** 또는 제거(placeholder-suppression 원칙 일관성).
5. **`loadFooterLegal` 4중 중복 → 공통 1개**(@o4o/shared-space-ui 또는 공통 lib)로 수렴.
6. **Neture footer 3중 구현 정리**(NetureLayout 임베드를 단일 진입으로).

## 8. Footer Core vs Service Extension 분리

### 8.1 Core 후보 (service-neutral, 이미/쉽게 공통)
- **이미 공통:** `PublicLegalFooterInfo`(법정 block), `PolicyDocumentViewer`, `PublicContactForm`, backend footer-legal endpoint, `service_legal_profiles`.
- **공통화 쉬움(추가 후보):** `loadFooterLegal`(동일 로직 4중→1), copyright 라인 렌더, legal link group 렌더(terms/privacy/contact), 기본 link group 렌더(config 주입), serviceKey 주입 규약, "값 없는 법정정보 비표시" 원칙.

### 8.2 Core에 넣지 말 것 (Extension/config)
- 서비스별 brand 설명 장문, 배경색(dark 3 vs 흰색 1)·스타일 시스템(Tailwind vs inline), footer **shape**(4컬럼 vs 단일행 vs 최소), 서비스별 CTA(약국입점/매장입점 모달), 공개 메뉴 전체, Contact form 본문, 약관/개인정보 본문, Admin 설정, service-specific API 직접 호출, 서비스 조건문 하드코딩, 법정정보 실값.

### 8.3 권장 config 형태 (Extension)
```ts
type PublicFooterConfig = {
  serviceKey: string; serviceName: string; description?: string;
  links: { home?: string; guide?: string; terms?: string; privacy?: string; contact?: string };
  extraLinks?: Array<{ label: string; href: string }>;
  copyrightName?: string; variant?: 'dark' | 'light'; className?: string;
};
```
서비스별 값: GP(terms `/terms`, guide `/service-guide`, dark), KCos(동일, dark), KPA(terms **`/policy`**, guide `/guide/intro`, dark, 단일행), Neture(terms `/terms`, guide `/guide`, **light**, 최소).

## 9. 공통화 옵션 비교 (A~D)

| 옵션 | 내용 | 회귀 위험 | 표준화 | 비용 | drift(legal) | drift(link) |
|:---:|------|:---:|:---:|:---:|:---:|:---:|
| **A** | 현행 유지 | 없음 | 낮음 | 0 | 이미 차단(공통 block) | **미해결** |
| **B** | 현상 유지 + **link/legal guard 강화** + loader 공통화 | 낮음 | 중 | 소 | 차단 유지 | **해결** |
| **C** | 얇은 `FooterCore + config` | 중 | 상 | 중 | 차단 유지 | config 정확 시 해결 |
| **D** | 완전 공통 Footer 1개 | 높음 | 최고 | 큼 | 차단 | shape 흡수 위해 조건문↑ |

### A — 현행 유지
- 장점: 작업 0, 서비스 자유도. 단점: dead link/네이밍 drift 미해결, footer 정책 분산.

### B — 현상 유지 + guard 강화 ⭐
- 공통 `PublicLegalFooterInfo` 유지 + ① §7 dead link·route 네이밍·Neture 하드코딩 정합 ② `loadFooterLegal` 공통화 ③ footer 링크 route 정합성 검사(문서/스크립트 guard).
- 장점: 현 구조 최대 보존(회귀 최소), **실제 문제(link 정합)를 정확히 해결**, brand 자유 유지, 저비용.
- 단점: footer 레이아웃/placeholder-방지까지 컴포넌트 레벨로 표준화되진 않음(원칙·guard로 관리).

### C — 얇은 FooterCore + config
- 공통 `PublicFooterCore`(link group+legal block+copyright, config 주입) + 서비스 wrapper.
- 장점: 구조 표준화, 차이는 config. 단점: **footer shape가 3형(컬럼/단일행/최소)·dark 3+light 1**이라 한 Core가 흡수하려면 variant↑ → "비대해짐" 위험. **GP·KCos 쌍(구조 동일)으로 한정하면 위험 급감.**
- 단점: 4서비스 wrapper 전환.

### D — 완전 공통 Footer
- 장점: 최종 단순. 단점: KPA 단일행·Neture 흰색 최소를 한 컴포넌트로 강제 → 조건문 폭발(Option D trap). **현 단계 비권장.**

## 10. 권고안

### 10.1 최종 권고: **B (현상 유지 + guard 강화) + C 부분 적용(GP/KCos 한정)**

**Phase 1 (권고, 지금) — Option B.**
공통 `PublicLegalFooterInfo`는 그대로 두고, 실제 drift만 닫는다: §7의 ①dead link(GP `/education`, Neture `/about`) ②약관 route 네이밍 canonical 결정 ③Neture ContactPage 하드코딩 법정정보 동적화/제거 ④`loadFooterLegal` 4중→공통1 ⑤footer 링크 route 정합성 guard(문서 기준 + 가능 시 간단 검사).
- **왜:** footer 최고 위험(법정정보)은 이미 공통 block으로 차단됨. 남은 실제 문제는 **링크 정합·중복**이며, 무거운 Core 없이 guard로 정확·저비용·저회귀로 해결된다. brand/shape 자유 보존.

**Phase 2 (조건부, 이후) — Option C를 GP/KCos에만.**
GP·KCos는 구조가 거의 동일(dark·컬럼형·brand+3컬럼)하므로, 이 **두 서비스만** 공유하는 `PublicFooterCore`(config 주입, KCos inline→Tailwind/공통 정렬)로 수렴 검토. **KPA(단일행)·Neture(흰색 최소)는 shape 차이로 현행 유지** — 한 Core 강제 금지.

**비권장:** A 단독(drift 고착) · D 전면 공통(조건문 폭발).

### 10.2 권고 요약 (§12 형식)
> **"B 현상 유지 + guard 강화 권고"** — 이후 C는 GP/KCos 쌍에만 한정. D 전면 공통은 권고하지 않음.
- **후속 수정 파일 후보:** (Phase 1) GP `common/Footer.tsx`(`/education`→`/lms`), Neture `NetureLayout.tsx`(`/about`) + `pages/ContactPage.tsx`(하드코딩 법정정보), 4서비스 `lib/footerLegal.ts`→공통, (약관 네이밍 결정 시) 각 footer terms 링크. (Phase 2) GP/KCos `common/Footer.tsx` + 신규 `packages/shared-space-ui` FooterCore.
- **DB/마이그레이션:** 불필요(법정정보 인프라 기존). Neture 하드코딩 동적화는 `service_legal_profiles` row 설정(데이터, 코드 아님).
- **배포 대상:** Phase 1 = 해당 web 서비스(GP/Neture 등). backend 무변경.
- **회귀 위험 큰 지점:** Neture footer 3중 구현 정리(진입 단일화 시 누락 페이지 주의), 약관 route 네이밍 변경(기존 `/policy` 링크/SEO).
- **서비스별 주의:** GP=education dead link, KCos=정상(GP와 쌍), KPA=`/policy`+legacy `kpa_legal_documents`(표준 정렬 신중), Neture=`/about` dead link+ContactPage 하드코딩+footer 3중.

## 11. 후속 WO 후보

| 우선 | WO 후보 | 매핑 | 내용 |
|:---:|--------|:---:|------|
| **1** | `WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1` | B | GP `/education`→`/lms`, Neture `/about` 처리, 약관 route 네이밍 정합, footer 링크 route 정합성 검사 |
| 2 | `WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1` | B | Neture ContactPage 하드코딩 법정정보 동적화/제거 + footer 하드코딩 재발 방지 문서/검사 기준 |
| 3 | `WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1` | B | `loadFooterLegal` 4중 중복 → 공통 1개 + Neture footer 3중 구현 단일화 |
| 4 | `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` | C(부분) | GP/KCos 쌍 한정 `PublicFooterCore`+config 추출(구조 동일). KPA/Neture 제외 |
| 5 | `WO-O4O-PUBLIC-FOOTER-DESIGN-ALIGNMENT-V1` | — | (선택) footer 디자인/모바일 정렬 |

> 착수 순서: 1(link guard) → 2(legal guard) → 3(loader 공통화) → (선택) 4(GP/KCos Core). D 전면 공통은 후보 아님.

## 12. 검증 (이 IR 자체)
- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md`)
- [x] 코드/UI/API/DB/route 변경 없음 (read-only)
- [x] 4서비스 Footer 파일 위치 (§2~§5)
- [x] Footer 링크 구성 비교 (§6)
- [x] 법정정보 렌더 방식 비교 (§1·§2~§5)
- [x] 하드코딩/placeholder 잔존 확인 (§5·§6·§7 — footer 0, Neture ContactPage 1건)
- [x] Core vs Extension 분리 (§8)
- [x] 옵션 A~D 비교 (§9)
- [x] 권고안 명확 (§10 — B + C 부분)
- [x] 후속 WO 후보 (§11)

---

*End of IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1*
