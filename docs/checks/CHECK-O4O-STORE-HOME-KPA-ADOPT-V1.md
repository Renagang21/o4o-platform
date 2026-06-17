# CHECK-O4O-STORE-HOME-KPA-ADOPT-V1

> **작업명:** WO-O4O-STORE-HOME-KPA-ADOPT-V1
> **유형:** KPA-Society `/store` 내 약국 홈을 canonical `StoreHomeShell` 3번째 소비처로 adopt. "실행 흐름 3단계" → `onboardingSlot` 이동·하단 강등. 운영 블록 유지.
> **결과: PASS — 실행 흐름 3단계를 `onboardingSlot` 으로 이동·운영 블록 아래로 강등(삭제 아님). KPI/Live Signals/홍보성과/최근활동 의미·위치 유지. store-ui-core/hub-core/backend/API/DB/package/route·GlycoPharm·K-Cosmetics 변경 0. web-kpa-society `tsc -b` exit 0. 배포 success. 약국 경영자 계정 런타임 smoke PASS(매장 "테스트 약국 매장": KPI·홍보성과·최근활동·실행흐름(하단) 렌더, store API 전부 200, 반응형 drawer 정상).**
> 선행: WO-O4O-STORE-HOME-CANONICAL-SHELL-V1 · SMOKE-...-GLYCOPHARM(PASS) · WO-...-KCOSMETICS-ADOPT(PARTIAL)
>
> *Date: 2026-06-17*

---

## 1. 변경 전 KPA 홈 구조 요약

`/store` → `StoreHomePage` (`pages/pharmacy/StoreHomePage.tsx`), bespoke(HubLayout 미사용):
1. Header — title(내 약국 홈)/subtitle + 새로고침 버튼
2. **Live Signals** 배너(조건부) — 신규 주문 / 상담 요청 / 판매 요청 (`/store-hub/live-signals`)
3. **KPI 4칸** — 자료실 파일 / 활성 QR / 진열 상품 / 이번주 스캔
4. **실행 흐름 3단계** Card — Step1 상품선택 / Step2 제작자료 / Step3 매장적용 (KPI ↔ 홍보성과 사이)
5. 하단 2열 — 홍보 성과 요약(TOP3 QR) + 최근 활동(최근 QR 스캔)

전(前) 순서: Header → Live Signals → KPI → **실행 흐름** → (홍보성과 + 최근활동).

## 2. 변경 후 StoreHomeShell 적용 구조

```
<div className="max-w-[960px] p-6">
  Header (title + 새로고침)            ← bespoke 유지
  Live Signals (조건부)               ← bespoke 유지(위치)
  KPI 4칸                             ← bespoke 유지(위치)
  홍보 성과 + 최근 활동 (2열)           ← bespoke 유지(위치)
  <StoreHomeShell onboardingSlot={실행 흐름 3단계 Card} />   ← 실행흐름 하단 강등
</div>
```

후(後) 순서: Header → Live Signals → KPI → 홍보성과/최근활동 → **실행 흐름(onboardingSlot, 최하단)**.

## 3. onboardingSlot 적용 방식

- 기존 "실행 흐름" `<Card>`(Step1~3, 모든 Link 포함)를 **그대로** `StoreHomeShell.onboardingSlot` 으로 이동. 내용·링크·문구 무변경.
- 셸은 `onboardingSlot` 을 canonical 영역(셸 슬롯 순서상 insights 다음, 운영 콘텐츠 아래)에서 렌더 → 운영 상태판 중심에서 **하단으로 강등**(WO 설계 원칙 부합).
- 단일 shell 인스턴스, `onboardingSlot` 만 사용(다른 슬롯 미주입) → 본 WO 의 검증 대상(onboardingSlot) 명확.

## 4. 실행 흐름 3단계의 유지 방식

- **삭제 0.** Step1 상품 선택(`/store/commerce/products`) · Step2 제작 자료 만들기(`/store/library/production-materials`) · Step3 매장에 적용하기(`/store/marketing/signage`, `/store/channels`) — 번호 배지·문구·링크 전부 보존.
- 위치만 [KPI↔홍보성과 사이] → [최하단]으로 이동(강등). 기능 안내/온보딩 성격에 맞는 배치.

## 5. KPI / Live Signals / 최근활동 처리 방식

| 영역 | 처리 |
|------|------|
| KPI 4칸(자료실/활성QR/진열상품/주간스캔) | bespoke 유지(Header 다음 위치) |
| Live Signals(신규주문/상담/판매요청) | bespoke 유지(조건부 — 신호 있을 때만). API `live-signals` |
| 홍보 성과 요약(TOP3 QR) | bespoke 유지(하단 2열 좌) |
| 최근 활동(최근 QR 스캔) | bespoke 유지(하단 2열 우) |
| 새로고침 | bespoke 헤더 인라인 유지(셸 refresh row 미사용 — `-mt-4` 가정 회피, KPA 헤더 레이아웃 보존) |

- KPA 전용 fetch(`storeAnalytics`/`storeHub`/`storeExecutionAssets`/`pharmacyProducts`/`pharmacyInfo`) + adapter = **service-local 유지**. 셸은 API 미인지.

## 6. 기존 화면 대비 유지된 것

- KPI / Live Signals / 홍보성과 / 최근활동 의미·위치·마크업 유지.
- 실행 흐름 3단계 내용 유지(위치만 하단 강등).
- Header / 새로고침 / noStore·loading early-return / 용어(약국/약국 자료) 유지.

## 7. 이번 WO에서 변경하지 않은 것

- ✅ `StoreHomeShell` / `store-ui-core` **무변경**(additive prop 불필요 — onboardingSlot 기존 prop) → GlycoPharm/KCos 무영향 보장.
- ✅ `StoreDashboardLayout`/`StoreSidebar`/`resolveStoreMenu`·hub-core 무변경.
- ✅ backend/API/DB/migration/package/lock/route 변경 0.
- ✅ KPA API fetch/adapter 무변경. 회원/약국 권한 무변경.
- ✅ GlycoPharm / K-Cosmetics 코드 변경 0.

## 8. GlycoPharm 무회귀 확인

- 본 WO diff = `web-kpa-society/.../StoreHomePage.tsx` 1파일. 공통 셸 무변경 → GlycoPharm 영향 0. GlycoPharm 선행 smoke PASS(`b47e1dfe9`) 유지.

## 9. K-Cosmetics 무회귀 확인

- KCos 코드 미접촉. 공통 셸 무변경 → KCos 영향 0. KCos adopt(PARTIAL, 단일매장 런타임 PASS) 유지.

## 10. 검증 결과

| 항목 | 결과 |
|------|------|
| web-kpa-society typecheck (`tsc -b`) | **PASS (exit 0)** |
| 배포 | main `5a14bfbfb` push → `Deploy Web Services` kpa-society **success**. 라이브 이미지 sha=`5a14bfbfb`(= 본 커밋) 확인 |
| **browser: 약국 경영자 계정 main 홈** | ✅ 체험용 약국 경영자(renagang21, 매장 "테스트 약국 매장")로 `/store` 내 약국 홈 런타임 렌더 |
| ↳ KPI | ✅ 자료실 0 / 활성 QR 0 / 진열 상품 0 / 이번주 스캔 0 (렌더·위치 유지) |
| ↳ 홍보성과/최근활동 | ✅ "아직 홍보 성과 데이터가 없습니다" / "최근 활동 기록이 없습니다" (위치 유지) |
| ↳ **실행 흐름 onboardingSlot** | ✅ **최하단 렌더** — Step1/2/3 + 모든 링크(`/store/commerce/products`, `/store/library/production-materials`, `/store/marketing/signage`, `/store/channels`) 보존 |
| ↳ Live Signals | ✅ 신호 없어 미표시(조건부 정상) |
| ↳ console | 401 auth/me·refresh = **로그인 前** 흐름(login 200 이후 정상). **store API 신규 오류 0** |
| ↳ network | ✅ 로그인 후 store API **전부 200**: analytics/marketing·recent-scans·store/assets·products/listings·store-hub/live-signals·guide/contents |
| ↳ 반응형 390px | ✅ "메뉴 열기" 햄버거 + 사이드바 drawer + 본문 순서 유지 |
| GlycoPharm/KCos 무회귀 | ✅ 공통 셸 무변경 → 영향 0 |

## 11. 완료 판정

**PASS.** KPA `/store` 내 약국 홈을 StoreHomeShell adopt — 실행 흐름 3단계를 `onboardingSlot` 으로 이동·하단 강등(삭제 0), KPI/Live Signals/홍보성과/최근활동 의미·위치 유지. web-kpa-society typecheck PASS + 배포 success + **약국 경영자 계정 런타임 smoke PASS**(블록 렌더·실행흐름 하단·store API 200·반응형 drawer). 공통 셸·backend·GlycoPharm·KCos 무변경.

## 12. 남은 잔여 검증 항목

1. **K-Cosmetics 다중매장(≥2) `storeSelectorSlot`** — 가용 KCos 계정(체험 포함) 매장 1개로 ≥2 분기 런타임 미검증. 정적+typecheck 만 완료. → `SMOKE-O4O-STORE-HOME-KCOSMETICS-MULTISTORE-V1`(≥2 매장 계정 확보 시).
2. (선택) GlycoPharm dead `glycopharm.ai_summary` signal/action 정리.
3. (독립) K-Cosmetics 데모 매장 데이터 endpoint 500(`IR-O4O-KCOSMETICS-DEMO-STORE-DATA-500-V1`).

## 13. 3서비스 adopt 종합 (통합 종료 입력)

| 서비스 | 셸 적용 영역 | 검증 |
|------|------|------|
| GlycoPharm | beforeSections(HubLayout): refresh/banner/AI요약/insights | **PASS**(운영 smoke) |
| K-Cosmetics | storeSelectorSlot(다중매장) | **PARTIAL**(단일매장 런타임 PASS, ≥2 미검증) |
| KPA-Society | onboardingSlot(실행흐름 강등) | **PASS**(약국 경영자 런타임) |

→ 후속 **통합 종료 CHECK**(`CHECK-O4O-STORE-HOME-CANONICAL-SHELL-ROLLOUT-COMPLETION-V1`)로 3서비스 상태·잔여(KCos ≥2) 1문서 정리 권장.

---

*Date: 2026-06-17 · KPA store home StoreHomeShell adopt · PASS · 실행 흐름 3단계 → onboardingSlot 이동·하단 강등(삭제 0), KPI/Live Signals/홍보성과/최근활동 유지 · 공통 셸/backend/GlycoPharm/KCos 무변경 · web-kpa-society tsc -b 0 · 배포 success(5a14bfbfb) · 약국 경영자 계정 런타임 smoke PASS(블록 렌더·실행흐름 하단·store API 200·반응형 drawer) · 3서비스 adopt 종합: GP PASS / KCos PARTIAL(≥2 잔여) / KPA PASS · 후속 통합 종료 CHECK 권장.*
