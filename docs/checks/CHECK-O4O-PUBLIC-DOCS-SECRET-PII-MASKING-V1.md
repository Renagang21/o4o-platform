# CHECK — Public HEAD secret · PII 정리 (WO-O4O-PUBLIC-DOCS-SECRET-PII-MASKING-V1)

- 일자: 2026-10-03 · 시작 HEAD `77fe15801`
- 판정: **PARTIAL** — 문서 · 주석 · 추적 artifact 정리 완료. migration 실행 literal 3건(아래 §6)은 WO §8 에 따라 수정하지 않고 보고.
- 범위: 현재 HEAD 만. history rewrite 0 · force push 0 · deployment/security boundary 변경 0 · secret 생성/rotation 0 · production write 0.
- 값은 이 문서 · 조사 출력 어디에도 기록하지 않았다. 식별은 sha256 앞 8자리 fingerprint · 경로 · 줄 · 분류만 사용.

## 1. 조사 방식

- 선행 census 문서는 저장소에 없어(대화 산출물) 현재 HEAD 를 재검사했다.
- tracked 텍스트 전체(28,327 파일 중 바이너리 · lock 제외)를 다음으로 검사:
  - provider 패턴(private key · SA JSON · Google/OpenAI/GitHub/AWS/Slack key · OAuth token · JWT · Bearer · DB URL password) → **0건** (JWT/Bearer 후보는 전부 `eyJ…...` 로 잘린 예시)
  - password 문맥의 비밀번호형 토큰 · `email / pw` 표기 · `password: "…"` 리터럴 → fingerprint 로 묶어 분류
  - 로컬 비추적 SSOT(`docs/local/*.local.md` · `.env`)의 토큰 fingerprint 와 HEAD 교차 대조 — **현행 SSOT 값의 HEAD 잔존 0**
  - 개인 메일 도메인 이메일(gmail · naver · nate · hanmail · kakao 등) fingerprint · 도메인 · 위치 유형(주석/실행 literal)

## 2. Credential 처리

| 분류 | fingerprint 수 | 처리 |
|---|---|---|
| REAL_OR_ROTATED_SECRET (개인 계정 비밀번호 · rotation 완료) | 3 | 문서에서 `[REDACTED — rotated]` |
| TEST_SECRET (E2E · 테스트 · seed 계정 비밀번호, 문서 기재) | 19 | 문서에서 `[REDACTED]` (e2e README 예시는 `<test-account-password>`) |
| TEST_SECRET (migration 실행 literal) | 2 | **미수정 · 보고** (§6) |
| DEMO_CREDENTIAL | 1 | 유지 — §4 |
| PUBLIC_IDENTIFIER (Toss 공개 문서 샘플 test key) | 2 | 유지 (`.env.example` · 코드 fallback) |
| PLACEHOLDER (API 문서 예시 · `your-…` · 잘린 JWT · 로컬 dev DB 기본값) | 다수 | 유지 |
| FALSE_POSITIVE (commit hash · 계정 handle · DB 이름 · migration 이름) | 다수 | 유지 |

credential 치환: **문서 18개 · 65곳**(값 길이 · 앞뒤 문자 같은 복원 단서 포함 0). 이메일 치환: **13개 파일 · 34곳**(migration 3개는 주석만). 문서가 설명하는 사건 · 검증 결과 · 판정 문장은 그대로 두었다.

## 3. PII 처리

| 항목 | 처리 |
|---|---|
| 실제 신청자/회원 이메일 (제3자 9 fingerprint) | 문서에서 `[REDACTED_EMAIL]` · migration 은 **주석 안에서만** |
| 실명 2 · 사업자명 2 · 휴대전화 1 (archive IR 2건) | `[신청자 A/B]` · `[사업자명 비공개]` · `[REDACTED_PHONE]` |
| 실제 약국명 2 (회원 이메일과 짝지어진 표) | `[약국 A/B]` |
| 개인정보처리방침의 개인정보 보호책임자 연락처 | KEEP_PUBLIC (법정 공개) |
| postman 예시 메일 3 | PLACEHOLDER (`user…@`) |
| 공개 storefront slug · 매장명 | KEEP_PUBLIC (공개 사업자 정보) |
| 공공데이터(HFF 등) 내 전화번호 · 테스트 synthetic 번호 | 범위 밖 (공공 원료/제조사 정보 · synthetic) |

## 4. Demo credential

`O4O-CANONICAL-DEMO-ACCOUNTS-V1`(baseline) §4 가 Demo 비밀번호를 **공개 정보**로 정의하고, `services/web-neture/src/lib/demoAccounts.ts` 가 Demo 버튼으로 번들에 싣는다.
HEAD 에서 지워도 노출은 줄지 않고 정책(기준 문서) 변경이 된다 → **유지(DEMO_CREDENTIAL)**. 로컬 SSOT 의 실제 비밀번호와 불일치 확인.
남은 부채(DEFERRED): baseline 은 "한 곳(config/helper)에서 관리"를 요구하나 `apps/api-server/src/scripts/demo-account-provision.ts` 에 사본이 하나 더 있다 — CLI 입력/공용 상수로 모을지는 별도 판단.

## 5. 추적 artifact

| 대상 | 분류 | 처리 |
|---|---|---|
| `.playwright-mcp/industry-reg-snapshot.md` (브라우저 snapshot · 메일/전화 포함) | REMOVE_FROM_HEAD | `git rm --cached` (로컬 사본 유지 · 이미 `.gitignore`) |
| `.playwright-mcp/neture-product-template.xlsx` (MCP 다운로드 산출물) | REMOVE_FROM_HEAD | 동일 |
| `tmp/cosmetics-guide-gap-enrichment/**` | KEEP | 선행 WO(TMP-OPERATIONAL-RECOVERY) 의 OPERATIONAL_RECOVERY_KEEP · 공공 제품 데이터 · secret 0 |

## 6. STOP findings (수정하지 않음)

| 위치 | 내용 | 판단 |
|---|---|---|
| `migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts` | `SEED_BOOTSTRAP_PASSWORD` 미설정 시 쓰는 기본 비밀번호 literal | migration 실행 literal — 변경 시 재실행 의미가 바뀐다. legacy password 스키마 은퇴(2026-09-24)로 그 값이 저장됐던 컬럼은 제거됐으나, **해당 seed 계정이 현재 email/password credential 을 갖는지는 미확인** — 사용자 판단 |
| `migrations/1737100000000-UpdateGlucoseViewTestAccountPasswords.ts` | 테스트 계정 비밀번호 literal | 동일 |
| `migrations/20260924200000-DeleteOrphanKpaUsers.ts` | `FULL_DELETE_EMAILS` 에 실제 사용자 메일 1건(실행 데이터) | migration body 실행 데이터 — 주석의 같은 메일만 익명화 |

## 7. 남은 판단 항목 (변경하지 않음)

- **소유자 본인 메일 3개**(fingerprint `80c7cb37` · `f36e0439` · `b9f76ea6`)가 문서 · 주석 · 테스트 · migration literal 에 약 280 파일 분포. 본인 정보이고 일부는 migration 실행 literal · 테스트 fixture 라 일괄 치환하지 않았다.
- 소유자 관리 계정으로 보이는 gmail 1개(`695934ae` · 24 파일), `.env.example` 5종 · 설정 UI placeholder 의 SMTP 예시 gmail 1개(`4dd1c629` · 8 파일 — 운영 SMTP 계정과는 다름) — 소유 확인 후 placeholder 화 여부 결정.

## 8. 재발 방지

- GitHub: secret scanning **enabled** · push protection **enabled** · alert 0 (확인만). non-provider pattern scanning 은 disabled — 저장소 설정 변경이므로 제안만.
- `CLAUDE.md` · `AGENTS.md` 의 DB·보안 경계 절에 Public 저장소 원칙 1문장 추가: 비밀번호(과거·테스트 포함) · 실제 사용자 이메일/실명/전화/약국·사업자명 · production 응답 원문 기록 금지, credential 은 secret 이름만, 사람은 placeholder.
- 새 CI 스캐너는 도입하지 않았다(오탐 관리 비용). 필요하면 gitleaks 수준의 경량 스캔을 별도 WO 로.

## 9. 검증

- 재검사: 처리 대상 credential fingerprint 의 HEAD 잔존 = migration literal 2건(§6)뿐 · 제3자 메일 잔존 = migration 실행 literal 1건(§6)뿐 · 실명/사업자명/전화 잔존 0.
- redact 재실행 0건(멱등) · 모든 변경은 줄 단위 치환(+/- 동수).
- `node --test` level3-precision · detect-affected · deploy-risk **140/140** · `check-migration-contract` **21 pass / 0 fail** (migration 주석 수정 후).
- deployment/security boundary 파일 변경 0 · `DEPLOY_FREEZE=true` 유지.

## 10. 조사 중 사고

조사 1회차 문맥 출력이 대상 값 하나만 가려, 같은 줄에 있던 **개인 계정 비밀번호 2개가 작업 transcript 에 평문 출력**됐다(둘 다 위 §2 REAL_OR_ROTATED 3개에 포함 · 사용자 보고 기준 rotation 완료 값). 이후 문맥 출력은 모든 후보 토큰 · 이메일을 가리도록 바꿨다. 해당 값이 현재 유효하지 않은지 사용자 재확인 권장.
