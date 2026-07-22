# CHECK-O4O-OTC-TRACK-A-1H-PRODUCTION-NA-V1 — 에르도스테인 300mg 정 EN 26건 완결 (에이전트 나)

WO: `WO-O4O-OTC-TRACK-A-1H-PRODUCTION-NA-V1` · 일자: 2026-07-21 · 상태: **완료 — en 26건 canonical LIVE (독립검증·ALREADY_COMPLETE no-op PASS)**
runner: `apps/api-server/src/scripts/drug-otc-en-complete-runner.ts`(범용 en-complete, `--group=erdosteine-300mg-jeong`) · 채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production `o4o_platform`.

---

## 0. 결론

> **Track A 유일 en 결손이던 에르도스테인 300mg 정 target 26 의 영어 STORE 설명서를 en needs_review 26 전개 → canonical 26 완결. en write 52(persist 26 + flip 26). dry-run 2회 byte-identical. TX 사후검증 PASS(en canonical 26·nr 0·dup 0·ko canonical 26 불변·flip 지문 26/26). 독립검증 PASS. 재실행 ALREADY_COMPLETE no-op(write 0).**
>
> **스코프 안전**: source_ref_id `03e0af9d` = **35 ko 공유**(26 target + 9 out). out9 는 이미 en canonical LIVE(md5 `2b7c07261d89e55c17a53fe80ff57d79`). 26 ko == 9 ko(byte-identical md5 `459f20efdf5c52b550d2806c5acbe7ac`, 동일 약물) → **26 master_id 리스트로만 스코프**(source_ref_id 스코프 금지). 번역 = out9 검토완료 en 을 빌더 계약 역매핑으로 복원, **build == live out9 en byte-identical(md5 `2b7c0726…`)** 게이트로 **새 medical fact 0** 구조 증명. 결과: 에르도스테인 300mg 정 **전체 35 master en 통일**.

---

## 1. 시작/종료 상태

| 항목 | 값 |
|---|---|
| 브랜치 | `main` · 시작 HEAD `09d5e50c3` (= origin/main) |
| 종료 HEAD | 본 커밋 |
| 26 master IDs 정본 | `otc-erdosteine-300mg-upgrade-dryrun-v1.json`.rollback_master_ids (Track A 최초 파일럿) → `otc-grounded-upgrade-erdosteine-300mg-jeong.run.json` 로 EN 스코프 고정 |

---

## 2. 사전 스코프 조사 (WO 필수)

| 축 | 값 | 처리 |
|---|---|---|
| 26 target | ko authored canonical 26(균일 md5 `459f20ef`) · en **0** | **대상**(master_id 리스트) |
| out9 (source_ref 공유, 대상 밖) | ko canonical 9(동일 md5 `459f20ef`) · en canonical **9**(LIVE, md5 `2b7c0726`) | **미접촉**(재구성 기준본) |
| source_ref 03e0af9d 총 | ko canonical 35 · en canonical 9 | source_ref 스코프 **금지** |
| 26 ko vs 9 ko | md5 `459f20ef` **동일** | 동일 약물 → 번역 재구성 근거 |

---

## 3. 번역 (그룹당 1건 · §0-B 충실 번역, 새 medical fact 0)

- 소스 = 26 ko canonical(= out9 9 와 동일). 번역 = out9 검토완료 en 재구성 (`docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-erdosteine-300mg-jeong-v1.json`, GUIDE V0.5·GLOSSARY V0.2).
- **일관성 게이트**: `buildDrugOtcEnConsumerHtml` md5 `2b7c07261d89e55c17a53fe80ff57d79` == live out9 en(9건 균일) → **byte-identical**. summary(`Thick phlegm in sudden and long-lasting breathing problems`)도 일치. (사전 프로브 `otc-erdosteine-en-probe.ts` 로 apply 이전 선증명.)
- 게이트: 한글 0 · `<table>` 0 · 주석 0 · 이중 escape 0 · sd-warn 유지 · 필수필드 누락 0.

### TEST-LOG (ko↔en 수치·용법·기간·금기·주의 대조)

| 축 | ko canonical | en (byte-identical to LIVE out9) | 보존 |
|---|---|---|:-:|
| 효능 | 급·만성 호흡기질환의 가래(점액) 용해·배출 | thin mucus and help you cough it up in sudden and long-lasting breathing problems | ✅ |
| 용량 | 성인 1회 1정(300mg) 1일 2~3회 | one tablet (300 mg) two to three times a day | ✅ 수치 |
| 기간 | 급성질환 **10일 이상 복용 금지** | do not take it for more than **10 days in a row** | ✅ |
| 금기 | 과민반응·간경변·시스타티오닌합성효소결핍·소화성궤양·중증신장애 | ever reacted / cirrhosis / cystathionine synthase deficiency / peptic ulcer / severe kidney problems | ✅ |
| 주의 | 경증~중등도 간장애·임부·수유부 상담 | mild to moderate liver problems, pregnant or breastfeeding | ✅ |

> ko 에 없는 새 medical fact **0**. (build byte-identical 이 최종 증명.)

---

## 4. 전개·완결 (en write 52)

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:-:|
| STEP1 | en needs_review INSERT (WHERE NOT EXISTS) | **26** | 26 | ✅ |
| STEP2 | needs_review → canonical flip | **26** | 26 | ✅ |
| — | **en write 총** | **52** | 52 | ✅ |
| flip 지문 불변 | content md5 전후 동일 | **26/26** | 26 | ✅ |

- **TX 사후검증**: en canonical 26 · en needs_review 0 · en canonical dup 0 · **ko canonical 26 불변** → PASS → COMMIT.
- **독립 검증(별도 psql)**: target 26 en canonical(균일 md5 `2b7c0726`) · ko canonical 26 불변(md5 `459f20ef`) · easy deprecated 26 불변 · source_ref 03e0af9d 전체 en **35 통일(단일 md5)** · **canonical duplicate 전역 0**.
- **재실행 no-op**: `status=ALREADY_COMPLETE`, dbWrite 0, build md5 == enTargetMd5 == `2b7c0726`.
- dry-run 2회 byte-identical.

---

## 5. 게이트 준수 / 중지 조건

| WO 게이트 | 결과 |
|---|---|
| 기존 ko target 26 master IDs 정본 | ✅ pilot rollback_master_ids |
| source_ref_id 단독 열거 금지 | ✅ 26 master_id 리스트 스코프 |
| en 번역·디자인·canonical | ✅ build byte-identical · flip 26 |
| ko 불변 | ✅ 사후검증 koCanonical 26 · 독립검증 md5 불변 |
| 독립검증 | ✅ (§4) |
| ALREADY_COMPLETE no-op | ✅ write 0 |

중지 조건 해당 없음(대상 26 일치 · 기존 en canonical 0 · byte-identical·수치·안전 게이트 통과 · 혼입 0 · write 52=예상 · 사후검증 PASS · ko 불변).

---

## 6. 커밋 범위 / ⚠️ 공유 러너 처리

- **자기 산출물 path-specific commit**: `otc-grounded-upgrade-erdosteine-300mg-jeong.run.json`(EN 스코프) · `otc-en-complete-erdosteine-300mg-jeong.run.json`(결과) · `otc-en-translations-erdosteine-300mg-jeong-v1.json`(번역) · `otc-erdosteine-en-probe.ts`(byte-identical 프로브) · 본 CHECK.
- **⚠️ 공유 러너 `drug-otc-en-complete-runner.ts` 는 본 커밋에서 제외**: 동일 1H 라운드를 병렬 진행 중인 **에이전트 가(GA-V1)·다(DA-V1)의 미커밋 registry entry** 가 같은 작업 트리 파일에 함께 있어, path-specific 이라도 커밋 시 타 세션 미커밋 작업이 스윕된다("타 세션 파일 커밋 금지" 준수). 본 그룹의 registry entry(주석 `WO-...-NA-V1 (에이전트 나)`)는 작업 트리에 존재하며, **러너를 커밋하는 세션이 함께 반영**한다. erdosteine EN 26 은 DB 에 이미 LIVE 이므로 registry 커밋 시점과 무관하게 결과는 확정.
- `pnpm-lock.yaml`(타 세션 staged)·타 세션 데이터/스크립트 미접촉.

### 등재 entry (러너 커밋 시 포함될 내용, 참조)

```ts
'erdosteine-300mg-jeong': {
  key: '에르도스테인|300밀리그램|정',
  candidate: '03e0af9d-5236-460a-86d4-1af8b0c00c61',
  sourceType: 'mfds_drug_otc', expected: 26,
  koRunBase: 'otc-grounded-upgrade-erdosteine-300mg-jeong',
  translationFile: 'otc-en-translations-erdosteine-300mg-jeong-v1.json',
  outBase: 'otc-en-complete-erdosteine-300mg-jeong',
},
```

---

## 7. 완료 보고 요약

- **en**: needs_review 26 → canonical 26 LIVE (write 52)
- **번역**: build byte-identical to live out9 en(md5 `2b7c07261d89e55c17a53fe80ff57d79`) — 에르도스테인 300mg 정 35 master en 통일
- **독립 검증**: PASS · **재실행 no-op**: ALREADY_COMPLETE(write 0)
- **ko canonical**: 26 불변 · **out9 en**: 불변 · **canonical dup**: 전역 0
- **다음**: Track A en 결손 **0** 도달(전 그룹 ko/en 완결). 잔여 READY_SINGLE 는 가·다가 병렬 진행 중.

> 에르도스테인 300mg 정 ko(26)·en(26) 완결. Track A 유일 결손 해소. 실행 배정 나머지는 별도 WO.
