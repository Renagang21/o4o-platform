# WO-OPERATOR-GOVERNANCE-FREEZE-V1

## 1. 목적

본 문서는 O4O Platform 전 서비스에 적용되는
**Operator 거버넌스 구조 v1을 동결(FREEZE)** 하기 위한 기준 문서이다.

이 문서 이후:

* Operator 삭제 정책은 변경되지 않는다.
* Operator UI 기본 구조는 유지된다.
* Signal 기반 대시보드 UX는 표준이 된다.
* Hard delete는 금지된다.

---

## 2. Operator의 정의

### 2.1 역할 분류

| 구분       | 역할             |
| -------- | -------------- |
| Admin    | 구조/권한/기본값 관리   |
| Operator | 일상 운영/노출/상태 처리 |

원칙:

> Admin은 구조를 만들고, Operator는 상태를 관리한다.

---

## 3. 삭제 정책 (Hard Delete 금지)

### 3.1 전 서비스 공통 규칙

Operator / StoreMember / ServiceMember 삭제는:

```
repository.delete() 금지
```

대신:

```
isActive = false
deactivatedAt = timestamp
deactivatedBy = userId
```

### 3.2 재활성화 원칙

* UNIQUE 제약은 유지한다.
* 재등록 시 기존 비활성 레코드를 재활성화한다.
* 새로운 레코드를 생성하지 않는다.

---

## 4. Operator 관리 UI 표준

### 4.1 필수 요소

모든 서비스의 Operator 관리 화면은 다음을 포함해야 한다:

1. 통계 카드 (전체 수 / 활성 수 / 비활성 수)
2. 검색 기능
3. 역할 필터
4. "비활성 포함" 토글
5. 비활성화 버튼
6. 재활성화 버튼
7. 자기 자신 비활성화 방지

---

## 5. Signal 기반 Operator Dashboard 표준

모든 Operator 대시보드는 다음 구조를 따른다:

### 5.1 Hero Summary

* 전체 상태: good / warning / alert
* 3개 영역 dot indicator

### 5.2 Action Signal Cards (3개)

각 서비스 도메인에 맞는 3개 핵심 영역

| 서비스         | 3개 영역           |
| ----------- | --------------- |
| KPA         | 콘텐츠 / 포럼 / 사이니지 |
| GlycoPharm  | 스토어 / 포럼 / 콘텐츠  |
| Neture      | 콘텐츠 / 파트너 / 포럼  |
| K-Cosmetics | 매장 / 주문 / 운영자   |

### 5.3 Recent Activity (5건)

* 시간순 정렬
* 최대 5건
* 도메인 혼합 허용

---

## 6. Threshold 구조

### 6.1 기본 구조

```typescript
ThresholdRule {
  warning: number;
  alert: number;
}
```

### 6.2 기본값

```typescript
DEFAULT_THRESHOLD = { warning: 0, alert: 0 };
```

### 6.3 서비스별 확장 허용

각 서비스는 다음을 정의할 수 있다:

```typescript
SERVICE_THRESHOLDS: OperatorThresholdConfig
```

단, compute 함수의 기본 동작은 변경하지 않는다.

---

## 7. Platform Admin 접근 정책

| 서비스         | platform:admin 접근 |
| ----------- | ----------------- |
| KPA         | 격리 (차단)           |
| Neture      | 허용                |
| GlycoPharm  | 허용                |
| K-Cosmetics | 허용                |

이 정책은 v1에서 변경하지 않는다.

---

## 8. 데이터 감사 추적 원칙

Soft Deactivate는 반드시:

* 누가 (deactivatedBy)
* 언제 (deactivatedAt)
* 어떤 역할을
* 어떤 서비스에서

비활성화했는지 추적 가능해야 한다.

---

## 9. 금지 항목

다음은 금지된다:

* Hard delete 재도입
* Mock 기반 Operator 관리 UI
* Signal 로직의 서비스별 임의 복사
* Threshold 하드코딩 재도입

---

## 10. Freeze 선언

본 문서 이후:

> O4O Operator Governance 구조는 v1으로 고정된다.

변경이 필요한 경우:

```
WO-OPERATOR-GOVERNANCE-V2
```

로 별도 승격 작업을 통해서만 가능하다.

---

## Freeze 대상 서비스

* KPA-a (커뮤니티)
* KPA-b (데모 - 제거 예정)
* KPA-c (분회)
* GlycoPharm
* Neture
* K-Cosmetics

---

*Created: 2026-02-13*
*Status: FROZEN*
