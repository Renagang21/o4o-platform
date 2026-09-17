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
 *   node src/index.mjs data bind --file <csv> --source <name> --map "원본열=field,..." [--dataset <name>] [--key field] [--required a,b]
 *   node src/index.mjs data sync [--source <name>]     묶어 둔 파일이 바뀌었으면 다시 import(§7 변경감지)
 *   node src/index.mjs data bindings                     묶어 둔 자료 목록(로컬 콘솔 전용)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 게이트 2 — Agent 로컬 바인딩 (WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1)
 *
 *   반복해서 쓰는 자료(원내 약품 목록 등)를 로컬 파일에 **묶어** 두고(bind), 파일이 바뀌면
 *   다시 읽어 SQLite 를 갱신한다(sync). 파일 선택·경로 기억·변경감지·재-import 가 전부 이
 *   PC 안에서만 일어난다 — 파일 경로도, 파일 내용도 cloud 로 나가지 않는다. 변경감지는
 *   파일 크기·수정시각(mtime)만으로 판단하고(§7), 바뀌었으면 전체 재-import(행 단위 diff 없음),
 *   import 실패 시 기존 SQLite 를 그대로 둔다. 웹/cloud 는 연결 상태·결과만 조회한다.
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
  previewImport, applyImport, exportDataset, LocalDatasetRepository, LocalSourceBindingRepository,
  LocalDbError, SCHEMA_VERSION,
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

// logical source 는 파일명이 아니라 업무상 식별자다(§7). dataset 이름과 같은 규칙.
const SOURCE_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

/** 사용자가 적은 경로 하나의 크기·수정시각만 읽는다(변경감지 기준). 내용은 여기서 읽지 않는다. */
function statFile(file) {
  const st = fs.statSync(file);
  return { size: st.size, mtimeMs: Math.floor(st.mtimeMs) };
}

/** 파일이 마지막 import 이후 바뀌었는지 — 크기 또는 수정시각(§7). 한 번도 안 했으면 항상 변경으로 본다. */
function isChanged(binding, stat) {
  if (binding.last_size == null || binding.last_mtime_ms == null) return true;
  return Number(binding.last_size) !== stat.size || Number(binding.last_mtime_ms) !== stat.mtimeMs;
}

/**
 * 바인딩 하나를 파일에서 다시 import 한다(replace) — 성공하면 stat 기준선을 갱신한다.
 * 실패(파일 없음·검증 실패)면 예외를 던지고 기존 SQLite/기준선은 건드리지 않는다.
 */
function reimportBinding(binding) {
  const stat = statFile(binding.file_path); // 파일 없으면 여기서 던진다 → 기존 데이터 유지
  const csvText = fs.readFileSync(binding.file_path, 'utf8');
  const request = {
    csvText, dataset: binding.dataset, columnMapping: binding.columnMapping,
    requiredFields: binding.requiredFields ?? [], keyField: binding.key_field ?? undefined, mode: 'replace',
  };
  const applied = applyImport(request); // 검증 실패면 던진다 → 기존 데이터 유지(기준선 미갱신)
  LocalSourceBindingRepository.recordImport(binding.logical_source, { size: stat.size, mtimeMs: stat.mtimeMs, rowCount: applied.totalRows });
  return applied;
}

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
      case 'bind': {
        if (!requireReady(print)) return 2;
        if (typeof args.file !== 'string' || typeof args.source !== 'string' || typeof args.map !== 'string') {
          print('사용법: data bind --file <csv> --source <name> --map "원본열=field,..." [--dataset <name>] [--key field] [--required a,b]');
          return 1;
        }
        if (!SOURCE_NAME_RE.test(args.source)) { print(`잘못된 --source 이름: ${args.source} (영문 소문자로 시작, 소문자·숫자·_ 만)`); return 1; }
        const dataset = typeof args.dataset === 'string' ? args.dataset : args.source;
        const columnMapping = parseMap(args.map);
        const keyField = typeof args.key === 'string' ? args.key : undefined;
        const requiredFields = listOf(args.required);
        // 최초 연결 = replace import 로 검증까지 한다. 통과해야 바인딩을 저장한다.
        const stat = statFile(args.file); // 파일 없으면 여기서 던진다
        const csvText = fs.readFileSync(args.file, 'utf8');
        const request = { csvText, dataset, columnMapping, requiredFields, keyField, mode: 'replace' };
        const preview = previewImport(request);
        if (!preview.ok) {
          print(JSON.stringify({ preview }, null, 1));
          print('연결하지 않았습니다 — 부족한 필드/열/키를 채운 뒤 다시 시도하세요.');
          return 3;
        }
        const applied = applyImport(request);
        LocalSourceBindingRepository.upsert({ logicalSource: args.source, dataset, filePath: args.file, fileFormat: 'csv', columnMapping, keyField, requiredFields });
        LocalSourceBindingRepository.recordImport(args.source, { size: stat.size, mtimeMs: stat.mtimeMs, rowCount: applied.totalRows });
        print(`연결 완료: source=${args.source} dataset=${dataset} rows=${applied.totalRows}`);
        return 0;
      }
      case 'sync': {
        if (!requireReady(print)) return 2;
        const only = typeof args.source === 'string' ? args.source : null;
        const targets = only ? [LocalSourceBindingRepository.get(only)] : LocalSourceBindingRepository.list().map((b) => LocalSourceBindingRepository.get(b.logical_source));
        if (only && !targets[0]) { print(`묶어 둔 자료가 없습니다: ${only}`); return 1; }
        if (targets.length === 0) { print('묶어 둔 자료가 없습니다. data bind 로 먼저 연결하세요.'); return 0; }
        const results = [];
        for (const b of targets) {
          try {
            const stat = statFile(b.file_path);
            if (!isChanged(b, stat)) { results.push({ source: b.logical_source, status: 'unchanged' }); continue; }
            const applied = reimportBinding(b);
            results.push({ source: b.logical_source, status: 'reimported', rows: applied.totalRows });
          } catch (err) {
            // import 실패 → 기존 SQLite 유지. 다른 자료의 sync 는 계속한다.
            results.push({ source: b.logical_source, status: 'failed', errorCode: err?.code ?? 'ERROR' });
          }
        }
        print(JSON.stringify({ synced: results }, null, 1));
        return results.some((r) => r.status === 'failed') ? 3 : 0;
      }
      case 'bindings': {
        if (!requireReady(print)) return 2;
        const list = LocalSourceBindingRepository.list();
        if (list.length === 0) { print('묶어 둔 자료 없음'); return 0; }
        // 로컬 콘솔 전용 — 이 출력은 cloud 로 나가지 않는다.
        print(JSON.stringify({ bindings: list.map((b) => ({
          source: b.logical_source, dataset: b.dataset, format: b.file_format, filePath: b.file_path,
          keyField: b.key_field ?? null, lastRowCount: b.last_row_count, lastImportedAt: b.last_imported_at ?? null,
        })) }, null, 1));
        return 0;
      }
      default:
        print('사용법: data status | backup | backups | restore <id> | import ... | export ... | bind ... | sync [--source <name>] | bindings');
        return 1;
    }
  } catch (err) {
    if (err instanceof LocalDbError) { print(`실패: ${err.code} — ${err.message}`); return 2; }
    print(`실패: ${err?.code ?? 'ERROR'} — ${err?.message ?? err}`);
    return 2;
  }
}
