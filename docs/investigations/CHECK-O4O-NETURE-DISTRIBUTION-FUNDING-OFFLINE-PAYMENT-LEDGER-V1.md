# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-PAYMENT-LEDGER-V1

> WO: `WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-PAYMENT-LEDGER-V1` (운영자 송금 내역 관리 1차)
> 운영 모델 SSOT: `docs/baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md`
> 작성일: 2026-06-06 · 외부표기 유통참여형 펀딩 / 내부 Market Trial (미변경)

## 1. 최종 판정

PASS (구현·정적검증·보안 회귀 확인 완료, 운영자 화면 smoke 후속).

- 운영자 입금 관리 화면 용어를 **"결제" → "오프라인 입금 확인"** 으로 정리.
- **송금은 Neture 운영자 수령 + 입금 확인 완료자 명단 제품 개발자 공유** 원칙 문구 표시.
- **입금 확인 완료 N명 / 전체 M명** 요약으로 송금 완료자 식별.
- **CSV export** 에 payment/정산 컬럼 보강(송금 완료자 명단 공유용), "Trial제목/상태" 헤더 정리.
- **PG/checkout 미추가, DB/migration 무변경.** API 변경 = CSV export 컬럼 보강만(엔드포인트 계약·스키마 불변). tsc 2/2 PASS.

## 2. 변경 파일 (3 + 문서)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/api/trial.ts` | `PAYMENT_STATUS_LABELS` 결제→입금 확인 용어 |
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | "오프라인 입금 관리" 헤더 + 입금 확인 완료 N명 요약 + 명단 공유 원칙 문구 + th/프롬프트/에러 용어 |
| `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | `exportParticipantsCSV` payment/정산 컬럼 + 헤더 정리 |
| 본 CHECK (신규) | |

## 3. 기존 payment 구조 조사 결과

- 참여자 엔티티에 payment 블록 존재: `paymentStatus`(unpaid/pending/paid/failed/canceled/refunded)·`paymentMethod`·`paymentProvider`·`paymentReference`·`paidAmount`·`paidAt`·`confirmedAt`·`paymentNote`.
- 운영자 상태 변경 엔드포인트 `updateParticipantPaymentStatus` 존재 — 상태+금액+참조+메모+일자 수령(수기). 프론트 결제관리 섹션에서 "수기 송금 확인"/"환불"/되돌리기 + 금액/참조 프롬프트 이미 동작.
- participants list 에 `paymentStatus` 필터 존재(API). → **상태 변경/표시 인프라는 이미 충분**, 본 WO 는 용어·식별·명단 공유(CSV)·원칙 문구 보강 중심.

## 4. DB/API/migration 변경 여부

- **DB/migration: 없음.**
- **API: CSV export 컬럼 보강만**(`exportParticipantsCSV` 의 SELECT 추가 컬럼 + 출력 포맷). 엔드포인트 추가/계약 변경/스키마 변경 없음.
- 신규 필드/상태/migration 없음 → `@o4o/market-trial` 변경 없음(tsc 불필요).

## 5. 운영자 화면 변경 내용

- 섹션 헤더 "결제 상태 관리" → **"오프라인 입금 관리"**, 부제 "PG 미연동 — 운영자 오프라인 입금 확인".
- **입금 확인 완료 N명 / 전체 M명** 배지(송금 완료자 식별).
- 안내 문구: "온라인 결제 없이 오프라인 입금 확인·제품 정산 관리. 송금은 Neture가 수령, 입금 확인 완료자 명단은 제품 개발자에게 공유. 상태 변경은 오프라인 입금 확인 기록이며 되돌릴 수 있음."
- 테이블 헤더 "결제 상태"→"입금 상태", "결제일"→"입금일". 프롬프트 "결제 금액"→"입금 확인 금액". 에러 "결제 상태 변경 실패"→"입금 확인 상태 변경 실패".

## 6. payment 상태 표시 매핑 (PAYMENT_STATUS_LABELS)

| 내부 | 표시 |
|---|---|
| unpaid | 입금 전 |
| pending | 입금 확인 대기 |
| paid | 입금 확인 완료 |
| failed | 입금 확인 실패 |
| canceled | 참여 취소 |
| refunded | 환불 처리됨 |

## 7. 송금 완료자 식별 방식

- 운영자 입금 관리 섹션의 **입금 확인 완료 N명** 요약 배지.
- 참여자 테이블의 입금 상태 배지(`paid` = 입금 확인 완료) + 금액/입금일.
- CSV export 의 `입금상태` 컬럼으로 `입금 확인 완료` 필터/정렬 가능.
- (참고) participants list API 에 `paymentStatus` 필터 기존 존재 — 필요 시 화면 필터 후속.

## 8. CSV/export 변경 여부

`exportParticipantsCSV` 컬럼: 기존 7 → **15**.
`참여자명 · 참여자유형 · 보상방식 · 보상상태 · 참여금 · 입금상태 · 입금확인금액 · 입금확인일 · 입금참조 · 정산선택 · 정산상태 · 거래선단계 · 참여일 · 유통참여형 펀딩 제목 · 상태`
- "Trial제목/Trial상태" → "유통참여형 펀딩 제목/상태".
- **PII 수준 유지**: 참여자명만 포함(이메일/연락처 미추가) — 기존 정책·권한 범위 준수.

## 9. 공급자 공유 방식 (WO §8)

- 1차 기준: 공급자 화면에 송금 완료자 명단 **직접 자동 노출 안 함**. Neture 운영자가 화면/CSV 로 확인 후 필요한 범위로 제품 개발자에게 공유.
- 공급자 직접 조회는 권한·개인정보·포럼 운영 권한 판정 복잡 → V2 로 분리.

## 10. Neture 송금 수령 원칙 반영 여부

운영자 입금 관리 안내 문구에 "송금은 Neture가 수령하며 입금 확인 완료자 명단은 제품 개발자에게 공유" 명시. 제품 개발자 직접 수령 아님(돈의 흐름 Neture 통제) — 운영 모델 SSOT 부합.

## 11. TypeScript 결과

| 패키지 | 결과 |
|---|:---:|
| web-neture | ✅ exit 0 |
| api-server | ✅ exit 0 |
| @o4o/market-trial | 변경 없음 → 미실행 |

## 12. 검색 검증

- `Market Trial`/`마켓 트라이얼`/`유통 참여형 펀딩`(공백) 사용자-facing 렌더링 — **0** (JSDoc 주석만).
- CSV 헤더 bare `Trial` 제거(유통참여형 펀딩 제목/상태). 잔여 `'Trial not found'` 등은 영문 API 메시지(내부, 본 WO 대상 아님).

## 13. 보안 회귀 확인 결과

이전 핫픽스 유지 — prod 무인증 요청:
- `GET /api/trial-shipping/<uuid>` → **401**
- `GET /api/trial-fulfillment/stats` → **401**

## 14. 브라우저 smoke (후속)

배포 후 운영자 로그인으로 권장:
- 유통참여형 펀딩 상세 → 오프라인 입금 관리 섹션 노출
- 입금 상태 "입금 확인 ..." 기준 표시 / 입금 확인 완료 N명 요약
- 수기 입금 확인/환불/되돌리기 기존 액션 정상
- participants CSV export 에 payment/정산 컬럼 포함·엑셀 정상 표시
- 모바일 폭 안내 박스 깨짐 없음

## 15. V2 후보

`WO-…-OFFLINE-PAYMENT-LEDGER-V2`: 입금 메모·송금자명 별도 필드, 입금 확인자 userId, 상태 변경 이력/감사 로그, 제품 개발자용 송금 완료자 read-only 화면, 미송금자 목록 export, 송금 기한 알림. **계좌 정보 저장은 별도 정책 판단**(O4O는 등록 정보에서 계좌 미저장 원칙).

## 16. 제외 범위 (WO §5/§14 준수)

PG/checkout / 온라인 결제 / 환불 자동화 / 입금 자동 매칭 / DB·migration / 포럼 자동 gate / 참여 대상 자동 gate / 제품 정산 자동화 / 매장 랜딩 추적 / 운영자 심사 체크리스트 영속화 / 공급자 직접 명단 자동 노출 / 계좌 정보 저장 — 모두 **미수행**.

---

*상태: 구현·정적검증·보안 회귀 확인 완료 / 운영자 화면 smoke 후속*
