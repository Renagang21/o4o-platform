import { StoreOwnerTerminationService } from '../services/store-owner-termination.service.js';
import { MediaLibraryService } from '../modules/media/services/media-library.service.js';

function fakeDs(handler: (sql:string, params:any[])=>any[]) {
  return {
    query: jest.fn(async (sql:string, params:any[]=[]) => handler(sql, params)),
    transaction: jest.fn(async (fn:any) => fn({ query: async (sql:string, params:any[]=[]) => handler(sql, params) })),
    getRepository: jest.fn(() => ({})),
  } as any;
}

describe('StoreOwnerTerminationService', () => {
  it('does not remove service membership when terminating store-owner contract', async () => {
    const queries:string[] = [];
    const now = new Date('2026-09-18T00:00:00Z');
    const ds=fakeDs((sql)=>{
      queries.push(sql);
      if (sql.includes('FROM store_owner_termination_cases WHERE id=')) return [{
        id:'11111111-1111-1111-1111-111111111111', service_key:'kpa-society',
        organization_id:'22222222-2222-2222-2222-222222222222', user_id:'33333333-3333-3333-3333-333333333333',
        status:'termination_scheduled', requested_at:now, requested_by:null, return_requested:false,
        return_completed_at:null, termination_effective_at:now, purge_due_at:null, purge_completed_at:null,
        cancelled_at:null, failure_reason:null, created_at:now, updated_at:now,
      }];
      if (sql.includes('organization_service_enrollments') && sql.includes('service_code<>')) return [];
      return [];
    });
    const service=new StoreOwnerTerminationService(ds);
    await service.terminateCase('11111111-1111-1111-1111-111111111111', now);
    expect(queries.some(q=>q.includes('UPDATE service_memberships'))).toBe(false);
    expect(queries.some(q=>q.includes('UPDATE role_assignments SET is_active=false'))).toBe(true);
    expect(queries.some(q=>q.includes("purge_due_at=COALESCE(purge_due_at,$2::timestamptz + interval '7 days')"))).toBe(true);
  });

  it('preserves organization-shared data when another Store service is active', async () => {
    const now=new Date('2026-09-18T00:00:00Z');
    const ds=fakeDs((sql)=>{
      if (sql.includes('FROM store_owner_termination_cases WHERE id=')) return [{
        id:'1', service_key:'kpa-society', organization_id:'2', user_id:'3', status:'terminated',
        requested_at:now, requested_by:null, return_requested:false, return_completed_at:null,
        termination_effective_at:now, purge_due_at:now, purge_completed_at:null, cancelled_at:null,
        failure_reason:null, created_at:now, updated_at:now,
      }];
      if (sql.includes('service_code<>')) return [{ '?column?':1 }];
      if (sql.includes('COUNT(*)::int n')) return [{ n:2 }];
      return [];
    });
    const service=new StoreOwnerTerminationService(ds);
    const preview=await service.previewPurge('1');
    expect(preview.hasOtherActiveStoreService).toBe(true);
    expect(preview.items.filter(i=>i.classification==='ORGANIZATION_SHARED').every(i=>i.action==='PRESERVE')).toBe(true);
    expect(preview.mediaCandidates).toBe(0);
  });

  it('scheduler detects overdue purge but never executes destructive purge automatically', async () => {
    const now=new Date('2026-09-25T00:00:00Z');
    const ds=fakeDs((sql)=>{
      if (sql.includes("status IN ('termination_scheduled','return_completed')")) return [];
      if (sql.includes("status IN ('terminated','failed')")) return [{ id:'overdue-1' }];
      return [];
    });
    const service=new StoreOwnerTerminationService(ds);
    const purgeSpy=jest.spyOn(service,'purgeCase');
    const result=await service.runDueCases(now);
    expect(result).toEqual({ terminated:0, overduePurges:1, failed:0 });
    expect(purgeSpy).not.toHaveBeenCalled();
  });

  it('keeps store_execution_assets retry evidence when GCS deletion fails', async () => {
    const now=new Date('2026-09-26T00:00:00Z');
    const due=new Date('2026-09-25T00:00:00Z');
    const queries:string[]=[];
    const ds=fakeDs((sql)=>{
      queries.push(sql);
      if (sql.includes('FROM store_owner_termination_cases WHERE id=')) return [{
        id:'1', service_key:'pharmacy-hub', organization_id:'2', user_id:'3', status:'terminated',
        requested_at:due, requested_by:null, return_requested:false, return_completed_at:null,
        termination_effective_at:due, purge_due_at:due, purge_completed_at:null, cancelled_at:null,
        failure_reason:null, created_at:due, updated_at:due,
      }];
      if (sql.includes('service_code<>')) return [];
      if (sql.includes('COUNT(*)::int n')) return [{ n:0 }];
      if (sql.includes('SELECT DISTINCT ma.id')) return [{ id:'media-1', url:'https://storage.googleapis.com/o4o-media-library/media/x.webp' }];
      if (sql.includes('AS used_elsewhere')) return [{ used_elsewhere:false }];
      return [];
    });
    const mediaSpy=jest.spyOn(MediaLibraryService.prototype,'deleteAsset')
      .mockRejectedValue(Object.assign(new Error('MEDIA_STORAGE_DELETE_FAILED'),{code:'MEDIA_STORAGE_DELETE_FAILED'}));
    const service=new StoreOwnerTerminationService(ds);
    await expect(service.purgeCase('1',{dryRun:false,now})).rejects.toMatchObject({code:'PURGE_INCOMPLETE'});
    expect(queries.some(q=>q.includes('DELETE FROM store_execution_assets'))).toBe(false);
    expect(queries.some(q=>q.includes("SET status='failed'"))).toBe(true);
    mediaSpy.mockRestore();
  });

  it('return package excludes supplier originals and system logs by construction', async () => {
    const now=new Date('2026-09-18T00:00:00Z');
    const ds=fakeDs((sql)=>{
      if (sql.includes('FROM store_owner_termination_cases WHERE id=')) return [{
        id:'1', service_key:'pharmacy-hub', organization_id:'2', user_id:'3', status:'return_pending',
        requested_at:now, requested_by:null, return_requested:true, return_completed_at:null,
        termination_effective_at:now, purge_due_at:null, purge_completed_at:null, cancelled_at:null,
        failure_reason:null, created_at:now, updated_at:now,
      }];
      if (sql.includes('FROM organizations')) return [{ id:'2', name:'테스트 매장' }];
      return [];
    });
    const service=new StoreOwnerTerminationService(ds);
    const pkg:any=await service.buildReturnPackage('1');
    expect(pkg.format).toBe('O4O_STORE_OWNER_DATA_RETURN_V1');
    expect(pkg.data.supplierOriginals).toBeUndefined();
    expect(pkg.data.auditLogs).toBeUndefined();
    expect(pkg.manifestHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
