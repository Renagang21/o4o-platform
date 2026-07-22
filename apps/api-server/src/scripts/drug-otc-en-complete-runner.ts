/**
 * WO-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-EN-COMPLETE-DA-V1 (범용 en-complete runner)
 *
 * ko canonical LIVE 그룹의 영어 STORE 설명서를 en needs_review 전개 → canonical 완결.
 *   트리메부틴 en 완결(drug-otc-trimebutine-100mg-en.ts) 검증본을 그룹 registry 로 일반화.
 *   후속 그룹(디오스민 등)은 EN_REGISTRY 에 최소 등재로 재사용.
 *
 * ★ 스코프 안전(트리메부틴/바실루스 실증): candidate/source_ref_id 는 여러 fp 그룹에 **공유**될 수 있고
 *   대상 밖(out) master 가 이미 en canonical 을 가질 수 있다. → **대상은 grounded-upgrade runner 산출
 *   master_id 리스트로만 스코프**(source_ref_id 스코프 금지). 동일 약물이면(대상 ko == out ko) out 의
 *   검토완료 en 을 재구성, **build == live out en byte-identical** 을 게이트로 새 medical fact 0 증명.
 *
 * 정책: BULK-TRANSLATION-EXECUTION-GUIDE §0-B(grounded ko canonical 충실 번역=허용) · §3~§6.
 *   INSERT/상태전환만 · 단일 TX · 이중게이트 · dry-run 우선 · ko canonical UPDATE 0.
 *
 * dry-run 기본. apply 이중게이트: --apply + DRUG_OTC_EN_COMPLETE_CONFIRM=YES.
 *   apply = STEP1 en needs_review INSERT(TX1) → STEP2 canonical flip(TX2, 지문 불변 증명).
 *   재실행 = ALREADY_COMPLETE no-op(대상 en 이미 canonical·내용 build 일치 감지).
 *
 * Usage(apps/api-server): npx tsx src/scripts/drug-otc-en-complete-runner.ts --group=<key> [--apply]
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const TRANSLATIONS_DIR = path.resolve(process.cwd(), '../../docs/guides/products/drug/pilot-en-design/translations');

// query() RETURNING 정규화(Gotcha #3): [rows, affected] | rows | [].
const retRows = <T = { id?: string }>(res: unknown): T[] =>
  (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

interface EnCompleteConfig {
  key: string;              // groupKey (번역 JSON 매칭)
  candidate: string;        // authored source_ref_id (write-owner) — 스코프 아님, write 값
  sourceType: string;       // authored source_type (mfds_drug_otc | nutrition_combo)
  expected: number;         // 대상 master 수 (= ko canonical)
  koRunBase: string;        // grounded-upgrade runner 산출 stem (data/<koRunBase>.run.json → rollback_master_ids)
  translationFile: string;  // translations/ 파일명
  outBase: string;          // 산출 JSON stem
}

/** 등록 그룹 = ko canonical LIVE 확인분만. 후속은 스코프 조사 후 최소 등재. */
const EN_REGISTRY: Record<string, EnCompleteConfig> = {
  // 트리메부틴(검증 완료 · 재실행 regression: ALREADY_COMPLETE 기대)
  'trimebutine-100mg-jeong': {
    key: '트리메부틴말레산염|100밀리그램|정',
    candidate: '003beef8-82c4-4897-a176-d0ea8a695699',
    sourceType: 'mfds_drug_otc', expected: 66,
    koRunBase: 'otc-grounded-upgrade-trimebutine-100mg-jeong',
    translationFile: 'otc-en-translations-trimebutine-100mg-v1.json',
    outBase: 'otc-en-complete-trimebutine-100mg',
  },
  // 바실루스리케니포르미스균 250mg 캡슐 (WO-...-BACILLUS-...-EN-COMPLETE-DA-V1)
  //   source_ref_id 022f4af0 = 64 ko 공유(56 target + 8 out56). out56 8 이미 en canonical LIVE.
  //   56 ko == 8 ko(동일 약물) → out56 en 재구성. 56 master_id 스코프.
  'bacillus-liche-250mg-capsule': {
    key: '바실루스리케니포르미스균|250밀리그램|캡슐',
    candidate: '022f4af0-1219-428b-bd69-fa39a5e7fe7f',
    sourceType: 'mfds_drug_otc', expected: 56,
    koRunBase: 'otc-grounded-upgrade-bacillus-liche-250mg-capsule',
    translationFile: 'otc-en-translations-bacillus-liche-250mg-v1.json',
    outBase: 'otc-en-complete-bacillus-liche-250mg',
  },
  // 로라타딘 10mg 정 (WO-O4O-OTC-LORATADINE-10MG-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 0a7dee0b = 51 ko 공유(38 target + 13 out). out13 이미 en canonical LIVE(md5 056512e1).
  //   38 ko == 13 ko(동일 약물) → out13 en 재구성. 38 master_id 스코프(source_ref 스코프 금지).
  'loratadine-10mg-jeong': {
    key: '로라타딘|10밀리그램|정',
    candidate: '0a7dee0b-e578-4015-967a-fad092071eef',
    sourceType: 'mfds_drug_otc', expected: 38,
    koRunBase: 'otc-grounded-upgrade-loratadine-10mg-jeong',
    translationFile: 'otc-en-translations-loratadine-10mg-v1.json',
    outBase: 'otc-en-complete-loratadine-10mg',
  },
  // 알벤다졸 400mg 정 (WO-O4O-OTC-ALBENDAZOLE-400MG-KO-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 0178f85b = 71 ko 공유(38 target + 33 out). out33 이미 en canonical LIVE(md5 11800175).
  //   38 ko == 33 ko(동일 약물) → out33 en 재구성. 38 master_id 스코프(source_ref 스코프 금지).
  'albendazole-400mg-jeong': {
    key: '알벤다졸|400밀리그램|정',
    candidate: '0178f85b-94d7-4ac9-a061-ac4c2d9ad750',
    sourceType: 'mfds_drug_otc', expected: 38,
    koRunBase: 'otc-grounded-upgrade-albendazole-400mg-jeong',
    translationFile: 'otc-en-translations-albendazole-400mg-v1.json',
    outBase: 'otc-en-complete-albendazole-400mg',
  },
  // 알마게이트 500mg 정 (WO-O4O-OTC-ALMAGATE-500MG-KO-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 01a231cd = 63 ko 공유(37 target + 26 out). out26 이미 en canonical LIVE(md5 8e5a52ff).
  //   37 ko == 26 ko(동일 약물) → out26 en 재구성. 37 master_id 스코프(source_ref 스코프 금지).
  'almagate-500mg-jeong': {
    key: '알마게이트|500밀리그램|정',
    candidate: '01a231cd-b471-4d93-8071-b271f8c4627d',
    sourceType: 'mfds_drug_otc', expected: 37,
    koRunBase: 'otc-grounded-upgrade-almagate-500mg-jeong',
    translationFile: 'otc-en-translations-almagate-500mg-v1.json',
    outBase: 'otc-en-complete-almagate-500mg',
  },
  // 디오스민 300mg 캡슐 (WO-O4O-OTC-DIOSMIN-300MG-EN-COMPLETE-DA-V1 · 에이전트 다)
  //   source_ref 05be62a5 = 50 ko 공유(38 target + 12 out). out12 이미 en canonical LIVE(md5 5e22fbf8).
  //   38 ko == 12 ko(동일 약물) → out12 en 재구성. 38 master_id 스코프(source_ref 스코프 금지).
  'diosmin-300mg-capsule': {
    key: '디오스민|300밀리그램|캡슐',
    candidate: '05be62a5-89dc-4f20-95f9-cb6187f5ab35',
    sourceType: 'mfds_drug_otc', expected: 38,
    koRunBase: 'otc-grounded-upgrade-diosmin-300mg-capsule',
    translationFile: 'otc-en-translations-diosmin-300mg-v1.json',
    outBase: 'otc-en-complete-diosmin-300mg',
  },
  // 클로닉신리시네이트 125mg 연질캡슐 (WO-O4O-OTC-CLONIXIN-125MG-SOFTCAP-KO-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 03de1849 = 34 ko 공유(27 target + 7 out). out7 이미 en canonical LIVE(md5 d359211f, summary null).
  //   27 ko == 7 ko(동일 약물) → out7 en 재구성. 27 master_id 스코프(source_ref 스코프 금지).
  'clonixin-125mg-softcap': {
    key: '클로닉신리시네이트|125밀리그램|연질캡슐',
    candidate: '03de1849-7d18-4ea4-8896-63a3658540c4',
    sourceType: 'mfds_drug_otc', expected: 27,
    koRunBase: 'otc-grounded-upgrade-clonixin-125mg-softcap',
    translationFile: 'otc-en-translations-clonixin-125mg-softcap-v1.json',
    outBase: 'otc-en-complete-clonixin-125mg-softcap',
  },
  // 트리메부틴말레산염 150mg 정 (WO-O4O-OTC-TRIMEBUTINE-150MG-KO-EN-COMPLETE-DA-V1 · 에이전트 다)
  //   100mg 그룹과 별개 함량. source_ref 00f0325a = 67 ko 공유(28 target + 39 out). out39 이미 en canonical LIVE(md5 a575ea00).
  //   28 ko == 39 ko(동일 약물·150mg) → out39 en 재구성. 28 master_id 스코프(source_ref 스코프 금지).
  'trimebutine-150mg-jeong': {
    key: '트리메부틴말레산염|150밀리그램|정',
    candidate: '00f0325a-c5a4-4d3c-b900-1774a24509f5',
    sourceType: 'mfds_drug_otc', expected: 28,
    koRunBase: 'otc-grounded-upgrade-trimebutine-150mg-jeong',
    translationFile: 'otc-en-translations-trimebutine-150mg-v1.json',
    outBase: 'otc-en-complete-trimebutine-150mg',
  },
  // 클로닉신리시네이트 125mg 정 (WO-O4O-OTC-CLONIXIN-125MG-TABLET-KO-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   125mg 연질캡슐(source_ref 03de1849, md5 d359211f)과 별개 제형. source_ref 01994863 = 55 ko 공유(26 target + 29 out).
  //   out29 이미 en canonical LIVE(md5 67144df2, summary null). 26 ko == 29 ko(동일 약물, md5 c1c0bede) → out29 en 재사용.
  //   struct 는 bulk batch-01 번역에서 채택(build md5 == live out en byte-identical). 26 master_id 스코프(source_ref 스코프 금지).
  'clonixin-125mg-jeong': {
    key: '클로닉신리시네이트|125밀리그램|정',
    candidate: '01994863-920a-45ea-97d1-f493416cafa7',
    sourceType: 'mfds_drug_otc', expected: 26,
    koRunBase: 'otc-grounded-upgrade-clonixin-125mg-jeong',
    translationFile: 'otc-en-translations-clonixin-125mg-jeong-v1.json',
    outBase: 'otc-en-complete-clonixin-125mg-jeong',
  },
  // 브로멜라인 100mg 정 (WO-O4O-OTC-BROMELAIN-100MG-KO-EN-COMPLETE-DA-V1 · 에이전트 다)
  //   source_ref 0308eaa4 = 51 ko 공유(22 target + 29 out). out29 이미 en canonical LIVE(md5 4d4f202f).
  //   22 ko == 29 ko(동일 약물, ko md5 ad63397c) → out29 en 재구성(otc-en-translations-v1.json 동일 groupKey 발췌).
  //   build == live out29 en byte-identical 게이트로 새 medical fact 0 증명. 22 master_id 스코프(source_ref 스코프 금지).
  //   45mg 그룹(source_ref 11b41481)과 별개 함량 — 미접촉.
  'bromelain-100mg-jeong': {
    key: '브로멜라인|100밀리그램|정',
    candidate: '0308eaa4-7c2d-4ca1-95b7-aae82d767f0a',
    sourceType: 'mfds_drug_otc', expected: 22,
    koRunBase: 'otc-grounded-upgrade-bromelain-100mg-jeong',
    translationFile: 'otc-en-translations-bromelain-100mg-v1.json',
    outBase: 'otc-en-complete-bromelain-100mg',
  },
  // 아세트아미노펜 325mg 연질캡슐 (WO-O4O-OTC-ACETAMINOPHEN-NAPROXEN-KO-EN-COMPLETE-DA-V1 · 에이전트 다)
  //   source_ref 07fd7b8f 공유 ko == 대상 ko(동일 약물) → out en 재구성(otc-en-translations-v1.json 동일 groupKey 발췌).
  //   build == live out en byte-identical 게이트로 새 medical fact 0 증명. 18 master_id 스코프.
  'acetaminophen-325mg-softcap': {
    key: '아세트아미노펜|325밀리그램|연질캡슐',
    candidate: '07fd7b8f-fa67-41d8-8afe-37cf3bcd78f7',
    sourceType: 'mfds_drug_otc', expected: 18,
    koRunBase: 'otc-grounded-upgrade-acetaminophen-325mg-softcap',
    translationFile: 'otc-en-translations-acetaminophen-325mg-softcap-v1.json',
    outBase: 'otc-en-complete-acetaminophen-325mg-softcap',
  },
  // 나프록센 250mg 연질캡슐 (WO-O4O-OTC-ACETAMINOPHEN-NAPROXEN-KO-EN-COMPLETE-DA-V1 · 에이전트 다)
  //   source_ref 02355c78 공유 ko == 대상 ko(동일 약물) → out en 재구성(otc-en-translations-v1.json 동일 groupKey 발췌).
  //   build == live out en byte-identical 게이트로 새 medical fact 0 증명. 15 master_id 스코프.
  'naproxen-250mg-softcap': {
    key: '나프록센|250밀리그램|연질캡슐',
    candidate: '02355c78-3d6d-4f6b-8120-de9ff7f14673',
    sourceType: 'mfds_drug_otc', expected: 15,
    koRunBase: 'otc-grounded-upgrade-naproxen-250mg-softcap',
    translationFile: 'otc-en-translations-naproxen-250mg-softcap-v1.json',
    outBase: 'otc-en-complete-naproxen-250mg-softcap',
  },
  // 니자티딘 75mg 정 (WO-O4O-OTC-NIZATIDINE-LEVOCARNITINE-SOBREROL-KO-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 048ba86f = 51 ko 공유(18 target + 33 out). out33 이미 en canonical LIVE(md5 e18e8f84, summary "Excess stomach acid…").
  //   18 ko == 33 ko(동일 약물, md5 570e1e97) → out33 en 재사용. struct=마스터 번역 발췌. 18 master_id 스코프.
  'nizatidine-75mg-jeong': {
    key: '니자티딘|75밀리그램|정',
    candidate: '048ba86f-f85e-42f8-97fd-7bc4e46cc092',
    sourceType: 'mfds_drug_otc', expected: 18,
    koRunBase: 'otc-grounded-upgrade-nizatidine-75mg-jeong',
    translationFile: 'otc-en-translations-nizatidine-75mg-jeong-v1.json',
    outBase: 'otc-en-complete-nizatidine-75mg-jeong',
  },
  // 엘카르니틴 330mg 정 (WO-O4O-OTC-NIZATIDINE-LEVOCARNITINE-SOBREROL-KO-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 035efa8f = 28 ko 공유(16 target + 12 out). out12 이미 en canonical LIVE(md5 4319e705, summary "Carnitine deficiency…").
  //   16 ko == 12 ko(동일 약물, md5 94749597) → out12 en 재사용. struct=마스터 번역 발췌. 16 master_id 스코프.
  'levocarnitine-330mg-jeong': {
    key: '엘카르니틴|330밀리그램|정',
    candidate: '035efa8f-cc53-4e64-a111-c4528689f457',
    sourceType: 'mfds_drug_otc', expected: 16,
    koRunBase: 'otc-grounded-upgrade-levocarnitine-330mg-jeong',
    translationFile: 'otc-en-translations-levocarnitine-330mg-jeong-v1.json',
    outBase: 'otc-en-complete-levocarnitine-330mg-jeong',
  },
  // 소브레롤 200mg 캡슐 (WO-O4O-OTC-NIZATIDINE-LEVOCARNITINE-SOBREROL-KO-EN-COMPLETE-GA-V1 · 에이전트 가)
  //   source_ref 0ff909f4 = 18 ko 공유(15 target + 3 out). out3 이미 en canonical LIVE(md5 e987fc7c, summary "Sudden and long-lasting bronchitis…").
  //   15 ko == 3 ko(동일 약물, md5 c05847a8) → out3 en 재사용. struct=마스터 번역 발췌. 15 master_id 스코프.
  'sobrerol-200mg-capsule': {
    key: '소브레롤|200밀리그램|캡슐',
    candidate: '0ff909f4-20dc-49d1-b8c5-91794ab62df6',
    sourceType: 'mfds_drug_otc', expected: 15,
    koRunBase: 'otc-grounded-upgrade-sobrerol-200mg-capsule',
    translationFile: 'otc-en-translations-sobrerol-200mg-capsule-v1.json',
    outBase: 'otc-en-complete-sobrerol-200mg-capsule',
  },
  // ── batch-8 번들 A (WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-A-KO-EN-GA-V1 · 에이전트 가) ──
  //   4그룹 모두 source_ref 공유 out en canonical 단일 md5 · 대상 기존 en 0.
  //   translationFile = 마스터 번역 발췌(otc-batch8-bundleA-en-probe.ts 로 build == live out en byte-identical 선증명).
  //   대상 스코프는 ko run.json rollback_master_ids (source_ref 스코프 금지).

  // 락토바실루스아시도필루스균 300mg 캡슐 — out13 en canonical LIVE(md5 81c45380). 13 master_id 스코프.
  'lactobacillus-acidophilus-300mg-capsule': {
    key: '락토바실루스아시도필루스균|300밀리그램|캡슐',
    candidate: '177466cf-a57b-4381-b1ff-44bc87c12673',
    sourceType: 'mfds_drug_otc', expected: 13,
    koRunBase: 'otc-grounded-upgrade-lactobacillus-acidophilus-300mg-capsule',
    translationFile: 'otc-en-translations-lactobacillus-acidophilus-300mg-v1.json',
    outBase: 'otc-en-complete-lactobacillus-acidophilus-300mg-capsule',
  },
  // 알파칼시돌 0.5μg 연질캡슐 — out21 en canonical LIVE(md5 d0e85235, summary null). 12 master_id 스코프.
  //   1μg 그룹(batch-02 번역)과 별개 함량 — 미접촉.
  'alfacalcidol-0.5mcg-softcap': {
    key: '알파칼시돌|0.5마이크로그램|연질캡슐',
    candidate: '0436f0d8-3dbe-4939-b511-de3bcd69593c',
    sourceType: 'mfds_drug_otc', expected: 12,
    koRunBase: 'otc-grounded-upgrade-alfacalcidol-0.5mcg-softcap',
    translationFile: 'otc-en-translations-alfacalcidol-0.5mcg-softcap-v1.json',
    outBase: 'otc-en-complete-alfacalcidol-0.5mcg-softcap',
  },
  // 아세틸시스테인 100mg 캡슐 — out3 en canonical LIVE(md5 c167e18f). 9 master_id 스코프.
  'acetylcysteine-100mg-capsule': {
    key: '아세틸시스테인|100밀리그램|캡슐',
    candidate: '240871d7-3dce-43e9-a0d5-3b3bcbd7c5a4',
    sourceType: 'mfds_drug_otc', expected: 9,
    koRunBase: 'otc-grounded-upgrade-acetylcysteine-100mg-capsule',
    translationFile: 'otc-en-translations-acetylcysteine-100mg-capsule-v1.json',
    outBase: 'otc-en-complete-acetylcysteine-100mg-capsule',
  },
  // 나프록센나트륨 275mg 정 — out40 en canonical LIVE(md5 744aecaa, summary null). 8 master_id 스코프.
  //   나프록센 250mg 연질캡슐 그룹(source_ref 02355c78)과 별개 — 미접촉.
  'naproxen-sodium-275mg-jeong': {
    key: '나프록센나트륨|275밀리그램|정',
    candidate: '006f1a2b-f1f7-40a6-ac10-7f0093a150a1',
    sourceType: 'mfds_drug_otc', expected: 8,
    koRunBase: 'otc-grounded-upgrade-naproxen-sodium-275mg-jeong',
    translationFile: 'otc-en-translations-naproxen-sodium-275mg-jeong-v1.json',
    outBase: 'otc-en-complete-naproxen-sodium-275mg-jeong',
  },
  // ── batch-8 번들 B (WO-O4O-OTC-GROUNDED-UPGRADE-BATCH8-BUNDLE-B-KO-EN-DA-V1 · 에이전트 다) ──
  //   4그룹 모두 source_ref 공유 out en canonical 단일 md5 · 대상 기존 en 0.
  //   struct 출처·byte-identical 선증명 = src/scripts/otc-batch8-da-en-struct.ts / data/otc-batch8-da-en-struct.json.
  //   대상 스코프는 ko run.json rollback_master_ids (source_ref 스코프 금지).
  // 트리메부틴말레산염 200mg 정 — out3 en canonical LIVE(md5 b8021ac0). struct=마스터 번역 발췌. 13 master_id 스코프.
  //   100mg/150mg 그룹과 별개 함량 — 미접촉.
  'trimebutine-200mg-jeong': {
    key: '트리메부틴말레산염|200밀리그램|정',
    candidate: '0175e433-a171-44ec-b601-ad65a805171d',
    sourceType: 'mfds_drug_otc', expected: 13,
    koRunBase: 'otc-grounded-upgrade-trimebutine-200mg-jeong',
    translationFile: 'otc-en-translations-trimebutine-200mg-jeong-v1.json',
    outBase: 'otc-en-complete-trimebutine-200mg-jeong',
  },
  // 메코발라민 500μg 캡슐 — out10 en canonical LIVE(md5 9e31eba0). 마스터 번역 부재 →
  //   live en canonical 을 빌더 계약 역파싱으로 복원(창작 0·새 medical fact 0, md5 일치가 게이트). 10 master_id 스코프.
  'mecobalamin-500ug-capsule': {
    key: '메코발라민|500마이크로그램|캡슐',
    candidate: '0908968f-30c8-4c9b-95ed-5631212adbc9',
    sourceType: 'mfds_drug_otc', expected: 10,
    koRunBase: 'otc-grounded-upgrade-mecobalamin-500ug-capsule',
    translationFile: 'otc-en-translations-mecobalamin-500ug-capsule-v1.json',
    outBase: 'otc-en-complete-mecobalamin-500ug-capsule',
  },
  // 덱스판테놀 100mg 정 — out4 en canonical LIVE(md5 2bbeab23). struct=마스터 번역 발췌. 9 master_id 스코프.
  'dexpanthenol-100mg-jeong': {
    key: '덱스판테놀|100밀리그램|정',
    candidate: '0d2b2ef8-cce5-4771-9ed7-159fd10c1715',
    sourceType: 'mfds_drug_otc', expected: 9,
    koRunBase: 'otc-grounded-upgrade-dexpanthenol-100mg-jeong',
    translationFile: 'otc-en-translations-dexpanthenol-100mg-jeong-v1.json',
    outBase: 'otc-en-complete-dexpanthenol-100mg-jeong',
  },
  // 폴산 1mg 정 — out8 en canonical LIVE(md5 5c41a406). struct=마스터 번역 발췌. 9 master_id 스코프.
  'folic-acid-1mg-jeong': {
    key: '폴산|1밀리그램|정',
    candidate: '068e2176-ee92-4e94-a47d-2dc632bacf53',
    sourceType: 'mfds_drug_otc', expected: 9,
    koRunBase: 'otc-grounded-upgrade-folic-acid-1mg-jeong',
    translationFile: 'otc-en-translations-folic-acid-1mg-jeong-v1.json',
    outBase: 'otc-en-complete-folic-acid-1mg-jeong',
  },
  // ── WO-O4O-OTC-NEXT-BATCH-AUDIT-AND-KO-EN-COMPLETE-GA-V1 (에이전트 가) 상위 3 READY ──
  //    각 그룹 out-of-scope reviewed EN sibling 존재 → build == live out en byte-identical 재사용.
  'dexibuprofen-300mg-jeong': {
    key: '덱시부프로펜|300밀리그램|정',
    candidate: '002c309a-8576-48ec-938a-19bc1478bacb',
    sourceType: 'mfds_drug_otc', expected: 8,
    koRunBase: 'otc-grounded-upgrade-dexibuprofen-300mg-jeong',
    translationFile: 'otc-en-translations-dexibuprofen-300mg-v1.json',
    outBase: 'otc-en-complete-dexibuprofen-300mg',
  },
  'diosmin-600mg-jeong': {
    key: '디오스민|600밀리그램|정',
    candidate: '014af1cd-d228-4de9-8036-3a0679b2af87',
    sourceType: 'mfds_drug_otc', expected: 8,
    koRunBase: 'otc-grounded-upgrade-diosmin-600mg-jeong',
    translationFile: 'otc-en-translations-diosmin-600mg-v1.json',
    outBase: 'otc-en-complete-diosmin-600mg',
  },
  'magnesium-hydroxide-500mg-jeong': {
    key: '수산화마그네슘|500밀리그램|정',
    candidate: '048b8e71-c651-49da-9d27-de5900c11d9f',
    sourceType: 'mfds_drug_otc', expected: 8,
    koRunBase: 'otc-grounded-upgrade-magnesium-hydroxide-500mg-jeong',
    translationFile: 'otc-en-translations-magnesium-hydroxide-500mg-v1.json',
    outBase: 'otc-en-complete-magnesium-hydroxide-500mg',
  },
  // ── WO-O4O-OTC-NEXT-BATCH-AUDIT-AND-KO-EN-COMPLETE-GA-V1 (에이전트 가) 2차 배치 상위 3 READY ──
  //    각 그룹 out-of-scope reviewed EN sibling 존재 → build == live out en byte-identical 재사용.
  //    아르기닌티디아시케이트는 표준 번역파일 entry 부재 → live out en HTML 역구성(diff 0 확인).
  'nifuroxazide-200mg-capsule': {
    key: '니푸록사지드|200밀리그램|캡슐',
    candidate: '05c733cd-5c5e-4a09-9e3c-4f4d470d2a10',
    sourceType: 'mfds_drug_otc', expected: 7,
    koRunBase: 'otc-grounded-upgrade-nifuroxazide-200mg-capsule',
    translationFile: 'otc-en-translations-nifuroxazide-200mg-v1.json',
    outBase: 'otc-en-complete-nifuroxazide-200mg',
  },
  'saccharomyces-boulardii-282-5mg-capsule': {
    key: '사카로마이세스보울라르디균|282.5밀리그램|캡슐',
    candidate: '16f0c2ef-44eb-4629-a82c-e7fc69511b94',
    sourceType: 'mfds_drug_otc', expected: 7,
    koRunBase: 'otc-grounded-upgrade-saccharomyces-boulardii-282-5mg-capsule',
    translationFile: 'otc-en-translations-saccharomyces-boulardii-282-5mg-v1.json',
    outBase: 'otc-en-complete-saccharomyces-boulardii-282-5mg',
  },
  'arginine-tidiacicate-200mg-softcap': {
    key: '아르기닌티디아시케이트|200밀리그램|연질캡슐',
    candidate: '20d395df-0846-428a-b5e1-684cb9e08fb6',
    sourceType: 'mfds_drug_otc', expected: 7,
    koRunBase: 'otc-grounded-upgrade-arginine-tidiacicate-200mg-softcap',
    translationFile: 'otc-en-translations-arginine-tidiacicate-200mg-v1.json',
    outBase: 'otc-en-complete-arginine-tidiacicate-200mg',
  },
  // ── WO-O4O-OTC-TRACK-A-1H-PRODUCTION-GA-V1 (에이전트 가) ──  이부프로펜은 표준 번역파일 부재→live out en 역구성(diff 0)
  'acetaminophen-650mg-jeong': {
    key: '아세트아미노펜|650밀리그램|정',
    candidate: '05690081-c79e-456f-a8ec-5e1a3f4fd1de',
    sourceType: 'mfds_drug_otc', expected: 7,
    koRunBase: 'otc-grounded-upgrade-acetaminophen-650mg-jeong',
    translationFile: 'otc-en-translations-acetaminophen-650mg-v1.json',
    outBase: 'otc-en-complete-acetaminophen-650mg',
  },
  'ibuprofen-200mg-softcap': {
    key: '이부프로펜|200밀리그램|연질캡슐',
    candidate: '0203e1b4-7237-4641-b2b5-a918867b3514',
    sourceType: 'mfds_drug_otc', expected: 7,
    koRunBase: 'otc-grounded-upgrade-ibuprofen-200mg-softcap',
    translationFile: 'otc-en-translations-ibuprofen-200mg-v1.json',
    outBase: 'otc-en-complete-ibuprofen-200mg',
  },
  'bromelain-45mg-jeong': {
    key: '브로멜라인|45밀리그램|정',
    candidate: '11b41481-c75c-4447-bf25-8c064bff838d',
    sourceType: 'mfds_drug_otc', expected: 6,
    koRunBase: 'otc-grounded-upgrade-bromelain-45mg-jeong',
    translationFile: 'otc-en-translations-bromelain-45mg-v1.json',
    outBase: 'otc-en-complete-bromelain-45mg',
  },
  // ── WO-O4O-OTC-TRACK-A-1H-PRODUCTION-DA-V1 (에이전트 다) — sibling en byte-identical 재사용 ──
  'alfacalcidol-1mcg-softcap': {
    key: '알파칼시돌|1마이크로그램|연질캡슐',
    candidate: '06a1eed0-e249-402a-a4f0-e234d1f952ed',
    sourceType: 'mfds_drug_otc', expected: 6,
    koRunBase: 'otc-grounded-upgrade-alfacalcidol-1mcg-softcap',
    translationFile: 'otc-en-translations-alfacalcidol-1mcg-v1.json',
    outBase: 'otc-en-complete-alfacalcidol-1mcg-softcap',
  },
  'ibuprofen-arginine-368mg-jeong': {
    key: '이부프로펜아르기닌|368.9밀리그램|정',
    candidate: '11b84cc1-a386-47b5-9337-6643dc1ab438',
    sourceType: 'mfds_drug_otc', expected: 6,
    koRunBase: 'otc-grounded-upgrade-ibuprofen-arginine-368mg-jeong',
    translationFile: 'otc-en-translations-ibuprofen-arginine-368mg-v1.json',
    outBase: 'otc-en-complete-ibuprofen-arginine-368mg-jeong',
  },
  'polysaccharide-iron-326mg-capsule': {
    key: '폴리사카리드철착염|326.1밀리그램|캡슐',
    candidate: '096e8a7c-d0a7-4d71-a55a-f3eb9bc5923c',
    sourceType: 'mfds_drug_otc', expected: 6,
    koRunBase: 'otc-grounded-upgrade-polysaccharide-iron-326mg-capsule',
    translationFile: 'otc-en-translations-polysaccharide-iron-326mg-v1.json',
    outBase: 'otc-en-complete-polysaccharide-iron-326mg-capsule',
  },
  // ── WO-O4O-OTC-TRACK-A-1H-PRODUCTION-NA-V1 (에이전트 나) — Track A 유일 en 결손 완결 ──
  //   에르도스테인 300mg 정: Track A 최초 파일럿(ko 26 LIVE, en 0). source_ref 03e0af9d = 35 ko 공유
  //   (26 target + 9 out). out9 이미 en canonical LIVE(md5 2b7c07261d89e55c17a53fe80ff57d79).
  //   26 ko == 9 ko(동일 약물, md5 459f20ef) → out9 en 을 빌더 계약 역매핑으로 복원(새 medical fact 0,
  //   build == live out en byte-identical 게이트로 증명). 26 master_id 스코프(source_ref 스코프 금지).
  //   koRunBase = pilot 파생 스코프(otc-grounded-upgrade-erdosteine-300mg-jeong.run.json.rollback_master_ids).
  'erdosteine-300mg-jeong': {
    key: '에르도스테인|300밀리그램|정',
    candidate: '03e0af9d-5236-460a-86d4-1af8b0c00c61',
    sourceType: 'mfds_drug_otc', expected: 26,
    koRunBase: 'otc-grounded-upgrade-erdosteine-300mg-jeong',
    translationFile: 'otc-en-translations-erdosteine-300mg-jeong-v1.json',
    outBase: 'otc-en-complete-erdosteine-300mg-jeong',
  },
};

async function runEnComplete(cfg: EnCompleteConfig, opts: { apply: boolean }): Promise<Record<string, unknown>> {
  const mode = opts.apply ? 'APPLY' : 'dry-run';
  const EXPECTED = cfg.expected;
  const outFile = `${cfg.outBase}.run.json`;

  const masterIds: string[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${cfg.koRunBase}.run.json`), 'utf8')).rollback_master_ids;
  const enFile = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, cfg.translationFile), 'utf8')) as { translations: DrugOtcEnTranslation[]; summary?: string };
  const trs = enFile.translations.filter((t) => t.groupKey === cfg.key);
  const summaryField = enFile.summary ?? null;

  const report: any = {
    wo: 'WO-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-EN-COMPLETE-DA-V1', mode, status: 'INIT', dbWrite: 0,
    groupKey: cfg.key, writeOwner: { kind: 'authored_source_ref_id', value: cfg.candidate, sourceType: cfg.sourceType },
    expected: EXPECTED, targetMasters: masterIds.length, anomalies: [] as string[],
  };

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  try {
    if (masterIds.length !== EXPECTED) report.anomalies.push(`target master ${masterIds.length} !== ${EXPECTED}`);
    if (new Set(masterIds).size !== masterIds.length) report.anomalies.push('target master 중복');
    if (trs.length !== 1) report.anomalies.push(`번역 그룹당 1건 아님 (${trs.length})`);

    // 대상(EXPECTED) 상태: ko canonical / en STORE
    const st = retRows<{ ko_canon: string; en_any: string; en_canon: string; en_nr: string }>(await ds.query(`
      SELECT
        count(*) FILTER (WHERE lang='ko' AND status='canonical' AND source_type=$2)::text ko_canon,
        count(*) FILTER (WHERE lang='en')::text en_any,
        count(*) FILTER (WHERE lang='en' AND status='canonical')::text en_canon,
        count(*) FILTER (WHERE lang='en' AND status='needs_review')::text en_nr
      FROM (SELECT s.master_id, COALESCE(s.language,'ko') lang, s.status, s.source_type
            FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL) x`,
      [masterIds, cfg.sourceType]))[0];
    report.koCanonical = parseInt(st.ko_canon, 10);
    report.existingEnAny = parseInt(st.en_any, 10);
    report.existingEnCanonical = parseInt(st.en_canon, 10);
    report.existingEnNeedsReview = parseInt(st.en_nr, 10);
    if (report.koCanonical !== EXPECTED) report.anomalies.push(`대상 ko canonical ${report.koCanonical} !== ${EXPECTED}`);

    // 일관성 참조: 동일 약물 out(source_ref_id 공유, 대상 밖) en canonical 지문
    const ref = retRows<{ h: string; n: string }>(await ds.query(`
      SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions
      WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1`, [cfg.candidate, masterIds]));
    report.referenceEn = ref.map((r) => ({ md5: r.h, n: parseInt(r.n, 10) }));

    // build en + 게이트
    const tr = trs[0];
    const built = trs.length === 1 ? buildDrugOtcEnConsumerHtml(tr) : { html: '', missing: ['no-translation'] };
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (/[가-힣]/.test(built.html)) report.anomalies.push('한글 포함');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.builtLen = built.html.length; report.builtMd5 = md5(built.html);

    // 일관성 게이트: build == live out en (동일 약물 → byte-identical, 새 fact 0 증명)
    if (ref.length === 1) {
      report.consistencyMatch = report.builtMd5 === ref[0].h;
      if (!report.consistencyMatch) report.anomalies.push(`일관성 불일치: build md5 ${report.builtMd5} !== live out en ${ref[0].h}`);
    } else if (ref.length > 1) {
      report.consistencyMatch = false;
      report.anomalies.push(`out en canonical 지문 비균일 (${ref.length}종)`);
    } else {
      report.consistencyMatch = null;
      report.anomalies.push('out en canonical 참조 없음 (동일 약물 en 재사용 전제)');
    }

    report.summaryField = summaryField;
    report.plan = { STEP1_en_needs_review_INSERT: EXPECTED, STEP2_en_canonical_flip: EXPECTED, en_write_total: EXPECTED * 2 };

    // 완결 감지(재실행 no-op): 대상 이미 en canonical · 내용 build byte-identical
    const enTgt = retRows<{ h: string; n: string }>(await ds.query(
      `SELECT md5(content) h, count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1`, [masterIds]));
    report.enTargetMd5 = enTgt.length === 1 ? enTgt[0].h : (enTgt.length ? 'non-uniform' : null);
    const alreadyComplete = report.existingEnCanonical === EXPECTED && report.existingEnNeedsReview === 0
      && report.koCanonical === EXPECTED && report.consistencyMatch === true && report.enTargetMd5 === report.builtMd5;

    if (alreadyComplete) {
      report.status = 'ALREADY_COMPLETE';
      report.note = `대상 en 이미 canonical · 내용 build byte-identical(${report.builtMd5}) — write 0, 정상 종료`;
    } else {
      if (report.existingEnCanonical !== 0) report.anomalies.push(`대상 내 기존 en canonical ${report.existingEnCanonical} (부분/충돌)`);
      if (report.existingEnNeedsReview !== 0) report.anomalies.push(`대상 내 기존 en needs_review ${report.existingEnNeedsReview}`);
      if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }

      if (opts.apply) {
        report.dbWrite = 1;
        const qr = ds.createQueryRunner(); await qr.connect();
        // STEP1: en needs_review INSERT (멱등 WHERE NOT EXISTS)
        await qr.startTransaction();
        try {
          const ins = await qr.query(
            `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'en', 'STORE', now(), now()
             FROM unnest($1::uuid[]) mid
             WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.status IN ('needs_review','canonical'))
             RETURNING id`, [masterIds, cfg.sourceType, built.html, cfg.candidate, summaryField]);
          report.step1_inserted = retRows(ins).length;
          const dup1 = retRows<{ n: string }>(await qr.query(
            `SELECT count(*)::text n FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical') GROUP BY master_id HAVING count(*)>1) t`, [masterIds]))[0];
          if (parseInt(dup1.n, 10) > 0) throw new Error(`en STORE 중복 ${dup1.n} → ROLLBACK`);
          await qr.commitTransaction();
        } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }

        // STEP2: needs_review → canonical flip (지문 불변)
        await qr.startTransaction();
        try {
          const before = retRows<{ id: string; content: string; summary: string | null }>(await qr.query(
            `SELECT id::text id, content, summary FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL`,
            [masterIds, cfg.sourceType, cfg.candidate]));
          const fpBefore = new Map(before.map((r) => [r.id, `${r.content.length}:${md5(r.content)}:${r.summary ?? ''}`]));
          const flip = await qr.query(
            `UPDATE shared_product_descriptions SET status='canonical', updated_at=now()
             WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND source_type=$2 AND source_ref_id=$3::uuid AND deleted_at IS NULL
             RETURNING id::text`, [masterIds, cfg.sourceType, cfg.candidate]);
          report.step2_flipped = retRows(flip).length;
          const after = retRows<{ id: string; content: string; summary: string | null }>(await qr.query(
            `SELECT id::text id, content, summary FROM shared_product_descriptions WHERE id=ANY($1::uuid[])`, [[...fpBefore.keys()]]));
          let fpOk = 0;
          for (const a of after) if (fpBefore.get(a.id) === `${a.content.length}:${md5(a.content)}:${a.summary ?? ''}`) fpOk += 1;
          report.fingerprintOk = fpOk;
          const post = retRows<{ en_canon: string; en_nr: string; dup: string; ko_canon: string }>(await qr.query(`
            SELECT
              (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL) en_canon,
              (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='needs_review' AND deleted_at IS NULL) en_nr,
              (SELECT count(*)::text FROM (SELECT master_id FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY master_id HAVING count(*)>1) t) dup,
              (SELECT count(*)::text FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='ko' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL) ko_canon`,
            [masterIds, cfg.sourceType]))[0];
          report.post = { enCanonical: parseInt(post.en_canon, 10), enNeedsReview: parseInt(post.en_nr, 10), dup: parseInt(post.dup, 10), koCanonical: parseInt(post.ko_canon, 10) };
          if (report.fingerprintOk !== before.length) throw new Error(`지문 불일치 ${report.fingerprintOk}/${before.length} → ROLLBACK`);
          if (report.post.enCanonical !== EXPECTED || report.post.enNeedsReview !== 0 || report.post.dup !== 0 || report.post.koCanonical !== EXPECTED)
            throw new Error(`사후검증 실패 enCanon=${report.post.enCanonical} nr=${report.post.enNeedsReview} dup=${report.post.dup} koCanon=${report.post.koCanonical} → ROLLBACK`);
          await qr.commitTransaction();
        } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
        await qr.release();
        report.status = 'APPLIED';
      } else {
        report.status = 'PASS';
      }
    }
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    if (report.status === 'INIT') report.status = 'FAIL';
  } finally {
    await ds.destroy();
  }

  fs.writeFileSync(path.join(DATA_DIR, outFile), JSON.stringify(report, null, 2), 'utf8');
  return report;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const groupArg = (argv.find((a) => a.startsWith('--group=')) || '').split('=')[1];
  if (!groupArg || !EN_REGISTRY[groupArg]) {
    console.error(`--group=<key> 필요. 등록: ${Object.keys(EN_REGISTRY).join(', ')}`);
    process.exit(2);
  }
  const cfg = EN_REGISTRY[groupArg];
  const apply = argv.includes('--apply') && process.env.DRUG_OTC_EN_COMPLETE_CONFIRM === 'YES';
  const report = await runEnComplete(cfg, { apply });
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${report.mode}] group=${cfg.key} status=${report.status} · 대상 ${cfg.expected} en → ${(report as any).post?.enCanonical ?? '-'} canonical · 이상 ${(report as any).anomalies?.length ?? 0}`);
  if (report.error) process.exit(1);
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
