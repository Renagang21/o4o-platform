import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
