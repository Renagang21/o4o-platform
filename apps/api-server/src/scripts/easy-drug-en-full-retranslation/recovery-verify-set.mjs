/**
 * 재개 전 recovery master set 무결성 확인 (write 0).
 *
 * 주의: 저장된 해시는 **파일 해시가 아니라** masterId 정렬 배열을 '\n' 으로 이어붙인 문자열의 SHA-256 이다
 * (recovery-reconstruct.mjs 와 동일 계약). 파일에는 끝 개행이 있어 Get-FileHash 로는 일치하지 않는다.
 *
 * 사용: node recovery-verify-set.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RESULTS, readJsonl, EN_UNITS_PATH } from './tm-lib.mjs';

const ids = fs.readFileSync(path.join(RESULTS, 'recovery-master-set.txt'), 'utf8').split('\n').filter(Boolean);
const sorted = [...ids].sort();
const calc = crypto.createHash('sha256').update(sorted.join('\n')).digest('hex');
const [storedHash, storedCount] = fs.readFileSync(path.join(RESULTS, 'recovery-master-set.sha256'), 'utf8').trim().split(/\s+/);
const summary = JSON.parse(fs.readFileSync(path.join(RESULTS, 'recovery-summary.json'), 'utf8'));
const done = new Set(readJsonl(EN_UNITS_PATH).map((u) => u.masterId));
const setInDone = sorted.filter((m) => done.has(m)).length;

console.log(JSON.stringify({
  recoverySet: { lines: ids.length, sortedStable: JSON.stringify(ids) === JSON.stringify(sorted) },
  hash: { stored: storedHash, calculated: calc, match: storedHash === calc },
  storedCount,
  summaryS: summary.reconstructed.S,
  summaryVerdict: summary.verdict,
  enUnitsDone: done.size,
  recoverySetContainedInDone: setInDone === ids.length,
  producedSinceRecovery: done.size - ids.length,
  gate: storedHash === calc && setInDone === ids.length ? 'RECOVERY_SET_VALID' : 'INVALID',
  fileWrites: 0, dbWrites: 0,
}, null, 2));
