import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { CooperationMaterialAttachments } from './CooperationMaterialAttachments';
afterEach(cleanup);

it('opens named web attachments without automatically loading their contents', () => {
  render(<CooperationMaterialAttachments attachments={[
    { name: '현장 자료', url: 'https://example.invalid/guide.pdf' },
    { url: 'http://example.invalid/legacy.pdf' },
  ]} />);
  expect(screen.getByRole('link', { name: '현장 자료' }).getAttribute('href')).toBe('https://example.invalid/guide.pdf');
  const fallback = screen.getByRole('link', { name: '첨부자료 2' });
  expect(fallback.getAttribute('target')).toBe('_blank');
  expect(fallback.getAttribute('rel')).toBe('noopener noreferrer');
  expect(document.querySelector('iframe, img, object')).toBeNull();
});
it('keeps valid attachments reachable and explains rejected script, data, credential and malformed links', () => {
  render(<CooperationMaterialAttachments attachments={[
    null, 'https://example.invalid/not-an-object', {},
    { name: '위험한 자료', url: 'javascript:alert(1)' },
    { url: 'data:text/html,unsafe' },
    { url: 'https://fixture@example.invalid/private' },
    { url: '/relative-file' },
    { name: '정상 자료', url: 'https://example.invalid/good' },
  ]} />);
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: '정상 자료' })).toBeTruthy();
  expect(screen.getByText(/일부 첨부자료는 주소를 확인할 수 없어/)).toBeTruthy();
});
it.each([undefined, null, {}, []])('does not invent attachments when their stored value is absent or malformed: %s', attachments => {
  render(<CooperationMaterialAttachments attachments={attachments} />);
  expect(screen.queryByRole('region', { name: '첨부자료' })).toBeNull();
});
