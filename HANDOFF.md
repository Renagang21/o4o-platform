# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/clever-bohr-g532hw` · 코드 기준: `main` `fb649107` · 작성: 2026-11-11 (클라우드 작업 세션)
> 다음 실행자: **사용자(IR 검토 · 결정) → 통합 세션(문서 PR 생성 · 병합)**
> 이전 인계 전문: `git show 0c812623:HANDOFF.md`

## 한 일 — O4O Core 중앙화 · 원격 공동개발 접근 경계 조사 (2026-11-11 사용자 지시)

이 branch 의 이전 PR Renagang21/o4o-platform#1002(배포 차단 훅 로컬 ask)는 병합됐다. 그래서 같은 branch 이름을 최신 `origin/main` 에서 다시 시작했다. 이 branch 의 PR 은 **미생성**이다(PR 은 통합 세션이 만든다 — AGENTS.md §4-1(e)).

- 새 문서 [`docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md`](docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md) 하나를 추가했다.
- 조사 전용이다. 코드 · DB · CI · 배포 · GitHub 설정과 기준 문서는 바꾸지 않았다.
- 핵심 결론:
  - 실제 Core 는 api-server 안에 있다. `packages/*-core` 는 이름과 실제가 다르고, 소비처 0 패키지가 9개다.
  - 최상위 `core/` 이동은 비권장이다.
  - Core registry 문서 + CODEOWNERS · `core-change` 라벨로 경계를 표시하는 것을 권한다. 그다음 잔재 제거와 중복 일원화를 하고, api-server `src/core/` 이동은 선택으로 둔다.
  - C(소스 분리)는 지금 하지 않고, 필요하면 프롬프트 · 정책 값의 외부화를 먼저 검토한다.

## PR 로 묶을 단위

- **문서 전용 PR 1개:** `docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md` + 이 HANDOFF.md.

## 결정 사항 (§9)

- 조사 범위가 넓어 4개 영역(Platform · Business · AI · 기타 공통)을 병렬로 조사했다. 보고서 핵심 주장(소비처 0 패키지, `organizations` 이중 매핑, organization-core 의 `role_assignments` 쓰기, FREEZE 문서 경로 부재, `createOrder` 위치, `build:deps` 누락, Skill 0건)은 직접 명령으로 다시 확인했다.
- 정본과 코드의 차이 12건은 CLAUDE.md §16-2 에 따라 보고만 했다. 기준 문서는 수정하지 않았다.

## 검증 결과

- `node scripts/check-doc-sensitive.mjs` — 민감정보 0건.

## 확인하지 못한 것

- 운영 DB 테이블 · 행(`content_assets` · `cosmetics_forum_meta` · `lms_engagement_logs` · `payment_event_logs` · `catalog_products` · `store_products`). LOCAL read-only 조회 대상이다.
- GitHub `@o4o-platform` 조직 · 팀 존재 여부, 개인 소유 Private 저장소의 CODEOWNERS · ruleset 플랜 조건.
- 그 밖의 미확인 항목은 IR §11 「미확인」에 있다.

## 사용자 결정이 필요한 것 (IR §11)

1. 「동결 Core」 정의 일원화 — CORE-FREEZE(api-server 파일) ↔ CLAUDE.md §3(패키지 4개)
2. 공동개발자 저장소 전체 읽기 허용 여부 → C 처리 방식
3. B 강제 수준(라벨 · CODEOWNERS 만 vs ruleset code owner review)
4. `organizations` 이중 매핑 · `PermissionService.assignRole` 처리 방향
5. `catalog_products` · `store_products` 원장 처리
6. Skill 설계 위치

## 겹칠 수 있는 열린 PR

해당 없음(새 문서 1개와 HANDOFF.md 만 바꿈).

## 문서 정합

`발견 12건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건` — 상세는 IR §5 · 「문서 정합」.
