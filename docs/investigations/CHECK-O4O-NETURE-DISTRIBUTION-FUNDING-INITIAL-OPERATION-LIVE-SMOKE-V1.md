# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-INITIAL-OPERATION-LIVE-SMOKE-V1

> 통합 live smoke (prod neture.co.kr / api.neture.co.kr). 운영 모델 SSOT: `docs/baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md`
> 작성일: 2026-06-07

## 최종 판정: CONDITIONAL PASS

| 항목 | 판정 |
|---|---|
| 가이드 화면 (`/guide/features/market-trial`) | ✅ PASS — 제목 유통참여형 펀딩, 카드 8+anchor 8, 투자형 아님·매장 랜딩·예시 표시 |
| 외부 명칭 정합성 | ✅ PASS — Market Trial/마켓 트라이얼/유통 참여형(공백)/bare Trial 렌더링 0 |
| 보안 401 회귀 | ✅ PASS — 무인증 `trial-shipping/:id`·`trial-fulfillment/stats` → 401 |
| 승인 전 비공개·참여 차단 | ✅ 코드 기준 PASS — `getTrials` 기본 `NOT IN (draft,submitted)`, `join`은 recruiting만 |
| smoke 중 잔재 정리 | ✅ 완료, `8b5fa0da2` push |
| 운영자 승인/입금/랜딩/CSV live | ⚠️ 미확인 (데이터 부재) |
| 공급자 생성 안내 live | ⚠️ 미확인 (데이터·권한 제한) |

## 왜 PASS가 아니라 CONDITIONAL PASS인가

운영자 승인 체크리스트, 오프라인 입금 관리, 매장 랜딩 파이프라인, CSV export, 공급자 생성 안내 화면은 **submitted 상태 펀딩·참여자 데이터가 prod에 없어서** 실제 렌더를 live로 확인하지 못함. 정적(코드)·검색·tsc 검증은 통과했으나 라이브 화면은 미확인.

## 데이터가 없어 못 본 것

- 운영자 승인 상세의 "승인 전 확인사항" 체크리스트 박스 (submitted 펀딩 필요)
- 오프라인 입금 관리 / 입금 확인 완료 N명 / 랜딩 파이프라인 요약 / CSV 컬럼 (참여자 데이터 필요)
- 공급자 생성 안내 박스 / 심사 대기 상태 안내 (공급자 계정 + 데이터)
- `/market-trial/my-participations` 오프라인 안내 (참여 데이터)

## smoke 중 발견 → 정리 (커밋 `8b5fa0da2`)

이전 WO 누락 잔재 정리(사용자-facing 표시 용어):
- `operator/MarketTrialApprovalsPage` — Trial→유통참여형 펀딩, 결제→입금 확인
- `operator/MarketTrialApprovalDetailPage` — 결제 완료율→입금 확인 완료율
- `supplier/SupplierTrialDetailPage` — 진열/거래선/취급 → 활용 상품 연결/매장 랜딩/매장 도입
→ 정리 후 렌더링 잔재 0 (JSDoc 주석만), tsc PASS.

## 후속 (다음 작업)

`CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-SMOKE-DATA-FLOW-V1` — `[SMOKE]` 펀딩 1건 생성 → 제출 → 운영자 승인 체크리스트 → 공개 노출 → 참여 1건 → 입금 확인 → 정산/랜딩 UI → CSV → 종료 정리. 실제 데이터 1건으로 운영 루프 확인 후 V2(store/org FK·read-only 명단·PG·포럼 gate) 판단.

---

*상태: CONDITIONAL PASS — 운영 액션 화면은 smoke 데이터 1건으로 후속 라이브 확인*
