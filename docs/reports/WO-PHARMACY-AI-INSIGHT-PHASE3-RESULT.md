# WO-PHARMACY-AI-INSIGHT-PHASE3 완료 보고서

## Hold 자산 흡수 분석 결과

**작성일**: 2025-12-22
**Work Order**: WO-PHARMACY-AI-INSIGHT-PHASE3
**상태**: 완료

---

## 1. 분석 요약

### 핵심 발견

`pharmacy-ai-insight`는 **이미 필요한 자산 흡수가 완료**된 상태입니다.

| 파일 | 내용 | 상태 |
|------|------|------|
| `src/backend/utils/glucoseUtils.ts` | 순수 계산/통계 유틸리티 | ✅ 흡수 완료 |
| `src/backend/services/AiInsightService.ts` | AI 해석 서비스 (확정 결론 ❌) | ✅ 구현 완료 |
| `src/backend/services/ProductHintService.ts` | 제품 연계 힌트 | ✅ 구현 완료 |

---

## 2. diabetes-core 분석 결과

### 2.1 흡수 완료 유틸리티 (glucoseUtils.ts에 이미 존재)

| 함수명 | 원본 위치 | 흡수 상태 |
|--------|-----------|-----------|
| `calculateMedian()` | MetricsCalculatorService:235-240 | ✅ 흡수됨 |
| `calculateStdDev()` | MetricsCalculatorService:245-249 | ✅ 흡수됨 |
| `calculateCV()` | MetricsCalculatorService:141 | ✅ 흡수됨 |
| `calculateTIR()` | MetricsCalculatorService:254-284 | ✅ 흡수됨 |
| `getTimeSlot()` | PatternDetectorService:376-398 | ✅ 흡수됨 |
| `calculateConfidence()` | PatternDetectorService:418-428 | ✅ 흡수됨 |

### 2.2 폐기 확정 목록 (❌ 삭제 대상)

**서비스**
| 파일 | 사유 |
|------|------|
| `MetricsCalculatorService.ts` | DB 의존성, 환자 관리 개념 |
| `PatternDetectorService.ts` | 코칭/추천 로직 포함 |
| `CoachingService.ts` | 환자 상담/관리 세션 |
| `ReportGeneratorService.ts` | 리포트 워크플로우, 목표 설정 |
| `CGMIngestService.ts` | CGM 데이터 수집 (환자 관리) |

**엔티티**
| 파일 | 사유 |
|------|------|
| `CGMReading.entity.ts` | 환자 데이터 관리 |
| `CGMEvent.entity.ts` | 환자 이벤트 관리 |
| `CGMSession.entity.ts` | 환자 세션 관리 |
| `DailyMetrics.entity.ts` | 환자 메트릭스 저장 |
| `DiabetesReport.entity.ts` | 환자 리포트 관리 |
| `PatternAnalysis.entity.ts` | 환자 패턴 분석 저장 |
| `CoachingSession.entity.ts` | 코칭 세션 관리 |
| `CoachingMessage.entity.ts` | 코칭 메시지 관리 |
| `UserNote.entity.ts` | 사용자 노트 관리 |

**컨트롤러**
| 파일 | 사유 |
|------|------|
| `CGMController.ts` | CGM 데이터 API |
| `CoachingController.ts` | 코칭 API |
| `LifestyleController.ts` | 생활습관 관리 API |
| `MetricsController.ts` | 메트릭스 조회 API |
| `PatternController.ts` | 패턴 분석 API |
| `ReportController.ts` | 리포트 API |

---

## 3. diabetes-pharmacy 분석 결과

### 3.1 참고 완료 (구조 패턴만)

| 항목 | 참고 여부 | 적용 상태 |
|------|-----------|-----------|
| manifest 구조 | ✅ | pharmacy-ai-insight에 적용됨 |
| lifecycle 패턴 | ✅ | install/activate/deactivate/uninstall 동일 |
| extension 등록 방식 | ✅ | dependencies 정의 방식 동일 |
| controller/service 분리 | ✅ | 동일 패턴 적용 |

### 3.2 폐기 확정 목록 (❌ 삭제 대상)

| 파일/폴더 | 사유 |
|-----------|------|
| 패키지 전체 (`packages/diabetes-pharmacy/`) | diabetes-core 의존성, 환자 관리 개념 |

**상세 폐기 목록**
- `ActionService.ts` - 환자 대상 액션
- `PharmacyDiabetesService.ts` - 환자 관리 서비스
- `ActionController.ts` - 액션 API
- `DashboardController.ts` - 대시보드 API
- `manifest.ts` - extension 정의
- `extension.ts` - 확장 등록
- 모든 lifecycle 파일
- 모든 frontend 파일

---

## 4. forum-app 분석 결과

### 4.1 연계 위치 정의

```
forum-app (core)
├── 게시글/댓글 기능 (Active 서비스)
└── pharmacy-ai-insight 연계 없음 ✅
```

**결론**: `pharmacy-ai-insight`는 `forum-app`과 **직접 의존성 없음**
- manifest.dependencies에 forum-core 없음
- organization-core만 의존
- 느슨한 연계 (같은 약사 환경에서 별도 도구로 존재)

### 4.2 forum-app 처리

| 항목 | 결정 |
|------|------|
| 삭제 여부 | ❌ 삭제 불가 (Active 서비스) |
| 흡수 대상 | 없음 |
| 참고 대상 | 위치 개념만 (포럼 내 도구 영역) |

---

## 5. 최종 의존성 다이어그램

```
pharmacy-ai-insight (feature)
├── organization-core [Core] ✅ 필수 의존
├── dropshipping-core [Core] ○ 선택 의존 (제품 연계)
└── digital-signage-core [Core] ○ 선택 의존 (사이니지 연계)

[삭제 예정]
├── diabetes-core ❌ → 삭제
└── diabetes-pharmacy ❌ → 삭제

[무관]
└── forum-app ⬜ → 유지 (별도 Active 서비스)
```

---

## 6. 최종 흡수/폐기 판단표

| 대상 | 흡수 | 참고 | 폐기 | 비고 |
|------|------|------|------|------|
| diabetes-core | 유틸만 (완료) | ⭕ | ⭕ 전체 | 순수 계산 함수만 이미 흡수됨 |
| diabetes-pharmacy | ❌ | 패턴만 (완료) | ⭕ 전체 | 구조 참고 완료, 삭제 가능 |
| forum-app | ❌ | 위치만 | ❌ | Active 서비스, 유지 |

---

## 7. STEP 4 (Drop) 삭제 작업 입력 자료

### 7.1 즉시 삭제 가능 패키지

```bash
# 삭제 대상 디렉토리
packages/diabetes-core/
packages/diabetes-pharmacy/
```

### 7.2 삭제 전 확인 사항

1. **api-server 의존성 확인**
   ```bash
   grep -r "diabetes-core\|diabetes-pharmacy" apps/api-server/
   ```

2. **다른 패키지 의존성 확인**
   ```bash
   grep -r '"@o4o/diabetes-core"\|"@o4o/diabetes-pharmacy"' packages/*/package.json
   ```

3. **pnpm-workspace.yaml 정리**
   - 삭제 후 workspace에서 제거

### 7.3 삭제 순서

1. api-server에서 diabetes 관련 라우트/임포트 제거
2. `packages/diabetes-pharmacy/` 삭제
3. `packages/diabetes-core/` 삭제
4. pnpm-lock.yaml 재생성
5. 빌드 확인

---

## 8. 완료 기준 충족 확인

| 기준 | 충족 여부 |
|------|-----------|
| "이건 남긴다 / 이건 버린다"가 명확함 | ✅ |
| STEP 4에서 망설임 없이 삭제 가능 | ✅ |
| pharmacy-ai-insight 외 diabetes 관련 불필요 판단 가능 | ✅ |
| 코드 양이 늘지 않았음 | ✅ (분석/정리만 수행) |

---

## 9. 결론

**STEP 3 완료**

- `pharmacy-ai-insight`는 이미 필요한 유틸리티를 `glucoseUtils.ts`에 흡수 완료
- diabetes-core/diabetes-pharmacy는 **완전 삭제 가능**
- forum-app은 **무관 (유지)**
- STEP 4(Drop) 진행 준비 완료

---

*보고서 작성: Claude Code*
*날짜: 2025-12-22*
