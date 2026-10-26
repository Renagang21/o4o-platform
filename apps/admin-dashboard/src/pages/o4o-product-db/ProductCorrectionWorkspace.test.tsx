import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCorrectionWorkspace from './ProductCorrectionWorkspace';
const mocks = vi.hoisted(() => ({
  api: {
    rules: vi.fn(),
    batches: vi.fn(),
    saveRule: vi.fn(),
    versions: vi.fn(),
    preview: vi.fn(),
    createBatch: vi.fn(),
    batch: vi.fn(),
    saveTask: vi.fn(),
    operations: vi.fn(),
    runs: vi.fn(),
    retryRun: vi.fn(),
    taskVersions: vi.fn(),
    aiDraft: vi.fn(),
  },
  access: { allowed: true },
}));
vi.mock('@/api/product-correction.api', () => ({ productCorrectionApi: mocks.api }));
vi.mock('./useProductDbWriteAccess', () => ({ useProductDbWriteAccess: () => mocks.access.allowed }));
const rule = {
  id: 'rule-1',
  revision: 1,
  title: '수치 기준',
  instructions: '기준량 연결 근거를 확인',
  purpose: 'ai-support',
  regulatoryTypes: [],
  descriptionType: 'STORE',
  language: 'ko',
  cadenceDays: 30,
  enabled: true,
  check: { kind: 'manual' },
  updatedAt: '2026-10-24',
  updatedBy: 'admin',
};
const product = {
  id: 'product-1',
  name: '검증용 상품',
  fingerprint: 'a'.repeat(64),
  reason: '수동 검토',
  specification: '500mg',
  sourceType: 'official',
  sourceContent: '원문 내용',
};
const batch = {
  id: 'batch-1',
  revision: 1,
  title: '월간 점검',
  ruleSnapshot: rule,
  items: [
    { id: 'task-1', product, state: 'pending', draft: '', notes: '', sources: '', updatedAt: '2026-10-24' },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.allowed = true;
  mocks.api.operations.mockResolvedValue({
    counts: { total: 0, products: 0, open: 0, due: 0, followup: 0, reviewed: 0, outdated: 0 },
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  mocks.api.runs.mockResolvedValue({ items: [], total: 0 });
  mocks.api.taskVersions.mockResolvedValue([]);
  mocks.api.rules.mockResolvedValue([rule]);
  mocks.api.batches.mockResolvedValue({ items: [], total: 0 });
  mocks.api.preview.mockResolvedValue({ ruleRevision: 1, total: 1, page: 1, pageSize: 25, items: [product] });
  mocks.api.createBatch.mockResolvedValue(batch);
  mocks.api.versions.mockResolvedValue([rule]);
});
async function selectRule() {
  await screen.findByRole('option', { name: '수치 기준 · v1' });
  fireEvent.change(screen.getByLabelText('보정 기준'), { target: { value: rule.id } });
}
async function createWork() {
  await selectRule();
  fireEvent.click(screen.getByRole('button', { name: '대상 점검', exact: true }));
  await screen.findByText('검증용 상품');
  fireEvent.click(screen.getByLabelText('검증용 상품 선택'));
  fireEvent.change(screen.getByLabelText('작업 묶음 이름'), { target: { value: '월간 점검' } });
  fireEvent.click(screen.getByRole('button', { name: '선택 상품 작업 만들기' }));
  await screen.findByLabelText('보완 초안');
}
describe('관리자 상품 보정 작업', () => {
  it('loads editable operational templates without saving and preserves explicit purpose selection', async () => {
    render(<ProductCorrectionWorkspace />);
    await screen.findByRole('option', { name: '수치 기준 · v1' });
    fireEvent.change(screen.getByLabelText('설명서 이용 목적'), { target: { value: 'professional' } });
    fireEvent.click(screen.getByText('함량과 1일 기준량 근거 확인 초안 사용'));
    expect(screen.getByLabelText('기준 이름')).toHaveValue('함량과 1일 기준량 근거 확인');
    expect(screen.getByLabelText('설명서 이용 목적')).toHaveValue('professional');
    expect(screen.getByLabelText('기준 사용')).not.toBeChecked();
    expect(mocks.api.saveRule).not.toHaveBeenCalled();
    expect(mocks.api.preview).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('검토·보완 지침'), { target: { value: '관리자가 보완한 근거 기준' } });
    mocks.api.saveRule.mockResolvedValue({ ...rule, instructions: '관리자가 보완한 근거 기준', enabled: false });
    fireEvent.click(screen.getByText('기준 저장'));
    await waitFor(() => expect(mocks.api.saveRule).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'professional', enabled: false, instructions: '관리자가 보완한 근거 기준' }), undefined));
  });

  it('requests a separate AI proposal without overwriting edits or saving official data', async () => {
    mocks.api.aiDraft.mockResolvedValue({ draft: '합성 AI 검토안', missingEvidence: ['전체 원문 확인'], taskId: 'task-1', batchRevision: 1, sourceFingerprint: product.fingerprint });
    render(<ProductCorrectionWorkspace />);
    await createWork();
    fireEvent.change(screen.getByLabelText('보완 초안'), { target: { value: '사용자가 편집 중인 내용' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI 보완 초안 요청' }));
    await screen.findByText('합성 AI 검토안');
    expect(mocks.api.aiDraft).toHaveBeenCalledWith('batch-1', 'task-1', 1);
    expect((screen.getByLabelText('보완 초안') as HTMLTextAreaElement).value).toBe('사용자가 편집 중인 내용');
    expect(mocks.api.saveTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '이 검토안을 보완 초안에 넣기' }));
    expect((screen.getByLabelText('보완 초안') as HTMLTextAreaElement).value).toBe('합성 AI 검토안');
    expect(mocks.api.saveTask).not.toHaveBeenCalled();
  });
  it('preserves manual edits when AI returns a conflict', async () => {
    mocks.api.aiDraft.mockRejectedValue(new Error('BATCH_CHANGED'));
    render(<ProductCorrectionWorkspace />);
    await createWork();
    fireEvent.change(screen.getByLabelText('보완 초안'), { target: { value: '수동 검토 내용' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI 보완 초안 요청' }));
    await screen.findByText(/BATCH_CHANGED/);
    expect((screen.getByLabelText('보완 초안') as HTMLTextAreaElement).value).toBe('수동 검토 내용');
    expect(mocks.api.saveTask).not.toHaveBeenCalled();
    expect(mocks.api.aiDraft).toHaveBeenCalledTimes(1);
  });
  it('edits criteria and keeps version history accessible', async () => {
    mocks.api.saveRule.mockResolvedValue({ ...rule, revision: 2, instructions: '새 검토 기준' });
    render(<ProductCorrectionWorkspace />);
    await selectRule();
    fireEvent.change(screen.getByLabelText('검토·보완 지침'), { target: { value: '새 검토 기준' } });
    fireEvent.click(screen.getByRole('button', { name: '기준 저장' }));
    await screen.findByText('기준 v2 저장 완료');
    expect(mocks.api.saveRule).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: '새 검토 기준' }),
      rule,
    );
    fireEvent.click(screen.getByRole('button', { name: '기준 버전 이력' }));
    await screen.findByText(/v1 ·/);
  });
  it('selects candidates, creates a snapshot job and saves a separate draft', async () => {
    mocks.api.saveTask.mockImplementation(async (_batch, _task, input) => ({
      ...batch,
      revision: 2,
      items: [{ ...batch.items[0], ...input, updatedAt: '2026-10-25' }],
    }));
    render(<ProductCorrectionWorkspace />);
    await createWork();
    fireEvent.change(screen.getByLabelText('보완 초안'), { target: { value: '검토할 초안' } });
    fireEvent.change(screen.getByLabelText('검토 메모'), { target: { value: '용량 기준 확인' } });
    fireEvent.change(screen.getByLabelText('확인 근거·출처'), { target: { value: '확인 자료' } });
    fireEvent.click(screen.getByRole('button', { name: '작업 기록 저장' }));
    await screen.findByText(/작업 기록 저장 완료/);
    expect(mocks.api.createBatch).toHaveBeenCalledWith(rule, { search: '', page: 1 }, '월간 점검', [product]);
    expect(mocks.api.saveTask).toHaveBeenCalledWith(
      batch,
      batch.items[0],
      expect.objectContaining({ draft: '검토할 초안', sources: '확인 자료' }),
    );
    expect(screen.getByLabelText('보완 초안')).toHaveValue('검토할 초안');
  });
  it('retains unsaved draft after a concurrency conflict', async () => {
    mocks.api.saveTask.mockRejectedValue(new Error('다른 작업이 먼저 저장됐습니다.'));
    render(<ProductCorrectionWorkspace />);
    await createWork();
    fireEvent.change(screen.getByLabelText('보완 초안'), { target: { value: '유지할 초안' } });
    fireEvent.click(screen.getByRole('button', { name: '작업 기록 저장' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('보완 초안')).toHaveValue('유지할 초안');
  });
  it('ignores an old preview response after the search changes', async () => {
    let resolve!: (value: unknown) => void;
    mocks.api.preview.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<ProductCorrectionWorkspace />);
    await selectRule();
    fireEvent.click(screen.getByRole('button', { name: '대상 점검', exact: true }));
    fireEvent.change(screen.getByLabelText('상품명·바코드 검색'), { target: { value: '새 검색' } });
    resolve({ ruleRevision: 1, total: 1, page: 1, pageSize: 25, items: [product] });
    await waitFor(() => expect(screen.queryByText('검증용 상품')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '선택 상품 작업 만들기' })).not.toBeInTheDocument();
  });
  it('disables writing without the product DB authority', async () => {
    mocks.access.allowed = false;
    render(<ProductCorrectionWorkspace />);
    await selectRule();
    expect(screen.getByLabelText('검토·보완 지침')).toBeDisabled();
    expect(screen.getByRole('button', { name: '기준 저장' })).toBeDisabled();
  });
  it('records no-change review and displays the server-calculated next inspection date', async () => {
    mocks.api.saveTask.mockImplementation(async (_batch, _task, input) => ({
      ...batch,
      revision: 2,
      items: [
        {
          ...batch.items[0],
          ...input,
          reviewedAt: '2026-10-24T12:00:00.000Z',
          nextReviewAt: '2026-11-23T12:00:00.000Z',
          updatedAt: '2026-10-24T12:00:00.000Z',
        },
      ],
    }));
    render(<ProductCorrectionWorkspace />);
    await createWork();
    fireEvent.change(screen.getByLabelText('작업 상태'), { target: { value: 'no_change' } });
    fireEvent.change(screen.getByLabelText('검토 메모'), { target: { value: '원문 수치 관계 확인' } });
    fireEvent.change(screen.getByLabelText('확인 근거·출처'), { target: { value: '공식 원문과 확인일' } });
    fireEvent.click(screen.getByRole('button', { name: '작업 기록 저장' }));
    await screen.findByText(/작업 기록 저장 완료/);
    expect(mocks.api.saveTask).toHaveBeenCalledWith(
      batch,
      batch.items[0],
      expect.objectContaining({ state: 'no_change', draft: '' }),
    );
    expect(screen.getByText(/검토 완료:.*다음 점검:/)).not.toHaveTextContent('다음 점검: 없음');
  });
  it('sends a follow-up date for source-waiting tasks without marking them complete', async () => {
    mocks.api.saveTask.mockResolvedValue({ ...batch, revision: 2 });
    render(<ProductCorrectionWorkspace />);
    await createWork();
    fireEvent.change(screen.getByLabelText('작업 상태'), { target: { value: 'needs_source' } });
    fireEvent.change(screen.getByLabelText('재확인 예정일'), { target: { value: '2030-01-03T10:00' } });
    fireEvent.change(screen.getByLabelText('검토 메모'), { target: { value: '추가 원문 요청' } });
    fireEvent.click(screen.getByRole('button', { name: '작업 기록 저장' }));
    await screen.findByText(/작업 기록 저장 완료/);
    expect(mocks.api.saveTask).toHaveBeenCalledWith(
      batch,
      batch.items[0],
      expect.objectContaining({
        state: 'needs_source',
        followUpAt: new Date('2030-01-03T10:00').toISOString(),
      }),
    );
  });
  it('connects existing work and exposes previous saved versions', async () => {
    mocks.api.createBatch.mockResolvedValue({
      ...batch,
      selectionResult: {
        createdCount: 0,
        reused: [{ batchId: batch.id, taskId: batch.items[0].id, productName: product.name }],
      },
    });
    mocks.api.batch.mockResolvedValue(batch);
    mocks.api.taskVersions.mockResolvedValue([
      { batchId: batch.id, batchRevision: 1, task: { ...batch.items[0], draft: '이전에 저장한 초안' } },
    ]);
    render(<ProductCorrectionWorkspace />);
    await createWork();
    expect(screen.getByRole('status')).toHaveTextContent('새 작업 0개 · 기존 작업 연결 1개');
    fireEvent.click(screen.getByRole('button', { name: '검증용 상품 기존 작업 열기' }));
    await waitFor(() => expect(mocks.api.batch).toHaveBeenCalledWith(batch.id));
    fireEvent.click(screen.getByRole('button', { name: '작업 저장 이력' }));
    await screen.findByText('이전에 저장한 초안');
  });
  it('shows failed page inspection history and retries the recorded scope', async () => {
    mocks.api.runs.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'run-1',
          ruleTitle: rule.title,
          ruleRevision: 1,
          scope: { search: '비타민', page: 2 },
          status: 'failed',
          startedAt: '2026-10-24',
          totalCandidates: null,
          returnedCount: 0,
        },
      ],
    });
    mocks.api.retryRun.mockResolvedValue({ status: 'completed' });
    render(<ProductCorrectionWorkspace />);
    await screen.findByText(/점검 실패/);
    expect(screen.getByText(/검색: 비타민/)).toHaveTextContent('후보 확인 실패');
    fireEvent.click(screen.getByRole('button', { name: '실패 범위 다시 실행' }));
    await waitFor(() => expect(mocks.api.retryRun).toHaveBeenCalledWith('run-1'));
  });
  it('ignores an older operations response after the filter changes', async () => {
    let resolve!: (value: unknown) => void;
    const fresh = {
      counts: { total: 17, products: 1, open: 1, due: 0, followup: 0, reviewed: 0, outdated: 0 },
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    };
    mocks.api.operations
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValue(fresh);
    render(<ProductCorrectionWorkspace />);
    fireEvent.change(screen.getByLabelText('관리 현황 조건'), { target: { value: 'open' } });
    await screen.findByText(/기록 17건/);
    await act(async () => {
      resolve({ ...fresh, counts: { ...fresh.counts, total: 999 } });
    });
    expect(screen.queryByText(/기록 999건/)).not.toBeInTheDocument();
  });
  it('shows an operations failure without presenting a successful zero count and allows refresh', async () => {
    mocks.api.operations.mockRejectedValueOnce(new Error('temporary read failure'));
    render(<ProductCorrectionWorkspace />);
    await screen.findByText('정기 관리 현황을 불러오지 못했습니다.');
    expect(screen.queryByText(/기록 0건/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '현황 새로고침' }));
    await screen.findByText(/기록 0건/);
  });
  it('saves the canonical health-functional regulatory type used by product creation', async () => {
    mocks.api.saveRule.mockResolvedValue({ ...rule, revision: 2, regulatoryTypes: ['HEALTH_FUNCTIONAL'] });
    render(<ProductCorrectionWorkspace />);
    await selectRule();
    fireEvent.click(screen.getByLabelText('건강기능식품'));
    fireEvent.click(screen.getByRole('button', { name: '기준 저장' }));
    await screen.findByText('기준 v2 저장 완료');
    expect(mocks.api.saveRule).toHaveBeenCalledWith(
      expect.objectContaining({ regulatoryTypes: ['HEALTH_FUNCTIONAL'] }),
      rule,
    );
  });
});
