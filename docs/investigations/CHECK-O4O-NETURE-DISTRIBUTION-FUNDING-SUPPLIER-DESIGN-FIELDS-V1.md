# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-SUPPLIER-DESIGN-FIELDS-V1

> WO: `WO-O4O-NETURE-DISTRIBUTION-FUNDING-SUPPLIER-DESIGN-FIELDS-V1` (G5 1차 — 설명·안내 중심)
> 운영 모델 SSOT: `docs/baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md`
> 작성일: 2026-06-06 · 외부표기 유통참여형 펀딩 / 내부 Market Trial (미변경)

## 1. 최종 판정

PASS (구현·정적검증 완료, 브라우저 smoke 후속).

- 공급자 제안/수정/상세/목록/대시보드에 **유통참여형 펀딩 설계 안내** 보강.
- **DB/API/migration 무변경** — 기존 필드 + 안내/도움말/placeholder만 보강(1차 = 설명 중심).
- 운영 모델 SSOT 준수: 참여 제한 gate·포럼 자동 gate·PG/checkout **미추가**, 송금=Neture 운영자 통제 명시.
- tsc(web-neture) PASS. 사용자-facing Market Trial/bare Trial 노출 0.

## 2. 변경 파일 (4 + 문서)

| 파일 | 변경 |
|---|---|
| `pages/supplier/SupplierTrialCreatePage.tsx` | 상단 설계 안내 박스, 매장활용 설계 체크리스트, 결과약속·펀딩구조·목표금액·제품단가·리워드·최대 매장수 도움말 |
| `pages/supplier/SupplierTrialDetailPage.tsx` | 펀딩 구조 섹션에 운영 모델 안내(송금=Neture 운영자, 포럼=제품 개발자) |
| `pages/supplier/SupplierTrialListPage.tsx` | 빈 상태에 설계 안내(목표 매장 수·제품 정산 구조 우선) |
| `pages/supplier/SupplierDashboardPage.tsx` | 유통참여형 펀딩 CTA 카드 설명 보강 |
| (Edit 화면은 CreatePage 를 `mode="edit"` 로 재사용 → 자동 반영) | |
| 본 CHECK (신규) | |

## 3. 적용한 초기 운영 모델 기준

- 참여 신청 제한 없음(누구나) → **제품 개발자 검토·포럼 승인**(사람-게이트). 자동 gate 미추가.
- 참여금(송금)은 **Neture 운영자 수령**·완료자 명단 공유. 온라인 결제 미제공.
- 제품 개발자 = **포럼 운영 주체**(진행/조건/송금 기한/미송금자 처리).
- 시스템 자동화 최소.

## 4. DB/API 변경 여부

**없음.** `CreateTrialPayload`(title/oneLiner/videoUrl/description/salesScenarioContent/outcomeSnapshot/maxParticipants/funding*/trialPeriodDays/targetAmount/trialUnitPrice/rewardRate) 그대로. 기존 필드를 유통참여형 펀딩 맥락으로 **재설명**만 함. 서버/엔티티/migration 무변경.

## 5. 공급자 화면별 변경 내용

- **Create/Edit**: ① 상단 안내 박스(투자형 아님 / 매장 랜딩 목적 / 송금=Neture 운영자 / 제품 개발자 포럼 운영) ② 매장활용 섹션에 설계 체크리스트(목표 매장 수·제품 구성·정산 기준·포럼 운영·송금 기한·미송금자 처리·피드백·실행자료) ③ 결과약속(제품 중심·현금 주의) ④ 펀딩 구조(목표 매장 수 우선·도매가 이하 정산) ⑤ 목표 금액/제품 단가/리워드/최대 매장수 필드 도움말.
- **Detail**: 펀딩 구조 섹션 하단 운영 모델 안내.
- **List**: 빈 상태 설계 안내.
- **Dashboard**: CTA 카드 설명 보강.

## 6. 추가한 설계 안내 항목 (WO §7)

목표 매장 수 / 1인당 권장 참여금액 / 제품 정산 기준(도매가 이하) / 정산 제품 구성 / 포럼 운영 방식 / 송금 기한·미송금자 처리 — 6개 모두 안내·도움말로 반영.

## 7. 필드 설명 기준

| 필드 | 재설명 |
|---|---|
| `targetAmount` | 개발비 전체 아님 · 초기 매장 랜딩 규모 기준 · 운영자 오프라인 송금 목표 |
| `maxParticipants` | 포럼·정산 대상 참여(매장) 수 상한 · 목표 매장 수와 같게/낮게 |
| `trialUnitPrice` | 1인당 권장 참여금액(정산 기준금액) · 온라인 결제 아님 · 오프라인 안내 기준 |
| `rewardRate` | 제품 정산 구성(수량·잔액) 계산 참고값 |
| `outcomeSnapshot`(결과약속) | 제품 정산 중심 · 현금은 투자형 오해 주의 |

## 8. 제품 정산 기준 안내

소비자가가 아니라 **도매 공급가격 또는 그 이하** 기준 권장(펀딩 구조 설명 + 결과약속 도움말 + 매장활용 체크리스트).

## 9. 포럼 운영·미송금자 처리 안내

제품 개발자가 포럼에서 진행/조건/송금 기한 안내, 일정 기간 내 미송금자 포럼 제외 — 상단 안내 박스 + 매장활용 체크리스트 + 상세 운영 모델 안내에 반영.

## 10. Neture 송금 수령 원칙 안내

상단 안내 박스 + 상세 운영 모델 안내 + 제품 단가/펀딩 구조 도움말에 "참여금은 Neture 운영자가 오프라인 수령·명단 공유, 온라인 결제 미제공" 명시.

## 11. TypeScript 결과

| 패키지 | 결과 |
|---|:---:|
| web-neture | ✅ exit 0 |
| api-server / market-trial | 변경 없음 → 미실행(불필요) |

## 12. 검색 검증

- `Market Trial`/`마켓 트라이얼`/`유통 참여형 펀딩`(공백) 사용자-facing 렌더링 — **0** (JSDoc 주석만 잔존).
- 렌더링 bare `Trial` — **0** (JSDoc/JSX 주석만, 본 WO 에서 `{/* 진행 기간 */}` 등 정리).
- 내부 식별자/라우트(`MarketTrial*`, `/market-trial`) 유지.

## 13. 브라우저 smoke (후속)

배포 후 권장:
- 공급자 대시보드 CTA / 목록 빈 상태 / 생성·수정 폼 안내 / 상세 펀딩 구조 안내
- 목표 금액 vs 최대 참여 매장 수 설명 혼동 없는지
- 제품 정산 기준·Neture 송금·포럼 운영·미송금자 처리 안내 노출
- 모바일 폭 안내 박스 깨짐 없음 · 기존 저장/수정 흐름 정상

## 14. 후속 구조화 필드 필요 여부 (V2 후보)

1차는 안내/도움말로 처리. 운영에서 반복 확인되면 구조화 검토(별도 `…-SUPPLIER-DESIGN-STRUCTURED-FIELDS-V2`):
- 목표 매장 수를 `maxParticipants` 와 분리 저장
- 정산 제품 구성 구조화(운영자 조회용)
- 송금 기한 별도 날짜 필드
- 미송금자 처리 기준 구조화
- 도매가 기준 가격 별도 숫자 필드

## 15. 제외 범위 (WO §5 준수)

DB/migration / PG·checkout / 결제·환불 자동화 / 참여 대상 자동 gate / 포럼 자동 gate / 운영자 송금내역 관리 신설 / 매장 랜딩 추적 신설 / 운영자 체크리스트 영속화 / 내부 코드명·라우트 변경 — 모두 **미수행**.

---

*상태: 구현·정적검증 완료 / 브라우저 smoke 후속*
