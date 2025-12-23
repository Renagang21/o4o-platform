# Shared Module Candidates

> 공통화 후보 식별 문서 (식별만, 실행 금지)

**Version:** 1.1  
**Date:** 2025-12-23  
**Status:** Identification + Priority (Phase 6-A Complete)

---

## Purpose

이 문서는 O4O 플랫폼의 공통화 가능한 책임/로직/패턴을 **식별**하고 **우선순위**를 정한다.

**중요:** 이 문서는 실행 계획이 아니며, 어떠한 코드 변경도 발생하지 않는다.

---

## 0. Tier-Based Priority (Phase 6-A)

### Tier 1 — Safe & High Value (우선 검토 대상)

| ID | Candidate | 우선 검토 이유 | 금지 사항 |
|----|-----------|---------------|----------|
| #9 | File Upload/Storage | 정책 주입 패턴 적용 가능, 즉시 가치 창출 | 지금 구현 금지 |
| #11 | External API Client Pattern | 정책 리스크 없음, 기술 인프라 | 지금 구현 금지 |
| #10 | Notification System | 공통 엔진 + 정책 주입 패턴 적합 | 지금 구현 금지 |
| #3 | Design System | design-system-cosmetics 표준화 검토 | 지금 통합 금지 |

### Tier 2 — Medium Risk / High Value (조건부 검토)

| ID | Candidate | 우선 검토 이유 | 금지 사항 |
|----|-----------|---------------|----------|
| #2 | Permission Check Pattern | 인터페이스 분리 후 가능 | 즉시 공통화 금지 |
| #8 | Commission Calculation | 계산 엔진만 공통화 가능 | 정책 통합 금지 |

### Tier 3 — Study Only (분석 전용, 실행 금지)

| ID | Candidate | 우선 검토 이유 | 금지 사항 |
|----|-----------|---------------|----------|
| #7 | Settlement Pattern | 패턴 분석만, 코드 공통화 부적합 | 공통화 시도 금지 |

### Already Common (유지 관리)

| ID | Candidate | 상태 | 비고 |
|----|-----------|------|------|
| #1 | Auth Client Library | 공통화 완료 | Infrastructure Core |
| #4 | Appearance/Theme System | 공통화 완료 | Infrastructure Core |
| #5 | Block System | 공통화 완료 | Infrastructure Core |
| #6 | CPT Registry | 공통화 완료 | Infrastructure Core |

---

## 1. 식별 기준 (Identification Criteria)

다음 조건을 만족하는 경우 공통화 후보로 식별한다:

### 기준 A: 다중 서비스 반복
- 2개 이상 서비스에서 동일/유사 책임 반복
- 코드 중복률 > 70%

### 기준 B: 동시 변경 패턴
- 버그 수정/정책 변경이 복수 위치에 동시 발생
- 변경 이력에서 동일 커밋에 여러 서비스 수정

### 기준 C: 서비스 중립성
- 서비스 정책과 무관한 범용 책임
- 비즈니스 로직이 아닌 기술적 책임

---

## 2. 후보 목록 (Candidate List)

### 2.1 인증/권한 관련

#### Candidate #1: Auth Client Library
- **현재 위치:** `packages/auth-client`, `packages/auth-context`
- **반복 사유:** 모든 서비스에서 동일한 인증 로직 사용
- **공통화 가능성:** 높음 (이미 공통화됨)
- **정책 리스크:** 없음
- **의존성 리스크:** 없음
- **비고:** 이미 infrastructure core로 공통화 완료

#### Candidate #2: Permission Check Pattern
- **현재 위치:** 각 서비스 앱의 Controller/Guard
- **반복 사유:** 권한 체크 로직이 유사한 패턴으로 반복
- **공통화 가능성:** 중간
- **정책 리스크:** 있음 (서비스별 권한 정책 상이)
- **의존성 리스크:** 있음 (organization-core 의존)
- **비고:** 서비스별 정책 차이로 완전 공통화 어려움

### 2.2 UI/UX 관련

#### Candidate #3: Design System
- **현재 위치:** `packages/ui`, `packages/design-system-cosmetics`
- **반복 사유:** UI 컴포넌트가 서비스별로 재구현됨
- **공통화 가능성:** 높음
- **정책 리스크:** 없음
- **의존성 리스크:** 없음
- **비고:** design-system-cosmetics가 신규 표준 후보

#### Candidate #4: Appearance/Theme System
- **현재 위치:** `packages/appearance-system`
- **반복 사유:** 테마 관리가 서비스별로 필요
- **공통화 가능성:** 높음 (이미 공통화됨)
- **정책 리스크:** 없음
- **의존성 리스크:** 없음
- **비고:** 이미 infrastructure core로 공통화 완료

### 2.3 CMS/Content 관련

#### Candidate #5: Block System
- **현재 위치:** `packages/block-core`, `packages/block-renderer`
- **반복 사유:** 블록 에디터가 여러 서비스에서 사용
- **공통화 가능성:** 높음 (이미 공통화됨)
- **정책 리스크:** 없음
- **의존성 리스크:** cms-core 의존
- **비고:** 이미 infrastructure core로 공통화 완료

#### Candidate #6: CPT Registry
- **현재 위치:** `packages/cpt-registry`
- **반복 사유:** Custom Post Type 등록이 CMS 사용 서비스에서 필요
- **공통화 가능성:** 높음 (이미 공통화됨)
- **정책 리스크:** 없음
- **의존성 리스크:** cms-core 의존
- **비고:** 이미 infrastructure core로 공통화 완료

### 2.4 비즈니스 로직 관련

#### Candidate #7: Settlement Pattern
- **현재 위치:** 
  - `dropshipping-core` (SettlementService)
  - `pharmaceutical-core` (PharmaSettlementService)
  - `ecommerce-core` (간접적)
- **반복 사유:** 정산 로직이 유사한 패턴으로 반복
- **공통화 가능성:** 낮음
- **정책 리스크:** 있음 (서비스별 정산 정책 상이)
- **의존성 리스크:** 있음 (각 Core에 강결합)
- **비고:** 패턴은 유사하나 정책 차이로 공통화 부적합

#### Candidate #8: Commission Calculation
- **현재 위치:**
  - `dropshipping-core` (CommissionService)
  - `partnerops` (파트너 커미션)
  - `cosmetics-partner-extension` (인플루언서 커미션)
- **반복 사유:** 커미션 계산 로직 반복
- **공통화 가능성:** 중간
- **정책 리스크:** 있음 (커미션율, 정산 주기 상이)
- **의존성 리스크:** 있음
- **비고:** 계산 엔진은 공통화 가능, 정책은 서비스별 유지

### 2.5 데이터 관리 관련

#### Candidate #9: File Upload/Storage
- **현재 위치:** 각 서비스 앱에서 개별 구현
- **반복 사유:** 파일 업로드 로직이 반복됨
- **공통화 가능성:** 높음
- **정책 리스크:** 있음 (파일 크기, 타입 제한 서비스별 상이)
- **의존성 리스크:** 낮음
- **비고:** 공통 인터페이스 + 서비스별 정책 주입 패턴 권장

#### Candidate #10: Notification System
- **현재 위치:** 
  - `yaksa-scheduler` (알림 기능)
  - 각 서비스에서 개별 구현
- **반복 사유:** 알림 발송 로직 반복
- **공통화 가능성:** 높음
- **정책 리스크:** 있음 (알림 채널, 템플릿 서비스별 상이)
- **의존성 리스크:** 중간
- **비고:** 공통 알림 엔진 후보

### 2.6 Integration 관련

#### Candidate #11: External API Client Pattern
- **현재 위치:** 
  - `supplier-connector`
  - 각 서비스의 외부 연동
- **반복 사유:** HTTP 클라이언트, 재시도, 에러 처리 패턴 반복
- **공통화 가능성:** 높음
- **정책 리스크:** 없음
- **의존성 리스크:** 낮음
- **비고:** HTTP 클라이언트 래퍼 공통화 권장

---

## 3. 비후보 (Non-Candidates)

다음은 의도적으로 서비스 전용으로 유지해야 하는 책임:

### 3.1 서비스 Core 로직
- **dropshipping-core의 Order Relay 워크플로우**
  - 이유: 드롭쉬핑 비즈니스 로직 고유
  
- **pharmaceutical-core의 라이선스 검증**
  - 이유: 의약품 규제 고유

- **membership-yaksa의 회원 인증**
  - 이유: 약사 조직 정책 고유

### 3.2 서비스별 Extension
- **모든 Extension 앱** (cosmetics-*, yaksa-*, 등)
  - 이유: 서비스 특화가 존재 목적

### 3.3 도메인 Entity
- **각 Core의 Entity** (PharmaProduct, EcommerceOrder, 등)
  - 이유: 도메인 모델은 서비스 고유

---

## 4. 리스크 분석

### 4.1 정책 리스크가 높은 후보
- Settlement Pattern (#7)
- Commission Calculation (#8)
- Permission Check Pattern (#2)

**권장:** 공통화 시 정책 주입 패턴 필수

### 4.2 의존성 리스크가 높은 후보
- Permission Check Pattern (#2)
- Commission Calculation (#8)

**권장:** 인터페이스 분리 후 공통화

### 4.3 안전한 후보
- Design System (#3)
- File Upload/Storage (#9)
- External API Client Pattern (#11)
- Notification System (#10)

**권장:** 우선 공통화 검토 대상

---

## 5. 다음 단계 가이드 (Phase 6-A Updated)

### Tier별 다음 단계

#### Tier 1 후보 (Safe & High Value)
- **Phase 6-B 대상**: 단일 후보 사전 영향 분석
- **검토 순서**: #9 → #11 → #10 → #3
- **조건**: 별도 Work Order 필요

#### Tier 2 후보 (Medium Risk)
- **추가 조건 충족 시** Phase 6-B 진입
- **필수 선행 작업**: 인터페이스 설계, 정책 분리 방안
- **조건**: Tier 1 완료 후 검토

#### Tier 3 후보 (Study Only)
- **분석 전용**: 패턴 문서화만
- **실행 금지**: 코드 공통화 시도 금지
- **목적**: 설계 패턴 학습

### 공통화 실행 전 필수 확인
1. 서비스별 정책 차이 분석
2. 의존성 그래프 영향 분석
3. 마이그레이션 비용 산정
4. 롤백 계획 수립

### 실행 시점
**Phase 6-B 이후 별도 Work Order로만 실행 가능**

---

## 6. 통계

| Category | Count |
|----------|-------|
| 총 후보 | 11 |
| 공통화 가능성 높음 | 7 |
| 공통화 가능성 중간 | 2 |
| 공통화 가능성 낮음 | 2 |
| 이미 공통화됨 | 5 |
| 정책 리스크 있음 | 5 |
| 의존성 리스크 있음 | 4 |

---

## 7. 결론

### 주요 발견
1. **Infrastructure Core 성공**: 5개 후보가 이미 공통화되어 잘 작동 중
2. **비즈니스 로직 주의**: Settlement, Commission 등은 정책 차이로 공통화 어려움
3. **안전한 후보 존재**: Design System, File Upload, API Client 등은 공통화 적합

### 권장 사항
- **즉시 실행 금지**: 모든 후보는 Phase 6 이후 검토
- **우선순위**: 안전한 후보(#3, #9, #11, #10)부터 검토
- **정책 분리**: 공통 엔진 + 서비스별 정책 주입 패턴 권장

---

*Version: 1.1*  
*Last Updated: 2025-12-23*  
*Phase: 6-A Complete*  
*Status: Identification + Priority - No Implementation*
