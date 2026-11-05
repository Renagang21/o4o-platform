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
    if (!file) throw new NeturePharmacyError(400, 'DOCUMENT_REQUIRED', '사업자등록증 사본을 선택해 주시기 바랍니다.');
    const header = file.buffer;
    const pdf = header.subarray(0, 5).toString() === '%PDF-';
    const png = header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
    const mime = pdf ? 'application/pdf' : png ? 'image/png' : jpeg ? 'image/jpeg' : null;
    if (!mime || mime !== file.mimetype || file.size > 10 * 1024 * 1024) {
      throw new NeturePharmacyError(400, 'INVALID_DOCUMENT', '사업자등록증은 10MB 이하 PDF, JPG 또는 PNG 파일로 제출해 주시기 바랍니다.');
    }
    const documentId=randomUUID();
    const object = this.storage.bucket(this.bucket).file(`business-registration/${userId}/${documentId}`);
    await object.save(header, { resumable: false, metadata: { contentType: mime, cacheControl: 'private, no-store', metadata: {o4o_document_id:documentId,o4o_owner_user_id:userId,o4o_asset_purpose:'personal'} } });
    try {
      const repo = this.dataSource.getRepository(KycDocument);
      const document = await repo.save(repo.create({ id:documentId,userId, documentType: 'business_registration',
        fileUrl: `gcs://${this.bucket}/${object.name}`, fileName: file.originalname.slice(0, 255),
        fileSize: file.size, mimeType: mime, verificationStatus: 'PENDING' }));
      return { id: document.id, fileName: document.fileName, mimeType: document.mimeType };
    } catch (error) {
      await object.delete().catch(() => undefined);
      throw error;
    }
  }

  async canReadDocument(userId: string, id: string):Promise<boolean> {
    const rows=await this.dataSource.query(`SELECT d.id FROM kyc_documents d WHERE d.id=$2 AND d."documentType"='business_registration'
      AND ((d.user_id=$1 AND NOT EXISTS(SELECT 1 FROM organizations o WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text))
      OR EXISTS(SELECT 1 FROM organizations o JOIN organization_members m ON m.organization_id=o.id
        WHERE o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text AND m.user_id=$1 AND m.role='owner' AND m.left_at IS NULL))`,[userId,id]);
    return rows.length>0;
  }

  async findOwned(userId:string,id:string){
    if(!await this.canReadDocument(userId,id))return null;
    return this.dataSource.getRepository(KycDocument).findOne({where:{id,documentType:'business_registration'}});
  }

  /** Pharmacy reviewers can read only documents linked to an actual pharmacy application. */
  async canReviewPharmacyDocument(id: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT d.id FROM kyc_documents d
         JOIN organizations o ON o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text
         JOIN neture_pharmacy_memberships pm ON pm.organization_id=o.id
        WHERE d.id = $1 AND d."documentType" = 'business_registration'
          AND o.metadata->'businessProfile'->>'businessRegistrationDocumentId' = d.id::text
        LIMIT 1`, [id],
    );
    return rows.length > 0;
  }

  async read(id: string) {
    const document = await this.dataSource.getRepository(KycDocument).findOne({ where: { id, documentType: 'business_registration' } });
    if (!document) throw new NeturePharmacyError(404, 'DOCUMENT_NOT_FOUND', '사업자등록증을 찾을 수 없습니다.');
    const prefix = `gcs://${this.bucket}/`;
    if (!document.fileUrl.startsWith(prefix)) throw new NeturePharmacyError(404, 'DOCUMENT_NOT_FOUND', '문서 저장 위치를 확인할 수 없습니다.');
    return { document, stream: this.storage.bucket(this.bucket).file(document.fileUrl.slice(prefix.length)).createReadStream() };
  }
}
