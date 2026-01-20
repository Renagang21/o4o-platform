# Pilot Execution Checklist

## Work Order: WO-SIGNAGE-PHASE3-PILOT

### 목적

Pilot 실행 전/중/후 체크리스트를 제공하여 누락 없이 검증을 완료합니다.

---

## Phase A: 사전 준비 (Pre-Pilot)

### A1. 시스템 준비

- [ ] API 서버 배포 완료
- [ ] 데이터베이스 스키마 생성 완료
  - [ ] `signage_pharmacy` 스키마
  - [ ] `signage_cosmetics` 스키마
  - [ ] `signage_seller` 스키마
- [ ] Extension 활성화 확인
  - [ ] Pharmacy: enabled
  - [ ] Cosmetics: enabled
  - [ ] Seller: enabled
- [ ] 모니터링 설정 완료
- [ ] 로그 수집 설정 완료

### A2. 매장 준비

- [ ] Pilot 매장 선정 (최소 5개)
- [ ] 매장별 serviceKey 발급
- [ ] 매장별 organizationId 할당
- [ ] 매장 관리자 계정 생성
- [ ] Player 설치 및 연동 확인

### A3. 테스트 데이터 준비

**Pharmacy Extension**
- [ ] 테스트 Category 3개 이상
- [ ] 테스트 Campaign 2개 이상
- [ ] 테스트 Content 10개 이상
  - [ ] Force 콘텐츠 2개 이상
  - [ ] Non-Force 콘텐츠 8개 이상

**Cosmetics Extension**
- [ ] 테스트 Brand 3개 이상
- [ ] 테스트 ContentPreset 5개 이상
- [ ] 테스트 BrandContent 10개 이상
- [ ] 테스트 TrendCard 5개 이상

**Seller Extension**
- [ ] 테스트 Partner 2개 이상
- [ ] 테스트 Campaign 3개 이상
  - [ ] 승인된 캠페인 2개
  - [ ] 대기 중인 캠페인 1개
- [ ] 테스트 Content 10개 이상

### A4. 교육 준비

- [ ] Operator 교육 자료 준비
- [ ] Store 관리자 교육 자료 준비
- [ ] Partner 교육 자료 준비 (Seller)
- [ ] 교육 일정 확정

### A5. 피드백 체계 준비

- [ ] 피드백 수집 양식 준비
- [ ] 이슈 트래커 설정
- [ ] 담당자 연락망 구축

---

## Phase B: Pilot 실행 (Execution)

### B1. Week 1 - 기본 운영

**Day 1-2: 시스템 확인**
- [ ] API 엔드포인트 정상 응답 확인
- [ ] 각 Extension 라우트 접근 확인
- [ ] 권한 체계 작동 확인

**Day 3-4: Pharmacy 검증**
- [ ] Force 콘텐츠 생성 및 배포
- [ ] Store에서 Force 콘텐츠 표시 확인
- [ ] Force 삭제 시도 → 차단 확인
- [ ] Non-Force 콘텐츠 Clone 테스트

**Day 5-7: 기본 운영 안정화**
- [ ] Player 재생 안정성 확인
- [ ] 오프라인 → 온라인 전환 테스트
- [ ] 첫 주 KPI 기록

### B2. Week 2 - 확장 운영

**Day 8-10: Cosmetics 검증**
- [ ] Brand 콘텐츠 생성
- [ ] TrendCard 생성
- [ ] Store Clone 테스트
- [ ] 콘텐츠 편집 테스트

**Day 11-14: Store 운영 검증**
- [ ] 다양한 콘텐츠 조합 테스트
- [ ] 순서 변경 테스트
- [ ] 로컬 편집 테스트
- [ ] 삭제/복구 테스트

### B3. Week 3 - 수익 검증

**Day 15-17: Seller 캠페인 시작**
- [ ] Partner 등록 및 승인
- [ ] 캠페인 생성 및 승인
- [ ] 콘텐츠 등록 및 승인
- [ ] Global Content로 노출 확인

**Day 18-21: Metrics 수집 검증**
- [ ] Impression 이벤트 기록 확인
- [ ] Click 이벤트 기록 확인
- [ ] QR scan 이벤트 기록 확인
- [ ] Video completion 이벤트 확인
- [ ] 일별 집계 데이터 확인

### B4. Week 4 - 마무리

**Day 22-25: 종합 검증**
- [ ] 전체 Extension 통합 운영
- [ ] 복합 시나리오 테스트
- [ ] 엣지 케이스 검증
- [ ] 성능 테스트

**Day 26-28: 데이터 수집 마감**
- [ ] 최종 KPI 집계
- [ ] 피드백 수집 마감
- [ ] 이슈 정리

---

## Phase C: 시나리오별 검증

### C1. Global Content 병합 검증

| # | 시나리오 | 예상 결과 | 확인 |
|---|----------|----------|------|
| 1 | Force + Global 동시 존재 | Force 우선 표시 | [ ] |
| 2 | 여러 Extension 콘텐츠 혼합 | 병합 순서 적용 | [ ] |
| 3 | 캠페인 기간 외 Seller 콘텐츠 | 미표시 | [ ] |
| 4 | 비활성화된 콘텐츠 | 미표시 | [ ] |

### C2. Role/권한 검증

| # | 시나리오 | 예상 결과 | 확인 |
|---|----------|----------|------|
| 1 | Admin → 모든 기능 접근 | 성공 | [ ] |
| 2 | Operator → Operator 기능만 | 성공 | [ ] |
| 3 | Store → Store 기능만 | 성공 | [ ] |
| 4 | Partner → 자신의 데이터만 | 성공 | [ ] |
| 5 | Store → Operator 기능 접근 | 403 에러 | [ ] |
| 6 | Partner → 다른 Partner 데이터 | 404/403 에러 | [ ] |

### C3. Clone 규칙 검증

| # | 시나리오 | 예상 결과 | 확인 |
|---|----------|----------|------|
| 1 | Pharmacy Force Clone 시도 | 실패 (canClone: false) | [ ] |
| 2 | Pharmacy Non-Force Clone | 성공 | [ ] |
| 3 | Cosmetics Content Clone | 성공 (모든 콘텐츠 가능) | [ ] |
| 4 | Seller Content Clone | 성공 (모든 콘텐츠 가능) | [ ] |
| 5 | Clone 후 원본 수정 | Clone에 영향 없음 | [ ] |

### C4. Player 검증

| # | 시나리오 | 예상 결과 | 확인 |
|---|----------|----------|------|
| 1 | 정상 네트워크 재생 | 병합 순서대로 재생 | [ ] |
| 2 | 네트워크 끊김 | 캐시 콘텐츠 재생 | [ ] |
| 3 | 네트워크 복구 | 오프라인 Metrics 전송 | [ ] |
| 4 | Force 콘텐츠 | 항상 포함 | [ ] |
| 5 | 캠페인 종료 | Seller 콘텐츠 제외 | [ ] |

### C5. Seller 승인 워크플로우

| # | 시나리오 | 예상 결과 | 확인 |
|---|----------|----------|------|
| 1 | 캠페인 생성 | status: draft | [ ] |
| 2 | 캠페인 제출 | status: pending | [ ] |
| 3 | Admin 승인 | status: approved | [ ] |
| 4 | 기간 도래 | status: active | [ ] |
| 5 | Admin 거절 | status: rejected + 사유 | [ ] |
| 6 | 콘텐츠 승인 | Global 노출 가능 | [ ] |

---

## Phase D: 사후 처리 (Post-Pilot)

### D1. 데이터 분석

- [ ] 운영 KPI 분석 완료
- [ ] 수익 KPI 분석 완료
- [ ] 기술 KPI 분석 완료
- [ ] 목표 대비 달성률 계산

### D2. 피드백 정리

- [ ] Operator 피드백 정리
- [ ] Store 피드백 정리
- [ ] Partner 피드백 정리
- [ ] 우선순위 분류

### D3. 이슈 정리

- [ ] 발견된 버그 목록화
- [ ] 개선 요청 사항 정리
- [ ] 우선순위 평가
- [ ] Phase 4 백로그 등록

### D4. 보고서 작성

- [ ] SIGNAGE-PHASE3-PILOT-REPORT.md
- [ ] PILOT-KPI-SUMMARY.md
- [ ] ISSUES-AND-IMPROVEMENTS.md

### D5. 의사결정

- [ ] Pilot 성공 여부 판정
- [ ] Phase 4 진행 여부 결정
- [ ] 추가 작업 필요 여부 판단
- [ ] 타임라인 확정

---

## 서명란

| 역할 | 담당자 | 서명 | 날짜 |
|------|--------|------|------|
| PM | | | |
| Tech Lead | | | |
| QA Lead | | | |
| Business Owner | | | |

---

*Document Version: 1.0.0*
*Created: 2026-01-20*
*Work Order: WO-SIGNAGE-PHASE3-PILOT*
