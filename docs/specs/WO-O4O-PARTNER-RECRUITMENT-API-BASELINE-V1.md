# WO-O4O-PARTNER-RECRUITMENT-API-BASELINE-V1

## 파트너 모집 API 기준선 정의 (Baseline Documentation Only)

---

## 0. 작업 성격 선언

* 본 WO는 **기준선 문서화 작업**이다.
* **코드 구현, API 생성, DB 변경은 범위 밖(Out of Scope)** 이다.
* 이미 구현된 **파트너 모집 UI를 정당화/고정**하기 위한 기준점이다.

---

## 1. 목적

제품 단위 파트너 모집 화면에서 발생하는
**조회 / 신청 / 승인 / 반영** 흐름을
API/상태/책임 관점에서 명확히 정의한다.

> 본 기준선은
> 이후 모든 파트너 관련 구현 WO의 **참조 원본**이다.

---

## 2. 현재 전제 (Context)

* 파트너 모집 단위: **제품**
* 파트너 신청 시작점: 판매자 대시보드 (몰 보유자)
* Neture의 역할: 파트너 모집 **허브(Hub)**
* 파트너는:
  * Neture에 직접 신청 X
  * 모집 공고를 보고 **참여 의사 표시 O**

---

## 3. 핵심 엔티티 정의 (개념 기준)

### 3-1. PartnerRecruitment (모집 공고)

| 항목 | 설명 |
|------|------|
| productId | 모집 대상 제품 |
| sellerId | 모집 주체 판매자 |
| shopUrl | 판매자 몰 URL |
| commissionRate | 파트너 수수료 |
| status | 모집중 / 마감 |
| createdAt | 모집 시작 시점 |

> **제품 x 판매자 단위로 1개만 존재** (중복 모집 X)

### 3-2. PartnerApplication (파트너 신청)

| 항목 | 설명 |
|------|------|
| recruitmentId | 모집 공고 참조 |
| partnerId | 신청 파트너 |
| status | 신청 / 승인 / 거절 |
| appliedAt | 신청 시점 |

> 승인 시 **파트너 대시보드에 자동 등록**

---

## 4. API 책임 기준선 (설계 계약)

### 4-1. 파트너 모집 목록 조회 (읽기)

```
GET /api/v1/neture/partner/recruitments
```

**반환**: 제품 기반 리스트, UI 컬럼 1:1 매핑 가능해야 함

### 4-2. 파트너 신청

```
POST /api/v1/neture/partner/applications
```

**전제**: 파트너 인증 필요, 동일 파트너 중복 신청 X

### 4-3. 판매자 승인 / 거절

```
POST /api/v1/neture/partner/applications/:id/approve
POST /api/v1/neture/partner/applications/:id/reject
```

**효과**: 승인 시 파트너 대시보드에 제품 자동 등록

---

## 5. 상태 기준선

### 5-1. 모집 상태 (Recruitment Status)

| 상태 | 의미 |
|------|------|
| 모집중 | 파트너 신청 가능 |
| 마감 | 신규 신청 불가 |

### 5-2. 신청 상태 (Application Status)

| 상태 | 의미 |
|------|------|
| 신청 | 파트너 신청 완료 |
| 승인 | 파트너로 등록 |
| 거절 | 신청 반려 |

---

## 6. 역할별 책임 경계

### 판매자
* 제품 단위 파트너 모집 생성
* 신청 승인 / 거절

### 파트너
* 모집 공고 조회
* 참여 신청

### Neture
* 모집/신청 정보 집결
* 상태 관리
* 승인 이벤트 중계

### 서비스
* 파트너 결과 소비자
* 직접 신청/모집 X

---

## 7. UI 매핑 선언

본 기준선은 다음 UI와 1:1 대응한다.

* `PartnershipRequestListPage.tsx`
* 컬럼: 제품 / 제조사 / 소비자가 / 수수료 / 요청 업체 / 몰 URL / 신청 버튼

> UI 수정 없이 API만 붙일 수 있어야 한다.

---

## 8. 비범위 선언 (Out of Scope)

* 파트너 정산 로직
* 수수료 변경 이력
* 파트너 등급/랭킹
* 알림 시스템

---

## 9. 완료 선언 조건

- [x] 제품 단위 파트너 모집 개념 고정
- [x] API 책임 경계 정의
- [x] 상태 모델 명확화
- [x] UI-API 계약 확정

> **본 WO는 기준선 문서로 완료(Completed)**

---

## 10. 다음 자연스러운 단계 (참고)

* **WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1**
* **WO-O4O-PARTNER-APPLICATION-APPROVAL-UX-V1**

---

*Created: 2026-02-01*
*Status: Completed (Baseline)*
