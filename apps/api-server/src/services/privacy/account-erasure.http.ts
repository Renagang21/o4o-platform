import type { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import { AppDataSource } from '../../database/connection.js';
import { AccountErasureError, AccountErasureService, type PersonalStorage } from './account-erasure.service.js';

const gcs = new Storage();
export const accountErasureStorage: PersonalStorage = {
  async generation(bucket, path,ownerId) {
    try {
      const [metadata] = await gcs.bucket(bucket).file(path).getMetadata();
      if(String(metadata.metadata?.o4o_owner_user_id ?? '').toLowerCase()!==ownerId.toLowerCase() ||
        metadata.metadata?.o4o_asset_purpose!=='personal')throw new AccountErasureError('PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED',409);
      if (!metadata.generation) throw new AccountErasureError('PERSONAL_FILE_GENERATION_REQUIRED', 409);
      return String(metadata.generation);
    } catch (e) { if ((e as { code?: unknown }).code === 404) return null; throw e; }
  },
  async deleteGeneration(bucket, path, generation, ownerId) {
    try {
      // Recheck ownership on every retry, including metadata-only ownership changes.
      const [metadata] = await gcs.bucket(bucket).file(path).getMetadata();
      if(String(metadata.metadata?.o4o_owner_user_id ?? '').toLowerCase()!==ownerId.toLowerCase() ||
        metadata.metadata?.o4o_asset_purpose!=='personal')throw new AccountErasureError('PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED',409);
      if(String(metadata.generation)!==generation)throw new AccountErasureError('PERSONAL_FILE_GENERATION_CHANGED',409);
      if(!metadata.metageneration)throw new AccountErasureError('PERSONAL_FILE_GENERATION_REQUIRED',409);
      await gcs.bucket(bucket).file(path,{preconditionOpts:{ifGenerationMatch:generation,ifMetagenerationMatch:metadata.metageneration}}).delete();
    }
    catch (e) {
      if ((e as { code?: unknown }).code === 412) throw new AccountErasureError('PERSONAL_FILE_GENERATION_CHANGED',409);
      if ((e as { code?: unknown }).code !== 404) throw e;
      // A generation-specific 404 may mean a different generation now exists, not an empty path.
      const [exists] = await gcs.bucket(bucket).file(path).exists();
      if (exists) throw new AccountErasureError('PERSONAL_FILE_GENERATION_CHANGED', 409);
    }
  },
};
export function erasureService(): AccountErasureService {
  const years = Number(process.env.ACCOUNT_ERASURE_SYSTEM_YEARS);
  return new AccountErasureService(AppDataSource, {
    enabled: process.env.ACCOUNT_ERASURE_MODE === 'apply',
    inventoryReviewed:process.env.ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW==='confirmed',
    systemYears: years === 1 || years === 2 ? years : undefined,
    systemBasis: process.env.ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS,
    personalBuckets: [process.env.GCS_MEDIA_LIBRARY_BUCKET || 'o4o-media-library'], storage: accountErasureStorage,
  });
}
export async function respondErasureCapabilities(_req:Request,res:Response):Promise<void> {
  try { res.json({success:true,data:await erasureService().capabilities()}); }
  catch { res.status(503).json({success:false,code:'ACCOUNT_ERASURE_UNAVAILABLE'}); }
}
export async function respondErasure(req: Request, res: Response, action: 'request' | 'get' | 'resume' = 'request'): Promise<void> {
  try {
    const service = erasureService();
    const actorId=(req as Request & {user?:{id?:string}}).user?.id;
    const result = action === 'request' ? await service.request(req.params.id,actorId ?? '')
      : action === 'get' ? await service.get(req.params.operationId) : await service.resume(req.params.operationId,actorId ?? '');
    res.status(result.erased || action === 'get' ? 200 : 202).json({ success: true, data: result });
  } catch (e) {
    const known = e instanceof AccountErasureError;
    const code = known ? e.code : 'ACCOUNT_ERASURE_UNAVAILABLE';
    res.status(known ? e.statusCode : 503).json({ success: false, code, error: code });
  }
}
