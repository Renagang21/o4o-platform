import { isPaymentStatus } from '@o4o/market-trial';
import { FundingError } from './funding-workspace.service.js';

/** One validated filter contract for the displayed list and its export. */
export function participantFilters(query: Record<string, unknown>, params: unknown[], alias = 'p') {
  const conditions: string[] = [];
  const options: Record<string, readonly string[]> = {
    rewardType: ['product', 'cash'], rewardStatus: ['pending', 'fulfilled'],
  };
  for (const field of ['rewardType', 'rewardStatus', 'paymentStatus']) {
    const value = query[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !(field === 'paymentStatus' ? isPaymentStatus(value) : options[field].includes(value))) {
      throw new FundingError(400, 'INVALID_PARTICIPANT_FILTER', '참여자 조회 조건을 확인해 주세요.');
    }
    params.push(value);
    const column = field === 'paymentStatus' ? `COALESCE(${alias}."paymentStatus", 'unpaid')` : `${alias}."${field}"`;
    conditions.push(`${column} = $${params.length}`);
  }
  return conditions;
}

/** Quoting protects CSV structure; the prefix prevents spreadsheet formula execution. */
export function participantCsvCell(value: unknown) {
  let text = String(value ?? '-');
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
