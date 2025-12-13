# Yaksa Service Phase 19 - Pre-Investigation Report

**작성일**: 2025-12-13
**Phase**: 19 사전조사
**전제**: Phase 18 (Yaksa RPA 신고서 자동화) 완료

---

## 1. 조사 개요

### 1.1 조사 목적
- "무엇을 자동화할 수 있는지"가 아닌 **"어디까지 자동화해도 되는지"** 명확화
- Phase 19 진입 가능 여부 결정

### 1.2 조사 대상 패키지
| 패키지 | 역할 |
|--------|------|
| forum-yaksa | 포럼 확장, RPA 트리거 수집 |
| reporting-yaksa | 신고서 생성/제출 |
| membership-yaksa | 회원/면허 관리 |
| annualfee-yaksa | 연회비 청구/납부 |
| lms-yaksa | 교육 이수/학점 관리 |

---

## 2. 조사 1: Yaksa 행정 상태(State) 맵핑

### 2.1 전체 상태 전이 테이블

#### forum-yaksa
| Entity | 상태 | 전이 조건 | 자동 전이 | 리스크 |
|--------|------|-----------|-----------|--------|
| CommunityMember.role | owner | 커뮤니티 생성 시 | 자동 | Low |
| CommunityMember.role | admin | owner 지정 | 수동 | Medium |
| CommunityMember.role | member | 가입 시 | 자동 | Low |

#### reporting-yaksa (Phase 18)
| Entity | 상태 | 전이 조건 | 자동 전이 | 리스크 |
|--------|------|-----------|-----------|--------|
| YaksaReport.status | DRAFT | RPA 트리거 감지 | **자동** | Low |
| YaksaReport.status | REVIEWED | 운영자 검토 | 수동 | Low |
| YaksaReport.status | APPROVED | 운영자 승인 | **수동** | **High** |
| YaksaReport.status | REJECTED | 운영자 반려 | 수동 | Medium |
| YaksaReport.status | SUBMITTED | 제출 완료 | 반자동 | Medium |

#### membership-yaksa
| Entity | 상태 | 전이 조건 | 자동 전이 | 리스크 |
|--------|------|-----------|-----------|--------|
| Member.isVerified | true/false | 면허 검증 완료 | **수동** | **High** |
| Member.isActive | true/false | 회원 상태 변경 | 수동 | High |
| Verification.status | pending | 검증 요청 | 자동 | Low |
| Verification.status | approved | 관리자 승인 | **수동** | **High** |
| Verification.status | rejected | 관리자 반려 | 수동 | Medium |
| Verification.status | expired | 유효기간 경과 | **자동 가능** | Low |
| LicenseVerification.status | pending | 검증 요청 | 자동 | Low |
| LicenseVerification.status | processing | API 호출 중 | 자동 | Low |
| LicenseVerification.status | verified | 검증 성공 | 반자동 | Medium |
| LicenseVerification.status | failed | 검증 실패 | 자동 | Low |
| LicenseVerification.status | invalid | 무효 면허 | 자동 | Medium |
| LicenseVerification.status | expired | 면허 만료 | **자동 가능** | Low |
| LicenseVerification.status | error | 시스템 오류 | 자동 | Low |

#### annualfee-yaksa
| Entity | 상태 | 전이 조건 | 자동 전이 | 리스크 |
|--------|------|-----------|-----------|--------|
| FeeInvoice.status | draft | 임시 저장 | 수동 | Low |
| FeeInvoice.status | pending | 발행 대기 | 자동 | Low |
| FeeInvoice.status | sent | 발송 완료 | **자동 가능** | Low |
| FeeInvoice.status | partial | 부분 납부 | **자동** | Low |
| FeeInvoice.status | paid | 납부 완료 | **자동** | Low |
| FeeInvoice.status | overdue | 연체 | **자동 가능** | Low |
| FeeInvoice.status | cancelled | 취소 | 수동 | Medium |
| FeeInvoice.status | exempted | 면제 | 수동 | Medium |
| FeePayment.status | pending | 결제 대기 | 자동 | Low |
| FeePayment.status | completed | 결제 완료 | **자동** | Low |
| FeePayment.status | failed | 결제 실패 | 자동 | Low |
| FeePayment.status | refunded | 환불 | **수동** | **High** |
| FeePayment.status | cancelled | 취소 | 수동 | Medium |
| FeeExemption.status | pending | 신청 대기 | 자동 | Low |
| FeeExemption.status | approved | 승인 | **수동** | **High** |
| FeeExemption.status | rejected | 반려 | 수동 | Medium |
| FeeExemption.status | expired | 만료 | **자동 가능** | Low |
| FeeSettlement.status | pending | 정산 대기 | 자동 | Low |
| FeeSettlement.status | calculating | 계산 중 | 자동 | Low |
| FeeSettlement.status | confirmed | 확정 | **수동** | **High** |
| FeeSettlement.status | remitted | 송금 완료 | **수동** | **High** |
| FeeSettlement.status | completed | 완료 | 반자동 | Medium |

#### lms-yaksa
| Entity | 상태 | 전이 조건 | 자동 전이 | 리스크 |
|--------|------|-----------|-----------|--------|
| CourseAssignment.status | pending | 과정 배정 | 자동 | Low |
| CourseAssignment.status | in_progress | 수강 시작 | **자동** | Low |
| CourseAssignment.status | completed | 이수 완료 | **자동** | Low |
| CourseAssignment.status | expired | 기한 만료 | **자동 가능** | Low |
| CourseAssignment.status | cancelled | 취소 | 수동 | Low |
| CreditRecord.isVerified | true/false | 학점 검증 | 수동 | Medium |

### 2.2 Phase 19 자동화 가능 상태 목록

| 패키지 | 상태 전이 | 자동화 권장 |
|--------|----------|-------------|
| reporting-yaksa | → DRAFT | ✅ (이미 구현) |
| membership-yaksa | Verification → expired | ✅ |
| membership-yaksa | LicenseVerification → expired | ✅ |
| annualfee-yaksa | FeeInvoice → sent | ✅ |
| annualfee-yaksa | FeeInvoice → partial/paid | ✅ (이미 구현) |
| annualfee-yaksa | FeeInvoice → overdue | ✅ |
| annualfee-yaksa | FeeExemption → expired | ✅ |
| lms-yaksa | CourseAssignment → in_progress | ✅ (이미 구현) |
| lms-yaksa | CourseAssignment → completed | ✅ (이미 구현) |
| lms-yaksa | CourseAssignment → expired | ✅ |

---

## 3. 조사 2: 정기 자동화(Scheduler) 후보 식별

### 3.1 자동화 승인 리스트

| 업무 | 주기 | 영향 범위 | 사람 개입 | 승인 |
|------|------|-----------|-----------|------|
| 연체 상태 자동 전환 | 일간 | 개별 청구서 | 불필요 | ✅ |
| 리마인더 발송 (1차/2차/최종) | 일간 | 개별 회원 | 불필요 | ✅ |
| 검증 만료 상태 전환 | 일간 | 개별 회원 | 불필요 | ✅ |
| 과정 기한 만료 처리 | 일간 | 개별 배정 | 불필요 | ✅ |
| 감면 유효기간 만료 처리 | 일간 | 개별 감면 | 불필요 | ✅ |
| 신고서 제출 실패 건 재시도 | 일간 | 승인된 신고서 | 불필요 | ✅ |
| 연간 청구서 일괄 생성 | 연간 | 전체 회원 | **필요** | ⚠️ 반자동 |
| 월간 정산 계산 | 월간 | 조직 단위 | **필요** | ⚠️ 반자동 |

### 3.2 자동화 제외 리스트 (명시적)

| 업무 | 제외 사유 | 대안 |
|------|----------|------|
| 회원 자격 자동 정지 | 법적 분쟁 가능성 | 경고 알림 후 수동 처리 |
| 면허 검증 자동 승인 | 약사회 책임 문제 | 검증 결과 제시, 수동 확정 |
| 감면 자동 승인 | 재정 영향 | 자동 심사, 수동 최종 승인 |
| 정산 자동 확정/송금 | 금융 책임 | 계산 자동화, 확정 수동 |
| 신고서 자동 승인 | 행정 책임 | DRAFT 자동, 승인 수동 |

---

## 4. 조사 3: "사람 개입 지점" 명확화

### 4.1 Human-in-the-Loop 필수 지점

#### 법적 책임 발생 지점
| 지점 | 상태 전이 | 책임 주체 | 필수 확인 항목 |
|------|----------|-----------|---------------|
| 신고서 승인 | REVIEWED → APPROVED | 약사회 | 내용 정확성, 회원 확인 |
| 외부 제출 | APPROVED → SUBMITTED | 약사회 | 제출 대상, 첨부파일 |
| 회원 자격 정지 | isActive: true → false | 약사회 | 사유, 절차 준수 |
| 면허 검증 확정 | verified → Member.isVerified | 관리자 | API 결과 검토 |

#### 재정 영향 지점
| 지점 | 상태 전이 | 금액 영향 | 필수 확인 항목 |
|------|----------|-----------|---------------|
| 감면 승인 | pending → approved | 감면 금액 | 증빙, 정책 부합 |
| 환불 처리 | completed → refunded | 환불 금액 | 사유, 계좌 정보 |
| 정산 확정 | calculating → confirmed | 정산 금액 | 내역 검토, 분배율 |
| 송금 처리 | confirmed → remitted | 송금 금액 | 계좌, 금액 확인 |

#### 분쟁 가능성 지점
| 지점 | 위험 요소 | 대응 방안 |
|------|----------|----------|
| 회원 가입 거부 | 차별 시비 | 명확한 기준 문서화, 수동 처리 |
| 회원 자격 박탈 | 법적 소송 | 경고 → 청문 → 결정 절차 |
| 면허 무효 판정 | 오판 책임 | 복수 검증, 수동 최종 확정 |
| 신고서 반려 | 민원 제기 | 사유 명시, 재신청 안내 |

### 4.2 Phase 19/20 자동화 금지 영역

```
┌─────────────────────────────────────────────────────────┐
│                  자동화 금지 영역                        │
├─────────────────────────────────────────────────────────┤
│ 1. 승인/반려 판단 (신고서, 감면, 검증)                   │
│ 2. 외부 제출 최종 확인                                   │
│ 3. 회원 자격 변경 (정지, 박탈, 복원)                     │
│ 4. 정산 확정 및 송금                                     │
│ 5. 환불 처리                                             │
│ 6. 면허 검증 최종 판정                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 조사 4: 통합 행정 대시보드 요구 정리

### 5.1 매일 확인 필수 항목

| 위젯 | 데이터 소스 | 긴급도 기준 |
|------|------------|-------------|
| 승인 대기 신고서 | reporting-yaksa | 7일 이상 대기 시 경고 |
| 자동화 실패 큐 | 전체 | 즉시 확인 |
| 면허 검증 대기 | membership-yaksa | 3일 이상 대기 시 경고 |
| 감면 승인 대기 | annualfee-yaksa | 5일 이상 대기 시 경고 |
| 정산 확정 대기 | annualfee-yaksa | 월말 3일 전 경고 |

### 5.2 긴급도 판단 기준

| 레벨 | 조건 | 표시 색상 |
|------|------|----------|
| Critical | 제출 실패, 시스템 오류 | 🔴 Red |
| High | 7일 이상 미처리, 기한 임박 | 🟠 Orange |
| Medium | 3-7일 미처리 | 🟡 Yellow |
| Normal | 정상 대기 | 🟢 Green |

### 5.3 조직별 시야 차이

| 역할 | 시야 범위 | 주요 관심사 |
|------|----------|-------------|
| 본회 | 전체 통계 | 전국 수금율, 정산 현황 |
| 지부 | 지부 + 소속 분회 | 지부 정산, 분회 실적 |
| 분회 | 해당 분회 | 회원 현황, 납부율, 미납자 |

### 5.4 Phase 20 대시보드 위젯 목록

```
┌──────────────────────────────────────────────────────────────┐
│                    Yaksa 통합 행정 대시보드                    │
├─────────────────────┬────────────────────┬───────────────────┤
│  📋 승인 대기 신고서  │  💳 연체/미납 현황   │  ⚠️ 자동화 실패 큐  │
│  - DRAFT: 12건      │  - 연체: 45명       │  - 제출 실패: 3건  │
│  - REVIEWED: 5건    │  - 장기미납: 12명   │  - 매칭 실패: 7건  │
├─────────────────────┼────────────────────┼───────────────────┤
│  🔍 면허 검증 대기   │  📊 정산 현황       │  📚 LMS 미이수자   │
│  - 신규: 8건        │  - 계산중: 3건      │  - 기한 임박: 23명 │
│  - 재검증: 2건      │  - 확정대기: 1건    │  - 기한 만료: 5명  │
├─────────────────────┴────────────────────┴───────────────────┤
│  💰 감면 승인 대기                                            │
│  - 고령 감면: 5건  - 휴업 감면: 3건  - 특별 감면: 2건         │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 조사 5: 외부 연계 "보류 원칙" 확인

### 6.1 API 연계 vs 파일 제출 비교

| 항목 | API 연계 | 파일 제출 (현재) |
|------|---------|-----------------|
| 즉시성 | 실시간 | 일괄 처리 |
| 신뢰성 | 외부 API 의존 | 내부 통제 |
| 장애 대응 | 외부 장애 시 중단 | 수동 전환 가능 |
| 책임 소재 | 공유 | 명확 (제출자) |
| 구현 비용 | 높음 | 낮음 |
| 유지보수 | API 변경 대응 필요 | 안정적 |

### 6.2 외부 API 연계 보류 사유

```
┌─────────────────────────────────────────────────────────────┐
│              외부 API 연계 보류 사유 (Phase 20까지)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. 책임 주체 불명확                                         │
│    - API 호출 실패 시 재시도 정책 미정의                    │
│    - 부분 실패 시 롤백 전략 부재                            │
│                                                             │
│ 2. 외부 시스템 의존성                                       │
│    - 정부/협회 API SLA 미확인                               │
│    - 장애 시 대체 경로 미구축                               │
│                                                             │
│ 3. 보안 및 인증                                             │
│    - API Key 관리 체계 미수립                               │
│    - 감사 로그 요구사항 미정의                              │
│                                                             │
│ 4. 운영 준비도                                              │
│    - 내부 워크플로우 안정화 우선                            │
│    - 모니터링/알림 체계 구축 필요                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Phase 21 이후 검토 항목

| 항목 | 검토 내용 | 선행 조건 |
|------|----------|----------|
| 약사회 API | 면허 검증 실시간 연동 | API 문서 확보, 테스트 환경 |
| 건보심평원 | 면허 진위 확인 | 계약 체결, 인증서 발급 |
| 보건복지부 | 신고서 전자 제출 | 표준 연계 규격 확인 |
| 금융기관 | 자동 이체/가상계좌 | PG사 계약, 보안 심사 |

---

## 7. 결론: Phase 19 진입 가능 여부

### 7.1 평가 요약

| 평가 항목 | 상태 | 비고 |
|----------|------|------|
| 상태 맵핑 완료 | ✅ | 5개 패키지, 30+ 상태 식별 |
| 자동화 경계 정의 | ✅ | 승인 리스트/제외 리스트 명확화 |
| Human-in-the-Loop 정의 | ✅ | 6개 금지 영역 지정 |
| 대시보드 요구사항 | ✅ | 6개 핵심 위젯 정의 |
| 외부 연계 보류 근거 | ✅ | 4가지 보류 사유 문서화 |

### 7.2 최종 결론

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ✅ Phase 19 진입 가능                                     │
│                                                             │
│   권고 범위:                                                │
│   - 정기 스케줄러 (연체, 만료, 리마인더)                    │
│   - 제출 실패 재시도                                        │
│   - 통합 대시보드 기초 구현                                 │
│                                                             │
│   제외 범위:                                                │
│   - 승인/반려 자동 판단                                     │
│   - 외부 API 연계                                           │
│   - 정산 자동 확정/송금                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Phase 19 권장 작업 목록

1. **스케줄러 인프라 구축**
   - Cron Job 설정 (일간/주간/월간)
   - 실행 로그 및 모니터링

2. **상태 자동 전이 구현**
   - 연체 상태 자동 전환
   - 검증/감면/과정 만료 처리
   - 리마인더 자동 발송

3. **재시도 로직 구현**
   - 신고서 제출 실패 재시도
   - CSV 매칭 실패 재처리

4. **통합 대시보드 기초**
   - 핵심 위젯 6개 구현
   - 조직별 필터링

---

**작성자**: Claude Code
**검토 상태**: 사전조사 완료, Phase 19 Work Order 대기
