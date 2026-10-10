# O4O 문서 안내

> **상태**: ACTIVE
> **작성일**: 2026-08-06 · **최종 갱신**: 2026-10-03
> **근거 WO/IR**: WO-O4O-DOCS-ONBOARDING-ENTRY-V1 · [IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1](investigations/IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1.md)

이 폴더에는 문서가 수천 개 있지만 **대부분은 과거 작업 기록이다.** 처음 참여한다면 아래 경로만 읽으면 된다. 나머지는 필요한 순간에 찾아본다.

---

## 1. 처음 참여하는 사람의 독서 경로

| 순서 | 문서 | 얻는 것 |
|---:|---|---|
| 1 | [`/README.md`](../README.md) | 저장소 구성 · 기술 스택 · 주요 명령 · 기여와 Production 변경 원칙 |
| 2 | [`development/COLLABORATOR-START-HERE.md`](development/COLLABORATOR-START-HERE.md) | O4O 를 보는 관점 · 저장소 읽는 법 · 첫 작업 대상 · Production 경계 |
| 3 | [`refactoring/status.md`](refactoring/status.md) | 지금 무엇이 정리되었고 무엇이 아직 legacy 인가 |
| 4 | [`/SETUP.md`](../SETUP.md) | 로컬 개발환경 · 검증 명령 · CI 게이트 |
| 5 | [`services/README.md`](services/README.md) → 담당 서비스의 정본 | 서비스 목록과 서비스별 기준 문서 |

정책이나 경계를 판단해야 할 때는 [`CANONICAL-INDEX.md`](CANONICAL-INDEX.md)(정본 지도)를 연다. 표에 없는 문서는 정본이 아니다.

AI 코딩 에이전트는 [`/CLAUDE.md`](../CLAUDE.md) 또는 [`/AGENTS.md`](../AGENTS.md) 가 진입점이다.

Admin 운영 기능을 직접 확인할 때는 [Google 로그인·SMTP 발송·AI 호출 테스트](guides/admin/ADMIN-OPERATIONS-SMOKE-TEST.md)를 참고한다.

---

## 2. 이 폴더의 두 종류 문서

### 기준 문서 — 현재 판단의 근거

| 폴더 | 내용 |
|---|---|
| `baseline/` | 사업 · 정책 정본, Frozen baseline, 운영 절차(`baseline/operations/`) |
| `architecture/` | 구조 설계 · Domain Boundary · Guard Rules |
| `rbac/` | 권한 정본 · 역할 카탈로그 · runbook |
| `platform/` | 공통 기능(Content · LMS · HUB · Navigation · Operator 대시보드 · Debug) |
| `rules/` | 거버넌스 규칙(문서 생명주기 · Design Core 등) |
| `guides/` | 콘텐츠 저작 규칙. 진입점 [`guides/common/DOCUMENT-INDEX.md`](guides/common/DOCUMENT-INDEX.md) |
| `services/` | 서비스 색인 · Core APP 정의 |
| `development/` · `refactoring/` | 협업 진입 · 리팩토링 현황 |
| `adr/` · `decisions/` | 의사결정 기록 (두 폴더는 역할이 겹친다 — 통합 예정) |
| `reference/` · `design/` · `templates/` · `runbooks/` · `registries/` | 참조 · 설계 · 템플릿 · 실행 절차 |

이 안에서도 **정본 여부와 상태는 [`CANONICAL-INDEX.md`](CANONICAL-INDEX.md) 가 정한다.** 폴더에 있다는 사실만으로 현행 기준이 되지 않는다.

### 작업 기록 — 과거 시점의 실행 증적

| 폴더 | 내용 |
|---|---|
| `work-orders/` | 작업요청서(WO) |
| `checks/` | 검증 · 완료 기록(CHECK) |
| `investigations/` · `ir/` | 조사 기록(IR) |
| `archive/` | 완료 · 폐기된 기록 |
| `kpa/` · `neture/` · `cosmetics/` · `event-offer/` · `market-trial/` · `audits/` · `data-audits/` · `handoffs/` | 서비스별 · 주제별 과거 조사 기록 |

- 기록은 **그 시점의 사실**이다. 현재 정책을 이기지 않으며, 새로 참여한 사람이 순서대로 읽을 대상이 아니다.
- 파일명 prefix(WO · CHECK · IR)와 폴더가 일치하지 않는 경우가 많다.
- 코드 주석이 `WO-…` · `CHECK-…` 식별자를 인용하면, 그 이름으로 검색해 해당 기록을 찾는다.

### 데이터 자산은 여기 두지 않는다

스크립트가 읽고 쓰는 데이터는 `docs` 밖에 있다 (2026-10-03 분리).

| 데이터 | 위치 |
|---|---|
| 상품 설명 산출물 (HTML · JSON · 배치별 근거 메모) | `apps/api-server/src/scripts/data/product-descriptions/` |
| 검증 · 적용 스크립트의 입출력 JSON | `apps/api-server/src/scripts/data/check-data/` |
| 조사용 샘플 데이터 | `apps/api-server/src/scripts/data/investigation-samples/` |
| 테스트 fixture | 테스트 옆 `__tests__/fixtures/` |

상품 설명의 **저작 규칙 문서**는 그대로 `guides/products/` 에 있다.

### 로컬 전용

`local/*.local.md` 는 git 에 올라가지 않는다(테스트 계정 등). 이 저장소는 **Public** 이므로 비밀번호 · 실제 개인정보 · 운영 계정값은 어떤 문서에도 쓰지 않는다.

---

## 3. 문서를 새로 쓸 때

- 상태 · 헤더 · archive 규칙: [`rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md`](rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md)
- 작업이 끝나면 결과를 **정본 문서에 반영**한다. WO · CHECK 는 정본이 아니다.
- 기존 문서를 일괄 이동 · 삭제 · rename 하지 않는다. 문서 링크와 코드 주석이 경로와 이름을 참조한다.

---

## 4. 문서 정비 진행 상황

2026-10 부터 단계적으로 정비 중이다. 현황과 수치는 [census IR](investigations/IR-O4O-DOCUMENTATION-CENSUS-AND-SECURITY-CLASSIFICATION-V1.md) 을 본다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 진입 문서 | 이 문서 · 리팩토링 현황 · 서비스 색인 | 완료 (2026-10-03) |
| 유입 규칙 | 새 문서 위치 · 헤더 · CHECK 작성 기준 · 민감정보 CI 검사 — [규칙 §10](rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) | 완료 (2026-10-03) |
| 보안 분리 | 기록물의 개인 메일 · 전화 · 공인 IP 마스킹 (현재 파일 기준, git history 는 유지) | 완료 (2026-10-03). Private 운영 문서 공간은 이관할 문서가 생길 때 만든다 |
| 데이터 분리 | 비문서 데이터를 `apps/api-server/src/scripts/data/` · 테스트 fixture 로 이동, 경로 consumer 수정 | 완료 (2026-10-03) |
| 정본 흡수 | 주제별 WO · CHECK · IR 결과를 정본 문서로 | 예정 |
