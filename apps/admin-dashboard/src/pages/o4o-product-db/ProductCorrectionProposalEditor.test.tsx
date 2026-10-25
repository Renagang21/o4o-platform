import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCorrectionProposalEditor from './ProductCorrectionProposalEditor';
const api = vi.hoisted(() => ({
  changeContext: vi.fn(),
  proposals: vi.fn(),
  createProposal: vi.fn(),
  reviewProposal: vi.fn(),
  applyProposal: vi.fn(),
  proposalVersions: vi.fn(),
  proposalAttempts: vi.fn(),
  proposal: vi.fn(),
}));
vi.mock('@/api/product-correction.api', () => ({ productCorrectionApi: api }));
const proposal = {
  id: 'proposal',
  revision: 1,
  createdAt: '2026-10-25T00:00:00Z',
  createdBy: 'admin',
  baseline: { fingerprint: 'a'.repeat(64) },
  ruleSnapshot: { title: '기준', revision: 1 },
  evidence: [
    {
      id: 'evidence',
      kind: 'product-fact',
      source: '포장 확인',
      checkedOn: '2026-10-24',
      status: 'confirmed',
      fields: ['name'],
    },
  ],
  changes: [
    {
      field: 'name',
      before: '원본 상품',
      after: '수정 상품',
      reason: '표시명 확인',
      evidenceIds: ['evidence'],
      decision: 'pending',
    },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, '', '/');
  api.changeContext.mockResolvedValue({
    fingerprint: 'a'.repeat(64),
    descriptionId: null,
    values: {
      name: '원본 상품',
      brandName: null,
      specification: '500mg',
      originCountry: 'KR',
      tags: [],
      descriptionContent: '',
    },
  });
  api.proposals.mockResolvedValue([]);
  api.createProposal.mockResolvedValue(proposal);
  api.proposalVersions.mockResolvedValue([proposal]);
});
const renderEditor = (canWrite = true) =>
  render(<ProductCorrectionProposalEditor batchId="batch" taskId="task" canWrite={canWrite} />);
async function load() {
  fireEvent.click(screen.getByRole('button', { name: '최신 원본·변경안 이력 불러오기' }));
  await screen.findByText('상품명 변경');
}
async function fill() {
  await load();
  fireEvent.click(screen.getByLabelText('상품명 변경'));
  fireEvent.change(screen.getByLabelText('상품명 제안 값'), {
    target: { value: '수정 상품' },
  });
  fireEvent.change(screen.getByLabelText('상품명 변경 이유'), {
    target: { value: '표시명 확인' },
  });
  fireEvent.click(screen.getByText('근거 추가'));
  fireEvent.change(screen.getByLabelText('근거 1 출처'), {
    target: { value: '포장 확인' },
  });
  fireEvent.change(screen.getByLabelText('근거 1 확인일'), {
    target: { value: '2026-10-24' },
  });
  fireEvent.click(screen.getByLabelText('자료 확인 완료'));
}
describe('수동 변경안 승인·반영', () => {
  it('opens an older requested proposal even outside the recent list', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    api.proposal.mockResolvedValue({ ...proposal, id, batchId: 'batch', taskId: 'task' });
    window.history.replaceState(null, '', `/?proposal=${id}`);
    renderEditor(); await load();
    await screen.findByLabelText('저장된 변경안 비교');
    expect(api.proposal).toHaveBeenCalledWith(id);
    expect(screen.getByLabelText('변경안 이력')).toHaveValue(id);
  });

  it('keeps unsaved review opinions when refreshing a proposal opened from a direct link', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    api.proposal.mockResolvedValue({ ...proposal, id, batchId: 'batch', taskId: 'task' });
    window.history.replaceState(null, '', `/?proposal=${id}`);
    renderEditor(); await load();
    await screen.findByLabelText('저장된 변경안 비교');
    fireEvent.change(screen.getByLabelText('변경안 검토 의견'), { target: { value: '아직 저장하지 않은 의견' } });
    fireEvent.click(screen.getByLabelText('상품명 승인 (미선택은 반려)'));
    fireEvent.click(screen.getByText('최신 원본·변경안 이력 불러오기'));
    await waitFor(() => expect(api.changeContext).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('최신 원본·변경안 이력 불러오기')).not.toBeDisabled());
    expect(screen.getByLabelText('변경안 검토 의견')).toHaveValue('아직 저장하지 않은 의견');
    expect(screen.getByLabelText('상품명 승인 (미선택은 반려)')).toBeChecked();
    expect(screen.getByLabelText('변경안 이력')).toHaveValue(id);
    expect(api.proposal).toHaveBeenCalledTimes(1);
  });
  it('stores structured evidence and suggestion without approving or applying', async () => {
    renderEditor();
    await fill();
    fireEvent.click(screen.getByText('새 변경안 저장 (미적용)'));
    await screen.findByLabelText('저장된 변경안 비교');
    expect(api.createProposal).toHaveBeenCalledWith(
      'batch',
      'task',
      expect.objectContaining({
        evidence: [
          expect.objectContaining({
            kind: 'product-fact',
            status: 'confirmed',
            fields: ['name'],
          }),
        ],
        changes: [expect.objectContaining({ field: 'name', after: '수정 상품' })],
      }),
    );
    expect(api.reviewProposal).not.toHaveBeenCalled();
    expect(api.applyProposal).not.toHaveBeenCalled();
  });
  it('separates approval, actual selection and explicit confirmation', async () => {
    api.proposals.mockResolvedValue([proposal]);
    const reviewed = {
      ...proposal,
      revision: 2,
      reviewedAt: '2026-10-25T01:00:00Z',
      reviewedBy: 'admin',
      reviewNote: '검토 완료',
      changes: [{ ...proposal.changes[0], decision: 'approved' }],
    };
    api.reviewProposal.mockResolvedValue(reviewed);
    api.applyProposal.mockResolvedValue({
      ...reviewed,
      revision: 3,
      appliedAt: '2026-10-25T02:00:00Z',
      appliedBy: 'admin',
      appliedFields: ['name'],
    });
    renderEditor();
    await load();
    fireEvent.change(screen.getByLabelText('변경안 이력'), {
      target: { value: 'proposal' },
    });
    fireEvent.click(screen.getByLabelText('상품명 승인 (미선택은 반려)'));
    fireEvent.change(screen.getByLabelText('변경안 검토 의견'), {
      target: { value: '검토 완료' },
    });
    fireEvent.click(screen.getByText('승인·반려 결과 저장'));
    await screen.findByLabelText('상품명 실제 반영');
    expect(api.applyProposal).not.toHaveBeenCalled();
    expect(screen.getByText('선택 항목 원본에 반영')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('상품명 실제 반영'));
    fireEvent.click(
      screen.getByLabelText(
        '선택 항목이 공통 상품 정보와 이를 읽는 서비스에 반영됨을 확인했습니다.',
      ),
    );
    fireEvent.click(screen.getByText('선택 항목 원본에 반영'));
    await waitFor(() => expect(api.applyProposal).toHaveBeenCalledWith(reviewed, ['name']));
    await screen.findByText(/반영 완료:/);
  });
  it('preserves typed values after conflict and explicit refresh', async () => {
    renderEditor();
    await fill();
    api.createProposal.mockRejectedValue(new Error('원본 충돌'));
    fireEvent.click(screen.getByText('새 변경안 저장 (미적용)'));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('상품명 제안 값')).toHaveValue('수정 상품');
    api.changeContext.mockResolvedValue({
      fingerprint: 'b'.repeat(64),
      values: { name: '다른 수정', tags: [], descriptionContent: '' },
    });
    fireEvent.click(screen.getByText('최신 원본·변경안 이력 불러오기'));
    await screen.findByText('현재 값: 다른 수정');
    expect(screen.getByLabelText('상품명 제안 값')).toHaveValue('수정 상품');
  });
  it('disables editing and applying without write access', async () => {
    renderEditor(false);
    await load();
    expect(screen.getByLabelText('상품명 변경')).toBeDisabled();
    expect(screen.getByText('근거 추가')).toBeDisabled();
    expect(screen.getByText('새 변경안 저장 (미적용)')).toBeDisabled();
    expect(api.createProposal).not.toHaveBeenCalled();
  });
});
