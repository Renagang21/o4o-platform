# 약국 주문·로컬 데이터 기반 검증

> 상태: COMPLETED · 작성일: 2026-10-27
> 대상: [WO](../work-orders/WO-O4O-PHARMACY-ORDER-AND-LOCAL-DATA-FOUNDATION-V1.md)의 이번 기반 보완 회차
> 개발 branch: `wo/pharmacy-order-local-foundation` · base: `3b3f0335f9743f2c1b19fb04654a0c5674287789`
> 완료 구분: 개발·로컬 검증. PR·main 통합·운영 배포·실 약국 검증은 별도이며 이번 회차에서 수행하지 않는다.

## 1. 변경·설계 판정

[설계](../design/DESIGN-O4O-PHARMACY-LOCAL-DATA-CONTRACT-V1.md)에 따라 SQLite v8·기존 Dataset/Mapping/backup을 재사용한다. 새로운 테이블·migration·Core·Task·Memory·서버 주문/정산 원장·인증·외부 유료 서비스·의존성 추가는 없다. 구매·주문 자료는 약국 프로그램 export가 원천이며 OCR을 개발하지 않았다.

명시 원본 키·프로그램 코드·수집 시점을 보존하고 프로그램 주문/구매/반품을 구분한다. 상품/포장/거래처 참조·환산·중복·원본 재수집·사용자 교정을 검증한다. 소유자 선택과 revision 충돌로 오래된 쓰기를 차단하며 generic cloud query·일반 replace에서 새 scoped workspace를 보호한다. 기존 `pharmacy_products` 같은 dataset은 차단하지 않는다.

Main은 빈 시트→거래처별 정리→기존 입력창 준비→사용자 인계→직접 접수 확인을 제공한다. 요청 준비는 실행·접수 성공이 아니다. 완료 시트는 재실행·수정하지 않고 새 시트로 이어간다. 실물 재고·품절 관찰·시점을 따로 보관한다. 계정/업무공간 전환 시 transient state와 늦게 끝난 file 결과를 폐기한다. 기존 composer 입력을 보존하고 2,000자 초과 시 수정하지 않는다.

PC SQLite↔Main은 명시 파일 교환이다. 직접 cloud bridge·자동 동기화·외부 ChatGPT SQLite/도매 세션 접근을 지원 완료로 표시하지 않는다. 기존 MCP tool registry는 콘텐츠·상품 설명·메일이며 이번 약국 조회/실행 tool은 없다. 지오영 URL은 사용자가 지정한 향후 학습 대상이지 실행 allowlist·검증된 Adapter가 아니다. 실제 사용자의 로그인 중 기존 질문·교정·Experience를 통해 절차를 검증한다.

## 2. 실행 검증

| 범위 | 실제 실행 | 결과 |
|---|---|---|
| CI와 동일한 agent suite | `node --test tools/o4o-local-agent/test/local-db.test.mjs tools/o4o-local-agent/test/native-bridge.test.mjs tools/o4o-local-agent/test/browser-dom.test.mjs tools/o4o-local-agent/test/pharmacy-data.test.mjs` | 97/97 PASS (신규 pharmacy 23개 포함) |
| runtime·소유자 격리 | `node --test tools/o4o-local-agent/test/local-data-runtime.test.mjs tools/o4o-local-agent/test/node-owner-scope.test.mjs` | 32/32 PASS |
| Main·주문 UI·매뉴얼 | `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/pages/__tests__/O4OHomePage services/web-neture/src/components/home/__tests__/PharmacyOrderPanel.test.tsx services/web-neture/src/lib/manuals/knowledge.test.ts` | 26/26 PASS |
| frontend | `pnpm --filter @o4o/web-neture exec tsc --noEmit` · 일반 build · `NETURE_OBFUSCATION=names pnpm --filter @o4o/web-neture build` | PASS |
| lint | 변경 TS/TSX ESLint | 오류 0, 기존 Home page unused eslint-disable 경고 1 |
| 문서·diff | `node scripts/check-doc-sensitive.mjs` · `git diff --check` | PASS |
| 실제 Chromium | desktop 1440×1000, mobile 390×844, 실제 component·빌드 CSS | 빈 시트·상품/거래처·수량·요청문·export/import·직접 접수·scope 초기화·가로 넘침 0·page error 0 |
| 실제 CLI 진입점 | `node src/index.mjs data pharmacy ...` · 격리 temp DB | CSV Mapping/profile→SQLite→실 mobile browser export의 수정→SQLite merge→export→요청문 파일 PASS |

위 명령들은 격리 fixture/임시 DB와 합성 업무 자료만 사용했다. 공개 Git에는 원본 PDF·실 약국 Excel·계정·실 주문 데이터를 넣지 않았다. 합성 browser/CLI 결과는 실 사이트 주문 성공 증거가 아니다.

초기 새 worktree에서 패키지 dist가 없어 typecheck가 실패했고, source가 동일함을 확인한 기존 패키지 build 산출물로 준비했다. production profile은 별도 pinned obfuscation toolchain이 없어 첫 시도가 실패했으며 저장소의 frozen-lockfile 설치 후 통과했다. fixture browser의 React alias 경로 문제도 수정한 뒤 PC/mobile 검증을 완료했다. 확인 실패를 PASS로 합산하지 않았다.

회귀 중 기존 무키 generic import의 밀리초 batch id 충돌로 6행 대신 3행이 남는 문제가 재현됐다. 새 무키 batch id만 UUID로 바꾸고 고정 시각의 두 import 보존 회귀를 추가했다. 기존 명시 key·기존 행·schema는 유지한다.

## 3. 통합·운영·실사용 상태

- PR: 미생성. 개발 담당 종료 지시에 따라 branch commit/push로 인계한다. GitHub PR CI·Codex review는 아직 실행되지 않았다.
- main 병합: 미실행. 배포: 미실행. `DEPLOYMENT = REQUIRED` (향후 통합 시 Main 및 PC 코드 업데이트 필요), 현재 상태는 배포 완료가 아니다.
- 실제 약국 export: 미수령. 열·고유 키·원본 날짜/단위·주문/구매/반품·포장 환산 Mapping은 실제 파일 조사 후 확정한다.
- 지오영 로그인 후 화면/DOM·실제 주문 접수·Windows UIA: 미검증. 실제 주문 제출 시험은 별도 승인 대상이며 이번에 실행하지 않았다.
- 실계정 AI 응답 품질·요금·비용 절감: 미측정. 새 모델 호출 경로는 없다.
- 일반 사용자 installer/자동 업데이트·자동 cloud data bridge·ChatGPT/Kakao ingress·검증된 사이트 절차 승격: 미구현/후속. 기존 엔진·Task·Experience를 재사용한다.

push 직전 최신 main은 `60bec2ef4f8bdb228653a66a828c3f7b363b8a35`로 이동했다. 협력사업 enrollment 보완이며 이번 수정 경로와 겹치지 않음을 확인했다. 개발 branch에 임의 merge/rebase하지 않았으며 통합 담당이 최신 main 동기화·필수 CI·리뷰를 수행해야 한다.

## 4. 인계·보존

[사용 절차](../guides/O4O-PHARMACY-ORDER-LOCAL-DATA-USER-TEST-V1.md)를 따른다. 비공개 workspace의 `shared/o4o-pharmacy-order-user-test`에는 합성 주문 시트와 테스트 설명만 보존했다. 기존 제공 매뉴얼 자료함은 별도 비공개 폴더에서 유지한다.

WORKTREE_DISPOSITION

- worktree: `/workspace/o4o-wt/pharmacy-order-local-foundation`
- branch: `wo/pharmacy-order-local-foundation`
- base: `3b3f0335f9743f2c1b19fb04654a0c5674287789`
- main integration / GitHub CI / deployment: 미실행
- local validation: PASS
- verdict: KEEP — 미병합 개발 branch이며 후속 실제 export Mapping·통합 수정에 필요. 다른 세션 worktree·branch·staging은 변경하지 않음.

문서 정합: 이 WO의 설계·guide·검증 기록을 연결했다. 플랫폼 canonical index·업무 정책·과거 기록은 수정하지 않았다.
