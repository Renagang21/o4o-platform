import { businessVideos } from '../services/business-videos';
import { SemiFranchiseContentService } from '../services/semi-franchise-content.service';

const url = 'https://www.youtube.com/watch?v=abcdefghijk';
it('accepts external channels and normalizes/deduplicates supported links, excluding arbitrary origins', () => {
  expect(businessVideos({ educationUrl: 'https://youtu.be/abcdefghijk', attachments: [
    { url }, { sourceUrl: 'https://vimeo.com/12345678' }, 'javascript:unsafe()',
    { url: 'https://youtube.com.example.invalid/watch?v=abcdefghijk' }, { url: 'https://example.invalid/page' },
  ] })).toEqual([{ sourceType: 'youtube', embedId: 'abcdefghijk', sourceUrl: url },
    { sourceType: 'vimeo', embedId: '12345678', sourceUrl: 'https://vimeo.com/12345678' }]);
});
function fixture(visible = true) {
  const content = { id: 'content', title: '합성 안내 영상', attachments: [{ url }], semiFranchiseKey: 'fixture-business', semiFranchiseName: '합성 사업', revision: 3 };
  const query = jest.fn().mockResolvedValue(visible ? [content] : []), copy = jest.fn().mockResolvedValue({ snapshotId: 'snapshot' });
  return { query, copy, service: new SemiFranchiseContentService({ query } as any, copy) };
}
it('copies only a published member material video into an owned signage snapshot with provenance', async () => {
  const { service, copy } = fixture();
  expect(await service.pharmacyCopyVideo('store-a', 'owner', 'content', url)).toEqual({ snapshotId: 'snapshot' });
  expect(copy).toHaveBeenCalledWith(expect.objectContaining({ sourceService: 'semi-franchise-video', sourceAssetId: 'content', assetType: 'signage', targetOrganizationId: 'store-a',
    contentJson: expect.objectContaining({ sourceUrl: url, sourceContentId: 'content', sourceRevision: 3, semiFranchiseKey: 'fixture-business' }) }));
});
it('refuses an absent/inaccessible material and a URL that was not provided by it', async () => {
  const denied = fixture(false);
  await expect(denied.service.pharmacyCopyVideo('foreign-store', 'owner', 'content', url)).rejects.toHaveProperty('code', 'CONTENT_NOT_AVAILABLE');
  expect(denied.copy).not.toHaveBeenCalled();
  const allowed = fixture();
  await expect(allowed.service.pharmacyCopyVideo('store-a', 'owner', 'content', 'https://youtu.be/bbbbbbbbbbb')).rejects.toHaveProperty('code', 'VIDEO_NOT_AVAILABLE');
  expect(allowed.copy).not.toHaveBeenCalled();
});
