import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), pair: vi.fn() }));
vi.mock('../../../api/consultationWorkspace', () => ({
  readConsultationTablets: api.read, saveConsultationTablets: api.save, createKioskPairing: api.pair,
  readConsultationExpression: vi.fn(async () => ({ organizationId: 'store', canEdit: true, expression: { tone: 'neutral', formality: 'polite', length: 'standard' } })),
}));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: 'store' }) }));
import { ConsultationLauncher } from './ConsultationLauncher';

const tablets = [
  { id: 'pharmacist-a', role: 'pharmacist', name: '조제실 앞' },
  { id: 'staff-a', role: 'staff', name: '입구' },
  { id: 'consumer-a', role: 'consumer', name: '입구 키오스크' },
];
beforeEach(() => {
  vi.clearAllMocks();
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: true, configured: true, tablets });
  api.save.mockImplementation(async (list: unknown[]) => ({ organizationId: 'store', canEdit: true, configured: true, tablets: list }));
  api.pair.mockResolvedValue({ code: 'ABCDE-12345', expiresAt: '2026-11-13T10:10:00.000Z' });
});
afterEach(cleanup);

it('shows the three tablet kinds and lets the owner add a kiosk and create its one-time code', async () => {
  render(<ConsultationLauncher />);
  const kiosk = await screen.findByRole('region', { name: '소비자 태블릿(키오스크)' });
  expect(within(kiosk).getByText('입구 키오스크')).toBeTruthy();
  expect(within(kiosk).queryByRole('link', { name: /입구 키오스크 화면 열기/ })).toBeNull();
  expect(within(kiosk).getByRole('link', { name: '/consultation/kiosk ↗' }).getAttribute('href')).toBe('/consultation/kiosk');
  fireEvent.click(within(kiosk).getByRole('button', { name: '입구 키오스크 연결 코드 만들기' }));
  expect(await within(kiosk).findByText('ABCDE-12345')).toBeTruthy();
  expect(api.pair).toHaveBeenCalledWith('consumer-a');
  fireEvent.change(within(kiosk).getByLabelText('새 소비자 태블릿(키오스크) 이름'), { target: { value: '계산대 옆' } });
  fireEvent.click(within(kiosk).getByRole('button', { name: '소비자 태블릿(키오스크) 추가' }));
  await within(kiosk).findByText('계산대 옆');
  expect(api.save.mock.calls[0][0]).toEqual([...tablets, { id: expect.stringMatching(/^consumer-[0-9a-f]{8}$/), role: 'consumer', name: '계산대 옆' }]);
});

it('hides kiosk code creation and editing from staff members', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: false, configured: true, tablets });
  render(<ConsultationLauncher />);
  const kiosk = await screen.findByRole('region', { name: '소비자 태블릿(키오스크)' });
  expect(within(kiosk).queryByRole('button')).toBeNull();
  expect(screen.getByText('태블릿 추가 · 삭제는 매장 경영자가 할 수 있습니다.')).toBeTruthy();
});

it('lets the owner choose up to three speech auto-detect languages per tablet and clear them back to the admin default', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: true, configured: true, tablets: [{ ...tablets[2], speechLanguages: ['ko', 'vi'] }] });
  render(<ConsultationLauncher />);
  const kiosk = await screen.findByRole('region', { name: '소비자 태블릿(키오스크)' });
  const group = within(kiosk).getByRole('group', { name: '입구 키오스크 음성 자동 감지 언어' });
  expect(within(kiosk).getByText('음성 자동 감지 언어: 한국어 · 베트남어')).toBeTruthy();
  fireEvent.click(within(group).getByLabelText('태국어'));
  expect((within(group).getByLabelText('영어') as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(within(group).getByRole('button', { name: '자동 감지 언어 저장' }));
  await within(kiosk).findByText('음성 자동 감지 언어: 한국어 · 베트남어 · 태국어');
  expect(api.save.mock.calls[0][0]).toEqual([{ ...tablets[2], speechLanguages: ['ko', 'vi', 'th'] }]);
  for (const name of ['한국어', '베트남어', '태국어']) fireEvent.click(within(group).getByLabelText(name));
  fireEvent.click(within(group).getByRole('button', { name: '자동 감지 언어 저장' }));
  await within(kiosk).findByText('음성 자동 감지 언어: 관리자 기본 후보');
  expect(api.save.mock.calls[1][0]).toEqual([tablets[2]]);
});

it('keeps a saved empty list empty instead of bringing back the default tablets', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: true, configured: true, tablets: [] });
  render(<ConsultationLauncher />);
  const pharmacist = await screen.findByRole('region', { name: '약사 태블릿' });
  expect(within(pharmacist).queryByText(/약사 태블릿 1/)).toBeNull();
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: true, configured: false, tablets: [] });
  cleanup();
  render(<ConsultationLauncher />);
  expect(await screen.findByText('약사 태블릿 1 화면 열기 ↗')).toBeTruthy();
});

it('removes checked tablets from the top action bar and clears the selection', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: true, configured: true, tablets });
  render(<ConsultationLauncher />);
  fireEvent.click(await screen.findByLabelText('조제실 앞 선택'));
  fireEvent.click(screen.getByLabelText('입구 선택'));
  fireEvent.click(screen.getByRole('button', { name: '선택 삭제' }));
  fireEvent.click(await screen.findByRole('button', { name: '확인' }));
  await screen.findByText('태블릿 2대를 목록에서 뺐습니다.');
  expect(api.save.mock.calls[0][0]).toEqual([tablets[2]]);
  expect((screen.getByLabelText('입구 키오스크 선택') as HTMLInputElement).checked).toBe(false);
  expect(screen.queryByRole('button', { name: '선택 삭제' })).toBeNull();
});

it('hides selection controls from staff members', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: false, configured: true, tablets });
  render(<ConsultationLauncher />);
  await screen.findByRole('region', { name: '약사 태블릿' });
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByLabelText('전체 선택')).toBeNull();
});

it('lets the owner turn the Korean-alongside display off and on per kiosk, keeping other tablet settings', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: true, configured: true, tablets: [{ ...tablets[2], speechLanguages: ['vi'] }] });
  render(<ConsultationLauncher />);
  const kiosk = await screen.findByRole('region', { name: '소비자 태블릿(키오스크)' });
  const toggle = within(kiosk).getByLabelText('입구 키오스크 외국어 화면에 한국어 함께 보기') as HTMLInputElement;
  expect(toggle.checked).toBe(true);
  fireEvent.click(toggle);
  await screen.findByText('입구 키오스크의 한국어 함께 보기를 껐습니다.');
  expect(api.save.mock.calls[0][0]).toEqual([{ ...tablets[2], speechLanguages: ['vi'], showKorean: false }]);
  fireEvent.click(within(kiosk).getByLabelText('입구 키오스크 외국어 화면에 한국어 함께 보기'));
  await screen.findByText('입구 키오스크의 한국어 함께 보기를 켰습니다.');
  expect(api.save.mock.calls[1][0]).toEqual([{ ...tablets[2], speechLanguages: ['vi'] }]);
});

it('shows the Korean-alongside state to staff members as text without a control', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: false, configured: true, tablets: [{ ...tablets[2], showKorean: false }] });
  render(<ConsultationLauncher />);
  const kiosk = await screen.findByRole('region', { name: '소비자 태블릿(키오스크)' });
  expect(within(kiosk).getByText('외국어 화면에 한국어 함께 보기: 꺼짐')).toBeTruthy();
  expect(within(kiosk).queryByRole('checkbox')).toBeNull();
});

it('shows a default kiosk before the first save and saves the list before creating its code', async () => {
  api.read.mockResolvedValue({ organizationId: 'store', canEdit: true, configured: false, tablets: [] });
  render(<ConsultationLauncher />);
  const kiosk = await screen.findByRole('region', { name: '소비자 태블릿(키오스크)' });
  expect(within(kiosk).getByText('키오스크 1')).toBeTruthy();
  expect(within(kiosk).getByLabelText('키오스크 1 외국어 화면에 한국어 함께 보기')).toBeTruthy();
  fireEvent.click(within(kiosk).getByRole('button', { name: '키오스크 1 연결 코드 만들기' }));
  expect(await within(kiosk).findByText('ABCDE-12345')).toBeTruthy();
  expect(api.save.mock.calls[0][0]).toEqual([
    { id: 'pharmacist-1', role: 'pharmacist', name: '약사 태블릿 1' },
    { id: 'staff-1', role: 'staff', name: '근무자 태블릿 1' },
    { id: 'consumer-1', role: 'consumer', name: '키오스크 1' },
  ]);
  expect(api.pair).toHaveBeenCalledWith('consumer-1');
  expect(api.save.mock.invocationCallOrder[0]).toBeLessThan(api.pair.mock.invocationCallOrder[0]);
});
