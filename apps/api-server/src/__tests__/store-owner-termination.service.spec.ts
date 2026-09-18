import { StoreOwnerTerminationService } from '../services/store-owner-termination.service.js';

function fakeDs(handler: (sql:string, params:any[])=>any[]) {
  return {
    query: jest.fn(async (sql:string, params:any[]=[]) => handler(sql, params)),
    transaction: jest.fn(async (fn:any) => fn({ query: async (sql:string, params:any[]=[]) => handler(sql, params) })),
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
