/** Offline, read-only comparison. Inputs must come from the candidate snapshot and a fresh,
 * complete export of CURRENT minimum erasure evidence, never that snapshot's old ledger.
 * This command neither restores nor deletes anything and never approves a restoration.
 */
import { openSync, fstatSync, readSync, closeSync, constants } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DAY = 86_400_000;
const HASH = /^[a-f0-9]{64}$/;
const SNAPSHOT_DAYS = new Map([['automatic_backup',7],['manual_export',30]]);
const instant = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('INVALID_EVIDENCE_TIMESTAMP');
  }
  const normalized=value.replace(/(?:\.(\d{1,3}))?Z$/,(_match,fraction)=>'.'+(fraction??'').padEnd(3,'0')+'Z');
  if(new Date(value).toISOString()!==normalized)throw new Error('INVALID_EVIDENCE_TIMESTAMP');
  return Date.parse(value);
};
const hash = value => {
  if (typeof value !== 'string' || !HASH.test(value)) throw new Error('INVALID_SUBJECT_HASH');
  return value;
};

export function checkErasureRestore(snapshot, ledger, now = new Date()) {
  const time = now.getTime();
  if (!Number.isFinite(time)) throw new Error('INVALID_REVIEW_TIME');
  if (snapshot?.version !== 1 || ledger?.version !== 1 || ledger.complete !== true) throw new Error('COMPLETE_CURRENT_LEDGER_REQUIRED');
  const days = SNAPSHOT_DAYS.get(snapshot.kind);
  if (!days) throw new Error('UNKNOWN_BACKUP_KIND');
  const created = instant(snapshot.createdAt), captured = instant(ledger.capturedAt), from = instant(ledger.coverageFrom);
  if (created > time || created < time-days*DAY) throw new Error('SNAPSHOT_RETENTION_REVIEW_REQUIRED');
  if (captured > time || captured < created || captured < time-5*60_000 || from > created || from > captured) throw new Error('CURRENT_LEDGER_COVERAGE_REQUIRED');
  if (!Array.isArray(snapshot.subjectHashes) || !Array.isArray(ledger.completed) || snapshot.subjectHashes.length>100_000 || ledger.completed.length>100_000) throw new Error('INVALID_RESTORE_MANIFEST');
  const subjects = new Set(snapshot.subjectHashes.map(hash));
  const retired = new Set();
  for (const entry of ledger.completed) {
    const subject = hash(entry.subjectHash), completed = instant(entry.completedAt), expires = instant(entry.expiresAt);
    if (completed > captured || completed < from || expires <= captured || expires <= completed) throw new Error('INVALID_CURRENT_ERASURE_EVIDENCE');
    retired.add(subject);
  }
  const conflicts = [...subjects].filter(subject => retired.has(subject)).length;
  return {recordCheck:conflicts ? 'review_required':'pass',snapshotSubjects:subjects.size,conflictingSubjects:conflicts,
    restoreApproved:false,scope:'subject UUID digests only; file/domain/backup review and explicit restore approval remain required'};
}

function input(filename) {
  if(!constants.O_NOFOLLOW)throw new Error('SYMLINK_GUARD_UNAVAILABLE');
  const descriptor=openSync(filename,constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat=fstatSync(descriptor);
    if(!stat.isFile() || stat.size>16*1024*1024)throw new Error('INVALID_RESTORE_INPUT');
    const bytes=Buffer.alloc(stat.size+1);
    const length=readSync(descriptor,bytes,0,bytes.length,null);
    const after=fstatSync(descriptor);
    if(length!==stat.size || after.size!==stat.size || after.mtimeMs!==stat.mtimeMs)throw new Error('RESTORE_INPUT_CHANGED');
    return JSON.parse(bytes.subarray(0,length).toString('utf8'));
  } finally { closeSync(descriptor); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length!==2) throw new Error('NO_PATH_ARGUMENTS_ALLOWED');
    // The operator chooses a private working directory. No CLI argument becomes a file path.
    const result = checkErasureRestore(input('snapshot.json'),input('current-erasure-ledger.json'));
    process.stdout.write(JSON.stringify(result)+'\n');
    process.exitCode=result.recordCheck==='pass' ? 0 : 1;
  } catch {
    // Parse failures can contain fragments of private input. Do not print raw errors or paths.
    process.stderr.write('RESTORE_EVIDENCE_INVALID: complete current evidence and valid retained snapshot are required.\n');
    process.exitCode=2;
  }
}
