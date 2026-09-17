# CHECK-O4O-PRIVACY-POLICY-V1-PUBLISH-AND-CROSSSERVICE-SMOKE

> **상태**: PASS · **검증일**: 2026-09-17 · **WO**: `WO-O4O-PRIVACY-POLICY-V1-PUBLISH-AND-CROSSSERVICE-SMOKE`
> **기준 원문(SSOT)**: [`docs/baseline/O4O-PRIVACY-POLICY-V1.0.md`](../baseline/O4O-PRIVACY-POLICY-V1.0.md) (c2f9ddc1a)
> **런타임 SSOT**: 본문 = `service_policy_documents`(privacy / published) · Footer 책임자 = `service_legal_profiles`(이번 WO 수정 0)
> 이 문서는 게시 원문을 복제하지 않는다. 본문 동일성은 sha256 접두 · 길이 · 문자열 존재 여부로만 기록한다.

## 결과 요약

| 항목 | 결과 |
|---|---|
| published privacy row | 4 / 4 (neture · kpa-society · k-cosmetics · pharmacy-hub) |
| version · effective_date | version `1`(= v1.0) · `2026-09-17` 4/4 |
| public API `GET /api/v1/public/services/{key}/policies/privacy` | 200 · published 4/4 |
| 실브라우저 Desktop 1366×900 / Mobile 390×844 / 비로그인 | 4/4 · 4/4 · 4/4 |
| 본문 · Footer 책임자 | 서철환 4/4 · `양옥영` 0 |
| 코드 변경 | frontend 0 · API 0 · migration 0 · schema 0 (도구 스크립트 1 파일 추가만) |

## 1. 기준 원문

- `docs/baseline/O4O-PRIVACY-POLICY-V1.0.md` 를 유일 원문으로 사용. 문장 수정 0.
- **게시형 변환**: 공개 뷰어가 두 종류(`@o4o/shared-space-ui` `PolicyDocumentViewer` = `white-space: pre-wrap` 순수 텍스트 / KPA `LegalDocumentView` = `#`/`##`/`- `/`N. ` 만 인식하는 line 기반 안전 markdown)라 markdown 원문을 그대로 넣으면 3개 서비스에서 `##` · `**` · `[x](mailto:)` 토큰이 노출된다. 따라서 [`scripts/legal/render-policy-plain.mjs`](../../scripts/legal/render-policy-plain.mjs) 로 **서식 토큰만 제거한 plain 형**을 생성해 게시했다(저장소 헤더 `> ` 블록 · 첫 `# 제목` 줄 · `---` 제외, `##`/`###` 접두 제거, `**x**`→`x`, `[t](url)`→`t`, `* `→`- `).
- 변환 검증: `--verify` = 원문/결과의 서식 토큰을 모두 벗긴 문자열 동일 → `VERIFY OK`(문장 무변경).
- 게시 content: 길이 8,803자 · sha256 접두 `bec62205fc50eec7` · 제1조~제15조 15개 · `서철환` 2 · `양옥영` 0 · 잔존 서식 토큰 0.

## 2. 대상 서비스

정확히 `neture` · `kpa-society` · `k-cosmetics` · `pharmacy-hub`. retired 서비스(GlycoPharm 등) write 0.

## 3. API 경로 · 계약 (최신 main 재확인)

| 단계 | 호출 |
|---|---|
| 로그인 | `POST /api/v1/auth/login` `{email,password,serviceKey}` — 서비스별 L2 credential (`sohae2100` admin, 값은 `docs/local/TEST-ACCOUNTS.local.md` 만) |
| 사전 census | `GET /api/v1/admin/services/{key}/policies?documentType=privacy` |
| draft 생성 | `POST /api/v1/admin/services/{key}/policies` `{documentType:'privacy',title,slug:'privacy',content,version:1,effectiveDate:'2026-09-17',changeReason}` → 201 · status 항상 `draft` |
| 내용 검증 | `GET /api/v1/admin/services/{key}/policies/{id}` → content sha256 = 로컬 sha256 |
| 게시 | `PATCH /api/v1/admin/services/{key}/policies/{id}/publish` `{action:'publish'}` → 200 · `published_at`/`published_by` 서버 기록 |
| 공개 확인 | `GET /api/v1/public/services/{key}/policies/privacy` |

- guard: `authenticate` + `requireServiceLegalScope`(`neture:admin` · `kpa:admin` · `cosmetics:admin` · `pharmacy-hub:admin`). 직접 SQL INSERT 0.
- 감사 로그(`action_logs`, read-only 확인): `service_legal:policy_create` 4 · `service_legal:policy_publish` 4 · 전부 `success`.
- `version` 컬럼은 정수 → WO 의 "v1.0" 은 `version=1` 로 등록(뷰어 표기 `버전 v1`). `slug` 컬럼 `privacy` 명시 등록.

## 4. 게시 전 census (§9)

각 서비스 write 직전 재조회 결과 privacy row 0 / 4 → STOP 조건 없음. 기존 `pharmacy-hub / terms / v1 / archived` 1건 불변(게시 후에도 동일 sha `4da4977eab50c630`).

## 5. DB row (read-only 채널 확인)

| service_key | document_type | title | slug | version | status | effective_date | published_at (UTC) | published_by / created_by / updated_by | change_reason | content sha256[0:16] · len |
|---|---|---|---|---|---|---|---|---|---|---|
| kpa-society | privacy | 개인정보 처리방침 | privacy | 1 | published | 2026-09-17 | 2026-09-17 06:27:39.062 | NOT NULL ×3 | O4O 개인정보 처리방침 최초 통합 공개 v1.0 | `bec62205fc50eec7` · 8803 |
| k-cosmetics | privacy | 개인정보 처리방침 | privacy | 1 | published | 2026-09-17 | 2026-09-17 06:27:39.507 | NOT NULL ×3 | 동일 | `bec62205fc50eec7` · 8803 |
| neture | privacy | 개인정보 처리방침 | privacy | 1 | published | 2026-09-17 | 2026-09-17 06:27:39.951 | NOT NULL ×3 | 동일 | `bec62205fc50eec7` · 8803 |
| pharmacy-hub | privacy | 개인정보 처리방침 | privacy | 1 | published | 2026-09-17 | 2026-09-17 06:27:40.392 | NOT NULL ×3 | 동일 | `bec62205fc50eec7` · 8803 |

row id: kpa-society `884b8003-…`, k-cosmetics `dc167226-…`, neture `3b3d4836-…`, pharmacy-hub `529d1275-…`.

## 6. published 전환

draft(201) → readback sha 일치 → publish(200, status `published`) 4/4. 같은 유형 기존 published 없었으므로 강등된 row 0.

## 7. effective date

`effective_date = 2026-09-17` 4/4. 본문 내 `시행일: 2026년 9월 17일` · `공고일: 2026년 9월 17일` 존재.

## 8. public API

`GET /api/v1/public/services/{key}/policies/privacy` → 4/4 HTTP 200 · version 1 · effectiveDate 2026-09-17 · publishedAt = DB 값 · content sha 로컬과 동일 · `서철환` 포함 · `양옥영` 0.

## 9. Desktop 1366×900 (Playwright · 익명)

| URL | h1 | 버전/시행일 메타 | 시행일 문구 | 서철환(본문+Footer) | 대표이사 · 1577-2779 · 이메일 | 제4/5/6/7/11/13/14조 | 제1조 중복 | Gemini/Gmail 국외이전 | 가로 overflow |
|---|---|---|---|---|---|---|---|---|---|
| https://neture.co.kr/privacy | `개인정보 처리방침` 1개 | `버전 v1 · 시행일 2026. 9. 17. · 게시일 2026. 9. 17.` | O | 4 (본문 2 + Footer 2) | O | 각 1 | 1(중복 없음) | O | 없음 |
| https://kpa-society.co.kr/privacy | 동일 | `게시일 · 최종 수정일` 만(KPA 뷰어 기존 동작, 버전 라벨 없음) | O | 4 | O | 각 1 | 1 | O | 없음 |
| https://k-cosmetics.site/privacy | 동일 | `버전 v1 · …` | O | 4 | O | 각 1 | 1 | O | 없음 |
| https://pharmacyhub.co.kr/privacy | 동일 | `버전 v1 · …` | O | 4 | O | 각 1 | 1 | O | 없음 |

## 10. Mobile 390×844 (Playwright · 익명)

| URL | 본문 로드 | 가로 overflow | bottom nav | Footer 책임자 줄(서철환) 가림 |
|---|---|---|---|---|
| neture | O | 없음 (375/375) | 없음 | 완전 노출 |
| kpa-society | O | 없음 | 있음(top 793) | 책임자 줄 bottom 761 < 793 → 가림 없음 |
| k-cosmetics | O | 없음 | 있음(top 793) | 책임자 줄 bottom 762 < 793 → 가림 없음 |
| pharmacy-hub | O | 없음 | 없음 | 완전 노출 |

## 11. 비로그인 접근

4/4 익명 세션(토큰 없음)에서 본문 렌더. 401/403/redirect 없음(콘솔의 `auth/me` 401 은 헤더 세션 확인용 — 페이지 렌더와 무관, 기존 동작).

## 12. 책임자 정합 (Footer ↔ 제13조)

Footer `개인정보보호책임자 서철환 | threelifezone3@nate.com | 1577-2779` ↔ 본문 제13조 `성명: 서철환 / 직위: 대표이사 / 전화: 1577-2779 / 이메일: threelifezone3@nate.com` 4/4 일치. `service_legal_profiles` 이번 WO 수정 0.

## 13. 본문 동일성

4 row content sha256 접두 `bec62205fc50eec7` · 길이 8,803 동일(byte 동일). 서비스별 문구 추가 0.

## 14. 코드 · DB 변경 범위

- 코드: frontend 0 · API 0 · migration 0 · schema 0. 추가 = `scripts/legal/render-policy-plain.mjs`(변환·검증 도구, 런타임 아님).
- 문서: 본 CHECK 신규 · `docs/CANONICAL-INDEX.md` §7 `O4O-PRIVACY-POLICY-V1.0` ACTIVE 행 1건.
- DB write: `service_policy_documents` privacy v1 신규 4 row(admin API 경유) + 그에 따른 `action_logs` 8건(API 자동). 그 외 UPDATE/DELETE/DDL 0 · retired 서비스 0 · `service_legal_profiles` 0.

## 15. 추가 발견 (수정하지 않음)

1. KPA `LegalDocumentView` 는 버전 라벨을 표시하지 않고 게시일·최종 수정일만 표시(기존 뷰어 동작). 다른 3 서비스는 `버전 v1` 표기. 통일이 필요하면 별도 WO.
2. KPA 뷰어는 `N. ` 줄을 순서 없는 불릿으로 렌더(번호 사라짐) — 가독성 문제 없음, 별도 WO 후보.
3. `version` 컬럼이 정수라 "1.0" 표기는 불가(뷰어 `v1`). 소수 버전이 필요하면 스키마 변경 → 별도 WO.
4. Neture · PharmacyHub 페이지 h1 은 로딩 전 `개인정보처리방침`(fallback heading) → 로드 후 `doc.title` `개인정보 처리방침` 로 교체됨(기존 동작).
