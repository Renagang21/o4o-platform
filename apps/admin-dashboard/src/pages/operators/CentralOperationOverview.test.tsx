import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@o4o/auth-client', () => ({ authClient: { api } }));
import Page from './CentralOperationOverview';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const tasks = [
  { key: 'supplier-review', service: 'supplier', label: '공급자 검토', href: '/operator/suppliers', count: 3, available: true },
  { key: 'lecture-courses', service: 'lecture', label: '강의 검토', href: '/operator/courses', count: 0, available: true },
  { key: 'pharmacy-applications', service: 'neture', label: '약국 검토', href: '/operator/pharmacy-memberships', count: null, available: false },
];
const response = (rows = tasks) => ({ data: { data: { tasks: rows, generatedAt: '2026-10-29' } } });
const view = () => render(<MemoryRouter><Page roleKey="scope" /></MemoryRouter>);
it('separates unknown counts, shows pending first, and reveals selection actions above the list', async () => {
  api.get.mockResolvedValue(response()); view();
  await screen.findByText('공급자 검토');
  expect(screen.getByText('확인된 대기')).toBeTruthy();
  expect(screen.queryByText('강의 검토')).toBeNull();
  expect(screen.getByText('조회 실패', { selector: 'span' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '첫 선택 업무 열기' })).toBeNull();
  fireEvent.click(screen.getByLabelText('공급자 검토 선택'));
  expect(screen.getByRole('button', { name: '첫 선택 업무 열기' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '공급자 검토 업무 열기' }).getAttribute('href')).toBe('/operations/supplier/suppliers');
  fireEvent.change(screen.getByLabelText('대기 업무 표시'), { target: { value: 'all' } });
  expect(screen.getByText('강의 검토')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '첫 선택 업무 열기' })).toBeNull();
});
it('retains the previous snapshot with an error instead of inventing a new zero on refresh failure', async () => {
  api.get.mockResolvedValueOnce(response()).mockRejectedValue(new Error('offline')); view();
  await screen.findByText('공급자 검토'); fireEvent.click(screen.getByRole('button', { name: '대기 현황 새로고침' }));
  await waitFor(() => expect(screen.getAllByRole('alert').some(row => row.textContent?.includes('최신이 아닐'))).toBe(true));
  expect(screen.getByText('공급자 검토')).toBeTruthy();
});
it('does not restore an old delegation response after scope changes', async () => {
  let finish!: (value: unknown) => void;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(response([]));
  const v = render(<MemoryRouter><Page roleKey="old" /></MemoryRouter>);
  v.rerender(<MemoryRouter><Page roleKey="new" /></MemoryRouter>);
  await screen.findByText('표시할 대기 업무가 없습니다.');
  await act(async () => finish(response()));
  expect(screen.queryByText('공급자 검토')).toBeNull();
});
it('leaves selected-only mode when the last checked task is cleared',async()=>{
 api.get.mockResolvedValue(response());view();fireEvent.click(await screen.findByLabelText('공급자 검토 선택'));
 fireEvent.click(screen.getByRole('button',{name:'선택 업무 모아보기'}));expect(screen.queryByText('약국 검토')).toBeNull();
 fireEvent.click(screen.getByLabelText('공급자 검토 선택'));await screen.findByText('약국 검토');
});
it('opens the exact pending candidate queue from its banner and count', async () => {
  api.get.mockResolvedValue(response([{key:'product-candidates',service:'neture',label:'상품 후보 검토',href:'/operator/product-candidates?status=pending',count:12000,available:true}])); view();
  const banner=await screen.findByRole('link',{name:'상품 후보 검토 대기 업무 바로가기'});
  expect(banner.getAttribute('href')).toBe('/operations/neture/candidates?status=pending');
  expect(screen.getByRole('link',{name:'상품 후보 검토 12000건 처리하기'}).getAttribute('href')).toBe(banner.getAttribute('href'));
});
it('keeps public intake visible but excludes it from the actual pending workload total',async()=>{
 api.get.mockResolvedValue(response([{key:'product-candidates',service:'neture',label:'상품 후보 검토 대기',href:'/operator/product-candidates?status=pending&queue=review',count:3,available:true},{key:'product-candidate-intake',service:'neture',label:'공공 수집 자료 등록 준비',href:'/operator/product-candidates?status=active&queue=intake',count:12000,available:true,kind:'reference'}] as any));view();
 const intake=await screen.findByRole('region',{name:'수집 자료 등록 준비'});expect(intake.textContent).toContain('12,000건');
 expect(screen.getByRole('button',{name:/전체 대기/}).textContent).toContain('3건');
 expect(screen.queryByLabelText('공공 수집 자료 등록 준비 선택')).toBeNull();
 expect(screen.getByRole('link',{name:/공공 수집 자료 등록 준비 ·/}).getAttribute('href')).toBe('/operations/neture/candidates?status=active&queue=intake');
});
it('prioritizes work waiting over three days and keeps it visible after notification reads', async () => {
  const old = new Date(Date.now() - 4 * 86400000).toISOString();
  api.get.mockResolvedValue(response([
    { key: 'new', service: 'supplier', label: '최근 신청', href: '/operator/suppliers', count: 30, available: true },
    { key: 'community-improvements', service: 'community', label: '개선 요청', href: 'https://admin.neture.co.kr/operations/community/forums', count: 1, oldest: old, available: true },
  ] as any)); view();
  await screen.findByText('3일 이상 대기 · 우선 확인');
  const region = screen.getByLabelText('업무별 대기 바로가기');
  expect(region.querySelector('a')?.textContent).toContain('개선 요청');
  expect(screen.getByText(/알림을 읽어도 대기 건수는 줄지 않습니다/)).toBeTruthy();
  await act(async () => { window.dispatchEvent(new Event('central-operation-work-changed')); });
  await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(1));
  expect(screen.getByRole('link', { name: '개선 요청 업무 열기' }).getAttribute('href')).toBe('/operations/community/forums');
});
