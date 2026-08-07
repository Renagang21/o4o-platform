# WO-O4O-DEV-ENV-RESIDUAL-LOW-RISK-CLEANUP-V1

> 개발환경·문서 저위험 잔여 정비 (2회차) · 2026-08-08
> 착수 HEAD `8948ee468` (= `origin/main`)

---

## 0. 선행 사실 — 동일 WO 1회차가 이미 실행됨

이 WO 이름은 **2026-08-06 `062e48e5e` 로 이미 1회 실행**됐다.
당시 처리: `apps/api-server/README-LOCAL-SETUP.md` 삭제 · `.gitignore` 에 `.codex/` 추가 ·
실행 불가 script 4종 제거 · `scripts/README.md` 현행화 · `PLAYWRIGHT-MCP.md` 보완.

따라서 본 2회차는 **"1회차 결과가 유지되는지 확인 + 그 뒤 남은 잔재 정리"** 로 수행했다.
WO 의 "특별 확인 항목" 5개 중 4개는 `ALREADY_CLEANED` 였다.

---

## 1. 판정표

| 항목 | 판정 | 조치 |
|---|:---:|---|
| `apps/api-server/README-LOCAL-SETUP.md` | ALREADY_CLEANED | 1회차에서 삭제됨. `NOT_PRESENT` 확인 |
| `.codex` ignore | ALREADY_CLEANED | `.gitignore:121 .codex/` 존재. 로컬 `.codex` 디렉터리 없음 |
| 문서 관련 root scripts | ALREADY_CLEANED | 1회차에서 4종 제거. `package.json` 전 script 대상 파일 **전부 실재** 확인 |
| `PLAYWRIGHT-MCP.md` | ALREADY_CLEANED | `docs/platform/development/` 에 위치, `.mcp.json` 미추적 명시됨 |
| `scripts/README.md` | KEEP | 1회차 현행화 + 직전 WO 에서 Linux 전용 레거시 표기 완료 |
| `_generated/` | KEEP | `.gitkeep` + `README.md` 만 추적. 생성물 0건. source of truth 존재 (`apps/page-generator`, `packages/utils/src/generated-storage.ts`). 애매하므로 유지 |
| `.gitignore` 중복 | KEEP | 유효 72줄, **중복 0건** |
| `pnpm-workspace.yaml` | KEEP | 부재로 보인 3건은 모두 `!` 제외 패턴. 정상 |
| `package.json` script | KEEP | 존재하지 않는 파일을 호출하는 script **0건** |
| Cursor 잔재 | ALREADY_CLEANED | 현행 문서 매치는 CSS `cursor-pointer` 뿐. IDE 잔재 0 |
| api-gateway 잔재 | ALREADY_CLEANED | 현행 파일 매치 **0건** |
| **활성 문서 dead markdown link** | **UPDATE** | 78 → 46 (**32건 수정**) |
| 활성 문서 dead backtick path | FOLLOW-UP | 75건. 자동 판정 불가 (아래 §3) |
| 로컬 전용 경계(.env/ADC/proxy/.claude) | LOCAL_ONLY | 추적 `.env` 0건, `.claude/` 미추적, 전부 ignore 처리됨 |

---

## 2. 수정한 32건의 성격과 안전성 증명

수정은 **"같은 파일을 가리키는데 경로 접두사만 틀린 링크"** 로 한정했다.

- `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` — `../../CLAUDE.md` 등 **깊이 off-by-one** 3건
- `docs/baseline/O4O-MYPAGE-CANONICAL-V1.md` · `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2.md` 등 —
  `../archive/investigations/...` 로 적혀 있으나 실제로는 `docs/investigations/` 에 있는 문서 (폴더 오기)
- `docs/platform/promotion/*` · `docs/neture/*` — 저장소 루트 기준 경로를 상대 링크 자리에 그대로 쓴 것

**안전성 증명**: 수정 전/후 각 파일의 **링크 basename 다중집합과 링크 총 개수가 완전히 동일**함을
프로그램으로 검증했다 (10개 파일, 위반 **0건**). 즉 어떤 링크도 *다른 파일*을 가리키게 바뀌지 않았다.

---

## 3. 자동 수정하지 않은 이유 (중요)

backtick 경로 75건은 자동 후보를 뽑아 **dry-run 으로 검토한 뒤 적용을 취소**했다.
basename 이 저장소에서 유일해도 **서비스 간 디렉터리 구조가 반복**돼 오연결이 발생했다.

```text
services/web-kpa-society/src/pages/admin/AdminDashboardPage.tsx
  -> services/web-neture/src/pages/admin/AdminDashboardPage.tsx   ← 다른 서비스. 오답
services/web-glycopharm/src/components/community/HeroBannerSection.tsx
  -> packages/shared-space-ui/src/HeroBannerSection.tsx           ← 리팩터링 추정. 미확인
```

"추정만으로 참조 변경 금지" 원칙에 따라 **전량 FOLLOW-UP** 으로 남긴다.
markdown link 잔여 46건도 같은 이유(삭제·리네임된 소스 파일 지목)로 남겼다.

---

## 4. FOLLOW-UP

| # | 내용 | 비고 |
|---|---|---|
| FU-1 | 활성 문서 dead backtick path 75건 | 서비스별 실제 파일 확인 필요. 자동화 불가 |
| FU-2 | 활성 문서 dead markdown link 잔여 46건 | 삭제·리네임된 소스/문서 지목 |
| FU-3 | `docs/platform/digital-signage/API-STANDARD-RESPONSE-V1.md` 의 동일 폴더 내 3개 문서 부재 | 문서 자체가 없어짐 |
| FU-4 | `docs/templates/business-web-template/README.md` → `../../architecture/business-*.md` 3건 | 통합처가 `BUSINESS-SERVICE-RULES.md` 인지 확인 필요 |
| FU-5 | `_generated/` 산출물 ignore 정책 | 현재 산출물 0건이라 판단 보류 |
| FU-6 | `CHANGELOG.md` 의 과거 경로 참조 | 이력 문서 성격상 수정 대상 아님 |

---

## 5. 검증

```text
pnpm install --frozen-lockfile   OK
pnpm run type-check              OK
pnpm run type-check:frontend     OK
lint ratchet                     102 errors (baseline 유지, 증가 0)
git diff --check                 OK
변경 파일                        .md 10개 (문서 전용)
build                            미실행 — .md 전용 변경으로 산출물 영향 없음
```

기능 코드 · dependency · DB · CI · Secret · 배포 무변경.
다른 세션(hff-ja · easy-drug-en) WIP 미접촉.
