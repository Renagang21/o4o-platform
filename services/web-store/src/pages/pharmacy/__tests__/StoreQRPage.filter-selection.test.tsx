import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StoreQRPage } from '../StoreQRPage';

// Codex P1(PR #1061): 기본 「매장 QR」 필터가 숨긴 태블릿 코너 QR 이 전체 선택 · 일괄 출력에 섞이지 않아야 한다.
const api = vi.hoisted(() => ({ list: vi.fn(), placements: vi.fn(), scans: vi.fn() }));
vi.mock('../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: 'A' }) }));
vi.mock('../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => 'A', captureStoreOrganizationHeaders: (headers: HeadersInit) => headers }));
vi.mock('../../../contexts/AuthContext', () => ({ getAccessToken: () => null }));
vi.mock('../../../api/storeQr', async original => ({ ...await original<object>(), getStoreQrCodes: api.list, listQrPlacements: api.placements, getQrPlacementAnalytics: api.scans }));

const qr = (id: string, landingType: string) => ({ id, title: `QR ${id}`, slug: id, landingType, isActive: true, landable: true, scanCount: 0 });
const rows = [qr('own-1', 'page'), qr('own-2', 'link'), qr('corner-1', 'screen_set')];
const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue({ success: true, data: { items: rows, total: rows.length } });
  api.placements.mockResolvedValue({ success: true, data: { items: [], activeCount: 0 } });
  api.scans.mockResolvedValue({ success: true, data: { byPlacement: [] } });
  fetchMock.mockResolvedValue(new Response(new Blob(['pdf']), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('open', vi.fn());
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const view = () => <MemoryRouter initialEntries={['/store/marketing/qr?workspace=use']}><StoreQRPage /></MemoryRouter>;

it('매장 QR 전체 선택 · 일괄 출력은 보이는 매장 QR 만 대상으로 한다', async () => {
  render(view());
  await screen.findByText('QR own-1');
  expect(screen.queryByText('QR corner-1')).toBeNull();
  fireEvent.click(screen.getByLabelText('전체 선택 (0/2)'));
  expect(screen.getByLabelText('전체 선택 (2/2)')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '선택 QR 출력 (2)' }));
  fireEvent.click(await screen.findByRole('button', { name: /기본 QR 시트/ }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
  expect(body.qrIds.sort()).toEqual(['own-1', 'own-2']);
});

it('필터를 바꾸면 이전 필터의 선택을 비운다', async () => {
  render(view());
  await screen.findByText('QR own-1');
  fireEvent.click(screen.getByLabelText('전체 선택 (0/2)'));
  fireEvent.click(screen.getByRole('button', { name: /태블릿 코너/ }));
  await screen.findByText('QR corner-1');
  expect(screen.getByLabelText('전체 선택 (0/1)')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /선택 QR 출력/ })).toBeNull();
  fireEvent.click(screen.getByLabelText('전체 선택 (0/1)'));
  fireEvent.click(screen.getByRole('button', { name: '선택 QR 출력 (1)' }));
  fireEvent.click(await screen.findByRole('button', { name: /기본 QR 시트/ }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).qrIds).toEqual(['corner-1']);
});
