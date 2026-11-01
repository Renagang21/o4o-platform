import { randomUUID } from 'node:crypto';
import { improvementMetadata, readImprovement } from '../community-improvements.js';

beforeAll(() => { process.env.JWT_SECRET = 'synthetic-improvement-proof-fixture'; });
it('survives JSONB key reordering but refuses copied or altered official decisions', () => {
  const id = randomUUID();
  const entry = { kind: 'bug' as const, state: 'reviewing' as const, body: 'Synthetic issue', version: 2, replies: [{ text: 'Synthetic response', official: true, at: '2026-11-01T00:00:00Z' }] };
  const metadata = improvementMetadata(id, entry);
  const value = metadata.o4oImprovementV1.value;
  metadata.o4oImprovementV1.value = { replies: value.replies, version: value.version, state: value.state, kind: value.kind, body: value.body };
  const row = { id, metadata, title: 'Fixture', authorId: randomUUID(), createdAt: '' };
  expect(readImprovement(row)).toEqual(entry);
  expect(readImprovement({ ...row, id: randomUUID() })).toBeNull();
  value.replies[0].text = 'Forged decision';
  expect(readImprovement(row)).toBeNull();
});
it('never treats unsigned client metadata as an official request', () => {
  expect(readImprovement({ id: randomUUID(), title: '', authorId: '', createdAt: '', metadata: { o4oImprovementV1: { value: { state: 'completed' } } } })).toBeNull();
});
