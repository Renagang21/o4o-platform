import { validateAdminOperationsMenus, adminOperationsRoles, ADMIN_OPERATIONS_OPERATOR_MENUS, ADMIN_OPERATIONS_INVITATION_SCOPE } from '../admin-operations-operator-contract.js';
import { resolvePlatformInvitationRole } from '../../../config/operator-role-catalog.js';
describe('admin site daily operator contract',()=>{
  it('offers daily work across all operating areas without any Admin privilege',()=>{
    const keys=ADMIN_OPERATIONS_OPERATOR_MENUS.map(menu=>menu.key);
    expect(new Set(adminOperationsRoles(keys))).toEqual(new Set(['neture:operator','supplier:operator','funding:operator','lecture:operator','community:operator','partner-support:operator','neture:pharmcoop_operator']));
    expect(validateAdminOperationsMenus(keys)).toHaveLength(keys.length);
  });
  it.each([undefined,null,{},[],['neture.legal'],['neture.cleanup'],['carepharm.members'],['neture.members',null]])('rejects malformed or non-daily work %p',input=>{
    expect(()=>validateAdminOperationsMenus(input)).toThrow();
  });
  it('permits explicit empty restrictions only while editing an existing designation',()=>{
    expect(validateAdminOperationsMenus([],true)).toEqual([]);
    expect(validateAdminOperationsMenus(['neture.members','neture.members'])).toEqual(['neture.members']);
  });
  it('pins the single-invitation transport to a non-admin role and does not revive legacy central invitations',()=>{
    expect(resolvePlatformInvitationRole('neture:operator','neture',ADMIN_OPERATIONS_INVITATION_SCOPE)).toEqual({role:'neture:operator',serviceKey:'neture'});
    for(const role of ['neture:admin','supplier:admin','platform:super_admin']) expect(()=>resolvePlatformInvitationRole(role,'neture',ADMIN_OPERATIONS_INVITATION_SCOPE)).toThrow();
    expect(()=>resolvePlatformInvitationRole('neture:operator','neture','o4o-direct')).toThrow();
  });
});
