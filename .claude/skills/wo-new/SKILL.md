---
name: wo-new
description: 작업요청서(WO) 작성 - docs/work-orders/ 에 표준 헤더(상태 · 실행 위치 · 인계)와 TODO · 문서 정합 칸을 갖춘 지시서를 만든다. 클라우드 ↔ 로컬 세션 인계용 지시서(운영 DB read-only SQL 포함)도 이 스킬로 쓴다.
---
작업요청서를 새로 만든다. 규칙 원문은 `docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md` §6 · §10 이다. 여기에 다시 쓰지 않고 그 절을 따른다.

1. 이름 · 위치
   - `docs/work-orders/WO-O4O-<주제>-V1.md`. 같은 주제의 기존 WO · TODO 가 있으면(`ls docs/work-orders | grep -i <키워드>`) 새로 만들지 말고 그 문서에 절을 추가할지 먼저 묻는다.
   - 파일명에 상태 · 회차(`-FINAL-` · `-R2-` 등)를 넣지 않는다(§10-5).
2. 헤더 — §6 형식 + §10-6 두 줄:

   ```markdown
   # <제목>

   > **상태**: DRAFT
   > **작성일**: YYYY-MM-DD · **최종 갱신**: YYYY-MM-DD
   > **실행 위치**: CLOUD | LOCAL | BOTH
   > **인계**: <작업 branch> · <commit SHA 또는 "push 전"> · 다음 실행자 CLOUD | LOCAL
   > **근거**: <사용자 확정 · 선행 WO/IR>
   ```

   - 상태는 §2 6종만. 실행 대기 · 진행은 `ACTIVE`, 끝나면 `COMPLETED`.
3. 본문 골격: 배경(현재 코드 · 정본 대조 결과) → 사용자 확정 → 설계 판단(결정 · 근거 표) → 범위 밖 → TODO(체크박스, BOTH 면 항목마다 `[CLOUD]` · `[LOCAL]`) → 검증 계획.
4. LOCAL 단계가 있으면 실행할 SQL 을 WO 안에 적는다.
   - read-only 는 `SELECT` 만. 제목 · 이메일 · 이름 같은 원문 대신 날짜 · 상태 · 건수를 고르는 쿼리로 쓴다.
   - 결과로 무엇을 판정하는지(어느 결과면 원인 A, 어느 결과면 B)를 함께 적는다.
   - write · DDL 이 필요하면 별도 단계로 분리하고 "사용자 명시 승인 필요"를 적는다(`AGENTS.md` §5).
5. 저장 전 `node scripts/check-doc-sensitive.mjs` 로 민감정보를 확인한다(`AGENTS.md` §5 · Public 저장소).
6. 인계가 필요하면 작업 branch 에 path-specific commit · push 하고 `/handoff` 로 `HANDOFF.md` 에 지시서 경로와 다음 실행자를 적는다. PR 은 `/handoff` 가 만든다 — 남은 실행(LOCAL 조회 등)이 있으면 드래프트로 둔다(`AGENTS.md` §4-1(e)).
