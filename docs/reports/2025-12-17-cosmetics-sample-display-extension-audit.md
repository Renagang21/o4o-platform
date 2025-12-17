# AUDIT REPORT 03 — cosmetics-sample-display-extension

### Refactoring-Oriented Preliminary Audit (Version 1.0)

> 본 문서는 테스트·검증 중심이 아닌,
> **2차 구조 리팩토링을 위한 '사전 구조 파악 및 구현 범위 확정'**을 목적으로 한다.

---

## 0. 조사 목적 재정의 (중요)

이번 조사는 **기존 기능의 정상 동작 여부를 검증하기 위한 감사(Audit)가 아니다.**

### 본 조사 목적은 다음 하나다:

> **cosmetics-sample-display-extension이
> Seller Mode 실서비스 완성에 있어
> "어디까지 구현되어 있고, 어디부터 다시 만들어야 하는지"를 구조적으로 확정한다.**

따라서:

* 테스트 결과 ❌
* UI 완성도 ❌
* 세부 UX 평가 ❌

대신:

* **역할 정의**
* **Seller Extension과의 경계**
* **신규 구현이 필요한 핵심 도메인**
* **2차 리팩토링에서 반드시 손봐야 할 구조**

에만 집중한다.

---

## 1. App Overview (기본 개요)

| 항목              | 내용                                                                               |
| --------------- | -------------------------------------------------------------------------------- |
| **App ID**      | `cosmetics-sample-display-extension`                                             |
| **App Type**    | Extension                                                                        |
| **현재 상태**       | Development / Incomplete                                                         |
| **주요 역할**       | Seller Mode 보조·확장 기능 담당                                                          |
| **핵심 도메인**      | Sample / Display / Experience                                                    |
| **연관 Core/App** | cosmetics-seller-extension, cosmetics-supplier-extension, dropshipping-cosmetics |

이 Extension은 **Seller Mode를 "실제 매장에서 쓸 수 있는 수준"으로 끌어올리는 마지막 조각**에 해당한다.

---

## 2. 기능적 역할 재정의 (리팩토링 기준)

Seller Mode 전체 기능 중, 본 Extension이 책임져야 할 영역은 다음으로 **명확히 한정**한다.

### 본 Extension의 책임 영역

1. **샘플 인벤토리 관리**

   * 매장 보유 샘플 수량
   * 소모/보충 기록
2. **체험(Experience) 기록**

   * 샘플 제공 이력
   * 체험 유형
3. **진열(Display) 보조 정보**

   * Seller Extension의 Display 기능을 보완
4. **Sample → Order 전환 데이터**

   * 직접 주문 생성 ❌
   * 전환 지표 데이터 제공 ⭕

**주문·결제·정산은 절대 이 Extension의 책임이 아님.**

---

## 3. 현재 구현 상태에 대한 1차 판단 (추정 아님)

기존 Seller / Partner / Dropshipping Extension을 기준으로 볼 때,
본 Extension은 다음 상태일 가능성이 높다.

| 영역        | 판단                     |
| --------- | ---------------------- |
| 기본 구조     | 존재하더라도 skeleton 수준     |
| Entity    | 핵심 Entity 다수 부재 가능성 높음 |
| API       | 부분적이거나 미구현 가능성 높음      |
| lifecycle | 형식적 구현 또는 미구현          |
| Frontend  | 거의 없음 (정상적인 상태)        |

**중요:**
이 판단은 "문제"가 아니라,
**2차 리팩토링에서 가장 많은 신규 구현이 예정된 Extension이라는 의미**다.

---

## 4. 필수 Backend 도메인 (리팩토링 기준점)

2차 리팩토링에서 **반드시 존재해야 할 최소 도메인**은 아래와 같다.

### (1) SampleInventory

* sampleId
* productId
* sellerId
* quantity
* expiryAt
* createdAt / updatedAt

### (2) SampleUsageLog

* sampleId
* sellerId
* optionalCustomerRef
* experienceType
* usedAt
* converted (boolean)

### (3) DisplayItem (보조 엔티티)

* productId
* sellerId
* displayPosition
* shelfIndex
* memo

### (4) Counter / Metric Service

* sampleUsageCount
* sampleToOrderConversionCount
* 기간별 집계 가능 구조

이 데이터는 **Seller Extension KPI에 "입력값"으로만 제공**한다.

---

## 5. API 설계 기준 (예상 → 기준으로 전환)

이번 리팩토링에서는 아래 API가 **기준선(Baseline)** 이 된다.

```
GET  /api/v1/cosmetics-sample/samples
POST /api/v1/cosmetics-sample/samples

GET  /api/v1/cosmetics-sample/usage
POST /api/v1/cosmetics-sample/usage

GET  /api/v1/cosmetics-sample/display
POST /api/v1/cosmetics-sample/display
```

* 인증: Seller 기반
* Admin 전용 API ❌
* Partner 전용 API ❌ (Phase 3 이후)

---

## 6. lifecycle 기대 수준

본 Extension의 lifecycle은 **최소 수준만 요구**한다.

* install
  * 테이블 생성
* activate
  * 기본 샘플 타입 등록
* deactivate
  * 데이터 유지
* uninstall
  * soft delete 유지

과도한 자동화는 이번 리팩토링 대상 아님.

---

## 7. Frontend에 대한 명확한 입장

Frontend는 **이번 Audit의 평가 대상이 아니다.**

이 Extension은:

* API & 데이터 모델 완성
* Seller Extension에서 소비 가능한 구조 제공

까지만 책임진다.

UI는:

* Seller Extension 또는
* Phase 2 이후 별도 Work Order

에서 다룬다.

---

## 8. Cross-App Dependency 재정리 (중요)

| 연관 App                       | 관계 정의             |
| ---------------------------- | ----------------- |
| cosmetics-seller-extension   | KPI 입력값 제공자       |
| cosmetics-supplier-extension | 샘플 공급 정책 연계 (후순위) |
| dropshipping-cosmetics       | product 정보 참조     |
| cosmetics-partner-extension  | Phase 3 이후 연계     |

**Seller Extension이 '주도권'을 가진다.**
본 Extension은 철저히 **보조·입력 데이터 제공자**다.

---

## 9. 리팩토링 관점 GAP 요약

| 영역          | 상태        |
| ----------- | --------- |
| 데이터 모델      | 거의 신규 필요  |
| API         | 신규 설계 필요  |
| Seller 연동   | 구조 재정의 필요 |
| Supplier 연동 | 후순위       |
| Frontend    | 이번 범위 아님  |

### 결론

> **cosmetics-sample-display-extension은
> 이번 리팩토링 사이클에서
> "가장 많은 신규 구현이 예정된 Extension"이다.**

---

## 10. 다음 단계 (Full Audit 개시 조건)

다음 단계는 단순하다.

### cosmetics-sample-display-extension의 실제 소스 경로를 확인

예:

```
packages/...
apps/...
extensions/...
```

경로가 확인되는 즉시:

* 실제 파일 기준 Full Audit
* Seller Extension과의 중복 제거 포인트 확정
* 최소 구현 세트 정의
* 2차 리팩토링 Work Order 초안

까지 **한 번에 진행**한다.

---

### 정리 한 문장

> **이번 조사는 테스트를 위한 감사가 아니라,
> 다시 제대로 만들기 위한 '구조적 정리 선언'이다.**

---

*Created: 2025-12-17*
*Status: Preliminary Audit - Awaiting Path Confirmation*
