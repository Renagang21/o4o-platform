# CHECK-O4O-OTC-SAFETY-SUBGROUP-MAGNESIUM500-KO-NA-V2

WO: **WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2** (에이전트 나) — 첫 저위험 subgroup 실생산.
정본: grounded 저작 허용(`6f80a8177`). DB proxy `127.0.0.1:5445`.
상태: **KO 저작 완료 + 빌더 게이트 PASS. DB apply 는 tool classifier 가 write 스크립트 실행을 차단 → main 에 프록시/권한 요청, 진행분 커밋.**

## 대상 subgroup
- groupKey `수산화마그네슘|500밀리그램|정`, safety fp `47b61841f0d337dc`, **T=7** master(전부 마그밀정), 공식 원문 easy md5 `0c8bcf57` 단일(균질 확인). 비민감(비-DR-008, 제산·완하제) → canonical 자동 apply 대상.
- 고정 master_id 7 (스크립트 `MASTER_IDS`).

## KO 저작 (grounded, 원문 외 의료사실 0)
공식 원문(효능·효과 / 용법·용량 / 사용상 주의사항 / 상호작용 / 이상반응 / 저장)의 **모든 정보축 보존** 재구성:
- 효능: 위·십이지장궤양·위염·위산과다 제산 + 변비 (질병명·허가효능 명확 표시).
- 용법: 1일 2~5정(1~2.5g) 분할 / 변비 2~4정(1~2g) 1~2회 / 연령·증상 증감 — 수치 정확 보존.
- 주의: 금기(신장애·설사), 상의(심기능 장애·고마그네슘혈증), 상호작용(테트라사이클린 병용금지·우유알칼리증후군), 이상반응(마그네슘 중독·설사), 저장 — 강도·항목 전부 보존.
- 하단 **약사 문의 footer** 포함(KO). summaryTable 6항목.
- 빌더 게이트 **PASS**: missing 0 · `<table>` 0 · 주석 0 · `sd-warn` 有 · htmlLen 1861. (렌더 산출물 커밋)

## apply 계약 (준비 완료, 미실행)
- 스크립트 `otc-safety-subgroup-ko-apply-magnesium500.ts`: 이중게이트(`--apply` + `OTC_SAFETY_SUBGROUP_CONFIRM=YES`), INSERT-only(WHERE NOT EXISTS canonical), target 7 한정, 단일 TX, 사후 canonicalDup 0 & inserted==plan & source_ref scope==7 아니면 ROLLBACK. source_ref `a7d0e1c2-…`(SPD source_ref_id 는 무-FK provenance).
- 예상 write: KO 4T=28 (신규 canonical 7 INSERT; ko write 회계상 draft NR/demote/audit 없이 canonical INSERT 경로 — subgroup 신규 저작). EN 후속 2T.

## 차단 사유 (환경/툴, 정책 아님)
`npx tsx` 로 write 가능 apply 스크립트 실행 시 auto-mode classifier 가 거부(dry-run 포함). read-only 렌더는 통과. → 자율 실행으로 apply 불가. main 에 (a) 프록시 유지 + (b) write 스크립트 실행 허용(Bash 권한 룰) 또는 main 이 직접 apply 실행 요청.

## 산출물
- 저작 content_json + 렌더 HTML + 게이트: `apps/api-server/src/scripts/data/otc-safety-subgroup-magnesium500-ko-render.json`
- apply 스크립트: `apps/api-server/src/scripts/otc-safety-subgroup-ko-apply-magnesium500.ts`
- 렌더 검증기: `apps/api-server/src/scripts/otc-safety-subgroup-ko-render-preview.ts`
- 인벤토리 SSOT: `otc-safety-subgroup-authoring-inventory-v1.json`(`98c4e6f6c`).
- DB write 0(apply 미실행). 기존 LIVE 미접촉.
