# easy-drug-ko-full-rebuild-live

`WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1` 실행 스크립트.

식약처 e약은요 API 최신 원문을 SSOT 로 삼아 KO STORE 설명서를 전량 재생산하고,
독립검증을 통과한 정상본으로 LIVE canonical 을 교체한다.
**기존 KO 의 의료 내용은 생성 입력으로 사용하지 않는다.**

## 실행 순서

```bash
# 프로덕션 read/write 는 cloud-sql-proxy 경유. 자격증명은 환경변수로만 전달한다.
cloud-sql-proxy.x64.exe --port 15441 netureyoutube:asia-northeast3:o4o-platform-db
export PGUSER=o4o_api PGPASSWORD=...   # 파일·커밋·로그에 남기지 않는다

node freeze-source.mjs        # §2  API 전량 재조회 → 동결 snapshot + drift
node build-population.mjs     # §3  모집단 재산출 (상호배타 7상태)
node build-leaflets.mjs       # §4·5 전량 생산 + 원장
node verify-independent.mjs   # §6  독립검증 16축 (생산기 import 안 함)
node plan-apply.mjs --tag run1 && node plan-apply.mjs --tag run2   # §7 dry-run 2회
node snapshot-db-state.mjs --label before-rollback
node apply-live.mjs --rollback --concurrency 6                     # §11 강제 rollback 시험
node snapshot-db-state.mjs --label after-rollback                  #    residue 0 대조
node apply-live.mjs --live --concurrency 6                         # §9  LIVE 적용
node post-verify-live.mjs     # §12 DB 재조회 독립검증
node plan-apply.mjs --tag run3  # §13 멱등 재실행 (기대: ALREADY_CURRENT 전건)
node translations-status.mjs    # §10 파생 EN·ZH 원장 (census, read-only)
node legacy-ko-census.mjs       # §14 기존 오류본 전수 조사 (read-only)
```

## 파생 번역 비노출 (후속 WO)

`WO-O4O-EASY-DRUG-KO-DERIVED-TRANSLATION-UNPUBLISH-V1`.
교체 전 KO 에서 파생된 EN·ZH 를 `status='canonical' → 'hidden'` 으로만 바꾼다.
본문·`source_ref_id` 는 건드리지 않는다 — 재번역 시 대조 원본으로 남겨야 한다.

```bash
node hide-derived-translations.mjs --dry-run --tag run1
node hide-derived-translations.mjs --dry-run --tag run2   # planDigest 동일 확인
node snapshot-db-state.mjs --label before-hide-rollback
node hide-derived-translations.mjs --rollback             # 같은 write 함수, COMMIT 만 안 함
node snapshot-db-state.mjs --label after-hide-rollback    # residue 0 대조
node hide-derived-translations.mjs --live
node post-verify-hide.mjs                                 # DB 재조회 독립 검증
node hide-derived-translations.mjs --live --tag rerun      # 멱등: planned 0 / write 0
```

`MFDS_API_KEY` 는 `apps/api-server/.env` 에서 실행 시점에만 읽는다.
요청 URL·키는 로그·산출물·커밋 어디에도 남기지 않는다.

## 검증기 독립성

`verify-independent.mjs` 는 생산 계약(`../easy-drug-ko-full-rebuild-pilot/pilot-contract.mjs`)을
import 하지 않는다. 분할기·정규식·판정 방식이 의도적으로 다르다.
검증력은 음성 대조 8종으로 증명한다:

```bash
for t in drop_sentence truncate change_number drop_negation route_swap add_medical foreign_product wrong_itemseq; do
  node verify-independent.mjs --inject $t   # 전부 FAIL 이어야 한다
done
```

`post-verify-live.mjs` 는 같은 `verifyOne` 에 **파일이 아니라 DB 바이트**를 넣는다.

## 산출물

`results/` 의 본문 대용량 파일은 Git 에 넣지 않는다(`results/.gitignore`).
동결 snapshot digest 가 같으면 전 단계가 byte-identical 로 재생산된다.
