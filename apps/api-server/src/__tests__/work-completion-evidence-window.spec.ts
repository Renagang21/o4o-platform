import { createCompletionEvidenceSession, SEEN_TEXT_MAX } from '../services/ai-tools/work-completion-evidence.js';
import type { WorkElement, WorkProposal } from '../services/ai-tools/work-agent-contract.js';

const quote = 'Synthetic reference confirmed';
function grounded(session: ReturnType<typeof createCompletionEvidenceSession>) {
  return session.ground({ assessment: 'completed', action: { kind: 'done' },
    evidence: [{ criterion: 'c1', source: 'screen', quote }] } as WorkProposal, [])[0].grounded;
}

test('one observation of 150 separate elements cannot evict an earlier completion reference', () => {
  const session = createCompletionEvidenceSession();
  session.noteSeen(quote);
  session.noteElements(Array.from({ length: 150 }, (_, index) => ({
    elementRef: `e_${index}`, role: 'text', name: `Synthetic screen label ${index}`,
  } as WorkElement)));
  expect(grounded(session)).toBe(true);
});

test('repeated screen labels do not consume the bounded evidence window', () => {
  const session = createCompletionEvidenceSession();
  session.noteSeen(quote);
  for (let index = 0; index <= SEEN_TEXT_MAX; index++) session.noteSeen('Repeated synthetic label');
  expect(grounded(session)).toBe(true);
});

test('unique screen text remains capped and eventually evicts the oldest reference', () => {
  const session = createCompletionEvidenceSession();
  session.noteSeen(quote);
  for (let index = 0; index < SEEN_TEXT_MAX; index++) session.noteSeen(`Unique synthetic label ${index}`);
  expect(grounded(session)).toBe(false);
});
