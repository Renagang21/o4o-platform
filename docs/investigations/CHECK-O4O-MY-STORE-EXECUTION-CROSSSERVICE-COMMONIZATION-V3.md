# CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V3

> **목적:** 최근 product-description 이식, K-Cosmetics 주문 관리, K-Cosmetics 매출 요약 완료 이후  
> KPA-Society / GlycoPharm / K-Cosmetics 내 매장·내 약국 실행 영역 cross-service 공통화 1차 최종 확인.

---

## 메타

| 항목 | 내용 |
|------|------|
| 일자 | 2026-06-01 |
| 선행 CHECK | CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V2 |
| 선행 WO | WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1 (82226d6e4) |
| 선행 WO | WO-O4O-KCOSMETICS-STORE-REVENUE-SUMMARY-FRONTEND-V1 (42399f7e6) |
| 기준 | KPA-Society canonical |
| 범위 | frontend read-only 검증 |

---

## 1. 전체 판정

**✅ PASS — 내 매장 / 내 약국 실행 영역 cross-service 공통화 1차 완료**

V2에서 PARTIAL 판정이었던 K-Cosmetics 주문/매출 영역이 해소되었다.  
product-description · 주문 관리 · 매출 요약이 모두 연결되었고,  
실제 정산/인보이스는 장기 과제로 명확히 분리되었다.  
문구 drift 없음. TypeScript 양 서비스 PASS. 주요 route 회귀 없음.

---

## 2. V2 대비 개선 사항

| 항목 | V2 | V3 |
|------|----|----|
| K-Cosmetics 주문 관리 | PARTIAL (Placeholder) | **FUNCTIONAL** ✅ |
| K-Cosmetics 정산/인보이스 | PARTIAL (Placeholder "준비 중") | **FUNCTIONAL** (매출 요약) + LONG_TERM (실제 정산) ✅ |
| K-Cosmetics 메뉴 "정산/인보이스" 라벨 | "정산/인보이스" | **"매출 요약"** ✅ |
| K-Cosmetics 면책 배너 | 없음 | ✅ "실제 정산 확정 금액...이 아닙니다" |
| K-Cosmetics 내 자료함 제작 자료 라벨 | "제작 자료" | **"매장 제작 자료"** ✅ |

---

## 3. Cross-Service Matrix (V3 최종)

### 범례
- **FULL**: KPA canonical 구조와 동일 수준 구현
- **FUNCTIONAL**: 핵심 기능 동작, KPA 대비 일부 세부 차이 허용
- **PARTIAL**: 기본 진입 가능하나 일부 기능 미완성
- **LONG_TERM**: 의도적 장기 보류 (현재 단계 구현 대상 아님)

| 영역 | KPA | GlycoPharm | K-Cosmetics | 비고 |
|------|:---:|:----------:|:-----------:|------|
| **대시보드** | FULL | FULL | FULL | |
| **내 자료함 / 콘텐츠** | FULL | FULL | FULL | |
| **내 자료함 / 자료** | FULL | FULL | FULL | |
| **매장 제작 자료** | FULL (`매장 제작 자료`) | FUNCTIONAL (`제작 자료`) | FULL (`매장 제작 자료`) | GlycoPharm 라벨 낮은 우선순위 |
| **POP** | FULL | FULL | FULL | |
| **QR** | FULL | FULL | FULL | |
| **블로그** | FULL | FUNCTIONAL | FULL | GlycoPharm `content/blog` 경로 소폭 차이 |
| **상품 설명** | FULL | **FUNCTIONAL** ✅ | **FUNCTIONAL** ✅ | 사이드바 미노출은 3서비스 공통 의도 설계 |
| **디지털 사이니지** | FULL | FULL | FUNCTIONAL | K-Cosmetics TV재생 메뉴 미노출 (route 있음) |
| **내 매장 상품** | FULL | FULL | FULL | |
| **자체 상품** | FULL | FULL | FULL | |
| **주문 관리** | FULL | FULL | **FUNCTIONAL** ✅ NEW | |
| **매출 요약** | — | — | **FUNCTIONAL** ✅ NEW | 참고용, 면책 배너 포함 |
| **실제 정산/인보이스** | — | PARTIAL (Mock) | **LONG_TERM** | IR-O4O-SETTLEMENT-INVOICE 설계 대기 |
| **태블릿 디스플레이** | FULL | FULL | FULL | |
| **채널 관리** | FULL | FULL | FULL | |
| **설정** | FULL | FULL | FULL | |

---

## 4. Product-Description 최종 상태

3개 서비스 모두 page · route · Core API client · productionTemplates 갖춤.

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|:---:|:----------:|:-----------:|
| page | ✅ | ✅ | ✅ |
| route | `marketing/product-descriptions` | `library/product-descriptions` | `library/product-descriptions` |
| Core API | `/products/:id/ai-contents` | 동일 | 동일 |
| template | — | `glyco-product-desc-*` 2개 | `kcos-product-desc-*` 2개 |
| 사이드바 메뉴 | 없음 (의도적) | 없음 (의도적) | 없음 (의도적) |

사이드바 미노출은 3개 서비스 공통 의도적 설계 확인 (`CHECK-V2 §4-A`).

---

## 5. K-Cosmetics 주문 관리 최종 상태

| 항목 | 결과 |
|------|------|
| page | `StoreOrdersPage.tsx` ✅ |
| API client | `storeOrders.ts` → `/cosmetics/orders` ✅ |
| route | `commerce/orders` → StoreOrdersPage ✅ |
| 메뉴 | 상품 섹션 "주문 내역" → `/commerce/orders` ✅ |
| 상태 탭 | 전체/접수/결제대기/결제완료/취소 ✅ |
| 상세 패널 | 행 클릭 → 주문 상세 ✅ |
| 문구 | "내 매장", "매장 주문 관리" ✅ / "내 약국" 없음 ✅ |

---

## 6. K-Cosmetics 매출 요약 최종 상태

| 항목 | 결과 |
|------|------|
| page | `StoreRevenueSummaryPage.tsx` ✅ |
| API 재사용 | `storeOrders.ts` → `/cosmetics/orders` (신규 backend 없음) ✅ |
| route | `commerce/billing` → StoreRevenueSummaryPage ✅ |
| 메뉴 | 상품 섹션 "매출 요약" (구 "정산/인보이스") ✅ |
| 면책 배너 | ✅ "실제 정산 확정 금액, 지급 금액, 세금계산서 또는 인보이스 발행 내역이 아닙니다" |
| KPI 카드 | 결제완료/결제대기/취소/환불 금액·건수 ✅ |
| 채널별 요약 | local/travel 채널 구분 ✅ |
| 최근 주문 목록 | 최근 10건 참고용 표시 ✅ |
| 금지 표현 없음 | "정산 완료", "지급 완료", "인보이스 발행 완료" 없음 ✅ |

---

## 7. 장기 과제 분리 확인

### 실제 정산/인보이스

```
상태: LONG_TERM — IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1 설계 대기

현황:
- K-Cosmetics backend billing/settlement API 없음 (확인)
- GlycoPharm billing-invoice도 mock 수준 (확인)
- K-Cosmetics 화면에 "정산 완료", "지급 완료" 표현 없음 (확인)
- 면책 배너로 오해 방지 (확인)
```

### K-Cosmetics TV재생 메뉴 미노출

```
상태: 낮은 우선순위 drift — 운영 장애 없음

현황:
- route: marketing/signage/player (KPA/GlycoPharm에 있으나 K-Cosmetics menuSections에 없음)
- 메뉴 미노출이나 route 자체는 존재
- 사이니지 사용에 직접적 장애 없음
```

---

## 8. 사용자-facing 문구 검증

| 항목 | GlycoPharm | K-Cosmetics |
|------|:----------:|:-----------:|
| "내 약국" 사용 | ✅ | — |
| "약국 상품 설명" 사용 | ✅ | — |
| "내 매장" 사용 | — | ✅ |
| "매장 주문 관리" 사용 | — | ✅ |
| "매출 요약" 사용 | — | ✅ |
| GlycoPharm에 "내 매장" 오염 | CLEAN ✅ | — |
| K-Cosmetics에 "내 약국" 오염 | — | CLEAN ✅ |
| 정산 확정 표현 (K-Cosmetics) | — | CLEAN ✅ |
| dashboardCopyApi 재도입 | CLEAN ✅ | CLEAN ✅ |

---

## 9. Route/Layout 회귀 없음

### K-Cosmetics 기존 route 모두 유지

- `marketing/pop` ✅ / `marketing/qr` ✅ / `content/blog` ✅
- `marketing/signage/*` ✅
- `library/contents` ✅ / `library/resources` ✅
- `library/production-materials` ✅ / `library/production-materials/new` ✅
- `library/product-descriptions` ✅
- `commerce/local-products` ✅ / `commerce/tablet-displays` ✅
- `commerce/orders` → StoreOrdersPage ✅
- `commerce/billing` → StoreRevenueSummaryPage ✅

### GlycoPharm 기존 route 모두 유지

- `marketing/pop` ✅ / `marketing/qr` ✅ / `content/blog` ✅
- `marketing/signage/*` ✅
- `library/contents` ✅ / `library/resources` ✅
- `library/production-materials` ✅
- `library/product-descriptions` ✅
- `commerce/local-products` ✅ / `commerce/tablet-displays` ✅

---

## 10. TypeScript 검증

| 서비스 | 결과 |
|--------|------|
| services/web-glycopharm | ✅ PASS (오류 없음) |
| services/web-k-cosmetics | ✅ PASS (오류 없음) |

---

## 11. 브라우저 Smoke

**BLOCKED** — 배포 환경 직접 smoke 미수행.

코드·route·API 정적 검증 결과를 근거로 판정:
- K-Cosmetics 주문 관리: lazy import + route + API client 완비 → 기능적 동작 예상
- K-Cosmetics 매출 요약: 동일 API 재사용 → 기능적 동작 예상
- 배포 후 테스트 계정으로 smoke 권장

---

## 12. 남은 Drift 목록

| # | 항목 | 상태 | 영향도 | 비고 |
|---|------|------|--------|------|
| D1 | product-description route 경로 차이 | `marketing/` vs `library/` | 낮음 | 기능 동일, 추가 WO 불필요 |
| D2 | GlycoPharm 내 자료함 제작 자료 라벨 | `제작 자료` (KPA: `매장 제작 자료`) | 낮음 | 선택적 WO |
| D3 | K-Cosmetics 사이니지 TV재생 메뉴 미노출 | route 있음, 메뉴 없음 | 낮음 | 선택적 WO |
| D5 → LONG_TERM | K-Cosmetics 실제 정산/인보이스 | 장기 설계 과제 | — | IR-O4O-SETTLEMENT-INVOICE |

**해소된 항목:**
- ~~D4: K-Cosmetics 주문 관리 Placeholder~~ → FUNCTIONAL ✅
- ~~K-Cosmetics 매출 요약 Placeholder~~ → FUNCTIONAL ✅
- ~~K-Cosmetics 메뉴 "정산/인보이스"~~ → "매출 요약" ✅

---

## 13. 후속 WO 필요 여부

현재 단계에서 필수 후속 WO 없음.

| WO 후보 | 우선순위 | 비고 |
|---------|---------|------|
| WO-O4O-GLYCOPHARM-STORE-MENU-PRODUCTION-MATERIALS-LABEL-V1 | 낮음 | "제작 자료" → "매장 제작 자료" 1줄 |
| WO-O4O-KCOSMETICS-SIGNAGE-TV-PLAY-MENU-V1 | 낮음 (보류 가능) | TV재생 메뉴 추가 |
| IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1 | 장기 | 실제 정산 entity/정책 설계 |

---

## 14. 최종 결론

**내 매장 / 내 약국 실행 영역 cross-service 공통화 1차 완료.**

```text
판정: PASS

변경 사항 (V2 → V3):
  K-Cosmetics 주문 관리   PARTIAL → FUNCTIONAL ✅
  K-Cosmetics 매출 요약   Placeholder → FUNCTIONAL ✅ (면책 배너 포함)
  K-Cosmetics 정산/인보이스  장기 과제로 명확 분리 ✅

3서비스 핵심 실행 영역 정렬:
  product-description: KPA FULL / GlycoPharm FUNCTIONAL / K-Cosmetics FUNCTIONAL
  POP/QR/Blog/Signage: 3서비스 FULL
  주문 관리: KPA/GlycoPharm FULL / K-Cosmetics FUNCTIONAL
  매출 요약: K-Cosmetics FUNCTIONAL (참고용, 면책 배너)
  실제 정산: LONG_TERM 분리

TypeScript: 양 서비스 PASS
문구 drift: 없음 (GlycoPharm "내 약국" / K-Cosmetics "내 매장" 기준 유지)
API 계약: 신규 backend 없음
회귀: 없음
```
