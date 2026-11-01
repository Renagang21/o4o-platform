import { describe, expect, it } from 'vitest';
import { getBusinessOperatorRolesForHost } from '../role-constants';
import { decideHost } from '../hostProfile';

describe('collaborator navigation matches the actual destination guard', () => {
  it('main business entry redirects only Pharmacy operators to the Pharmacy host', () => {
    expect(getBusinessOperatorRolesForHost('main')).toEqual(['neture:pharmacy_admin','neture:pharmacy_operator']);
    expect(decideHost('main', { pathname: '/operator/semi-franchises', search: '', hash: '' })).toEqual({ kind: 'external', href: 'https://pharmacy.neture.co.kr/operator/semi-franchises' });
    for (const key of ['carepharm','drugstore','pharmcoop']) {
      expect(getBusinessOperatorRolesForHost('main')).not.toContain(`neture:${key}_operator`);
    }
  });
  it('CarePharm keeps its own operators and local route', () => {
    expect(getBusinessOperatorRolesForHost('carepharm')).toEqual(['neture:carepharm_admin','neture:carepharm_operator']);
    expect(decideHost('carepharm', { pathname: '/operator/semi-franchises', search: '', hash: '' })).toEqual({ kind: 'stay' });
  });
  it.each(['supplier','funding','community','unknown'])('%s never advertises an unrelated business entry', profile => {
    expect(getBusinessOperatorRolesForHost(profile)).toEqual([]);
  });
});
