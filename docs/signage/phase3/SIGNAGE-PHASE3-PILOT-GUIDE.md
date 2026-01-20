# Signage Phase 3 Pilot Guide

## Work Order: WO-SIGNAGE-PHASE3-PILOT

**Status:** Ready for Execution
**Date:** 2026-01-20
**Phase:** 3 – Pilot (Field Validation)

---

## 1. Pilot 목적

Phase 3 Pilot의 목적은 **실제 매장 환경에서 운영 가능성과 수익 가능성을 동시에 검증**하는 것입니다.

### 검증 영역

| 영역 | 검증 항목 |
|------|----------|
| 운영 | 콘텐츠 생성·배포·편집이 매장 흐름에 자연스러운가 |
| 기술 | Player/오프라인/권한/병합 규칙이 안정적인가 |
| 수익 | Seller 캠페인이 측정 가능한 KPI를 만들어내는가 |

---

## 2. Pilot 구성

### 2.1 참여 Extension

| Extension | 역할 | Force |
|-----------|------|-------|
| Pharmacy | HQ 중앙 통제 콘텐츠 | ✅ 지원 |
| Cosmetics | 브랜드/트렌드 콘텐츠 | ❌ |
| Seller | 광고/캠페인 콘텐츠 + Metrics | ❌ |

### 2.2 참여 역할

| 역할 | 책임 |
|------|------|
| Admin | Seller 승인 워크플로우, 시스템 설정 |
| Operator | Global 콘텐츠 제작/관리 |
| Store | Clone/편집/스케줄 운영 |
| Partner | Seller 콘텐츠 등록/캠페인 관리 |

### 2.3 대상 매장

Pilot 대상 매장 선정 기준:
- 안정적인 네트워크 환경
- 협조적인 매장 관리자
- 다양한 콘텐츠 활용 의지
- 피드백 제공 가능

---

## 3. Pilot 시나리오

### Scenario 1: Global Content 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Operator가 Global 콘텐츠 생성                       │
│  ├── Pharmacy-HQ Force 콘텐츠 (필수 건강 안내)               │
│  ├── Cosmetics Brand 콘텐츠 (신제품 프로모션)                │
│  └── Seller 캠페인 콘텐츠 (광고)                            │
├─────────────────────────────────────────────────────────────┤
│  Step 2: Store에서 Global Content 조회                      │
│  ├── Force 콘텐츠: 자동 포함 (삭제 불가)                     │
│  ├── Non-Force 콘텐츠: Clone 선택                           │
│  └── Seller 콘텐츠: 캠페인 기간 내만 표시                    │
├─────────────────────────────────────────────────────────────┤
│  Step 3: Player에서 재생                                    │
│  ├── 병합 순서 적용                                         │
│  ├── Metrics 이벤트 기록 (Seller 콘텐츠)                     │
│  └── 오프라인 시 캐시 재생                                  │
└─────────────────────────────────────────────────────────────┘
```

### Scenario 2: Store 운영 검증

| 작업 | 예상 결과 | 확인 |
|------|----------|------|
| Clone 실행 | Store 로컬 콘텐츠 생성 | □ |
| Clone 삭제 | 정상 삭제 | □ |
| Force 삭제 시도 | 에러 발생 (삭제 불가) | □ |
| 순서 조정 | Player에 반영 | □ |
| 로컬 편집 | 원본 영향 없음 | □ |

### Scenario 3: Seller 캠페인 검증

| 작업 | 예상 결과 | 확인 |
|------|----------|------|
| 캠페인 생성 (pending) | Admin 승인 대기 | □ |
| 캠페인 승인 | status → approved → active | □ |
| 캠페인 기간 전 | Store에 미노출 | □ |
| 캠페인 기간 중 | Store에 노출, Metrics 수집 | □ |
| 캠페인 기간 후 | Store에 미노출 | □ |

### Scenario 4: Player 검증

| 작업 | 예상 결과 | 확인 |
|------|----------|------|
| 정상 재생 | 병합 순서대로 재생 | □ |
| 오프라인 전환 | 캐시된 콘텐츠 재생 | □ |
| 온라인 복구 | 오프라인 Metrics 전송 | □ |
| Force 콘텐츠 | 항상 포함 | □ |

---

## 4. KPI 측정 프레임워크

### 4.1 운영 KPI

| 지표 | 정의 | 목표 |
|------|------|------|
| 매장 채택률 | Clone한 매장 / 전체 매장 | ≥ 50% |
| 콘텐츠 교체 주기 | 평균 콘텐츠 변경 간격 | 7일 이내 |
| Force 유지율 | Force 콘텐츠 삭제 시도 차단율 | 100% |
| Store 활성률 | 주 1회 이상 접속 매장 | ≥ 70% |

### 4.2 수익 KPI (Seller)

| 지표 | 정의 | 계산 |
|------|------|------|
| 총 노출 수 | Impression 이벤트 합계 | SUM(impressions) |
| 총 클릭 수 | Click 이벤트 합계 | SUM(clicks) |
| CTR | 클릭률 | clicks / impressions * 100 |
| QR 스캔 수 | QR scan 이벤트 합계 | SUM(qr_scans) |
| 영상 완료율 (VTR) | 완료 / 시작 | video_completes / video_starts * 100 |
| 캠페인 ROI | 성과 / 예산 | (metrics value) / budget |

### 4.3 기술 KPI

| 지표 | 정의 | 목표 |
|------|------|------|
| API 응답 시간 | 평균 응답 시간 | < 500ms |
| 오류율 | 에러 응답 / 전체 요청 | < 1% |
| Player 안정성 | 비정상 종료 빈도 | 0건 |
| Metrics 누락률 | 누락 이벤트 / 전체 이벤트 | < 0.1% |

---

## 5. Pilot 실행 체크리스트

### 5.1 사전 준비 (Pre-Pilot)

- [ ] Pilot 매장 선정 완료
- [ ] 매장 관리자 교육 완료
- [ ] 테스트 콘텐츠 준비 (각 Extension별)
- [ ] 테스트 캠페인 준비 (Seller)
- [ ] 모니터링 대시보드 준비
- [ ] 피드백 수집 채널 준비

### 5.2 Pilot 실행 (Execution)

**Week 1: 기본 운영**
- [ ] Pharmacy Force 콘텐츠 배포
- [ ] Store Clone 기능 검증
- [ ] Player 재생 안정성 확인

**Week 2: 확장 운영**
- [ ] Cosmetics 콘텐츠 추가
- [ ] Store 편집 기능 검증
- [ ] 오프라인 시나리오 테스트

**Week 3: 수익 검증**
- [ ] Seller 캠페인 시작
- [ ] Metrics 수집 확인
- [ ] KPI 데이터 검토

**Week 4: 마무리**
- [ ] 최종 KPI 집계
- [ ] 피드백 수집 완료
- [ ] 개선 포인트 정리

### 5.3 사후 처리 (Post-Pilot)

- [ ] Pilot 결과 보고서 작성
- [ ] KPI 달성 여부 평가
- [ ] Phase 4 진행 여부 결정
- [ ] 개선 사항 백로그 등록

---

## 6. 문제 대응 가이드

### 6.1 기술 문제

| 문제 | 대응 |
|------|------|
| Player 재생 오류 | 캐시 초기화, 재시작 |
| API 응답 지연 | 로그 확인, 쿼리 최적화 |
| Metrics 누락 | 이벤트 큐 확인, 재전송 |
| 오프라인 복구 실패 | 로컬 캐시 상태 확인 |

### 6.2 운영 문제

| 문제 | 대응 |
|------|------|
| Force 콘텐츠 미표시 | Extension 활성화 확인 |
| Clone 실패 | 권한/네트워크 확인 |
| 캠페인 미노출 | 기간/승인 상태 확인 |
| Store 접속 불가 | 인증/역할 확인 |

---

## 7. 피드백 수집

### 7.1 수집 항목

**Operator 피드백**
- 콘텐츠 생성 용이성
- 배포 프로세스 효율성
- 관리 도구 편의성

**Store 피드백**
- Clone/편집 직관성
- 콘텐츠 선택 다양성
- Player 안정성

**Partner 피드백** (Seller)
- 캠페인 등록 용이성
- 승인 프로세스 적절성
- 성과 리포트 유용성

### 7.2 수집 방법

- 주간 설문조사
- 1:1 인터뷰
- 시스템 로그 분석
- 이슈 트래커

---

## 8. 성공 기준

Pilot을 **성공**으로 판단하는 기준:

### 필수 조건 (Must Have)
- [ ] 치명적 장애 0건
- [ ] Force 규칙 100% 준수
- [ ] Metrics 수집 정상 작동

### 권장 조건 (Should Have)
- [ ] 매장 채택률 ≥ 50%
- [ ] Store 활성률 ≥ 70%
- [ ] CTR ≥ 업계 평균

### 선택 조건 (Nice to Have)
- [ ] 피드백 점수 4.0/5.0 이상
- [ ] 운영자 만족도 긍정

---

## 9. 결과 보고 양식

Pilot 종료 후 작성할 보고서:

1. **SIGNAGE-PHASE3-PILOT-REPORT.md**
   - Executive Summary
   - KPI 달성 현황
   - 주요 발견 사항
   - 권장 사항

2. **PILOT-KPI-SUMMARY.md**
   - 운영 KPI 상세
   - 수익 KPI 상세
   - 기술 KPI 상세
   - 트렌드 분석

3. **ISSUES-AND-IMPROVEMENTS.md**
   - 발견된 이슈 목록
   - 개선 제안
   - 우선순위 평가
   - Phase 4 백로그

---

## 10. 다음 단계

Pilot 결과에 따른 의사결정:

### Pilot 성공 시
→ **Phase 4 (Commercialization)** 진행
- 정산/결제 시스템 (선택)
- 패키지/요금제 설계
- 대규모 확장 가이드

### Pilot 부분 성공 시
→ **Phase 3.5 (Stabilization)** 진행
- 발견된 이슈 수정
- 추가 Pilot 진행
- KPI 재검증

### Pilot 실패 시
→ **Phase 3 Review** 진행
- 근본 원인 분석
- 아키텍처 재검토
- 재설계 필요 여부 판단

---

*Document Version: 1.0.0*
*Created: 2026-01-20*
*Work Order: WO-SIGNAGE-PHASE3-PILOT*
