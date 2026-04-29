# WO-O4O-STORE-FLOW-END-TO-END-V1

## 목적

O4O 핵심 가치인 **매장 운영 흐름이 실제로 end-to-end로 동작하는지 검증**한다.

## 검증 범위

```
회원 → 매장 → 상품 → 진열 → 고객 → 요청
```

## 단계

1. 로그인 → StoreHub → 내 매장
2. 상품 등록
3. 채널 진열 연결
4. Tablet 고객 흐름 (/tablet/:slug)
5. 직원 요청 처리 (/store/requests)
6. QR 흐름 (/qr/:slug)
7. 전체 데이터 일관성 확인

## 결과 형식

PASS / FAIL / PARTIAL + 문제 위치 + 재현 방법 + 영향 범위

## 금지

- 코드 수정 금지 (이번 단계)
- UI 개선 작업 금지
- 리팩토링 금지
- 문제 발견 시 즉시 수정 말고 보고 후 다음 WO로 진행
