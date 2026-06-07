# CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-SMOKE-DATA-FLOW-V1

> 실제 smoke 데이터 1건으로 유통참여형 펀딩 운영 루프 검증 (prod). 운영 모델 SSOT: `docs/baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md`
> 검증일: 2026-06-07 · api.neture.co.kr · 쿠키 인증 API 흐름

## 최종 판정: PASS

운영 루프(생성→제출→승인 전 차단→승인→공개→참여→입금 확인→정리) **전 단계 정상 동작**. 검증 중 CSV export 500(한글 제목 Content-Disposition) 발견 → 수정(`627bb62dc`) → **배포 후 export 재확인 PASS**(200 + 전 컬럼 정상).

## 검증 방식

SPA UI는 httpOnly 쿠키 + localStorage Bearer 라 자동화로 화면 토큰 확보가 어려워, **쿠키 인증 API 호출로 데이터/상태 흐름을 검증**(역할별 재로그인: supplier→operator→participant→operator). 화면 컴포넌트(체크리스트·입금 관리·랜딩 배지)는 직전 정적 검증(tsc/검색/코드) 유지.

## smoke 데이터

- 펀딩: `[SMOKE] 유통참여형 펀딩 운영 루프 테스트` (id `cf6cdc98-69a1-49ef-9628-76a7f882c9b1`)
- 공급자(생성): renagang21 (neture:supplier) / 참여자: sohae21 / 운영자: sohae2100
- 정리: 최종 status `closed` (모집 종료). [SMOKE] 표기 유지.

## 단계별 결과

| 단계 | 결과 |
|---|---|
| 생성 + 제출 | ✅ 201 / submit 200 → status `submitted` |
| 승인 전 공개 차단 | ✅ 공개 목록 미노출(0건) |
| 승인 전 참여 차단 | ✅ join 400 "Trial is not accepting participants" |
| 운영자 승인 | ✅ 200 → `recruiting`, "Now recruiting" |
| 승인 후 공개 | ✅ 공개 목록 노출(1건) |
| 참여 신청 | ✅ join 201, rewardType=product |
| 운영자 입금 확인 | ✅ payment-status→paid 200, paidAmount 5000 반영 (참여자 paymentStatus=paid) |
| CSV export | ✅ (수정 배포 후 재확인) 200, 컬럼 전체 정상 — 입금상태/입금확인금액/입금확인일/입금참조/정산선택/정산상태/매장랜딩단계/활용상품연결/유통참여형 펀딩 제목/상태. 데이터: 입금 확인 완료·5,000원·[SMOKE]-ref. bare Trial 0. (500 버그 `627bb62dc` 수정) |
| 상태 정리 | ✅ development→outcome_confirming→fulfilled→closed 전부 200 |
| 보안 401 | ✅ 무인증 trial-shipping/fulfillment-stats 401 (직전 확인) |

## 발견 이슈

1. **CSV export 500 (한글 제목)** — `exportParticipantsCSV` 의 `Content-Disposition` 파일명에 한글 포함 → Node ERR_INVALID_CHAR. **실운영 export 전부 깨짐**(모든 실 펀딩 제목이 한글). → 수정 완료(`627bb62dc`), 배포 후 라이브 재확인 필요.

## 결론

승인 전 비공개·참여 차단, 승인 후 공개, 참여, 운영자 오프라인 입금 확인까지 **운영 루프가 실제 데이터로 동작 확인**. CSV는 수정 배포 후 재확인하면 PASS 고정 가능. 화면 컴포넌트 라이브 렌더는 SPA 토큰 제약으로 미확인(정적 검증 유지).

---

*상태: PASS — 운영 루프 + CSV export(수정 후) 전 단계 확인. 유통참여형 펀딩 초기 운영 가능 상태.*
