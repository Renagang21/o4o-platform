import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { KycDocument } from '../../../entities/KycDocument.js';
import { NeturePharmacyError } from '../constants.js';

/** Private documents, owned by the authenticated user; never accept a caller URL. */
export class BusinessRegistrationDocumentService {
  private readonly storage = new Storage();
  private readonly bucket = process.env.GCS_PRIVATE_DOCUMENT_BUCKET || 'o4o-private-documents';
  constructor(private readonly dataSource: DataSource) {}

  async upload(userId: string, file: Express.Multer.File | undefined) {
    if (!file) throw new NeturePharmacyError(400, 'DOCUMENT_REQUIRED', '사업자등록증 사본을 선택해 주세요.');
    const header = file.buffer;
    const pdf = header.subarray(0, 5).toString() === '%PDF-';
    const png = header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
    const mime = pdf ? 'application/pdf' : png ? 'image/png' : jpeg ? 'image/jpeg' : null;
    if (!mime || mime !== file.mimetype || file.size > 10 * 1024 * 1024) {
      throw new NeturePharmacyError(400, 'INVALID_DOCUMENT', '사업자등록증은 10MB 이하 PDF, JPG 또는 PNG 파일로 제출해 주세요.');
    }
    const object = this.storage.bucket(this.bucket).file(`business-registration/${userId}/${randomUUID()}`);
    await object.save(header, { resumable: false, metadata: { contentType: mime, cacheControl: 'private, no-store' } });
    try {
      const repo = this.dataSource.getRepository(KycDocument);
      const document = await repo.save(repo.create({ userId, documentType: 'business_registration',
        fileUrl: `gcs://${this.bucket}/${object.name}`, fileName: file.originalname.slice(0, 255),
        fileSize: file.size, mimeType: mime, verificationStatus: 'PENDING' }));
      return { id: document.id, fileName: document.fileName, mimeType: document.mimeType };
    } catch (error) {
      await object.delete().catch(() => undefined);
      throw error;
    }
  }

  async findOwned(userId: string, id: string) {
    return this.dataSource.getRepository(KycDocument).findOne({ where: { id, userId, documentType: 'business_registration' } });
  }

  async read(id: string) {
    const document = await this.dataSource.getRepository(KycDocument).findOne({ where: { id, documentType: 'business_registration' } });
    if (!document) throw new NeturePharmacyError(404, 'DOCUMENT_NOT_FOUND', '사업자등록증을 찾을 수 없습니다.');
    const prefix = `gcs://${this.bucket}/`;
    if (!document.fileUrl.startsWith(prefix)) throw new NeturePharmacyError(404, 'DOCUMENT_NOT_FOUND', '문서 저장 위치를 확인할 수 없습니다.');
    return { document, stream: this.storage.bucket(this.bucket).file(document.fileUrl.slice(prefix.length)).createReadStream() };
  }
}
