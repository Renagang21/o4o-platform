import { centralApiMenus } from '../central-operation-menu.middleware.js';
jest.mock('../../database/connection.js', () => ({AppDataSource: {}}));
it.each([
 ['/api/v1/operator/members/abc?serviceKey=neture&mode=hard', 'DELETE', 'neture.membership-cleanup'],
 ['/api/v1/operator/members/abc?serviceKey=neture', 'DELETE', 'neture.service-members'],
 ['/api/v1/neture/admin/service-approvals/abc/revoke', 'POST', 'neture.service-approval-management'],
 ['/api/v1/forum/operator/categories/abc/hard', 'DELETE', 'neture.forum-deleted'],
 ['/api/v1/forum/operator/categories/abc/delete-check', 'GET', 'neture.forum-deleted'],
 ['/api/v1/forum/operator/categories/abc/status', 'PATCH', 'neture.forum-delete'],
 ['/api/v1/neture/operator/registrations', 'GET', 'neture.applications'],
 ['/api/v1/neture/operator/contact-messages/abc', 'PATCH', 'neture.legacy-contact'],
])('classifies %s without broadening a neighboring duty', (originalUrl, method, expected) => {
 expect(centralApiMenus('neture', {originalUrl,method})).toEqual([expected]);
});
it('fails closed for an unmapped operator API', () => {
 expect(centralApiMenus('neture', {originalUrl:'/api/v1/neture/operator/unknown',method:'POST'})).toEqual([]);
});
it('maps only the pharmacy document read to the pharmacy review duty', () => {
 const originalUrl='/api/v1/neture/operator/pharmacy-documents/fixture';
 expect(centralApiMenus('neture',{originalUrl,method:'GET'})).toEqual(['neture.pharmacies']);
 for(const method of ['POST','PATCH','DELETE']) expect(centralApiMenus('neture',{originalUrl,method})).toEqual([]);
 expect(centralApiMenus('neture',{originalUrl:originalUrl+'/delete',method:'GET'})).toEqual([]);
 expect(centralApiMenus('supplier',{originalUrl,method:'GET'})).toEqual([]);
});
it('lets governance and approval duties read active funding without sharing other supplier commands',()=>{
 const originalUrl='/api/v1/neture/operator/suppliers/fixture/active-fundings';
 expect(centralApiMenus('supplier',{originalUrl,method:'GET'})).toEqual(['supplier.suppliers','supplier.governance']);
 expect(centralApiMenus('supplier',{originalUrl:'/api/v1/neture/operator/suppliers/fixture/approve',method:'POST'})).toEqual(['supplier.suppliers']);
});

it('maps batch trash to the existing daily product permissions while empty-trash retains cleanup permission',()=>{
 expect(centralApiMenus('neture',{originalUrl:'/api/v1/neture/operator/product-cleanup/batch-soft-delete',method:'POST'})).toEqual(['neture.products','neture.product-approvals']);
 expect(centralApiMenus('neture',{originalUrl:'/api/v1/neture/operator/product-cleanup/empty-trash/execute',method:'POST'})).toEqual(['neture.cleanup']);
});
