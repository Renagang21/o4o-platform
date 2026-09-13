/**
 * Local Work Agent — 로컬 데이터 CLI (Local Data Runtime V1)
 *
 * WO-O4O-LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1 §26·§31·§33·§37·§63·§64
 *
 *   node src/index.mjs data status                       준비 상태 · schema version · 백업 요약
 *   node src/index.mjs data backup                       지금 스냅샷 하나 만든다(manual)
 *   node src/index.mjs data backups                      백업 목록
 *   node src/index.mjs data restore <backup-id>          해당 백업으로 되돌린다(직전에 pre-restore 스냅샷)
 *   node src/index.mjs data import --file <csv> --dataset <name> --map "원본열=field,..." [--key field] [--required a,b] [--replace] [--preview]
 *   node src/index.mjs data export --dataset <name> --out <csv> [--columns a,b]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 모듈만 사용자 파일을 읽고 쓴다 — 그리고 **사용자가 명령줄에 직접 적은 경로만**(§33·§63)
 *
 *   서버 명령(handlers.mjs)은 이 모듈을 import 하지 않는다. cloud · AI · 웹페이지가 이 PC 의
 *   파일 경로를 지정해 읽게 만드는 통로가 없다. import 는 파일을 텍스트로 읽어 local-db 의
 *   순수 함수(previewImport/applyImport)에 넘기고, export 는 local-db 가 만든 CSV 문자열을
 *   사용자가 적은 경로에 쓴다. 원본 파일은 저장하지 않는다.
 *
 *   출력은 콘솔(로컬)이다. 행 데이터는 찍지 않는다 — 개수 · 열 이름 · 상태만(§59).
 */

import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  bootstrapLocalDb, closeLocalDb, openLocalDb, localDbHealth,
  previewImport, applyImport, exportDataset, LocalDatasetRepository, LocalDbError, SCHEMA_VERSION,
} from './local-db.mjs';
import { backupSummary, createBackup, listBackups, restoreBackup } from './local-db-backup.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i += 1; }
    } else out._.push(a);
  }
  return out;
}

/** `"품목명=item_name,코드=item_code"` → { 품목명: 'item_name', 코드: 'item_code' } */
function parseMap(spec) {
  const mapping = {};
  for (const part of String(spec ?? '').split(',')) {
    const [src, dest] = part.split('=').map((s) => s?.trim());
    if (!src || !dest) throw new LocalDbError('LOCAL_DB_IMPORT_INVALID', `bad --map entry: ${part}`);
    mapping[src] = dest;
  }
  return mapping;
}

const listOf = (v) => (typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const boot = () => bootstrapLocalDb({ backup: (db, reason) => createBackup(db, reason) });

/** bootstrap 을 거쳐 준비 상태를 요구한다. 실패면 코드와 함께 종료(§17·§66). */
function requireReady(print) {
  const state = boot();
  if (!state.ready) {
    print(`Local Data 를 사용할 수 없습니다: ${state.errorCode}${state.chainStatus ? ` (${state.chainStatus})` : ''}`);
    if (state.errorCode === 'LOCAL_DB_SCHEMA_TOO_NEW') print('이 agent 보다 새로운 버전이 만든 데이터입니다. agent 를 업데이트하세요.');
    const s = backupSummary();
    if (s.count > 0) print(`사용 가능한 백업 ${s.count}개 (최근 ${s.lastAt}). data backups 로 목록, data restore <id> 로 복원.`);
    return null;
  }
  return state;
}

/**
 * `data ...` 명령 실행. 반환은 process exit code. `print` 로 콘솔에 쓴다(테스트에서 수집).
 */
export async function runDataCommand(argv, print = (m) => console.log(m)) {
  const args = parseArgs(argv);
  const sub = args._[0];
  try {
    switch (sub) {
      case 'status': {
        const state = boot();
        const h = localDbHealth({ backupSummary });
        print(JSON.stringify({
          ready: h.ready === true, errorCode: h.errorCode ?? null, schemaVersion: h.schemaVersion, expectedSchemaVersion: SCHEMA_VERSION,
          migrationStatus: h.migrationStatus, integrityStatus: h.integrityStatus, appliedNow: state.appliedNow ?? [], backupStatus: state.backupStatus ?? null,
          backupCount: h.backupCount ?? 0, lastBackupAt: h.lastBackupAt ?? null,
          datasets: h.ready ? LocalDatasetRepository.list().map((d) => ({ name: d.name, rows: d.row_count })) : [],
        }, null, 1));
        return h.ready ? 0 : 2;
      }
      case 'backup': {
        if (!requireReady(print)) return 2;
        const b = createBackup(openLocalDb(), 'manual');
        print(`백업 생성: ${b.id} (${b.bytes} bytes)${b.pruned.length ? ` · 정리 ${b.pruned.length}개` : ''}`);
        return 0;
      }
      case 'backups': {
        const list = listBackups();
        if (list.length === 0) print('백업 없음');
        for (const b of list) print(`${b.id}  ${b.bytes} bytes  ${b.reason}  ${b.createdAt}`);
        return 0;
      }
      case 'restore': {
        const id = args._[1];
        if (!id) { print('사용법: data restore <backup-id>'); return 1; }
        closeLocalDb();
        const r = restoreBackup(id, { openForSnapshot: (file) => new DatabaseSync(file) });
        print(`복원: ${r.restored}${r.preRestore ? ` (직전 상태는 ${r.preRestore} 에 보관)` : ''}`);
        const state = boot();
        print(`복원 후 상태: ${state.ready ? `ready · schema v${state.schemaVersion}` : state.errorCode}`);
        return state.ready ? 0 : 2;
      }
      case 'import': {
        if (!requireReady(print)) return 2;
        if (typeof args.file !== 'string' || typeof args.dataset !== 'string' || typeof args.map !== 'string') {
          print('사용법: data import --file <csv> --dataset <name> --map "원본열=field,..." [--key field] [--required a,b] [--replace] [--preview]');
          return 1;
        }
        // 사용자가 명령줄에 적은 파일 하나만 읽는다(§33). 디렉터리 탐색 없음.
        const csvText = fs.readFileSync(args.file, 'utf8');
        const request = {
          csvText, dataset: args.dataset, columnMapping: parseMap(args.map), requiredFields: listOf(args.required),
          keyField: typeof args.key === 'string' ? args.key : undefined, mode: args.replace ? 'replace' : 'merge',
        };
        const preview = previewImport(request);
        print(JSON.stringify({ preview }, null, 1));
        if (args.preview) return preview.ok ? 0 : 3;
        if (!preview.ok) { print('적용하지 않았습니다 — 부족한 필드/열/키를 채운 뒤 다시 시도하세요.'); return 3; }
        const applied = applyImport(request);
        print(`import 완료: dataset=${applied.dataset} rows=${applied.rowCount} inserted=${applied.inserted} updated=${applied.updated} total=${applied.totalRows}`);
        return 0;
      }
      case 'export': {
        if (!requireReady(print)) return 2;
        if (typeof args.dataset !== 'string' || typeof args.out !== 'string') { print('사용법: data export --dataset <name> --out <csv> [--columns a,b]'); return 1; }
        const r = exportDataset({ dataset: args.dataset, columns: args.columns ? listOf(args.columns) : undefined });
        // UTF-8 BOM — Excel 이 한글을 바로 읽는다. 사용자가 적은 경로에만 쓴다.
        fs.writeFileSync(args.out, '﻿' + r.csv, 'utf8');
        print(`export 완료: dataset=${r.dataset} rows=${r.rowCount} columns=${r.columns.join(',')}`);
        return 0;
      }
      default:
        print('사용법: data status | backup | backups | restore <id> | import ... | export ...');
        return 1;
    }
  } catch (err) {
    if (err instanceof LocalDbError) { print(`실패: ${err.code} — ${err.message}`); return 2; }
    print(`실패: ${err?.code ?? 'ERROR'} — ${err?.message ?? err}`);
    return 2;
  }
}
