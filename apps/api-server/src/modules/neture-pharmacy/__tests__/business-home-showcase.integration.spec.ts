import { randomUUID } from 'node:crypto';
import { createCarePharmReviewDb } from '../../../__tests__/support/carepharm-review-db.js';
import { BusinessHomeShowcaseService } from '../services/business-home-showcase.service.js';
import { SemiFranchiseContentService } from '../services/semi-franchise-content.service.js';
import type { SemiFranchiseRow } from '../services/semi-franchise.service.js';
const suite = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;
suite('business approval → scoped home showcase (isolated PostgreSQL)', () => {
  let db: Awaited<ReturnType<typeof createCarePharmReviewDb>>, service: BusinessHomeShowcaseService;
  const user=randomUUID(), reviewer=randomUUID(), store=randomUUID(), otherStore=randomUUID(), owner=randomUUID(), supplier=randomUUID();
  const sf={id:randomUUID(), key:'carepharm', organization_id:owner, status:'active'} as SemiFranchiseRow;
  const other={id:randomUUID(), key:'other', organization_id:owner, status:'active'} as SemiFranchiseRow;
  const global=randomUUID(), targeted=randomUUID(), foreign=randomUUID(), content=randomUUID(), offer=randomUUID(), master=randomUUID(), coop=randomUUID();
  async function batch(sql: string, params: unknown[] = []): Promise<any[]> {
    let result: any[] = [];
    for (const statement of sql.split(';').filter(v=>v.trim())) {
      const values: unknown[] = [];
      const query=statement.replace(/\$(\d+)/g, (_match,index) => { values.push(params[Number(index)-1]); return `$${values.length}`; });
      result=await db.ds.query(query,values);
    }
    return result;
  }
  beforeAll(async()=>{
    db=await createCarePharmReviewDb();service=new BusinessHomeShowcaseService(db.ds);
    await batch(`CREATE TABLE organizations(id uuid PRIMARY KEY, name text, type text, metadata jsonb);
      CREATE TABLE users(id uuid PRIMARY KEY,name text,"isActive" boolean DEFAULT true,"isEmailVerified" boolean DEFAULT true,status text DEFAULT 'active');
      CREATE TABLE organization_members(organization_id uuid,user_id uuid,role text,left_at timestamptz,is_primary boolean);
      CREATE TABLE semi_franchises(id uuid PRIMARY KEY,key text,status text);
      CREATE TABLE neture_pharmacy_memberships(organization_id uuid,status text);
      CREATE TABLE semi_franchise_memberships(organization_id uuid,semi_franchise_id uuid,status text);
      CREATE TABLE service_memberships(user_id uuid,service_key text,status text);
      CREATE TABLE cooperatives(id uuid,semi_franchise_id uuid,status text);
      CREATE TABLE cooperative_memberships(cooperative_id uuid,user_id uuid,status text);
      CREATE TABLE product_masters(id uuid,name text,status text);
      CREATE TABLE neture_suppliers(id uuid,organization_id uuid,user_id uuid,status text);
      CREATE TABLE supplier_product_offers(id uuid,master_id uuid,supplier_id uuid,business_short_description text,approval_status text,is_active boolean,deleted_at timestamptz);
      CREATE TABLE supply_proposals(id uuid,semi_franchise_id uuid,offer_id uuid,status text,target_organization_id uuid,created_at timestamptz DEFAULT now());
      CREATE TABLE semi_franchise_contents(id uuid,semi_franchise_id uuid,title text,summary text,body text,status text,source_supplier_id uuid,
        source_item_id uuid,created_by uuid,updated_by uuid,updated_at timestamptz,published_at timestamptz,review_reason text);
      CREATE TABLE action_logs(id uuid DEFAULT gen_random_uuid(),service_key text,user_id uuid,action_key text,source text,status text,meta jsonb,created_at timestamptz DEFAULT now());`);
    await batch(`INSERT INTO organizations VALUES($1,'Business','business','{}'),($2,'Store','pharmacy','{}');
      INSERT INTO users(id) VALUES($3),($4);`,[owner,store,user,reviewer]);
    await batch(`INSERT INTO semi_franchises VALUES($1,'carepharm','active'),($2,'other','active');
      INSERT INTO organization_members VALUES($3,$4,'owner',NULL,true);
      INSERT INTO neture_pharmacy_memberships VALUES($3,'active');
      INSERT INTO semi_franchise_memberships VALUES($3,$1,'active');`,[sf.id,other.id,store,user]);
    await batch(`INSERT INTO product_masters VALUES($1,'Approved product','ACTIVE');
      INSERT INTO neture_suppliers VALUES($2,NULL,$3,'ACTIVE');
      INSERT INTO supplier_product_offers VALUES($4,$1,$2,'Supply summary','APPROVED',true,NULL);`,[master,supplier,user,offer]);
    await batch(`INSERT INTO supply_proposals(id,semi_franchise_id,offer_id,status,target_organization_id) VALUES
      ($1,$4,$5,'approved',NULL),($2,$4,$5,'approved',$6),($3,$4,$5,'approved',$7);`,[global,targeted,foreign,sf.id,offer,store,otherStore]);
    await batch(`INSERT INTO semi_franchise_contents(id,semi_franchise_id,title,summary,body,status,source_supplier_id,source_item_id,created_by,published_at)
      VALUES($1,$2,'Review copy','Approved summary','<p>Approved body</p>','published',$3,$4,$5,now());`,[content,sf.id,supplier,randomUUID(),user]);
    await batch(`INSERT INTO cooperatives VALUES($1,$2,'active');INSERT INTO cooperative_memberships VALUES($1,$3,'active');`,[coop,sf.id,user]);
  });
  afterAll(async()=>{if(db)await db.close();});
  it('shows only this pharmacy’s approved supply and published content, without price or target DTO',async()=>{
    const result=await service.memberList(sf,user,store);
    expect(result.items.map(i=>i.id).sort()).toEqual([`product:${global}`,`product:${targeted}`,`content:${content}`].sort());
    expect(JSON.stringify(result)).not.toContain('targetOrganizationId');expect(JSON.stringify(result)).not.toContain('unitPrice');
  });
  it('personal cooperative membership shows shared introductions only and grants no target pharmacy access',async()=>{
    expect((await service.memberList(sf,user,null)).items.map(i=>i.id).sort()).toEqual([`product:${global}`,`content:${content}`].sort());
    await expect(service.memberList(sf,user,otherStore)).rejects.toMatchObject({httpStatus:403});
    await expect(service.memberList(other,user,null)).rejects.toMatchObject({httpStatus:403});
  });
  it('serializes concurrent edits, rejects stale versions and records only the committed change',async()=>{
    const input={id:`product:${global}`,hidden:true,position:1,version:0};
    const results=await Promise.allSettled([service.update(sf,reviewer,input),service.update(sf,reviewer,input)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    expect((await service.history(sf))).toHaveLength(1);
    expect((await service.memberList(sf,user,store)).items.map(i=>i.id)).not.toContain(`product:${global}`);
    await service.update(sf,reviewer,{...input,hidden:false,version:1});
    expect((await service.memberList(sf,user,store)).items[0].id).toBe(`product:${global}`);
  });
  it('does not overwrite another business on the same organization or unrelated metadata',async()=>{
    await batch(`UPDATE organizations SET metadata=metadata||'{"unrelated":true}'::jsonb WHERE id=$1`,[owner]);
    const result=await service.operatorList(other);expect(result.version).toBe(0);
    await expect(service.update(other,reviewer,{id:`product:${global}`,hidden:true,position:0,version:0})).rejects.toMatchObject({code:'ITEM_NOT_AVAILABLE'});
    expect((await batch('SELECT metadata FROM organizations WHERE id=$1',[owner]))[0].metadata.unrelated).toBe(true);
  });
  it('rejects invalid input and live supplier/offer/approval state removes items immediately',async()=>{
    await expect(service.update(sf,reviewer,{id:`product:${global}`,hidden:false,position:-1,version:2})).rejects.toMatchObject({httpStatus:400});
    await batch(`UPDATE neture_suppliers SET status='INACTIVE'`);
    expect((await service.memberList(sf,user,store)).items.every(i=>i.kind==='content')).toBe(true);
    await batch(`UPDATE neture_suppliers SET status='ACTIVE';UPDATE supply_proposals SET status='ended' WHERE id=$1`,[global]);
    expect((await service.memberList(sf,user,store)).items.map(i=>i.id)).not.toContain(`product:${global}`);
  });
  it('rechecks suspended pharmacy and cooperative memberships and closed business on every read',async()=>{
    await batch(`UPDATE semi_franchise_memberships SET status='suspended'`);
    await expect(service.memberList(sf,user,store)).rejects.toMatchObject({httpStatus:403});
    await batch(`UPDATE cooperative_memberships SET status='suspended'`);
    await expect(service.memberList(sf,user,null)).rejects.toMatchObject({httpStatus:403});
    await expect(service.memberList({...sf,status:'closed'},user,null)).rejects.toMatchObject({httpStatus:404});
  });
  it('forbids requester and canonical supplier self approval and atomically records independent review',async()=>{
    const contents=new SemiFranchiseContentService(db.ds,async()=>({snapshotId:randomUUID()}));
    await batch(`UPDATE semi_franchise_contents SET status='pending'`);
    await expect(contents.operatorSetStatus(sf,user,content,'publish')).rejects.toMatchObject({code:'SELF_APPROVAL_FORBIDDEN'});
    const supplierOrg=randomUUID();
    await batch(`INSERT INTO organizations(id,name,type,metadata) VALUES($1,'Supplier','supplier','{}');
      UPDATE neture_suppliers SET organization_id=$1;
      INSERT INTO organization_members VALUES($1,$2,'owner',NULL,true);`,[supplierOrg,reviewer]);
    await expect(contents.operatorSetStatus(sf,reviewer,content,'publish')).rejects.toMatchObject({code:'SELF_APPROVAL_FORBIDDEN'});
    await batch(`DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2`,[supplierOrg,reviewer]);
    await contents.operatorSetStatus(sf,reviewer,content,'publish');
    expect((await service.history(sf)).filter(r=>r.action==='business.content.status')).toHaveLength(1);
    await contents.operatorSetStatus(sf,reviewer,content,'archive');
    await expect(contents.operatorSetStatus(sf,reviewer,content,'publish')).rejects.toMatchObject({httpStatus:409});
  });
  it('rolls back display metadata when its audit write fails',async()=>{
    const before=(await service.operatorList(sf)).version;
    await batch(`ALTER TABLE action_logs ADD CONSTRAINT reject_showcase_test CHECK(action_key<>'business.showcase.update') NOT VALID`);
    await expect(service.update(sf,reviewer,{id:`product:${targeted}`,hidden:true,position:0,version:before})).rejects.toThrow();
    expect((await service.operatorList(sf)).version).toBe(before);
  });
});
