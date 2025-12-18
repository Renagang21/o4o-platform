# Cosmetics Apps As-Is Audit V2

**일시:** 2025-12-17
**목적:** 리팩토링 이후 화장품 서비스 앱들의 설치/비활성/재설치/운영 가능 상태 검증
**범위:** appsCatalog.ts 기준 화장품 관련 11개 앱 전수조사

---

## 1. 조사 기준

이번 조사는 코드 품질 리뷰가 아닌, 다음 질문에 답하기 위한 구조 검증입니다:

1. 지금 상태에서 Cosmetics 서비스를 설치할 수 있는가?
2. 일부 앱을 비활성화한 상태로도 서비스가 유지되는가?
3. Seller / Partner / Supplier 흐름이 앱 단위로 분리되어 살아있는가?
4. 프론트엔드를 붙였을 때 "이 앱은 왜 필요한지"가 명확한가?
5. 이미 만든 앱 중 통합/흡수/제거 대상은 무엇인가?

---

## 2. 앱별 조사 결과

### 2.1 dropshipping-cosmetics

| 항목 | 내용 |
|------|------|
| **상태** | 🟡 조건부 정상 |
| **역할** | 화장품 특화 Dropshipping Core Extension |
| **유형** | Extension |

**확인 결과:**
- dropshipping-core 위 확장 구조는 논리적으로 타당
- 피부타입/성분/루틴 확장은 "도메인 확장"으로 적절
- Partner / Seller / Supplier 모두 이 앱에 의존

**문제 포인트:**
- 이 앱이 너무 많은 책임을 가질 위험 (추천 로직, 도메인 속성, 판매 구조)
- 프론트엔드에서 직접 쓰기엔 "추상 레이어"

**결론:**
- ✅ 유지 필요
- ⚠️ 프론트엔드는 직접 이 앱을 의존하지 않도록 설계 필요 (Seller/Partner Extension을 통해서만 접근)

---

### 2.2 cosmetics-seller-extension

| 항목 | 내용 |
|------|------|
| **상태** | 🟢 정상 (핵심 앱) |
| **역할** | 매장 Seller Mode |
| **유형** | Extension |

**확인 결과:**
- 진열 / 샘플 / 매장 KPI / 상담 흐름
- 오프라인 매장 역할 정의와 정확히 일치
- Seller Operations와 기능 분리가 논리적

**리스크:**
- cosmetics-sample-display-extension과 기능 중첩 가능성

**결론:**
- ✅ 유지 + 프론트엔드 1차 타겟
- ⚠️ Sample/Display 관련 책임은 점진적 분리 필요

---

### 2.3 cosmetics-partner-extension

| 항목 | 내용 |
|------|------|
| **상태** | 🟢 정상 (전략적으로 매우 중요) |
| **역할** | 무재고 판매 / Partner Mode |
| **유형** | Extension |

**확인 결과:**
- "매장은 Partner가 된다"는 최신 전략과 완벽히 부합
- 루틴 / 링크 / 커미션 구조 명확
- 소비자 저항 감소 전략과 일치

**결론:**
- ✅ 유지
- ⚠️ 프론트엔드에서는 Seller와 명확히 다른 모드로 노출 필요

---

### 2.4 cosmetics-supplier-extension

| 항목 | 내용 |
|------|------|
| **상태** | 🟡 구조는 맞으나 과중 |
| **역할** | 브랜드 / 공급사 |
| **유형** | Extension |

**확인 결과:**
- 가격 정책, 승인, 캠페인 등 핵심 기능 존재
- PriceSync, 샘플 공급, Seller 승인 모두 이쪽 책임

**문제 포인트:**
- 향후 너무 비대해질 가능성 큼
- 운영자(Admin) 기능과 경계가 애매해질 수 있음

**결론:**
- ✅ 유지
- ⚠️ Price 정책 / Compliance는 별도 App으로 분리 고려 (이미 PriceSync 논의됨)

---

### 2.5 cosmetics-sample-display-extension

| 항목 | 내용 |
|------|------|
| **상태** | 🟡 존재는 타당, 중복 위험 |
| **역할** | 샘플/진열/전환율 |
| **유형** | Extension |

**확인 결과:**
- 도메인적으로 매우 중요
- Seller Extension에서 다뤄도 이상하지 않은 기능들 포함

**결론:**
- ❌ 당장 제거 안함
- ⚠️ **Audit 후 통합 or 독립 유지 결정 대상 1순위**

---

### 2.6 forum-cosmetics

| 항목 | 내용 |
|------|------|
| **상태** | 🟢 정상 |
| **역할** | 뷰티 커뮤니티 |
| **유형** | Extension |

**결론:**
- ✅ 프론트엔드 2차 대상
- ⚠️ Seller/Partner UI와 직접 결합하지 말 것

---

### 2.7 sellerops (Feature App)

| 항목 | 내용 |
|------|------|
| **상태** | 🟢 정상 |
| **역할** | Seller 운영/관리 |
| **유형** | Feature |

**결론:**
- ✅ 운영/관리 전용
- ❌ 사용자 서비스 프론트엔드에는 직접 노출하지 않음

---

### 2.8 supplierops (Feature App)

| 항목 | 내용 |
|------|------|
| **상태** | 🟢 정상 |
| **역할** | Supplier 운영/관리 |
| **유형** | Feature |

**결론:**
- ✅ 운영/관리 전용
- ❌ 사용자 서비스 프론트엔드에는 직접 노출하지 않음

---

### 2.9 partnerops (Feature App)

| 항목 | 내용 |
|------|------|
| **상태** | 🟢 정상 |
| **역할** | Partner 운영/관리 |
| **유형** | Feature |

**결론:**
- ✅ 운영/관리 전용
- ❌ 사용자 서비스 프론트엔드에는 직접 노출하지 않음

---

### 2.10 lms-marketing

| 항목 | 내용 |
|------|------|
| **상태** | 🟢 정상 |
| **역할** | Seller/Partner 교육 |
| **유형** | Feature |

**결론:**
- ✅ Seller/Partner 교육 흐름에 필수

---

### 2.11 groupbuy-cosmetics

| 항목 | 내용 |
|------|------|
| **상태** | 🟡 비핵심 |
| **역할** | 공동구매 |
| **유형** | Extension |

**결론:**
- ⚠️ 초기 서비스에서는 **비활성 상태 유지 권장**

---

## 3. 설치/비활성 관점 결론

### 3.1 설치 가능성

| 판정 | 내용 |
|------|------|
| ✅ | Cosmetics 서비스 **전체 설치 가능 구조** |
| ✅ | 의존성 체인은 논리적으로 문제 없음 |

### 3.2 비활성 테스트에서 위험한 앱

| 앱 | 위험도 | 사유 |
|----|--------|------|
| cosmetics-sample-display-extension | 🟡 중 | 비활성 시 Seller UI 일부 기능 깨질 가능성 |
| groupbuy-cosmetics | 🟢 낮 | 독립적이나 UI 연동 시 확인 필요 |

---

## 4. 프론트엔드 기준 앱 세트 도출

### 4.1 프론트엔드 필수 앱 (5개)

프론트엔드에서 **실제로 사용하는 앱**:

| 순위 | 앱 | 역할 |
|------|-----|------|
| 1 | cosmetics-seller-extension | 매장 Seller 모드 |
| 2 | cosmetics-partner-extension | 무재고 Partner 모드 |
| 3 | cosmetics-supplier-extension | 브랜드/공급사 |
| 4 | dropshipping-cosmetics | 화장품 도메인 확장 |
| 5 | lms-marketing | 교육 흐름 |

### 4.2 나머지 앱 분류

| 분류 | 앱 |
|------|-----|
| 관리용 | sellerops, supplierops, partnerops |
| 2차 서비스 | forum-cosmetics |
| 보조/비핵심 | cosmetics-sample-display-extension, groupbuy-cosmetics |

---

## 5. 권장 사항

### 5.1 즉시 조치

1. **비활성 기본 세트 지정**
   - groupbuy-cosmetics → 기본 비활성

2. **통합/분리 검토 대상 지정**
   - cosmetics-sample-display-extension → Seller Extension 통합 or 독립 유지 결정 필요

### 5.2 프론트엔드 설계 원칙

1. dropshipping-cosmetics를 직접 의존하지 말 것 (Extension을 통해서만 접근)
2. Seller와 Partner는 명확히 다른 모드로 노출
3. Operations 앱(sellerops, supplierops, partnerops)은 사용자 UI에 노출하지 않음

### 5.3 향후 검토 사항

1. cosmetics-supplier-extension에서 PriceSync 분리 여부
2. cosmetics-sample-display-extension 통합/독립 결정
3. forum-cosmetics 프론트엔드 2차 연결 시점

---

## 6. 앱 의존성 다이어그램

```
dropshipping-core
       │
       ▼
dropshipping-cosmetics (도메인 확장)
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
cosmetics-seller     cosmetics-partner   cosmetics-supplier
 -extension           -extension          -extension
       │                  │                  │
       ▼                  ▼                  ▼
   sellerops          partnerops         supplierops
   (관리용)            (관리용)            (관리용)

[독립]
├── cosmetics-sample-display-extension (Seller 연관)
├── forum-cosmetics (커뮤니티)
├── lms-marketing (교육)
└── groupbuy-cosmetics (공동구매, 비핵심)
```

---

## 7. 결론

### 전체 판정: ✅ 운영 가능

화장품 서비스는 현재 구조에서 **설치·비활성·재설치·운영이 가능한 상태**입니다.

### 핵심 산출물

1. 프론트엔드 필수 앱 5개 확정
2. 비활성 기본 세트 1개 확정 (groupbuy-cosmetics)
3. 통합/분리 검토 대상 1개 확정 (cosmetics-sample-display-extension)

### 다음 단계

1. 프론트엔드 기준 앱 사용 맵(App Usage Map) 작성
2. Design Core 채팅방에 전달할 UI 연결 기준 정리
3. cosmetics-sample-display-extension 통합 여부 최종 결정

---

*Generated: 2025-12-17*
*Audit Version: V2*
*Status: Complete*
