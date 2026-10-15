import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContactInquiryAdminPage } from './ContactInquiryAdminPage';
afterEach(cleanup);
const row = { id: 'inquiry', serviceKey: 'lecture', name: '합성 문의자', subject: '검토 문의', status: 'received', createdAt: '2026-01-01' };
const detail = { ...row, message: '문의 본문', internalNote: null } as any;
const result = { items: [row], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } as any;

it('retries the failed note without repeating a successful status change', async () => {
  const api = { list: vi.fn(async () => result), getDetail: vi.fn(async () => detail),
    setStatus: vi.fn(async () => ({ ...detail, status: 'answered' })),
    setNote: vi.fn().mockRejectedValueOnce(new Error('메모 저장 실패')).mockResolvedValueOnce({ ...detail, status: 'answered', internalNote: '보존할 메모' }) };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />);
  fireEvent.click(await screen.findByText('검토 문의'));
  await screen.findByText('문의 본문');
  fireEvent.change(screen.getByLabelText('문의 처리 상태'), { target: { value: 'answered' } });
  fireEvent.change(screen.getByLabelText('문의 내부 메모'), { target: { value: '보존할 메모' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('문의 내부 메모') as HTMLTextAreaElement).value).toBe('보존할 메모');
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByRole('status');
  expect(api.setStatus).toHaveBeenCalledTimes(1);
  expect(api.setNote).toHaveBeenCalledTimes(2);
});

it('discards an old list response after changing the status filter', async () => {
  let first!: (value: unknown) => void;
  const api = { list: vi.fn().mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce(result), getDetail: vi.fn(), setStatus: vi.fn(), setNote: vi.fn() };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />);
  fireEvent.change(screen.getByLabelText('문의 상태 필터'), { target: { value: 'answered' } });
  await screen.findByText('검토 문의');
  await act(async () => first({ items: [], pagination: result.pagination }));
  expect(screen.getByText('검토 문의')).toBeTruthy();
});

it('a failed list does not claim there are no inquiries and can be retried', async () => {
  const api = { list: vi.fn().mockRejectedValueOnce(new Error('목록 실패')).mockResolvedValueOnce(result), getDetail: vi.fn(), setStatus: vi.fn(), setNote: vi.fn() };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('접수된 문의가 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
  await screen.findByText('검토 문의');
});

it('shows save success and refresh failure inside the open detail and retries reads only', async () => {
  const api = { list: vi.fn().mockResolvedValueOnce(result).mockRejectedValueOnce(new Error('갱신 실패')).mockResolvedValue(result), getDetail: vi.fn().mockResolvedValue(detail), setStatus: vi.fn().mockResolvedValue({ ...detail, status: 'answered' }), setNote: vi.fn() };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />);
  fireEvent.click(await screen.findByText('검토 문의')); await screen.findByText('문의 본문');
  fireEvent.change(screen.getByLabelText('문의 처리 상태'), { target: { value: 'answered' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByText('갱신 실패');
  const drawer = screen.getByRole('dialog', { name: '문의 상세' });
  expect(drawer.textContent).toContain('저장되었습니다.'); expect(drawer.textContent).toContain('최신 목록을 확인하지 못했습니다.');
  fireEvent.click(screen.getByRole('button', { name: '목록 다시 조회' }));
  await screen.findByText('검토 문의'); expect(api.setStatus).toHaveBeenCalledTimes(1); expect(api.setNote).not.toHaveBeenCalled();
});
it('keeps the failed note error even if the partial-success refresh also fails', async () => {
  const api = { list: vi.fn().mockResolvedValueOnce(result).mockRejectedValue(new Error('목록 장애')), getDetail: vi.fn().mockResolvedValue(detail), setStatus: vi.fn().mockResolvedValue({ ...detail, status: 'answered' }), setNote: vi.fn().mockRejectedValue(new Error('메모 장애')) };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />); fireEvent.click(await screen.findByText('검토 문의')); await screen.findByText('문의 본문');
  fireEvent.change(screen.getByLabelText('문의 처리 상태'), { target: { value: 'answered' } }); fireEvent.change(screen.getByLabelText('문의 내부 메모'), { target: { value: '남길 메모' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' })); await screen.findByText('목록 장애');
  expect(screen.getByText('메모 장애')).toBeTruthy(); expect(screen.getByRole('status').textContent).toContain('상태는 저장');
  expect((screen.getByLabelText('문의 내부 메모') as HTMLTextAreaElement).value).toBe('남길 메모');
});
it('ignores a previous service save and does not send its note into the next scope', async () => {
  let finish!: (v: unknown) => void;
  const api = { list: vi.fn().mockResolvedValue(result), getDetail: vi.fn().mockResolvedValue(detail), setStatus: vi.fn().mockImplementation(() => new Promise(r => { finish = r; })), setNote: vi.fn() };
  const view = render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />); fireEvent.click(await screen.findByText('검토 문의')); await screen.findByText('문의 본문');
  fireEvent.change(screen.getByLabelText('문의 처리 상태'), { target: { value: 'answered' } }); fireEvent.change(screen.getByLabelText('문의 내부 메모'), { target: { value: '이전 메모' } });
  const save = screen.getByRole('button', { name: '저장' }); fireEvent.click(save); fireEvent.click(save); expect(api.setStatus).toHaveBeenCalledTimes(1);
  view.rerender(<ContactInquiryAdminPage serviceKey="fixture-next" api={api} />);
  await act(async () => finish({ ...detail, status: 'answered' }));
  expect(api.setNote).not.toHaveBeenCalled(); expect(screen.queryByText('저장되었습니다.')).toBeNull();
});
it('offers retry when loading the selected detail fails', async () => {
  const api = { list: vi.fn().mockResolvedValue(result), getDetail: vi.fn().mockRejectedValueOnce(new Error('상세 장애')).mockResolvedValue(detail), setStatus: vi.fn(), setNote: vi.fn() };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />); fireEvent.click(await screen.findByText('검토 문의')); await screen.findByText('상세 장애');
  fireEvent.click(screen.getByRole('button', { name: '상세 다시 조회' })); await screen.findByText('문의 본문');
  expect(api.getDetail).toHaveBeenNthCalledWith(2, 'lecture', 'inquiry');
});
it('retries the failed page rather than resetting pagination', async () => {
  const page1={ ...result, pagination:{page:1,limit:20,total:21,totalPages:2} };
  const api={ list:vi.fn().mockResolvedValueOnce(page1).mockRejectedValueOnce(new Error('둘째 페이지 장애')).mockResolvedValueOnce({...page1,pagination:{...page1.pagination,page:2}}),getDetail:vi.fn(),setStatus:vi.fn(),setNote:vi.fn() };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api}/>);await screen.findByText('검토 문의');fireEvent.click(screen.getByRole('button',{name:'다음'}));await screen.findByText('둘째 페이지 장애');
  fireEvent.click(screen.getByRole('button',{name:'목록 다시 조회'}));await screen.findByText('검토 문의');expect(api.list).toHaveBeenNthCalledWith(3,'lecture',{status:undefined,page:2,limit:20});
});
