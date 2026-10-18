import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalHeader } from '../GlobalHeader';

afterEach(cleanup);
it.each(['/#news', '/?tab=memberships', '/materials'])('closes the mobile menu after navigating to %s', async href => {
  render(<MemoryRouter initialEntries={['/']}><GlobalHeader brand={{ name: 'CarePharm', icon: 'C' }} publicNav={[{ label: '이동할 곳', href }]} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));
  const links = screen.getAllByRole('link', { name: '이동할 곳' });
  expect(links).toHaveLength(2);
  fireEvent.click(links[1]);
  await waitFor(() => expect(screen.queryByRole('button', { name: '메뉴 닫기' })).toBeNull());
  expect(screen.getAllByRole('link', { name: '이동할 곳' })).toHaveLength(1);
});
