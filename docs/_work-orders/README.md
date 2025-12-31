# _work-orders

이 폴더는 **진행 중인 Work Order 보관**용입니다.

## 규칙

1. **파일명 형식**: `WO-{ID}.md`
2. **생명주기**: 작업 완료 후 즉시 삭제
3. **Archive 이동**: 불가

## 사용 방법

1. **작업 시작 시**: Work Order 문서를 이 폴더에 생성
2. **작업 진행 중**: 필요 시 업데이트
3. **작업 완료 시**: 
   - 보고서를 `_reports/`에 생성
   - 이 폴더의 Work Order 삭제

## Work Order 헤더

모든 Work Order는 표준 헤더를 사용해야 합니다:

**헤더 템플릿**: `docs/_platform/work-order-headers.md` 참조

## 예시

```
docs/_work-orders/WO-ECOMMERCE-CART-V1.md (작업 중)
→ 완료 후 삭제
→ docs/_reports/WO-ECOMMERCE-CART-V1-report.md 생성
```

## 중요

- 이 폴더는 "진행 중" 상태만 보관
- 완료된 작업은 반드시 삭제
- 보고서로 대체
