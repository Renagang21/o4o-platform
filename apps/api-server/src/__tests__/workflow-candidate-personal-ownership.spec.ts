jest.mock('../services/ai-tools/work-run-executor.js', () => ({
  issueWorkflowCandidateSave: jest.fn(async () => ({ status: 'success', safe: { saved: true } })),
  issueWorkflowCandidateResult: jest.fn(async () => ({ status: 'success', safe: {} })),
}));
import { persistWorkflow } from '../services/ai-tools/work-run-finalization.js';
import { issueWorkflowCandidateSave, issueWorkflowCandidateResult } from '../services/ai-tools/work-run-executor.js';
import { nodeLedgerOwnerKey } from '../services/ai-tools/node-ledger-owner.js';

it('colleagues sharing an organization save and update candidates under separate personal owners', async () => {
  for (const userId of ['synthetic-a', 'synthetic-b']) {
    const input = {
      dataSource: {}, ctx: { userId }, deviceId: 'synthetic-node',
      ledgerOwner: nodeLedgerOwnerKey('ORGANIZATION', 'synthetic-org'),
      goal: { runId: 'synthetic-run', request: '자료에서 fixture 검색해줘' },
      targetRef: { targetType: 'website' }, siteId: 'healthkr',
      workflow: { candidate: 'none', replay: 'completed' },
      trajectory: [{ actionKind: 'set_input', locator: { role: 'searchbox', name: '검색어' }, value: 'fixture', expect: { navigated: false, changed: false } }],
      resumedRun: false, hasRecoveryHint: false, replayedCandidateId: null,
      replayDiverge: null, endedByRuntime: false,
    };
    await persistWorkflow(input as never, 'completed');
    expect(issueWorkflowCandidateSave).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ ownerKey: nodeLedgerOwnerKey('USER', userId) }), expect.anything());
    await persistWorkflow({ ...input, trajectory: [], replayedCandidateId: 'synthetic-candidate' } as never, 'completed');
    expect(issueWorkflowCandidateResult).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ ownerKey: nodeLedgerOwnerKey('USER', userId) }), expect.anything());
  }
});
