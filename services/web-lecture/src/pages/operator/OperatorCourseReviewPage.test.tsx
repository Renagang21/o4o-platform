import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ review: vi.fn(), approve: vi.fn(), reject: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../../api/lecture', () => ({ operatorApi: mocks, errorMessage: (_err: unknown, fallback: string) => fallback, errorStatus: (error: any) => error.status }));
vi.mock('../../components/Toast', () => ({ useToast: () => mocks }));
import Page from './OperatorCourseReviewPage';
const course = (id: string) => ({ data: { course: { id, title: `검토 ${id}`, status: 'pending_review', instructorId: 'instructor' }, curriculum: [] } });
function Switch() { const go = useNavigate(); return <button onClick={() => go('/operator/courses/b/review')}>다른 강좌</button>; }
const renderPage = () => render(<MemoryRouter initialEntries={['/operator/courses/a/review']}><Switch /><Routes><Route path="/operator/courses/:courseId/review" element={<Page />} /><Route path="/operator" element={<p>강의 운영 목록</p>} /></Routes></MemoryRouter>);
beforeEach(() => { vi.resetAllMocks(); mocks.review.mockImplementation(async id => course(id)); });
afterEach(cleanup);
it('an old read cannot replace the currently selected course', async () => {
  let done!: (value: unknown) => void;
  mocks.review.mockImplementationOnce(() => new Promise(resolve => { done = resolve; })).mockResolvedValueOnce(course('b'));
  renderPage(); fireEvent.click(screen.getByRole('button', { name: '다른 강좌' }));
  await screen.findByRole('heading', { name: /검토 b/ });
  await act(async () => done(course('a')));
  expect(screen.queryByRole('heading', { name: /검토 a/ })).toBeNull();
});
it('a late approval cannot navigate away from another course or notify it', async () => {
  let done!: () => void; mocks.approve.mockImplementationOnce(() => new Promise<void>(resolve => { done = resolve; }));
  renderPage(); fireEvent.click(await screen.findByRole('button', { name: '승인(게시)' }));
  fireEvent.click(screen.getByRole('button', { name: '다른 강좌' })); await screen.findByRole('heading', { name: /검토 b/ });
  await act(async () => done());
  expect(screen.getByRole('heading', { name: /검토 b/ })).toBeTruthy(); expect(mocks.success).not.toHaveBeenCalled();
});
it('retains a failed rejection and navigates only after successful retry', async () => {
  mocks.reject.mockRejectedValueOnce(new Error('fixture')).mockResolvedValue({});
  renderPage(); fireEvent.click(await screen.findByRole('button', { name: '반려' }));
  fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), { target: { value: '자료 보완 요청' } });
  fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
  await within(screen.getByRole('dialog')).findByRole('alert');
  expect((within(screen.getByRole('dialog')).getByRole('textbox') as HTMLTextAreaElement).value).toBe('자료 보완 요청');
  fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
  await screen.findByText('강의 운영 목록'); expect(mocks.reject).toHaveBeenLastCalledWith('a', '자료 보완 요청');
});
it('retries a failed read and retains the read-only curriculum resources', async () => {
  mocks.review.mockRejectedValueOnce(Object.assign(new Error('fixture'), { status: 404 })).mockResolvedValueOnce({ data: { ...course('a').data, curriculum: [{ id: 'lesson', title: '검토 자료', order: 1, type: 'video', hasQuiz: true, quizQuestionCount: 2, attachments: [{ url: 'https://example.invalid/material', name: '첨부 자료' }], videoUrl: 'https://example.invalid/video' }] } });
  renderPage(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
  await screen.findByText(/검토 자료/);
  expect(screen.getByRole('link', { name: '첨부 자료' }).getAttribute('href')).toBe('https://example.invalid/material');
  expect(screen.getByText(/문항·정답은 검토 화면에서 노출하지 않습니다/)).toBeTruthy();
  expect(mocks.approve).not.toHaveBeenCalled(); expect(mocks.reject).not.toHaveBeenCalled();
});
