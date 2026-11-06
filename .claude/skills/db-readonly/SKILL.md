---
name: db-readonly
description: 운영 DB read-only 조회 (데스크톱 로컬 세션 전용) - 지시서의 SELECT 를 Cloud SQL Proxy 로 실행하고 결과를 마스킹해 기록한다. write · DDL · migration 은 하지 않는다.
---
운영 DB 를 **읽기 전용**으로 조회한다. 접속 절차 · 포트 · 계정의 정본은 `SETUP.md` §2-2 · §3 · §4 이고, 승인 경계는 `AGENTS.md` §5 다.

1. 세션 유형 확인
   - `CLAUDE_CODE_REMOTE=true`(클라우드 세션)이면 실행하지 않는다. 운영 DB 접속 수단이 없다 — `/wo-new` 로 `실행 위치: LOCAL` 지시서를 만들어 넘긴다.
2. 실행할 SQL 확정
   - 지시서(`docs/work-orders/`)나 사용자 메시지에 있는 SQL 만 실행한다. 새로 짠 쿼리는 실행 전에 보여준다.
   - **`SELECT` · `EXPLAIN`(ANALYZE 없이) · 카탈로그 조회만.** `INSERT` · `UPDATE` · `DELETE` · `MERGE` · `TRUNCATE` · `CREATE` · `ALTER` · `DROP` · `GRANT` · `COPY ... FROM` · 함수 호출로 상태를 바꾸는 문이 섞여 있으면 멈추고 보고한다.
   - 가능하면 세션을 `SET default_transaction_read_only = on;` 으로 시작하고, 대용량 테이블은 `LIMIT` 을 붙인다.
3. 접속
   - Cloud SQL Proxy 기동과 `psql` 실행은 `.claude/settings.json` ask 대상이다. ask 명령을 다른 명령과 `;` · `&&` · `|` 로 묶지 않는다.
   - 실제 host · password · 계정값을 화면 출력 · 문서 · 커밋에 남기지 않는다(secret 이름만).
4. 결과 기록
   - 원문(제목 · 이메일 · 이름 · 사업자명 · URL · 응답 원문)을 옮기지 않는다. 날짜 · 상태 · 건수 · 비율로 요약한다(`DOCUMENT-LIFECYCLE` §10-4).
   - 지시서의 판정 기준대로 결론을 적고, 같은 작업 branch 의 WO 결과 절 또는 CHECK 에 기록한다.
   - `node scripts/check-doc-sensitive.mjs` 확인 → path-specific commit → push → `/handoff` 로 다음 실행자(CLOUD) 지정.
5. write 가 필요하다고 판단되면 실행하지 않고, 대상 · 건수 · dry-run 결과 · 되돌리는 방법을 정리해 사용자 명시 승인을 요청한다. migration 은 CI/CD 자동 적용이 원칙이다(`PRODUCTION-MIGRATION-STANDARD`).
