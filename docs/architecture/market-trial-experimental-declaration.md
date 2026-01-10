# Market Trial 도메인 Experimental 선언

> **Status**: Active
> **Date**: 2026-01-10
> **Based on**: WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1

---

## 1. 선언문 (공식)

> **Market Trial 도메인은 현재 Experimental 상태로 운영한다.**
> 본 도메인은 자동화된 거래/결제/송금 기능을 제공하지 않으며,
> 사람 중심 운영 프로세스를 전제로 한 실험/검증 목적의 기능만 포함한다.

---

## 2. Experimental 범위 정의

### 포함

- Trial 기획 등록
- 운영자 승인
- 참여자 모집 (Forum 기반)
- 결과 수령 방식 확인
- 이행 상태 기록 (배송/송금 결과)

### 미포함

- 결제 시스템
- 자동 송금
- 정산 자동화
- 판매 전환 로직
- Core 도메인 의존성 확대

---

## 3. 기술적 기준

- Trial 관련 변경은 **Experimental 도메인 규칙**을 따름
- Core 도메인에 영향 주는 변경은 금지
- 타입/Enum은 **WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 기준 유지**
- 데이터 구조 변경은 **추가 Phase 승인 필요**

### TrialStatus Enum (확정)

```typescript
enum TrialStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  RECRUITING = 'recruiting',
  DEVELOPMENT = 'development',
  OUTCOME_CONFIRMING = 'outcome_confirming',
  FULFILLED = 'fulfilled',
  CLOSED = 'closed',
}
```

---

## 4. AppStore 메타

| 항목 | 값 |
|------|-----|
| appId | `market-trial` |
| type | `extension` |
| status | `experimental` |
| dependencies | `dropshipping-core: >=1.0.0` |

---

## 5. 운영 관점

### 장점

- 과도한 기능 기대 차단
- 실험 실패 비용 최소화
- Forum 기반 피드백 수집에 집중 가능

### 한계 (의도된)

- 대규모 확장 불가
- 외부 파트너 자동 연동 불가
- 수익 모델 확정 불가

---

## 6. Experimental 해제 조건

다음 중 하나가 충족되면 Experimental 해제 검토 가능:

1. Trial 운영 프로세스 3회 이상 안정적 완료
2. Forum을 통한 구조 피드백 수렴 완료
3. 자동 결제/송금 도입 필요성에 대한 내부 합의

---

## 7. 관련 문서

- `docs/reports/IR-MARKET-TRIAL-B2B-INTEGRATION-STATUS-2026-01.md`
- `packages/market-trial/src/types/MarketTrial.types.ts`

---

*Document Version: 1.0*
*Last Updated: 2026-01-10*
