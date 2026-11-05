import { calibrateSignageClock, signageNow } from '../../../../lib/signageClock';
import { expect, it, vi } from 'vitest';
import { inRequiredWindow } from '../requiredVideoWindow';
import { toKstInput, fromKstInput } from '../../../../../../../packages/operator-core-ui/src/modules/signage-hq/forcedContentTime';
it('includes the starting instant, excludes the ending instant and fails closed on invalid windows', () => {
  const item = { isForced: true, forcedStartAt: '2026-11-05T00:00:00Z', forcedEndAt: '2026-11-05T01:00:00Z' };
  expect(inRequiredWindow(item, Date.parse(item.forcedStartAt) - 1)).toBe(false);
  expect(inRequiredWindow(item, Date.parse(item.forcedStartAt))).toBe(true);
  expect(inRequiredWindow(item, Date.parse(item.forcedEndAt))).toBe(false);
  expect(inRequiredWindow({ ...item, forcedEndAt: 'invalid' })).toBe(false);
  expect(inRequiredWindow({ isForced: false })).toBe(true);
});
it('round trips Korean operator input through UTC regardless of the browser timezone', () => {
  expect(fromKstInput('2026-11-05T09:00')).toBe('2026-11-05T00:00:00.000Z');
  expect(toKstInput('2026-11-05T00:00:00.000Z')).toBe('2026-11-05T09:00');
});

it('keeps the server window clock stable when the PC wall clock changes', () => {
  vi.useFakeTimers();
  try {
    calibrateSignageClock('2026-11-05T00:00:00Z');
    const before = signageNow();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    expect(signageNow()).toBe(before);
    vi.advanceTimersByTime(1000);
    expect(signageNow()).toBe(before + 1000);
  } finally { vi.useRealTimers(); }
});
