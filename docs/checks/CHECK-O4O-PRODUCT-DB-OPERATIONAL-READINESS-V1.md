# 상품 DB 관리자 운영 준비 — 검증 V1

2026-10-26 · 개발 완료, main 병합·배포 전

## 문서·코드 대조와 구현

최신 origin/main `5f778c3a18`에서 전용 worktree·branch로 시작했다. 기존 P1/P2·상품별 이력·예약·갱신 연결은 구현·배포된 기능이다. 이번에 반복 구현하지 않고 관측 표시와 독립 실행의 운영 연결 준비를 보완했다.

- 관리자 현황에 성공 기록 없음/유효하지 않음, 5분 이상 지난 성공, 최근 실패, 기한 지난 예약을 구분한다. 기존 snapshot 조회를 사용하며 API·권한·DB 계약을 바꾸지 않는다. 최근 job 성공을 Scheduler 활성화로 표시하지 않는다.
- 로컬 JSON만 읽는 PLAN_ONLY 생성기가 같은 프로젝트·리전의 고정 이미지 digest, 분리된 worker/invoker 계정, Cloud SQL socket, 숫자로 고정한 secret 버전, 실행·timeout 예산과 주기를 검증한다. Job·OAuth Scheduler·IAM 범위의 검토 계획만 출력한다. 클라우드 CLI·네트워크·DB·credential 호출·실행 모드는 없다.
- 실제 Scheduler 생성/중지/활성화, 이미지 존재·IAM·비용·휴면 실행 검증은 운영 연결 단계로 남긴다. 예약 JSON이 스스로 중지 상태를 보장하지 않는다는 점도 안내한다.

## 검증

| 검증 | 결과 |
|---|---|
| 비실행 계획 생성·거부·CLI 검증 node:test | 16 PASS |
| 관리자 상품 DB 영역 Vitest | 6파일 / 48 PASS (신규 표시6개 포함) |
| 실제 PostgreSQL 기존 운영·worker 회귀 | 6 suites / 52 PASS |
| 관리자 TypeScript | PASS |
| 관리자 Vite production build | PASS |
| 변경 코드 ESLint | PASS, 오류·경고0 |
| Chromium 합성 fixture | 1440px / 390px 2 PASS |

DB는 localhost:55441의 이번 전용 correction_review만 사용했다. 실제 기준·변경안·선택 반영·갱신 연결·예약 중복·중단 복구·독립 runner와 50,000개 합성 후보의 기존 회귀를 실행했다. 기존 source-write 보호 검증을 유지했다. 각 suite의 무작위 schema 정리 후 o4o schema0을 확인하고 전용 --rm 컨테이너를 종료했다. 운영 상품/설명/계정/예약 쓰기는 없다.

브라우저는 실제 관리자 작업 공간에 합성 읽기 API만 연결했다. 기준 초안 사용 시 미저장/비활성·목적 보존, 상품별 원문 HTML 비실행, 이력 pagination·작업 링크, 최근 독립 작업/오래된 성공/활성화 미확인 문구를 확인했다. PC·모바일 pageerror0·HTTP 오류0·가로 넘침0이다. 최초 실행은 임시 fixture의 Vite 허용 경로 누락으로 실패했고 /tmp fixture root 허용을 수정한 뒤 두 viewport 최종 PASS다. 제품/배포 설정을 완화하지 않았다.

최초 node:test는 sandbox의 자식 프로세스 EPERM으로 실패했다. 허용된 실행 환경에서 동일 테스트를 재실행해16개 모두 통과했다. 패키지 빌드는 새 worktree 설치 후 정본 절차로 완료했다. 기존 Tailwind glob 경고는 변경하지 않았다.

## 남은 운영 단계와 인계

main 병합·배포·PR CI/Codex는 이 작업에서 실행하지 않는다. 비공개 테스트 계정 정본은 작업/기준 checkout 모두 없어 실계정 로그인 검증을 수행하지 않았다. 합성 검증을 실제 계정 검증으로 보고하지 않는다.

운영 담당은 통합 후 이미지 digest·최소 권한·자원/비용·대상 DB·주기를 확정하고 독립 Job/Scheduler를 연결한다. 서버 휴면 중 예약 처리·실제 실행 이력·최초 후보 점검은 아직 미확인이다. 실제 상품 반영은 관리자가 별도 선택해야 하며 자동 seed/예약/보정은 없다. 외부 AI 연결 담당 영역은 변경하지 않았다.

문서 정합: 현행 guide 2개의 PR #822·#823 미병합 표기를 실제 병합·배포 기록에 맞췄다. 이전 WO/CHECK의 당시 기록과 canonical index/Frozen 본문은 유지했다. 신규 운영 안내에 시작·실패·중지·복구·활성화 전 확인 사항을 모았다.
