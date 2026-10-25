# O4O 상품 관리 통합·운영 배포 검증 V1

> **상태**: COMPLETE — 기능 코드 main 병합·운영 배포 확인
> **검증일**: 2026-10-24 (Asia/Seoul)
> **범위**: 기존 상품 설명 정책 정합, 관리자 보정 환경, 기획안, 수동 정기 운영 및 리뷰 수정 전체
> **운영 안내**: [상품 보정 작업 공간](../guides/products/O4O-ADMIN-PRODUCT-CORRECTION-WORKSPACE-V1.md)

## main 반영

- [PR #800](https://github.com/Renagang21/o4o-platform/pull/800): 변경 63개 파일 전체 MERGED.
- main 병합 SHA: `355d77e861a1f4bf5f382decb8f3fc7811e73576`.
- 최종 작업 HEAD: `ef83f80e0b3bcb7c24a206dae747dc2ab3487cfa`.
- 기존 push `806208ff0a`, `10d1dc6a7f`, `f6274e9ca9`, `d06d243c73`과 리뷰·CI 수정 commit이 모두 main의 ancestor임을 확인했다. 최종 작업 HEAD와 병합 직후 main의 파일 tree가 동일하다.
- 최신 main을 작업 브랜치에 통합하고 PR로 병합했다. main 직접 push·force push·required check 우회 없음.

## 검증·리뷰

- [PR CI](https://github.com/Renagang21/o4o-platform/actions/runs/40100643281) 및 [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/40101634512): CI Gate 포함 SUCCESS. API 3개 분할, 코드 품질·타입·관리자·영향 웹 빌드 통과. CodeQL도 통과.
- 리뷰 지적 5건 해결: 통합 테스트 정리 누락, 건강기능식품 코드, 기존 한글 상품군 별칭 누락, 제품 치료 효과 관형형 검수, QR 강조점 변경 시 근거 입력 손실.
- 실행 코드 `b676e9977f`의 Codex 리뷰는 추가 지적 없음. 이후 최종 HEAD의 변경은 계약 테스트 2개뿐이며 88개 테스트로 확인했다. 병합 시 최종 테스트 변경의 추가 리뷰 표시는 진행 중이었고 미해결 thread는 0건이었다.
- 초기 CI shard 3 실패를 로컬 동일 분할로 재현했다. 두 과거 계약 spec의 직접 패널 구조·폐기된 일괄 금지 문구 기대 7건이 원인이었다. 위임 경로의 공통 prompt·외부 LLM 연결과 내부 API/자동 저장·QR 금지 검사를 유지하면서 현재 계약에 맞췄고 88개 통과 후 전체 CI도 통과했다.
- 격리 PostgreSQL 통합 테스트: 8개 통과. 테스트 전용 무작위 schema를 사용하고 assertion 실패 시에도 finally에서 자체 객체를 정리·연결 종료하도록 수정했다. 동일 DB 연속 실행 2회 통과, 잔존 테스트 schema 0건 확인 후 세션 전용 container를 제거했다.
- 상품 원본 쓰기 금지 trigger와 전후 내용 비교, 동시 선택·원문 충돌·검토일·재확인일·과거 이력·중단 실행 경합을 검증했다. 추가 근거 검수·기존 별칭 관련 focused 테스트 53개, 관리자 UI 12개, 설명 입력·QR 편집 상태 보존 4개도 통과했다.
- 앞선 PC/모바일 합성 fixture 1440px/390px에서는 페이지 오류·가로 넘침 없이 저장·재개·재사용·재시도 흐름을 확인했다.

## 운영 배포

[Delivery 실행](https://github.com/Renagang21/o4o-platform/actions/runs/40102378955)은 target `355d77e861a1f4bf5f382decb8f3fc7811e73576`에 대해 SUCCESS다. main CI 완료 후 일반 LEVEL 2 자동 배포 경로로 API → 의존 관리자·웹 순서로 실행됐다. 새 migration·freeze 변경·배포 workflow 변경은 없다.

| 대상 | 결과 |
|---|---|
| API (`o4o-core-api`) | 배포·verified 전환 성공 |
| 관리자 (`o4o-admin-dashboard`) | 배포·verified 전환 성공 |
| Neture 웹 | 배포·verified 전환 성공 |
| KPA-Society 웹 | 배포·verified 전환 성공 |
| Lecture 웹 | 배포·verified 전환 성공 |
| Store 웹 | 배포·verified 전환 성공 |
| KPA-Branch 웹 | 배포·verified 전환 성공 |

최종 Report(serving SHA · commit status) job도 SUCCESS이며, commit status `production`은 `success`, 설명은 `DEPLOYED · deploy: api,admin,neture,kpa-society,lecture,store,kpa-branch`다. Report는 실행 시점의 Cloud Run serving SHA를 다시 읽어 target 일치를 확인하는 기존 경로를 사용한다. 배포 범위는 위 7개 서비스다.

## 배포 후 읽기 전용 확인

- API `/health/ready`: HTTP 200, ready.
- 관리자 `/admin/o4o-product-db/maintenance` 및 Neture·Pharmacy·Study·Store 공개 진입: HTTP 200.
- 신규 `/api/v1/admin/o4o-product-db/correction/operations`: 배포 전 404 → 배포 후 인증 없는 요청 401. 실제 관리자 데이터 조회·저장 검증을 뜻하지 않는다.
- 관리자 배포 JS `ProductDbMaintenancePage-DxiYDZzK.js`: HTTP 200, 새 상품 보정 작업 공간 포함.
- 공유 JS `ProductCorrectionOperations-B5ac2_A_.js`: HTTP 200, 수동 정기 관리 현황 포함.
- 분회 웹의 개별 공개 도메인 smoke는 수행하지 않았다. 해당 서비스는 Delivery의 verified 배포·서빙 SHA 검증 결과로 확인했다.
- 운영 실계정 로그인·상품 보정·관리 기준/작업 생성·원본 변경은 수행하지 않았다. 예약 점검·상품 원본 반영·외부 AI 실행은 여전히 후속 범위다.

이 기록과 운영 안내의 배포 상태 변경은 문서만의 후속 반영이다. 위 runtime SHA를 다시 배포하거나 데이터 보정을 실행하는 작업이 아니다.
