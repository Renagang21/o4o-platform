import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
afterEach(cleanup);

const fetchHandledProducts = vi.fn();
const linkSignageMediaProduct = vi.fn();
vi.mock('../../../../api/handledProducts', () => ({ fetchHandledProducts: (...args: unknown[]) => fetchHandledProducts(...args) }));
vi.mock('../../../../api/signageMedia', () => ({ linkSignageMediaProduct: (...args: unknown[]) => linkSignageMediaProduct(...args) }));

import { VideoProductLinkDialog } from '../VideoProductLinkDialog';

const product = (sourceId: string, name: string) => ({ sourceType: 'listing', sourceId, name, imageUrl: null, originLabel: '', ownerLabel: '공급사', price: null, isActive: true, classificationCode: '', classificationLabel: '', updatedAt: '', managePath: '' });

describe('VideoProductLinkDialog (WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T4)', () => {
  beforeEach(() => {
    fetchHandledProducts.mockReset().mockResolvedValue({ items: [product('l-1', '감기약'), product('l-2', '파스')], pagination: { page: 1, limit: 20, total: 2 } });
    linkSignageMediaProduct.mockReset().mockResolvedValue({ mediaId: 'm-1', productMasterId: 'pm', productName: '파스' });
  });

  it('lists only handled (listing) products and saves the chosen listing', async () => {
    const onSaved = vi.fn();
    render(<VideoProductLinkDialog organizationId="org" mediaId="m-1" videoTitle="영상" currentListingId={null} currentProductName={null} onClose={vi.fn()} onSaved={onSaved} />);
    expect(fetchHandledProducts).toHaveBeenCalledWith({ source: 'listing', search: undefined, limit: 20 });
    fireEvent.click(await screen.findByLabelText(/파스/));
    fireEvent.click(screen.getByRole('button', { name: '연결 저장' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(linkSignageMediaProduct).toHaveBeenCalledWith('org', 'm-1', 'l-2');
    expect(screen.queryByRole('button', { name: '연결 해제' })).toBeNull();
  });

  it('clears an own link, but cannot clear a link inherited from the original video', async () => {
    const { unmount } = render(<VideoProductLinkDialog organizationId="org" mediaId="m-1" videoTitle="영상" currentListingId="l-1" currentProductName="감기약" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '연결 해제' }));
    await waitFor(() => expect(linkSignageMediaProduct).toHaveBeenCalledWith('org', 'm-1', null));
    unmount();
    render(<VideoProductLinkDialog organizationId="org" mediaId="m-1" videoTitle="영상" currentListingId={null} currentProductName="감기약" inherited onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByLabelText(/감기약/);
    expect(screen.queryByRole('button', { name: '연결 해제' })).toBeNull();
    expect(screen.getByText(/원본 영상의 연결/)).toBeTruthy();
  });

  it('shows the server refusal and stays open', async () => {
    linkSignageMediaProduct.mockRejectedValueOnce(new Error('이 매장에서 취급하는 제품이 아닙니다.'));
    const onSaved = vi.fn();
    render(<VideoProductLinkDialog organizationId="org" mediaId="m-1" videoTitle="영상" currentListingId={null} currentProductName={null} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(await screen.findByLabelText(/감기약/));
    fireEvent.click(screen.getByRole('button', { name: '연결 저장' }));
    expect((await screen.findByRole('alert')).textContent).toContain('취급하는 제품이 아닙니다');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
