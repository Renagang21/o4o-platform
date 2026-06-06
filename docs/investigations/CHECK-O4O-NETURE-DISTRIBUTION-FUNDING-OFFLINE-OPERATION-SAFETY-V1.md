# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-OPERATION-SAFETY-V1

> WO: `WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-OPERATION-SAFETY-V1`
> 선행 IR: `IR-O4O-NETURE-DISTRIBUTION-FUNDING-FUNCTIONAL-COMPLETENESS-AUDIT-V1`
> 작성일: 2026-06-06 · 외부표기 유통참여형 펀딩 / 내부 Market Trial (미변경)

## 1. 최종 판정

PASS (구현·정적검증 완료, 배포 후 라이브 보안 curl 후속).

- **보안(G1)**: `trial-shipping`·`trial-fulfillment` 무인증 라우터에 인증 + 참여 당사자/운영자 권한 검사 적용.
- **오프라인 운영 고지(G2)**: 참여 상세·내 참여 내역·운영자 결제관리에 오프라인 입금/정산 안내 + 투자형 아님 고지 추가.
- **bare Trial(G9)**: 사용자-facing 렌더링 영어 "Trial" → "유통참여형 펀딩"(일부 "진행 기간") 정리.
- **G4 재분류**: PG/checkout 미연결은 결함이 아니라 오프라인 운영 방침상 **장기 보류**로 IR 갱신.
- PG/checkout/DB/migration **무변경**. tsc 2/2 PASS.

## 2. 변경 파일 (13 + 문서)

### 보안 (api-server, 4)
- `extensions/trial-shipping/trialShipping.controller.ts` — `requireOwnerOrOperator` 가드 추가
- `extensions/trial-shipping/trialShipping.routes.ts` — POST/GET 에 `authenticate` + 소유권 가드
- `extensions/trial-fulfillment/trialFulfillment.controller.ts` — `requireOwnerOrOperator` 가드 + 운영자 스코프
- `extensions/trial-fulfillment/trialFulfillment.routes.ts` — GET=인증+소유권 / 운영 액션=인증+운영자 스코프

### 오프라인 운영 고지 + bare Trial (web-neture, 8)
- `pages/market-trial/MarketTrialDetailPage.tsx` — 참여 섹션에 오프라인 운영 + 투자형 아님 고지
- `pages/market-trial/MyParticipationsPage.tsx` — 오프라인 입금/정산 안내 + bare Trial
- `pages/operator/MarketTrialApprovalDetailPage.tsx` — 결제관리 섹션에 오프라인 운영 기준 문구
- `pages/supplier/SupplierDashboardPage.tsx` · `SupplierTrialCreatePage.tsx` · `SupplierTrialListPage.tsx` · `SupplierTrialEditPage.tsx` · `SupplierTrialDetailPage.tsx` — bare Trial 정리

### 문서 (2)
- `IR-…-FUNCTIONAL-COMPLETENESS-AUDIT-V1.md` — G4 운영 보류 재분류
- 본 CHECK (신규)

## 3. 보안 핫픽스 내용

IR 발견: `register-routes.ts:379/385` 에서 두 라우터가 **인증 미들웨어 없이** 마운트, 라우터 내부에도 인증 0 → `participationId` 만으로 배송지(PII) 조회/수정·주문 생성 가능 (Boundary §7 위반).

해소: 두 라우터의 모든 endpoint 에 인증 + 권한 검사 추가. 핵심 매핑 = **`MarketTrialParticipant.participantId === req.user.id`** (참여 당사자 식별).

## 4. 적용한 인증/권한 규칙

| Endpoint | 가드 | 허용 대상 |
|---|---|---|
| `POST /api/trial-shipping/:participationId` | `authenticate` + `requireOwnerOrOperator` | 참여 당사자 또는 Neture 운영자 |
| `GET /api/trial-shipping/:participationId` | `authenticate` + `requireOwnerOrOperator` | 참여 당사자 또는 운영자 |
| `GET /api/trial-fulfillment/:participationId` | `authenticate` + `requireOwnerOrOperator` | 참여 당사자 또는 운영자 |
| `GET /api/trial-fulfillment/stats` | `authenticate` + `requireNetureScope('neture:operator')` | 운영자 전용 |
| `POST .../:participationId/init` | `authenticate` + 운영자 스코프 | 운영자 전용 |
| `POST .../:participationId/create-order` | `authenticate` + 운영자 스코프 | 운영자 전용 |
| `POST .../:participationId/sync-status` | `authenticate` + 운영자 스코프 | 운영자 전용 |
| `POST .../:participationId/complete` | `authenticate` + 운영자 스코프 | 운영자 전용 |

`requireOwnerOrOperator`: 인증 없으면 401 → participation 없으면 404 → `participantId===user.id` 면 통과 → 아니면 `requireNetureScope('neture:operator')` 로 위임(운영자만 허용, 그 외 403). **participationId 단독 PII 접근 차단.**

## 5. 오프라인 운영 고지 적용 위치

- **참여 상세**(MarketTrialDetailPage) 참여 신청 섹션 상단: "참여금 확인·제품 정산은 Neture 운영자가 별도 안내·확인, 온라인 결제 미제공, 참여 후 오프라인 진행" — 전 참여 상태에서 노출.
- **내 참여 내역**(MyParticipationsPage) 헤더 하단: "참여금 입금 확인·제품 정산 상태는 Neture 운영자가 오프라인 확인 후 반영, 온라인 결제 미제공."
- **운영자 결제관리**(MarketTrialApprovalDetailPage): "초기 유통참여형 펀딩은 온라인 결제 없이 운영자가 오프라인 입금 확인·제품 정산 상태 관리" (기존 "PG 미연동 — 수기 송금 확인 위주" 부제 보강).

## 6. 투자형 아님 고지 적용 위치

- 참여 상세 참여 섹션 고지 박스 하단: "유통참여형 펀딩은 금융투자 상품이 아닙니다. 참여자는 주식·채권·배당·이자·원금 상환 같은 금융적 권리를 받지 않으며, 프로그램 조건에 따라 제품 정산과 초기 참여 혜택을 받습니다."

## 7. bare Trial 정리 결과

| 파일 | 변경 |
|---|---|
| MyParticipationsPage | "Trial 보기 →" → "유통참여형 펀딩 보기 →" |
| SupplierDashboardPage | "Trial 생성하기"/"Trial 관리" → "유통참여형 펀딩 …" |
| SupplierTrialCreatePage | "Trial 기간(일)" → "진행 기간(일)", 메시지 "Trial이/생성" → "유통참여형 펀딩 …" |
| SupplierTrialListPage | "등록된 Trial이 없습니다"/"Trial 등록하기" → "유통참여형 펀딩 …" |
| SupplierTrialEditPage | "초안 상태의 Trial만"/"Trial을 불러오지 못했습니다" → "유통참여형 펀딩 …" |
| SupplierTrialDetailPage | 9곳 ("다음 Trial을"/"Trial이 종료"/"내 Trial 목록"/"이 Trial 수정하기"/"새 Trial 등록" 등) → "유통참여형 펀딩 …" |

잔존: 코드 주석의 "Market Trial"/내부 식별자(`MarketTrial*`, 라우트 `/market-trial`)는 유지(WO 허용).

## 8. TypeScript 결과

| 패키지 | `tsc --noEmit` |
|--------|:---:|
| api-server | ✅ exit 0 |
| web-neture | ✅ exit 0 |

## 9. API 보안 테스트

### 배포 전 baseline (취약점 입증, 2026-06-06)
무인증 요청 (인증 헤더 없음, 랜덤 participationId):
- `GET /api/trial-shipping/<uuid>` → **404** (인증 게이트 없이 핸들러 도달 — 실제 id면 PII 반환됨)
- `GET /api/trial-fulfillment/<uuid>` → **404** (동일)
- `GET /api/trial-fulfillment/stats` → **200** (통계 무인증 노출)

### 배포 후 기대 (라이브 curl 후속)
- 위 3개 무인증 요청 → **401**
- 타인 participationId 접근(인증 O, 소유자/운영자 X) → 403
- 본인 participation shipping 조회/수정 → 200
- 운영자 fulfillment 운영(init/create-order/complete) → 200, 비운영자 → 403

## 10. 검색 검증

- `rg "Market Trial|마켓 트라이얼|유통 참여형 펀딩" services packages apps` — 사용자-facing 렌더링 0 (주석/식별자/라우트만 잔존).
- 렌더링 bare "Trial" (market-trial/supplier/operator pages) — **0** (주석 1건 `Market Trial 목록`만 유지).

## 11. 제외 범위 (WO §4 준수)

PG 연동 / checkoutService / 온라인 결제 생성·환불 자동화 / DB·migration / 공급자 제안 필드 확장 / 참여 대상 제한 gate / 매장 랜딩 추적 / 운영자 체크리스트 영속화 / 제품 정산 자동화 — 모두 **미수행**.

## 12. 후속 과제

- (배포 후) 라이브 보안 curl 로 401/403 확인.
- IR 우선순위 후속: G3 참여 대상 제한 → G5 공급자 설계 필드 → G6 매장 랜딩 추적 → G7 운영자 심사. G4(PG)는 장기 보류.

---

*상태: 구현·정적검증 완료 / 배포 후 라이브 보안 curl 후속*
