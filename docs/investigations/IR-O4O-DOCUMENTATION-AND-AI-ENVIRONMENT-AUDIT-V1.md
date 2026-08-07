# IR-O4O-DOCUMENTATION-AND-AI-ENVIRONMENT-AUDIT-V1

O4O 저장소 문서 체계 및 AI 개발 환경 읽기 전용 조사

| 항목 | 값 |
|---|---|
| 조사 일자 | 2026-08-06 |
| 기준 커밋 | `837f49ed6` (`main` = `origin/main`) |
| 조사 성격 | 읽기 전용 (코드·DB·설정 무변경) |
| 후속 실행 WO | `WO-O4O-DOCUMENTATION-ENTRY-AND-ROOT-CLEANUP-V1` |
| 실제 변경 범위 | 본 IR 기록 + 루트 진입 문서 정정 + 루트 오염 파일 정리 (아래 §7) |

> 본 문서는 **진단 기록**이다. 여기서 제시하는 2차·3차 방향은 승인된 계획이 아니라 후보이며,
> 실행에는 별도 WO가 필요하다.

---

## 1. 조사 배경

문서가 부족한 상태가 아니라, 누적된 문서의 **권위·역할·최신성**을 재정리해야 하는 상태인지
확인하기 위해 문서 체계와 AI 개발 환경 설정에 한정하여 읽기 전용 조사를 수행했다.

기능 코드·DB·API 감사는 범위에 포함하지 않았다.

---

## 2. 문서 규모 (기준 커밋 실측)

| 항목 | 수량 |
|---|---:|
| 추적 중 `.md` 전체 | 3,072 |
| `docs/checks` | 1,232 |
| `docs/investigations` | 713 |
| `docs/archive/**` | 500 |
| `docs/work-orders` | 199 |
| `docs/architecture` | 60 |
| `docs/baseline` | 52 |
| `docs/rbac` | 6 |
| `docs/` 최상위 디렉터리 | 27 |

유입 대비 정리 비율:

| 구간 | 신규 생성 `.md` | archive 이동·삭제 |
|---|---:|---:|
| 최근 90일 | 약 2,400 | 약 11 |

`docs/checks`는 **전량이 최근 90일 이내 생성**이다. `docs/README.md`가 기록한
"Phase 1 이동 완료 (2026-06-01)" 이후 archive 파이프라인이 사실상 정지한 것으로 보인다.

---

## 3. 잘 구성된 자산 (보존 대상)

1. **`CLAUDE.md`의 문서 참조 무결성** — 본문이 참조하는 문서 경로 79개를 전수 검증한 결과
   **broken link 0건**. 우선순위 체인(사업 철학 → 3-Role Flow → Operator/Store 표준 → Freeze)도
   논리적으로 일관된다.
2. **3축 기준 문서 체계** — `docs/baseline`(52) · `docs/architecture`(60) · `docs/rbac`(6)은
   실체가 있고 현행과 정합한다.
3. **CI/CD·워크스페이스 정의** — `.github/workflows`와 `pnpm-workspace.yaml`은 현재 구조와 일치하며,
   `services/mobile-app` 분리 사유가 주석으로 남아 있다.

---

## 4. 확인된 구조적 결함

### 4-1. 루트 `README.md`가 현행 규칙과 정면 충돌 (최우선)

마지막 실질 갱신이 2025-09-05이며 다음이 사실과 다르다.

| `README.md` 기술 | 실제 |
|---|---|
| Process Manager: PM2 | `CLAUDE.md` §6이 PM2를 **명시 금지** |
| `pnpm run pm2:start:*` 명령 | `package.json`에 pm2 스크립트 0개 |
| `apps/storefront/` | 존재하지 않음 |
| `config/pm2-templates/` | 존재하지 않음 |
| "13개 워크스페이스" | 실제 apps 11 · services 8 · packages 다수 |

저장소 최초 진입 문서가 헌법이 금지한 인프라를 안내하고 있어, 신규 개발자·AI의 오염 경로 1순위다.

### 4-2. 실행 환경 문서 4중 중복

Cloud SQL Proxy 설치·실행 절차가 4개 문서에 각각 존재한다.

| 문서 | proxy 언급 횟수 | 최종 갱신 |
|---|---:|---|
| `GCP-SETUP-GUIDE.md` | 16 | 2026-03-08 |
| `SETUP.md` | 12 | 2026-08-05 |
| `README-LOCAL-DEV.md` | 10 | 2026-06-28 |
| `QUICK-START.md` | 8 | 2026-08-05 |

같은 절차의 4개 버전이 5개월 시차로 흩어져 있어 정본 판단 근거가 없다.

### 4-3. `docs/README.md`가 실제 폴더의 절반만 선언

선언 14개 대비 실제 27개. 미선언 13개:

`checks/`(최대 폴더) · `guides/` · `audits/` · `ir/` · `adr/` · `decisions/` · `design/` ·
`runbooks/` · `registries/` · `manual/` · `data-audits/` · `event-offer/` · `archive/obsolete/`

특히 `docs/guides`는 `CLAUDE.md`가 **콘텐츠 규칙 SSOT 진입점**으로 지정한 폴더인데 문서 인덱스에 없다.
`checks/` · `investigations/` · `ir/`에는 README/INDEX가 전무해 2,000여 문서가 색인 없이 누적된다.

### 4-4. `AGENTS.md`의 종속 구조와 커버리지 공백

`AGENTS.md`는 "루트 `CLAUDE.md`를 반드시 읽는다"를 전제로, 우선순위를 2위 `CLAUDE.md` /
4위 `AGENTS.md`로 명문화해 자기 종속을 선언한다. 동시에 다음 핵심 규칙이 `AGENTS.md`에 **0회** 등장한다.

| 규칙 | `AGENTS.md` | `CLAUDE.md` |
|---|---:|---:|
| Boundary Policy (Guard Rules 5) | 0 | 6 |
| TypeORM ESM 규칙 (위반 시 서버 기동 실패) | 0 | 1 |
| OrderType · E-commerce 계약 | 0 | 3 |
| RBAC SSOT | 0 | 7 |
| Design Core | 0 | 2 |
| main 직접 작업 브랜치 정책 | 0 | 2 |

즉 `CLAUDE.md`를 읽지 못하는 실행 주체는 **서버를 정지시킬 수 있는 규칙조차 모른 채** 작업하게 된다.
독립화를 하려면 이 공백을 도구 무관 공통 기준으로 승격시키는 작업이 선행되어야 한다.

`AGENTS.md` §12의 대표 검증 명령이 단일 서비스 빌드 하나로 고정되어 있어 8개 서비스 구조와도 맞지 않는다.

### 4-5. `CLAUDE.md` 단조 증가

361줄(2026-04-28) → 395줄(2026-05-08) → 470줄(2026-07-22), 약 29KB.
커밋 이력상 **추가만 있고 제거·통합은 없다.** baseline 추가 시 §14 표와 하단 문서 목록에
이중 등재되는 패턴이 반복된다.

### 4-6. 루트 디렉터리 오염

추적 중인 루트 파일에 완료된 조사 문서, 실행 불가 스크립트, 일회성 백업, 빈 파일이 혼재한다.
상세와 처리 결과는 §7 참조.

### 4-7. 문서 자동 수정 스크립트 잔존

`scripts/update-claude-md.cjs`가 남아 있고, `package.json`의 `update:docs`는
`admin-dashboard`의 shortcode/AI-page 문서 생성기를 호출한다.
문서 재편 시 자동 생성기가 결과를 되돌려 쓸 수 있는 경로이므로 정비 계획에 포함해야 한다.

### 4-8. AI 도구 설정 정합성

| 항목 | 상태 |
|---|---|
| `.claude/settings.json` | `.gitignore` 처리됨(커밋 안 됨). 다만 permissions allow 목록에 자격증명 문자열이 평문으로 다수 축적 — **로컬 보안 정비 필요** |
| `.cursor/.cursorrules` | 추적 중. 대상이 존재하지 않는 서비스 경로 하나뿐 → 이번 WO에서 폐기 (§7) |
| `.codex` | 없음 — Codex 독립 운영 준비물 미구성 |
| `.mcp.json` | `.gitignore` 처리됨 (Playwright MCP 로컬 설정) |

> 본 IR은 자격증명 값 자체를 기록하지 않는다. 실제 문자열은 로컬 설정 파일에서 직접 확인한다.

---

## 5. 즉시 변경하면 위험한 영역

| 대상 | 사유 |
|---|---|
| `CLAUDE.md` 분할·축소 | 79개 참조 링크와 §14 Freeze 색인이 걸려 있음. 3차 이후 |
| `docs/baseline` · `architecture` · `rbac` | 현재 판단 기준. 변경은 별도 WO 필수 |
| `docs/checks` · `investigations` 일괄 archive | 진행 중 생산 트랙이 실시간 참조 중. 종료 트랙 식별이 선행되어야 함 |
| 환경 문서 4개 통합 | 정책 판단(정본 선정·ADC/프록시 절차)이 필요. 사실 정정과 성격이 다름 |

---

## 6. 정비 방향

| 차수 | 범위 | 위험 |
|:--:|---|:--:|
| 1차 | 루트 정리, `README.md` 사실 오류 정정, 유령 설정 폐기 | 낮음 |
| 2차 | `docs/README.md` 27개 폴더 전수 반영, checks/investigations/ir INDEX 신설, archive 이동 규칙 복구, 환경 문서 SSOT 통합 | 중 |
| 3차 | 공통 기준 문서 추출 → `CLAUDE.md` 축소 → `AGENTS.md` 종속 해제 → 대량 작업용 지침 신설 | 높음 (WO 필수) |
| 4차 | 리팩터링 완료 후 에이전트 운영 체계 적용·검증 | — |

### 6-1. 지침 문서의 향후 독립 방향 (후보)

```text
공통 기준 (도구 무관)
  · 사업 철학 / 아키텍처 경계 / DB·프로덕션 안전 / Git·검증 / Freeze 색인
        │  (각 지침이 이것을 참조하고, 지침끼리는 참조하지 않는다)
        ├─ AGENTS.md   : Codex 실행 지침 (독립)
        ├─ CLAUDE.md   : Claude Code 실행 지침 (독립)
        └─ 대량 작업 실행 지침 (독립)
```

핵심은 `CLAUDE.md`에서 **규칙**을 공통 기준으로 올리고, `CLAUDE.md`에는 Claude Code **실행 방식**만
남기는 것이다. 그래야 `AGENTS.md`의 종속이 자연스럽게 끊긴다.

### 6-2. 현재 조건

- 현재 운영 방식과 도구 구성은 **그대로 유지**한다.
- `CLAUDE.md`는 계속 최상위 규칙 문서로 동작한다.
- `AGENTS.md`는 현행 종속 구조를 유지한다.
- Cursor는 운영 도구에서 제외한다.
- 위 6-1 구조는 진행 중인 리팩터링이 종료된 뒤 별도 WO로 판단한다.

---

## 7. 이번 WO에서 실제로 수행한 변경

본 IR의 진단 중 **저위험 항목만** 실행했다. 4-2 · 4-3 · 4-4 · 4-5 · 4-7 · 4-8(로컬 보안)은
의도적으로 제외했다.

### 7-1. 루트 `README.md` 사실 오류 정정

§4-1 표의 5개 항목을 현행 기준으로 정정했다. 문서를 운영 매뉴얼로 확장하지 않고,
저장소 소개·현재 구성·진입 경로만 유지한 채 상세 절차는 기존 문서로 연결했다.

### 7-2. 루트 파일 정리

| 파일 | 참조 | 판정 |
|---|---:|---|
| `IR-O4O-AUTH-MIDDLEWARE-SPLIT-POST-CHECK-V1.md` | 1 | `docs/archive/investigations/` 이동 |
| `IR-O4O-DASHBOARD-ASSETS-ROUTES-SPLIT-POST-CHECK-V1.md` | 0 | `docs/archive/investigations/` 이동 |
| `IR-O4O-MAIN-TS-BOOTSTRAP-SPLIT-POST-CHECK-V1.md` | 1 | `docs/archive/investigations/` 이동 |
| `IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-NEXT-PICK-V1.md` | 1 | `docs/archive/investigations/` 이동 |
| `TEST_VIEW_PREVIEW.md` | 0 | 완료된 테스트 기록 → `docs/archive/reports/` 이동 |
| `ERROR` | 0 | 0바이트 빈 파일 → 삭제 |
| `check-posts-db.cjs` | 0 | 일회성 진단(2025-10) · 로컬 전용 접속 정보 하드코딩 → 삭제 |
| `debug-template-parts.cjs` | 0 | 일회성 진단(2025-10) · placeholder 자격증명 하드코딩 → 삭제 |
| `analyze_docs.js` | 0 | **구문 오류로 실행 불가** → 삭제 |
| `package.json.backup.*` (3건) | 0 | 2025-08/09 일회성 백업 → 삭제 |
| `tmpcols.cjs` · `tmpdiff.cjs` | 5 | 진행 중 생산 트랙 CHECK 문서가 참조 → **유지** |
| `test_import.csv` | 0 | 용도 판정 불충분 → **유지**, 후보로만 기록 |
| 루트 PNG 다수 | — | `.gitignore` `/*.png` 로 **미추적** → 범위 밖 |

이동한 IR 문서를 언급하던 CHECK 문서 2건의 위치 표기를 새 경로로 갱신했다(내용은 재작성하지 않음).

### 7-3. Cursor 설정 폐기

Cursor를 운영 도구에서 제외하는 방침에 따라 `.cursor/.cursorrules`를 삭제했다.
직접 참조 0건이며 `.cursor/` 하위에 다른 파일은 없다. 대체 설정은 만들지 않았다.

### 7-4. `scripts/update-claude-md.cjs` 판정

판정 결과는 완료 보고에 기록한다. `CLAUDE.md` 본문은 수정하지 않았다.

---

## 8. 후속 과제 (미착수)

1. 실행 환경 문서 SSOT 정비 (§4-2)
2. `docs/README.md` 전수 반영 및 폴더 INDEX·archive 규칙 복구 (§4-3)
3. 로컬 `.claude/settings.json` 보안 정비 (§4-8)
4. `AGENTS.md` · `CLAUDE.md` 독립화와 공통 기준 문서 추출 (§4-4 · §4-5 · §6-1)
5. 문서 자동 생성 스크립트의 재편 영향 검토 (§4-7)
