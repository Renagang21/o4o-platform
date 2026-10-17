import {refreshFundingAmount} from './funding-offline-operations.service.js';
import type { DataSource } from 'typeorm';
import { isPaymentStatus, PaymentStatus } from '@o4o/market-trial';
import { ActionLog } from '@o4o/action-log-core';
import { FundingError } from './funding-workspace.service.js';

const TEXT_LIMITS = { paymentMethod: 50, paymentProvider: 50, paymentReference: 255 } as const;
const optionalFields = [...Object.keys(TEXT_LIMITS), 'paymentNote', 'paidAmount', 'paidAt', 'confirmedAt'];

/** node-postgres binds the original text; TypeORM's JSON parameter logger sees a mask. */
const privateText = (value: unknown) => value === null ? null : {
  toPostgres: () => value,
  toJSON: () => '[redacted]',
};

function validDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Validate against existing column types; no new payment transition policy. */
export function validatePaymentRecord(input: Record<string, unknown>) {
  const invalid = () => new FundingError(400, 'INVALID_PAYMENT_RECORD', '입금 상태·금액·날짜·참조값을 확인해 주세요.');
  if (!isPaymentStatus(input.paymentStatus)) throw invalid();
  for (const field of [...Object.keys(TEXT_LIMITS), 'paymentNote']) {
    const value = input[field];
    if (value == null) continue;
    if (typeof value !== 'string' || value.includes('\0')) throw invalid();
    const limit = TEXT_LIMITS[field as keyof typeof TEXT_LIMITS];
    if (limit && [...value].length > limit) throw invalid();
  }
  const amount = input.paidAmount;
  if (amount != null && (typeof amount !== 'number' || !Number.isFinite(amount)
    || amount < 0 || amount > 9999999999.99 || !/^\d+(\.\d{1,2})?$/.test(String(amount)))) throw invalid();
  for (const field of ['paidAt', 'confirmedAt']) {
    const value = input[field];
    if (value == null) continue;
    if (!validDate(value)) throw invalid();
  }
  return input.paymentStatus;
}

type PaymentRow = {
  id: string; paymentStatus: string; paymentMethod: string | null; paymentProvider: string | null;
  paymentReference: string | null; paymentNote: string | null; paidAmount: string | number | null;
  paidAt: Date | null; confirmedAt: Date | null; updatedAt: Date | null;
};
const date = (value: Date | null) => value ? new Date(value).toISOString() : null;
const amount = (value: string | number | null) => value == null ? null : Number(value);

export class FundingPaymentRecordService {
  constructor(private readonly ds: DataSource) {}

  async update(trialId: string, participantId: string, actorId: string, input: Record<string, unknown>) {
    const status = validatePaymentRecord(input);
    return this.ds.transaction(async manager => {
      await manager.query('SELECT id FROM market_trials WHERE id=$1 FOR UPDATE',[trialId]);
      const [before]: PaymentRow[] = await manager.query(
        `SELECT id, COALESCE("paymentStatus", 'unpaid') AS "paymentStatus",
                "paidAmount", "paymentReference", "paymentNote", "paidAt", "confirmedAt", "offlineState"
         FROM market_trial_participants WHERE id = $1 AND "marketTrialId" = $2 FOR UPDATE`,
        [participantId, trialId],
      );
      if (!before) throw new FundingError(404, 'PARTICIPANT_NOT_FOUND', '이 펀딩의 참여자를 찾을 수 없습니다.');

      const refund=Number((before as PaymentRow & {offlineState?:{refundAmount?:number}}).offlineState?.refundAmount??0);
      if(input.paidAmount!==undefined&&Number(input.paidAmount??0)<refund)throw new FundingError(400,'REFUND_EXCEEDS_PAYMENT','입금액은 기록된 환급액 이상이어야 합니다.');
      if (refund > 0 && !['paid','refunded'].includes(status)) {
        throw new FundingError(409,'REFUND_RECORD_EXISTS','환급 기록이 있는 입금은 미입금·취소로 바꿀 수 없습니다. 입금·누적 환급 금액을 정정해 주세요.');
      }
      const nextAmount = input.paidAmount === undefined ? Number(before.paidAmount ?? 0) : Number(input.paidAmount ?? 0);
      const recordedStatus = refund > 0 ? (refund === nextAmount ? 'refunded' : 'paid') : status;
      const values: unknown[] = [recordedStatus];
      const sets = ['"paymentStatus" = $1'];
      for (const field of optionalFields) {
        const value = input[field];
        if (field === 'paidAt' || field === 'confirmedAt' || value === undefined) continue;
        values.push(field === 'paymentReference' || field === 'paymentNote' ? privateText(value) : value);
        sets.push(`"${field}" = $${values.length}`);
      }
      // The first confirmation survives reconfirmation, cancellation and refunds.
      if (status === PaymentStatus.PAID) {
        values.push(input.paidAt ? new Date(input.paidAt as string) : new Date());
        sets.push(`"paidAt" = COALESCE("paidAt", $${values.length})`);
      }
      values.push(input.confirmedAt ? new Date(input.confirmedAt as string) : new Date());
      sets.push(`"confirmedAt" = $${values.length}`, '"updatedAt" = now()');
      values.push(participantId, trialId);
      const [after]: PaymentRow[] = await manager.query(
        `WITH updated AS (UPDATE market_trial_participants SET ${sets.join(', ')}
         WHERE id = $${values.length - 1} AND "marketTrialId" = $${values.length}
         RETURNING id, "paymentStatus", "paymentMethod", "paymentProvider", "paymentReference",
                   "paidAmount", "paidAt", "confirmedAt", "paymentNote", "updatedAt") SELECT * FROM updated`, values,
      );
      if (!after) throw new FundingError(404, 'PARTICIPANT_NOT_FOUND', '참여자를 찾을 수 없습니다.');

      // Use the transaction repository: a failed audit insert also rolls back the record.
      // Preserve the existing audit key/service; never store raw reference or note here.
      const meta: NonNullable<ActionLog['meta']> = {
        trialId, participantId, beforeStatus: before.paymentStatus, afterStatus: after.paymentStatus,
        beforeAmount: amount(before.paidAmount), afterAmount: amount(after.paidAmount),
        referenceChanged: (before.paymentReference ?? null) !== (after.paymentReference ?? null),
        noteChanged: (before.paymentNote ?? null) !== (after.paymentNote ?? null),
        beforePaidAt: date(before.paidAt), afterPaidAt: date(after.paidAt),
        beforeConfirmedAt: date(before.confirmedAt), afterConfirmedAt: date(after.confirmedAt),
      };
      await manager.getRepository(ActionLog).insert({
        service_key: 'neture', user_id: actorId, organization_id: null,
        action_key: 'neture.operator.market_trial_payment_change', source: 'manual', status: 'success', meta,
      });
      await refreshFundingAmount(manager,trialId);
      return {
        ...after, paidAmount: amount(after.paidAmount), paidAt: date(after.paidAt),
        confirmedAt: date(after.confirmedAt), updatedAt: date(after.updatedAt),
      };
    });
  }
}
