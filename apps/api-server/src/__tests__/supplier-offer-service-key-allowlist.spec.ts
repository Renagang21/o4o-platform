/**
 * Supplier offer 등록 — serviceKeys 허용 목록
 *
 * 등록 경로(supplier-offer-registration)는 승인 대상 서비스 키 SSOT(approval-service-keys)로만
 * serviceKeys 를 받는다. 'neture'(PUBLIC 축) · 퇴역 서비스 키 · 미등록 키는 저장되지 않는다.
 * 수정 경로(supplier-offer-distribution)와 같은 기준이다.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { filterApprovalEligibleServiceKeys } from '../modules/neture/constants/approval-service-keys.js';

const servicesDir = join(__dirname, '..', 'modules', 'neture', 'services');
const read = (f: string) => readFileSync(join(servicesDir, f), 'utf8');

describe('supplier offer serviceKeys allowlist', () => {
  it.each(['neture', 'glucoseview', 'glycopharm', 'siteguide', 'unknown-service', ''])(
    "허용 목록 밖 키 '%s' 는 걸러진다",
    (key) => {
      expect(filterApprovalEligibleServiceKeys(['kpa-society', key])).toEqual(['kpa-society']);
    },
  );

  it('허용 목록 키는 중복 없이 유지된다', () => {
    expect(filterApprovalEligibleServiceKeys(['kpa-society', 'kpa-society'])).toEqual(['kpa-society']);
    expect(filterApprovalEligibleServiceKeys(undefined)).toEqual([]);
  });

  it('등록 경로는 저장할 serviceKeys 를 허용 목록 SSOT 로 만든다 (개별 차단 분기 없음)', () => {
    const src = read('supplier-offer-registration.service.ts');
    expect(src).toMatch(/const filteredServiceKeys = filterApprovalEligibleServiceKeys\(input\.serviceKeys\);/);
    expect(src).toMatch(/serviceKeys: filteredServiceKeys,/);
    expect(src).not.toMatch(/glucoseview/);
  });

  it('수정 경로도 같은 SSOT 로 새 키를 받는다', () => {
    expect(read('supplier-offer-distribution.service.ts')).toMatch(/filterApprovalEligibleServiceKeys\(input\.serviceKeys\)/);
  });
});
