# Pharmacy 승인·기본 회원 연결 검증

> **상태**: ACTIVE — 개발 검증 완료, PR #903의 최신 HEAD CI·리뷰로 인계 gate 확인
> **작성일**: 2026-10-31 (Asia/Seoul)
> **근거 WO**: [Pharmacy 승인·자동 회원 연결](../work-orders/WO-O4O-PHARMACY-APPROVAL-AUTO-MEMBERSHIP-V1.md)

## 변경과 정책 경계

- 약국 승인/재활성화와 기본 `pharmacy` 사업 가입을 동일 transaction으로 연결한다. 기존 active는 유지하고 pending만 활성화한다. 기존 rejected/suspended/terminated는 보존한다.
- 기존 승인 약국의 누락은 기존 Pharmacy apply POST에서 현행 약국 승인·경영 관계·개인 약사 자격·공통 계정 상태를 확인해 연결한다. 반복/동시 요청은 가입 1건과 연결 감사 1건만 남긴다.
- Pharmacy 기본 연결에 독립 사업용 추가 신청·약관 심사를 중복 요구하지 않는다. 기존 약국 신청 동의는 유지하며 별도 약관·거래 동의를 자동 생성하지 않는다. MegaPharm·CarePharm은 기존 독립 신청을 유지하고 Pharmcoop 개인 가입·권한은 변경하지 않는다.
- Store 신청·사업 목록, Pharmacy 참여/접근 안내를 맞춘다. 선택 약국·URL query/hash·계정 전환의 기존 격리를 유지한다. 운영자 역할·새 role·global membership을 발급하지 않는다.

## 검증

| 항목 | 결과 |
|---|---|
| 빈 격리 PostgreSQL 15 canonical baseline + incremental | 52 prefixes fingerprint PASS |
| API 도메인/원장 회귀 | 30 suites / 263 tests PASS, 별도 DB 환경 미설정 14 suites / 204 tests skipped. 전용 실DB 추가 확장 전 결과이며 아래 13 tests를 별도로 재검증 |
| 전용 실DB 승인·가입 검증 최종 | 14 tests PASS — 동시 실행/멱등, 승인과 연결 원자성, 기본 사업 닫힘 시 rollback, 현행 자격·소속, 기존 제재/탈퇴, 약국 정지·재활성화, 실제 회원 업무 접근, 타 사업 미자동가입, 기존 pending 복구와 감사 ID |
| API type-check | PASS |
| 약국 앱 전체 UI | 23 files / 172 tests PASS |
| Store 신청/협업체 진입 | 2 files / 11 tests PASS |
| Pharmacy Business·Store production build | PASS |
| Pharmacy·MegaPharm desktop/mobile 합성 브라우저 | 4 scenarios PASS — 선택 약국, Pharmacy 즉시 연결·추가 동의 없음, MegaPharm 동의/승인 대기, 기존 active 약국 전환, 탈퇴 후 자동 연결 미노출, query/hash 유지, page error 0·가로 넘침 없음 |

새 API 동작은 실제 PostgreSQL과 기존 서비스/회원 guard로 확인했고 브라우저 API는 합성 fixture다. 운영 실계정의 실제 승인·가입을 수행한 것으로 해석하지 않는다. 스크린샷은 private `.onboarding/pharmacy-auto-shots`에 유지하며 mobile 육안 확인했다.

최초 DB 실행은 canonical 기본 사업 중복 생성으로 setup 실패했다. fixture를 기존 기본 사업 재사용으로 수정하고 재검증했다. 기존 승인 단위 테스트와 UI 테스트는 옛 별도 신청 전제를 보완했고 조건·동의 회귀는 독립 사업에 유지했다. 최초 웹 빌드는 오래된 auth-client/UI 산출물 때문에 실패해 기존 package build를 실행한 뒤 통과했다. 첫 Store build 호출은 잘못된 filter로 미실행이었으며 실제 `store-web`과 `--fail-if-no-match`로 정정해 검증했다. 무관한 소스·의존성·CI 설정 변경 없음.

자동 리뷰에서 TypeORM UPDATE RETURNING의 `[rows, affectedCount]` 형식을 놓친 결함 1건을 확인했다. 기본 회원 연결의 UPDATE를 기존 `rowsOf`로 정규화했다. 기존 승인+pending 가입의 연결 응답과 감사 원장의 실제 membership ID, 승인 시 pending 활성화 감사 ID를 추가 검증해 14 tests PASS. 초기 13개 테스트가 이 반환값·감사 ID까지 확인한 것으로 확대하지 않는다. ESLint 오류 0이며 기존 BusinessWorkspace hook dependency warning 1건은 범위 밖으로 유지했다.

격리 검증 종료 시 합성 사용자 0건을 확인하고 이 작업의 DB 컨테이너·volume·preview를 정리했다. private 재현 스크립트·로그·스크린샷은 저장소 밖 `.onboarding/pharmacy-auto-*`에 유지한다. CI·재리뷰는 [PR #903](https://github.com/Renagang21/o4o-platform/pull/903)의 최신 HEAD를 기준으로 확인하며 main 병합·배포 완료 증거로 대체하지 않는다.

## 운영 반영과 남은 사항

main 병합·auto-merge·운영 DB write·배포는 실행하지 않는다. 새 가입 동작은 통합·배포 후 적용된다. 기존 승인 약국의 일괄 backfill·동의 이력 재작성은 없으며 회원의 연결 확인을 통한 누락 보완 경로를 제공한다. 기존 제재·탈퇴 복구는 운영자의 별도 확인 대상이다.

문서 정합: 사용자 확정에 따라 현행 인증/가입 정본·운영 책임 V2·약국 commerce 설계의 Pharmacy 기본 회원 예외를 반영했다. 다른 사업의 독립 가입 계약과 과거 WO/CHECK 본문은 유지한다. 개발·인계 완료를 운영 적용 완료로 표시하지 않는다.
