# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-OPERATOR-PREAPPROVAL-CHECKLIST-V1

> WO: `WO-O4O-NETURE-DISTRIBUTION-FUNDING-OPERATOR-PREAPPROVAL-CHECKLIST-V1` (G7 운영자 심사 체크리스트 1차)
> 운영 모델 SSOT: `docs/baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md`
> 작성일: 2026-06-06 · 외부표기 유통참여형 펀딩 / 내부 Market Trial (미변경)

## 1. 최종 판정

PASS (구현·정적검증·보안 회귀 확인 완료, 운영자 화면 smoke 후속).

- **승인 전 공개/참여 차단이 코드에 이미 강제됨**을 검증(아래 §4) — 추가 가드 불필요.
- 운영자 승인 화면에 **"승인 전 확인사항" 읽기용 체크리스트(8항목)** + "운영자 승인 후에만 공개·모집" 안내 + 반려 사유 작성 안내 추가.
- 공급자 생성/상세 화면에 **"Neture 운영자 승인 후 공개"** 흐름 안내.
- 운영자 페이지 bare "Trial" 렌더링 정리.
- **DB/API/migration 무변경.** 체크리스트 DB 영속화 없음(읽기용). tsc(web-neture) PASS. 보안 핫픽스 회귀 없음(401).

## 2. 변경 파일 (3 + 문서)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | 승인 전 확인사항 체크리스트 박스(8항목) + 승인 안내 + 반려 사유 작성 안내 + bare Trial 5곳 정리 |
| `services/web-neture/src/pages/supplier/SupplierTrialCreatePage.tsx` | 안내 박스에 "운영자 승인 후 공개·모집 / 반려 시 보완 재제출" 추가 |
| `services/web-neture/src/pages/supplier/SupplierTrialDetailPage.tsx` | 심사 대기 상태 의미(승인 전 비공개 → 승인 후 공개) 보강 |
| 본 CHECK (신규) | |

## 3. 기존 승인 흐름 조사 결과

- 상태 흐름: `draft → submitted(제출) → [운영자 approve] → recruiting(공개·모집)` / `[운영자 reject] → closed`. APPROVED enum은 dead(단일 승인).
- 운영자: 승인 대기 목록(MarketTrialApprovalsPage) + 상세(MarketTrialApprovalDetailPage)에서 `isSubmitted` 일 때만 승인/반려 버튼, 반려는 free-text 사유 모달.
- 공급자: draft→submit flow, 상세에 상태별 NEXT_ACTION 안내(draft=제출 요청, submitted=운영자 심사 중) 기존 존재.

## 4. 승인 전 공개/참여 가능성 검증 (WO §10 — 핵심)

코드 직접 확인:
- **공개 목록** `getTrials`(marketTrialController:339-343): status 파라미터 없으면 `status NOT IN PRE_LAUNCH_STATUSES(DRAFT, SUBMITTED)` → **승인 전(submitted) 공개 목록 미노출**. ✅
- **참여(join)** `joinTrial`(:565): `JOINABLE_STATUSES = [RECRUITING]` 아니면 거부 → **승인 전 참여 불가**. ✅
- **승인/반려 버튼**: 운영자 상세에서 `isSubmitted` 일 때만 노출. ✅
- 공급자/운영자 확인용 상세 접근(`GET /:id`)은 가능(의도된 동작).

→ **승인 전 공개·참여 차단은 이미 충족.** 본 WO 는 가드 변경 없이 안내·체크리스트 보강만. (가드 코드 자체는 무변경)

## 5. 공급자 화면 변경 내용

- 생성/수정 상단 안내 박스: "제출한 제안은 **Neture 운영자 승인 후에만 공개·모집**됩니다(투자형 오해·송금 흐름·정산 선택권·제품 정산 조건·포럼 운영 방식 확인). 반려 시 보완 후 재제출."
- 상세 심사 대기(submitted): "Neture 운영자 심사 후 승인되면 공개·모집. **승인 전에는 참여자에게 공개되지 않습니다.** 보완 안내 가능."

## 6. 운영자 체크리스트 내용 (읽기용, DB 미저장)

승인 버튼 위 "승인 전 확인사항" 박스 + 8항목(☐):
1. 투자형 표현(지분·배당·이자·원금 보장·확정 수익) 없는가
2. 송금은 Neture 운영자 수령 구조와 맞는가(제품 개발자 직접 수령 아님)
3. 참여자 제품/수익 정산 선택권과 충돌 없는가(제품 정산 선택자만 매장 랜딩 추적)
4. 제품 정산 조건·정산 제품 구성·기준 가격 설명되어 있는가
5. 포럼 운영 방식·송금 기한·미송금자 처리 기준 설명되어 있는가
6. 제품 제공 지연/불가 시 안내 기준 있는가
7. 표시·광고·인증 위험(규제 품목) 커 보이지 않는가
+ "승인하면 공개·모집 전환" 안내, 반려 모달에 "보완 필요 부분 구체 작성" 안내.

## 7. 투자형 오해 방지 / 8. 송금 흐름 / 9. 정산 선택권 / 10. 포럼 운영 — 체크리스트 §6 1·2·3·5 항목으로 반영

- 심사 목적 명시: "제품 성공 가능성 보증이 아니라, 투자형 오해 방지·송금 흐름·정산 선택권·포럼 운영 가능성·제품 제공 위험 확인하는 **최소 운영 심사**."
- 정산 선택권(SSOT §3-A): 제품 정산 선택자만 매장 랜딩 추적 — 체크리스트 3번에 명시.

## 11. DB/API/migration 변경 여부

**없음.** 승인/반려 로직·라우트·상태머신·공개 목록 가드 **무변경**(이미 충족). 체크리스트는 **읽기용**(DB 미저장). 프론트 안내 텍스트만 추가.

## 12. TypeScript 결과

| 패키지 | 결과 |
|---|:---:|
| web-neture | ✅ exit 0 |
| api-server / market-trial | 변경 없음 → 미실행 |

## 13. 검색 검증

- `Market Trial`/`마켓 트라이얼`/`유통 참여형 펀딩`(공백) 사용자-facing 렌더링 — **0**(JSDoc 주석만).
- 운영자 페이지 bare `Trial` 렌더링 — **0**(Trial 기간→진행 기간, Trial 진행 관리/상태 전환/반려/상태 변경 실패 → 유통참여형 펀딩).

## 14. 보안 회귀 확인

prod 무인증: `GET /api/trial-shipping/<uuid>` → **401**, `GET /api/trial-fulfillment/stats` → **401**. 이전 핫픽스 유지.

## 15. 브라우저 smoke (후속)

배포 후 운영자 로그인으로 권장:
- 승인 대기 상세 → "승인 전 확인사항" 체크리스트 박스 노출(submitted 상태)
- 승인/반려 버튼 + 반려 모달 사유 작성 안내
- 승인 후 공개·모집 전환
- 공급자: 생성 안내 박스 "승인 후 공개" / 상세 심사 대기 안내
- (확인) 승인 전 공개 목록·참여 차단(정적 검증 완료, 가능하면 라이브)
- 모바일 폭 깨짐 없음

## 16. V2 후보

`WO-…-OPERATOR-PREAPPROVAL-CHECKLIST-V2`: 체크리스트 항목 DB 저장, 승인자 userId·승인 시각, 승인 근거 메모, 반려 사유 구조화, 보완 요청 상태, 승인 이력/감사 로그, 규제 품목 체크 필드, 제품 제공 가능성 확인 자료 첨부, 운영자 승인 리포트.

## 17. 제외 범위 (WO §16 준수)

제품 성공 가능성 보증 / 투자 가치 판단 / PG·checkout / 자동 송금·정산 / 포럼·참여 자동 gate / 매장 랜딩 자동 확정 / 체크리스트 DB 영속화 / 승인 이력 신규 테이블 / 법률 심사 자동화 — 모두 **미수행**.

---

*상태: 구현·정적검증·보안 회귀 확인 완료 / 운영자 화면 smoke 후속*
