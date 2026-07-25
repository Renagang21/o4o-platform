# CHECK-O4O-OTC-ORAL-COMBO-SHARD-C-PREP-DA-V10 — 경구 복합 shard C 인계 전 준비 완료 (에이전트 다)

WO: `WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-C-DA-V10` · coordination SSOT: `otc-combo-shard-assignment-ga-v9.json` (d4ad68c70).
상태: **인계 전 병렬 준비 완료 (LIVE apply 미실행 — write-owner 인계 대기). DB write 0.**

## 0. 결론

> **SSOT 고정 shard C = 69 fp / 207 master.** 생산가능 **68 fp / 204 master** KO config + EN 저작·검증 완료, apply manifest 확정. **HOLD_SOURCE 1 fp / 3 master**(빅콘에스600정) 분리. LIVE apply는 **나→다 write-owner 인계 후**에만 실행(현재 가 shard A 활성).

## 1. SSOT · claim (재분할 없음)

- SSOT 분할(LPT 결정론): A=가 70fp/210m · B=나 70fp/210m · **C=다 69fp/207m**. raw census 변동값·균등 재계산으로 대상 변경 안 함.
- **claim 교집합 0**: C ∩ A = 0 · C ∩ B = 0 · C ∩ 가 claim(313) = 0 · C ∩ 나 = 0.

## 2. KO config (68/69 그룹)

- ko-compose(가 검증본, read-only 입력)로 공식 easy_drug 원문 → sd-* content_json 68 그룹 생성. 1 그룹 `44a15789…`(빅콘에스600정, A11EX 600mg 정, 3m) = **HOLD_SOURCE**(원문 효능/용법/주의 섹션 부재).
- KO 게이트 **68/68 PASS**: master별 easy STORE ko canonical 정확히 1 · 기존 authored(nutrition_combo/mfds_drug_otc) 충돌 0. 재현 대상 **204 master**.

## 3. EN 저작 · 검증 (68/68)

- EN = KO 1:1 충실 번역(공식 원문 근거, 신규 의료 사실 0). 6개 병렬 저작 후 조립.
- **검증 GREEN**: buildDrugOtcEnConsumerHtml **68/68 빌드 OK** · 필수필드 누락 0 · **한글 0** · sd-warn 68/68 · `<table>` 0.
- **KO-EN 축 대조 mismatch 0**: 연령 임계값(만 N세/개월)·용량·철분 과량 중독 사망 경고·비타민 A 기형 경고 전량 EN 보존. 질환명·효능·금기·상호작용(인산염/칼슘염/테트라사이클린/제산제/레보도파/강심배당체/탄닌차 등) 보존. 마케팅 표현 0·강도 약화 0·조성 혼합 0.
- ※ DB-level EN dry-run(runner --lang=en)은 KO canonical 선행 필요 → **KO apply 후(인계 후)** 실행.

## 4. apply manifest (예상값)

- **writePlan = 1,224 T** (204 master × 6T): KO 4T=816 · EN 2T=408. writePlan==writeActual 예상.
- source_ref_id = `uuid(md5(targetFp))` 결정론 앵커, **68 그룹 unique**.
- 예상 게이트: canonicalDup 0 · target 밖 write 0 · 기존 LIVE drift 0 · route oral · 재실행 no-op.

## 5. 게이트 · 규정 준수

- **LIVE apply 0 · DB write 0** — write-owner 인계 전 절대 미실행(가 활성). shard 재분할 0.
- 자기 산출물 = DA 전용(`*.da.json`) · GA/NA transient·공용 파일 미접촉 · GA prodscreen read-only 입력만.
- HFF·첩부제·안전 subgroup·KPA 미접촉 · git add./reset/clean/stash 미사용.

## 6. 인계 후 즉시 실행

`나→다 write-owner 인계 확인` 시: KO+EN LIVE apply(204m/1,224T) → 독립검증(canonical·audit·dup·drift) → 재실행 no-op → CHECK·manifest 갱신 commit·push → 전체 경구 복합 census 재산출. HOLD_SOURCE 1그룹은 원문 보강 후 별도.

## 7. 산출물 (DA 전용)

- KO+EN config: `apps/api-server/src/scripts/data/otc-oral-combo-config-shardC.da.json`
- manifest: `apps/api-server/src/scripts/data/otc-oral-combo-shardC-manifest.da.json`
- HOLD_SOURCE: `apps/api-server/src/scripts/data/otc-oral-combo-shardC-hold-source.da.json`
- 본 문서.
