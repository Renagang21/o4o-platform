import {
  __resetUnderstandingCacheForTest, cacheUnderstanding, cachedUnderstanding, fallbackUnderstanding,
} from '../services/assistant/assistant-understanding.js';
import { createCompletionEvidenceSession } from '../services/ai-tools/work-completion-evidence.js';
import { WORK_RUN_TTL_MS } from '../services/ai-tools/work-run-coordination-service.js';

afterEach(() => { __resetUnderstandingCacheForTest(); jest.useRealTimers(); });

it('unanswered work loses request-derived understanding at the run deadline', () => {
  jest.useFakeTimers({ now: 1_000_000 });
  cacheUnderstanding('synthetic-run', fallbackUnderstanding('open fixture page'));
  jest.advanceTimersByTime(WORK_RUN_TTL_MS - 1);
  expect(cachedUnderstanding('synthetic-run')).not.toBeNull();
  jest.advanceTimersByTime(1);
  expect(cachedUnderstanding('synthetic-run')).toBeNull();
});

it('renewed work cannot be removed by the previous cache expiry callback', () => {
  jest.useFakeTimers({ now: 1_000_000 });
  cacheUnderstanding('synthetic-run', fallbackUnderstanding('first fixture'));
  jest.advanceTimersByTime(WORK_RUN_TTL_MS / 2);
  const next = fallbackUnderstanding('second fixture');
  cacheUnderstanding('synthetic-run', next);
  jest.advanceTimersByTime(WORK_RUN_TTL_MS / 2);
  expect(cachedUnderstanding('synthetic-run')).toEqual(next);
  jest.advanceTimersByTime(WORK_RUN_TTL_MS / 2);
  expect(cachedUnderstanding('synthetic-run')).toBeNull();
});

it('separate UI elements cannot manufacture one completion quote', () => {
  const evidence = createCompletionEvidenceSession();
  const proposal = { evidence: [{ criterion: 'c1', source: 'observation', quote: '결제 완료' }] } as never;
  evidence.noteElements([
    { elementRef: 'e1', role: 'text', name: '', text: '결제' },
    { elementRef: 'e2', role: 'text', name: '', text: '완료' },
  ] as never);
  expect(evidence.ground(proposal, [])[0].grounded).toBe(false);
  evidence.noteElements([{ elementRef: 'e3', role: 'text', name: '', text: '결제 완료' }] as never);
  expect(evidence.ground(proposal, [])[0].grounded).toBe(true);
});
