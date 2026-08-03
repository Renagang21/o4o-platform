/**
 * WO-O4O-EASY-DRUG-KO-REBUILD-PIPELINE-PILOT-VALIDATION-V1 / 작업 4
 *
 * e약은요 공식 원문(officialConsumerText) → 현행 O4O 설명서 구조(KO candidate) 시험 생성.
 *
 * **DB write 0 (B안)**: 이 스크립트는 DB 에 접속하지 않는다. 입력은
 * `export-pilot-population.sql` 로 추출한 JSON, 출력은 파일뿐이다.
 *
 * 생성 규칙은 신규 작성하지 않고 **운영 러너와 동일한 함수**를 import 해서 쓴다.
 * (`composeEasyDrugContent` + `sanitizeDescriptionHtml` = write-path 와 동일 조합)
 * → 이 파일럿이 검증하는 대상은 "시험용 사본"이 아니라 실제 파이프라인이다.
 *
 * 실행:
 *   npx tsx apps/api-server/src/scripts/easy-drug-ko-rebuild-pilot/generate-ko-candidates.ts \
 *     --in <pilot_population.json> --out <outDir>
 *
 * 산출물(outDir):
 *   candidates.jsonl        master 1건 = 1줄 (INSERT 예정 레코드와 동일 필드 구성)
 *   generation-report.json  집계 · 예상 INSERT 수 · 중복 실행 안전성
 *   problem-queue.jsonl     REVIEW / HOLD / INVALID 누적 (전 표본 끝까지 진행)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import {
  composeEasyDrugContent,
  EASY_DRUG_SPD_SOURCE_TYPE,
  EASY_DRUG_SPD_STATUS,
  type OfficialConsumerText,
} from '../../modules/neture/drug-import/easy-drug-shared-description-derive.service.js';
import { sanitizeDescriptionHtml } from '../../modules/neture/utils/sanitize-description-html.util.js';

/** 생성 규칙 버전 — 산출 레코드마다 기록해 추후 전량 생산분과 대조 가능하게 한다. */
export const KO_REBUILD_RULE_VERSION = 'EASY_DRUG_KO_REBUILD_V1';

/** composeEasyDrugContent 가 사용하는 절 순서·라벨(검증기와 공유하지 않는 로컬 기대값). */
const SECTION_ORDER: Array<[keyof OfficialConsumerText, string]> = [
  ['efficacy', '효능·효과'],
  ['usage', '용법·용량'],
  ['warning', '경고'],
  ['caution', '사용상 주의사항'],
  ['interaction', '상호작용'],
  ['sideEffect', '이상반응'],
  ['storage', '저장방법'],
];

interface MasterRow {
  masterId: string;
  barcode: string | null;
  regulatoryType: string | null;
  drugCategory: string | null;
  masterStatus: string | null;
  existingCanonical: {
    id: string;
    sourceType: string;
    status: string;
    sourceRefId: string | null;
    contentLen: number;
    md5: string;
  } | null;
  easyDrugRows: Array<{ id: string; status: string; sourceRefId: string | null }> | null;
}

interface PilotPermit {
  itemSeq: string;
  sampleGroup: 'NORMAL' | 'BOUNDARY' | 'MISSING';
  sampleReason: string;
  bucket: string;
  candidateId: string;
  itemName: string | null;
  entpName: string | null;
  nMaster: number;
  nOkMaster: number;
  officialConsumerText: OfficialConsumerText | null;
  masters: MasterRow[];
}

function md5(s: string): string {
  return createHash('md5').update(s, 'utf8').digest('hex');
}

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`--${name} 필요`);
}

function main(): void {
  const inPath = arg('in');
  const outDir = arg('out');
  mkdirSync(outDir, { recursive: true });

  const permits: PilotPermit[] = JSON.parse(readFileSync(inPath, 'utf8'));

  const records: string[] = [];
  const problems: string[] = [];
  const report = {
    ruleVersion: KO_REBUILD_RULE_VERSION,
    sourceType: EASY_DRUG_SPD_SOURCE_TYPE,
    status: EASY_DRUG_SPD_STATUS,
    descriptionType: 'STORE',
    language: 'ko',
    permits: permits.length,
    permitsByGroup: {} as Record<string, number>,
    permitsByBucket: {} as Record<string, number>,
    mastersConsidered: 0,
    mastersGenerated: 0,
    mastersSkippedEmptyContent: 0,
    mastersSkippedNotProducible: 0,
    permitsEmptyContent: 0,
    // 중복 실행 안전성 · 예상 INSERT 수
    expectedInsertCurrentDedup: 0, // 현행 러너 dedup = (master_id, source_type, source_ref_id)
    expectedInsertIfRebuild: 0, // 규칙버전 축을 추가해 재생산할 경우
    blockedByExistingEasyDrugRow: 0,
    sectionHistogram: {} as Record<string, number>,
    contentLen: { min: 0, max: 0, avg: 0 },
  };

  let lenSum = 0;
  let lenMin = Number.MAX_SAFE_INTEGER;
  let lenMax = 0;

  for (const p of permits) {
    report.permitsByGroup[p.sampleGroup] = (report.permitsByGroup[p.sampleGroup] ?? 0) + 1;
    report.permitsByBucket[p.bucket] = (report.permitsByBucket[p.bucket] ?? 0) + 1;

    const composed = composeEasyDrugContent(p.officialConsumerText);
    const content = sanitizeDescriptionHtml(composed);
    const sections = SECTION_ORDER.filter(
      ([k]) => (p.officialConsumerText?.[k] ?? '').toString().trim().length > 0,
    ).map(([, label]) => label);
    for (const s of sections) report.sectionHistogram[s] = (report.sectionHistogram[s] ?? 0) + 1;

    if (!content.trim()) {
      report.permitsEmptyContent += 1;
      problems.push(
        JSON.stringify({
          level: 'HOLD_SOURCE',
          itemSeq: p.itemSeq,
          bucket: p.bucket,
          reason: 'EMPTY_CONTENT_ALL_SECTIONS_MISSING',
        }),
      );
    }

    for (const m of p.masters) {
      report.mastersConsidered += 1;

      const producible =
        m.regulatoryType === 'DRUG' &&
        m.drugCategory === 'otc' &&
        m.masterStatus === 'ACTIVE' &&
        !!m.barcode &&
        /^[0-9]{13}$/.test(m.barcode);

      if (!producible) {
        report.mastersSkippedNotProducible += 1;
        problems.push(
          JSON.stringify({
            level: 'HOLD_MAPPING',
            itemSeq: p.itemSeq,
            masterId: m.masterId,
            barcode: m.barcode,
            reason: 'MASTER_NOT_PRODUCIBLE',
            detail: {
              regulatoryType: m.regulatoryType,
              drugCategory: m.drugCategory,
              masterStatus: m.masterStatus,
            },
          }),
        );
        continue;
      }

      if (!content.trim()) {
        report.mastersSkippedEmptyContent += 1;
        continue;
      }

      const existingEasy = (m.easyDrugRows ?? []).some((r) => r.sourceRefId === p.candidateId);
      if (existingEasy) report.blockedByExistingEasyDrugRow += 1;
      else report.expectedInsertCurrentDedup += 1;
      report.expectedInsertIfRebuild += 1;

      report.mastersGenerated += 1;
      lenSum += content.length;
      lenMin = Math.min(lenMin, content.length);
      lenMax = Math.max(lenMax, content.length);

      records.push(
        JSON.stringify({
          ruleVersion: KO_REBUILD_RULE_VERSION,
          // 귀속 축 (WO 작업 4-5)
          itemSeq: p.itemSeq,
          mfdsCode: p.itemSeq, // ProductIdentifier(MFDS_CODE).normalized_value 와 동일 축
          candidateId: p.candidateId,
          masterId: m.masterId,
          barcode: m.barcode,
          // 저장 시 컬럼과 동일한 구성 (실제 저장은 하지 않음)
          descriptionType: 'STORE',
          language: 'ko',
          status: EASY_DRUG_SPD_STATUS,
          sourceType: EASY_DRUG_SPD_SOURCE_TYPE,
          sourceRefId: p.candidateId,
          summary: null,
          content,
          contentMd5: md5(content),
          contentLen: content.length,
          sections,
          // 원천 계보 (기존 canonical 은 그대로 둔다 — 대조용 기록일 뿐)
          lineage: {
            sampleGroup: p.sampleGroup,
            sampleReason: p.sampleReason,
            bucket: p.bucket,
            existingCanonicalId: m.existingCanonical?.id ?? null,
            existingCanonicalSourceType: m.existingCanonical?.sourceType ?? null,
            existingCanonicalMd5: m.existingCanonical?.md5 ?? null,
            existingEasyDrugRowIds: (m.easyDrugRows ?? []).map((r) => r.id),
          },
          dedupKeyCurrent: `${m.masterId}::${EASY_DRUG_SPD_SOURCE_TYPE}::${p.candidateId}`,
          dedupKeyRebuild: `${m.masterId}::${EASY_DRUG_SPD_SOURCE_TYPE}::${p.candidateId}::${KO_REBUILD_RULE_VERSION}`,
        }),
      );
    }
  }

  report.contentLen = {
    min: report.mastersGenerated ? lenMin : 0,
    max: lenMax,
    avg: report.mastersGenerated ? Math.round(lenSum / report.mastersGenerated) : 0,
  };

  writeFileSync(`${outDir}/candidates.jsonl`, records.join('\n') + (records.length ? '\n' : ''), 'utf8');
  writeFileSync(`${outDir}/problem-queue.jsonl`, problems.join('\n') + (problems.length ? '\n' : ''), 'utf8');
  writeFileSync(`${outDir}/generation-report.json`, JSON.stringify(report, null, 2), 'utf8');

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main();
