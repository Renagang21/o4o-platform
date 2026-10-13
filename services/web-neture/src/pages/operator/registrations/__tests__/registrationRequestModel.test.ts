import { describe, expect, it, vi } from 'vitest';
import { mapRegistrationRequest, filterRegistrationRequests, getSelectedPendingRegistrationIds } from '../registrationRequestModel';
import type { RegistrationRecord } from '../../../../lib/api/admin';

function record(overrides: Partial<RegistrationRecord> = {}): RegistrationRecord {
  return { id: 'fixture-a', email: 'member@example.invalid', name: '검증회원', phone: '', role: 'supplier', status: 'pending', service: 'neture', createdAt: '2026-01-01', ...overrides };
}

describe('Neture registration read model', () => {
  it.each([
    ['active', 'APPROVED'], ['APPROVED', 'APPROVED'], ['rejected', 'REJECTED'],
    ['pending', 'PENDING'], ['unknown', 'PENDING'], ['', 'PENDING'],
  ])('preserves legacy status mapping %s -> %s', (status, expected) => {
    expect(mapRegistrationRequest(record({ status })).status).toBe(expected);
  });

  it('preserves fallback fields and obtains the date only when absent', () => {
    const now = vi.fn(() => '2026-10-13T00:00:00.000Z');
    const mapped = mapRegistrationRequest(record({ role: '', service: '', name: '', email: '', createdAt: '' }), now);
    expect(mapped).toMatchObject({ role: 'user', service: 'neture', name: '', email: '', phone: '', createdAt: '2026-10-13T00:00:00.000Z' });
    expect(now).toHaveBeenCalledTimes(1);
    mapRegistrationRequest(record(), now);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it('keeps business fields, notes, processing results and legacy roles without modifying input', () => {
    const raw = record({ role: 'seller', companyName: '검증 사업자', businessNumber: 'fixture-number', licenseNumber: 'fixture-license', representativeName: '검증대표', taxInvoiceEmail: 'tax@example.invalid', contactName: '검증담당', managerPhone: 'fixture-phone', businessAddress: '검증주소', businessAddressDetail: '검증상세', businessType: 'fixture-type', businessItem: 'fixture-item', businessEntityType: 'fixture-entity', businessStartDate: '2026-01-01', processedAt: '2026-02-01', processedBy: 'fixture-operator', rejectReason: 'fixture-reason', operatorNotes: 'fixture-note', supplierStatus: 'active' });
    const before = { ...raw };
    expect(mapRegistrationRequest(raw)).toEqual({ ...raw, status: 'PENDING' });
    expect(raw).toEqual(before);
  });

  it.each(['mixed', 'member@', '검증사업'])('searches name, email and optional company (%s)', searchQuery => {
    const rows = [mapRegistrationRequest(record({ name: 'Mixed', companyName: '검증사업' })), mapRegistrationRequest(record({ id: 'fixture-b', name: '다른회원', email: 'other@example.invalid' }))];
    expect(filterRegistrationRequests(rows, { searchQuery, statusFilter: 'ALL', roleFilter: 'ALL' }).map(r => r.id)).toEqual(['fixture-a']);
  });

  it('combines status and role filters, retaining whitespace search semantics', () => {
    const rows = [mapRegistrationRequest(record()), mapRegistrationRequest(record({ id: 'fixture-b', status: 'active', role: 'user' }))];
    expect(filterRegistrationRequests(rows, { searchQuery: '', statusFilter: 'APPROVED', roleFilter: 'user' }).map(r => r.id)).toEqual(['fixture-b']);
    expect(filterRegistrationRequests(rows, { searchQuery: ' ', statusFilter: 'ALL', roleFilter: 'ALL' })).toEqual([]);
  });

  it('selects only pending known records, preserving selection order and inputs', () => {
    const rows = [mapRegistrationRequest(record()), mapRegistrationRequest(record({ id: 'fixture-b', status: 'approved' })), mapRegistrationRequest(record({ id: 'fixture-c' }))];
    const selection = new Set(['fixture-c', 'missing', 'fixture-b', 'fixture-a']);
    expect(getSelectedPendingRegistrationIds(rows, selection)).toEqual(['fixture-c', 'fixture-a']);
    expect([...selection]).toEqual(['fixture-c', 'missing', 'fixture-b', 'fixture-a']);
    expect(rows[0].status).toBe('PENDING');
  });
});
