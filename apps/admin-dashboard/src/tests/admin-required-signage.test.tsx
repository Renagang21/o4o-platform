import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminRequiredSignagePage from '../pages/kpa/AdminRequiredSignagePage';
import { hasMenuPermission } from '../config/rolePermissions';
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@o4o/auth-client', () => ({ authClient: { api: { request: mock.request, defaults: { baseURL: 'https://api.example.test/api/v1' } } } }));
beforeEach(() => { mock.request.mockReset().mockResolvedValue({ data: { success: true, data: [] } }); });
it('saves mandatory video periods as UTC from Korean input through the real operator screen', async () => {
  render(<MemoryRouter><AdminRequiredSignagePage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '새 필수 영상' }));
  fireEvent.change(screen.getByLabelText('필수 영상 제목'), { target: { value: 'Required fixture' } });
  fireEvent.change(screen.getByLabelText('필수 영상 주소'), { target: { value: 'https://youtu.be/abcdefghijk' } });
  fireEvent.change(screen.getByLabelText('게시 시작 일시 (한국 시간)'), { target: { value: '2026-11-05T09:00' } });
  fireEvent.change(screen.getByLabelText('게시 종료 일시 (한국 시간)'), { target: { value: '2026-11-05T18:00' } });
  fireEvent.click(screen.getByRole('button', { name: /^등록$/ }));
  await waitFor(() => expect(mock.request).toHaveBeenCalledWith(expect.objectContaining({
    method: 'POST', url: 'https://api.example.test/api/signage/kpa-society/hq/forced-content',
    data: expect.objectContaining({ title: 'Required fixture', startAt: '2026-11-05T00:00:00.000Z', endAt: '2026-11-05T09:00:00.000Z' }),
  })));
});
it('uses the existing platform administrator grant and denies service operator menus', () => {
  expect(hasMenuPermission(['platform:super_admin'], [], 'content-required-signage')).toBe(true);
  expect(hasMenuPermission(['kpa:operator'], [], 'content-required-signage')).toBe(false);
  expect(hasMenuPermission(['neture:operator'], [], 'content-required-signage')).toBe(false);
});
