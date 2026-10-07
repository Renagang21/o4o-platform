const mockObject = { name: 'business-registration/u1/random', save: jest.fn(), delete: jest.fn(), createReadStream: jest.fn() };
const mockBucket = { file: jest.fn(() => mockObject) };
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn(() => ({ bucket: jest.fn(() => mockBucket) })) }));
import { BusinessRegistrationDocumentService } from '../services/business-registration-document.service.js';
const repo = { create: jest.fn((v) => v), save: jest.fn(), findOne: jest.fn() };
const service = new BusinessRegistrationDocumentService({ getRepository: () => repo } as any);
const file = (buffer = Buffer.from('%PDF-1.7\nsynthetic'), mimetype = 'application/pdf', size = buffer.length) => ({ buffer, mimetype, size, originalname: 'synthetic.pdf' } as Express.Multer.File);
beforeEach(() => { jest.clearAllMocks(); mockObject.delete.mockResolvedValue(undefined); repo.save.mockImplementation(async (v) => ({ ...v, id: 'd1' })); });
describe('private business registration documents', () => {
  it('saves an owned pending document and returns no storage URL', async () => {
    expect(await service.upload('u1', file())).toEqual({ id: 'd1', fileName: 'synthetic.pdf', mimeType: 'application/pdf' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', documentType: 'business_registration', verificationStatus: 'PENDING' }));
    expect(mockObject.save).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' } }));
  });
  it.each([
    [Buffer.from('not a PDF'), 'application/pdf', 10],
    [Buffer.from('%PDF-1.7'), 'image/png', 10],
    [Buffer.from('%PDF-1.7'), 'application/pdf', 10 * 1024 * 1024 + 1],
  ])('rejects unsupported, mismatched or oversized content before storage', async (buffer, mime, size) => {
    await expect(service.upload('u1', file(buffer, mime, size))).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(mockObject.save).not.toHaveBeenCalled();
  });
  it('requires a file', async () => {
    await expect(service.upload('u1', undefined)).rejects.toMatchObject({ code: 'DOCUMENT_REQUIRED' });
  });
  it('removes the uploaded object if its database record cannot be saved', async () => {
    repo.save.mockRejectedValueOnce(new Error('db unavailable'));
    await expect(service.upload('u1', file())).rejects.toThrow('db unavailable');
    expect(mockObject.delete).toHaveBeenCalledTimes(1);
  });
  it('ownership lookup includes authenticated user and document type', async () => {
    await service.findOwned('u1', 'd1');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'd1', userId: 'u1', documentType: 'business_registration' } });
  });
  it('refuses a stored URL outside the private bucket', async () => {
    repo.findOne.mockResolvedValueOnce({ fileUrl: 'https://example.test/public.pdf' });
    await expect(service.read('d1')).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND' });
    expect(mockObject.createReadStream).not.toHaveBeenCalled();
  });
});
