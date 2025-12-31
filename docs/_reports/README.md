# _reports

이 폴더는 **작업 완료 보고서 전용**입니다.

## 규칙

1. **파일명 형식**: 
   - 일반: `WO-{ID}-report.md`
   - 리팩토링: `WO-{ID}-refactor-report.md`
   - 검증: `verification/WO-{ID}-verification-report.md`

2. **생명주기**:
   - 일반/리팩토링: PR 머지 후 7일 → 자동 삭제
   - 검증: 영구 보관

3. **Archive 이동**: 불가 (자동 삭제 또는 영구 보관)

## 폴더 구조

```
_reports/
├── WO-ECOMMERCE-CART-V1-report.md (7일 후 삭제)
├── WO-REFACTOR-AUTH-V1-refactor-report.md (7일 후 삭제)
└── verification/
    └── WO-VERIFY-YAKSA-PHASE20-verification-report.md (영구 보관)
```

## 보고서 작성 규칙

모든 보고서는 다음을 포함해야 합니다:

- 작업 요약
- 구현 내용
- 변경된 파일 목록
- 업데이트된 문서 목록
- 테스트 결과 (해당 시)

## 중요

- 검증 보고서는 스크린샷/로그 등 증거 자료 필수 포함
- 일반 보고서는 7일 후 자동 삭제되므로 중요 정보는 기준 문서에 반영
