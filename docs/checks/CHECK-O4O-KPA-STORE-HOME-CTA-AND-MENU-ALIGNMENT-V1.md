# CHECK-O4O-KPA-STORE-HOME-CTA-AND-MENU-ALIGNMENT-V1

> WO: `WO-O4O-KPA-STORE-HOME-CTA-AND-MENU-ALIGNMENT-V1`
> 근거 IR: `docs/investigations/IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1.md` (G6 홈↔사이드바 라벨/리다이렉트홉)
> 상태: **DONE**
> 일자: 2026-07-27

---

## 1. 작업 요약 (한 줄)

KPA-Society `/store` 홈(`StoreHomePage`)의 실행 흐름 CTA 명칭·route 를 현재 사이드바
(`storeMenuConfig` KPA)·canonical 진입점에 정합했다. 홈 재설계·KPI·API·데이터·store-ui-core 변경 없음.

---

## 2. 조사 — 홈 이동 요소 전수 (WO §5)

| # | 표시 문구 | 현재 route | 최종 도착 | 사이드바 대응 | 정합 | 수정 |
|---|-----------|-----------|-----------|--------------|------|------|
| KPI | 자료실 파일 | `/store/library/contents` | 직접 | 콘텐츠 | ✅ | — (KPI 변경금지 §7) |
| 카드 | 상세 분석 | `/store/analytics/marketing` | 직접 | 마케팅 분석 | ✅ | — |
| Live | 신규 주문 | `/store/commerce/orders` | 직접 | 발주 내역 | ✅ | — |
| Live | 상담 요청 | `/store/requests` | 직접(hidden) | (알림 진입, config 유지) | ✅ | — |
| Live | 판매 요청 | `/store/commerce/products` | 직접 | O4O 제품 | ✅ | — |
| **Step1** | **"상품 관리"** | `/store/commerce/products` | 직접 | O4O 제품 | ⚠ 라벨 | **✔ 라벨 정정 + 제품 CTA 분리** |
| Step2 | "콘텐츠 자료함" | `/store/library/contents` | 직접 | 콘텐츠 | ✅(근사) | — |
| **Step3** | **"사이니지"** | `/store/marketing/signage` | **redirect → /playlist** | 플레이리스트 | ⚠ 경유 | **✔ 직접화** |
| **Step3** | **"채널 관리"** | `/store/channels` | **redirect → online-sales/settings** | (채널 관리 메뉴 제거됨 → 판매 설정) | ❌ 경유+라벨 | **✔ 라벨+route 정정** |

### 근거 (App.tsx 라우팅)
- L957 `marketing/signage` → `<Navigate to="playlist" replace />` (redirect 홉)
- L1055 `channels` → `<Navigate to="/store/online-sales/settings" replace />` (redirect 홉)
- 사이드바(`storeMenuConfig.ts`)에서 "채널 관리" 항목은 온라인 판매 승격 WO 로 **제거**됨 → canonical 대응 = "판매 설정"(`/online-sales/settings`).
- canonical 타깃은 모두 실 페이지 마운트 확인: `commerce/products`(L968), `handled-products`(L986), `marketing/signage/playlist`(L958), `online-sales/settings`(L1047), `commerce/tablet-displays`(L1007) → §11 "canonical route 미마운트" 미해당.

### §6.4 은퇴 기능 잔존
- 홈 내 `/store/execution/product-info` / `StoreProductInfoCreatorPage` / "상품 정보 제작" 링크·문구 **없음** → 정정 대상 0.

---

## 3. 변경 내용 (Implementation)

**단일 파일**: `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx`

### 3.1 정정 전 → 후

| CTA | 정정 전 라벨 | 정정 전 route | 정정 후 라벨 | 정정 후 route |
|-----|-------------|--------------|-------------|--------------|
| Step1 ① | 상품 관리 | `/store/commerce/products` | **O4O 제품** | `/store/commerce/products` (불변) |
| Step1 ② | (없음) | — | **매장 경영활용 제품** (신규 분리) | `/store/handled-products` |
| Step3 ① | 사이니지 | `/store/marketing/signage` (redirect) | 사이니지 | **`/store/marketing/signage/playlist`** (직접) |
| Step3 ② | 채널 관리 | `/store/channels` (redirect) | **판매 설정** | **`/store/online-sales/settings`** (직접) |
| Step3 ③ | (없음) | — | **태블렛 화면 제작** (신규) | `/store/commerce/tablet-displays` |

### 3.2 문구(§6.5)
- Step1 안내: "매장에서 진열·판매할 상품을 선택합니다." → "판매할 O4O 제품을 찾거나, 매장에서 경영에 활용할 제품을 등록·관리합니다."
- Step3 안내: "제작한 자료를 매장 채널·사이니지에 배포·운영합니다." → "제작한 자료를 사이니지·태블렛·온라인 판매 등 매장 채널에 배포·운영합니다."

### 3.3 import
- 추가: `Store`, `Settings` (lucide-react). `BarChart3` 는 KPI("이번주 스캔")에 계속 사용되어 유지.

---

## 4. WO 경계 준수

| WO 항목 | 준수 |
|---------|------|
| §7 홈 재설계·KPI 추가/삭제 없음 | ✅ KPI 4칸·하단 2열·Live Signals 구조 불변 |
| §7 API·데이터 조회 구조 변경 없음 | ✅ fetch/adapter 무변경 |
| §7 새 홈 컴포넌트 추출 없음 | ✅ 기존 onboardingSlot 내부 Link 만 수정 |
| §7 legacy route 삭제 없음 | ✅ App.tsx redirect(L957/L1055) 그대로 유지 |
| §8 store-ui-core 무변경 (KPA-only) | ✅ 단일 KPA 페이지 파일만 수정 |
| §8 GlycoPharm / K-Cosmetics 영향 0 | ✅ 공통 config 미접촉 |

---

## 5. 검증

- `npx tsc --noEmit` (web-kpa-society): **PASS (EXIT 0)**.
- 정적 검증:
  - 홈 CTA 데드링크 **0** (전 타깃 App.tsx 마운트 확인).
  - legacy `/store/channels` 직접 링크 **0** (→ `/store/online-sales/settings` 직접).
  - legacy `/store/marketing/signage`(bare) 직접 링크 **0** (→ `/store/marketing/signage/playlist` 직접).
  - retired `/store/execution/product-info` 링크 **0**.
  - 홈 CTA ↔ 사이드바 사용자 용어 정합(O4O 제품 / 매장 경영활용 제품 / 판매 설정 / 태블렛 화면 제작).

> 브라우저 smoke: 배포 후 store-owner 계정으로 `/store` → Step1 O4O 제품/매장 경영활용 제품, Step3 사이니지/태블렛/판매 설정 이동 + 뒤로가기 확인 권장(배포 파이프라인 후속).

---

## 6. 완료 보고

1. 수정한 홈 CTA: Step1(상품 선택) 2개, Step3(매장에 적용하기) 3개.
2. 명칭 변경: "상품 관리"→"O4O 제품", "채널 관리"→"판매 설정" (+ "매장 경영활용 제품"·"태블렛 화면 제작" 분리 추가).
3. route 변경: 사이니지 redirect 제거(→/playlist), 채널 redirect 제거(→/online-sales/settings), 태블렛(→/commerce/tablet-displays) 추가.
4. 제거한 legacy 경유: `/store/marketing/signage`(bare), `/store/channels`.
5. 변경 파일: `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx` (단일).
6. 공통 모듈 영향: **0** (store-ui-core 읽기만).
7. typecheck: PASS.
8. browser smoke: 배포 후 권장.
9. CHECK 문서: 본 문서.
10. commit SHA: (커밋 시 기록)
