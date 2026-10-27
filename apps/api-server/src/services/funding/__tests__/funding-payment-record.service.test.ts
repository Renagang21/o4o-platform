import { DataSource } from 'typeorm';
import { ActionLog } from '@o4o/action-log-core';
import { prepareValue } from 'pg/lib/utils.js';
import { FundingPaymentRecordService, validatePaymentRecord } from '../funding-payment-record.service.js';

const original = { id: 'participant', paymentStatus: 'paid', paidAmount: '12000.00', paymentReference: 'fixture-private-reference', paymentNote: 'fixture-private-note', paidAt: new Date('2026-10-01T00:00:00Z'), confirmedAt: new Date('2026-10-02T00:00:00Z') };
const after = { ...original, paymentStatus: 'paid', confirmedAt: new Date('2026-10-11T00:00:00Z'), updatedAt: new Date('2026-10-11T00:00:00Z') };
const actor = 'fixture-operator';
let ds: DataSource;
let manager: any;
let runner: any;
let audit: any;
beforeEach(() => {
  audit = { insert: jest.fn().mockResolvedValue({}) };
  manager = { query: jest.fn().mockResolvedValueOnce([{id: "project"}]).mockResolvedValueOnce([original]).mockResolvedValueOnce([after]), getRepository: jest.fn().mockReturnValue(audit) };
  runner = { manager, connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn() };
  // Exercise TypeORM's actual transaction orchestration without connecting to any database.
  ds = new DataSource({ type: 'postgres', entities: [] });
  jest.spyOn(ds, 'createQueryRunner').mockReturnValue(runner);
});

describe('offline payment record and audit transaction', () => {
  it.each([undefined, null, -1, 0.5, '0'])('rejects a missing or invalid version %p before a transaction', async version => {
    await expect(new FundingPaymentRecordService(ds).update('project', 'participant', actor, { paymentStatus: 'paid', version })).rejects.toMatchObject({ status: 400, code: 'PAYMENT_VERSION_REQUIRED' });
    expect(ds.createQueryRunner).not.toHaveBeenCalled();
  });
  it('rejects a stale payment form without writes or an audit row', async () => {
    manager.query.mockReset().mockResolvedValueOnce([{ id: 'project' }]).mockResolvedValueOnce([{ ...original, offlineState: { version: 2, refundAmount: 50 } }]);
    await expect(new FundingPaymentRecordService(ds).update('project', 'participant', actor, { paymentStatus: 'paid', paidAmount: 9000, version: 1 })).rejects.toMatchObject({ status: 409, code: 'PAYMENT_VERSION_CONFLICT' });
    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(audit.insert).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalled();
  });
  it('rejects a cached-client refund status without a recorded offline refund', async () => {
    await expect(new FundingPaymentRecordService(ds).update('project','participant',actor,{version:0,paymentStatus:'refunded'})).rejects.toMatchObject({status:409,code:'OFFLINE_REFUND_RECORD_REQUIRED'});
    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(audit.insert).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });

  it('locks the trial before its participant and records actual returned values before commit', async () => {
    const result = await new FundingPaymentRecordService(ds).update('project', 'participant', actor, { version: 0, paymentStatus: 'paid' });
    expect(manager.query.mock.calls[1]).toEqual([expect.stringContaining('FOR UPDATE'), ['participant', 'project']]);
    expect(manager.query.mock.calls[2][0]).toContain('WITH updated AS (UPDATE');
    expect(manager.query.mock.calls[2][0]).toContain('SELECT * FROM updated');
    expect(manager.getRepository).toHaveBeenCalledWith(ActionLog);
    expect(audit.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: actor, meta: expect.objectContaining({ beforeStatus: 'paid', afterStatus: 'paid', beforeAmount: 12000, afterAmount: 12000, referenceChanged: false, noteChanged: false }) }));
    const log = JSON.stringify(audit.insert.mock.calls);
    expect(log).not.toContain(original.paymentReference); expect(log).not.toContain(original.paymentNote);
    expect(result.paidAt).toBe('2026-10-01T00:00:00.000Z');
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(audit.insert.mock.invocationCallOrder[0]).toBeLessThan(runner.commitTransaction.mock.invocationCallOrder[0]);
  });

  it('audit failure rolls the payment transaction back and never reports success', async () => {
    audit.insert.mockRejectedValue(new Error('fixture audit unavailable'));
    await expect(new FundingPaymentRecordService(ds).update('project', 'participant', actor, { version: 0, paymentStatus: 'unpaid' })).rejects.toThrow('fixture audit unavailable');
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled(); expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it('explicit null amount is audited as null using the persisted row', async () => {
    manager.query.mockReset().mockResolvedValueOnce([{id: "project"}]).mockResolvedValueOnce([original]).mockResolvedValueOnce([{ ...after, paidAmount: null }]);
    await new FundingPaymentRecordService(ds).update('project', 'participant', actor, { version: 0, paymentStatus: 'paid', paidAmount: null });
    expect(audit.insert.mock.calls[0][0].meta.afterAmount).toBeNull();
    const [sql, values] = manager.query.mock.calls[2];
    expect(sql).toContain('"paidAt" = COALESCE("paidAt",'); expect(values).toContain(null);
    expect(sql).not.toContain('settlementStatus'); expect(sql).not.toContain('forum');
  });

  it.each(['unpaid', 'canceled'])('%s correction preserves first date, amount and reference when omitted', async paymentStatus => {
    await new FundingPaymentRecordService(ds).update('project', 'participant', actor, { version: 0, paymentStatus });
    const sql = manager.query.mock.calls[2][0].split('RETURNING')[0];
    expect(sql).not.toContain('"paidAt" ='); expect(sql).not.toContain('"paidAmount" ='); expect(sql).not.toContain('"paymentReference" =');
    expect(sql).toContain('"confirmedAt" =');
  });

  it('a participant belonging to another trial cannot be changed or audited', async () => {
    manager.query.mockReset().mockResolvedValueOnce([{id: "project"}]).mockResolvedValueOnce([]);
    await expect(new FundingPaymentRecordService(ds).update('other-project', 'participant', actor, { version: 0, paymentStatus: 'paid' })).rejects.toMatchObject({ status: 404 });
    expect(manager.query).toHaveBeenCalledTimes(2); expect(audit.insert).not.toHaveBeenCalled(); expect(runner.rollbackTransaction).toHaveBeenCalled();
  });

  it('binds private text with node-postgres while masking TypeORM query parameters', async () => {
    await new FundingPaymentRecordService(ds).update('project', 'participant', actor, { version: 0, paymentStatus: 'paid', paymentReference: original.paymentReference, paymentNote: original.paymentNote });
    const values = manager.query.mock.calls[2][1];
    expect(values.map((value: unknown) => prepareValue(value))).toContain(original.paymentReference);
    expect(values.map((value: unknown) => prepareValue(value))).toContain(original.paymentNote);
    expect(JSON.stringify(values)).not.toContain(original.paymentReference);
    expect(JSON.stringify(values)).not.toContain(original.paymentNote);
  });
});

describe('existing payment column validation', () => {
  it.each([
    { paymentStatus: 'unknown' }, { paidAmount: -1 }, { paidAmount: NaN }, { paidAmount: Infinity },
    { paidAmount: '12000' }, { paidAmount: {} }, { paidAmount: 0.001 }, { paidAmount: 10000000000 },
    { paidAt: 'yesterday' }, { confirmedAt: '2026-99-99T00:00:00Z' }, { paidAt: 123 }, { paidAt: '2026-02-30T00:00:00Z' },
    { paymentNote: 'fixture\0invalid' },
    { paymentNote: {} }, { paymentReference: 'x'.repeat(256) }, { paymentMethod: 'x'.repeat(51) }, { paymentProvider: [] },
  ])('rejects malformed inputs without starting a transaction: %j', async input => {
    await expect(new FundingPaymentRecordService(ds).update('project', 'participant', actor, { version: 0, paymentStatus: 'paid', ...input })).rejects.toMatchObject({ status: 400 });
    expect(ds.createQueryRunner).not.toHaveBeenCalled();
  });
  it.each([0, 0.01, 12000, 9999999999.99, null])('accepts valid decimal or nullable amount %s', paidAmount => {
    expect(validatePaymentRecord({ paymentStatus: 'paid', paidAmount, paymentReference: null })).toBe('paid');
  });
});
