# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-STORE-LANDING-TRACKING-V1

> WO: `WO-O4O-NETURE-DISTRIBUTION-FUNDING-STORE-LANDING-TRACKING-V1` (G6 매장 랜딩 추적 1차)
> 운영 모델 SSOT: `docs/baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md`
> 작성일: 2026-06-06 · 외부표기 유통참여형 펀딩 / 내부 Market Trial (미변경)

## 1. 최종 판정

PASS (구현·정적검증·보안 회귀 확인 완료, 운영자 화면 smoke 후속).

- 운영자 참여자 관리 UI를 **입금 확인 → 제품 정산 → 매장 랜딩** 파이프라인 관점으로 재프레이밍.
- "거래선 단계"→**"매장 랜딩 단계"**, "진열 상태/완료/등록"→**"활용 상품 연결"**, "거래선 전환 퍼널"→**"매장 랜딩 전환 퍼널"**.
- **랜딩 파이프라인 요약 배지**(입금 확인 완료 / 제품 정산 완료 / 매장 도입 / 활용 상품 연결) + **"매장 랜딩은 자동 확정되지 않습니다" 안내**.
- CSV export 에 **활용상품연결(listingId)** 컬럼 추가, 거래선단계→매장랜딩단계.
- **DB/migration 무변경.** API 변경 = CSV export 컬럼/SELECT 보강만. tsc 2/2 PASS. 보안 핫픽스 회귀 없음(401).

## 2. 변경 파일 (2 + 문서)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | 랜딩 단계/활용 상품 연결 라벨, 랜딩 파이프라인 요약, 자동확정 안 함 안내, 퍼널 라벨, 에러 문구 |
| `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | `exportParticipantsCSV` 에 listingId(활용상품연결) 컬럼 + 매장랜딩단계 라벨 |
| 본 CHECK (신규) | |

## 3. 기존 랜딩/전환 구조 조사 결과

- 운영자 상세에 **이미 존재**: 참여자 테이블의 거래선 단계(`customerConversionStatus` 드롭다운), 진열 상태(`listingId`→진열 완료/등록), 거래선 전환 퍼널(adoptedRate/firstOrderRate/listingCount), settlement/payment 상태 관리.
- `listingId` 는 `createListingFromParticipant`(operator) → `organization_product_listings`(source_type='market_trial') autolink 시 역기록. 생성 조건: trial 상품 전환 완료 + 참여자 `adopted`/`first_order`.
- participants 응답에 `paymentStatus`·`settlementStatus`·`rewardStatus`·`customerConversionStatus`·`listingId` 모두 포함 → **표시/요약 인프라 충분**, 본 WO 는 랜딩 관점 재프레이밍·요약·안내·CSV 컬럼 중심.

## 4. DB/API/migration 변경 여부

- **DB/migration: 없음.**
- **API: CSV export 만** — `exportParticipantsCSV` SELECT 에 `listingId` 추가 + 출력 컬럼. 엔드포인트/계약/스키마 불변.
- 신규 필드/상태 없음 → `@o4o/market-trial` 변경 없음.

## 5. 운영자 화면 변경 내용

- 참여자 테이블 th "거래선 단계"→**"매장 랜딩 단계"**, "진열 상태"→**"활용 상품 연결"**.
- listing 배지 "진열 완료"→**"활용 상품 연결됨"**, 버튼 "진열 등록"→**"활용 상품 연결"**.
- 참여자 섹션 상단(filter=전체일 때) **랜딩 파이프라인 요약 배지**: 입금 확인 완료 N · 제품 정산 완료 N · 매장 도입 N · 활용 상품 연결 N.
- **안내 문구**: "입금 확인 완료자는 제품 정산 대상. 매장 랜딩은 자동 확정되지 않으며, 운영자가 제품 정산·활용 상품 연결 상태를 참고해 확인하고 필요 시 제품 개발자와 함께 확정."
- 퍼널 "거래선 전환 퍼널"→"매장 랜딩 전환 퍼널", "취급률"→"매장 도입률", "진열"→"활용 상품 연결".
- 에러 문구: "매장 진열 등록 실패"→"활용 상품 연결 실패", "전환 상태 변경 실패"→"매장 랜딩 단계 변경 실패".

## 6. 상태 매핑

| 항목 | 내부 | 표시 |
|---|---|---|
| 입금 상태 | paid | 입금 확인 완료 (이전 WO) |
| 제품 정산 상태 | offline_settled 등 | 정산 완료 등 (이전 WO) |
| 제품 제공 상태 | rewardStatus fulfilled/pending | 완료/대기 (이행) |
| 매장 랜딩 단계 (customerConversionStatus) | none/interested/considering/adopted/first_order | 랜딩 전 / 관심 확인 / 취급 검토 / 매장 도입 / 첫 주문·랜딩 |
| 활용 상품 연결 (listingId) | null / uuid | - / 활용 상품 연결됨(CSV: 연결됨) |

## 7. CSV/export 변경 여부

- 컬럼 15→**16**: `… 정산상태 · 매장랜딩단계 · 활용상품연결 · 참여일 · 유통참여형 펀딩 제목 · 상태`.
- `활용상품연결` = `listingId` 존재 시 "연결됨", 없으면 "-". (listingId 원시값 미노출 — 식별만)
- 매장랜딩단계 라벨을 화면과 동일 landing 용어로 정렬.

## 8. listingId / customerConversionStatus 해석 기준

- `listingId` = 유통참여형 펀딩 참여자로부터 **활용 상품(organization_product_listings) 이 연결됨**을 의미하는 **랜딩 연결 신호**. 실제 매장 단위 식별(store/org)은 아님.
- `customerConversionStatus` = 참여자의 **매장 도입 단계**(관심→취급 검토→매장 도입→첫 주문). 운영자 수기 갱신.

## 9. 매장 랜딩을 실제 완료로 보지 않는 이유

- 참여자에 `storeId/organizationId` FK 부재 → "어느 매장"을 직접 식별 못함(IR G6 부분).
- `listingId`/`adopted` 는 **연결 신호**일 뿐 실제 매장 도입 완료 보증 아님.
- 따라서 1차는 **자동 확정 금지** — 운영자가 신호를 참고해 제품 개발자와 확인. 실제 store/org 식별·랜딩 완료일·확인자는 V2(§14).

## 10. TypeScript 결과

| 패키지 | 결과 |
|---|:---:|
| web-neture | ✅ exit 0 |
| api-server | ✅ exit 0 |
| @o4o/market-trial | 변경 없음 → 미실행 |

## 11. 검색 검증

- `Market Trial`/`마켓 트라이얼`/`유통 참여형 펀딩`(공백) 사용자-facing 렌더링 — **0** (JSDoc 주석만).
- 운영자 페이지 "거래선"/"진열" 잔존 — **0** (전부 매장 랜딩/활용 상품 연결로 재프레이밍).
- bare `Trial` 렌더링 0 (CSV/표시 모두 유통참여형 펀딩).

## 12. 보안 회귀 확인

prod 무인증: `GET /api/trial-shipping/<uuid>` → **401**, `GET /api/trial-fulfillment/stats` → **401**. 이전 핫픽스 유지.

## 13. 브라우저 smoke (후속)

배포 후 운영자 로그인으로 권장:
- 참여자 섹션 랜딩 파이프라인 요약 배지(입금/정산/도입/연결)
- 매장 랜딩 단계 드롭다운 · 활용 상품 연결 배지/버튼
- 매장 랜딩 전환 퍼널 라벨
- "매장 랜딩 자동 확정 안 함" 안내
- CSV export 에 매장랜딩단계·활용상품연결 컬럼 포함
- 모바일 폭 깨짐 없음 · 기존 상태 변경 액션 정상

## 14. V2 후보

`WO-…-STORE-LANDING-TRACKING-V2`: 참여자 store/org FK 연결, 실제 매장 ID/organizationId 저장, 매장 랜딩 완료일·확인자 userId, 랜딩 상태 변경 이력, 제품 개발자용 랜딩 현황 read-only, 후속 주문 Order FK, Event Offer 전환, 매장 피드백 구조화, 랜딩 KPI 카드, 매장별 제품 정산/도입 리포트.

## 15. 제외 범위 (WO §5/§17 준수)

PG/checkout / 자동 결제·정산 / 자동 매장 랜딩 판단 / 포럼 자동 gate / 참여 대상 자동 gate / 공급자 직접 랜딩 명단 노출 / store·org FK 추가 / 후속 주문 FK / Event Offer 연동 / DB·migration / 운영자 심사 체크리스트 영속화 — 모두 **미수행**.

---

*상태: 구현·정적검증·보안 회귀 확인 완료 / 운영자 화면 smoke 후속*
