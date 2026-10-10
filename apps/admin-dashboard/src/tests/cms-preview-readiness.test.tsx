import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ViewPreview from '../pages/preview/ViewPreview';
import { getViewPreviewUrl } from '../pages/preview/view-preview-data';

const fetchMock = vi.fn();
const reply = (components: unknown[], status = 200) => ({ ok: status === 200, status,
  json: async () => ({ success: true, data: { view: { schema: { components } } } }) });
const text = (value: string) => ({ type: 'Text', props: { text: value } });
function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/preview/next')}>다음 주소</button>;
}
function mount(path = '/preview/fixture') {
  return render(<MemoryRouter initialEntries={[path]}><Navigation /><Routes>
    <Route path="/preview/:slug" element={<ViewPreview />} />
    <Route path="/missing" element={<ViewPreview />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('preserved public preview URL', () => {
  it.each(['https://api.example.invalid', 'https://api.example.invalid/api/', 'https://api.example.invalid/api/v1/'])(
    'normalizes %s and encodes the slug', (base) => {
      vi.stubEnv('VITE_API_BASE_URL', base);
      expect(getViewPreviewUrl('a/b?#')).toBe('https://api.example.invalid/api/v1/cms/public/view/a%2Fb%3F%23');
    });
});

describe('public preview workflow', () => {
  it('renders supported text safely and labels unsupported components', async () => {
    fetchMock.mockResolvedValue(reply([text('<script>fixture</script>'), { type: 'FixtureWidget' }]));
    mount();
    expect(await screen.findByText('<script>fixture</script>')).toBeInTheDocument();
    expect(screen.getByText(/FixtureWidget/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('credentials');
  });
  it('shows an empty preview instead of a blank screen', async () => {
    fetchMock.mockResolvedValue(reply([]));
    mount();
    await screen.findByText('표시할 미리보기 구성 요소가 없습니다.');
  });
  it.each([null, { type: 'Text', props: { text: {} } }])('rejects malformed components: %j', async (component) => {
    fetchMock.mockResolvedValue(reply([component]));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('응답 형식');
  });
  it.each([401, 403, 404, 500])('handles HTTP %i without private API fallback and retries', async (status) => {
    fetchMock.mockResolvedValueOnce(reply([], status)).mockResolvedValueOnce(reply([text('Recovered preview')]));
    mount();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByText('Recovered preview');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url] of fetchMock.mock.calls) expect(url).toContain('/cms/public/view/fixture');
  });
  it('reports network failure without exposing the error details', async () => {
    fetchMock.mockRejectedValue(new Error('internal diagnostic fixture'));
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByText(/internal diagnostic/)).not.toBeInTheDocument();
  });
  it('cancels old requests and ignores a late response after navigation', async () => {
    let finish!: (response: ReturnType<typeof reply>) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce(reply([text('Current preview')]));
    mount();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    fireEvent.click(screen.getByRole('button', { name: '다음 주소' }));
    await screen.findByText('Current preview');
    expect(signal.aborted).toBe(true);
    await act(async () => finish(reply([text('Stale preview')])));
    expect(screen.queryByText('Stale preview')).not.toBeInTheDocument();
    expect(screen.getByText('Current preview')).toBeInTheDocument();
  });
  it('cancels its fetch on unmount', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const { unmount } = mount();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
  it('does not spin or request a server when slug is missing', () => {
    mount('/missing');
    expect(screen.getByRole('alert')).toHaveTextContent('주소를 확인');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
