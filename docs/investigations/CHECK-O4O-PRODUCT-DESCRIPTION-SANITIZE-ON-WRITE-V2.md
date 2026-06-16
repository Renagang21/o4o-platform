# CHECK-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2
> **유형:** backend write-path sanitize (defense-in-depth)
> **판정: PASS.** V1 HOLD 사유(backend-safe sanitizer 부재)를 사용자 승인 하에 `jsdom + dompurify` 조합으로 해소하고, `shared_product_descriptions` write path(createCandidate + 3 seed)에 sanitize 적용. render 단계 `ContentRenderer` sanitize 2차 방어선 유지. DB/schema/migration/frontend 무변경.
> 선행: SANITIZE-ON-WRITE-V1(HOLD) · HTML-RENDERING-POLICY · CANDIDATE-SEED — 2026-06-16

---

## 1. V1 HOLD 사유 (요약)

`CHECK-...-SANITIZE-ON-WRITE-V1` 판정: **HOLD — backend-safe HTML sanitizer 부재.**

- `@o4o/content-editor` `sanitizeHtml`: 순수 `dompurify` (브라우저 DOM 의존) + api-server 미의존 → Node 런타임 부적합.
- api-server `jsdom`(26.1.0): **devDependency 로 보유**하나 DOM 구현일 뿐 sanitizer 아님.
- api-server `dompurify`: 미보유.
- `sanitize-html` / `isomorphic-dompurify`: 워크스페이스 부재.
- regex sanitizer: 금지(CLAUDE.md §9/§14).

→ 신규 dependency 없이 안전 sanitize 불가, regex 금지 → HOLD.

## 2. V2 사용자 승인 사항

WO §3 에서 아래를 승인:

```
api-server 에 dompurify 1개 dependency 추가 허용
(jsdom + dompurify 조합으로 backend-safe sanitizer 구성)
```

금지 유지: sanitize-html / isomorphic-dompurify / 기타 sanitizer / regex sanitizer.

## 3. Dependency 추가 내역

| 파일 | 변경 |
|------|------|
| `apps/api-server/package.json` | `dependencies` 에 `dompurify: "^3.0.6"` 추가 (워크스페이스 표준 버전: block-renderer/content-editor/forum-core/shared-space-ui 동일). `jsdom: "26.1.0"` 을 `devDependencies` → `dependencies` 로 **승격**(런타임 sanitize 가 필요로 함). |
| `apps/api-server/package.production.json` | runtime 의존성에 `dompurify: "^3.0.6"` + `jsdom: "26.1.0"` 추가. |
| `pnpm-lock.yaml` | dompurify edge 추가 + jsdom dev→prod 이동만 (diff 12줄, +9/-3). |

### jsdom 승격 근거 (WO 전제 보정)

WO 전제는 "api-server 에 jsdom 이 이미 존재한다" 였으나 실제로는 **devDependency** 였다.
sanitizer 가 **런타임**에 `new JSDOM('')` 으로 window 를 구성하므로, jsdom 이 production 런타임에 없으면 Cloud Run 부팅 시 `ERR_MODULE_NOT_FOUND`(dual-deps SSOT 교훈) 발생.
→ 신규 패키지가 아니라 **기존 워크스페이스 dep 의 런타임 승격**이며, dompurify 외 신규 sanitizer dependency 추가 금지 규칙을 위반하지 않는다.

### @types 미추가

- `dompurify@3.x` 는 자체 타입 동봉 → `@types/dompurify` 불요.
- `@types/jsdom` 미설치이나 api-server tsconfig(`tsconfig.json`/`tsconfig.build.json`) 의 `noImplicitAny: false` 로 untyped `import { JSDOM }` 가 implicit `any` 로 안전 처리 → 신규 `@types/*` dependency 추가 불요(금지 준수).

## 4. Backend sanitizer util 위치

신규: `apps/api-server/src/modules/neture/utils/sanitize-description-html.util.ts`
(neture/utils `*.util.ts` 컨벤션 준수)

```ts
import DOMPurify, { type WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';
const { window } = new JSDOM('');
const purify = DOMPurify(window as unknown as WindowLike);   // 모듈 로드 시 1회 구성
export function sanitizeDescriptionHtml(value?: string | null): string {
  return purify.sanitize(value ?? '').trim();
}
```

- DOMPurify **기본 정책** 사용 — content-editor `sanitizeHtml` 과 동일 계열. 별도 whitelist 신규 정의 없음.
- window/purify 인스턴스는 모듈 로드 시 1회만 생성(요청마다 재생성 안 함).

## 5. Sanitize 적용 write path

`apps/api-server/src/modules/neture/services/shared-product-description.service.ts`

| 경로 | 적용 | 비고 |
|------|:--:|------|
| `createCandidate` (admin manual / 공통 chokepoint) | ✅ | content/summary sanitize. sanitize 후 content 빈 값 → `Error('content is empty after sanitization')` throw |
| `seedFromSupplierOffers` | ✅ | consumer_detail/short → sanitize 후 content/summary |
| `seedFromProductAiContents` | ✅ | ai content → sanitize |
| `seedFromDrugExtension` | ✅ | 구조화 조합 HTML → sanitize |
| `setCanonical` / `setStatus` / `softDelete` | — | content 미변경 확인 → sanitize 대상 아님 |

설계: `createCandidate` 가 universal sanitize chokepoint(admin 직접 호출 보장). seed 메서드는 **sanitize 결과로 빈 여부를 판정해 빈 값을 createCandidate 호출 전에 skip** → seed 배치가 throw 로 중단되지 않음. seed→createCandidate 의 재-sanitize 는 idempotent(안전).

controller(`shared-product-description.controller.ts`) create catch: `empty after sanitization` 메시지 감지 시 **400** 응답(그 외 500 유지).

## 6. content / summary 처리 방식

- `content`: sanitize 후 빈 값이면 candidate 미생성(admin=400, seed=skip).
- `summary`: null/undefined 보존, 값이 있으면 sanitize 후 빈 문자열은 `null` 로 정규화.
- summary 가 plain text 라도 sanitize 통과(태그 없으면 그대로) — 기존 동작 보존.

## 7. 빈 content 처리 방식 (WO §8)

| 경로 | 정책 |
|------|------|
| admin manual create | sanitize 후 빈 content → 400 (`content is empty after sanitization`) |
| seed (supplier/ai/drug_extension) | sanitize 후 빈 content → 해당 row skip(`skipped++`) |

품질 기준 충족: **`shared_product_descriptions.content` 에 빈 문자열 candidate 를 만들지 않는다.**
기존 controller 의 raw content 비어있음 검사(400)는 그대로 유지 — 회귀 없음(빈/공백 raw 는 종전대로 거부).

## 8. seed source 별 처리 결과

- **supplier**: `supplier_product_offers` 원본 **미수정**. 후보 저장값만 sanitize.
- **ai**: `product_ai_contents` 원본 **미수정 / public 미노출**(후보로만 흡수, 종전 정책 유지). 저장값만 sanitize.
- **drug_extension**: `product_drug_extensions` 원본 **미수정**. 조합 HTML 만 sanitize, 종전 `needs_review` 상태 유지.

## 9. duplicate skip 유지 여부

유지. `(master_id, source_type, source_ref_id)` 기반 `existsBySourceRef` skip 로직, canonical 1/master, overwrite/resurrect 금지 정책 **무변경**. sanitize 는 저장값 변환만 추가.

## 10. 원본 미수정 / 미노출 확인

- source 원본 테이블(supplier_product_offers / product_drug_extensions) UPDATE/DELETE **없음**(SELECT only).
- `product_ai_contents` **미수정 / public output 직접 노출 없음**.
- setCanonical/setStatus/softDelete content **미변경**(확인 완료).

## 11. DB / schema / migration / frontend 무변경 확인

- DB schema 변경 / migration 추가 **없음**.
- frontend 변경 **없음**. `ContentRenderer`(render-time DOMPurify) 2차 방어선 **유지**.
- 기존 데이터 일괄 cleanup **없음**(후속 WO 대상).

## 12. 보안 검증 결과 (runtime smoke)

로컬 node 에서 util 과 동일 로직(`jsdom + DOMPurify(window)`) 실행:

| 입력 | 출력 | 기대 |
|------|------|:--:|
| `<script>alert(1)</script><p>정상 설명</p>` | `<p>정상 설명</p>` | ✅ |
| `<p onclick="alert(1)">설명</p>` | `<p>설명</p>` | ✅ |
| `<a href="javascript:alert(1)">링크</a>` | `<a>링크</a>` | ✅ (javascript: 제거) |
| `<img src=x onerror=alert(1)>` | `<img src="x">` | ✅ (onerror 제거) |
| `<script>alert(1)</script>` (pure) | `""` | ✅ (→ skip/400) |
| `<p><strong>효능</strong><br/>두통 완화</p>` | `<p><strong>효능</strong><br>두통 완화</p>` | ✅ (정상 마크업 보존) |

→ DOMPurify 기본 정책으로 WO §12 기대치 전부 충족.

## 13. Typecheck 결과

`apps/api-server` `tsc -p tsconfig.build.json --noEmit`:

- 본 WO 변경 파일(util / service / controller / package) **에러 0**.
- 단 1건 에러: `src/controllers/market-trial/marketTrialController.ts(105,9)` `TS2353 productId ... CreateTrialDto`.
  - 본 WO **미변경 파일**(diff 무관) → **pre-existing baseline 에러**(market-trial 도메인, sanitize 와 무관).
  - 본 WO 의 sanitize 변경은 **신규 타입 에러 0**.

> 검증 한계: 운영 DB 방화벽 + 별도 테스트 환경 부재로 admin API/seed E2E 미실행. 대신 sanitizer 런타임 동작은 §12 로 검증, write path 적용은 정적 확인. 후속 E2E 는 배포 후 admin API 로 확인 권장.

## 14. 작업 규칙 준수 / 다른 세션 WIP

- path-specific stage(본 WO 파일만). `git add .` **미사용**.
- 작업 중 working tree 에 **다른 세션 WIP** 감지(`partner-contract.service.ts`, `web-glycopharm/web-k-cosmetics operatorMenuGroups.ts`, `web-neture supplier*` — `wip-not-mine-cross-session` stash). 스테이지에서 제외 의도.

### 14-A. Mixed commit 발생 (커밋 위생 이슈 — 기능/빌드 영향 없음)

- 커밋 `c3b790851` 에 **다른 세션 WIP 가 함께 포함됨**: `partner-contract.service.ts`, `web-neture/src/lib/api/supplier.ts`, `SupplierRecruitmentDetailPage.tsx`, `SupplierRecruitmentsPage.tsx`, `CHECK-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1.md`.
- **원인**: `git add`(path-specific) 와 `git commit` 을 **별도 shell call** 로 분리 실행 → 그 사이 병렬 세션이 index 에 추가 stage → 본 커밋에 혼입(memory `feedback_git_commit_workflow` 위반).
- **영향 평가**: 작업/데이터 손실 **없음**(혼입 파일은 self-consistent, 자체 CHECK 동반). 빌드 green — api-server typecheck 신규 에러 0(pre-existing market-trial 1건만), web-neture `tsc --noEmit` EXIT 0.
- **처리 방침(사용자 합의)**: force-push 로 쪼개지 **않음**(이미 origin/main 반영 + 혼입 self-consistent + typecheck green + 병렬 세션 작업 중 → force-push 가 손실/충돌 위험을 더 키움). `c3b790851` 을 mixed commit 으로 인정, main 유지.
- **재발 방지**: 이후 `git add`(path-specific) → `git diff --cached` → `git commit` 을 **반드시 단일 shell call 로 체인**.

## 15. 완료 판정

**PASS.**

- dompurify dependency 추가 + jsdom 런타임 승격(package.json + package.production.json + lockfile 최소 diff).
- backend-safe sanitize util(jsdom+DOMPurify, 기본 정책) 구성.
- createCandidate + 3 seed write path sanitize 적용, 빈 content 정책 적용.
- duplicate skip / canonical / 원본 미수정 / product_ai_contents 미노출 정책 유지.
- frontend / ContentRenderer / DB / schema / migration 무변경.
- 보안 vector 6종 통과, 변경 파일 typecheck 신규 에러 0(market-trial 1건은 pre-existing).

## 16. 후속 WO 후보

1. `WO-O4O-PRODUCT-DESCRIPTION-HTML-CONTENT-CLEANUP-V1` — 기존 `shared_product_descriptions` candidate/canonical content 일괄 점검/정리(write sanitize 도입 후).
2. `IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1` — frontend `dangerouslySetInnerHTML` 전수조사.
3. `WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-DEPRECATION-V1` — legacy store profile description 편집 UI 축소/폐지.
4. (선택) market-trial `marketTrialController.ts(105)` pre-existing TS2353 정리(별 WO).

---

*Date: 2026-06-16 · 상품설명 저장 sanitize V2 · PASS · jsdom+dompurify backend util(dep 1개 승인 + jsdom 런타임 승격) · createCandidate + 3 seed sanitize · 빈 content skip/400 · 원본/ai 미수정·미노출 · render sanitize 유지 · DB/schema/migration/frontend 무변경 · 보안 vector 6종 PASS · 변경 파일 typecheck 신규 에러 0.*
