import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { AssetCopyService } from '@o4o/asset-copy-core';
import { CommunitySignageResolver } from '../../modules/asset-snapshot/resolvers/community-signage.resolver.js';

/** Repeated deliberate copies remain supported by Core; only retries of one explicit request are reused. */
export async function copyCommunityVideoOnce(db: DataSource, actorId: string, organizationId: string, input: {requestId?:unknown;sourceAssetId?:unknown;assetType?:unknown}) {
  const uuid=/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  if(typeof input.requestId!=='string'||!uuid.test(input.requestId)||typeof input.sourceAssetId!=='string'||!uuid.test(input.sourceAssetId)||input.assetType!=='signage')throw Object.assign(new Error('가져오기 요청을 확인해 주세요.'),{statusCode:400});
  const key=createHash('sha256').update(`${actorId}:${organizationId}:${input.requestId}`).digest('hex');
  return db.transaction(async manager=>{
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[key]);
    const [existing]=await manager.query(`SELECT id,source_asset_id AS "sourceAssetId" FROM o4o_asset_snapshots WHERE organization_id=$1 AND source_service='community' AND content_json->>'_o4oCopyRequest'=$2`,[organizationId,key]);
    if(existing){if(existing.sourceAssetId!==input.sourceAssetId)throw Object.assign(new Error('가져오기 요청의 영상이 변경됐습니다.'),{statusCode:409});return existing;}
    const source=await new CommunitySignageResolver(manager as unknown as DataSource).resolve(input.sourceAssetId as string,'signage');
    if(!source)throw Object.assign(new Error('사용할 수 있는 영상을 찾지 못했습니다.'),{statusCode:404});
    // Frozen Core only obtains its repository from the source. Bind that repository to this transaction.
    const copy=new AssetCopyService(manager as unknown as DataSource);
    const result=await copy.copyResolved({sourceService:'community',sourceAssetId:input.sourceAssetId as string,assetType:'signage',targetOrganizationId:organizationId,createdBy:actorId,title:source.title,contentJson:{...source.contentJson,_o4oCopyRequest:key}});
    return result.snapshot;
  });
}
