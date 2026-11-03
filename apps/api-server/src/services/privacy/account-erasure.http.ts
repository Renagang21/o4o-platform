import type { EntityManager } from 'typeorm';
import { BUSINESS_DOCUMENT } from './account-personal-data.js';
import { mayEraseSupplierProfileFile } from '../../modules/neture/services/supplier-account-erasure.js';
import type { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import { AppDataSource } from '../../database/connection.js';
import { AccountErasureError, AccountErasureService, type PersonalStorage } from './account-erasure.service.js';

const gcs = new Storage();
async function assertFileOwnership(bucket:string,path:string,ownerId:string,metadata:Record<string,unknown>,db:Pick<EntityManager,'query'>=AppDataSource){
 const personal=String(metadata.o4o_owner_user_id??'').toLowerCase()===ownerId.toLowerCase()&&metadata.o4o_asset_purpose==='personal';
 if(!personal&&!await mayEraseSupplierProfileFile(db,ownerId,bucket,path,metadata))throw new AccountErasureError('PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED',409);
}
export const accountErasureStorage: PersonalStorage = {
  async discover(ownerId,db){
    const bucket=process.env.GCS_PRIVATE_DOCUMENT_BUCKET||'o4o-private-documents';
    const suppliers=await db.query('SELECT id FROM neture_suppliers WHERE user_id=$1',[ownerId]);
    const prefixes=[`business-registration/${ownerId}/`,...suppliers.map(row=>`neture/suppliers/${row.id}/kyc/`)];
    const pointers:string[]=[];
    for(const prefix of prefixes){
      let pageToken:string|undefined;
      do{
        const [files,next]=await gcs.bucket(bucket).getFiles({prefix,maxResults:100,autoPaginate:false,pageToken});
        for(const file of files){
          const pointer=`gcs://${bucket}/${file.name}`;
          const business=await db.query(`SELECT r.id FROM kyc_documents r WHERE r."fileUrl"=$1 AND ${BUSINESS_DOCUMENT}`,[pointer]);
          if(business.length)continue;
          const [metadata]=await file.getMetadata();
          await assertFileOwnership(bucket,file.name,ownerId,metadata.metadata??{},db);
          pointers.push(pointer);
        }
        pageToken=next?.pageToken;
      }while(pageToken);
    }
    return pointers;
  },
  async generation(bucket, path,ownerId,db=AppDataSource) {
    try {
      const [metadata] = await gcs.bucket(bucket).file(path).getMetadata();
      await assertFileOwnership(bucket,path,ownerId,metadata.metadata??{},db);
      if (!metadata.generation) throw new AccountErasureError('PERSONAL_FILE_GENERATION_REQUIRED', 409);
      return String(metadata.generation);
    } catch (e) { if ((e as { code?: unknown }).code === 404) return null; throw e; }
  },
  async deleteGeneration(bucket, path, generation, ownerId,db=AppDataSource) {
    try {
      // Recheck ownership on every retry, including metadata-only ownership changes.
      const [metadata] = await gcs.bucket(bucket).file(path).getMetadata();
      await assertFileOwnership(bucket,path,ownerId,metadata.metadata??{},db);
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
    personalBuckets: [process.env.GCS_MEDIA_LIBRARY_BUCKET || 'o4o-media-library', process.env.GCS_PRIVATE_DOCUMENT_BUCKET || 'o4o-private-documents'], storage: accountErasureStorage,
  });
}
export async function respondErasureCapabilities(_req:Request,res:Response):Promise<void> {
  try { res.json({success:true,data:await erasureService().capabilities()}); }
  catch { res.status(503).json({success:false,code:'ACCOUNT_ERASURE_UNAVAILABLE'}); }
}
export async function respondErasure(req: Request, res: Response, action: 'request' | 'get' | 'resume' = 'request'): Promise<void> {
  try {
    if ((req as Request & {authMethod?:string}).authMethod!=='google') throw new AccountErasureError('GOOGLE_AUTH_REQUIRED',403);
    const service = erasureService();
    const actorId=(req as Request & {user?:{id?:string}}).user?.id;
    const result = action === 'request' ? await service.request(req.params.id,actorId ?? '')
      : action === 'get' ? await service.get(req.params.operationId,actorId ?? '') : await service.resume(req.params.operationId,actorId ?? '');
    res.status(result.erased || action === 'get' ? 200 : 202).json({ success: true, data: result });
  } catch (e) {
    const known = e instanceof AccountErasureError;
    const code = known ? e.code : 'ACCOUNT_ERASURE_UNAVAILABLE';
    res.status(known ? e.statusCode : 503).json({ success: false, code, error: code });
  }
}

export async function respondErasureList(req:Request,res:Response):Promise<void> {
  try {
    if ((req as Request & {authMethod?:string}).authMethod!=='google') throw new AccountErasureError('GOOGLE_AUTH_REQUIRED',403);
    const actor=(req as Request & {user?:{id?:string}}).user?.id??'';
    const page=req.query.page===undefined?1:Number(req.query.page);
    const state=req.query.state===undefined?undefined:String(req.query.state) as Parameters<AccountErasureService['list']>[2];
    res.json({success:true,data:await erasureService().list(actor,page,state)});
  } catch(e) {
    const known=e instanceof AccountErasureError;
    res.status(known?e.statusCode:503).json({success:false,code:known?e.code:'ACCOUNT_ERASURE_UNAVAILABLE'});
  }
}

export async function respondErasureReadiness(req:Request,res:Response):Promise<void>{
 try{
  const actor=(req as Request & {user?:{id?:string}}).user?.id??'';
  res.json({success:true,data:await erasureService().readiness(actor)});
 }catch(error){const known=error instanceof AccountErasureError;res.status(known?error.statusCode:503).json({success:false,code:known?error.code:'ACCOUNT_ERASURE_UNAVAILABLE'});}
}
